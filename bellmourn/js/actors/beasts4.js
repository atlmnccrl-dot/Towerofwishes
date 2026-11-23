// The bodies of the run's five new bosses (game/bosses5.js) and the Smiling Guest's masks: the Drowned
// King-Crab and the Hollow Mother are creatures of their own (Beast, as in beasts2.js); the Stilled Ronin, the
// Smiling Guest, its masks and the Pyre Saint stand like people, so they are rigs (rig.js) with poses of their
// own (PosedRig: the Ronin's draw and sheathe, the Guest's held frames and its bow, the Saint's cross), and the
// usual clips (anims.js) for everything else. Same surface as every beast: root, flash, updateCloak, tip,
// handWorld, tipWorld, parts, animate(e, t, dt).
//
// PROPOSAL: every look described here.
import * as THREE from '../../vendor/three.module.min.js';
import { Beast, mixP, clamp01, ease, lerp, glowMat } from './beasts2.js';
import { Rig, mat } from './rig.js';
import { poseFor, mix } from './anims.js';

const TAU = Math.PI * 2;
const S = Math.sin, C = Math.cos;
const atkPh = (e, t, d) => { const a = e.atk || d; const w = a.windup, ac = a.active, du = a.dur; if (t < w) return { part: 'windup', k: clamp01(t / w) }; if (t < ac) return { part: 'strike', k: clamp01((t - w) / Math.max(0.01, ac - w)) }; return { part: 'recover', k: clamp01((t - ac) / Math.max(0.01, du - ac)) }; };

