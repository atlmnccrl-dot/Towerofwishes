// Low-poly articulated characters. At 16 px per metre a person is ~30 px tall, so a handful of boxes
// with the right proportions, colours and motion reads like hand-made pixel sprites, but every
// pose, swing and fall is free. Characters face +Z in local space; their right hand is -X.
import * as THREE from 'three';

const box = (() => { const c = new Map(); return (w, h, d) => { const k = `${w},${h},${d}`; if (!c.has(k)) c.set(k, new THREE.BoxGeometry(w, h, d)); return c.get(k); }; })();
const matCache = new Map();
export function mat(color, emissive = 0, ei = 1) {
  const k = color + ':' + emissive + ':' + ei;
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshLambertMaterial({ color, emissive, emissiveIntensity: ei }));
  return matCache.get(k);
}
function glowMat(color, k = 3) { const key = 'g' + color + k; if (!matCache.has(key)) matCache.set(key, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), fog: false })); return matCache.get(key); }

// Body plan, in metres, for a 1.8 m person. `s` scales everything.
const PLAN = {
  hips: [0, 0.92, 0], spine: [0, 0.1, 0], chest: [0, 0.22, 0], neck: [0, 0.3, 0], head: [0, 0.07, 0],
  shL: [0.21, 0.22, 0], elL: [0, -0.29, 0], haL: [0, -0.27, 0], shR: [-0.21, 0.22, 0], elR: [0, -0.29, 0], haR: [0, -0.27, 0],
  hipL: [0.1, -0.04, 0], knL: [0, -0.44, 0], ftL: [0, -0.42, 0], hipR: [-0.1, -0.04, 0], knR: [0, -0.44, 0], ftR: [0, -0.42, 0],
};
const PARENT = { hips: 'root', spine: 'hips', chest: 'spine', neck: 'chest', head: 'neck', shL: 'chest', elL: 'shL', haL: 'elL', shR: 'chest', elR: 'shR', haR: 'elR', hipL: 'hips', knL: 'hipL', ftL: 'knL', hipR: 'hips', knR: 'hipR', ftR: 'knR' };
export const JOINTS = Object.keys(PLAN);

export class Rig {
  constructor(def) {
    this.def = def; const s = def.scale || 1; this.s = s;
    this.root = new THREE.Group(); this.baseMats = new Map();
    this.body = new THREE.Group(); this.root.add(this.body); this.body.scale.setScalar(s);
    this.j = { root: this.body };
    for (const name of JOINTS) {
      const g = new THREE.Group(); const p = PLAN[name]; g.position.set(p[0], p[1], p[2]);
      this.j[PARENT[name]].add(g); this.j[name] = g;
    }
    this.flashMats = []; this.parts = [];
    this._dress(def);
    this.cloak = null; if (def.cloak) this._cloak(def);
    this.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
    this.pose = {}; this.cloakVel = 0; this.cloakAng = 0.15; this.time = Math.random() * 10;
    this.prevPos = new THREE.Vector3();
  }

  _part(joint, geom, color, x, y, z, opts = {}) {
    const m = new THREE.Mesh(geom, opts.material || (opts.glow ? glowMat(color, opts.glow) : mat(color, opts.emissive || 0, opts.ei || 1)));
    m.position.set(x, y, z); if (opts.rx) m.rotation.x = opts.rx; if (opts.ry) m.rotation.y = opts.ry; if (opts.rz) m.rotation.z = opts.rz;
    this.j[joint].add(m); this.parts.push(m); return m;
  }

