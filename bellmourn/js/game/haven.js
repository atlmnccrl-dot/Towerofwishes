// The Haven between the districts: the warden walks in out of the rain, kneels by the fire and rests
// while you spend what the district gave you (the menu sits beside them, lampmenu.js); every choice
// is answered by the fire, the sound and the warden; ONWARD and they rise and walk out into the next
// district. The first visit carries a short guide. The scene itself is world/haven.js.
import * as THREE from '../../vendor/three.module.min.js';
import { COL } from '../engine/ui.js';

const WALK = 1.75;             // m/s, walking in and out
const KNEEL = 0.6, RISE = 0.7; // the clips' lengths (anims.js)
const TAU = Math.PI * 2;
const ease = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const angTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const turnTo = (a, b, max) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return a + Math.max(-max, Math.min(max, d)); };

// The first visit's guide: each step says one thing; until() moves it on.
const INTRO = [
  { text: 'THE HAVEN. BETWEEN THE DISTRICTS THE WARDENS REST HERE, BY THE LAST FIRE IN THE CITY.', until: (H) => H.introT > 4.5 },
  { text: 'SKILLS: SPEND YOUR POINT. EVERY RANK HITS HARDER AND COOLS FASTER.', enter: (H) => H.g.lamp.reset(1), until: (H) => H.g.save.heroes[H.g.save.hero].points <= 0 || H.g.lamp.tab !== 1 || H.introT > 16 },
  { text: 'ARMS, RELICS AND THE SHOP TAKE EMBERS. HERO CHANGES WARDEN. THE MAP TAKES YOU BACK.', until: (H) => H.introT > 6.5 },
  { text: 'WHEN YOU ARE READY, CHOOSE ONWARD.', enter: (H) => { H.g.save.havenIntro = true; H.g.persist(); }, until: () => false },
];

export class Haven {
  // opts: next (district id ONWARD leads to), resume (start already kneeling), first (run the guide)
  constructor(game, L, opts = {}) {
    this.g = game; this.L = L; this.D = L.def; this.fire = L.fire; this.next = opts.next;
    this.t = 0; this.phaseT = 0; this.menuK = 0; this.closeT = 0; this.emberT = 0; this.handFx = 0; this.cardT = opts.resume ? 9 : 0;
    this.intro = opts.first ? 0 : -1; this.introT = 0;
    this.fireSrc = game.atmos.sources.find((s) => s.tag === 'havenFire'); this.fireBase = this.fireSrc ? this.fireSrc.intensity : 0;
    const D = this.D; const w = game.world;
    if (opts.resume) {
      const h = w.spawnHero(D.kneel.x, D.kneel.z, { ...game.heroStats(), face: angTo(D.kneel, D.fire) });
      this.pose(h, 'rest'); this.phase = 'rest'; this.closeT = 2.5; this.menuK = 0.01;
    } else {
      const p0 = D.enter[0]; const h = w.spawnHero(p0.x, p0.z, { ...game.heroStats(), face: angTo(p0, D.enter[1]) });
      this.pose(h, 'walk'); this.phase = 'arrive'; this.path = [...D.enter.slice(1), D.kneel];
    }
    this.dest = this.next;
  }

  get hero() { return this.g.world.hero; }
  pose(h, anim) { h.state = 'haven'; h.anim = anim; h.animT = 0; h.t = 0; h.vx = h.vz = 0; h.mx = h.mz = 0; h.moveSpeed = 0; }
  setPhase(p) { this.phase = p; this.phaseT = 0; }
  ready() { return this.phase === 'rest' && this.menuK > 0.9; }

  // ONWARD (or a district picked on the map): rise, walk out, fade, load it
  onward(id = this.next) {
    if (this.phase !== 'rest') return;
    this.dest = id || this.next; const h = this.hero; this.pose(h, 'rise'); this.setPhase('rise');
    this.fire.flare(0.5); this.g.sound.play('lamp');
    if (this.intro >= 0) { this.g.save.havenIntro = true; this.intro = -1; }
    this.g.save.inHaven = false; this.g.persist();
  }

