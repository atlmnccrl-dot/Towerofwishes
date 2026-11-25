// The marked things an interlude asks the warden to destroy (game/interlude.js targets): lock-chains, candle
// totems, heaps of bone, small bells, bell totems, mirrors, lanterns, eggs, anchors, moulds of bronze. Each is a
// still body built of boxes with a gold marker over it (a turning diamond and a beam) and a glowing ring at
// its foot, so it reads at a glance as "hit this". It shakes when struck and bursts apart when it breaks.
// Same surface as the other beasts (beasts2.js Beast): the view poses it through animate(e, t, dt).
// Looks and names: PROPOSAL, for the author.
import * as THREE from '../../vendor/three.module.min.js';
import { Beast, clamp01, ease } from './beasts2.js';

const TAU = Math.PI * 2, S = Math.sin, C = Math.cos;
const GOLD = 0xffc860;

class Mark extends Beast {
  constructor(look) {
    super(look); this.baseY = 0; this.kind = look.kind || 'totem';
    this.joint('base', null, 0, 0, 0); this.joint('obj', 'base', 0, 0, 0); this.joint('mk', 'base', 0, 0, 0);
    const P = (j, w, h, d, c, x, y, z, o) => this.part(j, w, h, d, c, x, y, z, o);
    const k = this.kind; const glowC = look.color || ({ candle: 0xffb040, chain: 0xff8a40, bone: 0xc8ff90, bell: 0xa8e8ff, mirror: 0xd8c8ff, lantern: 0xffd070, egg: 0xff6050, anchor: 0x70f0e0, mould: 0xff7a20 })[k] || GOLD;
    this.glowC = glowC;
    if (k === 'chain') { // an iron post in the stones, a chain to the bars and a padlock that glows at its heart
      P('obj', 0.22, 1.5, 0.22, 0x2a2622, 0, 0.75, 0); P('obj', 0.34, 0.12, 0.34, 0x3a342c, 0, 1.5, 0); P('obj', 0.4, 0.1, 0.4, 0x1a1816, 0, 0.05, 0);
      for (let i = 0; i < 7; i++) P('obj', i % 2 ? 0.05 : 0.12, i % 2 ? 0.12 : 0.05, 0.08, 0x5a5048, 0, 1.36 - i * 0.02, 0.18 + i * 0.13, { rx: -0.25 });
      P('obj', 0.26, 0.28, 0.12, 0x6a4a28, 0, 0.95, 0.15); P('obj', 0.16, 0.12, 0.05, 0x3a3a3a, 0, 1.13, 0.15); P('obj', 0.06, 0.08, 0.04, glowC, 0, 0.92, 0.22, { glow: 3 });
    } else if (k === 'candle') { // a totem of wax: three tiers of candles round a pillar, every wick lit
      P('obj', 0.5, 0.18, 0.5, 0xd8c8a0, 0, 0.09, 0); P('obj', 0.3, 1.1, 0.3, 0xe8dcc0, 0, 0.7, 0);
      for (let r = 0; r < 3; r++) for (let i = 0; i < 5; i++) { const a = (i + r * 0.4) / 5 * TAU, R = 0.24 - r * 0.05, y = 0.25 + r * 0.42, h = 0.18 + (i % 2) * 0.08;
        P('obj', 0.07, h, 0.07, 0xf0e4c8, S(a) * R, y + h / 2, C(a) * R); P('obj', 0.05, 0.08, 0.05, glowC, S(a) * R, y + h + 0.05, C(a) * R, { glow: 3.4 }); }
      P('obj', 0.1, 0.16, 0.1, glowC, 0, 1.34, 0, { glow: 3.6 });
      for (let i = 0; i < 6; i++) P('obj', 0.05, 0.15 + (i % 3) * 0.06, 0.05, 0xd8c8a0, S(i) * 0.16, 0.85 - (i % 3) * 0.1, C(i) * 0.16);
    } else if (k === 'bone') { // a heap of bones crawling together round a skull, lit green from inside
      P('obj', 0.6, 0.16, 0.5, 0xd8d0bc, 0, 0.08, 0); P('obj', 0.26, 0.24, 0.26, 0xe8e2d0, 0, 0.32, 0); P('obj', 0.2, 0.06, 0.06, 0x1a1414, 0, 0.27, 0.13);
      for (const sx of [-1, 1]) P('obj', 0.06, 0.05, 0.03, glowC, sx * 0.06, 0.35, 0.13, { glow: 3 });
      for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; P('obj', 0.06, 0.06, 0.5, 0xc8c0a8, S(a) * 0.28, 0.12 + (i % 2) * 0.08, C(a) * 0.22, { ry: a + 0.6, rx: 0.2 }); }
      for (let i = 0; i < 4; i++) P('obj', 0.04, 0.04, 0.04, glowC, S(i * 1.7) * 0.2, 0.2 + i * 0.05, C(i * 1.7) * 0.2, { glow: 2.4 });
    } else if (k === 'bell' || k === 'totem') { // a small bell on a frame of black wood (the totem: a stack of three bells on a post)
      const n = k === 'totem' ? 3 : 1; P('obj', 0.12, k === 'totem' ? 1.8 : 1.3, 0.12, 0x2a2018, 0, k === 'totem' ? 0.9 : 0.65, -0.12);
      if (k === 'bell') { P('obj', 0.8, 0.1, 0.1, 0x2a2018, 0, 1.3, -0.12); for (const sx of [-1, 1]) P('obj', 0.1, 1.3, 0.1, 0x2a2018, sx * 0.36, 0.65, -0.12); }
      for (let i = 0; i < n; i++) { const y = k === 'totem' ? 0.5 + i * 0.5 : 0.82; const s = k === 'totem' ? 1 - i * 0.15 : 1.2;
        P('obj', 0.22 * s, 0.1 * s, 0.22 * s, 0x8a6a30, 0, y + 0.12 * s, 0); P('obj', 0.3 * s, 0.2 * s, 0.3 * s, 0xa07a38, 0, y, 0); P('obj', 0.38 * s, 0.06 * s, 0.38 * s, 0xb88a40, 0, y - 0.12 * s, 0);
        P('obj', 0.06, 0.06, 0.06, glowC, 0, y - 0.18 * s, 0, { glow: 3 }); }
    } else if (k === 'mirror') { // a tall glass in a gilt frame, a pale face in it
      P('obj', 0.7, 1.5, 0.08, 0x8a7030, 0, 0.85, 0); P('obj', 0.56, 1.3, 0.04, glowC, 0, 0.85, 0.04, { glow: 1.6 }); P('obj', 0.4, 0.12, 0.3, 0x4a3a20, 0, 0.06, 0);
      P('obj', 0.16, 0.2, 0.02, 0xf0f0f8, 0, 1.15, 0.07, { glow: 2.2 }); for (const sx of [-1, 1]) P('obj', 0.03, 0.03, 0.02, 0x101018, sx * 0.04, 1.18, 0.08);
    } else if (k === 'lantern' || k === 'egg') {
      if (k === 'lantern') { P('obj', 0.08, 1.4, 0.08, 0x2a2622, 0, 0.7, 0); P('obj', 0.34, 0.4, 0.34, 0x3a342c, 0, 1.45, 0); P('obj', 0.24, 0.3, 0.24, glowC, 0, 1.45, 0, { glow: 3 }); P('obj', 0.4, 0.06, 0.4, 0x2a2622, 0, 1.68, 0); }
      else { P('obj', 0.5, 0.6, 0.5, 0x5a2a2a, 0, 0.35, 0); P('obj', 0.36, 0.3, 0.36, 0x6a3434, 0, 0.75, 0); for (let i = 0; i < 5; i++) P('obj', 0.04, 0.3, 0.02, glowC, S(i * 1.3) * 0.25, 0.4, C(i * 1.3) * 0.25, { glow: 2.4, ry: i * 1.3 }); }
    } else if (k === 'anchor') { // a drowned anchor stood on its crown, kelp hanging, the sea glowing in its eye
      P('obj', 0.16, 1.6, 0.16, 0x3a4a48, 0, 0.8, 0); P('obj', 1.0, 0.14, 0.16, 0x3a4a48, 0, 0.2, 0); for (const sx of [-1, 1]) P('obj', 0.14, 0.4, 0.16, 0x3a4a48, sx * 0.48, 0.36, 0, { rz: sx * 0.4 });
      P('obj', 0.5, 0.1, 0.12, 0x3a4a48, 0, 1.4, 0); P('obj', 0.26, 0.26, 0.06, 0x2a3836, 0, 1.68, 0); P('obj', 0.12, 0.12, 0.08, glowC, 0, 1.68, 0, { glow: 3 });
      for (let i = 0; i < 4; i++) P('obj', 0.04, 0.4, 0.04, 0x2a5a3a, -0.1 + i * 0.07, 1.1 - (i % 2) * 0.1, 0.1);
    } else if (k === 'mould') { // a mould of bronze still glowing from the pour, its gate smoking
      P('obj', 0.7, 0.9, 0.7, 0x3a2a20, 0, 0.45, 0); P('obj', 0.5, 0.1, 0.5, 0x2a1e18, 0, 0.92, 0); P('obj', 0.3, 0.06, 0.3, glowC, 0, 0.98, 0, { glow: 3.2 });
      for (let i = 0; i < 4; i++) P('obj', 0.04, 0.6, 0.02, glowC, (i - 1.5) * 0.16, 0.45, 0.36, { glow: 2.2 });
    } else { P('obj', 0.4, 1.2, 0.4, 0x3a342c, 0, 0.6, 0); P('obj', 0.2, 0.2, 0.2, glowC, 0, 1.3, 0, { glow: 3 }); }
    // the marker: a turning diamond high over it, a thin beam, a ring at its foot
    this.top = (k === 'bone' || k === 'egg' || k === 'mould') ? 1.5 : 2.3;
    this.dia = new THREE.Group(); this.j.mk.add(this.dia); this.dia.position.y = this.top;
    for (const [w, h, y] of [[0.08, 0.08, 0.16], [0.18, 0.08, 0.08], [0.26, 0.08, 0], [0.18, 0.08, -0.08], [0.08, 0.08, -0.16]]) this.part(this.dia, w, h, 0.06, GOLD, 0, y, 0, { glow: 3.2 });
    this.beam = this.part('mk', 0.04, this.top - 0.3, 0.04, GOLD, 0, (this.top - 0.3) / 2 + 0.1, 0, { glow: 1.2 });
    this.beam.material = this.beam.material.clone(); this.beam.material.transparent = true; this.beam.material.opacity = 0.35;
    const rm = new THREE.MeshBasicMaterial({ color: new THREE.Color(glowC).multiplyScalar(2.2), transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.68, 20), rm); this.ring.rotation.x = -Math.PI / 2; this.ring.position.y = 0.04; this.j.mk.add(this.ring);
    this.j.obj.add(this.hand); this.j.obj.add(this.tip); this.tip.position.set(0, 1, 0);
    this.born = 0;
  }
  animate(e, t, dt) {
    this.time += dt; this.born += dt; const tm = this.time; const anim = e.anim;
    const grow = ease(clamp01(this.born / 0.45));
    let sx = 0, roll = 0, s = grow;
    if (e.flash > 0) { sx = S(tm * 70) * 0.06; roll = S(tm * 55) * 0.08; }
    if (anim === 'die' || anim === 'dieHard') { const k = clamp01(t / 0.3); s = Math.max(0.01, 1 - k); this.j.mk.visible = false; }
    this.j.obj.position.x = sx; this.j.obj.rotation.z = roll; this.j.obj.scale.setScalar(s); this.j.obj.position.y = (1 - grow) * -0.6;
    const hp = e.maxHp ? e.hp / e.maxHp : 1;
    this.dia.rotation.y = tm * 2.4; this.dia.position.y = this.top + S(tm * 3) * 0.1; this.dia.scale.setScalar(grow * (0.9 + 0.2 * (1 - hp)));
    this.ring.scale.setScalar(1 + 0.12 * S(tm * 5)); this.ring.material.opacity = (0.4 + 0.3 * (0.5 + 0.5 * S(tm * 5))) * grow;
    this.beam.material.opacity = (0.22 + 0.15 * S(tm * 4)) * grow;
  }
}

export function makeMark(look) { return look && look.rig === 'imark' ? new Mark(look) : null; }
