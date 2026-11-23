// Keeps a rig for every entity in the simulation and poses it each frame, with short crossfades
// between clips, cloak physics, hit flashes, corpses that linger and sink, weapon trails, elite auras
// and status tints (burning, chilled, shielded). healGlow(id, dur) pulses an actor warm green (a tonic),
// and while a hero drinks ('heal') the flask shows in the free hand.
//
// Bodies that are not people come from beasts.js: makeBeast(look) returns an object with the same
// surface as Rig (root, flash, updateCloak, tip, handWorld, tipWorld) plus animate(e, t, dt), which
// poses it itself; the view then skips poseFor/apply for it.
import * as THREE from '../../vendor/three.module.min.js';
import { Rig } from './rig.js';
import { poseFor, mix, FLASK_T } from './anims.js';
import { makeBeast } from './beasts.js';
import { HEROES, WEAPONS } from '../game/heroes.js';
import { AFFIXES } from '../game/heroes.js';
import * as T from '../engine/textures.js';

const SWING = { slash1: [0.06, 0.2], slash2: [0.06, 0.2], slash3: [0.12, 0.3], thrust: [0.05, 0.22], special: [0.25, 1.4], hsmash1: [0.18, 0.34], hsmash2: [0.26, 0.48], whirl: [0.05, 0.75],
  kslash1: [0.04, 0.15], kcross: [0.08, 0.28], kstab: [0.04, 0.22], kstorm: [0.15, 1.6], asweep1: [0.17, 0.38], asweep2: [0.17, 0.38], aslam: [0.3, 0.5] };
// clips where the left-hand knife cuts (its own trail)
const SWING_L = { kslash2: [0.04, 0.15], kcross: [0.08, 0.28], kstab: [0.04, 0.22], kstorm: [0.15, 1.6] };
// the wardens' own projectiles and areas (fx.js draws a plain shape for kinds it does not know; the view
// dresses them once): colours in the renderer's bright-additive range
const ZONE_TINT = { splash: [0.6, 1.8, 1.7], noose: [2.2, 0.5, 0.4], tidepool: [0.4, 1.6, 1.5], tidering: [0.5, 1.9, 1.8], hymn: [1.9, 0.9, 2.8], lull: [1.4, 1.1, 2.4], sandtrail: [1.8, 1.4, 0.8], void: [1.2, 0.3, 1.9] };
const TRAIL_COL = { kestrel: [2.6, 2.4, 2.4], hollis: [0.7, 2.0, 1.8] };
const TAU = Math.PI * 2;
const HEAL_TINT = 0x8cff5a; // warm green

export class ActorView {
  constructor(scene, fx) { this.scene = scene; this.fx = fx; this.map = new Map(); this.glows = new Map(); this.tmpA = new THREE.Vector3(); this.tmpB = new THREE.Vector3(); }

  lookFor(e) {
    if (e.team === 'hero') {
      const H = HEROES[e.heroId] || HEROES.warden; const W = WEAPONS[e.stats && e.stats.weapon];
      return { ...H.look, ...(W && W.look ? W.look : {}) };
    }
    return { ...e.def.look, scale: (e.def.scale || e.def.look.scale || 1) * (e.elite ? 1.15 : 1) };
  }

  rigFor(e) {
    let v = this.map.get(e.id);
    const key = e.team === 'hero' ? e.heroId + ':' + (e.stats && e.stats.weapon) : e.type + (e.elite || '');
    if (v && v.key === key) return v;
    if (v) { this.scene.remove(v.rig.root); this._dropAura(v); }
    const look = this.lookFor(e);
    const rig = (look.rig && makeBeast(look)) || new Rig(look);
    rig.root.position.set(e.x, 0, e.z); rig.root.rotation.y = e.face;
    this.scene.add(rig.root);
    v = { rig, e, key, pose: null, from: null, blend: 1, anim: null, lastX: e.x, lastZ: e.z };
    if (e.elite) this._aura(v, AFFIXES[e.elite].color);
    this.map.set(e.id, v); return v;
  }