// ================================================================== the Drowned King-Crab
// A domed shell crusted with barnacles and weed, the wreck of a fishing boat grown into its back, a crown of
// coral, a drowned lantern hanging off it; eyes on stalks; a crusher claw as big as a cart (right) and a long
// cutter (left); eight spiked legs. When its shell breaks, the plates fall away and the soft glowing body
// shows through the cracks; when the shell regrows it comes back scarred.
class KingCrab extends Beast {
  constructor(look) {
    super(look); const Cc = look.colors; this.baseY = 0.5; const eye = look.eyes || 0x70ffe8;
    this.joint('base', null, 0, this.baseY, 0);
    // the soft body (under the shell; glows when the shell is gone)
    this.part('base', 1.3, 0.3, 1.0, Cc.under, 0, -0.06, 0);
    this.flesh = []; for (const [x, z, w2] of [[0.25, 0.1, 0.5], [-0.3, -0.12, 0.44], [0.05, -0.32, 0.6], [-0.05, 0.3, 0.4], [0.4, -0.2, 0.3]]) { const f = this.part('base', w2, 0.07, 0.14, Cc.flesh, x, 0.18, z, { glow: 2.4, ry: x * 2 }); f.visible = false; this.flesh.push(f); }
    // the shell plates (a group so they can fall away): a broad low dome, lighter on top, a dark spiked rim
    this.joint('shell', 'base', 0, 0, 0);
    this.part('shell', 1.74, 0.14, 1.3, Cc.dark, 0, 0.06, 0);
    this.part('shell', 1.6, 0.26, 1.2, Cc.shell, 0, 0.22, 0);
    this.part('shell', 1.3, 0.16, 0.96, Cc.top || Cc.shell, 0, 0.4, -0.02);
    this.part('shell', 0.86, 0.1, 0.62, Cc.top || Cc.shell, 0, 0.52, -0.04);
    for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) this.part('shell', 0.14, 0.1, 0.14, Cc.dark, sx * (0.86 - Math.abs(i - 2) * 0.04), 0.1, 0.5 - i * 0.25, { rz: sx * 0.4 }); // the spiked rim
    for (const [x, z] of [[-0.55, 0.62], [-0.28, 0.66], [0, 0.68], [0.28, 0.66], [0.55, 0.62]]) this.part('shell', 0.1, 0.12, 0.1, Cc.dark, x, 0.16, z, { rx: 0.5 }); // the front teeth of the shell
    for (const [x, y, z, s] of [[0.36, 0.52, 0.16, 0.12], [-0.44, 0.45, -0.22, 0.1], [0.1, 0.6, -0.28, 0.14], [-0.18, 0.5, 0.34, 0.09], [0.6, 0.36, -0.32, 0.11], [-0.64, 0.34, 0.14, 0.1], [0.5, 0.42, 0.4, 0.08], [-0.3, 0.58, -0.05, 0.08]]) { this.part('shell', s, s * 0.8, s, Cc.barnacle, x, y, z); this.part('shell', s * 0.4, s * 0.3, s * 0.4, 0x2a2420, x, y + s * 0.42, z); }
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; this.part('shell', 0.05, 0.24 + (i % 3) * 0.1, 0.05, Cc.moss, S(a) * 0.84, -0.06 - (i % 3) * 0.05, C(a) * 0.64); } // weed hanging off the rim
    // a drowned king's crown of tarnished gold grown into the shell, coral round it
    for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU; this.part('shell', 0.07, 0.16 + (i % 2) * 0.1, 0.07, Cc.crown || 0xd8b050, S(a) * 0.2, 0.64 + (i % 2) * 0.05, C(a) * 0.16 + 0.1, { emissive: 0x3a2808, ei: 2 }); }
    this.part('shell', 0.46, 0.05, 0.38, Cc.crown || 0xd8b050, 0, 0.58, 0.1, { emissive: 0x3a2808, ei: 2 });
    for (const [x, h, z, rz] of [[-0.38, 0.3, 0.32, 0.4], [0.4, 0.26, 0.3, -0.45], [-0.5, 0.2, 0.18, 0.7], [0.52, 0.22, 0.12, -0.6]]) this.part('shell', 0.07, h, 0.07, Cc.coral, x, 0.5 + h / 2, z, { rz, emissive: 0x501414 });
    // the wreck of a fishing boat in its back, and a drowned lantern still burning
    this.part('shell', 0.72, 0.08, 0.26, Cc.wood, -0.12, 0.62, -0.36, { rz: 0.35, ry: 0.4 });
    this.part('shell', 0.62, 0.08, 0.22, Cc.wood, 0.05, 0.66, -0.48, { rz: 0.3, ry: 0.45 });
    this.part('shell', 0.06, 0.66, 0.06, Cc.wood, 0.16, 0.9, -0.4, { rz: -0.25 });
    this.part('shell', 0.34, 0.04, 0.04, Cc.wood, 0.22, 1.12, -0.4, { rz: -0.25 });
    this.part('shell', 0.02, 0.3, 0.02, 0x2a2a2a, 0.4, 0.95, -0.4);
    this.lamp = this.part('shell', 0.1, 0.12, 0.1, 0xffd070, 0.4, 0.78, -0.4, { glow: 3 });
    // eyes on stalks, mandibles
    this.joint('head', 'base', 0, 0.14, 0.6);
    for (const sx of [-1, 1]) { this.part('head', 0.06, 0.32, 0.06, Cc.dark, sx * 0.18, 0.2, 0, { rz: -sx * 0.2 }); this.part('head', 0.13, 0.13, 0.13, eye, sx * 0.22, 0.4, 0.01, { glow: 6 }); }
    this.joint('mouth', 'head', 0, -0.08, 0.06);
    for (const sx of [-1, 1]) this.part('mouth', 0.14, 0.1, 0.1, Cc.claw, sx * 0.09, 0, 0.02, { rz: sx * 0.3 });
    // the crusher (right, -X) and the cutter (left, +X): the claws carry the silhouette
    const claw = (side, big) => {
      const sx = side === 'L' ? 1 : -1;
      this.joint('arm' + side, 'base', sx * 0.66, 0.08, 0.46);
      this.part('arm' + side, big ? 0.24 : 0.17, big ? 0.24 : 0.17, 0.44, Cc.claw, 0, 0, 0.2);
      this.part('arm' + side, 0.08, 0.06, 0.1, Cc.barnacle, sx * 0.09, 0.12, 0.15);
      this.joint('fore' + side, 'arm' + side, 0, 0, 0.44);
      this.part('fore' + side, big ? 0.26 : 0.16, big ? 0.24 : 0.15, big ? 0.36 : 0.52, Cc.claw, 0, 0, big ? 0.18 : 0.26);
      this.joint('claw' + side, 'fore' + side, 0, 0, big ? 0.36 : 0.52);
      if (big) { this.part('claw' + side, 0.64, 0.48, 0.62, Cc.claw, 0, 0, 0.28); this.part('claw' + side, 0.54, 0.16, 0.5, Cc.top || Cc.shell, 0, 0.24, 0.26); for (let i = 0; i < 4; i++) this.part('claw' + side, 0.09, 0.07, 0.09, Cc.barnacle, -0.2 + i * 0.13, 0.32, 0.12 + i * 0.1); this.part('claw' + side, 0.26, 0.24, 0.42, Cc.tip, -sx * 0.13, -0.06, 0.76); }
      else { this.part('claw' + side, 0.28, 0.24, 0.62, Cc.claw, 0, 0, 0.3); this.part('claw' + side, 0.12, 0.1, 0.58, Cc.tip, -sx * 0.07, 0, 0.88); }
      this.joint('jaw' + side, 'claw' + side, sx * (big ? 0.22 : 0.1), -0.02, big ? 0.5 : 0.56);
      this.part('jaw' + side, big ? 0.2 : 0.1, big ? 0.2 : 0.1, big ? 0.56 : 0.56, Cc.tip, 0, 0, big ? 0.26 : 0.26);
    };
    claw('R', true); claw('L', false);
    this.j.clawR.add(this.hand); this.hand.position.set(0, 0, 0.3); this.j.clawR.add(this.tip); this.tip.position.set(0, 0, 0.9);
    // eight short, heavy, spiked legs, bent low
    this.legs = [];
    [0.36, 0.1, -0.16, -0.42].forEach((z, i) => { for (const sx of [1, -1]) {
      const n = 'l' + i + (sx > 0 ? 'L' : 'R'); const holder = this.fixed('base', sx * 0.7, 0.04, z, 0, sx * (-0.45 + i * 0.3), 0);
      this.joint(n, holder, 0, 0, 0); this.part(n, 0.46, 0.15, 0.15, i % 2 ? Cc.dark : Cc.shell, sx * 0.23, 0, 0); this.part(n, 0.07, 0.14, 0.07, Cc.barnacle, sx * 0.3, 0.1, 0);
      this.joint(n + 'k', n, sx * 0.46, 0, 0); this.part(n + 'k', 0.52, 0.12, 0.12, Cc.claw, sx * 0.26, 0, 0); this.part(n + 'k', 0.16, 0.08, 0.08, Cc.tip, sx * 0.56, 0, 0);
      this.legs.push({ n, sx, i });
    } });
  }
  animate(e, t, dt) {
    this.time += dt; const tm = this.time; const sp = this.speedOf(e); const anim = e.anim; const ROT = this.body.rotation;
    // the shell: plates gone while broken (the soft body glowing through), scarred when regrown
    const exposed = !e.shellOn && (e.shellBroken || e.shellGone);
    this.j.shell.visible = !exposed; for (const f of this.flesh) f.visible = exposed || (e.shellBroken > 0 && Math.sin(tm * 3) > 0.6);
    if (this.lamp) this.lamp.material = glowMat(0xffd070, 2.4 + Math.sin(tm * 4) * 0.8);
    const legP = (fn) => { const o = {}; for (const L of this.legs) { const [lift, swing, knee] = fn(L); o[L.n] = [0, L.sx * swing, L.sx * (0.35 + lift)]; o[L.n + 'k'] = [0, 0, L.sx * (-1.45 + knee)]; } return o; };
    const stand = legP(() => [0, 0, 0]);
    const walking = (amp, rate = 3.4) => { this.gait += dt * (2 + sp * rate); const g = this.gait; return legP((L) => { const ph = g + (L.i + (L.sx > 0 ? 0 : 1)) * Math.PI * 0.5; return [Math.max(0, Math.cos(ph)) * 0.4 * amp, Math.sin(ph) * 0.3 * amp, -Math.max(0, Math.cos(ph)) * 0.3 * amp]; }); };
    const crouch = (k) => legP(() => [-0.3 * k, 0, 0.4 * k]);
    // claws: [arm raise, arm swing, fore bend, claw roll, jaw open]
    const cl = (side, raise, swing, bend, open) => { const sx = side === 'L' ? 1 : -1; return { ['arm' + side]: [-raise, sx * swing, 0], ['fore' + side]: [-bend, 0, 0], ['claw' + side]: [0.1, 0, 0], ['jaw' + side]: [0, -sx * open, 0] }; };
    const claws = (r, l) => ({ ...cl('R', ...r), ...cl('L', ...l) });
    const rest = { ...claws([0.15, 0.2, 0.4, 0.15], [0.2, 0.25, 0.3, 0.1 + Math.max(0, S(tm * 2.3)) * 0.3]), head: [0, 0, 0], mouth: [0.1 + Math.max(0, S(tm * 7)) * 0.3, 0, 0] };
    let pose, rate = 12; let yaw = 0;
    if (anim === 'stamp') { const ph = atkPh(e, t, { windup: 0.7, active: 0.8, dur: 1.3 }); pose = ph.part === 'windup' ? { ...crouch(0.2), ...legP((L) => [0.7 * ph.k, 0, -0.3]), ...rest, lift: 0.1 * ph.k } : { ...crouch(0.4), ...rest, lift: -0.06 }; rate = ph.part === 'windup' ? 10 : 40; }
    else if (anim === 'crush') { const ph = atkPh(e, t, { windup: 0.95, active: 1.05, dur: 2.4 });
      if (ph.part === 'windup') pose = { ...stand, ...rest, ...cl('R', 1.3 * ease(ph.k), 0.1, 0.9, 0.6), pitch: -0.12 * ph.k };
      else if (ph.part === 'strike') { pose = { ...crouch(0.4), ...rest, ...cl('R', -0.35, 0.05, -0.1, 0.1), pitch: 0.16 }; rate = 50; }
      else pose = { ...crouch(0.4 * (1 - ph.k)), ...rest, ...cl('R', -0.35 + ph.k * 0.4, 0.05, -0.1, 0.1 + S(tm * 30) * 0.05), pitch: 0.16 * (1 - ph.k), roll: S(tm * 26) * 0.02 * (1 - ph.k) }; }
    else if (anim === 'sweep') { const ph = atkPh(e, t, { windup: 0.85, active: 1.0, dur: 1.6 });
      if (ph.part === 'windup') pose = { ...stand, ...rest, ...cl('L', 0.4, 1.3 * ph.k, 0.2, 0.5), roll: 0.08 * ph.k }; else if (ph.part === 'strike') { pose = { ...stand, ...rest, ...cl('L', 0.25, -1.3, 0.1, 0.2), roll: -0.1 }; rate = 34; } else pose = { ...stand, ...rest }; }
    else if (anim === 'pinch') { const ph = atkPh(e, t, { windup: 0.7, active: 0.75, dur: 1.5 });
      if (ph.part === 'windup') pose = { ...stand, ...claws([0.5, 0.9 * ph.k, 0.5, 0.9], [0.5, 0.9 * ph.k, 0.5, 0.9]), pitch: -0.1 }; else { pose = { ...stand, ...claws([0.3, -0.3, 0.2, 0], [0.3, -0.3, 0.2, 0]), pitch: 0.08 }; rate = 40; } }
    else if (anim === 'scuttle') { const ph = atkPh(e, t, { windup: 0.95, active: 1.6, dur: 2.15 }); yaw = (e.atk && e.atk.side ? e.atk.side : 1) * Math.PI / 2;
      pose = ph.part === 'windup' ? { ...crouch(0.4), ...claws([0.6, 0.6, 0.6, 0.4], [0.6, 0.6, 0.6, 0.4]), lift: -0.05 } : { ...walking(1.6, 8), ...claws([0.5, 0.5, 0.5, 0.2], [0.5, 0.5, 0.5, 0.2]), roll: S(tm * 30) * 0.05 }; rate = 22; }
    else if (anim === 'spit') { const ph = atkPh(e, t, { windup: 0.7, active: 0.72, dur: 1.4 }); pose = { ...stand, ...rest, mouth: [ph.part === 'windup' ? 0.6 : 0.2, 0, 0], head: [-0.3 * (ph.part === 'windup' ? ph.k : 1), 0, 0], pitch: ph.part === 'windup' ? -0.15 * ph.k : -0.05 }; }
    else if (anim === 'rear') { const ph = atkPh(e, t, { windup: 0.9, active: 0.92, dur: 2.2 });
      if (ph.part === 'windup') pose = { ...legP((L) => (L.i > 1 ? [-0.2, 0, 0.3] : [0.6 * ph.k, 0, -0.4])), ...claws([1.5 * ph.k, 0.4, 1.0, 0.8], [1.5 * ph.k, 0.4, 1.0, 0.8]), pitch: -0.55 * ease(ph.k), lift: 0.25 * ph.k };
      else { pose = { ...crouch(0.6), ...claws([-0.3, 0.3, -0.2, 0.1], [-0.3, 0.3, -0.2, 0.1]), pitch: 0.18 * (1 - ph.k), lift: -0.08 }; rate = ph.k < 0.2 ? 45 : 10; } }
    else if (anim === 'leap') { const ph = atkPh(e, t, { windup: 0.85, active: 1.5, dur: 2.2 });
      pose = ph.part === 'windup' ? { ...crouch(0.9), ...claws([0.6, 0.5, 0.8, 0.5], [0.6, 0.5, 0.8, 0.5]), lift: -0.12 } : (ph.part === 'strike' ? { ...legP(() => [0.5, 0, -0.6]), ...claws([0.9, 0.7, 0.4, 0.7], [0.9, 0.7, 0.4, 0.7]) } : { ...crouch(0.7 * (1 - ph.k)), ...rest }); rate = 18; }
    else if (anim === 'spin') { const ph = atkPh(e, t, { windup: 1.0, active: 1.5, dur: 2.3 }); this.spinA = (this.spinA || 0) + dt * (ph.part === 'strike' ? 14 : (ph.part === 'windup' ? -1 * ph.k : 2 * (1 - ph.k)));
      pose = { ...walking(1.2, 6), ...claws([0.6, 1.4, 0.1, 0.7], [0.6, 1.4, 0.1, 0.7]) }; yaw = this.spinA; rate = 20; }
    else if (anim === 'roar') pose = { ...stand, ...claws([1.2, 0.9, 0.8, 0.9], [1.2, 0.9, 0.8, 0.9]), pitch: -0.3, lift: 0.12, mouth: [0.7, 0, 0] };
    else if (anim === 'rise') { const k = clamp01(t / 0.9); pose = { ...crouch(1 - k), ...claws([1.2 * k, 0.6, 0.9, 0.6], [1.0 * k, 0.6, 0.9, 0.6]), pitch: -0.25 * k }; }
    else if (anim === 'hurt') { pose = { ...crouch(0.3), ...rest, pitch: -0.1, roll: S(t * 30) * 0.04 }; rate = 30; }
    else if (anim === 'stagger') { pose = { ...crouch(1.0), ...claws([-0.4, 0.5, 0, 0.5], [-0.4, 0.5, 0, 0.5]), lift: -0.18, roll: S(t * 5) * 0.08, pitch: 0.12 }; rate = 8; }
    else if (anim === 'die' || anim === 'dieHard') { const k = clamp01(t / 1.2); pose = { ...legP(() => [0.9, 0, 1.1]), ...claws([0.4, 0.3, 0.5, 0.3], [0.4, 0.3, 0.5, 0.3]), roll: Math.PI * 0.95 * ease(k), lift: 0.3 * S(k * Math.PI) }; rate = 6; }
    else if (sp > 0.3) pose = { ...walking(1), ...rest, roll: S(this.gait) * 0.02 };
    else pose = { ...stand, ...rest, lift: S(tm * 1.2) * 0.012 };
    if (anim !== 'spin') this.spinA = 0;
    ROT.y += ((anim === 'spin' ? yaw : yaw) - ROT.y) * (anim === 'spin' ? 1 : 1 - Math.exp(-10 * dt));
    this.pose(pose, dt, rate);
  }
}

