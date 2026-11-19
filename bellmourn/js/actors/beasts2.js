// Bodies that are not people, Act II and the small ones: the bat, the crawlers (the drowned crab, the
// dune scorpion, the crypt spider), the ice wraith, the sandworm, the slime and the seraph. Also the
// shared building blocks every beast is made of (the Beast base, pose blending, keyframes), which
// beasts.js imports from here.
//
// Same rules as beasts.js: a few boxes per limb lit by the scene, glowing eyes, every beast faces +Z,
// animate(e, t, dt) poses it from e.anim / e.animT / e.atk, poses are eased so clips blend by
// themselves. At 16 px per metre a bat is a dozen pixels across, so shapes are chunky and the parts that
// say what a thing is (wings, claws, the sting, the maw, the eye) are big and bright.
import * as THREE from '../../vendor/three.module.min.js';
import { mat } from './rig.js';

export const box = (() => { const c = new Map(); return (w, h, d) => { const k = `${w},${h},${d}`; if (!c.has(k)) c.set(k, new THREE.BoxGeometry(w, h, d)); return c.get(k); }; })();
const glowCache = new Map();
export const glowMat = (color, k = 5) => { const key = color + ':' + k; if (!glowCache.has(key)) glowCache.set(key, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), fog: false })); return glowCache.get(key); };
const jellyCache = new Map();
const jellyMat = (color, o = 0.8) => { const k = color + ':' + o; if (!jellyCache.has(k)) jellyCache.set(k, new THREE.MeshLambertMaterial({ color, transparent: true, opacity: o, emissive: new THREE.Color(color).multiplyScalar(0.25) })); return jellyCache.get(k); };
const flashCache = new Map();
function flashMat(base, amount) {
  const q = Math.round(amount * 4) / 4; const k = base.uuid + q;
  if (!flashCache.has(k)) { const m = base.clone(); m.emissive = new THREE.Color(1, 1, 1); m.emissiveIntensity = q * 1.6; flashCache.set(k, m); }
  return flashCache.get(k);
}
export const clamp01 = (k) => Math.max(0, Math.min(1, k));
export const ease = (k) => k * k * (3 - 2 * k);
export const lerp = (a, b, k) => a + (b - a) * k;
// blend two poses
export function mixP(a, b, k) {
  const o = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[key], y = b[key];
    if (Array.isArray(x) || Array.isArray(y)) { const p = x || [0, 0, 0], q = y || [0, 0, 0]; o[key] = [lerp(p[0], q[0], k), lerp(p[1], q[1], k), lerp(p[2], q[2], k)]; }
    else o[key] = lerp(x || 0, y || 0, k);
  }
  return o;
}
// keyframes [[t, pose], ...] sampled at t
export function keys(t, list) {
  if (t <= list[0][0]) return list[0][1];
  for (let i = 0; i < list.length - 1; i++) { const [t0, p0] = list[i], [t1, p1] = list[i + 1]; if (t <= t1) return mixP(p0, p1, ease(clamp01((t - t0) / Math.max(1e-3, t1 - t0)))); }
  return list[list.length - 1][1];
}
// where an attack clip is: 0..1 through the windup, then the strike, then the recovery
export function phase(t, atk) {
  const w = atk.windup, a = atk.active, d = atk.dur;
  if (t < w) return { part: 'windup', k: clamp01(t / w) };
  if (t < a) return { part: 'strike', k: clamp01((t - w) / Math.max(0.01, a - w)) };
  return { part: 'recover', k: clamp01((t - a) / Math.max(0.01, d - a)) };
}
const ZERO = [0, 0, 0];

export class Beast {
  constructor(look) {
    this.look = look; this.root = new THREE.Group(); this.body = new THREE.Group(); this.root.add(this.body);
    this.body.scale.setScalar(look.scale || 1);
    this.j = {}; this.parts = []; this.baseMats = new Map(); this.time = Math.random() * 10; this.gait = Math.random() * 6;
    this.cur = { lift: 0, pitch: 0, roll: 0 }; this.tip = new THREE.Object3D(); this.hand = new THREE.Object3D();
  }
  joint(name, parent, x, y, z) { const g = new THREE.Group(); g.position.set(x, y, z); (parent ? (this.j[parent] || parent) : this.body).add(g); this.j[name] = g; return g; }
  // a group that only holds an orientation (not posed): legs splayed round a body, wings round an eye
  fixed(parent, x, y, z, rx = 0, ry = 0, rz = 0) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set(rx, ry, rz); (this.j[parent] || parent).add(g); return g; }
  part(joint, w, h, d, color, x, y, z, o = {}) {
    const m = new THREE.Mesh(box(w, h, d), o.material || (o.glow ? glowMat(color, o.glow) : mat(color, o.emissive || 0, o.ei || 1)));
    m.position.set(x, y, z); if (o.rx) m.rotation.x = o.rx; if (o.ry) m.rotation.y = o.ry; if (o.rz) m.rotation.z = o.rz;
    if (!o.glow) m.castShadow = true;
    (this.j[joint] || joint).add(m); this.parts.push(m); return m;
  }
  // ease every joint towards the pose (rate: how snappy)
  pose(P, dt, rate) {
    const k = 1 - Math.exp(-rate * dt);
    for (const name in this.j) {
      if (name === 'base') continue;
      const g = this.j[name]; const r = P[name] || ZERO;
      g.rotation.x += (r[0] - g.rotation.x) * k; g.rotation.y += (r[1] - g.rotation.y) * k; g.rotation.z += (r[2] - g.rotation.z) * k;
    }
    for (const key of ['lift', 'pitch', 'roll']) this.cur[key] += ((P[key] || 0) - this.cur[key]) * k;
    const b = this.j.base; b.position.y = this.baseY + this.cur.lift; b.rotation.x = this.cur.pitch; b.rotation.z = this.cur.roll;
  }
  flash(amount) {
    if (amount === this._flash) return; this._flash = amount;
    for (const m of this.parts) {
      if (!m.material || m.material.isMeshBasicMaterial) continue;
      if (amount > 0) { if (!this.baseMats.has(m)) this.baseMats.set(m, m.material); m.material = flashMat(this.baseMats.get(m), amount); }
      else if (this.baseMats.has(m)) m.material = this.baseMats.get(m);
    }
  }
  updateCloak() {}
  tipWorld(v) { return this.tip.getWorldPosition(v); }
  handWorld(v) { return this.hand.getWorldPosition(v); }
  speedOf(e) { return Math.hypot(e.vx || 0, e.vz || 0); }
  atkPhase(e, t, d = { windup: 0.5, active: 0.7, dur: 1.2 }) { return phase(t, e.atk || d); }
}