  // a ring of the affix colour under an elite and a soft glow around it
  _aura(v, color) {
    const c = new THREE.Color(color);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.7, 20), new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(2), transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; v.rig.root.add(ring);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow('#ffffff', 32, 1.4), color: c.clone().multiplyScalar(0.5), blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    halo.scale.set(2.2, 2.6, 1); halo.position.y = 1.0; v.rig.root.add(halo);
    v.auraParts = [ring, halo];
  }
  _dropAura(v) { for (const p of v.auraParts || []) { p.geometry && p.geometry.dispose(); p.material.dispose(); } v.auraParts = null; }

  update(world, dt) {
    const alive = new Set();
    for (const e of world.ents) {
      alive.add(e.id); const v = this.rigFor(e); const rig = v.rig;
      // position and facing (shortest way round)
      rig.root.position.set(e.x, (e.leapH || 0), e.z);
      let df = (e.face - rig.root.rotation.y) % TAU; if (df > Math.PI) df -= TAU; else if (df < -Math.PI) df += TAU;
      rig.root.rotation.y += df * Math.min(1, dt * 30);
      if (rig.animate) rig.animate(e, e.animT, dt);
      else {
        // clip crossfade
        if (e.anim !== v.anim) { v.from = v.pose; v.blend = 0; v.anim = e.anim; v.fade = /slash|thrust|dash|fslash|slam|sweep|pounce|hsmash|whirl/.test(e.anim) ? 0.035 : 0.09; }
        let p = poseFor(e, e.animT);
        if (v.blend < 1 && v.from) { v.blend = Math.min(1, v.blend + dt / v.fade); p = mix(v.from, p, v.blend); }
        v.pose = p; rig.apply(p);
      }
      // the tonic: the flask in the free hand while a hero drinks (dimmer once drunk)
      if (rig.showFlask) rig.showFlask(e.anim === 'heal' && !e.dead && (e.team === 'hero' || !!e.heroId) && e.animT >= FLASK_T[0] && e.animT <= FLASK_T[1], e.animT < 0.5 ? 1 : 0);
      this._glow(e, rig, dt);
      // cloak follows motion
      const sp = Math.hypot(e.x - v.lastX, e.z - v.lastZ) / Math.max(dt, 1e-4); v.lastX = e.x; v.lastZ = e.z;
      rig.updateCloak(dt, Math.min(sp, 14), df);
      rig.flash(e.flash > 0 ? 1 : 0);
      // statuses show as particles (burning, poisoned, bleeding) and a tint (chilled)
      if (!e.dead && e.status) {
        const s = e.status;
        if (s.burn && Math.random() < dt * 14) this.fx.emit(e.x + (Math.random() - 0.5) * 0.5, 0.6 + Math.random() * 1.0, e.z + (Math.random() - 0.5) * 0.5, { n: 1, speed: 0.3, up: 1, vy: 1.5, life: 0.5, grav: -2, color: [3, 1.2, 0.2], size: 1 });
        if (s.poison && Math.random() < dt * 10) this.fx.emit(e.x, 0.6 + Math.random(), e.z, { n: 1, speed: 0.2, up: 1, vy: 0.8, life: 0.6, grav: -1, color: [0.6, 1.8, 0.3], size: 1 });
        if (s.bleed && Math.random() < dt * 8) this.fx.emit(e.x, 1.0, e.z, { n: 1, speed: 0.5, up: 0.2, life: 0.5, grav: 8, color: [0.5, 0.03, 0.04], size: 1, kind: 1 });
        if (s.frost && Math.random() < dt * 8) this.fx.emit(e.x + (Math.random() - 0.5) * 0.6, 0.3 + Math.random() * 1.4, e.z + (Math.random() - 0.5) * 0.6, { n: 1, speed: 0.1, up: 0.1, life: 0.6, grav: 0.5, color: [1.2, 2, 2.6], size: 1 });
        if ((s.stun || s.root) && Math.random() < dt * 6) this.fx.emit(e.x, 2.0 * (e.def?.scale || 1), e.z, { n: 1, speed: 0.6, up: 0.3, life: 0.4, grav: 0, color: [2.6, 2.4, 1.2], size: 1 });
        // Mother Wren's resonance: violet motes that ring outward, more with each stack
        if (s.resonate && Math.random() < dt * 5 * s.resonate.stacks) { const a = Math.random() * TAU; this.fx.emit(e.x + Math.sin(a) * 0.45, 1.0 + Math.random() * 0.8 * (e.def?.scale || 1), e.z + Math.cos(a) * 0.45, { n: 1, speed: 0.9, up: 0.2, life: 0.45, grav: 0, color: [1.8, 0.8, 2.8], size: 1 }); }
        if (e.shield > 0 && Math.random() < dt * 6) this.fx.emit(e.x + (Math.random() - 0.5) * 1.0, 0.3 + Math.random() * 1.6, e.z + (Math.random() - 0.5) * 1.0, { n: 1, speed: 0.1, life: 0.4, grav: 0, color: [2.2, 2.1, 1.6], size: 1, alpha: 0.7 });
      }
      // visibility: hidden foes, the Requiem blur, corpses sinking away
      let vis = !e.hidden;
      if (e.anim === 'special' && e.ultDef && e.ultDef.kind === 'requiem' && e.animT > 0.3 && e.animT < 1.35) vis = Math.floor(e.animT * 20) % 3 === 0;
      if (e.anim === 'kstorm' && e.state === 'special' && e.t > 0.2 && e.t < 1.5) vis = Math.floor(e.t * 24) % 3 !== 1;
      if (e.dead && e.deadT > 14) { rig.root.position.y = -(e.deadT - 14) * 0.25; if (e.deadT > 20) vis = false; }
      if (e.dead && v.auraParts) this._dropAura(v);
      rig.root.visible = vis;
      // weapon trails
      const sw = SWING[e.anim];
      const swL = SWING_L[e.anim];
      if (swL && e.team === 'hero' && rig.tipL && e.animT >= swL[0] && e.animT <= swL[1] && vis) {
        rig.j.haL.getWorldPosition(this.tmpA); rig.tipL.getWorldPosition(this.tmpB); this.fx.trail(e.id + 0.5, this.tmpA, this.tmpB, [2.8, 0.5, 0.5]);
      }
      if (sw && e.team === 'hero' && e.animT >= sw[0] && e.animT <= sw[1] && rig.tip && vis && !(e.anim === 'kslash2')) {
        rig.handWorld(this.tmpA); rig.tipWorld(this.tmpB);
        this.fx.trail(e.id, this.tmpA, this.tmpB, TRAIL_COL[e.heroId] || [2.4, 2.3, 2.5]);
      } else if ((e.state === 'rush' || e.state === 'charging') && rig.tip && vis) {
        rig.handWorld(this.tmpA); rig.tipWorld(this.tmpB); this.fx.trail(e.id, this.tmpA, this.tmpB, [2.6, 0.5, 0.4]);
      } else if (e.team === 'foe' && e.state === 'attack' && rig.tip && vis) {
        rig.handWorld(this.tmpA); rig.tipWorld(this.tmpB); this.fx.trail(e.id, this.tmpA, this.tmpB, [1.8, 0.35, 0.3]);
      }
    }
    this._heroBuffs(world.hero, dt);
    this._dress(world);
    for (const [id, g] of this.glows) if (!alive.has(id) && (g.t += dt) >= g.dur) this._endGlow(id, this.map.get(id)?.rig);
    for (const [id, v] of this.map) if (!alive.has(id)) { this._endGlow(id, v.rig); this.scene.remove(v.rig.root); this._dropAura(v); this.map.delete(id); this.fx.dropTrail(id); }
  }

  // what the warden carries for a while: Barnacle Guard's shells, the two Echo Choir voices, the Stilled
  // Hand's hush, the bone wards of Ten Thousand Names
  _heroBuffs(h, dt) {
    if (!h || h.dead || !h.buffs) return; const fx = this.fx; const r = Math.random;
    if (h.buffs.barnacle > 0 && r() < dt * 16) { const a = r() * TAU; fx.emit(h.x + Math.sin(a) * 0.5, 0.3 + r() * 1.3, h.z + Math.cos(a) * 0.5, { n: 1, speed: 0.15, life: 0.5, grav: 1, color: [1.6, 1.55, 1.3], size: 1 }); }
    if (h.buffs.echo > 0) for (const sd of [-1, 1]) { const a = h.face + sd * 1.6 + Math.sin(performance.now() * 0.003) * 0.2; if (r() < dt * 30) fx.emit(h.x + Math.sin(a) * 0.9, 1.7 + Math.sin(performance.now() * 0.004 + sd) * 0.12, h.z + Math.cos(a) * 0.9, { n: 1, speed: 0.12, life: 0.35, grav: -0.5, color: [1.8, 0.9, 2.8], size: 2 }); }
    if (h.buffs.hush > 0 && r() < dt * 20) fx.emit(h.x + (r() - 0.5) * 0.6, 0.2 + r() * 1.8, h.z + (r() - 0.5) * 0.6, { n: 1, speed: 0.05, life: 0.6, grav: -0.4, color: [2.2, 2.3, 2.6], size: 1, alpha: 0.8 });
    for (let i = 0; i < (h.boneWard || 0); i++) if (r() < dt * 12) { const a = performance.now() * 0.004 + i * Math.PI; fx.emit(h.x + Math.sin(a) * 0.7, 1.1 + i * 0.3, h.z + Math.cos(a) * 0.7, { n: 1, speed: 0.05, life: 0.3, grav: 0, color: [2.4, 2.3, 2.0], size: 2 }); }
  }

  // the wardens' own projectiles and areas, dressed once fx.js has made them (it draws kinds it does not know
  // as a plain red cube or a white ring)
  _dress(world) {
    const fx = this.fx;
    if (fx.projs) for (const p of world.projs) {
      if (p.team !== 'hero' || !DRESS[p.kind]) continue; const v = fx.projs.get(p.id); if (!v || v.userData.dressed) continue;
      for (const c of [...v.children]) { v.remove(c); c.geometry && !c.geometry.userData.keep && c.geometry.dispose(); c.material && !c.material.userData.keep && c.material.dispose(); }
      const o = DRESS[p.kind](v, p); v.userData = { ...v.userData, ...o, dressed: true, team: 'hero' };
    }
    if (fx.zv) for (const z of world.zones) {
      const c = ZONE_TINT[z.kind]; if (!c) continue; const v = fx.zv.get(z); if (!v || v.userData.dressed) continue;
      v.userData.dressed = true; v.material.color.setRGB(c[0], c[1], c[2]);
      if (z.shape !== 'ring' && z.kind !== 'sandtrail') { const f = new THREE.Mesh(new THREE.CircleGeometry(z.r, 24), v.material.clone()); f.material.opacity = 0.16; v.add(f); }
      if (!z.warn) this._burst(z, c);
      else z._dressBurst = true;
    }
    for (const z of world.zones) if (z._dressBurst && z.t >= z.warn) { z._dressBurst = false; this._burst(z, ZONE_TINT[z.kind]); }
  }
  _burst(z, c) {
    if (z.shape === 'ring' || z.tick || z.visual) return;
    if (z.kind === 'sandtrail') { this.fx.emit(z.x, 0.1, z.z, { n: 10, speed: 1.6, up: 2.5, vy: 3, life: 0.6, grav: 10, color: [1.6, 1.2, 0.7], colorVar: 0.3, size: 2, jit: 0.5 }); return; }
    if (z.kind === 'hymn' || z.kind === 'lull') { for (let i = 0; i < 3; i++) this.fx.emit(z.x, 0.3 + i * 0.6, z.z, { n: 8, speed: 2.2, up: 0.1, life: 0.4, grav: 0, color: c, size: 1, jit: 0.1 }); }
  }

  // A warm green pulse over an actor for dur seconds (a tonic): an emissive tint on the rig and a soft
  // halo around the body, rising fast, beating twice a second, fading out over the last third.
  healGlow(id, dur = 1) { const g = this.glows.get(id); if (g) { g.t = 0; g.dur = Math.max(0.2, dur); } else this.glows.set(id, { t: 0, dur: Math.max(0.2, dur), halo: null }); }
  _glow(e, rig, dt) {
    const g = this.glows.get(e.id); if (!g) return;
    g.t += dt; const u = g.t / g.dur;
    if (u >= 1 || e.dead) { this._endGlow(e.id, rig); return; }
    const env = Math.min(1, g.t / 0.12) * (u < 0.66 ? 1 : 1 - (u - 0.66) / 0.34);
    const k = env * (0.5 + 0.5 * Math.cos(g.t * Math.PI * 4));
    if (rig.tint) rig.tint(HEAL_TINT, k);
    if (!g.halo) {
      g.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow('#ffffff', 32, 1.3), color: new THREE.Color(0.3, 0.9, 0.35), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
      this.scene.add(g.halo);
    }
    const s = (e.def?.scale || 1);
    g.halo.position.set(e.x, (e.leapH || 0) + 1.0 * s, e.z); g.halo.scale.set(1.7 * s, 2.4 * s, 1); g.halo.material.opacity = 0.3 * k; g.halo.visible = rig.root.visible;
  }
  _endGlow(id, rig) {
    const g = this.glows.get(id); if (!g) return;
    if (rig && rig.tint) rig.tint(null, 0);
    if (g.halo) { this.scene.remove(g.halo); g.halo.material.dispose(); }
    this.glows.delete(id);
  }

  get(e) { return this.map.get(e.id)?.rig; }
  clear() { for (const id of [...this.glows.keys()]) this._endGlow(id, this.map.get(id)?.rig); for (const [id, v] of this.map) { this.scene.remove(v.rig.root); this._dropAura(v); this.fx.dropTrail(id); } this.map.clear(); }
}

