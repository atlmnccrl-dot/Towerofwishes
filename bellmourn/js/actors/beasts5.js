// Act IV's bodies (js/game/units4.js): the bell-jelly, the glass hound and the shard swarm. Same building blocks
// as the other beasts (lit boxes on joints, glowing parts), facing +Z; glass parts are translucent.
//
// PROPOSAL: every look described here.
import * as THREE from '../../vendor/three.module.min.js';
import { Beast, clamp01 } from './beasts2.js';

const TAU = Math.PI * 2, S = Math.sin, C = Math.cos;
const glassMats = new Map();
const glass = (col, op = 0.6, em = 0.5) => { const k = col + ':' + op + ':' + em; if (!glassMats.has(k)) glassMats.set(k, new THREE.MeshLambertMaterial({ color: col, transparent: true, opacity: op, emissive: new THREE.Color(col).multiplyScalar(em), depthWrite: false })); return glassMats.get(k); };

// ------------------------------------------------------------------ the bell-jelly
// A drifting bell of clear glass the size of a man, a ring of light round its lip, a tongue of light hanging in
// it like a clapper, and six long tendrils of glowing thread trailing under it. It pulses as it swims: the bell
// squeezes and the tendrils flare. It tolls (a ring of sound) and lashes with the tendrils.
class BellJelly extends Beast {
  constructor(look) {
    super(look); const Cc = look.colors; this.baseY = 1.7;
    this.joint('base', null, 0, this.baseY, 0);
    this.joint('bell', 'base', 0, 0, 0);
    const rings = [[0.36, 0.14, 0.42], [0.56, 0.16, 0.28], [0.7, 0.16, 0.12], [0.8, 0.1, -0.02]];
    for (const [w, h, y] of rings) this.part('bell', w, h, w, Cc.glass, 0, y, 0, { material: glass(Cc.glass, 0.5, 0.4) });
    this.part('bell', 0.22, 0.1, 0.22, Cc.glass, 0, 0.53, 0, { material: glass(Cc.glass, 0.7, 0.5) });
    this.lip = this.part('bell', 0.86, 0.04, 0.86, Cc.lip, 0, -0.08, 0, { glow: 2.4 });
    this.joint('tongue', 'bell', 0, 0.3, 0);
    this.part('tongue', 0.05, 0.4, 0.05, Cc.lip, 0, -0.2, 0, { glow: 1.6 }); this.core = this.part('tongue', 0.16, 0.16, 0.16, Cc.core, 0, -0.44, 0, { glow: 3 });
    for (const sx of [-1, 1]) this.part('bell', 0.07, 0.05, 0.03, look.eyes, sx * 0.12, 0.28, 0.27, { glow: 5 });
    // tendrils: six chains of five links under the lip
    this.tend = [];
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU; let parent = 'bell'; const chain = [];
      for (let k = 0; k < 5; k++) { const n = 't' + i + '_' + k; this.joint(n, parent, k ? 0 : S(a) * 0.3, k ? -0.26 : -0.08, k ? 0 : C(a) * 0.3); this.part(n, 0.04, 0.26, 0.04, Cc.thread, 0, -0.13, 0, { glow: 1.4 + k * 0.2 }); chain.push(n); parent = n; }
      this.tend.push({ a, chain });
    }
    this.j.bell.add(this.hand); this.hand.position.set(0, -0.4, 0.3); this.j.bell.add(this.tip); this.tip.position.set(0, -0.6, 0.8);
  }
  animate(e, t, dt) {
    this.time += dt; const tm = this.time; const a = e.anim; const ph = this.atkPhase(e, t, e.atk || { windup: 0.6, active: 0.7, dur: 1.2 });
    let squeeze = 0.5 + 0.5 * S(tm * 2.6), lash = 0, lift = S(tm * 1.3) * 0.15, pitch = 0, flare = 1;
    if (a === 'toll') { const k = ph.part === 'windup' ? ph.k : 1 - (ph.part === 'recover' ? ph.k : 0); squeeze = 1 - k; flare = 1 + 1.5 * k; lift += 0.3 * k; }
    else if (a === 'sting') { const k = ph.part === 'windup' ? -ph.k : (ph.part === 'strike' ? 1 : 1 - ph.k); lash = k; pitch = 0.4 * Math.max(0, k); }
    else if (a === 'hurt') { pitch = -0.3; squeeze = 1; }
    else if (a === 'die' || a === 'dieHard') { const k = clamp01(t / 0.8); lift = -1.4 * k; squeeze = 1; flare = 1 - k; }
    else if (a === 'rise' || a === 'spawn') { const k = clamp01(t / 0.8); lift = -1.2 + 1.2 * k; }
    const P = { lift, pitch };
    for (const tn of this.tend) tn.chain.forEach((n, k) => { const wv = S(tm * 3 - k * 0.7 + tn.a) * 0.22; P[n] = [k === 0 ? 0.2 + lash * 0.9 * C(tn.a) : wv * C(tn.a) + lash * 0.35, 0, k === 0 ? -lash * 0.9 * S(tn.a) : wv * S(tn.a)]; });
    this.pose(P, dt, a === 'sting' ? 18 : 7);
    this.j.bell.scale.set(1 + 0.1 * squeeze, 1 - 0.14 * squeeze, 1 + 0.1 * squeeze);
    this.lip.scale.setScalar(flare); this.core.scale.setScalar(0.9 + 0.25 * S(tm * 6) * flare);
    this.j.tongue.rotation.z = S(tm * 1.7) * 0.25;
  }
}