// ================================================================== the Hollow Mother
// A long pale body, ribs showing, a smooth white head with no eyes and a mouth that splits down its whole
// length; six arms twice a man's length ending in long-fingered hands; two legs bent the wrong way. She
// twitches when still, like something listening.
class HollowMother extends Beast {
  constructor(look) {
    super(look); const Cc = look.colors; this.baseY = 0.95; const pale = { emissive: 0x2a2620 }, paleS = { emissive: 0x1a1814 };
    this.joint('base', null, 0, this.baseY, 0);
    this.part('base', 0.26, 0.3, 0.2, Cc.skin, 0, 0.1, 0, pale);
    this.joint('chest', 'base', 0, 0.25, 0);
    this.part('chest', 0.36, 0.48, 0.26, Cc.skin, 0, 0.22, 0, pale);
    for (let i = 0; i < 4; i++) this.part('chest', 0.36, 0.025, 0.02, Cc.shade, 0, 0.08 + i * 0.09, 0.125);
    for (let i = 0; i < 5; i++) this.part('chest', 0.05, 0.05, 0.05, Cc.shade, 0, 0.04 + i * 0.1, -0.13);
    this.joint('neck', 'chest', 0, 0.44, 0.02);
    this.part('neck', 0.09, 0.36, 0.09, Cc.skin, 0, 0.16, 0.03, { rx: 0.25, ...pale });
    this.joint('head', 'neck', 0, 0.32, 0.08);
    this.part('head', 0.22, 0.46, 0.24, Cc.skin, 0, 0.12, 0.02, pale);
    this.part('head', 0.16, 0.08, 0.18, Cc.shade, 0, 0.36, 0.0);
    // the mouth: a slit down the whole face, which opens
    this.joint('mouthL', 'head', 0.012, 0.12, 0.13); this.joint('mouthR', 'head', -0.012, 0.12, 0.13);
    this.part('mouthL', 0.03, 0.34, 0.02, Cc.mouth, 0.012, 0, 0, { glow: 1.4 }); this.part('mouthR', 0.03, 0.34, 0.02, Cc.mouth, -0.012, 0, 0, { glow: 1.4 });
    this.part('head', 0.02, 0.3, 0.025, Cc.dark, 0, 0.12, 0.122);
    this.j.head.add(this.hand); this.hand.position.set(0, 0.1, 0.2);
    // six arms: shoulder, upper, fore, a hand of three long fingers
    this.arms = [];
    [[0.4, 0.17], [0.27, 0.19], [0.12, 0.17]].forEach(([y, x], i) => { for (const sx of [1, -1]) {
      const n = 'a' + i + (sx > 0 ? 'L' : 'R'); const holder = this.fixed('chest', sx * x, y, 0.02, 0, sx * (0.35 - i * 0.35), 0);
      this.joint(n, holder, 0, 0, 0); this.part(n, 0.09, 0.62, 0.09, Cc.skin, 0, -0.31, 0, pale);
      this.joint(n + 'f', n, 0, -0.62, 0); this.part(n + 'f', 0.075, 0.7, 0.075, Cc.shade, 0, -0.35, 0, paleS);
      this.joint(n + 'h', n + 'f', 0, -0.7, 0); this.part(n + 'h', 0.11, 0.08, 0.08, Cc.skin, 0, -0.02, 0, pale);
      for (let k = -1; k <= 1; k++) this.part(n + 'h', 0.03, 0.26, 0.03, Cc.nail, k * 0.035, -0.15, 0.01, { rz: k * 0.14 });
      this.arms.push({ n, sx, i, ph: Math.random() * 10 });
    } });
    this.j.a1R.add(this.tip); this.tip.position.set(0, -1.5, 0);
    // two legs bent backwards
    for (const sx of [1, -1]) { const n = 'g' + (sx > 0 ? 'L' : 'R'); this.joint(n, 'base', sx * 0.1, -0.05, 0); this.part(n, 0.1, 0.56, 0.1, Cc.skin, 0, -0.28, 0, pale); this.joint(n + 'k', n, 0, -0.56, 0); this.part(n + 'k', 0.08, 0.62, 0.08, Cc.shade, 0, -0.31, 0, paleS); this.part(n + 'k', 0.08, 0.04, 0.2, Cc.skin, 0, -0.62, 0.06); }
    this.twitch = {}; this.twT = 0;
  }
  animate(e, t, dt) {
    this.time += dt; const tm = this.time; const sp = this.speedOf(e); const anim = e.anim;
    // twitches: now and then one limb snaps to a new angle and holds
    this.twT -= dt; if (this.twT <= 0) { this.twT = 0.25 + Math.random() * 0.7; const A = this.arms[Math.floor(Math.random() * this.arms.length)]; this.twitch[A.n] = (Math.random() - 0.5) * 0.9; if (Math.random() < 0.3) this.twitch.head = (Math.random() - 0.5) * 0.8; }
    const tw = (n) => this.twitch[n] || 0;
    // arms: [raise (forward), spread (out), elbow]
    const arm = (A, raise, spread, elbow) => ({ [A.n]: [-raise + tw(A.n) * 0.3, 0, A.sx * spread], [A.n + 'f']: [-elbow, 0, 0], [A.n + 'h']: [0.3, 0, 0] });
    const allArms = (fn) => { let o = {}; for (const A of this.arms) o = { ...o, ...arm(A, ...fn(A)) }; return o; };
    // crawling: the arms reach down to the floor round her like legs
    const crawl = (amp, rate) => { this.gait += dt * rate; const g = this.gait; return allArms((A) => { const ph = g + A.i * 2.1 + (A.sx > 0 ? 0 : Math.PI); return [0.6 + S(ph) * 0.45 * amp, 0.55 + A.i * 0.12, -0.9 + Math.max(0, C(ph)) * 0.5 * amp]; }); };
    const legs = (k = 0) => ({ gL: [-0.6 - k, 0, 0.1], gLk: [1.3 + k, 0, 0], gR: [-0.6 - k, 0, -0.1], gRk: [1.3 + k, 0, 0] });
    const mouth = (k) => ({ mouthL: [0, 0, -0.25 * k], mouthR: [0, 0, 0.25 * k] });
    const hunch = { chest: [0.7, 0, 0], neck: [-0.4, 0, 0], head: [-0.2 + tw('head') * 0.4, tw('head'), 0] };
    let pose, rate = 14;
    if (anim === 'rake') { const ph = atkPh(e, t, { windup: 0.6, active: 0.72, dur: 1.2 }); pose = { ...legs(), ...hunch, ...allArms((A) => (A.i === 0 ? (ph.part === 'windup' ? [1.6 * ph.k, 1.2, -0.3] : [0.6, -0.4, -0.2]) : [0.6, 0.6, -0.9])), ...mouth(ph.part === 'windup' ? 0.6 : 1), pitch: ph.part === 'strike' ? 0.2 : 0 }; rate = ph.part === 'strike' ? 40 : 16; }
    else if (anim === 'stab' || anim === 'lunge') { const ph = atkPh(e, t, { windup: 0.75, active: 0.85, dur: 1.4 }); pose = { ...legs(0.2), ...hunch, ...allArms((A) => (A.i === 1 && A.sx < 0 ? (ph.part === 'windup' ? [0.4, 0.2, -1.8 * ph.k] : [1.55, 0.05, 0]) : [0.6, 0.7, -0.9])), ...mouth(0.5), pitch: ph.part === 'windup' ? -0.1 : 0.25 }; rate = ph.part === 'strike' ? 50 : 14; }
    else if (anim === 'flurry') { const k = t / 0.16; const which = Math.floor(k) % 4; pose = { ...legs(), ...hunch, ...allArms((A, ix = this.arms.indexOf(A)) => (ix % 4 === which ? [1.55, 0.1, 0] : [0.7, 0.6, -1.2])), ...mouth(0.8) }; rate = 30; }
    else if (anim === 'embrace' || anim === 'shriek') { const ph = atkPh(e, t, { windup: 0.95, active: 1.05, dur: 1.8 }); const open = ph.part === 'windup' ? ease(ph.k) : 0; pose = { ...legs(-0.2), chest: [0.1, 0, 0], neck: [0, 0, 0], head: [-0.4 * open, 0, 0], ...allArms((A) => [0.9 + 0.4 * open, 0.4 + 1.3 * open, -0.4 * (1 - open)]), ...mouth(open * 1.4), lift: 0.15 * open }; rate = ph.part === 'strike' ? 40 : 12; }
    else if (anim === 'skitter') pose = { ...legs(0.5), ...hunch, ...crawl(1.6, 22), chest: [1.1, 0, 0], lift: -0.35 };
    else if (anim === 'hang') { pose = { ...legs(-0.3), chest: [0, 0, 0], neck: [0, 0, 0], head: [0.3, 0, 0], ...allArms((A) => [Math.PI * 0.9 + S(tm * 2 + A.i) * 0.2, 0.3, -0.2]), ...mouth(0.3), pitch: Math.PI, lift: 0.4 }; rate = 6; }
    else if (anim === 'land') { const k = clamp01(t / 0.6); pose = { ...legs(0.6 * (1 - k)), ...hunch, ...allArms((A) => [0.5, 1.0 - k * 0.3, -0.6]), lift: -0.4 * (1 - k), ...mouth(0.4) }; rate = 18; }
    else if (anim === 'roar') pose = { ...legs(-0.3), chest: [-0.15, 0, 0], neck: [-0.3, 0, 0], head: [-0.7, 0, 0], ...allArms((A) => [2.2 + S(tm * 9 + A.i) * 0.2, 0.6 + A.i * 0.3, -0.3]), ...mouth(1.6), lift: 0.2 };
    else if (anim === 'stagger' || anim === 'hurt') { pose = { ...legs(0.6), ...hunch, chest: [1.1, 0, 0.2], ...allArms((A) => [0.2, 0.9, -1.4]), ...mouth(1), lift: -0.3, roll: S(t * 7) * 0.1 }; rate = 10; }
    else if (anim === 'die' || anim === 'dieHard') { const k = clamp01(t / 1.4); pose = { ...legs(1), chest: [1.2, 0, 0], ...allArms((A) => [0.3 + k, 0.2, -2.2 * k]), lift: -0.9 * ease(k), roll: 0.5 * k, ...mouth(1.2) }; rate = 5; }
    else if (sp > 0.4) pose = { ...legs(0.3), ...hunch, ...crawl(1, 4 + sp * 2.2), lift: -0.2 };
    else pose = { ...legs(0.1), ...hunch, ...allArms((A) => [0.55 + S(tm * 0.7 + A.ph) * 0.06, 0.55 + A.i * 0.12, -0.9]), ...mouth(Math.max(0, S(tm * 0.6)) * 0.3), lift: -0.15 };
    this.pose(pose, dt, rate);
  }
}

