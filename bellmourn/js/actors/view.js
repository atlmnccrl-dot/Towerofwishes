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

const SWING = { slash1: [0.06, 0.2], slash2: [0.06, 0.2], slash3: [0.12, 0.3], thrust: [0.05, 0.22], special: [0.25, 1.4], hsmash1: [0.18, 0.34], hsmash2: [0.26, 0.48], whirl: [0.05, 0.75] };
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
        if (e.shield > 0 && Math.random() < dt * 6) this.fx.emit(e.x + (Math.random() - 0.5) * 1.0, 0.3 + Math.random() * 1.6, e.z + (Math.random() - 0.5) * 1.0, { n: 1, speed: 0.1, life: 0.4, grav: 0, color: [2.2, 2.1, 1.6], size: 1, alpha: 0.7 });
      }
      // visibility: hidden foes, the Requiem blur, corpses sinking away
      let vis = !e.hidden;
      if (e.anim === 'special' && e.ultDef && e.ultDef.kind === 'requiem' && e.animT > 0.3 && e.animT < 1.35) vis = Math.floor(e.animT * 20) % 3 === 0;
      if (e.dead && e.deadT > 14) { rig.root.position.y = -(e.deadT - 14) * 0.25; if (e.deadT > 20) vis = false; }
      if (e.dead && v.auraParts) this._dropAura(v);
      rig.root.visible = vis;
      // weapon trails
      const sw = SWING[e.anim];
      if (sw && e.team === 'hero' && e.animT >= sw[0] && e.animT <= sw[1] && rig.tip && vis) {
        rig.handWorld(this.tmpA); rig.tipWorld(this.tmpB);
        this.fx.trail(e.id, this.tmpA, this.tmpB, [2.4, 2.3, 2.5]);
      } else if ((e.state === 'rush' || e.state === 'charging') && rig.tip && vis) {
        rig.handWorld(this.tmpA); rig.tipWorld(this.tmpB); this.fx.trail(e.id, this.tmpA, this.tmpB, [2.6, 0.5, 0.4]);
      } else if (e.team === 'foe' && e.state === 'attack' && rig.tip && vis) {
        rig.handWorld(this.tmpA); rig.tipWorld(this.tmpB); this.fx.trail(e.id, this.tmpA, this.tmpB, [1.8, 0.35, 0.3]);
      }
    }
    for (const [id, g] of this.glows) if (!alive.has(id) && (g.t += dt) >= g.dur) this._endGlow(id, this.map.get(id)?.rig);
    for (const [id, v] of this.map) if (!alive.has(id)) { this._endGlow(id, v.rig); this.scene.remove(v.rig.root); this._dropAura(v); this.map.delete(id); this.fx.dropTrail(id); }
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