  _dress(d) {
    const C = d.colors; const bulk = d.bulk || 1; const tw = 0.36 * bulk, td = 0.22 * bulk;
    // torso
    this._part('spine', box(tw * 0.92, 0.22, td), C.belt || C.tunic, 0, 0.04, 0);
    this._part('chest', box(tw, 0.34, td * 1.05), C.tunic, 0, 0.12, 0);
    if (C.trim) this._part('chest', box(tw * 0.25, 0.3, 0.02), C.trim, 0, 0.12, td * 0.53);
    this._part('hips', box(tw * 0.9, 0.16, td * 0.95), C.pants, 0, -0.02, 0);
    // head
    const hs = d.headSize || 0.24;
    if (!d.noHead) {
      this._part('head', box(hs, hs, hs), C.skin, 0, hs / 2, 0);
      if (C.hair && !d.noHair) { this._part('head', box(hs + 0.04, hs * 0.42, hs + 0.04), C.hair, 0, hs * 0.86, -0.01); this._part('head', box(hs + 0.04, hs * 0.75, 0.08), C.hair, 0, hs * 0.55, -hs / 2 - 0.02); if (d.longHair) this._part('head', box(hs * 0.9, 0.3, 0.07), C.hair, 0, 0.02, -hs / 2 - 0.04); }
      if (d.hood) { this._part('head', box(hs + 0.08, hs + 0.06, hs + 0.08), C.hood || C.cloak || C.tunic, 0, hs / 2 + 0.03, -0.03); this._part('head', box(hs * 0.8, hs * 0.55, 0.02), 0x050608, 0, hs * 0.48, hs / 2 + 0.03); }
      if (d.eyes) { for (const sx of [-1, 1]) this._part('head', box(0.075, 0.055, 0.03), d.eyes, sx * hs * 0.24, hs * 0.52, hs / 2 + 0.05, { glow: 5 }); }
      if (d.mask) this._part('head', box(hs * 0.9, hs * 0.6, 0.03), d.mask, 0, hs * 0.45, hs / 2 + 0.03);
      if (d.hat === 'brim') { this._part('head', box(hs + 0.24, 0.04, hs + 0.24), C.hat || 0x15161a, 0, hs + 0.02, 0); this._part('head', box(hs * 0.85, 0.18, hs * 0.85), C.hat || 0x15161a, 0, hs + 0.12, 0); }
      if (d.horns) for (const sx of [-1, 1]) this._part('head', box(0.05, 0.22, 0.05), d.horns, sx * hs * 0.45, hs + 0.08, -0.02, { rz: -sx * 0.5 });
      if (d.crown) for (let i = -2; i <= 2; i++) this._part('head', box(0.04, 0.12 + (i === 0 ? 0.06 : 0), 0.04), d.crown, i * 0.06, hs + 0.08, hs * 0.3, { glow: d.crownGlow ? 2 : 0 });
    }
    // arms
    const aw = 0.1 * bulk;
    for (const side of ['L', 'R']) {
      this._part('sh' + side, box(aw * 1.2, 0.12, aw * 1.3), C.shoulder || C.tunic, 0, -0.02, 0);
      this._part('sh' + side, box(aw, 0.28, aw), C.sleeve || C.tunic, 0, -0.14, 0);
      this._part('el' + side, box(aw * 0.92, 0.26, aw * 0.92), C.glove || C.sleeve || C.tunic, 0, -0.13, 0);
      this._part('ha' + side, box(aw * 0.9, 0.08, aw * 0.9), C.glove || C.skin, 0, -0.03, 0);
      if (d.claws) for (let i = -1; i <= 1; i++) this._part('ha' + side, box(0.02, 0.14, 0.02), d.claws, i * 0.03, -0.12, 0.02, { glow: d.clawGlow ? 2 : 0 });
    }
    // legs
    const lw = 0.13 * bulk;
    for (const side of ['L', 'R']) {
      this._part('hip' + side, box(lw, 0.44, lw), C.pants, 0, -0.22, 0);
      this._part('kn' + side, box(lw * 0.92, 0.4, lw * 0.92), C.boots || C.pants, 0, -0.2, 0);
      this._part('ft' + side, box(lw, 0.07, lw * 1.6), C.boots || 0x14100e, 0, -0.01, 0.04);
    }
    if (d.skirt) { this.skirt = this._part('hips', box(tw * 1.05, 0.5, td * 1.15), d.skirt, 0, -0.28, 0); }
    // weapon in the right hand: blade along local +Z of the hand
    this.weapon = new THREE.Group(); this.j.haR.add(this.weapon); this.weapon.position.set(0, -0.05, 0);
    this.tip = new THREE.Object3D(); this.weapon.add(this.tip);
    const w = d.weapon || 'none';
    if (w === 'sword' || w === 'greatsword' || w === 'saber') {
      const L = w === 'greatsword' ? 1.35 : (w === 'saber' ? 0.95 : 1.05); const bw = w === 'greatsword' ? 0.09 : 0.05;
      this.weapon.add(this._part('haR', box(0.04, 0.04, 0.2), 0x2a1e18, 0, 0, 0.0));
      const guard = this._part('haR', box(0.24, 0.04, 0.04), d.guard || 0x7a6a50, 0, 0, 0.11); this.weapon.add(guard);
      const blade = this._part('haR', box(bw, 0.025, L), d.blade || 0xc8d4e0, 0, 0, 0.13 + L / 2, { emissive: d.bladeGlow || 0x202830, ei: d.bladeGlow ? 2 : 1 }); this.weapon.add(blade);
      this.tip.position.set(0, 0, 0.13 + L); this.blade = blade; this.bladeLen = L;
    } else if (w === 'cleaver' || w === 'axe') {
      const shaft = this._part('haR', box(0.05, 0.05, 1.0), 0x3a2a1e, 0, -0.05, 0.35); this.weapon.add(shaft);
      const head = this._part('haR', box(0.04, 0.32, 0.36), d.blade || 0x8a929c, 0, -0.14, 0.75); this.weapon.add(head);
      this.tip.position.set(0, -0.2, 0.9); this.bladeLen = 1;
    } else if (w === 'staff') {
      const shaft = this._part('haR', box(0.05, 0.05, 1.6), 0x2a2018, 0, -0.05, 0.4); this.weapon.add(shaft);
      const orb = this._part('haR', box(0.12, 0.12, 0.12), d.orb || 0xff3040, 0, -0.05, 1.22, { glow: 3 }); this.weapon.add(orb);
      this.tip.position.set(0, -0.05, 1.25); this.orb = orb;
    } else if (w === 'crossbow') {
      const st = this._part('haR', box(0.06, 0.08, 0.6), 0x3a2a1e, 0, -0.04, 0.2); this.weapon.add(st);
      const bow = this._part('haR', box(0.6, 0.04, 0.05), 0x1a1a1e, 0, -0.02, 0.42); this.weapon.add(bow);
      this.tip.position.set(0, -0.04, 0.55);
    } else if (w === 'bell') {
      const shaft = this._part('haR', box(0.06, 0.06, 1.8), 0x2a2018, 0, -0.05, 0.55); this.weapon.add(shaft);
      const bellG = new THREE.CylinderGeometry(0.22, 0.42, 0.6, 8);
      const bell = new THREE.Mesh(bellG, mat(0x6a5a3a, 0x201808)); bell.position.set(0, -0.3, 1.45); this.weapon.add(bell); this.parts.push(bell);
      this.tip.position.set(0, -0.4, 1.45); this.bladeLen = 1.7;
    }
    if (d.offhand === 'lantern') {
      const l = this._part('haL', box(0.12, 0.16, 0.12), 0xffc060, 0, -0.16, 0.04, { glow: 3 }); this.lantern = l;
    } else if (d.offhand === 'shield') {
      this._part('elL', box(0.06, 0.55, 0.42), 0x3a3e46, 0.08, -0.15, 0.08);
    }
    if (d.extra) d.extra(this, (j, g, c, x, y, z, o) => this._part(j, g, c, x, y, z, o), box);
  }