// ================================================================== the rigs with poses of their own
// A Rig whose animate(e, t, dt) chooses the pose: its own clips first (pose(e, t) returns null to fall back to
// anims.js), crossfaded like the view does, or snapped (held frames) when the clip asks for it.
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
// pose helpers (rig joints: rx forward/back, rz out to the side; +X is the left)
const STILL = { hipsY: -0.02, chest: [0, 0, 0], spine: [0, 0, 0], head: [0.1, 0, 0], shL: [0.05, 0, 0.08], elL: [-0.1, 0, 0], shR: [0.05, 0, -0.08], elR: [-0.1, 0, 0], hipL: [0, 0, 0.04], knL: [0, 0, 0], hipR: [0, 0, -0.04], knR: [0, 0, 0] };

// ------------------------------------------------------------------ the Stilled Ronin
// A wide straw hat over a lowered face, a cloth over the mouth, a dark coat over a long divided skirt, a red
// sash; the long blade lives in its scabbard on his left hip and is out only for the instant of a cut.
class Ronin extends PosedRig {
  constructor(look) {
    super(look); const Cc = look.colors; const hs = look.headSize || 0.24;
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.44, 0.2, 10), mat(Cc.hat)); hat.position.set(0, hs + 0.08, 0); this.j.head.add(hat); this.parts.push(hat);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.02, 10), mat(0x8a7040)); rim.position.set(0, hs - 0.01, 0); this.j.head.add(rim); this.parts.push(rim);
    this._part('head', new THREE.BoxGeometry(hs + 0.02, hs * 0.42, 0.04), Cc.cloth, 0, hs * 0.22, hs / 2 + 0.01);
    this._part('head', new THREE.BoxGeometry(0.06, 0.24, 0.05), Cc.hair, 0, hs * 0.2, -hs / 2 - 0.03, { rx: 0.2 }); // the tail of hair under the hat
    this._part('spine', new THREE.BoxGeometry(0.4, 0.07, 0.25), Cc.belt, 0, 0.0, 0);
    for (const sx of [-1, 1]) this._part('chest', new THREE.BoxGeometry(0.12, 0.34, 0.25), Cc.tunic, sx * 0.12, 0.12, 0.01, { rz: sx * 0.08 }); // the crossed coat
    // the scabbard on the left hip, angled back; the hilt shows at its mouth while the blade is home
    this.saya = new THREE.Group(); this.saya.position.set(0.2, -0.02, 0.08); this.saya.rotation.set(-1.15, 0, 0.2); this.j.hips.add(this.saya);
    const sm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1.0), mat(Cc.sheath)); sm.position.z = -0.42; this.saya.add(sm); this.parts.push(sm);
    this.hilt = new THREE.Group(); this.saya.add(this.hilt);
    const hm = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.26), mat(0x1a1a20)); hm.position.z = 0.17; this.hilt.add(hm); this.parts.push(hm);
    const tb = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.02), mat(0x8a7a50)); tb.position.z = 0.04; this.hilt.add(tb); this.parts.push(tb);
    this.weapon.visible = false;
  }
  own(e, t) {
    const a = e.anim; const st = e.stance; const ph = (d) => atkPh(e, t, d);
    // iai: the deep crouch, right hand across at the hilt, the head down under the hat
    const IAI = { hipsY: -0.24, spine: [0.15, -0.35, 0], chest: [0.25, -0.25, 0], head: [0.25, 0.4, 0], shR: [-0.9, 0, 0.75], elR: [-1.2, 0, 0], shL: [-0.2, 0, 0.3], elL: [-0.9, 0, 0], hipL: [-0.75, 0, 0.12], knL: [1.1, 0, 0], hipR: [0.35, 0, -0.25], knR: [0.7, 0, 0], weapon: [1.4, 0, 0] };
    // after the cut: the blade held out low to the side, the body still turned
    const DRAWN = { hipsY: -0.2, spine: [0.1, 0.4, 0], chest: [0.15, 0.5, 0], head: [0.15, -0.6, 0], shR: [-1.45, 0, -1.2], elR: [-0.1, 0, 0], shL: [0.2, 0, 0.5], elL: [-0.4, 0, 0], hipL: [-0.6, 0, 0.15], knL: [0.9, 0, 0], hipR: [0.4, 0, -0.3], knR: [0.6, 0, 0], weapon: [1.6, 0, 0.3] };
    const KAMAE = { hipsY: -0.12, spine: [0.08, -0.2, 0], chest: [0.1, -0.15, 0], head: [0.15, 0.2, 0], shR: [-0.7, 0, 0.6], elR: [-1.1, 0, 0], shL: [-0.3, 0, 0.3], elL: [-0.8, 0, 0], hipL: [-0.45, 0, 0.15], knL: [0.55, 0, 0], hipR: [0.3, 0, -0.2], knR: [0.45, 0, 0], weapon: [1.4, 0, 0] };
    const SEIZA = { hipsY: -0.62, spine: [0.05, 0, 0], chest: [0.05, 0, 0], head: [0.35, 0, 0], shR: [0.1, 0, -0.1], elR: [-0.9, 0, 0], shL: [0.1, 0, 0.1], elL: [-0.9, 0, 0], hipL: [-1.55, 0, 0.1], knL: [2.6, 0, 0], hipR: [-1.55, 0, -0.1], knR: [2.6, 0, 0] };
    if (a === 'stance') return { p: IAI };
    if (a === 'kamae') return { p: { ...KAMAE, head: [0.15 + Math.sin(this.time * 0.8) * 0.01, 0.2, 0] } };
    if (a === 'drawn') return { p: DRAWN, key: 'drawn' };
    if (a === 'sheathe') { const k = ease(clamp01(t / 0.8)); return { p: mix(DRAWN, { ...STILL, shR: [-0.5, 0, 0.55], elR: [-1.0, 0, 0], head: [0.25, 0, 0], weapon: [1.4, 0, 0] }, k), key: 'sheathe' }; }
    if (a === 'iaido') { const q = ph({ windup: 0.5, active: 0.58, dur: 1.6 }); return { p: q.part === 'windup' ? IAI : DRAWN, snap: q.part !== 'windup', key: 'iaido' + (q.part === 'windup' ? 0 : 1) }; }
    if (a === 'kneel') return { p: SEIZA };
    if (a === 'idle' || a === 'walk' || a === 'run') return { p: st === 'iai' ? IAI : { ...STILL, head: [0.2, 0, 0] }, key: 'still' };
    return null;
  }
  after(e) {
    const out = !!e.drawn || e.anim === 'drawn' || e.anim === 'iaido' && e.state !== 'windup' || (e.anim === 'sheathe' && e.animT < 0.7) || e.anim === 'counter' || (e.atk && e.state === 'attack');
    this.weapon.visible = out; this.hilt.visible = !out;
  }
}