// ------------------------------------------------------------------ the glass hound
// A hound of stained glass: its body a cage of leaded panes in two colours with a heart of light inside, legs of
// amber glass, a long glass muzzle full of shard teeth, a crest of shards down its back. It runs low and fast,
// bites, and leaps; when it dies it shatters.
class GlassHound extends Beast {
  constructor(look) {
    super(look); const Cc = look.colors; this.baseY = 0.62;
    this.joint('base', null, 0, this.baseY, 0);
    const pa = glass(Cc.paneA, 0.7, 0.55), pb = glass(Cc.paneB, 0.7, 0.55);
    this.part('base', 0.3, 0.3, 0.36, Cc.paneA, 0, 0.04, 0.2, { material: pa }); this.part('base', 0.24, 0.24, 0.36, Cc.paneB, 0, 0.06, -0.14, { material: pb });
    for (const [y, z] of [[0.2, 0.2], [0.2, -0.14], [-0.1, 0.03]]) this.part('base', 0.32, 0.03, 0.04, Cc.lead, 0, y, z);
    this.heart = this.part('base', 0.13, 0.13, 0.13, Cc.core, 0, 0.05, 0.08, { glow: 3 });
    for (let i = 0; i < 5; i++) this.part('base', 0.05, 0.12 + (i % 2) * 0.06, 0.07, Cc.paneB, 0, 0.24, 0.3 - i * 0.12, { material: pb, rx: -0.4 });
    this.joint('neck', 'base', 0, 0.12, 0.36); this.part('neck', 0.14, 0.14, 0.24, Cc.paneA, 0, 0.06, 0.08, { material: pa, rx: -0.7 });
    this.joint('head', 'neck', 0, 0.16, 0.16);
    this.part('head', 0.18, 0.15, 0.2, Cc.paneA, 0, 0, 0.02, { material: pa }); this.part('head', 0.1, 0.08, 0.24, Cc.paneB, 0, -0.03, 0.22, { material: pb });
    for (const sx of [-1, 1]) { this.part('head', 0.04, 0.035, 0.03, look.eyes, sx * 0.07, 0.04, 0.12, { glow: 6 }); this.part('head', 0.04, 0.14, 0.04, Cc.paneB, sx * 0.06, 0.12, -0.04, { material: pb, rz: -sx * 0.3, rx: -0.4 }); }
    this.joint('jaw', 'head', 0, -0.07, 0.1); this.part('jaw', 0.09, 0.04, 0.22, Cc.paneA, 0, -0.02, 0.11, { material: pa });
    for (let i = 0; i < 4; i++) this.part('jaw', 0.02, 0.05, 0.02, Cc.core, (i % 2 ? 1 : -1) * 0.035, 0.02, 0.05 + i * 0.045, { glow: 2 });
    const legH = 0.28;
    for (const [n, x, z] of [['lf', 1, 1], ['rf', -1, 1], ['lb', 1, -1], ['rb', -1, -1]]) {
      this.joint(n, 'base', x * 0.12, -0.06, z * 0.26); this.part(n, 0.08, legH, 0.09, Cc.amber, 0, -legH / 2, 0, { material: glass(Cc.amber, 0.85, 0.4) });
      this.joint(n + 'k', n, 0, -legH, 0); this.part(n + 'k', 0.06, legH, 0.06, Cc.amber, 0, -legH / 2, 0, { material: glass(Cc.amber, 0.85, 0.4) }); this.part(n + 'k', 0.09, 0.04, 0.13, Cc.lead, 0, -legH, 0.03);
    }
    let parent = 'base'; for (let i = 0; i < 3; i++) { this.joint('tail' + i, parent, 0, i ? 0 : 0.12, i ? -0.14 : -0.32); this.part('tail' + i, 0.06, 0.06, 0.14, Cc.paneB, 0, 0, -0.07, { material: pb }); parent = 'tail' + i; }
    this.j.head.add(this.hand); this.hand.position.set(0, -0.03, 0.12); this.j.head.add(this.tip); this.tip.position.set(0, -0.04, 0.38);
  }
  animate(e, t, dt) {
    this.time += dt; const a = e.anim; const sp = this.speedOf(e); const ph = this.atkPhase(e, t, e.atk || { windup: 0.4, active: 0.5, dur: 0.9 });
    this.gait += dt * (sp > 0.3 ? 4 + sp * 1.6 : 0); const g = this.gait; const run = sp > 0.3 ? Math.min(1, sp / 4) : 0;
    const leg = (o, amp) => [S(g + o) * amp * run, 0, 0];
    let P = { lf: leg(0, 0.9), rb: leg(0.3, 0.9), rf: leg(Math.PI, 0.9), lb: leg(Math.PI + 0.3, 0.9), lfk: [Math.max(0, -S(g)) * run, 0, 0], rfk: [Math.max(0, S(g)) * run, 0, 0], lbk: [-Math.max(0, S(g + 0.3)) * run, 0, 0], rbk: [-Math.max(0, -S(g + 0.3)) * run, 0, 0], lift: Math.abs(S(g)) * 0.06 * run, neck: [0.1, 0, 0], head: [-0.1, 0, 0], jaw: [0.05, 0, 0], tail0: [0.4 + S(this.time * 6) * 0.2, S(this.time * 4) * 0.4, 0] };
    if (a === 'bite' || a === 'fslash') { const k = ph.part === 'windup' ? ph.k : (ph.part === 'strike' ? 1 : 1 - ph.k); P = { ...P, neck: [0.5 * k - 0.3 * (ph.part === 'windup' ? ph.k : 0), 0, 0], jaw: [ph.part === 'windup' ? 0.7 * ph.k : 0.05, 0, 0], pitch: 0.15 * k }; }
    else if (a === 'leap' || a === 'pounce') { const k = ph.part === 'windup' ? ph.k : 1; P = { ...P, lf: [-1.1 * k, 0, 0], rf: [-1.1 * k, 0, 0], lb: [0.9 * k, 0, 0], rb: [0.9 * k, 0, 0], jaw: [0.6, 0, 0], pitch: ph.part === 'windup' ? 0.25 * k : -0.15, lift: ph.part === 'strike' ? 0.4 : 0 }; }
    else if (a === 'hurt' || a === 'stagger') P = { ...P, roll: 0.3, neck: [-0.4, 0, 0] };
    else if (a === 'die' || a === 'dieHard') { const k = clamp01(t / 0.35); P = { ...P, roll: 1.5 * k, lift: -0.4 * k }; this.body.scale.setScalar((this.look.scale || 1) * (1 - 0.6 * k)); }
    this.pose(P, dt, 14);
    this.heart.scale.setScalar(0.85 + 0.25 * S(this.time * 7));
  }
}