// ------------------------------------------------------------------ the bat: a swarm of small fliers
class Bat extends Beast {
  constructor(look) {
    super(look); const C = look.colors; this.baseY = 0.8;
    this.joint('base', null, 0, this.baseY, 0);
    this.part('base', 0.17, 0.16, 0.24, C.fur, 0, 0, 0);
    this.part('base', 0.12, 0.1, 0.12, C.dark, 0, -0.05, -0.13);
    this.joint('head', 'base', 0, 0.07, 0.13);
    this.part('head', 0.15, 0.13, 0.13, C.fur, 0, 0.02, 0.03);
    this.part('head', 0.08, 0.06, 0.07, C.dark, 0, -0.02, 0.11);
    for (const sx of [-1, 1]) {
      this.part('head', 0.06, 0.15, 0.03, C.wing, sx * 0.06, 0.13, 0, { rz: -sx * 0.35 }); // big ears
      this.part('head', 0.045, 0.04, 0.03, look.eyes || 0xff4030, sx * 0.04, 0.04, 0.1, { glow: 7 });
      this.part('head', 0.02, 0.04, 0.02, 0xf0e8e0, sx * 0.025, -0.06, 0.13); // fangs
      this.part('base', 0.03, 0.08, 0.03, C.dark, sx * 0.04, -0.12, -0.08); // feet
    }
    // wings: an arm with a membrane, then a hand with a wider one; spread flat so they read from above
    for (const [n, x] of [['L', 1], ['R', -1]]) {
      this.joint('w' + n, 'base', x * 0.07, 0.04, 0);
      this.part('w' + n, 0.36, 0.035, 0.035, C.bone, x * 0.18, 0, 0.04);
      this.part('w' + n, 0.34, 0.02, 0.26, C.wing, x * 0.17, 0, -0.08);
      this.joint('wo' + n, 'w' + n, x * 0.35, 0, 0.04);
      this.part('wo' + n, 0.32, 0.03, 0.03, C.bone, x * 0.16, 0, 0);
      this.part('wo' + n, 0.3, 0.02, 0.32, C.wing, x * 0.15, 0, -0.14);
      this.part('wo' + n, 0.12, 0.02, 0.16, C.wing, x * 0.33, 0, -0.08);
    }
    this.j.head.add(this.hand); this.hand.position.set(0, -0.03, 0.08); this.j.head.add(this.tip); this.tip.position.set(0, -0.05, 0.18);
  }
  animate(e, t, dt) {
    this.time += dt; const tm = this.time; const sp = this.speedOf(e); const anim = e.anim;
    const wings = (flap, fold = 0, back = 0) => ({ wL: [0, back, flap], wR: [0, -back, -flap], woL: [0, back * 0.6, fold], woR: [0, -back * 0.6, -fold] });
    const flutter = (f = 20, amp = 0.9) => wings(Math.sin(tm * f) * amp + 0.1, Math.sin(tm * f - 0.8) * amp * 0.7);
    let pose, rate = 16;
    if (anim === 'idle' || anim === 'walk' || anim === 'run') {
      pose = { lift: Math.sin(tm * 5 + this.gait) * 0.12, pitch: Math.min(0.5, sp * 0.07), roll: Math.sin(tm * 3.3) * 0.15, head: [-0.2, 0, 0], ...flutter() };
      rate = 20;
    } else if (anim === 'dive') {
      const ph = this.atkPhase(e, t, { windup: 0.5, active: 0.78, dur: 0.95 });
      if (ph.part === 'windup') { pose = { lift: 0.25 * ease(ph.k), pitch: -0.5 * ph.k, ...wings(1.1 + Math.sin(tm * 24) * 0.3, 0.5), head: [0.2, 0, 0] }; rate = 12; }
      else if (ph.part === 'strike') { pose = { lift: -0.45, pitch: 0.75, ...wings(0.2, -0.3, 1.1), head: [-0.5, 0, 0] }; rate = 30; }
      else { pose = { lift: -0.3 * (1 - ph.k), pitch: -0.2, ...flutter(24, 1.1) }; rate = 14; }
    } else if (anim === 'hurt') { pose = { lift: -0.1, pitch: -0.6, roll: Math.sin(t * 30) * 0.5, ...wings(1.0, 0.8) }; rate = 30; }
    else if (anim === 'stagger') { pose = { lift: -0.7 + Math.sin(tm * 8) * 0.1, pitch: 0.3, roll: Math.sin(tm * 5) * 0.3, ...flutter(12, 0.6) }; rate = 10; }
    else if (anim === 'die' || anim === 'dieHard') { const k = clamp01(t / 0.4); pose = { lift: lerp(0, -this.baseY + 0.06, ease(k)), pitch: 0.1, roll: 1.2 * ease(k), ...wings(-0.05, 0, 0) }; rate = 12; }
    else if (anim === 'rise') { const k = clamp01(t / 0.9); pose = { lift: (1 - ease(k)) * 3.5, ...flutter(26, 1) }; rate = 40; }
    else if (anim === 'roar') pose = { lift: 0.2, pitch: -0.4, ...wings(1.3, 0.6), head: [-0.6, 0, 0] };
    else pose = { lift: 0, ...flutter() };
    this.pose(pose, dt, rate);
  }
}