  _cloak(d) {
    // three hanging segments from the back of the shoulders, plus a mantle over them
    const C = d.colors; const col = C.cloak; const bulk = d.bulk || 1;
    this._part('chest', box(0.46 * bulk, 0.1, 0.3 * bulk), col, 0, 0.27, -0.01, { emissive: d.cloakGlow || 0 });
    for (const sx of [-1, 1]) this._part('chest', box(0.1, 0.18, 0.26 * bulk), col, sx * 0.23 * bulk, 0.18, 0, { emissive: d.cloakGlow || 0 });
    const segs = []; let parent = this.j.chest; let y = 0.28;
    const lens = d.cloakLen || [0.36, 0.36, 0.34]; const widths = [0.48, 0.54, 0.6];
    for (let i = 0; i < lens.length; i++) {
      const g = new THREE.Group(); g.position.set(0, i === 0 ? y : -lens[i - 1], i === 0 ? -0.13 * bulk : 0); parent.add(g);
      const m = new THREE.Mesh(box(widths[i] * bulk, lens[i], 0.035), mat(i % 2 ? col : (C.cloakDark || col), d.cloakGlow || 0, 1));
      m.position.y = -lens[i] / 2; g.add(m); this.parts.push(m);
      // side flaps that wrap around a little
      for (const sx of [-1, 1]) { const f = new THREE.Mesh(box(0.035, lens[i], 0.12), mat(C.cloakDark || col, d.cloakGlow || 0, 1)); f.position.set(sx * widths[i] * bulk / 2, -lens[i] / 2, 0.05); g.add(f); this.parts.push(f); }
      segs.push(g); parent = g;
    }
    this.cloak = segs;
  }

