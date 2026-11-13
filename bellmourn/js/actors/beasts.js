// Bodies that are not people: the Grave Hound, the Plague Rat and the Gargoyle. Same building blocks as
// rig.js (a few boxes per limb, lit by the scene, glowing eyes) but their own skeletons and their own
// clips. makeBeast(look) returns null when look.rig names no beast, and the view then builds a Rig.
//
// The surface the view needs: root, flash(amount), updateCloak(dt, speed, turn), tip, handWorld(v),
// tipWorld(v), parts and animate(e, t, dt), which poses the body from e.anim / e.animT / e.atk itself.
// Every beast faces +Z in local space. Poses are { joint: [rx, ry, rz], lift, pitch, roll } and are
// eased towards each frame, so clips blend without a crossfade table.
import * as THREE from '../../vendor/three.module.min.js';
import { mat } from './rig.js';

const box = (() => { const c = new Map(); return (w, h, d) => { const k = `${w},${h},${d}`; if (!c.has(k)) c.set(k, new THREE.BoxGeometry(w, h, d)); return c.get(k); }; })();
const glowCache = new Map();
const glowMat = (color, k = 5) => { const key = color + ':' + k; if (!glowCache.has(key)) glowCache.set(key, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), fog: false })); return glowCache.get(key); };
const flashCache = new Map();
function flashMat(base, amount) {
  const q = Math.round(amount * 4) / 4; const k = base.uuid + q;
  if (!flashCache.has(k)) { const m = base.clone(); m.emissive = new THREE.Color(1, 1, 1); m.emissiveIntensity = q * 1.6; flashCache.set(k, m); }
  return flashCache.get(k);
}
const clamp01 = (k) => Math.max(0, Math.min(1, k));
const ease = (k) => k * k * (3 - 2 * k);
const lerp = (a, b, k) => a + (b - a) * k;
// blend two poses
function mixP(a, b, k) {
  const o = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[key], y = b[key];
    if (Array.isArray(x) || Array.isArray(y)) { const p = x || [0, 0, 0], q = y || [0, 0, 0]; o[key] = [lerp(p[0], q[0], k), lerp(p[1], q[1], k), lerp(p[2], q[2], k)]; }
    else o[key] = lerp(x || 0, y || 0, k);
  }
  return o;
}
// keyframes [[t, pose], ...] sampled at t
function keys(t, list) {
  if (t <= list[0][0]) return list[0][1];
  for (let i = 0; i < list.length - 1; i++) { const [t0, p0] = list[i], [t1, p1] = list[i + 1]; if (t <= t1) return mixP(p0, p1, ease(clamp01((t - t0) / Math.max(1e-3, t1 - t0)))); }
  return list[list.length - 1][1];
}
// where an attack clip is: 0..1 through the windup, then the strike, then the recovery
function phase(t, atk) {
  const w = atk.windup, a = atk.active, d = atk.dur;
  if (t < w) return { part: 'windup', k: clamp01(t / w) };
  if (t < a) return { part: 'strike', k: clamp01((t - w) / Math.max(0.01, a - w)) };
  return { part: 'recover', k: clamp01((t - a) / Math.max(0.01, d - a)) };
}

