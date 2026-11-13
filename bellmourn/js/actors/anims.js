// Poses and clips. A pose is { joint: [rx, ry, rz], hipsY, bodyRx, bodyRy, bodyY, weapon: [...] }.
// Conventions (see rig.js): a hanging limb swings forward with negative rx; the right arm raises
// outward with negative rz; knees bend with positive rx; chest/spine ry > 0 turns to the left.
// With the arm hanging, the blade points forward; weapon rx > 0 dips the tip.

const ease = (k) => k * k * (3 - 2 * k);
const easeOut = (k) => 1 - (1 - k) * (1 - k);
const clamp01 = (k) => Math.max(0, Math.min(1, k));

export function mix(a, b, k) {
  const out = {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    const x = a[key], y = b[key];
    if (Array.isArray(x) || Array.isArray(y)) { const p = x || [0, 0, 0], q = y || [0, 0, 0]; out[key] = [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k, p[2] + (q[2] - p[2]) * k]; }
    else out[key] = (x || 0) + ((y || 0) - (x || 0)) * k;
  }
  return out;
}
function add(a, b) { const o = { ...a }; for (const k in b) { const x = o[k], y = b[k]; if (Array.isArray(y)) { const p = x || [0, 0, 0]; o[k] = [p[0] + y[0], p[1] + y[1], p[2] + y[2]]; } else o[k] = (x || 0) + y; } return o; }
// keyframes: [[t, pose, easing?], ...] sampled at t
function keys(t, list) {
  if (t <= list[0][0]) return { ...list[0][1] };
  for (let i = 0; i < list.length - 1; i++) {
    const [t0, p0] = list[i], [t1, p1, fn] = list[i + 1];
    if (t <= t1) return mix(p0, p1, (fn || ease)(clamp01((t - t0) / (t1 - t0))));
  }
  return { ...list[list.length - 1][1] };
}

// ------------------------------------------------------------------ base poses
const STANCE = {
  hipsY: -0.05, chest: [0.06, 0.2, 0], spine: [0.04, 0.1, 0], head: [0, -0.2, 0],
  shR: [-0.3, 0, -0.14], elR: [-0.55, 0, 0], haR: [0, 0, 0], weapon: [0.75, 0, 0],
  shL: [0.12, 0, 0.16], elL: [-0.35, 0, 0],
  hipL: [-0.28, 0, 0.07], knL: [0.34, 0, 0], ftL: [-0.05, 0, 0], hipR: [0.24, 0, -0.07], knR: [0.28, 0, 0], ftR: [-0.2, 0, 0],
};
Object.freeze(STANCE);
const ARMS_OUT = { shR: [-1.5, 0, -0.18], elR: [-0.12, 0, 0], weapon: [1.62, 0, 0] }; // sword held straight out

export function idle(t) {
  const b = Math.sin(t * 2.2) * 0.015;
  return { ...STANCE, hipsY: STANCE.hipsY + b, chest: [0.06 + b, 0.2, 0], shL: [0.12 + b * 2, 0, 0.16] };
}

export function run(t, speedK = 1) {
  const f = t * 9.5 * Math.max(0.6, speedK); const s = Math.sin(f), c = Math.cos(f);
  return {
    hipsY: -0.06 + Math.abs(c) * 0.06, spine: [0.22, s * 0.12, 0], chest: [0.08, -s * 0.18, 0], head: [-0.15, s * 0.1, 0],
    hipL: [-s * 0.85 - 0.1, 0, 0.04], knL: [Math.max(0, -Math.sin(f + 1.4)) * 1.3 + 0.15, 0, 0], ftL: [s * 0.3, 0, 0],
    hipR: [s * 0.85 - 0.1, 0, -0.04], knR: [Math.max(0, Math.sin(f + 1.4)) * 1.3 + 0.15, 0, 0], ftR: [-s * 0.3, 0, 0],
    shL: [s * 0.7, 0, 0.12], elL: [-0.6 - Math.max(0, s) * 0.5, 0, 0],
    shR: [0.45 - s * 0.25, 0, -0.22], elR: [-0.35, 0, 0], weapon: [2.25, 0, 0], // blade trailing low behind
  };
}