// ------------------------------------------------------------------ the Smiling Guest (and its masks)
// A black frock coat with long tails, white gloves on long hands, a tall hat, a face like a white plate with
// two pin-point eyes and a smile too wide for it (it glows, so the dark never hides it). Watched, it stands
// with its head tilted; unwatched, it is caught in held frames, a different wrong pose at every stride.
const HELD = [
  { ...STILL, head: [0.1, 0.2, 0.5], shR: [-1.4, 0, -0.3], elR: [-0.3, 0, 0], shL: [0.2, 0, 0.3], hipR: [-0.5, 0, 0], knR: [0.6, 0, 0], chest: [0.2, 0, 0.1] },
  { ...STILL, head: [0.4, -0.2, -0.6], shR: [0.3, 0, -0.4], shL: [-1.6, 0, 0.6], elL: [-0.5, 0, 0], hipL: [-0.6, 0, 0], knL: [0.7, 0, 0], chest: [0.35, 0, -0.1], spine: [0.2, 0, 0] },
  { ...STILL, head: [-0.3, 0, 0.4], shR: [-0.6, 0, -1.1], shL: [-0.6, 0, 1.1], elR: [-0.6, 0, 0], elL: [-0.6, 0, 0], hipsY: -0.15, knL: [0.5, 0, 0], knR: [0.5, 0, 0] },
  { ...STILL, head: [0.6, 0.5, 0.3], chest: [0.6, 0, 0], spine: [0.3, 0, 0], shR: [-1.9, 0, -0.1], shL: [-1.9, 0, 0.1], elR: [-0.2, 0, 0], elL: [-0.2, 0, 0], hipR: [0.3, 0, 0], hipL: [-0.4, 0, 0], knL: [0.3, 0, 0] },
];
const SMILE = { ...STILL, head: [0.1, 0, 0.42], shL: [0.02, 0, 0.05], shR: [0.02, 0, -0.05], elL: [-0.05, 0, 0], elR: [-0.05, 0, 0] };
function grin(rig, hs, teeth, mouth, eyes, real = true) {
  const face = hs / 2 + 0.02;
  rig._part('head', new THREE.BoxGeometry(hs * 1.0, hs * 0.98, 0.02), 0xf4f1ea, 0, hs * 0.5, face - 0.005, { emissive: 0x302e2a });
  // a smile far too wide for the face: it runs past both cheeks and turns up at the ends
  rig._part('head', new THREE.BoxGeometry(hs * 1.34, 0.075, 0.03), mouth, 0, hs * 0.28, face + 0.006);
  rig._part('head', new THREE.BoxGeometry(hs * 1.26, 0.05, 0.03), teeth, 0, hs * 0.28, face + 0.014, { glow: 3.4 });
  for (let i = -5; i <= 5; i++) rig._part('head', new THREE.BoxGeometry(0.006, 0.05, 0.035), mouth, i * hs * 0.11, hs * 0.28, face + 0.018);
  for (const sx of [-1, 1]) { rig._part('head', new THREE.BoxGeometry(0.07, 0.04, 0.03), teeth, sx * hs * 0.66, hs * 0.36, face + 0.01, { glow: 3.4, rz: sx * 0.7 }); rig._part('head', new THREE.BoxGeometry(0.036, 0.036, 0.02), eyes, sx * hs * 0.2, hs * 0.64, face + 0.012, { glow: real ? 6 : 3.5 }); }
}
class Guest extends PosedRig {
  constructor(look) {
    super({ ...look, eyes: null }); const Cc = look.colors; const hs = look.headSize || 0.27;
    grin(this, hs, Cc.teeth, Cc.mouth, look.eyes || 0xffffff);
    this._part('head', new THREE.BoxGeometry(hs * 0.9, 0.3, hs * 0.9), 0x0a0a0c, 0, hs + 0.16, 0); this._part('head', new THREE.BoxGeometry(hs + 0.16, 0.025, hs + 0.16), 0x0a0a0c, 0, hs + 0.01, 0); // the tall hat
    this._part('head', new THREE.BoxGeometry(hs * 0.92, 0.04, hs * 0.92), 0x5a0a10, 0, hs + 0.05, 0);
    for (const sx of [-1, 1]) { this._part('hips', new THREE.BoxGeometry(0.13, 0.62, 0.05), Cc.tunic, sx * 0.08, -0.34, -0.13, { rx: 0.12 }); } // the coat-tails
    this._part('chest', new THREE.BoxGeometry(0.1, 0.24, 0.02), Cc.trim, 0, 0.16, 0.115); // the white shirt front
    this._part('chest', new THREE.BoxGeometry(0.06, 0.04, 0.03), 0x0a0a0c, 0, 0.27, 0.125); // the bow tie
    for (const side of ['L', 'R']) { for (let k = -1; k <= 1; k++) this._part('ha' + side, new THREE.BoxGeometry(0.022, 0.26, 0.022), Cc.glove, k * 0.028, -0.17, 0.01); } // long white fingers
    this.reachK = 0;
  }
  own(e, t) {
    const a = e.anim;
    if (a === 'smile' || ((a === 'idle' || a === 'walk') && e.watched)) return { p: { ...SMILE, head: [0.1, 0, 0.42 + Math.sin(this.time * 0.4) * 0.02] }, key: 'smile' };
    if (a === 'held' || a === 'walk' || a === 'idle') { const f = (e.frame || 0) % HELD.length; return { p: HELD[f], snap: true, key: 'held' + f }; }
    if (a === 'grab') { const q = atkPh(e, t, { windup: 0.5, active: 0.62, dur: 1.35 }); const k = q.part === 'windup' ? q.k : 1; return { p: { ...STILL, chest: [0.45 * k, 0, 0], head: [-0.2, 0, 0.3], shR: [-1.6 * k, 0, -0.5 + 0.3 * k], shL: [-1.6 * k, 0, 0.5 - 0.3 * k], elR: [-0.4 * (1 - k), 0, 0], elL: [-0.4 * (1 - k), 0, 0], hipL: [-0.5 * k, 0, 0], knL: [0.4 * k, 0, 0] }, snap: q.part === 'strike', key: 'grab' + q.part }; }
    if (a === 'reach') { const q = atkPh(e, t, { windup: 0.7, active: 0.8, dur: 1.5 }); return { p: { ...SMILE, chest: [0.2, -0.2, 0], shR: [-1.55, 0, 0], elR: [0, 0, 0], head: [0, -0.2, 0.42] }, key: 'reach' }; }
    if (a === 'laugh') return { p: { ...STILL, head: [-0.5 + Math.sin(this.time * 24) * 0.08, 0, 0.2], chest: [-0.2, 0, Math.sin(this.time * 24) * 0.05], shR: [-0.2, 0, -0.6], shL: [-0.2, 0, 0.6], elR: [-1.2, 0, 0], elL: [-1.2, 0, 0] }, key: 'laugh' };
    if (a === 'bow') { const k = ease(clamp01(t / 0.5)) * (t > 0.7 ? Math.max(0, 1 - (t - 0.7) / 0.3) : 1); return { p: { ...STILL, spine: [0.4 * k, 0, 0], chest: [0.6 * k, 0, 0], head: [0.3 * k, 0, 0.3], shR: [-0.9 * k, 0, 0.6 * k], elR: [-1.3 * k, 0, 0], shL: [0.4 * k, 0, 0.3], hipR: [0.15 * k, 0, 0] }, key: 'bow' }; }
    return null;
  }
  after(e) {
    // its arm stretches the length of the square as it reaches (the forearm grows)
    let want = 1; if (e.anim === 'reach' && e.atk) { const q = atkPh(e, e.animT, e.atk); want = q.part === 'windup' ? 1 + 0.6 * q.k : (q.part === 'strike' ? 4.2 : 4.2 - 3.2 * q.k); }
    this.reachK += (want - this.reachK) * 0.5; this.j.elR.scale.set(1, this.reachK, 1); this.j.shR.scale.set(1, Math.min(2.2, 1 + (this.reachK - 1) * 0.4), 1);
  }
}
// a mask: the warden's own shape (look.base), dark-clad, wearing the Guest's smile
class GuestMask extends Guest {
  constructor(look) {
    const base = look.base || look; const hs = base.headSize || 0.24;
    super({ ...base, headSize: hs, colors: { ...base.colors, ...(look.colors || {}), teeth: 0xffffff, mouth: 0x3a0a0e, tunic: 0x141216, cloak: 0x1a181c, cloakDark: 0x121014, glove: 0xf0ece4, trim: 0x2a2a2e }, eyes: look.real ? 0xffffff : 0xff2a2a, noHair: base.noHair, hood: false });
  }
}