  // The menu tells what a choice did: the fire, the sound and the warden answer.
  react(kind, ok) {
    if (!ok) return;
    const g = this.g, fx = g.fx, h = this.hero, F = this.fire;
    if (kind === 'skill' || kind === 'temper' || kind === 'buy') {
      F.flare(kind === 'temper' ? 1.2 : 1); g.sound.play('upgrade');
      fx.embers(F.x, F.y + 0.5, F.z, 40, [3, 1.5, 0.4]); fx.embers(h.x, 0.7, h.z, 16, [3, 2.2, 0.8]);
      if (kind === 'temper') this.handFx = 2;
    } else if (kind === 'weapon' || kind === 'equip' || kind === 'relic') {
      F.flare(0.6); g.sound.play('equip'); this.handFx = kind === 'weapon' ? 2 : 0;
      if (kind !== 'weapon') fx.embers(h.x, 0.9, h.z, 18, [3, 2.4, 1.0]);
    } else if (kind === 'hero') {
      F.flare(1.3); g.sound.play('equip'); g.sound.play('lamp', { delay: 0.1 });
      fx.embers(F.x, F.y + 0.5, F.z, 50, [3, 1.5, 0.4]);
    }
  }

  // game.refreshHero() rebuilt the warden (a new skill, weapon, relic or another warden): keep them
  // kneeling; a new warden kneels down in the old one's place out of a breath of smoke and embers.
  adopt(old, h) {
    h.hp = h.maxHp; h.tonics = h.stats.maxTonics; h.x = old.x; h.z = old.z; h.face = old.face;
    if (old.heroId !== h.heroId) {
      this.pose(h, this.phase === 'rest' ? 'kneel' : old.anim);
      this.g.fx.mist(h.x, 0.8, h.z, 26, [0.42, 0.4, 0.38]); this.g.fx.embers(h.x, 0.6, h.z, 30, [3, 1.8, 0.6]);
    } else { h.state = 'haven'; h.anim = old.anim; h.animT = old.animT; }
  }

  update(dt, inp) {
    const g = this.g, h = this.hero, D = this.D; if (!h) return;
    this.t += dt; this.phaseT += dt;
    g.sound.setMusic('haven');
    if (inp.pausePressed && !inp.back) { g.go('pause'); return; }
    for (const tp of inp.taps) if (this.pauseRect && tp.x >= this.pauseRect.x && tp.x <= this.pauseRect.x + this.pauseRect.w && tp.y >= this.pauseRect.y && tp.y <= this.pauseRect.y + this.pauseRect.h) { g.sound.play('ui'); g.go('pause'); return; }
    // the fire: sparks drift up, now and then a curl of smoke; its light breathes with the flare
    if ((this.emberT -= dt) <= 0) { this.emberT = 0.08 + Math.random() * 0.1; g.fx.embers(this.fire.x + (Math.random() - 0.5) * 0.5, this.fire.y + 0.45, this.fire.z + (Math.random() - 0.5) * 0.5, 1, [3, 1.3 + Math.random() * 0.6, 0.35]); if (Math.random() < 0.12) g.fx.mist(this.fire.x, this.fire.y + 1.6, this.fire.z, 1, [0.16, 0.15, 0.15]); }
    if (this.fireSrc) this.fireSrc.intensity = this.fireBase * (1 + this.fire.boost * 0.9);
    // the firelight on the warden's near side (the light that walks with the hero turns warm here and
    // breathes with the flame)
    const hl = g.atmos.heroLight; hl.color.setHex(0xffa060); hl.intensity = 3.2 * (1 + this.fire.boost * 0.7) * (1 + Math.sin(this.t * 9.3) * 0.06 + Math.sin(this.t * 23.1) * 0.05);
    // a new weapon (or a tempered one) catches the light in the warden's hand once its rig exists
    if (this.handFx > 0 && --this.handFx === 0) { const rig = g.view.get(h); if (rig && rig.handWorld) { const v = new THREE.Vector3(); rig.handWorld(v); g.fx.embers(v.x, v.y, v.z, 22, [3, 2.6, 1.2]); g.fx.sparks(v.x, v.y, v.z, h.face, 12, [3, 2.6, 1.6]); } }
    if (h.anim === 'kneel' && h.animT >= KNEEL) { h.anim = 'rest'; h.animT = 0; }
    this.cardT += dt;
    switch (this.phase) {
      case 'arrive': case 'leave': {
        // a tap or ENTER while walking in: straight to the fire
        if (this.phase === 'arrive' && this.phaseT > 0.4 && (inp.confirm || inp.taps.length)) { h.x = D.kneel.x; h.z = D.kneel.z; this.path = []; }
        const p = this.path[0];
        if (!p) { if (this.phase === 'arrive') { h.anim = 'idle'; h.animT = 0; this.setPhase('turn'); } break; }
        const dx = p.x - h.x, dz = p.z - h.z, d = Math.hypot(dx, dz); const step = WALK * dt;
        h.face = turnTo(h.face, Math.atan2(dx, dz), dt * 7);
        if (d <= step) { h.x = p.x; h.z = p.z; this.path.shift(); } else { h.x += dx / d * step; h.z += dz / d * step; }
        if (h.anim !== 'walk') { h.anim = 'walk'; h.animT = 0; }
        if (this.phase === 'leave') {
          if (this.phaseT > 1.5 && !g.leaving) { g.leaving = true; g.fadeOut = 0; }
          if (this.phaseT > 2.15) { g.leaving = false; g.enterLevel(this.dest, false); return; }
        }
        break;
      }
      case 'turn': {
        const want = angTo(h, D.fire); h.face = turnTo(h.face, want, dt * 5);
        if (Math.abs(want - h.face) % TAU < 0.05 || this.phaseT > 0.6) { h.face = want; this.pose(h, 'kneel'); this.setPhase('kneel'); this.fire.flare(0.8); g.sound.play('lamp'); g.fx.embers(this.fire.x, this.fire.y + 0.5, this.fire.z, 30, [3, 1.5, 0.4]); }
        break;
      }
      case 'kneel': if (this.phaseT >= KNEEL + 0.25) this.setPhase('rest'); break;
      case 'rest': {
        this.menuK = Math.min(1, this.menuK + dt * 2.6); this.closeT += dt;
        if (this.intro >= 0) this.runIntro(dt);
        if (this.menuK > 0.5 && g.lamp.update(dt, inp) === 'onward') this.onward(this.next);
        break;
      }
      case 'rise': {
        this.menuK = Math.max(0, this.menuK - dt * 3);
        if (this.phaseT >= RISE) { h.state = 'haven'; this.path = D.leave.map((p) => ({ ...p })); this.setPhase('leave'); h.anim = 'walk'; h.animT = 0; }
        break;
      }
    }
  }

