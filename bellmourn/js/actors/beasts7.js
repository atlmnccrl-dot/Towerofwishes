// Act VI's bodies (js/game/bosses8.js): God, the Voice, and the two living bells He summons.
// Same building blocks as the other beasts (a few lit boxes per joint, glowing parts), facing +Z.
// e.form (0..1 in His arrival) fades Him in; e.crownK and e.wingK open the crown of rays and the six wings.
//
// PROPOSAL: every look described here.
import { Beast, clamp01 } from './beasts2.js';

const TAU = Math.PI * 2, S = Math.sin, C = Math.cos;

// ------------------------------------------------------------------ God: a floating figure of light
// A robe of white light flaring at the hem into the mouth of a cracked bronze bell, light pouring from the crack;
// bronze gauntlets, a breastplate with a sun; an oval of light where a face should be; a crown of bronze rays;
// six wings of light folded behind.
class God extends Beast {
  constructor(look) {
    super(look); this.look = look; const Cc = look.colors; this.baseY = 0.9;
    this.joint('base', null, 0, this.baseY, 0);
    // the bell of the hem: rings widening downwards, a crack of light up the front
    for (let i = 0; i < 4; i++) { const w = 0.62 - i * 0.1; this.part('base', w, 0.16, w, Cc.bronze, 0, -0.32 + i * 0.16, 0); }
    this.part('base', 0.7, 0.05, 0.7, Cc.dark, 0, -0.41, 0);
    this.part('base', 0.04, 0.5, 0.02, Cc.sun, 0.06, -0.15, 0.33, { glow: 3.5, rz: 0.2 });
    // the robe of light above the bell
    this.joint('chest', 'base', 0, 0.3, 0);
    this.part('chest', 0.36, 0.5, 0.26, Cc.robe, 0, 0.1, 0);
    this.part('chest', 0.38, 0.06, 0.28, Cc.dark, 0, -0.14, 0); this.part('chest', 0.06, 0.5, 0.27, Cc.bronze, 0, 0.1, 0); // a dark belt, a bronze stole: He reads against the white of heaven
    this.part('chest', 0.3, 0.26, 0.04, Cc.bronze, 0, 0.18, 0.14);
    this.part('chest', 0.12, 0.12, 0.03, Cc.sun, 0, 0.18, 0.165, { glow: 3 });
    this.joint('head', 'chest', 0, 0.48, 0);
    this.part('head', 0.24, 0.3, 0.2, Cc.dark, 0, 0.06, -0.02); this.face = this.part('head', 0.18, 0.24, 0.04, Cc.face, 0, 0.06, 0.09, { glow: 2.0 }); // a hood of bronze, the oval of light inside
    // the crown of rays
    this.crown = this.joint('crown', 'head', 0, 0.08, -0.08);
    for (let i = 0; i < 11; i++) { const a = (i - 5) / 5 * 1.25; const L = i % 2 ? 0.2 : 0.32; this.part('crown', 0.035, L, 0.03, Cc.gold, S(a) * (0.17 + L / 2), C(a) * (0.17 + L / 2), 0, { glow: 2, rz: -a }); }
    // the sun behind Him: a great disc of slats of light round His head, turning slowly
    this.sun = this.joint('sun', 'head', 0, 0.1, -0.2);
    for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; this.part('sun', 0.1, 0.36, 0.03, Cc.sun, S(a) * 0.62, C(a) * 0.62, 0, { glow: 2.6, rz: -a }); }
    for (let i = 0; i < 18; i++) { const a = (i + 0.5) / 18 * TAU; this.part('sun', 0.05, 0.18, 0.03, Cc.gold, S(a) * 0.48, C(a) * 0.48, 0, { glow: 1.8, rz: -a }); }
    // arms: bronze gauntlets
    for (const [n, sx] of [['shL', 1], ['shR', -1]]) {
      this.joint(n, 'chest', sx * 0.24, 0.28, 0);
      this.part(n, 0.12, 0.34, 0.12, Cc.robe, 0, -0.17, 0);
      this.joint(n + 'f', n, 0, -0.34, 0);
      this.part(n + 'f', 0.13, 0.3, 0.13, Cc.bronze, 0, -0.14, 0);
      this.part(n + 'f', 0.15, 0.1, 0.15, Cc.gold, 0, -0.32, 0.02, { glow: 1.5 });
    }
    // six wings of light, three a side
    this.wings = [];
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) {
      const n = 'w' + sx + i; this.joint(n, 'chest', sx * 0.12, 0.3 - i * 0.12, -0.16);
      for (let k = 0; k < 4; k++) this.part(n, 0.06, 0.05, 0.18, Cc.light, sx * (0.12 + k * 0.17), k * 0.03, 0, { glow: 0.7 + k * 0.25 });
      this.wings.push({ n, sx, i });
    }
    this.j.shRf.add(this.hand); this.hand.position.set(0, -0.32, 0.05); this.j.shRf.add(this.tip); this.tip.position.set(0, -0.4, 0.1);
  }
  animate(e, t, dt) {
    this.time += dt; const tm = this.time; const a = e.anim; const ph = this.atkPhase(e, t, e.atk || { windup: 0.8, active: 0.85, dur: 1.4 });
    const wk = e.wingK ?? 1, ck = e.crownK ?? 1; let up = 0.15, armL = [0.1, 0, 0.15], armR = [0.1, 0, -0.15], lean = 0, spread = 0.3 + 0.9 * wk;
    if (a === 'cast' || a === 'judge' || a === 'raise') { const k = ph.part === 'windup' ? ph.k : 1; armR = [-2.4 * k, 0, -0.3]; if (a !== 'judge') armL = [-2.4 * k, 0, 0.3]; spread += 0.4 * k; up += 0.2 * k; }
    else if (a === 'toll' || a === 'roar') { const k = ph.part === 'windup' ? ph.k : 1 - (ph.part === 'recover' ? ph.k : 0); armL = [-0.6, 0, 1.2 * k]; armR = [-0.6, 0, -1.2 * k]; lean = -0.15 * k; spread += 0.6 * k; }
    else if (a === 'pull' || a === 'eclipse') { armL = [-1.4, 0, 0.6]; armR = [-1.4, 0, -0.6]; lean = 0.15; }
    else if (a === 'stagger' || a === 'hurt') { lean = -0.35; up = -0.1; spread = 0.2; }
    else if (a === 'die' || a === 'dieHard') { const k = clamp01(t / 2.5); lean = -0.5 * k; up = -0.6 * k; spread = 0.3 * (1 - k); }
    else if (a === 'glide') lean = 0.2;
    this.pose({ lift: up + S(tm * 1.4) * 0.08, pitch: lean, roll: S(tm * 0.9) * 0.03, shL: armL, shR: armR, shLf: [-0.4, 0, 0], shRf: [-0.4, 0, 0] }, dt, 6);
    for (const wg of this.wings) { const j = this.j[wg.n]; j.rotation.y = wg.sx * (-0.4 - spread * (0.5 + wg.i * 0.25)) + S(tm * 2 + wg.i) * 0.05; j.rotation.z = wg.sx * (0.3 - wg.i * 0.35) * wk; j.scale.setScalar(Math.max(0.01, wk)); }
    this.crown.scale.setScalar(Math.max(0.01, ck)); this.crown.rotation.z = S(tm * 0.6) * 0.05;
    this.sun.scale.setScalar(Math.max(0.01, ck) * (1 + 0.05 * S(tm * 2))); this.sun.rotation.z = tm * 0.15;
    this.face.scale.setScalar(1 + 0.06 * S(tm * 3));
    const vis = e.entering ? clamp01(e.form ?? 1) : 1; // He fades in during His arrival only this.body.scale.setScalar(Math.max(0.01, (this.look.scale || 1) * (0.6 + 0.4 * vis)));
  }
}