// ------------------------------------------------------------------ the Pyre Saint
// A charred figure in white robes burnt to ash at the hem, the beam she was bound to across her shoulders,
// broken irons on her wrists trailing chain, a crown of fire and a halo of flame turning behind her head.
class Saint extends PosedRig {
  constructor(look) {
    super(look); const Cc = look.colors; const hs = look.headSize || 0.24;
    this._part('chest', new THREE.BoxGeometry(1.7, 0.11, 0.11), Cc.wood, 0, 0.28, -0.16); // the beam
    this._part('chest', new THREE.BoxGeometry(0.12, 0.9, 0.1), Cc.wood, 0, 0.0, -0.17);
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) this._part('chest', new THREE.BoxGeometry(0.05, 0.06, 0.06), Cc.ember, sx * (0.3 + i * 0.25), 0.33, -0.12, { glow: 2.4 }); // the beam still smoulders
    for (const side of ['L', 'R']) { this._part('ha' + side, new THREE.BoxGeometry(0.14, 0.08, 0.14), Cc.iron, 0, 0.03, 0); for (let i = 0; i < 3; i++) this._part('ha' + side, new THREE.BoxGeometry(i % 2 ? 0.02 : 0.05, 0.06, i % 2 ? 0.05 : 0.02), Cc.iron, 0, -0.06 - i * 0.06, 0); }
    this.halo = new THREE.Group(); this.halo.position.set(0, hs * 0.55, -0.12); this.j.head.add(this.halo);
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12 + (i % 2) * 0.06, 0.03), glowMat(i % 3 ? 0xff8a20 : 0xffd060, 3)); m.position.set(S(a) * 0.3, C(a) * 0.3, 0); m.rotation.z = -a; this.halo.add(m); }
    for (let i = -2; i <= 2; i++) this._part('head', new THREE.BoxGeometry(0.04, 0.1 + (2 - Math.abs(i)) * 0.05, 0.04), 0xffa030, i * 0.055, hs + 0.06, 0.02, { glow: 3.2 }); // the crown of fire
    if (this.skirt) for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; this._part('hips', new THREE.BoxGeometry(0.1, 0.08, 0.04), i % 2 ? Cc.ash : Cc.ember, S(a) * 0.2, -0.52, C(a) * 0.13, { glow: i % 2 ? 0 : 2 }); } // the burnt hem
  }
  own(e, t) {
    const a = e.anim; const fl = Math.sin(this.time * 1.7) * 0.05;
    const CROSS = { hipsY: 0, chest: [-0.12, 0, 0], spine: [0, 0, 0], head: [-0.35, 0, 0], shL: [0, 0, 1.55], elL: [0, 0, 0], shR: [0, 0, -1.55], elR: [0, 0, 0], hipL: [0.15, 0, 0.02], knL: [0.25, 0, 0], hipR: [0.15, 0, -0.02], knR: [0.25, 0, 0], bodyY: 0.3 + fl };
    const BOWED = { ...CROSS, head: [0.55, 0, 0.1], chest: [0.15, 0, 0], shL: [0.15, 0, 1.0], shR: [0.15, 0, -1.0], elL: [-0.3, 0, 0], elR: [-0.3, 0, 0], bodyY: 0.35 + fl };
    if (a === 'cross' || e.crossed) return { p: CROSS, key: 'cross' };
    if (a === 'pillar') return { p: { ...CROSS, head: [-0.6, 0, 0], shL: [-2.6, 0, 0.4], shR: [-2.6, 0, -0.4], bodyY: 0.5 + fl }, key: 'pillar' };
    if (a === 'pray') { const q = atkPh(e, t, { windup: 0.7, active: 0.72, dur: 1.8 }); return { p: q.part === 'windup' ? { ...BOWED, shL: [-1.2, 0, 0.3], shR: [-1.2, 0, -0.3], elL: [-1.2, 0, 0], elR: [-1.2, 0, 0], head: [0.6, 0, 0] } : { ...CROSS, head: [-0.5, 0, 0] }, key: 'pray' + (q.part === 'windup') }; }
    if (a === 'flare') { const q = atkPh(e, t, { windup: 0.75, active: 0.88, dur: 1.4 }); return { p: q.part === 'windup' ? { ...BOWED, shL: [0.3, 0, 0.4], shR: [0.3, 0, -0.4], head: [0.7, 0, 0], bodyY: 0.2 } : { ...CROSS, shL: [0, 0, 1.9], shR: [0, 0, -1.9], head: [-0.6, 0, 0] }, key: 'flare' + (q.part === 'windup') }; }
    if (a === 'idle' || a === 'walk' || a === 'run') return { p: BOWED, key: 'bowed' };
    return null;
  }
  after(e, t, dt) { this.halo.rotation.z += dt * (e.pillar ? 6 : 1.2); const s = e.crossed || e.pillar ? 1.5 : 1; this.halo.scale.setScalar(this.halo.scale.x + (s - this.halo.scale.x) * Math.min(1, dt * 6)); }
}

// look.rig names one of these; null: not a body of this file
export function makeBeast4(look) {
  switch (look.rig) {
    case 'kingcrab': return new KingCrab(look);
    case 'hollowmother': return new HollowMother(look);
    case 'ronin': return new Ronin(look);
    case 'guest': return new Guest(look);
    case 'guestmask': return new GuestMask(look);
    case 'saint': return new Saint(look);
  }
  return null;
}