export function walk(t) {
  const f = t * 6; const s = Math.sin(f), c = Math.cos(f);
  return { ...STANCE, hipsY: -0.04 + Math.abs(c) * 0.03, hipL: [-s * 0.45 - 0.1, 0, 0.05], knL: [Math.max(0, -Math.sin(f + 1.4)) * 0.7 + 0.2, 0, 0], hipR: [s * 0.45 - 0.1, 0, -0.05], knR: [Math.max(0, Math.sin(f + 1.4)) * 0.7 + 0.2, 0, 0], shL: [s * 0.3 + 0.1, 0, 0.14] };
}

// ------------------------------------------------------------------ hero attacks (times match defs.js)
const crouch = (y) => ({ hipsY: y, hipL: [-0.55, 0, 0.12], knL: [0.75, 0, 0], ftL: [-0.2, 0, 0], hipR: [0.35, 0, -0.1], knR: [0.7, 0, 0], ftR: [-0.4, 0, 0] });

export function slash1(t) { // right to left
  const W = { ...STANCE, ...crouch(-0.14), ...ARMS_OUT, chest: [0.1, -1.25, 0], spine: [0.15, -0.35, 0], shL: [-0.3, 0, 0.5], elL: [-0.8, 0, 0], head: [0, 0.6, 0] };
  const S = { ...STANCE, ...crouch(-0.18), ...ARMS_OUT, chest: [0.12, 1.15, 0], spine: [0.2, 0.4, 0], weapon: [1.75, 0, 0], shL: [0.4, 0, 0.6], elL: [-0.5, 0, 0], head: [0, -0.5, 0] };
  return keys(t, [[0, STANCE], [0.08, W, easeOut], [0.17, S, easeOut], [0.26, S], [0.4, { ...STANCE, chest: [0.06, 0.5, 0] }]]);
}
export function slash2(t) { // backhand, left to right
  const W = { ...STANCE, ...crouch(-0.14), ...ARMS_OUT, chest: [0.12, 1.2, 0], spine: [0.15, 0.35, 0], weapon: [1.55, 0, 0], shL: [0.3, 0, 0.5], head: [0, -0.5, 0] };
  const S = { ...STANCE, ...crouch(-0.16), ...ARMS_OUT, chest: [0.1, -1.3, 0], spine: [0.2, -0.4, 0], weapon: [1.7, 0, 0], shL: [-0.3, 0, 0.7], elL: [-0.6, 0, 0], head: [0, 0.5, 0] };
  return keys(t, [[0, slash1(0.4)], [0.08, W, easeOut], [0.17, S, easeOut], [0.27, S], [0.42, STANCE]]);
}
export function slash3(t) { // the spinning finale of the combo
  const W = { ...STANCE, ...crouch(-0.24), ...ARMS_OUT, chest: [0.25, -1.3, 0], spine: [0.3, -0.4, 0], shL: [-0.2, 0, 0.9], elL: [-0.4, 0, 0] };
  const S = (ry) => ({ ...STANCE, ...crouch(-0.2), ...ARMS_OUT, chest: [0.1, 0.6, 0], spine: [0.15, 0.2, 0], shL: [0, 0, 1.2], elL: [-0.2, 0, 0], bodyRy: ry, weapon: [1.68, 0, 0] });
  return keys(t, [[0, STANCE], [0.15, W, easeOut], [0.27, S(Math.PI * 2), easeOut], [0.42, S(Math.PI * 2)], [0.62, { ...STANCE, bodyRy: Math.PI * 2 }]]);
}
export function charge(t, k = 0) { // heavy wind-up held: low, blade drawn back
  const q = Math.sin(t * 30) * 0.01 * k;
  return { ...STANCE, ...crouch(-0.26 - k * 0.06), ...ARMS_OUT, chest: [0.3 + q, -1.45, 0], spine: [0.3, -0.45, 0], shR: [-1.2, 0, -0.5], weapon: [1.9, 0, 0], shL: [-0.5, 0, 0.6], elL: [-1.0, 0, 0], head: [0.1, 0.9, 0] };
}
export function heavy(t) {
  const S = (ry) => ({ ...STANCE, ...crouch(-0.22), ...ARMS_OUT, chest: [0.1, 0.7, 0], spine: [0.2, 0.3, 0], shL: [0, 0, 1.3], bodyRy: ry, weapon: [1.7, 0, 0] });
  return keys(t, [[0, charge(0, 1)], [0.1, S(0.6), easeOut], [0.22, S(Math.PI * 2), easeOut], [0.4, S(Math.PI * 2)], [0.62, { ...STANCE, bodyRy: Math.PI * 2 }]]);
}
export function thrust(t) {
  const L = { ...STANCE, hipsY: -0.24, spine: [0.45, -0.2, 0], chest: [0.1, -0.35, 0], head: [-0.4, 0.4, 0], shR: [-1.55, 0, 0.1], elR: [0, 0, 0], weapon: [1.55, 0, 0], shL: [0.9, 0, 0.3], elL: [-0.2, 0, 0], hipL: [-1.0, 0, 0.05], knL: [0.7, 0, 0], hipR: [0.7, 0, -0.05], knR: [0.35, 0, 0], ftR: [0.3, 0, 0] };
  return keys(t, [[0, { ...STANCE, ...crouch(-0.2), shR: [0.3, 0, -0.3], elR: [-1.2, 0, 0], weapon: [1.2, 0, 0] }], [0.08, L, easeOut], [0.28, L], [0.42, STANCE]]);
}
export function dash(t) {
  return { hipsY: -0.22, spine: [0.65, 0, 0], chest: [0.15, 0, 0], head: [-0.6, 0, 0], shR: [0.9, 0, -0.35], elR: [-0.4, 0, 0], weapon: [2.6, 0, 0], shL: [0.9, 0, 0.35], elL: [-0.3, 0, 0], hipL: [-1.1, 0, 0.05], knL: [1.1, 0, 0], hipR: [0.5, 0, -0.05], knR: [0.9, 0, 0], ftR: [0.4, 0, 0] };
}
export function parry(t) {
  const G = { ...STANCE, ...crouch(-0.12), chest: [-0.05, -0.45, 0], spine: [0, -0.2, 0], shR: [-1.25, 0.2, 0.55], elR: [-1.15, 0, 0], weapon: [0.15, 0, 0.3], shL: [-0.6, 0, 0.35], elL: [-1.2, 0, 0], head: [0.1, 0.3, 0] };
  return keys(t, [[0, STANCE], [0.05, G, easeOut], [0.3, G], [0.42, STANCE]]);
}
export function riposte(t) { // flourish after a successful parry
  return keys(t, [[0, parry(0.3)], [0.12, slash1(0.17)], [0.3, STANCE]]);
}
export function hurt(t) {
  const H = { ...STANCE, hipsY: -0.1, spine: [-0.35, 0.2, 0], chest: [-0.25, 0.3, 0.1], head: [-0.35, 0, 0], shR: [0.4, 0, -0.7], elR: [-0.6, 0, 0], shL: [0.3, 0, 0.8], elL: [-0.5, 0, 0], hipL: [-0.4, 0, 0.1], knL: [0.5, 0, 0] };
  return keys(t, [[0, STANCE], [0.06, H, easeOut], [0.36, STANCE]]);
}
export function heal(t) {
  const D = { ...STANCE, shL: [-2.2, 0.3, -0.35], elL: [-1.5, 0, 0], head: [-0.45, 0, 0], chest: [-0.12, 0.1, 0] };
  return keys(t, [[0, STANCE], [0.25, D], [0.7, D], [0.95, STANCE]]);
}
export function finisher(t) {
  const back = { ...STANCE, ...crouch(-0.18), chest: [0.1, -0.6, 0], shR: [0.6, 0, -0.4], elR: [-1.6, 0, 0], weapon: [1.6, 0, 0], shL: [-1.2, 0, 0.2], elL: [-0.3, 0, 0], head: [0, 0.3, 0] };
  const stab = { ...STANCE, hipsY: -0.24, spine: [0.4, 0, 0], chest: [0.1, -0.2, 0], shR: [-1.55, 0, 0.05], elR: [0, 0, 0], weapon: [1.55, 0, 0], shL: [-0.6, 0, 0.4], hipL: [-1.0, 0, 0.05], knL: [0.7, 0, 0], hipR: [0.6, 0, 0], knR: [0.3, 0, 0] };
  const rip = { ...STANCE, ...crouch(-0.15), ...ARMS_OUT, chest: [0.1, 1.2, 0], spine: [0.2, 0.4, 0], weapon: [1.8, 0, 0], bodyRy: 0 };
  return keys(t, [[0, STANCE], [0.35, back], [0.55, stab, easeOut], [0.72, stab], [0.85, rip, easeOut], [0.95, STANCE]]);
}
export function special(t) {
  // the Requiem: the hero leaps and blurs between foes; the view hides the rig mid-way and draws slashes
  const up = { ...STANCE, ...crouch(-0.3), ...ARMS_OUT, chest: [0.2, -1.3, 0], shL: [-0.4, 0, 0.8] };
  const spin = (k) => ({ ...STANCE, ...ARMS_OUT, chest: [0.1, 0.8, 0], bodyRy: k * Math.PI * 6, hipsY: 0.1 });
  return keys(t, [[0, STANCE], [0.25, up], [1.35, spin(1)], [1.6, { ...STANCE, bodyRy: Math.PI * 6 }]]);
}
export function die(t) {
  const fall = { ...STANCE, bodyRx: -1.52, bodyY: 0.14, shR: [-2.4, 0, -0.6], shL: [-2.2, 0, 0.7], elR: [-0.3, 0, 0], elL: [-0.3, 0, 0], head: [0.3, 0.5, 0], hipL: [-0.2, 0, 0.15], knL: [0.2, 0, 0], hipR: [0.1, 0, -0.1], knR: [0.4, 0, 0], weapon: [0, 0, 0] };
  return keys(t, [[0, STANCE], [0.15, { ...STANCE, hipsY: -0.3, spine: [0.5, 0, 0], head: [0.4, 0, 0], knL: [1.2, 0, 0], knR: [1.2, 0, 0], hipL: [-0.8, 0, 0], hipR: [-0.6, 0, 0] }], [0.6, fall, (k) => k * k]]);
}
export function dieHard(t) { // thrown back by a finisher
  return keys(t, [[0, { ...STANCE, spine: [-0.6, 0, 0] }], [0.5, die(0.6), (k) => k * k]]);
}
export function stagger(t) {
  const sw = Math.sin(t * 5) * 0.12;
  return { ...STANCE, hipsY: -0.22, spine: [0.7, sw, 0], chest: [0.3, 0, sw], head: [0.6, 0, 0], shR: [0.2, 0, -0.1], elR: [-0.1, 0, 0], weapon: [1.4, 0, 0], shL: [0.2, 0, 0.1], hipL: [-0.5, 0, 0.1], knL: [0.9, 0, 0], hipR: [-0.2, 0, -0.1], knR: [0.9, 0, 0] };
}
export function finished(t) { // the victim of a finisher: forced to its knees
  return keys(t, [[0, stagger(0)], [0.3, { ...STANCE, hipsY: -0.48, spine: [0.3, 0, 0], head: [-0.4, 0, 0], hipL: [-1.5, 0, 0.1], knL: [1.5, 0, 0], hipR: [0.1, 0, -0.1], knR: [1.6, 0, 0], shR: [0.4, 0, -0.5], shL: [0.4, 0, 0.5] }], [0.6, { ...STANCE, hipsY: -0.48, spine: [-0.5, 0, 0], head: [-0.8, 0, 0], hipL: [-1.5, 0, 0.1], knL: [1.5, 0, 0], hipR: [0.1, 0, -0.1], knR: [1.6, 0, 0], shR: [0.9, 0, -0.9], shL: [0.9, 0, 0.9] }]]);
}
export function rise(t) { // crawling up out of the stones
  const k = clamp01(t / 0.9);
  return { ...STANCE, bodyY: -1.9 * (1 - easeOut(k)), spine: [0.8 * (1 - k), 0, 0], head: [0.5 * (1 - k), 0, 0], shR: [-2.6 * (1 - k), 0, -0.3], shL: [-2.6 * (1 - k), 0, 0.3] };
}