// ------------------------------------------------------------------ crawlers: crab, scorpion, spider
// legs: pairs along the body, each a hip (splayed out by a fixed group) and a knee; pincers on the
// crab and the scorpion; a curled tail with a glowing sting on the scorpion; a round abdomen, fangs and a
// cluster of eyes on the spider. Right-side joints mirror the left (their rz and ry are negated).
const CRAB = { body: [0.66, 0.2, 0.46], y: 0.36, legs: [0.12, -0.02, -0.15], up: 0.26, low: 0.32, hip: 0.35, knee: -1.35, splay: 0.15, pincer: 1.35, eyes: 'stalks' };
const SCORPION = { body: [0.38, 0.14, 0.52], y: 0.25, legs: [0.1, -0.03, -0.14, -0.24], up: 0.22, low: 0.25, hip: 0.45, knee: -1.4, splay: 0.35, pincer: 1.0, tail: 6, eyes: 'pair' };
const SPIDER = { body: [0.3, 0.16, 0.3], y: 0.42, legs: [0.1, 0.03, -0.04, -0.11], up: 0.34, low: 0.44, hip: 0.85, knee: -2.0, splay: 0.55, abdomen: true, fangs: true, eyes: 'cluster' };
class Crawler extends Beast {
  constructor(look, P) {
    super(look); this.P = P; const C = look.colors; this.baseY = P.y;
    this.joint('base', null, 0, this.baseY, 0);
    const [bw, bh, bd] = P.body;
    this.part('base', bw, bh, bd, C.shell, 0, 0, 0);
    this.part('base', bw * 0.82, bh * 0.4, bd * 0.86, C.under, 0, -bh * 0.55, 0);
    if (P.pincer && P.eyes === 'stalks') { // the crab: a ridged shell edge, moss and barnacles
      this.part('base', bw * 1.06, bh * 0.35, bd * 0.3, C.dark, 0, bh * 0.25, bd * 0.38);
      for (const [x, z] of [[0.16, -0.08], [-0.12, 0.06], [0.02, -0.16]]) this.part('base', 0.07, 0.04, 0.07, C.moss, x, bh / 2 + 0.01, z);
    }
    if (P.tail) for (let i = 0; i < 3; i++) this.part('base', bw * (0.9 - i * 0.1), 0.03, 0.05, C.dark, 0, bh / 2 + 0.005, bd * (0.25 - i * 0.2)); // plates
    // head end
    this.joint('head', 'base', 0, 0, bd / 2);
    if (P.eyes === 'stalks') for (const sx of [-1, 1]) { this.part('head', 0.03, 0.12, 0.03, C.dark, sx * 0.09, bh * 0.6, 0); this.part('head', 0.055, 0.055, 0.055, look.eyes, sx * 0.09, bh * 0.6 + 0.07, 0, { glow: 6 }); }
    if (P.eyes === 'pair') for (const sx of [-1, 1]) this.part('head', 0.05, 0.04, 0.03, look.eyes, sx * 0.06, bh * 0.45, -0.02, { glow: 6 });
    if (P.eyes === 'cluster') {
      this.part('head', 0.2, 0.13, 0.12, C.shell, 0, 0.02, 0.05);
      for (const [x, y, s] of [[0.045, 0.06, 0.05], [-0.045, 0.06, 0.05], [0.08, 0.02, 0.035], [-0.08, 0.02, 0.035], [0.025, 0.1, 0.03], [-0.025, 0.1, 0.03]]) this.part('head', s, s, 0.02, look.eyes, x, y, 0.115, { glow: 7 });
    }
    if (P.fangs) for (const [n, sx] of [['fangL', 1], ['fangR', -1]]) { this.joint(n, 'head', sx * 0.045, -0.04, 0.1); this.part(n, 0.04, 0.12, 0.04, C.tip, 0, -0.05, 0.02, { rx: 0.3 }); }
    if (P.abdomen) {
      this.joint('abd', 'base', 0, 0.06, -bd / 2);
      this.part('abd', 0.44, 0.34, 0.46, C.shell, 0, 0.06, -0.22);
      this.part('abd', 0.36, 0.06, 0.36, C.dark, 0, 0.24, -0.22);
      for (const [x, z, w2] of [[0, -0.12, 0.1], [0.07, -0.24, 0.06], [-0.07, -0.24, 0.06], [0, -0.32, 0.08]]) this.part('abd', w2, 0.02, w2, C.mark, x, 0.235, z, { glow: 1.6 }); // a pale skull mark
    }
    // pincers: an arm forward, a claw at its end with a moving finger
    if (P.pincer) {
      const s = P.pincer;
      for (const [n, sx] of [['L', 1], ['R', -1]]) {
        this.joint('arm' + n, 'base', sx * bw * 0.36, 0.02, bd * 0.42);
        this.part('arm' + n, 0.07 * s, 0.07 * s, 0.2 * s, C.claw, 0, 0, 0.1 * s);
        this.joint('claw' + n, 'arm' + n, 0, 0, 0.2 * s);
        this.part('claw' + n, 0.13 * s, 0.11 * s, 0.2 * s, C.claw, 0, 0, 0.09 * s);
        this.part('claw' + n, 0.06 * s, 0.05 * s, 0.13 * s, C.tip, sx * 0.03 * s, 0, 0.24 * s);
        this.joint('jaw' + n, 'claw' + n, -sx * 0.045 * s, 0, 0.17 * s);
        this.part('jaw' + n, 0.045 * s, 0.045 * s, 0.15 * s, C.tip, 0, 0, 0.07 * s);
      }
      this.j.clawR.add(this.hand); this.hand.position.set(0, 0, 0.1); this.j.clawR.add(this.tip); this.tip.position.set(0, 0, 0.3 * s);
    } else { this.j.head.add(this.hand); this.hand.position.set(0, 0, 0.05); this.j.head.add(this.tip); this.tip.position.set(0, -0.06, 0.18); }
    // a scorpion's tail: segments curling up over the back, the sting glowing at the end
    if (P.tail) {
      let parent = 'base';
      for (let i = 0; i < P.tail; i++) {
        const n = 't' + i; this.joint(n, parent, 0, i ? 0 : bh * 0.3, i ? -0.15 : -bd / 2);
        this.part(n, 0.12 - i * 0.008, 0.1 - i * 0.006, 0.16, i % 2 ? C.dark : C.shell, 0, 0, -0.08);
        parent = n;
      }
      this.joint('sting', parent, 0, 0, -0.16);
      this.part('sting', 0.13, 0.13, 0.13, C.sting, 0, 0, -0.05, { glow: 2.4 });
      this.part('sting', 0.035, 0.035, 0.15, C.tip, 0, -0.06, -0.14, { rx: 0.9 });
      this.j.sting.add(this.tip); this.tip.position.set(0, -0.1, -0.2);
    }
    // legs
    this.legs = [];
    P.legs.forEach((z, i) => {
      for (const sx of [1, -1]) {
        const n = 'l' + i + (sx > 0 ? 'L' : 'R');
        const holder = this.fixed('base', sx * bw * 0.45, -bh * 0.15, z * (bd / 0.46), 0, sx * (P.splay * (z > 0 ? -1 : 1) * (Math.abs(z) / 0.15)), 0);
        this.joint(n, holder, 0, 0, 0);
        this.part(n, P.up, 0.055, 0.055, i % 2 ? C.dark : C.shell, sx * P.up / 2, 0, 0);
        this.joint(n + 'k', n, sx * P.up, 0, 0);
        this.part(n + 'k', P.low, 0.045, 0.045, C.dark, sx * P.low / 2, 0, 0);
        this.part(n + 'k', 0.05, 0.05, 0.05, C.tip, sx * P.low, 0, 0);
        this.legs.push({ n, sx, i });
      }
    });
  }