// ------------------------------------------------------------------ a living bell (dawn: gold and fire; dusk: iron and void)
class LivingBell extends Beast {
  constructor(look, dusk) {
    super(look); const Cc = look.colors; this.baseY = 0.1; this.dusk = dusk;
    this.joint('base', null, 0, this.baseY, 0);
    this.joint('body', 'base', 0, 0.9, 0);
    // the bell: a shoulder, a waist, a flaring lip; the mouth glowing inside
    const rings = [[0.5, 0.12, 0.62], [0.62, 0.3, 0.42], [0.76, 0.3, 0.14], [0.92, 0.14, -0.08]];
    for (const [w, h, y] of rings) this.part('body', w, h, w, Cc.metal, 0, y, 0);
    this.part('body', 0.96, 0.05, 0.96, Cc.rim, 0, -0.16, 0, { glow: 0.6 });
    this.mouth = this.part('body', 0.8, 0.04, 0.8, dusk ? Cc.void : Cc.fire, 0, -0.19, 0, { glow: 3 });
    this.part('body', 0.2, 0.2, 0.04, dusk ? Cc.light : Cc.light, 0, 0.42, 0.25, { glow: dusk ? 1.2 : 2.2 }); // the sun or the moon in relief
    for (const sx of [-1, 1]) this.part('body', 0.08, 0.04, 0.03, look.eyes, sx * 0.13, 0.2, 0.33, { glow: 6 });
    // the crown: rays (dawn) or chains (dusk)
    this.joint('crown', 'body', 0, 0.72, 0);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; this.part('crown', 0.05, dusk ? 0.4 : 0.22, 0.05, dusk ? Cc.rim : Cc.light, S(a) * 0.22, dusk ? -0.15 : 0.08, C(a) * 0.22, dusk ? {} : { glow: 2 }); }
    // the clapper swinging in the mouth: a tongue of flame or a weight of void
    this.joint('clap', 'body', 0, 0.3, 0);
    this.part('clap', 0.06, 0.5, 0.06, Cc.dark, 0, -0.3, 0);
    this.part('clap', 0.18, 0.18, 0.18, Cc.core, 0, -0.6, 0, { glow: 3 });
    this.j.body.add(this.hand); this.hand.position.set(0, -0.2, 0.3); this.j.body.add(this.tip); this.tip.position.set(0, -0.2, 0.5);
  }
  animate(e, t, dt) {
    this.time += dt; const tm = this.time; const a = e.anim; const ph = this.atkPhase(e, t, e.atk || { windup: 0.7, active: 0.75, dur: 1.3 });
    let lift = 0.15 + S(tm * 2.2) * 0.08, roll = S(tm * 1.7) * 0.06, pitch = 0, swing = S(tm * 3) * 0.3, squash = 1;
    if (a === 'toll' || a === 'cast') { const k = ph.part === 'windup' ? ph.k : 1 - (ph.part === 'recover' ? ph.k : 0); roll = S(tm * 14) * 0.25 * k; swing = S(tm * 18) * 1.0 * k; lift += 0.3 * k; }
    else if (a === 'leap') { const k = ph.part === 'windup' ? ph.k : 0; lift = ph.part === 'strike' ? 1.6 : 0.1 + k * 0.4; squash = ph.part === 'windup' ? 1 - 0.2 * k : 1; }
    else if (a === 'roll') { pitch = (tm * 9) % TAU; lift = 0.4; }
    else if (a === 'pull' || a === 'eclipse') { roll = S(tm * 8) * 0.15; swing = S(tm * 10) * 0.6; }
    else if (a === 'stagger' || a === 'hurt') { roll = 0.5; lift = 0; }
    else if (a === 'die' || a === 'dieHard') { const k = clamp01(t / 1.2); roll = 1.4 * k; lift = 0.1 - 0.5 * k; }
    this.pose({ lift, roll, pitch }, dt, a === 'roll' ? 30 : 8);
    this.j.clap.rotation.z = swing; this.j.body.scale.set(1, squash, 1);
    this.j.crown.rotation.y = tm * (this.dusk ? -0.6 : 0.8);
    this.mouth.scale.setScalar(0.9 + 0.12 * S(tm * (this.dusk ? 4 : 9)));
  }
}

// look.rig names one of these; null: not a body of this file
export function makeBeast7(look) {
  switch (look.rig) {
    case 'god': return new God(look);
    case 'dawnbell': return new LivingBell(look, false);
    case 'duskbell': return new LivingBell(look, true);
  }
  return null;
}