class Beast {
  constructor(look) {
    this.look = look; this.root = new THREE.Group(); this.body = new THREE.Group(); this.root.add(this.body);
    this.body.scale.setScalar(look.scale || 1);
    this.j = {}; this.parts = []; this.baseMats = new Map(); this.time = Math.random() * 10; this.gait = Math.random() * 6;
    this.cur = { lift: 0, pitch: 0, roll: 0 }; this.tip = new THREE.Object3D(); this.hand = new THREE.Object3D();
  }
  joint(name, parent, x, y, z) { const g = new THREE.Group(); g.position.set(x, y, z); (parent ? this.j[parent] : this.body).add(g); this.j[name] = g; return g; }
  part(joint, w, h, d, color, x, y, z, o = {}) {
    const m = new THREE.Mesh(box(w, h, d), o.glow ? glowMat(color, o.glow) : mat(color, o.emissive || 0, o.ei || 1));
    m.position.set(x, y, z); if (o.rx) m.rotation.x = o.rx; if (o.ry) m.rotation.y = o.ry; if (o.rz) m.rotation.z = o.rz;
    if (!o.glow) m.castShadow = true;
    this.j[joint].add(m); this.parts.push(m); return m;
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
}
const ZERO = [0, 0, 0];

// ------------------------------------------------------------------ four legs (the hound and the rat)
// size: a uniform scale of the hound's proportions; P: proportions and colours
class Quadruped extends Beast {
  constructor(look, P) {
    super(look); this.P = P; const C = look.colors; const s = P.s;
    const legH = P.leg * s; this.baseY = legH * 2 + 0.08 * s;
    this.joint('base', null, 0, this.baseY, 0);
    // body: a deep chest, a lean waist, haunches
    this.part('base', 0.28 * s * P.w, 0.34 * s * P.deep, 0.34 * s, C.fur, 0, 0.04 * s, 0.26 * s * P.len);
    this.part('base', 0.2 * s * P.w, 0.19 * s, 0.42 * s * P.len, C.dark, 0, 0.07 * s, -0.04 * s * P.len);
    this.part('base', 0.25 * s * P.w, 0.25 * s, 0.26 * s, C.fur, 0, 0.03 * s, -0.31 * s * P.len);
    if (P.ridge) for (let i = 0; i < 4; i++) this.part('base', 0.06 * s, 0.07 * s, 0.07 * s, C.bone, 0, 0.17 * s - Math.abs(i - 1.5) * 0.01 * s, (0.3 - i * 0.2) * s * P.len);
    if (P.sores) for (const [x, z] of [[0.09, 0.1], [-0.08, -0.15], [0.05, -0.32]]) this.part('base', 0.06 * s, 0.05 * s, 0.06 * s, C.sore, x * s, 0.15 * s, z * s * P.len, { glow: 2 });
    // neck, head, jaw
    this.joint('neck', 'base', 0, 0.12 * s, 0.38 * s * P.len);
    this.part('neck', 0.14 * s, 0.14 * s, 0.28 * s, C.fur, 0, 0.07 * s, 0.08 * s, { rx: -0.75 });
    this.joint('head', 'neck', 0, 0.18 * s, 0.17 * s);
    const hc = P.skull ? C.bone : C.fur;
    this.part('head', 0.2 * s, 0.17 * s, 0.22 * s, hc, 0, 0, 0.03 * s);
    this.part('head', 0.12 * s, 0.09 * s, P.snout * s, hc, 0, -0.03 * s, (0.13 + P.snout / 2) * s);
    if (P.skull) this.part('head', 0.13 * s, 0.05 * s, 0.05 * s, C.dark, 0, -0.07 * s, 0.17 * s); // the dark of the mouth
    for (const sx of [-1, 1]) {
      this.part('head', 0.055 * s, 0.045 * s, 0.03 * s, look.eyes || 0xff3020, sx * 0.06 * s, 0.03 * s, 0.14 * s, { glow: 6 });
      if (P.ears === 'round') this.part('head', 0.08 * s, 0.08 * s, 0.025 * s, C.tail || C.fur, sx * 0.09 * s, 0.1 * s, -0.02 * s);
      else this.part('head', 0.05 * s, 0.13 * s, 0.05 * s, C.dark, sx * 0.07 * s, 0.13 * s, -0.04 * s, { rz: -sx * 0.25, rx: -0.3 });
    }
    this.joint('jaw', 'head', 0, -0.07 * s, 0.1 * s);
    this.part('jaw', 0.1 * s, 0.04 * s, P.snout * s * 0.95, hc, 0, -0.02 * s, P.snout * s * 0.48);
    this.j.head.add(this.hand); this.hand.position.set(0, -0.03 * s, 0.1 * s);
    this.j.head.add(this.tip); this.tip.position.set(0, -0.04 * s, (0.15 + P.snout) * s);
    // tail: segments that sway
    let parent = 'base'; const tl = P.tail;
    for (let i = 0; i < tl.n; i++) {
      this.joint('tail' + i, parent, 0, i ? 0 : 0.08 * s, i ? -tl.len * s : -0.42 * s * P.len);
      this.part('tail' + i, tl.w * s * (1 - i * 0.2), tl.w * s * (1 - i * 0.2), tl.len * s, C.tail || C.fur, 0, 0, -tl.len * s / 2);
      parent = 'tail' + i;
    }
    // legs: hip, knee, paw (back legs bend the other way)
    for (const [n, x, z] of [['lf', 1, 1], ['rf', -1, 1], ['lb', 1, -1], ['rb', -1, -1]]) {
      this.joint(n, 'base', x * 0.11 * s * P.w, -0.06 * s, z * 0.3 * s * P.len);
      this.part(n, 0.075 * s, legH + 0.04 * s, z > 0 ? 0.1 * s : 0.13 * s, C.fur, 0, -legH / 2, 0);
      this.joint(n + 'k', n, 0, -legH, 0);
      this.part(n + 'k', 0.055 * s, legH, 0.06 * s, C.dark, 0, -legH / 2, 0);
      this.part(n + 'k', 0.08 * s, 0.04 * s, 0.13 * s, P.skull ? C.bone : C.dark, 0, -legH, 0.03 * s);
    }
  }

