// A shrine on the route: the solitary Haven. The warden walks in out of the rain, alone, to the bell's
// forge-flame (world/haven.js builds the place), kneels, and the ShrineScreen opens beside them (rest, raise a
// boon, buy a reroll, leave); every choice is answered by the flame, the sound and the warden; LEAVE and they
// rise and walk out into the rain, back to the route map. No other wardens are here: the Haven is a lonely place.
import * as THREE from '../../vendor/three.module.min.js';
import { COL } from '../engine/ui.js';

const WALK = 1.75;             // m/s, walking in and out
const KNEEL = 0.6, RISE = 0.7; // the clips' lengths (anims.js)
const TAU = Math.PI * 2;
const ease = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const angTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const turnTo = (a, b, max) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return a + Math.max(-max, Math.min(max, d)); };
const ACT_SUP = { 1: 'A SHRINE IN THE CITY', 2: 'A SHRINE BEYOND THE WALLS', 3: 'A SHRINE ON THE WHEEL' }; // PROPOSAL

export class Haven {
  // opts: resume (start already kneeling), act (for the card), onLeave (called once the warden has walked out)
  constructor(game, L, opts = {}) {
    this.g = game; this.L = L; this.D = L.def; this.fire = L.fire; this.onLeave = opts.onLeave; this.act = opts.act || 1;
    this.t = 0; this.phaseT = 0; this.menuK = 0; this.closeT = 0; this.emberT = 0; this.handFx = 0; this.cardT = opts.resume ? 9 : 0;
    this.fireSrc = game.atmos.sources.find((s) => s.tag === 'havenFire'); this.fireBase = this.fireSrc ? this.fireSrc.intensity : 0;
    const D = this.D; const w = game.world;
    if (opts.resume) {
      const h = w.spawnHero(D.kneel.x, D.kneel.z, { ...game.heroStats(), face: angTo(D.kneel, D.fire) });
      this.pose(h, 'rest'); this.phase = 'rest'; this.closeT = 2.5; this.menuK = 0.01;
    } else {
      const p0 = D.enter[0]; const h = w.spawnHero(p0.x, p0.z, { ...game.heroStats(), face: angTo(p0, D.enter[1]) });
      this.pose(h, 'walk'); this.phase = 'arrive'; this.path = [...D.enter.slice(1), D.kneel];
    }
    this.panel = null;
  }

  get hero() { return this.g.world.hero; }
  pose(h, anim) { h.state = 'haven'; h.anim = anim; h.animT = 0; h.t = 0; h.vx = h.vz = 0; h.mx = h.mz = 0; h.moveSpeed = 0; }
  setPhase(p) { this.phase = p; this.phaseT = 0; }
  ready() { return this.phase === 'rest' && this.menuK > 0.9 && !!this.panel; }

  // the ShrineScreen, opened beside the kneeling warden (the game's state stays 'haven')
  openPanel() {
    const g = this.g; const handlers = g.shrineHandlers(); const data = g.shrineData();
    this.panel = g.makeScreen('ShrineScreen', data, handlers);
    g.screenName = 'ShrineScreen'; g.screenH = handlers; g.screenData = data;
  }

  // LEAVE: rise, walk out into the rain, fade, back to the map
  onward() {
    if (this.phase !== 'rest') return;
    const h = this.hero; this.pose(h, 'rise'); this.setPhase('rise');
    this.fire.flare(0.5); this.g.sound.play('lamp');
    if (this.panel && this.panel.close) { try { this.panel.close(); } catch (e) { /* */ } }
    this.panel = null; this.g.screenName = null;
  }

  // The flame answers a choice: it leaps, sparks fly, the warden's weapon catches the light.
  react(kind, ok) {
    if (!ok) return;
    const g = this.g, fx = g.fx, h = this.hero, F = this.fire;
    F.flare(kind === 'temper' ? 1.3 : 1); g.sound.play(kind === 'temper' ? 'upgrade' : 'lamp');
    fx.embers(F.x, F.y + 0.6, F.z, 46, [3, 1.5, 0.4]); fx.embers(h.x, 0.7, h.z, 16, [3, 2.2, 0.8]);
    if (kind === 'temper') this.handFx = 2;
    if (kind === 'skill') { fx.shockRing(h.x, h.z, 1.8, [3, 1.8, 0.6], 0.5); }
  }

  // game.refreshHero() rebuilt the warden (a boon changed): keep them kneeling where they are
  adopt(old, h) { h.hp = old.hp; h.tonics = old.tonics; h.x = old.x; h.z = old.z; h.face = old.face; h.state = 'haven'; h.anim = old.anim; h.animT = old.animT; }