  runIntro(dt) {
    const s = INTRO[this.intro]; if (!s) { this.intro = -1; return; }
    if (!this.introStarted) { this.introStarted = true; this.introT = 0; if (s.enter) s.enter(this); }
    this.introT += dt;
    if (s.until(this)) { this.intro++; this.introStarted = false; if (this.intro >= INTRO.length) this.intro = -1; }
  }

  // Where the camera looks and how close: it follows the warden in, then frames the statue, the fire
  // and the kneeling warden in the part of the screen the menu leaves free, and slowly closes in.
  camera() {
    const g = this.g, ui = g.ui, r = g.r, h = this.hero, D = this.D;
    const lay = g.lamp.layout(ui); const freeW = Math.max(60, lay.x0 - 4);
    // while the guide is up it takes the bottom of the free area: the group frames above it
    const guide = this.intro >= 0 && this.phase === 'rest' ? (this.introH || 0) + 8 : 0; this.guideK = (this.guideK || 0) + ((guide ? 1 : 0) - (this.guideK || 0)) * 0.05;
    const zEnd = Math.max(1.0, Math.min(2.0, freeW / 74, (ui.h - guide) / 88)), z0 = Math.min(zEnd, 1.3);
    // the group: the statue, the fire and the kneeling place (world/haven.js)
    let follow = 0; // 1 = follow the walking warden, 0 = frame the group
    if (this.phase === 'arrive') { const left = this.pathLeft(); follow = Math.min(0.42, left / 7); } // the shrine and the warden both in view
    else if (this.phase === 'leave') follow = ease(this.phaseT / 1.4);
    const zoomRest = z0 + (zEnd - z0) * ease(this.closeT / 10);
    const zoom = this.phase === 'arrive' ? 1.1 + (z0 - 1.1) * (1 - follow) : (this.phase === 'leave' ? zoomRest + (1.1 - zoomRest) * follow : zoomRest);
    // put the group's centre in the middle of the free area once the menu is in
    const offPx = (ui.w / 2 - freeW / 2) * ease(Math.max(this.menuK, this.phase === 'kneel' || this.phase === 'turn' ? 0.6 : 0)) * (1 - follow);
    const zNow = Math.max(0.5, g.zoom || zoom);
    const tgt = new THREE.Vector3(D.frame.x, D.frame.y, D.frame.z).addScaledVector(r.right, offPx / (16 * zNow)).addScaledVector(r.up, -this.guideK * ((this.introH || 0) + 8) / 2 / (16 * zNow));
    const fol = new THREE.Vector3(h.x, 0.8, h.z);
    tgt.lerp(fol, follow);
    return { target: tgt, zoom };
  }
  pathLeft() { const h = this.hero; let d = 0, px = h.x, pz = h.z; for (const p of this.path || []) { d += Math.hypot(p.x - px, p.z - pz); px = p.x; pz = p.z; } return d; }

