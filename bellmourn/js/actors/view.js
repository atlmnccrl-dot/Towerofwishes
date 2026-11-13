// Keeps a rig for every entity in the simulation and poses it each frame, with short crossfades
// between clips, cloak physics, hit flashes, corpses that linger and sink, and sword trails.
import * as THREE from 'three';
import { Rig } from './rig.js';
import { poseFor, mix } from './anims.js';
import { HERO_LOOK } from '../game/defs.js';

const SWING = { slash1: [0.06, 0.2], slash2: [0.06, 0.2], slash3: [0.12, 0.3], heavy: [0.08, 0.26], thrust: [0.05, 0.22], finisher: [0.45, 0.9], special: [0.25, 1.4] };

export class ActorView {
  constructor(scene, fx) { this.scene = scene; this.fx = fx; this.map = new Map(); this.tmpA = new THREE.Vector3(); this.tmpB = new THREE.Vector3(); }

  rigFor(e) {
    let v = this.map.get(e.id);
    if (v) return v;
    const look = e.team === 'hero' ? HERO_LOOK : { ...e.def.look, scale: e.def.scale || e.def.look.scale || 1 };
    const rig = new Rig(look);
    rig.root.position.set(e.x, 0, e.z); rig.root.rotation.y = e.face;
    this.scene.add(rig.root);
    v = { rig, e, pose: null, from: null, blend: 1, anim: null, lastX: e.x, lastZ: e.z, alpha: 1, gone: false };
    this.map.set(e.id, v); return v;
  }

  update(world, dt) {
    const alive = new Set();
    for (const e of world.ents) {
      alive.add(e.id); const v = this.rigFor(e); const rig = v.rig;
      // position and facing
      rig.root.position.set(e.x, (e.leapH || 0), e.z);
      const df = ((e.face - rig.root.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      rig.root.rotation.y += df * Math.min(1, dt * 30);
      // clip crossfade
      if (e.anim !== v.anim) { v.from = v.pose; v.blend = 0; v.anim = e.anim; v.fade = /slash|heavy|thrust|parry|dash|fslash|slam|sweep|pounce|finisher/.test(e.anim) ? 0.035 : 0.09; }
      let p = poseFor(e, e.animT);
      if (v.blend < 1 && v.from) { v.blend = Math.min(1, v.blend + dt / v.fade); p = mix(v.from, p, v.blend); }
      v.pose = p; rig.apply(p);
      // cloak follows motion
      const sp = Math.hypot(e.x - v.lastX, e.z - v.lastZ) / Math.max(dt, 1e-4); v.lastX = e.x; v.lastZ = e.z;
      rig.updateCloak(dt, Math.min(sp, 14), df);
      rig.flash(e.flash > 0 ? 1 : 0);
      // visibility: hidden bosses, the Requiem blur, corpses sinking away
      let vis = !e.hidden;
      if (e.anim === 'special' && e.animT > 0.3 && e.animT < 1.35) vis = Math.floor(e.animT * 20) % 3 === 0;
      if (e.dead && e.deadT > 14) { rig.root.position.y = -(e.deadT - 14) * 0.25; if (e.deadT > 20) vis = false; }
      rig.root.visible = vis;
      // sword trails
      const sw = SWING[e.anim];
      if (sw && e.animT >= sw[0] && e.animT <= sw[1] && rig.tip && vis) {
        rig.handWorld(this.tmpA); rig.tipWorld(this.tmpB);
        this.fx.trail(e.id, this.tmpA, this.tmpB, e.team === 'hero' ? [2.4, 2.3, 2.5] : [2, 0.5, 0.4]);
      } else if (e.team === 'foe' && e.state === 'attack' && rig.tip && vis) {
        rig.handWorld(this.tmpA); rig.tipWorld(this.tmpB); this.fx.trail(e.id, this.tmpA, this.tmpB, [1.8, 0.35, 0.3]);
      }
      // a staff's orb / lantern glows; foe eyes are already emissive
    }
    for (const [id, v] of this.map) if (!alive.has(id)) { this.scene.remove(v.rig.root); this.map.delete(id); }
  }

  get(e) { return this.map.get(e.id)?.rig; }
  clear() { for (const [, v] of this.map) this.scene.remove(v.rig.root); this.map.clear(); }
}