// ------------------------------------------------------------------ foe attacks: t relative to windup/active of the attack
function phased(t, atk, W, S, R) {
  const w = atk.windup, a = atk.active, d = atk.dur;
  return keys(t, [[0, R || STANCE], [w * 0.85, W], [w, W], [Math.max(w + 0.02, a), S, easeOut], [Math.min(d, a + 0.35), S], [d, R || STANCE]]);
}
export function fslash(t, atk) {
  const W = { ...STANCE, ...crouch(-0.1), chest: [-0.15, -0.5, 0], shR: [-2.7, 0, -0.35], elR: [-0.5, 0, 0], weapon: [0.6, 0, 0], shL: [-0.4, 0, 0.3], head: [-0.2, 0.3, 0] };
  const S = { ...STANCE, ...crouch(-0.2), spine: [0.35, 0.3, 0], chest: [0.25, 0.7, 0], shR: [-0.9, 0, 0.45], elR: [-0.1, 0, 0], weapon: [1.0, 0, 0], shL: [0.4, 0, 0.3] };
  const c = atk.chain || atk.chained; if (c && t > c.at) return keys(t, [[c.at, S], [c.windup, W], [c.active, S, easeOut], [atk.dur, STANCE]]);
  return phased(t, atk, W, S);
}
export function fthrust(t, atk) {
  const W = { ...STANCE, ...crouch(-0.2), chest: [0.1, -0.7, 0], shR: [0.5, 0, -0.4], elR: [-1.5, 0, 0], weapon: [1.6, 0, 0] };
  return phased(t, atk, W, thrust(0.2));
}
export function pounce(t, atk) {
  const W = { ...STANCE, hipsY: -0.4, spine: [0.9, 0, 0], head: [-0.7, 0, 0], shR: [0.6, 0, -0.5], shL: [0.6, 0, 0.5], hipL: [-1.3, 0, 0.2], knL: [1.8, 0, 0], hipR: [-1.0, 0, -0.2], knR: [1.8, 0, 0] };
  const S = { ...STANCE, hipsY: -0.05, spine: [0.7, 0, 0], head: [-0.6, 0, 0], shR: [-1.9, 0, -0.3], elR: [-0.2, 0, 0], shL: [-1.9, 0, 0.3], elL: [-0.2, 0, 0], hipL: [0.6, 0, 0], knL: [0.6, 0, 0], hipR: [0.9, 0, 0], knR: [0.4, 0, 0] };
  return phased(t, atk, W, S);
}
export function cast(t, atk) {
  const W = { ...STANCE, chest: [-0.2, -0.3, 0], shR: [-2.6, 0, -0.25], elR: [-0.2, 0, 0], weapon: [-0.3, 0, 0], shL: [-1.2, 0, 0.6], elL: [-0.6, 0, 0], head: [-0.3, 0, 0] };
  const S = { ...STANCE, spine: [0.3, 0, 0], shR: [-1.5, 0, -0.1], elR: [0, 0, 0], weapon: [1.3, 0, 0], shL: [-1.3, 0, 0.3] };
  return phased(t, atk, W, S);
}
export function aim(t, atk) {
  const A = { ...STANCE, chest: [0, -0.3, 0], head: [0, 0.25, 0], shR: [-1.5, 0.15, 0.1], elR: [-0.05, 0, 0], weapon: [1.57, 0, 0], shL: [-1.45, 0, -0.45], elL: [-0.2, 0, 0] };
  const K = { ...A, chest: [-0.15, -0.3, 0], shR: [-1.7, 0.15, 0.1] };
  return phased(t, atk, A, K);
}
export function slam(t, atk) {
  const W = { ...STANCE, hipsY: 0.02, spine: [-0.3, 0, 0], chest: [-0.3, 0, 0], shR: [-3.0, 0, -0.1], elR: [-0.4, 0, 0], weapon: [0.2, 0, 0], shL: [-3.0, 0, 0.1], elL: [-0.4, 0, 0], head: [-0.3, 0, 0] };
  const S = { ...STANCE, ...crouch(-0.32), spine: [0.6, 0, 0], chest: [0.3, 0, 0], shR: [-1.2, 0, 0.2], elR: [0, 0, 0], weapon: [1.3, 0, 0], shL: [-1.2, 0, -0.2], head: [0.2, 0, 0] };
  return phased(t, atk, W, S);
}
export function sweep(t, atk) {
  const W = { ...STANCE, ...crouch(-0.18), ...ARMS_OUT, chest: [0.15, -1.4, 0], spine: [0.15, -0.4, 0], shL: [-0.2, 0, 0.6] };
  const S = { ...STANCE, ...crouch(-0.2), ...ARMS_OUT, chest: [0.15, 1.3, 0], spine: [0.2, 0.4, 0], weapon: [1.7, 0, 0], shL: [0.4, 0, 0.6] };
  return phased(t, atk, W, S);
}
export function bash(t, atk) {
  const W = { ...STANCE, ...crouch(-0.2), chest: [0.2, 0.5, 0], shL: [-1.0, 0, 0.3], elL: [-1.2, 0, 0] };
  const S = { ...STANCE, hipsY: -0.2, spine: [0.4, 0, 0], chest: [0.1, 0.2, 0], shL: [-1.5, 0, 0.1], elL: [-0.3, 0, 0], hipL: [-0.9, 0, 0.05], knL: [0.6, 0, 0], hipR: [0.6, 0, 0], knR: [0.3, 0, 0] };
  return phased(t, atk, W, S);
}
export function spin(t, atk) {
  const W = { ...STANCE, ...crouch(-0.2), ...ARMS_OUT, chest: [0.2, -1.4, 0], shL: [-0.2, 0, 1.4], elL: [0, 0, 0] };
  const w = atk.windup, a = atk.active;
  const k = clamp01((t - w) / Math.max(0.05, a - w));
  if (t < w) return keys(t, [[0, STANCE], [w * 0.8, W]]);
  return { ...W, chest: [0.1, 0.8, 0], bodyRy: easeOut(k) * Math.PI * 4, shL: [0, 0, 1.5], weapon: [1.7, 0, 0] };
}
export function chargeRun(t, atk) {
  if (t < atk.windup) return keys(t, [[0, STANCE], [atk.windup, { ...STANCE, ...crouch(-0.3), spine: [0.6, 0, 0], shR: [-0.6, 0, -0.4], weapon: [1.0, 0, 0] }]]);
  const r = run(t * 1.4, 1.5); return { ...r, spine: [0.6, 0, 0], shR: [-1.3, 0, -0.1], elR: [0, 0, 0], weapon: [1.5, 0, 0] };
}
export function leap(t, atk) {
  const W = { ...STANCE, hipsY: -0.4, spine: [0.5, 0, 0], shR: [0.8, 0, -0.5], shL: [0.8, 0, 0.5], hipL: [-1.2, 0, 0.1], knL: [1.8, 0, 0], hipR: [-1.0, 0, -0.1], knR: [1.8, 0, 0], weapon: [1.0, 0, 0] };
  const Air = { ...STANCE, hipsY: 0, spine: [-0.3, 0, 0], shR: [-3.0, 0, -0.2], elR: [-0.3, 0, 0], weapon: [0.2, 0, 0], shL: [-2.6, 0, 0.4], hipL: [-1.0, 0, 0], knL: [1.4, 0, 0], hipR: [-0.6, 0, 0], knR: [1.6, 0, 0] };
  const Land = { ...slam(atk.active + 0.1, { windup: 0, active: 0.01, dur: 9 }) };
  return keys(t, [[0, STANCE], [atk.windup, W], [atk.windup + 0.15, Air, easeOut], [atk.active, Land, (k) => k * k], [atk.dur, STANCE]]);
}
export function roar(t) {
  const R = { ...STANCE, hipsY: -0.1, spine: [-0.4, 0, 0], chest: [-0.3, 0, 0], head: [-0.6, 0, 0], shR: [-0.6, 0, -1.3], elR: [-0.4, 0, 0], shL: [-0.6, 0, 1.3], elL: [-0.4, 0, 0], hipL: [-0.4, 0, 0.3], hipR: [0.2, 0, -0.3], knL: [0.4, 0, 0], knR: [0.4, 0, 0] };
  const sh = Math.sin(t * 40) * 0.03;
  return keys(t, [[0, STANCE], [0.3, R], [1.1, { ...R, chest: [-0.3 + sh, 0, sh] }], [1.3, STANCE]]);
}
export function hover(t) { // floating casters (Mother Tallow)
  const b = Math.sin(t * 1.8) * 0.08;
  return { ...STANCE, bodyY: 0.35 + b, hipL: [-0.2, 0, 0.05], knL: [0.5, 0, 0], hipR: [-0.1, 0, -0.05], knR: [0.6, 0, 0], shL: [-0.4, 0, 0.5], elL: [-0.5, 0, 0] };
}