  draw(ui, dt, active) {
    const g = this.g, W = ui.w, H = ui.h;
    const lay = g.lamp.layout(ui); const freeW = lay.x0 - 4; const L = 6 + Math.round(ui.safe.l || 0);
    // the place's name as the warden comes in
    if (this.cardT < 6) {
      const a = Math.min(1, this.cardT * 1.2, Math.max(0, (5.5 - this.cardT) * 1.2)); const cx = Math.round(this.phase === 'arrive' ? W / 2 : Math.max(60, freeW / 2));
      if (a > 0) { ui.text('BETWEEN THE DISTRICTS', cx, 14, { align: 'center', color: COL.red, alpha: a }); ui.text('THE HAVEN', cx, 25, { align: 'center', color: COL.white, scale: 2, alpha: a }); }
    }
    if (!active) { this.pauseRect = null; return; } // paused (or the controls, the settings): their own screen, not the menu under it
    if (this.menuK > 0.01) g.lamp.draw(ui, ease(this.menuK));
    // the guide (first visit) at the bottom of the free area
    const s = this.intro >= 0 ? INTRO[this.intro] : null;
    if (s && this.phase === 'rest') {
      const pw = Math.max(110, Math.min(freeW - 10, 220)); const lines = ui.wrap(s.text, pw - 10); const ph = 13 + lines.length * 9; const x0 = Math.max(L, Math.round(freeW / 2 - pw / 2)), y0 = H - ph - 6; this.introH = ph;
      ui.frame(x0, y0, pw, ph, 'rgba(8,10,14,0.82)', '#6a5a38');
      ui.text('THE HAVEN ' + (this.intro + 1) + '/' + INTRO.length, x0 + 5, y0 + 3, { color: COL.dim, shadow: false });
      lines.forEach((l, k) => ui.text(l, x0 + 5, y0 + 12 + k * 9, { color: COL.white, shadow: false }));
    } else if (this.phase === 'rest' && this.menuK > 0.9 && this.phaseT < 16) {
      const mode = g.inputMode; const hint = mode === 'touch' ? ['TAP A TAB.', 'TAP TWICE TO CHOOSE.'] : (mode === 'pad' ? ['LB RB  TABS', 'A  CHOOSE', 'B  ONWARD'] : ['Q E  TABS', 'ENTER  CHOOSE', 'ESC  ONWARD', 'P  PAUSE']);
      const ha = Math.min(1, (16 - this.phaseT) / 2);
      hint.forEach((l, k) => ui.text(l, L, H - 10 - (hint.length - 1 - k) * 9, { color: '#7a7262', alpha: ha }));
    }
    // a pause button for touch (the district's touch buttons are not shown here)
    if (g.inputMode === 'touch' && this.phase === 'rest' && this.cardT > 5.5) { const r = 7, cx = L + r, cy = 6 + r; const a0 = ui.g.globalAlpha; ui.g.globalAlpha = 0.5; ui.circle(cx, cy, r, '#101418'); ui.ring(cx, cy, r, '#8a8070'); ui.g.globalAlpha = 0.95; ui.text('II', cx, cy - 3, { align: 'center', shadow: false }); ui.g.globalAlpha = a0; this.pauseRect = { x: cx - r - 3, y: cy - r - 3, w: 2 * r + 6, h: 2 * r + 6 }; }
    else this.pauseRect = null;
  }
}