// ------------------------------------------------------------------ the wardens' projectiles, dressed
// (keep: shared geometry, not freed by fx.js when the projectile ends)
const G = {}; const geo = (k, f) => { if (!G[k]) { G[k] = f(); G[k].userData.keep = true; } return G[k]; };
const glowSprite = (col, s) => { const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow('#ffffff', 32, 1.5), color: new THREE.Color(col[0] * 0.3, col[1] * 0.3, col[2] * 0.3), blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); h.scale.set(s, s, 1); return h; };
const basic = (col, o = {}) => new THREE.MeshBasicMaterial({ color: new THREE.Color(...col), fog: false, ...o });
const DRESS = {
  knife: (g) => { // a thrown knife: steel blade, dark grip, flying point first
    g.add(new THREE.Mesh(geo('knB', () => new THREE.BoxGeometry(0.06, 0.03, 0.36)), basic([2.6, 2.6, 2.7])));
    const grip = new THREE.Mesh(geo('knG', () => new THREE.BoxGeometry(0.07, 0.05, 0.14)), basic([0.5, 0.15, 0.15])); grip.position.z = -0.24; g.add(grip);
    return { trail: [1.4, 0.3, 0.3] };
  },
  note: (g, p) => { // a sung note: a violet diamond inside a glow
    const m = new THREE.Mesh(geo('ntD', () => new THREE.BoxGeometry(0.2, 0.2, 0.2)), basic([2.2, 1.2, 3.2])); m.rotation.set(0.6, 0, 0.785); g.add(m);
    const c = new THREE.Mesh(geo('ntC', () => new THREE.BoxGeometry(0.1, 0.1, 0.1)), basic([3.2, 3, 3.4])); g.add(c);
    g.add(glowSprite([1.8, 0.8, 2.8], 1.4));
    return { trail: [1.2, 0.5, 1.8], spin: 6, rich: true };
  },
  tide: (g) => { // a crescent of black water rolling out
    const m = new THREE.Mesh(geo('tdR', () => new THREE.RingGeometry(1.0, 1.5, 22, 1, Math.PI * 0.12, Math.PI * 0.76)), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 1.9, 1.8), transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = -0.5; g.add(m);
    const crest = new THREE.Mesh(geo('tdC', () => new THREE.RingGeometry(1.35, 1.5, 22, 1, Math.PI * 0.12, Math.PI * 0.76)), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.8, 2.8), transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    crest.rotation.x = -Math.PI / 2; crest.position.y = -0.3; g.add(crest);
    return { trail: [0.3, 1.2, 1.1], rich: true };
  },
};