// the Bellbreaker's hammer: an overhead smash, then a wide spinning blow
export function hsmash1(t) {
  const W = { ...STANCE, hipsY: 0.02, spine: [-0.35, -0.3, 0], chest: [-0.3, -0.4, 0], shR: [-3.0, 0, -0.2], elR: [-0.5, 0, 0], weapon: [0.1, 0, 0], shL: [-2.8, 0, 0.2], elL: [-0.5, 0, 0], head: [-0.2, 0.3, 0] };
  const S = { ...STANCE, ...crouch(-0.34), spine: [0.6, 0.2, 0], chest: [0.3, 0.3, 0], shR: [-1.1, 0, 0.25], elR: [0, 0, 0], weapon: [1.4, 0, 0], shL: [-1.1, 0, -0.25], head: [0.2, 0, 0] };
  return keys(t, [[0, STANCE], [0.18, W, easeOut], [0.3, S, (k) => k * k], [0.46, S], [0.62, STANCE]]);
}
export function hsmash2(t) {
  const W = { ...STANCE, ...crouch(-0.24), ...ARMS_OUT, chest: [0.2, -1.5, 0], spine: [0.2, -0.5, 0], shL: [-1.2, 0, 0.3], elL: [-0.4, 0, 0], weapon: [1.7, 0, 0] };
  const S = (ry) => ({ ...STANCE, ...crouch(-0.3), ...ARMS_OUT, chest: [0.2, 0.9, 0], spine: [0.3, 0.3, 0], shL: [-1.2, 0, 0.1], bodyRy: ry, weapon: [1.75, 0, 0] });
  return keys(t, [[0, STANCE], [0.26, W, easeOut], [0.42, S(Math.PI * 2), easeOut], [0.6, S(Math.PI * 2)], [0.82, { ...STANCE, bodyRy: Math.PI * 2 }]]);
}
export function whirl(t) { const k = Math.min(1, t / 0.72); return { ...STANCE, ...crouch(-0.2), ...ARMS_OUT, chest: [0.1, 0.6, 0], shL: [0, 0, 1.3], bodyRy: easeOut(k) * Math.PI * 6, weapon: [1.68, 0, 0] }; }