  update(dt, inp) {
    const g = this.g, h = this.hero, D = this.D; if (!h) return;
    this.t += dt; this.phaseT += dt;
    g.sound.setMusic('haven');
    if (inp.pausePressed && !inp.back) { g.go('pause'); return; }
    for (const tp of inp.taps) if (this.pauseRect && tp.x >= this.pauseRect.x && tp.x <= this.pauseRect.x + this.pauseRect.w && tp.y >= this.pauseRect.y && tp.y <= this.pauseRect.y + this.pauseRect.h) { g.sound.play('ui'); g.go('pause'); return; }
    // the flame: sparks drift up and away on the wind, now and then a curl of smoke; its light breathes
    if ((this.emberT -= dt) <= 0) { this.emberT = 0.05 + Math.random() * 0.08; g.fx.embers(this.fire.x + (Math.random() - 0.5) * 0.5, this.fire.y + 0.5, this.fire.z + (Math.random() - 0.5) * 0.5, 1, [3, 1.3 + Math.random() * 0.6, 0.35]); if (Math.random() < 0.1) g.fx.mist(this.fire.x, this.fire.y + 1.8, this.fire.z, 1, [0.16, 0.15, 0.15]); }
    if (this.fireSrc) this.fireSrc.intensity = this.fireBase * (1 + this.fire.boost * 0.9);
    const hl = g.atmos.heroLight; hl.color.setHex(0xffa060); hl.intensity = 3.2 * (1 + this.fire.boost * 0.7) * (1 + Math.sin(this.t * 9.3) * 0.06 + Math.sin(this.t * 23.1) * 0.05);
    if (this.handFx > 0 && --this.handFx === 0) { const rig = g.view.get(h); if (rig && rig.handWorld) { const v = new THREE.Vector3(); rig.handWorld(v); g.fx.embers(v.x, v.y, v.z, 22, [3, 2.6, 1.2]); g.fx.sparks(v.x, v.y, v.z, h.face, 12, [3, 2.6, 1.6]); } }
    if (h.anim === 'kneel' && h.animT >= KNEEL) { h.anim = 'rest'; h.animT = 0; }
    this.cardT += dt;
    switch (this.phase) {
      case 'arrive': case 'leave': {
        if (this.phase === 'arrive' && this.phaseT > 0.4 && (inp.confirm || inp.taps.length)) { h.x = D.kneel.x; h.z = D.kneel.z; this.path = []; }
        const p = this.path[0];
        if (!p) { if (this.phase === 'arrive') { h.anim = 'idle'; h.animT = 0; this.setPhase('turn'); } break; }
        const dx = p.x - h.x, dz = p.z - h.z, d = Math.hypot(dx, dz); const step = WALK * dt;
        h.face = turnTo(h.face, Math.atan2(dx, dz), dt * 7);
        if (d <= step) { h.x = p.x; h.z = p.z; this.path.shift(); } else { h.x += dx / d * step; h.z += dz / d * step; }
        if (h.anim !== 'walk') { h.anim = 'walk'; h.animT = 0; }
        if (this.phase === 'leave') {
          if (this.phaseT > 1.5 && !g.leaving) { g.leaving = true; g.fadeOut = 0; }
          if (this.phaseT > 2.15) { g.leaving = false; const f = this.onLeave; this.onLeave = null; if (f) f(); return; }
        }
        break;
      }
      case 'turn': {
        const want = angTo(h, D.fire); h.face = turnTo(h.face, want, dt * 5);
        if (Math.abs(want - h.face) % TAU < 0.05 || this.phaseT > 0.6) { h.face = want; this.pose(h, 'kneel'); this.setPhase('kneel'); this.fire.flare(0.9); g.sound.play('lamp'); g.fx.embers(this.fire.x, this.fire.y + 0.5, this.fire.z, 30, [3, 1.5, 0.4]); }
        break;
      }
      case 'kneel': if (this.phaseT >= KNEEL + 0.25) this.setPhase('rest'); break;
      case 'rest': {
        this.menuK = Math.min(1, this.menuK + dt * 2.6); this.closeT += dt;
        if (!this.panel && this.menuK > 0.3) this.openPanel();
        if (this.panel && this.menuK > 0.5) { try { this.panel.update(dt, inp); } catch (err) { console.error('bellmourn: shrine screen', err); } }
        break;
      }
      case 'rise': {
        this.menuK = Math.max(0, this.menuK - dt * 3);
        if (this.phaseT >= RISE) { h.state = 'haven'; this.path = D.leave.map((p) => ({ ...p })); this.setPhase('leave'); h.anim = 'walk'; h.animT = 0; }
        break;
      }
    }
  }