  animate(e, t, dt) {
    this.time += dt; const tm = this.time; const sp = this.speedOf(e); const P = this.P; const anim = e.anim;
    // legs: hip lift (rz), swing (ry); knee bend (rz); mirrored on the right
    const legPose = (fn) => { const o = {}; for (const L of this.legs) { const [lift, swing, knee] = fn(L); o[L.n] = [0, L.sx * swing, L.sx * (P.hip + lift)]; o[L.n + 'k'] = [0, 0, L.sx * (P.knee + knee)]; } return o; };
    const stand = legPose(() => [0, 0, 0]);
    const walking = (amp) => { this.gait += dt * (2 + sp * 3.2); const g = this.gait; return legPose((L) => { const ph = g + (L.i + (L.sx > 0 ? 0 : 1)) * Math.PI; return [Math.max(0, Math.cos(ph)) * 0.35 * amp, Math.sin(ph) * 0.35 * amp, -Math.max(0, Math.cos(ph)) * 0.2 * amp]; }); };
    const crouch = (k) => legPose(() => [-0.35 * k, 0, 0.45 * k]);
    const claws = (raise, open, jaw = 0.2, side = 0) => P.pincer ? { armL: [-raise, open + side, 0], armR: [-raise, -open + side, 0], clawL: [0, -open * 0.6, 0], clawR: [0, open * 0.6, 0], jawL: [0, jaw, 0], jawR: [0, -jaw, 0] } : {};
    // the tail runs back (-Z): a positive rx curls it up and over
    const tail = (curl, strike = 0) => { if (!P.tail) return {}; const o = {}; for (let i = 0; i < P.tail; i++) o['t' + i] = [(i ? curl : curl * 0.6) + strike * (i > 1 ? 0.35 : 0.15), Math.sin(tm * 2 + i) * 0.04, 0]; o.sting = [0.5 + strike * 0.6, 0, 0]; return o; };
    const abd = (k) => (P.abdomen ? { abd: [k, Math.sin(tm * 1.5) * 0.05, 0] } : {});
    const fangs = (k) => (P.fangs ? { fangL: [k, 0, -0.3 * k], fangR: [k, 0, 0.3 * k] } : {});
    const rest = { ...claws(0.1, 0.2, 0.15), ...tail(0.55), ...abd(0), ...fangs(0) };
    let pose, rate = 16;
    if ((anim === 'walk' || anim === 'run' || anim === 'idle') && sp > 0.4) {
      pose = { ...walking(Math.min(1.2, 0.5 + sp * 0.2)), ...rest, lift: Math.abs(Math.sin(this.gait)) * 0.015, roll: Math.sin(this.gait) * 0.03, ...claws(0.2, 0.25, 0.15 + Math.sin(tm * 6) * 0.1) }; rate = 24;
    } else if (anim === 'idle' || anim === 'walk' || anim === 'run') {
      pose = { ...stand, ...rest, lift: Math.sin(tm * 2) * 0.006, ...claws(0.15 + Math.sin(tm * 1.7) * 0.05, 0.25, 0.1 + Math.max(0, Math.sin(tm * 3)) * 0.25), ...fangs(Math.max(0, Math.sin(tm * 2.5)) * 0.3) };
      if (e.ai && !e.ai.aggro) pose = { ...crouch(0.6), ...claws(-0.1, 0.05, 0), ...tail(0.4), ...abd(-0.1), lift: -0.08 };
    } else if (anim === 'pinch') {
      const ph = this.atkPhase(e, t, { windup: 0.42, active: 0.54, dur: 0.85 });
      if (ph.part === 'windup') pose = { ...stand, ...rest, ...claws(0.6, 0.6, 0.7), pitch: -0.1 };
      else if (ph.part === 'strike') { pose = { ...stand, ...rest, ...claws(0.1, -0.1, -0.05), pitch: 0.12, lift: -0.02 }; rate = 40; }
      else pose = { ...stand, ...rest };
    } else if (anim === 'sweep') { // both claws swung across the front
      const ph = this.atkPhase(e, t, { windup: 0.7, active: 0.88, dur: 1.35 });
      if (ph.part === 'windup') pose = { ...crouch(0.3), ...rest, ...claws(0.5, 0.8, 0.6, 0.7), roll: -0.12 };
      else if (ph.part === 'strike') { pose = { ...stand, ...rest, ...claws(0.2, 0.3, 0.1, -0.9), roll: 0.15, pitch: 0.08 }; rate = 34; }
      else pose = { ...stand, ...rest };
    } else if (anim === 'sting') { // the tail drawn back high, then lashed forward over the head
      const ph = this.atkPhase(e, t, { windup: 0.62, active: 0.76, dur: 1.25 });
      if (ph.part === 'windup') pose = { ...crouch(0.3), ...claws(0.3, 0.5, 0.4), ...tail(0.95 * ease(ph.k) + 0.55 * (1 - ph.k)), pitch: -0.12 * ph.k };
      else if (ph.part === 'strike') { pose = { ...stand, ...claws(0.1, 0.6, 0.2), ...tail(0.2, 1.6), pitch: 0.18 }; rate = 40; }
      else pose = { ...stand, ...rest };
    } else if (anim === 'bite') {
      const ph = this.atkPhase(e, t, { windup: 0.36, active: 0.48, dur: 0.8 });
      if (ph.part === 'windup') pose = { ...crouch(0.2), ...rest, ...fangs(0.8), pitch: -0.25, ...legPose((L) => [L.i === 0 ? 0.8 : 0, L.i === 0 ? -0.4 : 0, 0]) };
      else if (ph.part === 'strike') { pose = { ...stand, ...rest, ...fangs(-0.3), pitch: 0.2 }; rate = 40; }
      else pose = { ...stand, ...rest };
    } else if (anim === 'spit') { // rears up, front legs raised, abdomen tucked
      const ph = this.atkPhase(e, t, { windup: 0.55, active: 0.57, dur: 1.1 });
      const rear = { ...rest, ...abd(-0.5), ...fangs(0.6), pitch: -0.45, lift: 0.08, ...legPose((L) => (L.i < 2 ? [0.9, -0.5, 0.6] : [-0.2, 0.1, 0.2])) };
      pose = ph.part === 'windup' ? rear : (ph.part === 'strike' ? { ...rear, pitch: -0.2, ...abd(0.2) } : { ...stand, ...rest }); rate = ph.part === 'strike' ? 40 : 18;
    } else if (anim === 'leap') {
      const ph = this.atkPhase(e, t, { windup: 0.55, active: 0.9, dur: 1.3 });
      if (ph.part === 'windup') pose = { ...crouch(0.8), ...rest, ...fangs(0.5), pitch: -0.15, lift: -0.06 };
      else if (ph.part === 'strike') { pose = { ...legPose((L) => [0.6, L.i < 2 ? -0.5 : 0.5, 1.0]), ...rest, ...fangs(0.9), pitch: 0.2 }; rate = 30; }
      else { pose = { ...crouch(0.5 * (1 - ph.k)), ...rest, ...fangs(-0.2) }; rate = 20; }
    } else if (anim === 'burrow') { // digs in, sinking with sand flying
      const k = clamp01(t / 0.4); pose = { ...walking(1.5), ...rest, ...claws(-0.3, 0.6, 0.5), lift: -0.6 * ease(k), pitch: 0.35, roll: Math.sin(t * 40) * 0.08 }; rate = 22;
    } else if (anim === 'emerge') {
      const k = clamp01(t / 0.5); pose = { ...stand, ...claws(0.7, 0.7, 0.7), ...tail(0.9), lift: -0.6 * (1 - ease(k)) + Math.sin(k * Math.PI) * 0.12, pitch: -0.3 * (1 - k) }; rate = 30;
    } else if (anim === 'hurt') {
      pose = { ...crouch(0.3), ...rest, ...claws(0.5, 0.7, 0.6), pitch: -0.2, roll: Math.sin(t * 30) * 0.06, lift: -0.02 }; rate = 30;
    } else if (anim === 'stagger') {
      pose = { ...crouch(0.9), ...claws(-0.2, 0.9, 0.7), ...tail(0.2), ...abd(-0.2), lift: -0.08, roll: Math.sin(t * 6) * 0.1, pitch: 0.1 }; rate = 10;
    } else if (anim === 'die' || anim === 'dieHard') { // on its back, legs curled
      const k = clamp01(t / 0.5);
      pose = { ...legPose(() => [0.8, 0, 1.2]), ...claws(0.6, 0.2, 0.6), ...tail(0.2), lift: 0.05 * Math.sin(k * Math.PI) - 0.02, roll: Math.PI * ease(k) * 0.97, pitch: 0 }; rate = 9;
    } else if (anim === 'rise') {
      const k = clamp01(t / 0.9); pose = { ...stand, ...rest, lift: -0.7 * (1 - ease(k)), pitch: -0.3 * (1 - k) }; rate = 30;
    } else if (anim === 'roar') pose = { ...stand, ...claws(0.9, 0.9, 0.8), ...tail(1.0), ...fangs(0.8), pitch: -0.2 };
    else pose = { ...stand, ...rest };
    this.pose(pose, dt, rate);
  }
}