// ------------------------------------------------------------------ the shard swarm
// A storm of broken panes turning round a little heart of light: two rings of shards at different heights and
// speeds, and loose ones darting in and out. It drifts toward you and the rings close in a whirl to shred.
class ShardSwarm extends Beast {
  constructor(look) {
    super(look); const Cc = look.colors; this.baseY = 1.1;
    this.joint('base', null, 0, this.baseY, 0);
    this.core = this.part('base', 0.18, 0.18, 0.18, Cc.core, 0, 0, 0, { glow: 3.4 });
    this.rings = [];
    const hues = Cc.hues || [0xff7aa8, 0x6ab8ff, 0xb07aff, 0x70e8b8, 0xffc060];
    for (let r = 0; r < 3; r++) {
      const g = this.joint('ring' + r, 'base', 0, (r - 1) * 0.28, 0); const n = 6 + r * 2; const R = 0.45 + r * 0.18;
      for (let i = 0; i < n; i++) { const a = i / n * TAU; this.part('ring' + r, 0.16 + (i % 3) * 0.05, 0.12, 0.03, hues[(i + r) % hues.length], S(a) * R, (i % 2 ? 0.06 : -0.06), C(a) * R, { material: glass(hues[(i + r) % hues.length], 0.8, 0.9), ry: a + 0.4, rx: (i % 3) * 0.5 }); }
      this.rings.push({ g, R, sp: (r % 2 ? -1 : 1) * (2.2 + r * 0.6) });
    }
    this.j.base.add(this.hand); this.j.base.add(this.tip); this.tip.position.set(0, 0, 0.6);
  }
  animate(e, t, dt) {
    this.time += dt; const a = e.anim; const ph = this.atkPhase(e, t, e.atk || { windup: 0.7, active: 0.8, dur: 1.4 });
    let close = 1, spin = 1, lift = S(this.time * 1.8) * 0.12;
    if (a === 'shred' || a === 'cast') { const k = ph.part === 'windup' ? ph.k : (ph.part === 'strike' ? 1 : 1 - ph.k); close = 1 - 0.5 * k; spin = 1 + 3 * k; }
    else if (a === 'die' || a === 'dieHard') { const k = clamp01(t / 0.5); close = 1 + 2.5 * k; spin = 0.3; lift = -0.6 * k; }
    this.pose({ lift }, dt, 8);
    for (const r of this.rings) { r.g.rotation.y += dt * r.sp * spin; r.g.scale.set(close, 1, close); r.g.rotation.x = S(this.time * 0.9 + r.R * 5) * 0.25; }
    this.core.scale.setScalar(0.9 + 0.3 * S(this.time * 9));
  }
}