  animate(e, t, dt) {
    this.time += dt; const sp = this.speedOf(e); const P = this.P;
    const L = (a, b, c, d) => ({ lf: [a[0], 0, 0], lfk: [a[1], 0, 0], rf: [b[0], 0, 0], rfk: [b[1], 0, 0], lb: [c[0], 0, 0], lbk: [c[1], 0, 0], rb: [d[0], 0, 0], rbk: [d[1], 0, 0] }); // legs: [hip, knee]
    const tail = (amp, f) => { const o = {}; for (let i = 0; i < P.tail.n; i++) o['tail' + i] = [P.tail.lift * (i ? 0.3 : 1), Math.sin(this.time * f - i) * amp, 0]; return o; };
    let pose, rate = 16;
    const anim = e.anim;
    const STAND = L([0.05, -0.05], [0.05, -0.05], [-0.35, 0.65], [-0.35, 0.65]);
    if (anim === 'walk' || anim === 'run' || ((anim === 'idle' || anim === 'stalk') && sp > 0.6)) {
      // trot at walking pace (diagonal pairs), a bounding gallop when running
      this.gait += dt * sp * (P.gaitK / P.s);
      const g = this.gait; const amp = Math.min(1, 0.35 + sp * 0.12);
      const fr = (a) => [-Math.sin(a) * 0.6 * amp, Math.max(0, Math.sin(a)) * 0.9];      // front: swing forward with the paw folded
      const hi = (a) => [-0.3 + Math.sin(a) * 0.6 * amp, 0.6 + Math.max(0, -Math.sin(a)) * 0.7]; // hind: drive back, fold coming forward
      if (sp > 3.6) {
        pose = { ...L(fr(g), fr(g + 0.5), hi(g + Math.PI + 0.6), hi(g + Math.PI + 1.0)), pitch: Math.sin(g + 1.1) * 0.12, lift: Math.abs(Math.cos(g)) * 0.05 * P.s,
          neck: [0.35 + Math.sin(g) * 0.12, 0, 0], head: [-0.25, 0, 0], jaw: [0.15, 0, 0], ...tail(0.15, 8) };
      } else {
        pose = { ...L(fr(g), fr(g + Math.PI), hi(g + Math.PI), hi(g)), lift: Math.abs(Math.cos(g)) * 0.025 * P.s, neck: [0.15, Math.sin(g * 0.5) * 0.1, 0], head: [-0.1, 0, 0], ...tail(0.3, 5) };
      }
      if (anim === 'stalk') pose = { ...pose, lift: -0.08 * P.s, neck: [0.6, 0, 0], head: [-0.45, 0, 0] };
      rate = 22;
    } else if (anim === 'idle' || anim === 'stalk') {
      const b = Math.sin(this.time * 2.4) * 0.03; const stalk = anim === 'stalk';
      pose = stalk
        ? { ...L([0.35, 0.3], [0.25, 0.35], [-0.95, 1.5], [-0.9, 1.45]), lift: -0.13 * P.s, pitch: 0.14, neck: [0.65, 0, 0], head: [-0.55, 0, 0], jaw: [0.3, 0, 0], ...tail(0.08, 9) }
        : { ...STAND, lift: -0.01 * P.s + b * 0.1, neck: [b, Math.sin(this.time * 0.6) * 0.3, 0], head: [0.05, 0, 0], jaw: [0.05 + Math.max(0, Math.sin(this.time * 1.3)) * 0.12, 0, 0], ...tail(0.25, 2.5) };
    } else if (anim === 'lunge' || anim === 'nip' || anim === 'bite') {
      const atk = e.atk || { windup: 0.4, active: 0.6, dur: 1 }; const ph = phase(t, atk);
      const coil = { ...L([0.5, 0.4], [0.4, 0.5], [-1.05, 1.7], [-1.0, 1.65]), lift: -0.17 * P.s, pitch: 0.2, neck: [0.7, 0, 0], head: [-0.6, 0, 0], jaw: [0.5, 0, 0], ...tail(0.05, 14) };
      const fly = { ...L([-1.25, 0.2], [-1.1, 0.3], [1.0, 0.15], [0.9, 0.2]), lift: 0.12 * P.s, pitch: -0.1, neck: [0.2, 0, 0], head: [-0.2, 0, 0], jaw: [0.9, 0, 0], tail0: [0.3, 0, 0] };
      const bite = { ...L([-0.4, 0.3], [-0.2, 0.2], [-0.5, 0.9], [-0.4, 0.8]), lift: -0.04 * P.s, pitch: 0.15, neck: [0.75, 0, 0], head: [-0.25, 0, 0], jaw: [0.05, 0, 0] };
      if (anim === 'lunge') {
        if (ph.part === 'windup') { pose = coil; rate = 14; }
        else if (ph.part === 'strike') { pose = ph.k < 0.75 ? fly : bite; rate = 34; }
        else { pose = mixP(bite, STAND, ph.k); rate = 12; }
      } else { // a snap of the jaws: head back, then the head darts forward and shuts
        const back = { ...L([0.1, 0.1], [0.05, 0.1], [-0.6, 1.0], [-0.55, 0.95]), lift: -0.06 * P.s, neck: [-0.3, 0, 0], head: [0.1, 0, 0], jaw: [0.9, 0, 0] };
        if (ph.part === 'windup') { pose = back; rate = 16; }
        else if (ph.part === 'strike') { pose = { ...bite, jaw: [ph.k < 0.5 ? 0.9 : 0, 0, 0], neck: [0.9, 0, 0] }; rate = 40; }
        else { pose = mixP(bite, STAND, ph.k); rate = 12; }
      }
    } else if (anim === 'hurt') {
      pose = { ...L([-0.3, 0.2], [-0.2, 0.2], [-0.2, 0.5], [-0.1, 0.5]), lift: -0.05 * P.s, pitch: -0.18, roll: Math.sin(t * 30) * 0.06, neck: [-0.4, 0.3, 0], head: [0.2, 0, 0], jaw: [0.6, 0, 0] }; rate = 30;
    } else if (anim === 'stagger' || anim === 'finished') {
      const down = anim === 'finished' && t > 0.25;
      pose = { ...L([0.9, 0.9], [0.7, 1.1], [-1.2, 2.0], [-1.1, 1.9]), lift: (down ? -0.34 : -0.2) * P.s, pitch: 0.2, roll: Math.sin(t * 6) * 0.1, neck: [0.8, Math.sin(t * 4) * 0.3, 0], head: [-0.2, 0, 0.2], jaw: [0.4, 0, 0], ...tail(0.05, 3) }; rate = 10;
    } else if (anim === 'die' || anim === 'dieHard') {
      const k = clamp01(t / 0.45);
      pose = { ...L([-0.6, 0.2], [-0.4, 0.3], [0.5, 0.2], [0.6, 0.1]), lift: -this.baseY + 0.16 * P.s * (P.w + 0.3), roll: 1.5 * ease(k), pitch: anim === 'dieHard' ? -0.15 : 0, neck: [0.2, 0, 0.3], head: [0.2, 0, 0], jaw: [0.5, 0, 0], tail0: [0, 0, 0] }; rate = 9;
    } else if (anim === 'rise') {
      const k = clamp01(t / 0.9);
      pose = { ...L([-1.2 * (1 - k), 0.5], [-0.9 * (1 - k), 0.5], [-0.6, 1.0], [-0.6, 1.0]), lift: -this.baseY * 1.6 * (1 - ease(k)), pitch: -0.5 * (1 - k), neck: [0.3, 0, 0], head: [-0.2, 0, 0], jaw: [0.3, 0, 0] }; rate = 30;
    } else if (anim === 'roar') { // a howl, sitting back on the haunches
      pose = { ...L([-0.1, 0.05], [-0.1, 0.05], [-1.2, 2.0], [-1.2, 2.0]), lift: -0.12 * P.s, pitch: -0.35, neck: [-0.9, 0, 0], head: [-0.4, 0, 0], jaw: [0.8, 0, 0], ...tail(0.1, 6) };
    } else pose = STAND;
    this.pose(pose, dt, rate);
  }
}

const HOUND = { s: 1, w: 1, len: 1, deep: 1, leg: 0.27, snout: 0.2, skull: true, ridge: true, ears: 'pointed', gaitK: 3.2, tail: { n: 2, len: 0.26, w: 0.06, lift: -0.25 } };
const RAT = { s: 0.5, w: 1.1, len: 1.05, deep: 0.9, leg: 0.19, snout: 0.22, ears: 'round', sores: true, gaitK: 4.2, tail: { n: 4, len: 0.2, w: 0.05, lift: 0.2 } };

// ------------------------------------------------------------------ the gargoyle: winged stone
class Gargoyle extends Beast {
  constructor(look) {
    super(look); const C = look.colors; this.baseY = 0.78;
    this.joint('base', null, 0, this.baseY, 0);
    this.joint('chest', 'base', 0, 0.08, 0);
    this.part('base', 0.32, 0.22, 0.26, C.dark, 0, -0.06, 0); // hips
    this.part('chest', 0.46, 0.38, 0.32, C.stone, 0, 0.2, 0.02);
    this.part('chest', 0.3, 0.12, 0.28, C.dark, 0, 0.42, -0.04); // hunched shoulders
    // head: a horned brow, a snout full of teeth, glowing eyes
    this.joint('head', 'chest', 0, 0.44, 0.14);
    this.part('head', 0.26, 0.22, 0.26, C.stone, 0, 0.08, 0.02);
    this.part('head', 0.2, 0.11, 0.14, C.stone, 0, 0.0, 0.18);
    this.part('head', 0.22, 0.05, 0.05, C.dark, 0, 0.16, 0.14); // brow ridge
    for (const sx of [-1, 1]) {
      this.part('head', 0.06, 0.045, 0.03, look.eyes || 0xff4030, sx * 0.065, 0.11, 0.16, { glow: 7 });
      this.part('head', 0.06, 0.26, 0.06, C.horn, sx * 0.1, 0.24, -0.08, { rx: -0.7, rz: -sx * 0.25 });
      this.part('head', 0.03, 0.06, 0.03, C.claw, sx * 0.06, -0.06, 0.24); // tusks
    }
    // arms with long claws
    for (const [n, x] of [['L', 1], ['R', -1]]) {
      this.joint('sh' + n, 'chest', x * 0.28, 0.3, 0.04);
      this.part('sh' + n, 0.14, 0.32, 0.14, C.stone, 0, -0.15, 0);
      this.joint('el' + n, 'sh' + n, 0, -0.3, 0);
      this.part('el' + n, 0.11, 0.3, 0.11, C.dark, 0, -0.14, 0);
      for (let i = -1; i <= 1; i++) this.part('el' + n, 0.025, 0.16, 0.025, C.claw, i * 0.035, -0.36, 0.03, { rx: -0.3 });
    }
    this.j.elR.add(this.hand); this.hand.position.set(0, -0.25, 0); this.j.elR.add(this.tip); this.tip.position.set(0, -0.44, 0.06);
    // crouched legs, clawed feet
    for (const [n, x] of [['L', 1], ['R', -1]]) {
      this.joint('hip' + n, 'base', x * 0.14, -0.12, 0);
      this.part('hip' + n, 0.15, 0.34, 0.17, C.stone, 0, -0.15, 0.03);
      this.joint('kn' + n, 'hip' + n, 0, -0.32, 0.06);
      this.part('kn' + n, 0.11, 0.32, 0.11, C.dark, 0, -0.15, 0);
      this.part('kn' + n, 0.14, 0.05, 0.22, C.dark, 0, -0.31, 0.05);
    }
    // wings: an inner and an outer panel each, spread flat so they read from above
    for (const [n, x] of [['L', 1], ['R', -1]]) {
      this.joint('w' + n, 'chest', x * 0.16, 0.36, -0.14);
      this.part('w' + n, 0.62, 0.05, 0.05, C.horn, x * 0.31, 0, 0.12); // the wing's arm
      this.part('w' + n, 0.6, 0.025, 0.42, C.wing, x * 0.3, 0, -0.1);
      this.joint('wo' + n, 'w' + n, x * 0.6, 0, 0.12);
      this.part('wo' + n, 0.55, 0.045, 0.045, C.horn, x * 0.27, 0, 0);
      this.part('wo' + n, 0.5, 0.022, 0.5, C.wing, x * 0.25, 0, -0.24);
      this.part('wo' + n, 0.05, 0.05, 0.14, C.claw, x * 0.56, 0, 0.04);
    }
    // a tail with a spade
    this.joint('tail0', 'base', 0, -0.06, -0.14); this.part('tail0', 0.08, 0.08, 0.34, C.dark, 0, 0, -0.17);
    this.joint('tail1', 'tail0', 0, 0, -0.34); this.part('tail1', 0.06, 0.06, 0.3, C.dark, 0, 0, -0.15); this.part('tail1', 0.16, 0.04, 0.12, C.horn, 0, 0, -0.32);
  }