// ------------------------------------------------------------------ the ice wraith: a floating, tattered shroud
class Wraith extends Beast {
  constructor(look) {
    super(look); const C = look.colors; this.baseY = 0.95;
    this.joint('base', null, 0, this.baseY, 0);
    this.joint('chest', 'base', 0, 0.2, 0);
    this.part('chest', 0.42, 0.34, 0.28, C.robe, 0, 0.12, 0);
    this.part('chest', 0.5, 0.1, 0.32, C.dark, 0, 0.28, -0.02); // hunched shoulders
    this.joint('head', 'chest', 0, 0.36, 0.04);
    this.part('head', 0.3, 0.3, 0.3, C.robe, 0, 0.12, 0);
    this.part('head', 0.32, 0.12, 0.34, C.rag, 0, 0.26, -0.02);
    this.part('head', 0.22, 0.18, 0.02, 0x060a12, 0, 0.1, 0.155);
    for (const sx of [-1, 1]) this.part('head', 0.06, 0.04, 0.02, look.eyes, sx * 0.055, 0.12, 0.165, { glow: 7 });
    // the robe tapers into tatters that trail and sway
    this.joint('r0', 'base', 0, 0.05, 0); this.part('r0', 0.4, 0.3, 0.28, C.robe, 0, -0.12, 0);
    this.joint('r1', 'r0', 0, -0.28, 0); this.part('r1', 0.32, 0.26, 0.22, C.dark, 0, -0.12, -0.02);
    this.joint('r2', 'r1', 0, -0.24, 0);
    for (const [x, z, h] of [[0.1, 0.06, 0.32], [-0.1, 0.05, 0.26], [0.03, -0.08, 0.36], [-0.08, -0.07, 0.3], [0.11, -0.05, 0.22]]) this.part('r2', 0.07, h, 0.06, C.rag, x, -h / 2, z);
    for (const [n, x] of [['L', 1], ['R', -1]]) {
      this.joint('sh' + n, 'chest', x * 0.26, 0.24, 0.02);
      this.part('sh' + n, 0.12, 0.3, 0.12, C.robe, 0, -0.14, 0);
      this.part('sh' + n, 0.15, 0.1, 0.15, C.rag, 0, -0.26, 0); // a ragged cuff
      this.joint('el' + n, 'sh' + n, 0, -0.3, 0);
      this.part('el' + n, 0.08, 0.16, 0.08, C.dark, 0, -0.08, 0);
      for (let i = -1; i <= 1; i++) this.part('el' + n, 0.025, 0.18, 0.025, C.claw, i * 0.03, -0.24, 0.02, { glow: 1.6, rx: -0.2 });
    }
    this.j.elR.add(this.hand); this.hand.position.set(0, -0.2, 0); this.j.elR.add(this.tip); this.tip.position.set(0, -0.34, 0.05);
    // shards of ice wheeling round it
    this.orbit = this.joint('orbit', 'base', 0, 0.3, 0);
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; this.part('orbit', 0.09, 0.18, 0.09, C.ice, Math.sin(a) * 0.55, Math.cos(a * 2) * 0.08, Math.cos(a) * 0.55, { glow: 2.2, rz: 0.4 }); }
  }
  animate(e, t, dt) {
    this.time += dt; const tm = this.time; const sp = this.speedOf(e); const anim = e.anim;
    const sway = (k = 1) => ({ r0: [0.1 * k + sp * 0.04, 0, Math.sin(tm * 1.7) * 0.05], r1: [0.15 * k + sp * 0.05, 0, Math.sin(tm * 1.7 - 0.8) * 0.1], r2: [0.2 * k + sp * 0.06, Math.sin(tm * 2.2) * 0.2, Math.sin(tm * 1.7 - 1.6) * 0.15] });
    const arms = (a, el, spread = 0.15) => ({ shL: [a, 0, spread], shR: [a, 0, -spread], elL: [el, 0, 0], elR: [el, 0, 0] });
    let pose, rate = 12, spin = 1.6;
    const float = { lift: Math.sin(tm * 2.1) * 0.08, pitch: Math.min(0.35, sp * 0.06), ...sway(), ...arms(-0.25, -0.4), chest: [0.15, 0, 0], head: [-0.05, Math.sin(tm * 0.7) * 0.25, 0] };
    if (anim === 'idle' || anim === 'walk' || anim === 'run') pose = float;
    else if (anim === 'cast') {
      const ph = this.atkPhase(e, t, { windup: 0.6, active: 0.62, dur: 1.2 });
      if (ph.part === 'windup') pose = { ...float, ...arms(-1.0 - ph.k * 1.2, -0.9, 0.35), chest: [-0.2, 0, 0], head: [0.1, 0, 0] };
      else { pose = { ...float, ...arms(-1.55, -0.1, 0.05), chest: [0.3, 0, 0], head: [-0.15, 0, 0] }; rate = ph.part === 'strike' ? 40 : 10; }
    } else if (anim === 'nova') { // arms raised wide, shards spinning hard, then flung down and out
      const ph = this.atkPhase(e, t, { windup: 0.95, active: 0.97, dur: 1.6 }); spin = ph.part === 'windup' ? 3 + ph.k * 12 : 6;
      if (ph.part === 'windup') pose = { ...float, lift: 0.25 * ph.k, ...arms(-2.6, -0.3, 0.9), chest: [-0.3, 0, 0], head: [0.3, 0, 0] };
      else { pose = { ...float, lift: -0.1, ...arms(-0.5, 0, 1.3), chest: [0.35, 0, 0], head: [-0.2, 0, 0], ...sway(-1.5) }; rate = ph.part === 'strike' ? 40 : 8; }
    } else if (anim === 'hurt') { pose = { ...float, ...arms(-0.6, -1.0, 0.5), chest: [-0.35, 0.3, 0], head: [0.3, 0.3, 0], roll: Math.sin(t * 30) * 0.06 }; rate = 30; }
    else if (anim === 'stagger') { pose = { ...float, lift: -0.35, ...arms(0.2, -0.2, 0.4), chest: [0.6, 0, 0], head: [0.5, 0, 0.2], roll: Math.sin(t * 5) * 0.12, ...sway(-0.5) }; rate = 10; spin = 0.4; }
    else if (anim === 'die' || anim === 'dieHard') { const k = clamp01(t / 0.8); pose = { lift: -0.85 * ease(k), roll: 1.3 * ease(k), pitch: 0.2, ...arms(-0.3, -0.2, 0.8), ...sway(1.5), chest: [0.4, 0, 0] }; rate = 6; spin = 0; }
    else if (anim === 'rise') { const k = clamp01(t / 0.9); pose = { ...float, lift: -1.2 * (1 - ease(k)), ...arms(-2.2, -0.3, 0.6) }; rate = 20; }
    else if (anim === 'roar') pose = { ...float, ...arms(-2.4, -0.2, 0.8), chest: [-0.3, 0, 0], head: [0.4, 0, 0] };
    else pose = float;
    this.pose(pose, dt, rate);
    this.spinA = (this.spinA || 0) + dt * spin; this.orbit.rotation.set(0, this.spinA, 0);
  }
}