  // Apply a pose: { joint: [rx, ry, rz], ..., hipsY, lean, twist }
  apply(p) {
    for (const name of JOINTS) { const r = p[name]; const g = this.j[name]; if (r) g.rotation.set(r[0], r[1], r[2]); else g.rotation.set(0, 0, 0); }
    const hp = PLAN.hips; this.j.hips.position.set(hp[0] + (p.hipsX || 0), hp[1] + (p.hipsY || 0), hp[2] + (p.hipsZ || 0));
    if (p.hips) this.j.hips.rotation.set(p.hips[0], p.hips[1], p.hips[2]);
    if (p.weapon) this.weapon.rotation.set(p.weapon[0], p.weapon[1], p.weapon[2]); else this.weapon.rotation.set(0, 0, 0);
    this.body.rotation.set(p.bodyRx || 0, p.bodyRy || 0, p.bodyRz || 0); this.body.position.set(0, p.bodyY || 0, p.bodyZ || 0);
  }

  // Cloak physics: segments trail behind motion and settle under gravity, with a rain-wind flutter.
  updateCloak(dt, speed, turn) {
    if (!this.cloak) return;
    this.time += dt;
    const target = 0.06 + Math.min(0.62, speed * 0.07) + Math.sin(this.time * 2.3) * 0.04 + Math.min(0.3, Math.abs(turn) * 0.2);
    const k = 40, damp = 8;
    this.cloakVel += ((target - this.cloakAng) * k - this.cloakVel * damp) * dt; this.cloakAng += this.cloakVel * dt;
    const a = this.cloakAng;
    this.cloak.forEach((g, i) => { g.rotation.x = (i === 0 ? a * 0.7 : a * 0.35) + Math.sin(this.time * 3 + i) * 0.03 * (i + 1); g.rotation.z = Math.sin(this.time * 1.7 + i * 0.7) * 0.03 + turn * 0.15 * i; });
  }

  // White hit flash: temporarily swap emissive on every part.
  flash(amount) {
    if (amount === this._flash) return; this._flash = amount;
    for (const m of this.parts) {
      if (!m.material || m.material.isMeshBasicMaterial) continue;
      if (amount > 0) { if (!this.baseMats.has(m)) this.baseMats.set(m, m.material); m.material = flashMat(this.baseMats.get(m), amount); }
      else if (this.baseMats.has(m)) { m.material = this.baseMats.get(m); }
    }
  }

  tipWorld(out) { return this.tip.getWorldPosition(out); }
  handWorld(out) { return this.j.haR.getWorldPosition(out); }
}

const flashCache = new Map();
function flashMat(base, amount) {
  const q = Math.round(amount * 4) / 4; const k = base.uuid + q;
  if (!flashCache.has(k)) { const m = base.clone(); m.emissive = new THREE.Color(1, 1, 1); m.emissiveIntensity = q * 1.6; flashCache.set(k, m); }
  return flashCache.get(k);
}