  // where the screen leaves room for the scene (the ShrineScreen may say: layout(ui) -> { freeX0, freeX1 })
  free(ui) { const P = this.panel; if (P && typeof P.layout === 'function') { try { const l = P.layout(ui); if (l && l.freeX1 > l.freeX0) return l; } catch (e) { /* */ } } return { freeX0: Math.round(ui.safe.l), freeX1: Math.round(ui.w * 0.47) }; }

  // The camera follows the warden in, then frames the flame and the kneeling warden in the part of the screen the
  // panel leaves free, slowly closing in.
  camera() {
    const g = this.g, ui = g.ui, r = g.r, h = this.hero, D = this.D;
    const lay = this.free(ui); const freeW = Math.max(60, lay.freeX1 - lay.freeX0); const freeC = (lay.freeX0 + lay.freeX1) / 2;
    const zEnd = Math.max(0.9, Math.min(2.0, freeW / 74, ui.h / 88)), z0 = Math.min(zEnd, 1.3);
    let follow = 0;
    if (this.phase === 'arrive') { const left = this.pathLeft(); follow = Math.min(0.42, left / 7); }
    else if (this.phase === 'leave') follow = ease(this.phaseT / 1.4);
    const zoomRest = z0 + (zEnd - z0) * ease(this.closeT / 10);
    const zoom = this.phase === 'arrive' ? 1.1 + (z0 - 1.1) * (1 - follow) : (this.phase === 'leave' ? zoomRest + (1.1 - zoomRest) * follow : zoomRest);
    const offPx = (ui.w / 2 - freeC) * ease(Math.max(this.menuK, this.phase === 'kneel' || this.phase === 'turn' ? 0.6 : 0)) * (1 - follow);
    const zNow = Math.max(0.5, g.zoom || zoom);
    const tgt = new THREE.Vector3(D.frame.x, D.frame.y, D.frame.z).addScaledVector(r.right, offPx / (16 * zNow));
    tgt.lerp(new THREE.Vector3(h.x, 0.8, h.z), follow);
    return { target: tgt, zoom };
  }
  pathLeft() { const h = this.hero; let d = 0, px = h.x, pz = h.z; for (const p of this.path || []) { d += Math.hypot(p.x - px, p.z - pz); px = p.x; pz = p.z; } return d; }

  draw(ui, dt, active) {
    const g = this.g, W = ui.w;
    const lay = this.free(ui); const freeW = lay.freeX1 - lay.freeX0, freeC = Math.round((lay.freeX0 + lay.freeX1) / 2);
    if (this.cardT < 6) {
      const a = Math.min(1, this.cardT * 1.2, Math.max(0, (5.5 - this.cardT) * 1.2)); const cx = this.phase === 'arrive' ? Math.round(W / 2) : freeC;
      const big = this.phase === 'arrive' || ui.measure('THE HAVEN', 2) <= freeW + 16;
      if (a > 0) { ui.text(ACT_SUP[this.act] || ACT_SUP[1], cx, 14, { align: 'center', color: COL.red, alpha: a }); ui.text('THE HAVEN', cx, 25, { align: 'center', color: COL.white, scale: big ? 2 : 1, alpha: a }); }
    }
    if (!active) { this.pauseRect = null; return; }
    if (this.panel && this.menuK > 0.01) { const a0 = ui.g.globalAlpha; ui.g.globalAlpha = a0 * ease(this.menuK); try { this.panel.draw(ui, dt); } catch (err) { console.error('bellmourn: shrine draw', err); } ui.g.globalAlpha = a0; }
    if (g.inputMode === 'touch' && this.phase === 'rest' && this.cardT > 5.5) {
      const r = 9, cx = lay.freeX0 + 3 + r, cy = 6 + r; const a0 = ui.g.globalAlpha; ui.g.globalAlpha = 0.6; ui.circle(cx, cy, r, '#101418'); ui.ring(cx, cy, r, '#8a8070'); ui.g.globalAlpha = 0.95; ui.text('II', cx, cy - 3, { align: 'center', shadow: false }); ui.g.globalAlpha = a0;
      this.pauseRect = { x: cx - r - 3, y: cy - r - 4, w: 2 * r + 6, h: 2 * r + 8 };
    } else this.pauseRect = null;
  }
}