// ------------------------------------------------------------------ the sandworm: a ringed column with a petalled maw
class Worm extends Beast {
  constructor(look) {
    super(look); const C = look.colors; this.baseY = 0;
    this.joint('base', null, 0, 0, 0);
    // a mound of sand round its root (stays on the ground while the body sways)
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; this.part(this.body, 0.42, 0.12, 0.3, C.sand, Math.sin(a) * 0.55, 0.05, Math.cos(a) * 0.55, { ry: a }); }
    this.part(this.body, 0.9, 0.06, 0.9, C.sand, 0, 0.02, 0);
    // ringed segments, each an octagon (a box and the same box turned 45 degrees), bulging in the middle,
    // a dark band between them and a row of hooked spines down the back
    let parent = 'base'; const N = 5;
    for (let i = 0; i < N; i++) {
      const n = 's' + i; const wdt = 0.7 - i * 0.05; this.joint(n, parent, 0, i ? 0.4 : 0, 0);
      this.part(n, wdt, 0.34, wdt, C.skin, 0, 0.2, 0);
      this.part(n, wdt * 0.92, 0.3, wdt * 0.92, C.skin, 0, 0.2, 0, { ry: Math.PI / 4 });
      this.part(n, wdt * 0.6, 0.3, 0.06, C.dark, 0, 0.2, wdt * 0.47); // the paler belly plates face forward
      this.part(n, wdt * 0.82, 0.09, wdt * 0.82, C.ring, 0, 0.385, 0, { ry: Math.PI / 8 });
      this.part(n, 0.08, 0.16, 0.12, C.teeth, 0, 0.26, -wdt / 2 - 0.03, { rx: -0.5 }); // a spine on the back
      parent = n;
    }
    // the head: a blunt end facing forward and up, four mandibles round a maw of teeth
    this.joint('head', parent, 0, 0.42, 0);
    this.part('head', 0.56, 0.4, 0.56, C.skin, 0, 0.18, -0.02);
    this.part('head', 0.42, 0.34, 0.04, C.maw, 0, 0.18, 0.27);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; this.part('head', 0.06, 0.06, 0.05, C.teeth, Math.sin(a) * 0.13, 0.18 + Math.cos(a) * 0.11, 0.28); }
    this.part('head', 0.2, 0.18, 0.02, 0xff5020, 0, 0.18, 0.285, { glow: 2.2 }); // the gullet glows
    for (const sx of [-1, 1]) this.part('head', 0.06, 0.05, 0.04, look.eyes, sx * 0.24, 0.3, 0.18, { glow: 6 });
    for (const [n, x, y, rz] of [['mU', 0, 0.38, 0], ['mD', 0, -0.02, Math.PI], ['mL', 0.25, 0.18, -Math.PI / 2], ['mR', -0.25, 0.18, Math.PI / 2]]) {
      const hold = this.fixed('head', x, y, 0.26, 0, 0, rz); this.joint(n, hold, 0, 0, 0);
      this.part(n, 0.34, 0.08, 0.26, C.dark, 0, 0.02, 0.12); this.part(n, 0.06, 0.06, 0.08, C.teeth, 0.1, -0.04, 0.24); this.part(n, 0.06, 0.06, 0.08, C.teeth, -0.1, -0.04, 0.24);
    }
    this.j.head.add(this.hand); this.hand.position.set(0, 0.18, 0.2); this.j.head.add(this.tip); this.tip.position.set(0, 0.18, 0.5);
    this.N = N;
  }
  animate(e, t, dt) {
    this.time += dt; const tm = this.time; const anim = e.anim; const N = this.N;
    const chain = (rx, ry = 0, amp = 0.06) => { const o = {}; for (let i = 0; i < N; i++) o['s' + i] = [rx * (i ? 1 : 0.5), ry + Math.sin(tm * 1.6 - i * 0.7) * amp, Math.cos(tm * 1.3 - i * 0.6) * amp]; return o; };
    const maw = (k) => ({ mU: [-k, 0, 0], mD: [-k, 0, 0], mL: [-k, 0, 0], mR: [-k, 0, 0] });
    let pose, rate = 10;
    const idle = { ...chain(0.12), head: [0.35, 0, 0], ...maw(0.15 + Math.max(0, Math.sin(tm * 2)) * 0.25) };
    if (anim === 'idle' || anim === 'walk' || anim === 'run') pose = idle;
    else if (anim === 'bite') {
      const ph = this.atkPhase(e, t, { windup: 0.7, active: 0.85, dur: 1.3 });
      if (ph.part === 'windup') pose = { ...chain(-0.14 * ph.k, 0, 0.03), head: [-0.1, 0, 0], ...maw(0.9), lift: 0.1 * ph.k };
      else if (ph.part === 'strike') { pose = { ...chain(0.32, 0, 0.02), head: [0.75, 0, 0], ...maw(-0.1), lift: -0.15 }; rate = 34; }
      else pose = idle;
    } else if (anim === 'spit') {
      const ph = this.atkPhase(e, t, { windup: 0.6, active: 0.62, dur: 1.25 });
      if (ph.part === 'windup') pose = { ...chain(-0.1 * ph.k, 0, 0.03), head: [-0.3, 0, 0], ...maw(1.1) };
      else { pose = { ...chain(0.18), head: [0.45, 0, 0], ...maw(ph.part === 'strike' ? 1.2 : 0.4) }; rate = ph.part === 'strike' ? 36 : 10; }
    } else if (anim === 'burrow') { const k = clamp01(t / 0.6); pose = { ...chain(0.2, Math.sin(t * 20) * 0.1, 0.12), head: [0.9, 0, 0], ...maw(0), lift: -2.9 * ease(k) }; rate = 18; }
    else if (anim === 'emerge') { const k = clamp01(t / 0.45); pose = { ...chain(-0.1, 0, 0.1), head: [-0.2, 0, 0], ...maw(1.0), lift: -2.9 * (1 - ease(k)) + Math.sin(k * Math.PI) * 0.35 }; rate = 34; }
    else if (anim === 'hurt') { pose = { ...chain(-0.18, 0.2, 0.04), head: [0.1, 0.3, 0], ...maw(0.7), roll: Math.sin(t * 30) * 0.04 }; rate = 28; }
    else if (anim === 'stagger') { pose = { ...chain(0.3, 0, 0.05), head: [0.9, 0, 0.2], ...maw(0.4), lift: -0.5, roll: Math.sin(t * 5) * 0.08 }; rate = 8; }
    else if (anim === 'die' || anim === 'dieHard') { const k = clamp01(t / 0.8); pose = { ...chain(0.32 * ease(k), 0, 0), s0: [1.2 * ease(k), 0, 0], head: [0.4, 0, 0], ...maw(0.6), lift: -0.3 * k }; rate = 6; }
    else if (anim === 'rise') { const k = clamp01(t / 0.9); pose = { ...idle, lift: -2.9 * (1 - ease(k)) }; rate = 26; }
    else if (anim === 'roar') pose = { ...chain(-0.2, 0, 0.1), head: [-0.5, 0, 0], ...maw(1.2) };
    else pose = idle;
    this.pose(pose, dt, rate);
  }
}