// hunched creatures add this on top of everything
export const HUNCH = { spine: [0.55, 0, 0], head: [-0.55, 0, 0], hipsY: -0.12, knL: [0.25, 0, 0], knR: [0.25, 0, 0], hipL: [-0.2, 0, 0], hipR: [-0.2, 0, 0], shL: [-0.3, 0, 0], shR: [-0.3, 0, 0] };

const FOE_ATTACK = { fslash, fthrust, pounce, cast, aim, slam, sweep, bash, spin, charge: chargeRun, leap, thrust: fthrust };

// One entry point: the pose for an entity this frame.
export function poseFor(e, t) {
  let p;
  switch (e.anim) {
    case 'idle': p = e.def && e.def.hover ? hover(t) : idle(t); break;
    case 'run': p = run(t, e.team === 'hero' ? 1 : 0.8); break;
    case 'walk': p = walk(t); break;
    case 'slash1': p = slash1(t); break;
    case 'slash2': p = slash2(t); break;
    case 'slash3': p = slash3(t); break;
    case 'charge': p = chargeRun(t, e.atk || { windup: e.team === 'hero' ? 0 : 0.85 }); break;
    case 'hsmash1': p = hsmash1(t); break;
    case 'hsmash2': p = hsmash2(t); break;
    case 'whirl': p = whirl(t); break;
    case 'heavy': p = heavy(t); break;
    case 'thrust': p = e.team === 'hero' ? thrust(t) : fthrust(t, e.atk || { windup: 0.5, active: 0.7, dur: 1.1 }); break;
    case 'aim': p = e.team === 'hero' ? aim(Math.max(t, 0.5), { windup: 0.4, active: 0.45, dur: 9 }) : aim(t, e.atk || { windup: 0.95, active: 0.97, dur: 1.5 }); break;
    case 'cast': p = e.team === 'hero' ? cast(0.62 + Math.min(t, 0.2), { windup: 0.6, active: 0.62, dur: 9 }) : cast(t, e.atk || { windup: 0.6, active: 0.62, dur: 1.2 }); break;
    case 'dash': p = dash(t); break;
    case 'parry': p = parry(t); break;
    case 'hurt': p = hurt(t); break;
    case 'heal': p = heal(t); break;
    case 'finisher': p = finisher(t); break;
    case 'special': p = special(t); break;
    case 'die': p = die(t); break;
    case 'dieHard': p = dieHard(t); break;
    case 'stagger': p = stagger(t); break;
    case 'finished': p = finished(t); break;
    case 'rise': p = rise(t); break;
    case 'roar': p = roar(t); break;
    default: {
      const f = FOE_ATTACK[e.anim]; p = f ? f(t, e.atk || { windup: 0.5, active: 0.7, dur: 1.2 }) : idle(t);
    }
  }
  if (e.def && e.def.hunch && e.anim !== 'die' && e.anim !== 'dieHard' && e.anim !== 'rise') p = add(p, HUNCH);
  // never write into p: clips can return shared base poses (STANCE) by reference
  if (e.def && e.def.hover && e.anim !== 'die' && e.anim !== 'dieHard' && e.anim !== 'idle') p = { ...p, bodyY: (p.bodyY || 0) + 0.35 + Math.sin(t * 1.8) * 0.08 };
  return p;
}