  animate(e, t, dt) {
    this.time += dt; const sp = this.speedOf(e); const tm = this.time;
    // wings: flap (up/down about the wing's long axis), fold (swept back and down)
    const wings = (flap, spread, back = 0) => ({ wL: [0, back, flap], wR: [0, -back, -flap], woL: [0, back * 0.5, spread], woR: [0, -back * 0.5, -spread] });
    const claws = (a, el) => ({ shL: [a, 0, 0.2], shR: [a, 0, -0.2], elL: [el, 0, 0], elR: [el, 0, 0] });
    const crouch = { hipL: [-1.2, 0, 0.1], hipR: [-1.2, 0, -0.1], knL: [1.9, 0, 0], knR: [1.9, 0, 0] };
    const dangle = { hipL: [-0.5, 0, 0.12], hipR: [-0.4, 0, -0.12], knL: [0.9, 0, 0], knR: [1.0, 0, 0] };
    const hover = (h) => ({ lift: h + Math.sin(tm * 3.2) * 0.07, ...wings(Math.sin(tm * 11) * 0.65 + 0.15, Math.sin(tm * 11 - 0.6) * 0.4), ...claws(-0.6, -0.6), ...dangle, chest: [0.35, 0, 0], head: [-0.25, Math.sin(tm * 0.8) * 0.2, 0], tail0: [-0.5, Math.sin(tm * 2) * 0.3, 0], tail1: [-0.3, Math.sin(tm * 2 - 1) * 0.3, 0] });
    let pose, rate = 14; const anim = e.anim;
    if (anim === 'idle' && e.ai && !e.ai.aggro && sp < 0.3) { // not yet woken: perched like a statue, wings folded
      pose = { lift: -0.12, pitch: 0.2, ...crouch, ...wings(-0.9, -0.5, 0.9), ...claws(-0.9, -0.6), chest: [0.3, 0, 0], head: [0.1, 0, 0], tail0: [0.4, 0, 0], tail1: [0.2, 0, 0] }; rate = 6;
    } else if (anim === 'idle' || anim === 'walk' || anim === 'run') {
      pose = hover(1.05); pose.pitch = Math.min(0.5, sp * 0.08); pose.roll = 0;
    } else if (anim === 'grounded') { // crashed into the stones, wings slumped, getting its breath back
      const tr = Math.sin(tm * 26) * 0.03;
      pose = { lift: -0.18, pitch: 0.55, roll: tr, ...crouch, ...wings(-0.55, -0.25, 0.3), ...claws(-0.9, -0.3), chest: [0.4, 0, tr], head: [0.35, 0, 0], tail0: [-0.1, 0, 0], tail1: [0.1, 0, 0] };
    } else if (anim === 'dive') {
      const atk = e.atk || { windup: 0.8, active: 1.25, dur: 1.5 }; const ph = phase(t, atk);
      if (ph.part === 'windup') { // climbs, wings beating high, claws drawn back
        const up = { ...hover(1.05 + ease(ph.k) * 0.9), ...wings(0.9 + Math.sin(tm * 14) * 0.5, 0.3), ...claws(0.6, -0.4), chest: [-0.2, 0, 0], head: [0.1, 0, 0] };
        up.pitch = -0.35 * ph.k; pose = up; rate = 10;
      } else if (ph.part === 'strike') { // folded, head first, claws out
        pose = { lift: 1.95 * (1 - ph.k), pitch: 0.95, ...wings(0.25, -0.3, 1.0), ...claws(-2.6, -0.1), ...dangle, chest: [0.2, 0, 0], head: [-0.6, 0, 0], tail0: [0.5, 0, 0], tail1: [0.3, 0, 0] }; rate = 22;
      } else { pose = { lift: -0.18, pitch: 0.6, ...crouch, ...wings(-0.2, 0.3, 0.1), ...claws(-1.5, -0.1), chest: [0.4, 0, 0], head: [0.2, 0, 0] }; rate = 30; }
    } else if (anim === 'rake') {
      const atk = e.atk || { windup: 0.48, active: 0.62, dur: 1 }; const ph = phase(t, atk);
      const base = hover(0.5); base.pitch = 0.2;
      if (ph.part === 'windup') pose = { ...base, shR: [-2.6, 0, -0.9], elR: [-0.6, 0, 0], chest: [0.1, 0.5, 0], ...wings(0.9, 0.3) };
      else if (ph.part === 'strike') { pose = { ...base, shR: [-1.0, 0, 0.6], elR: [-0.1, 0, 0], shL: [-0.4, 0, 0.6], chest: [0.5, -0.6, 0], ...wings(-0.3, 0.1) }; rate = 38; }
      else pose = base;
    } else if (anim === 'hurt') {
      pose = { ...hover(0.7), pitch: -0.35, roll: Math.sin(t * 30) * 0.08, head: [0.4, 0.4, 0], ...wings(0.9, 0.6) }; rate = 30;
    } else if (anim === 'stagger' || anim === 'finished') {
      const down = anim === 'finished' && t > 0.25;
      pose = { lift: down ? -0.32 : -0.18, pitch: 0.4, roll: Math.sin(t * 5) * 0.12, ...crouch, ...wings(-0.7, -0.4, 0.2), ...claws(0.3, -0.2), chest: [0.5, Math.sin(t * 4) * 0.3, 0], head: [0.6, 0, 0.2] }; rate = 10;
    } else if (anim === 'die' || anim === 'dieHard') {
      const k = clamp01(t / 0.6);
      pose = { lift: lerp(0.5, -0.5, ease(k)), roll: 1.45 * ease(k), pitch: 0.2, ...wings(-0.2, -0.6, 0), ...claws(-1.2, -0.3), hipL: [-0.6, 0, 0], hipR: [-0.3, 0, 0], knL: [0.8, 0, 0], knR: [1.2, 0, 0], head: [0.5, 0, 0.3] }; rate = 8;
    } else if (anim === 'rise') { // drops down from the rooftops
      const k = clamp01(t / 0.9);
      pose = { ...hover(1.05 + (1 - ease(k)) * 4), ...wings(Math.sin(tm * 16) * 0.8, 0.4) }; rate = 40;
    } else if (anim === 'roar') {
      pose = { ...hover(1.0), ...wings(1.2, 0.5), ...claws(-0.4, -1.0), chest: [-0.4, 0, 0], head: [-0.6, 0, 0] };
    } else pose = hover(1.0);
    this.pose(pose, dt, rate);
  }
}

export function makeBeast(look) {
  if (!look || !look.rig) return null;
  if (look.rig === 'hound') return new Quadruped(look, HOUND);
  if (look.rig === 'rat') return new Quadruped(look, RAT);
  if (look.rig === 'gargoyle') return new Gargoyle(look);
  return null;
}