// ------------------------------------------------------------------ the slime: a jelly cube with a glowing core and old bones inside
class Slime extends Beast {
  constructor(look) {
    super(look); const C = look.colors; this.baseY = 0;
    this.joint('base', null, 0, 0, 0);
    this.sq = 1; this.sqv = 0;
    this.jelly = this.joint('jelly', 'base', 0, 0, 0);
    this.part('jelly', 0.86, 0.66, 0.86, C.jelly, 0, 0.33, 0, { material: jellyMat(C.jelly, 0.78) });
    this.part('jelly', 0.7, 0.08, 0.7, C.core, 0, 0.67, 0, { material: jellyMat(C.core, 0.7) }); // a bright crown where the light catches
    this.part('jelly', 0.26, 0.26, 0.26, C.core, 0.05, 0.3, -0.05, { glow: 1.8 });
    this.part('jelly', 0.18, 0.16, 0.16, C.bone, -0.18, 0.18, 0.12); // a drowned skull
    this.part('jelly', 0.12, 0.04, 0.03, C.dark, -0.18, 0.16, 0.205);
    this.part('jelly', 0.04, 0.3, 0.04, C.bone, 0.2, 0.2, 0.18, { rz: 0.9 });
    for (const sx of [-1, 1]) { this.part('jelly', 0.1, 0.12, 0.02, look.eyes || 0x081008, sx * 0.17, 0.5, 0.435); this.part('jelly', 0.035, 0.035, 0.02, 0xffffff, sx * 0.17 + 0.02, 0.53, 0.445, { glow: 1.5 }); }
    for (const [x, z] of [[0.4, 0.4], [-0.4, 0.35], [0.38, -0.4], [-0.35, -0.38]]) this.part('jelly', 0.12, 0.08, 0.12, C.jelly, x, 0.03, z, { material: jellyMat(C.jelly, 0.85) }); // drips
    this.jelly.add(this.hand); this.hand.position.set(0, 0.4, 0.3); this.jelly.add(this.tip); this.tip.position.set(0, 0.3, 0.5);
  }
  animate(e, t, dt) {
    this.time += dt; const tm = this.time; const sp = this.speedOf(e); const anim = e.anim;
    let sq = 1 + Math.sin(tm * 4.2) * 0.05, lift = 0, pitch = 0, roll = 0, rate = 12;
    if ((anim === 'walk' || anim === 'run' || anim === 'idle') && sp > 0.3) { this.gait += dt * 9; const s = Math.sin(this.gait); lift = Math.max(0, s) * 0.22; sq = s > 0 ? 1 + s * 0.22 : 1 + s * 0.25; pitch = 0.12; }
    else if (anim === 'hop') {
      const ph = this.atkPhase(e, t, { windup: 0.72, active: 1.12, dur: 1.55 });
      if (ph.part === 'windup') sq = 1 - 0.42 * ease(ph.k); else if (ph.part === 'strike') { sq = ph.k < 0.8 ? 1.35 : 0.5; rate = 30; } else { sq = 0.6 + 0.4 * ease(ph.k) + Math.sin(ph.k * 20) * 0.08 * (1 - ph.k); rate = 20; }
    } else if (anim === 'squish') {
      const ph = this.atkPhase(e, t, { windup: 0.55, active: 0.66, dur: 1.1 });
      if (ph.part === 'windup') { sq = 1 + 0.4 * ease(ph.k); lift = 0.1 * ph.k; } else if (ph.part === 'strike') { sq = 0.42; rate = 40; } else { sq = 0.42 + 0.58 * ease(ph.k); rate = 16; }
    } else if (anim === 'hurt') { sq = 1 + Math.sin(t * 40) * 0.18; rate = 30; }
    else if (anim === 'stagger') { sq = 0.78 + Math.sin(tm * 9) * 0.1; roll = Math.sin(tm * 5) * 0.12; }
    else if (anim === 'die' || anim === 'dieHard') { sq = 0.12 + 0.88 * (1 - ease(clamp01(t / 0.5))); rate = 14; }
    else if (anim === 'rise') { sq = 0.12 + 0.88 * ease(clamp01(t / 0.9)); rate = 20; }
    else if (anim === 'roar') sq = 1.25;
    // a little springiness on top of the eased squash
    const k = 1 - Math.exp(-rate * dt); this.sqv += (sq - this.sq) * k * 0.9 - this.sqv * 0.18; this.sq = Math.max(0.08, this.sq + this.sqv);
    const w = 1 / Math.sqrt(this.sq); this.jelly.scale.set(w, this.sq, w);
    this.pose({ lift, pitch, roll }, dt, rate);
  }
}