// ------------------------------------------------------------------ the Last Seraph
// God's herald, the last angel: taller than a man, she floats; a robe of white and gold that thins at the hem into
// light, golden bracers, a smooth mask of gold with no face on it, six wings of gold feathers edged with light in
// three pairs, and behind her head her halo, a ring of fire-gold that she draws down into her hand and swings as
// a blade, or throws. e.form 2: the wings burn at the edges; e.form 3: the robe is torn, the mask cracked, light
// pours out of the crack.
class Seraph extends Beast {
  constructor(look) {
    super(look); const Cc = look.colors; this.baseY = 1.1;
    this.joint('base', null, 0, this.baseY, 0);
    // the robe: tapering drums that thin into light at the hem
    for (let i = 0; i < 4; i++) { const w = 0.3 + i * 0.07; this.part('base', w, 0.22, w * 0.8, i === 3 ? Cc.light : Cc.robe, 0, -0.1 - i * 0.2, 0, i === 3 ? { glow: 1.4 } : {}); }
    this.hem = this.part('base', 0.62, 0.05, 0.52, Cc.light, 0, -0.76, 0, { glow: 2.4 });
    this.joint('chest', 'base', 0, 0.08, 0);
    this.part('chest', 0.38, 0.44, 0.26, Cc.robe, 0, 0.2, 0); this.part('chest', 0.32, 0.22, 0.04, Cc.gold, 0, 0.26, 0.14);
    this.part('chest', 0.42, 0.08, 0.3, Cc.gold, 0, 0.42, 0);
    this.joint('head', 'chest', 0, 0.48, 0);
    this.part('head', 0.2, 0.26, 0.2, Cc.gold, 0, 0.1, 0); this.mask = this.part('head', 0.16, 0.2, 0.03, Cc.mask, 0, 0.1, 0.11, { glow: 1.1 });
    this.crack = this.part('head', 0.025, 0.2, 0.02, Cc.light, 0.03, 0.1, 0.125, { glow: 3.2, rz: 0.3 }); this.crack.visible = false;
    this.part('head', 0.24, 0.06, 0.24, Cc.gold, 0, 0.24, -0.02);
    // the halo: behind her head, or in her hand
    this.joint('halo', 'head', 0, 0.16, -0.22);
    const ring = 12; for (let i = 0; i < ring; i++) { const a = i / ring * Math.PI * 2; this.part('halo', 0.1, 0.05, 0.05, Cc.halo, Math.sin(a) * 0.34, Math.cos(a) * 0.34, 0, { glow: 2.8, rz: -a }); }
    // arms
    for (const [n, sx] of [['shL', 1], ['shR', -1]]) { this.joint(n, 'chest', sx * 0.24, 0.36, 0); this.part(n, 0.1, 0.32, 0.1, Cc.robe, 0, -0.16, 0); this.joint(n + 'f', n, 0, -0.32, 0); this.part(n + 'f', 0.11, 0.3, 0.11, Cc.gold, 0, -0.14, 0); this.part(n + 'f', 0.08, 0.1, 0.1, Cc.skin, 0, -0.32, 0.02); }
    // six wings, three a side: feathers of gold, edged with light
    this.wings = [];
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) {
      const n = 'w' + (sx > 0 ? 'L' : 'R') + i; this.joint(n, 'chest', sx * 0.14, 0.34 - i * 0.14, -0.15);
      const L = 0.7 - i * 0.12; for (let k = 0; k < 5; k++) { this.part(n, 0.14, 0.06, L * (1 - k * 0.12), Cc.feather, sx * (0.1 + k * 0.15), -k * 0.035, -L * 0.3, {}); }
      this.edges = this.edges || []; this.edges.push(this.part(n, 0.82, 0.03, 0.05, Cc.light, sx * 0.42, -0.08, -L * 0.62, { glow: 2.2 }));
      this.wings.push({ n, sx, i });
    }
    this.j.shRf.add(this.hand); this.hand.position.set(0, -0.32, 0.05); this.j.shRf.add(this.tip); this.tip.position.set(0, -0.32, 0.7);
  }
  animate(e, t, dt) {
    this.time += dt; const tm = this.time; const a = e.anim; const ph = this.atkPhase(e, t, e.atk || { windup: 0.7, active: 0.85, dur: 1.4 });
    const k = ph.part === 'windup' ? ph.k : (ph.part === 'strike' ? 1 : 1 - ph.k);
    let P = { lift: 0.25 + S(tm * 1.5) * 0.1, roll: S(tm * 0.8) * 0.03, shL: [0.15, 0, 0.2], shR: [0.15, 0, -0.2], shLf: [-0.3, 0, 0], shRf: [-0.3, 0, 0], head: [0.05, 0, 0] };
    let spread = 0.4, flap = S(tm * 2.2) * 0.12, haloInHand = false;
    if (a === 'sweep' || a === 'haloblade') { haloInHand = true; P = { ...P, shR: [-1.2 - 0.6 * k + (ph.part === 'strike' ? 1.6 : 0), 0.8 * (ph.part === 'windup' ? -1 : 1), -0.5], chest: [0, (ph.part === 'windup' ? 0.6 : -0.7) * k, 0], pitch: 0.1 * k }; spread = 0.7; }
    else if (a === 'cast' || a === 'raise') { P = { ...P, shL: [-2.6 * k, 0, 0.4], shR: [-2.6 * k, 0, -0.4], head: [-0.3 * k, 0, 0], lift: P.lift + 0.3 * k }; spread = 0.4 + 0.8 * k; }
    else if (a === 'throw') { haloInHand = ph.part === 'windup'; P = { ...P, shR: [ph.part === 'windup' ? -2.4 * k : 0.6, 0, -0.3], chest: [0, ph.part === 'windup' ? 0.5 * k : -0.5, 0] }; spread = 0.6; }
    else if (a === 'slam' || a === 'dive' || a === 'leap') { haloInHand = true; P = { ...P, pitch: ph.part === 'windup' ? -0.3 * k : 0.6, lift: ph.part === 'windup' ? P.lift + 0.8 * k : 0, shR: [-2.8 * k, 0, -0.2], shL: [-2.8 * k, 0, 0.2] }; spread = ph.part === 'windup' ? 1.2 : 0.1; }
    else if (a === 'roar' || a === 'toll') { P = { ...P, shL: [-0.5, 0, 1.4 * k], shR: [-0.5, 0, -1.4 * k], head: [-0.4 * k, 0, 0], pitch: -0.15 * k }; spread = 0.5 + 1.0 * k; flap = 0; }
    else if (a === 'stagger' || a === 'hurt') { P = { ...P, pitch: -0.35, lift: 0, head: [0.4, 0, 0] }; spread = 0.15; }
    else if (a === 'die' || a === 'dieHard') { const q = clamp01(t / 2); P = { ...P, pitch: 0.6 * q, lift: -0.9 * q, roll: 0.3 * q, head: [0.6 * q, 0, 0] }; spread = 0.5 * (1 - q); }
    this.pose(P, dt, a === 'sweep' || a === 'haloblade' ? 16 : 8);
    for (const wg of this.wings) { const j = this.j[wg.n]; j.rotation.y = wg.sx * (-0.3 - spread * (0.6 + wg.i * 0.3)) + flap * wg.sx; j.rotation.z = wg.sx * (0.5 - wg.i * 0.45 + flap); j.rotation.x = -0.2; }
    // the halo: behind her head, turning; in her hand when she swings it; gone while it flies
    const hj = this.j.halo; if (haloInHand) { const v = new THREE.Vector3(); this.hand.getWorldPosition(v); this.j.head.worldToLocal(v); hj.position.copy(v); hj.rotation.set(Math.PI / 2, 0, 0); } else { hj.position.set(0, 0.16, -0.22); hj.rotation.set(0, 0, tm * 0.8); }
    hj.visible = !(a === 'throw' && ph.part !== 'windup');
    const f = e.form || 1; this.crack.visible = f >= 3; this.mask.scale.y = f >= 3 ? 0.9 : 1;
    for (const ed of this.edges) ed.scale.set(1, 1 + (f - 1) * 1.5 + 0.4 * S(tm * 9), 1);
    this.hem.scale.setScalar(1 + 0.15 * S(tm * 4));
  }
}

export function makeBeast5(look) {
  switch (look.rig) {
    case 'belljelly': return new BellJelly(look);
    case 'glasshound': return new GlassHound(look);
    case 'shardswarm': return new ShardSwarm(look);
    case 'seraph': return new Seraph(look);
  }
  return null;
}
