// Low-poly articulated characters. At 16 px per metre a person is ~30 px tall, so a handful of boxes
// with the right proportions, colours and motion reads like hand-made pixel sprites, but every
// pose, swing and fall is free. Characters face +Z in local space; their right hand is -X.
import * as THREE from '../../vendor/three.module.min.js';
import * as T from '../engine/textures.js';
import { buildWeapon, dressArmor } from './arms.js';

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
      if (d.eyes) { for (const sx of [-1, 1]) this._part('head', box(0.08, 0.09, 0.03), d.eyes, sx * hs * 0.24, hs * 0.52, hs / 2 + 0.05, { glow: 2.6 }); }
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
    // weapon in the right hand: blade along local +Z of the hand. A warden's weapon has its own model (arms.js,
    // look.model = the weapon's id); everyone else has one of the shapes below.
    this.weaponL = null;
    const built = !!(d.model && buildWeapon(this, d));
    if (!built) { this.weapon = new THREE.Group(); this.j.haR.add(this.weapon); this.weapon.position.set(0, -0.05, 0); this.tip = new THREE.Object3D(); this.weapon.add(this.tip); }
    const w = built ? 'built' : (d.weapon || 'none');
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
    } else if (w === 'hammer') {
      const shaft = this._part('haR', box(0.06, 0.06, 1.25), 0x3a2a1e, 0, 0, 0.42); this.weapon.add(shaft);
      const head = this._part('haR', box(0.34, 0.3, 0.42), d.blade || 0x5a5e66, 0, 0, 1.08, { emissive: d.bladeGlow || 0, ei: d.bladeGlow ? 2 : 1 }); this.weapon.add(head);
      const band = this._part('haR', box(0.36, 0.06, 0.44), 0x8a7a58, 0, 0.12, 1.08); this.weapon.add(band);
      this.tip.position.set(0, 0, 1.25); this.blade = head; this.bladeLen = 1.3;
    } else if (w === 'staff') {
      const shaft = this._part('haR', box(0.05, 0.05, 1.6), 0x2a2018, 0, -0.05, 0.4); this.weapon.add(shaft);
      const orb = this._part('haR', box(0.12, 0.12, 0.12), d.orb || 0xff3040, 0, -0.05, 1.22, { glow: 3 }); this.weapon.add(orb);
      this.tip.position.set(0, -0.05, 1.25); this.orb = orb;
    } else if (w === 'crossbow') {
      const st = this._part('haR', box(0.06, 0.08, 0.6), 0x3a2a1e, 0, -0.04, 0.2); this.weapon.add(st);
      const bow = this._part('haR', box(0.6, 0.04, 0.05), 0x1a1a1e, 0, -0.02, 0.42); this.weapon.add(bow);
      this.tip.position.set(0, -0.04, 0.55);
    } else if (w === 'knife') { // Kestrel: a short, slightly curved blade (the twin is in the left hand, below)
      this.weapon.add(this._part('haR', box(0.04, 0.04, 0.14), 0x2a1a14, 0, 0, 0.02));
      this.weapon.add(this._part('haR', box(0.12, 0.03, 0.03), d.guard || 0x6a5a48, 0, 0, 0.09));
      const blade = this._part('haR', box(0.045, 0.02, 0.42), d.blade || 0xd0d6dc, 0, 0.012, 0.31, { emissive: d.bladeGlow || 0x202830, ei: d.bladeGlow ? 2 : 1 }); this.weapon.add(blade);
      this.weapon.add(this._part('haR', box(0.03, 0.02, 0.1), d.blade || 0xd0d6dc, 0, 0.04, 0.53, { rx: -0.35, emissive: d.bladeGlow || 0x202830, ei: d.bladeGlow ? 2 : 1 }));
      this.tip.position.set(0, 0.04, 0.58); this.blade = blade; this.bladeLen = 0.6;
    } else if (w === 'anchor') { // Hollis: a chain from the fist, an anchor at its end
      const links = 7, step = 0.14; const iron = 0x6a7274;
      for (let i = 0; i < links; i++) this.weapon.add(this._part('haR', box(i % 2 ? 0.03 : 0.07, i % 2 ? 0.07 : 0.03, 0.12), iron, 0, 0, 0.06 + i * step));
      const z0 = 0.06 + links * step; const col = d.blade || 0x4a5a58;
      this.weapon.add(this._part('haR', box(0.12, 0.12, 0.08), col, 0, 0, z0)); // the ring
      const shank = this._part('haR', box(0.09, 0.09, 0.62), col, 0, 0, z0 + 0.34, { emissive: d.bladeGlow || 0, ei: d.bladeGlow ? 2 : 1 }); this.weapon.add(shank);
      this.weapon.add(this._part('haR', box(0.5, 0.07, 0.07), col, 0, 0, z0 + 0.1)); // the stock
      for (const sx of [-1, 1]) { // the arms and their flukes
        this.weapon.add(this._part('haR', box(0.3, 0.08, 0.08), col, sx * 0.14, 0, z0 + 0.66, { ry: sx * 0.5 }));
        this.weapon.add(this._part('haR', box(0.12, 0.06, 0.14), col, sx * 0.27, 0, z0 + 0.56, { ry: sx * 0.3 }));
      }
      if (d.barnacles) for (const [x, z] of [[0.05, 0.4], [-0.05, 0.62], [0.2, 0.68]]) this.weapon.add(this._part('haR', box(0.06, 0.06, 0.06), d.barnacles, x, 0.04, z0 + z));
      this.tip.position.set(0, 0, z0 + 0.7); this.blade = shank; this.bladeLen = z0 + 0.7;
    } else if (w === 'fork') { // Mother Wren: a staff that ends in a tuning fork, a note held between the tines
      this.weapon.add(this._part('haR', box(0.05, 0.05, 1.5), 0x5a4a64, 0, -0.05, 0.35));
      const metal = 0xd8dce8;
      this.weapon.add(this._part('haR', box(0.3, 0.05, 0.05), metal, 0, -0.05, 1.12));
      for (const sx of [-1, 1]) this.weapon.add(this._part('haR', box(0.05, 0.05, 0.42), metal, sx * 0.13, -0.05, 1.34));
      const orb = this._part('haR', box(0.12, 0.12, 0.12), d.orb || 0xb070ff, 0, -0.05, 1.34, { glow: 3 }); this.weapon.add(orb);
      this.tip.position.set(0, -0.05, 1.4); this.orb = orb;
    } else if (w === 'bell') {
      const shaft = this._part('haR', box(0.06, 0.06, 1.8), 0x2a2018, 0, -0.05, 0.55); this.weapon.add(shaft);
      const bellG = new THREE.CylinderGeometry(0.22, 0.42, 0.6, 8);
      const bell = new THREE.Mesh(bellG, mat(0x6a5a3a, 0x201808)); bell.position.set(0, -0.3, 1.45); this.weapon.add(bell); this.parts.push(bell);
      this.tip.position.set(0, -0.4, 1.45); this.bladeLen = 1.7;
    }
    if (d.offhand === 'knife' && !this.weaponL) { // the twin knife in the left fist, posed with weaponL
      const g = new THREE.Group(); g.position.set(0, -0.05, 0); this.j.haL.add(g); this.weaponL = g;
      const add = (geom, c, x, y, z, o) => { const m = this._part('haL', geom, c, x, y, z, o); g.add(m); return m; };
      add(box(0.04, 0.04, 0.14), 0x2a1a14, 0, 0, 0.02); add(box(0.12, 0.03, 0.03), d.guard || 0x6a5a48, 0, 0, 0.09);
      add(box(0.045, 0.02, 0.42), d.blade || 0xd0d6dc, 0, 0.012, 0.31, { emissive: d.bladeGlow || 0x202830, ei: d.bladeGlow ? 2 : 1 });
      add(box(0.03, 0.02, 0.1), d.blade || 0xd0d6dc, 0, 0.04, 0.53, { rx: -0.35, emissive: d.bladeGlow || 0x202830, ei: d.bladeGlow ? 2 : 1 });
      this.tipL = new THREE.Object3D(); this.tipL.position.set(0, 0.04, 0.58); g.add(this.tipL);
    }
    // Hollis: the harbour bell on his back, barnacles on his shoulders
    if (d.backBell) {
      const bb = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.19, 0.3, 8), mat(0x5a4624, 0x100a04)); bb.position.set(0, 0.1, -0.22 * (d.bulk || 1)); bb.rotation.x = 0.2; this.j.chest.add(bb); this.parts.push(bb);
      const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 8), mat(0x3e7a62)); lip.position.set(0, -0.04, -0.25 * (d.bulk || 1)); lip.rotation.x = 0.2; this.j.chest.add(lip); this.parts.push(lip); // verdigris at the lip
      this._part('chest', box(0.05, 0.08, 0.05), 0x3e7a62, 0, 0.26, -0.2 * (d.bulk || 1)); // the crown loop
      this._part('chest', box(0.06, 0.06, 0.06), 0x2a2a20, 0, -0.06, -0.26 * (d.bulk || 1)); // the clapper
      for (const sx of [-1, 1]) this._part('chest', box(0.04, 0.36, 0.04), 0x4a3a24, sx * 0.12, 0.12, 0.13 * (d.bulk || 1), { rz: sx * 0.15 }); // the straps
    }
    if (d.barnacles) for (const [j, x, y, z] of [['shL', 0.04, 0.03, 0.03], ['shL', -0.03, 0.04, -0.04], ['shR', 0.02, 0.04, 0.04], ['elL', 0.05, -0.1, 0], ['chest', 0.12, 0.2, 0.13], ['hipR', -0.06, -0.2, 0.05]]) this._part(j, box(0.06, 0.05, 0.06), d.barnacles, x, y, z);
    // Mother Wren: a white choir ruff at the collar
    if (d.ruff) { this._part('chest', box(0.4, 0.07, 0.3), d.ruff, 0, 0.29, 0); this._part('chest', box(0.34, 0.05, 0.26), 0xc8c0b6, 0, 0.25, 0.01); }
    if (d.offhand === 'lantern') {
      const l = this._part('haL', box(0.12, 0.16, 0.12), 0xffc060, 0, -0.16, 0.04, { glow: 3 }); this.lantern = l;
    } else if (d.offhand === 'shield') {
      this._part('elL', box(0.06, 0.55, 0.42), 0x3a3e46, 0.08, -0.15, 0.08);
    }
    if (d.armor) dressArmor(this, d);
    if (d.extra) d.extra(this, (j, g, c, x, y, z, o) => this._part(j, g, c, x, y, z, o), box);
  }

  _cloak(d) {
    // three hanging segments from the back of the shoulders, plus a mantle over them
    const C = d.colors; const col = C.cloak; const bulk = d.bulk || 1;
    if (d.scarf) { // a scarf wound at the neck, its tails hanging off one shoulder blade (the segments below)
      this._part('chest', box(0.3, 0.09, 0.27), col, 0, 0.32, 0, { emissive: d.cloakGlow || 0 });
      this._part('chest', box(0.26, 0.06, 0.24), C.cloakDark || col, 0, 0.38, 0.01);
    } else {
      this._part('chest', box(0.46 * bulk, 0.1, 0.3 * bulk), col, 0, 0.27, -0.01, { emissive: d.cloakGlow || 0 });
      for (const sx of [-1, 1]) this._part('chest', box(0.1, 0.18, 0.26 * bulk), col, sx * 0.23 * bulk, 0.18, 0, { emissive: d.cloakGlow || 0 });
    }
    const segs = []; let parent = this.j.chest; let y = d.scarf ? 0.33 : 0.28;
    const lens = d.cloakLen || [0.36, 0.36, 0.34]; const widths = d.cloakW || [0.48, 0.54, 0.6];
    for (let i = 0; i < lens.length; i++) {
      const g = new THREE.Group(); g.position.set(i === 0 && d.scarf ? 0.07 : 0, i === 0 ? y : -lens[i - 1], i === 0 ? -0.13 * bulk : 0); parent.add(g);
      const m = new THREE.Mesh(box(widths[i] * bulk, lens[i], 0.035), mat(i % 2 ? col : (C.cloakDark || col), d.cloakGlow || 0, 1));
      m.position.y = -lens[i] / 2; g.add(m); this.parts.push(m);
      // side flaps that wrap around a little
      if (!d.scarf) for (const sx of [-1, 1]) { const f = new THREE.Mesh(box(0.035, lens[i], 0.12), mat(C.cloakDark || col, d.cloakGlow || 0, 1)); f.position.set(sx * widths[i] * bulk / 2, -lens[i] / 2, 0.05); g.add(f); this.parts.push(f); }
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
    if (this.weaponL) { const wl = p.weaponL || p.weapon; if (wl) this.weaponL.rotation.set(wl[0], wl[1], wl[2]); else this.weaponL.rotation.set(0, 0, 0); }
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

  // White hit flash: temporarily swap emissive on every part. A coloured tint (the tonic's green glow,
  // view.healGlow) uses the same swap; the white flash wins while both are on.
  flash(amount) { if (amount === this._flash) return; this._flash = amount; this._overlay(); }
  tint(color, amount) { this._tintC = color; this._tint = color ? Math.round(Math.max(0, Math.min(1, amount)) * 8) / 8 : 0; this._overlay(); }
  // a locked warden on the select screen: the body as a black shape against the light (silhouette(false) restores it)
  silhouette(on) {
    if (!!on === !!this._sil) return; this._sil = !!on;
    for (const m of this.parts) {
      if (!m.material) continue;
      if (on) { m.userData.preSil = m.material; m.material = SIL_MAT; }
      else if (m.userData.preSil) { m.material = m.userData.preSil; m.userData.preSil = null; }
    }
  }
  _overlay() {
    if (this._sil) return;
    const f = this._flash || 0, k = this._tint || 0;
    const key = f > 0 ? 'f' + f : (k > 0 ? 't' + k + ':' + this._tintC : '');
    if (key === this._overlayKey) return; this._overlayKey = key;
    for (const m of this.parts) {
      if (!m.material) continue;
      if (!this.baseMats.has(m)) { if (m.material.isMeshBasicMaterial || !key) continue; this.baseMats.set(m, m.material); }
      const base = this.baseMats.get(m);
      m.material = !key ? base : (f > 0 ? overlayMat(base, 0xffffff, Math.round(f * 4) / 4 * 1.6) : overlayMat(base, this._tintC, k * 0.26));
    }
  }

  // The tonic flask in the free (left) hand, made on first use. `full` dims the glass once it is drunk.
  // A Lamplighter hooks her lantern on her belt while she drinks.
  showFlask(on, full = 1) {
    if (!on && !this.flask) return;
    if (!this.flask) {
      // held in the fist with the neck along the forearm, so at the mouth the neck points in
      const g = new THREE.Group(); g.position.set(0, -0.06, 0.03); this.j.haL.add(g);
      this.flaskGlass = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 2.6, 0.8), fog: false });
      const body = new THREE.Mesh(box(0.11, 0.13, 0.11), this.flaskGlass); body.position.y = -0.04; g.add(body);
      const neck = new THREE.Mesh(box(0.05, 0.05, 0.05), this.flaskGlass); neck.position.y = -0.12; g.add(neck);
      const cork = new THREE.Mesh(box(0.06, 0.03, 0.06), mat(0x8a6a3a)); cork.position.y = -0.16; g.add(cork);
      this.flaskHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow('#ffffff', 32, 1.6), color: new THREE.Color(0.25, 0.9, 0.35), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
      this.flaskHalo.scale.set(0.7, 0.7, 1); g.add(this.flaskHalo);
      this.flask = g;
      if (this.lantern) { this.beltLantern = this._part('hips', box(0.11, 0.14, 0.11), 0xffc060, 0.22 * (this.def.bulk || 1), -0.08, 0.05, { glow: 3 }); this.beltLantern.visible = false; }
    }
    this.flask.visible = on;
    if (on) { const k = 0.35 + 0.65 * full; this.flaskGlass.color.setRGB(0.5 * k, 2.6 * k, 0.8 * k); this.flaskHalo.material.opacity = 0.25 + 0.75 * full; }
    if (this.lantern) { this.lantern.visible = !on; this.beltLantern.visible = on; }
    if (this.weaponL) this.weaponL.visible = !on; // Kestrel tucks her second knife away to drink
  }

  tipWorld(out) { return this.tip.getWorldPosition(out); }
  handWorld(out) { return this.j.haR.getWorldPosition(out); }
}

const overlayCache = new Map();
const SIL_MAT = new THREE.MeshBasicMaterial({ color: 0x07070a });
function overlayMat(base, color, intensity) {
  const k = base.uuid + ':' + color + ':' + intensity;
  if (!overlayCache.has(k)) { const m = base.clone(); m.emissive = new THREE.Color(color); m.emissiveIntensity = intensity; overlayCache.set(k, m); }
  return overlayCache.get(k);
}