// ------------------------------------------------------------------ the seraph: an eye in wheels of eyes, six wings, a halo
class Seraph extends Beast {
  constructor(look) {
    super(look); const C = look.colors; this.baseY = 1.55;
    this.joint('base', null, 0, this.baseY, 0);
    this.joint('core', 'base', 0, 0, 0);
    this.part('core', 0.46, 0.46, 0.46, C.eye, 0, 0, 0);
    this.part('core', 0.5, 0.08, 0.5, C.dark, 0, 0.23, 0); this.part('core', 0.5, 0.08, 0.5, C.dark, 0, -0.23, 0); // lids
    this.part('core', 0.28, 0.28, 0.03, C.iris, 0, 0, 0.235, { glow: 2.2 });
    this.pupil = this.part('core', 0.12, 0.14, 0.03, 0x080604, 0, 0, 0.25);
    this.beamGlow = this.part('core', 0.14, 0.14, 1.4, 0xfff0c0, 0, 0, 0.95, { glow: 3 }); this.beamGlow.visible = false;
    // two wheels turning on different axes, set with eyes
    const wheel = (name, r, n, rot) => {
      const hold = this.fixed('base', 0, 0, 0, rot[0], rot[1], rot[2]); const g = this.joint(name, hold, 0, 0, 0);
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; this.part(name, 0.09, 0.2, 0.09, i % 2 ? C.ring : C.dark, Math.sin(a) * r, Math.cos(a) * r, 0, { rz: -a }); }
      for (let i = 0; i < 4; i++) { const a = (i + 0.5) / 4 * Math.PI * 2; this.part(name, 0.1, 0.1, 0.11, C.eye, Math.sin(a) * r, Math.cos(a) * r, 0); this.part(name, 0.05, 0.05, 0.12, C.iris, Math.sin(a) * r, Math.cos(a) * r, 0, { glow: 3 }); }
      return g;
    };
    this.wa = wheel('wheelA', 0.62, 14, [0, 0, 0]); this.wb = wheel('wheelB', 0.78, 16, [0, Math.PI / 2, 0]);
    // six wings round the eye: upper, middle and lower pairs, feathers in two tones
    this.wings = [];
    for (const [ang, len] of [[0.45, 0.9], [-0.15, 1.05], [-0.75, 0.8]]) for (const sx of [1, -1]) {
      const hold = this.fixed('base', sx * 0.2, 0, -0.18, 0, 0, sx > 0 ? ang : Math.PI - ang);
      const n = 'wing' + this.wings.length; this.joint(n, hold, 0, 0, 0); this.wings.push(n);
      for (let k = 0; k < 3; k++) this.part(n, len * (1 - k * 0.18), 0.04, 0.14, k % 2 ? C.wingDark : C.wing, len * (1 - k * 0.18) / 2 + 0.05, k * 0.05 - 0.05, -k * 0.09);
      this.part(n, 0.12, 0.05, 0.05, C.ring, 0.08, 0, 0.05);
    }
    // a halo above
    const halo = this.fixed('base', 0, 0.62, -0.05, Math.PI / 2 - 0.3, 0, 0);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; this.part(halo, 0.1, 0.05, 0.05, C.iris, Math.sin(a) * 0.3, Math.cos(a) * 0.3, 0, { glow: 2.2, rz: -a }); }
    this.j.core.add(this.hand); this.hand.position.set(0, 0, 0.25); this.j.core.add(this.tip); this.tip.position.set(0, 0, 0.6);
  }
  animate(e, t, dt) {
    this.time += dt; const tm = this.time; const anim = e.anim;
    const flap = (amp, f = 2.2, spread = 0) => { const o = {}; this.wings.forEach((n, i) => { o[n] = [0, Math.sin(tm * f + i * 0.5) * amp - spread, 0]; }); return o; };
    let pose, rate = 8, spin = 1, beam = false, dil = 1;
    const float = { lift: Math.sin(tm * 1.4) * 0.1, ...flap(0.35), core: [0, Math.sin(tm * 0.9) * 0.1, 0] };
    if (anim === 'idle' || anim === 'walk' || anim === 'run') pose = float;
    else if (anim === 'gaze') {
      const ph = this.atkPhase(e, t, { windup: 1.05, active: 1.9, dur: 2.3 });
      if (ph.part === 'windup') { pose = { ...float, ...flap(0.15, 6, 0.4), lift: 0.15 * ph.k }; spin = 1 + ph.k * 5; dil = 1 - ph.k * 0.6; rate = 10; }
      else if (ph.part === 'strike') { pose = { ...float, ...flap(0.1, 8, 0.6) }; spin = 6; beam = true; dil = 0.4; }
      else { pose = float; spin = 2; }
    } else if (anim === 'pulse') {
      const ph = this.atkPhase(e, t, { windup: 0.9, active: 0.92, dur: 1.6 });
      if (ph.part === 'windup') { pose = { ...float, ...flap(0.1, 4, -0.7 * ph.k), lift: -0.2 * ph.k }; spin = 1 + ph.k * 6; dil = 1.4; }
      else { pose = { ...float, ...flap(0.2, 3, 0.9) }; rate = ph.part === 'strike' ? 40 : 6; spin = 3; }
    } else if (anim === 'hurt') { pose = { ...float, core: [-0.35, 0.3, 0], roll: Math.sin(t * 30) * 0.08, ...flap(0.6, 12) }; rate = 30; dil = 1.5; }
    else if (anim === 'stagger') { pose = { ...float, lift: -0.7, pitch: 0.4, roll: Math.sin(t * 5) * 0.15, ...flap(0.2, 1, -0.6) }; spin = 0.3; dil = 1.6; }
    else if (anim === 'die' || anim === 'dieHard') { const k = clamp01(t / 0.9); pose = { lift: -1.3 * ease(k), pitch: 0.6 * k, roll: 1.2 * ease(k), ...flap(0, 1, -1.1) }; spin = 0; rate = 5; dil = 2; }
    else if (anim === 'rise') { const k = clamp01(t / 0.9); pose = { ...float, lift: (1 - ease(k)) * 3 }; rate = 30; }
    else if (anim === 'roar') { pose = { ...float, ...flap(0.3, 5, 0.6) }; spin = 4; }
    else pose = float;
    this.pose(pose, dt, rate);
    this.spinA = (this.spinA || 0) + dt * spin; this.wa.rotation.set(0, 0, this.spinA * 0.9); this.wb.rotation.set(0, 0, -this.spinA * 1.3);
    this.beamGlow.visible = beam; this.pupil.scale.set(dil, dil, 1);
  }
}

// look.rig names one of these; null: not a beast of this file
export function makeBeast2(look) {
  switch (look.rig) {
    case 'bat': return new Bat(look);
    case 'crab': return new Crawler(look, CRAB);
    case 'scorpion': return new Crawler(look, SCORPION);
    case 'spider': return new Crawler(look, SPIDER);
    case 'wraith': return new Wraith(look);
    case 'worm': return new Worm(look);
    case 'slime': return new Slime(look);
    case 'seraph': return new Seraph(look);
  }
  return null;
}
