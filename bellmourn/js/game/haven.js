// The Haven between the districts: the warden walks in out of the rain, kneels by the fire and rests
// while you spend what the district gave you (the menu sits beside them, lampmenu.js); every choice
// is answered by the fire, the sound and the warden; ONWARD and they rise and walk out into the next
// district. The first visit carries a short guide. The scene itself is world/haven.js. The other wardens
// who have joined rest round the shrine (Sister Ash keeps it even before she joins).
import * as THREE from '../../vendor/three.module.min.js';
import { COL } from '../engine/ui.js';
import { ACT2, ACT3 } from './story.js';
import { puppet } from './cutscene.js';
import { WARDENS } from './scenes/cast.js';

const WALK = 1.75;             // m/s, walking in and out
const KNEEL = 0.6, RISE = 0.7; // the clips' lengths (anims.js)
const TAU = Math.PI * 2;
const ease = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const angTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const turnTo = (a, b, max) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return a + Math.max(-max, Math.min(max, d)); };

// The first visit's guide: each step says one thing; until() moves it on.
const INTRO = [
  // PROPOSAL (docs/STORY_BIBLE.md): the fire comes from the bell's forge; embers are freed voices
  { text: 'BETWEEN THE DISTRICTS THE WARDENS REST HERE, BY A FIRE LIT FROM THE GREAT BELL\'S FORGE.', until: (H) => H.introT > 5 },
  { text: { touch: 'SKILLS: TAP A SKILL, THEN THE BUTTON BELOW TO SPEND YOUR POINT.', key: 'SKILLS: UP AND DOWN PICK A SKILL, ENTER SPENDS YOUR POINT.', pad: 'SKILLS: PICK A SKILL, A SPENDS YOUR POINT.' },
    point: 'learn', enter: (H) => H.g.lamp.reset(1), until: (H) => H.g.save.heroes[H.g.save.hero].points <= 0 || H.g.lamp.tab !== 1 || H.introT > 18 },
  { text: 'EMBERS ARE THE VOICES YOU FREED: THEY BUY GEAR AND WARES. WARDEN CHANGES HERO. THE MAP TAKES YOU BACK.', until: (H) => H.introT > 7 },
  { text: { touch: 'WHEN YOU ARE READY, TAP ONWARD.', key: 'WHEN YOU ARE READY, CHOOSE ONWARD.', pad: 'WHEN YOU ARE READY, CHOOSE ONWARD.' }, point: 'onward', enter: (H) => { H.g.save.havenIntro = true; H.g.persist(); }, until: () => false },
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
    this.dest = this.next; this.mates = [];
  }

  // The wardens resting round the shrine: everyone who has joined but the one at the fire (and Sister Ash,
  // who keeps the Haven before she joins). They live in world.ents (the Haven never steps the simulation).
  syncMates() {
    const g = this.g, w = g.world, S = g.save, D = this.D; if (!w) return;
    const want = WARDENS.filter((id) => id !== S.hero && (id === 'lamplighter' || (S.unlocked || []).includes(id)));
    const key = want.join(',') + '|' + S.hero; if (key === this.mateKey) return; this.mateKey = key;
    w.ents = w.ents.filter((e) => !e.havenMate); this.mates = [];
    const F = D.fire; const spots = [[-1.1, -1.7, 'idle'], [0.4, -2.6, 'rest'], [-1.8, 1.5, 'idle'], [1.3, -2.2, 'idle'], [-2.3, -0.9, 'rest'], [-0.6, 1.9, 'idle'], [1.6, 0.2, 'rest']];
    want.forEach((id, i) => {
      // Sister Ash keeps her place by the fire (where she stands in the first visit's scene)
      const o = id === 'lamplighter' ? [(D.statue.x - F.x) / 2 + 0.2, 1.15, 'idle'] : spots[i % spots.length]; const e = puppet(g, 'mate:' + id, { hero: id }); e.x = F.x + o[0]; e.z = F.z + o[1];
      e.face = angTo(e, F) + (o[2] === 'idle' ? 0.25 : 0); e.anim = o[2]; e.animT = Math.random() * 3; e.state = 'haven'; e.havenMate = true; w.ents.push(e); this.mates.push(e);
    });
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
    g.sound.setMusic('haven'); this.syncMates();
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
    const lay = g.lamp.layout(ui); const freeW = Math.max(60, lay.freeX1 - lay.freeX0); const freeC = (lay.freeX0 + lay.freeX1) / 2;
    const zEnd = Math.max(0.9, Math.min(2.0, freeW / 74, ui.h / 88)), z0 = Math.min(zEnd, 1.3);
    // the group: the statue, the fire and the kneeling place (world/haven.js)
    let follow = 0; // 1 = follow the walking warden, 0 = frame the group
    if (this.phase === 'arrive') { const left = this.pathLeft(); follow = Math.min(0.42, left / 7); } // the shrine and the warden both in view
    else if (this.phase === 'leave') follow = ease(this.phaseT / 1.4);
    const zoomRest = z0 + (zEnd - z0) * ease(this.closeT / 10);
    const zoom = this.phase === 'arrive' ? 1.1 + (z0 - 1.1) * (1 - follow) : (this.phase === 'leave' ? zoomRest + (1.1 - zoomRest) * follow : zoomRest);
    // put the group's centre in the middle of the free area once the menu is in
    const offPx = (ui.w / 2 - freeC) * ease(Math.max(this.menuK, this.phase === 'kneel' || this.phase === 'turn' ? 0.6 : 0)) * (1 - follow);
    const zNow = Math.max(0.5, g.zoom || zoom);
    const tgt = new THREE.Vector3(D.frame.x, D.frame.y, D.frame.z).addScaledVector(r.right, offPx / (16 * zNow));
    const fol = new THREE.Vector3(h.x, 0.8, h.z);
    tgt.lerp(fol, follow);
    return { target: tgt, zoom };
  }
  pathLeft() { const h = this.hero; let d = 0, px = h.x, pz = h.z; for (const p of this.path || []) { d += Math.hypot(p.x - px, p.z - pz); px = p.x; pz = p.z; } return d; }

  draw(ui, dt, active) {
    const g = this.g, W = ui.w;
    const lay = g.lamp.layout(ui); const freeW = lay.freeX1 - lay.freeX0, freeC = Math.round((lay.freeX0 + lay.freeX1) / 2);
    // the place's name as the warden comes in (centred in the free middle once the menu is in)
    if (this.cardT < 6) {
      const a = Math.min(1, this.cardT * 1.2, Math.max(0, (5.5 - this.cardT) * 1.2)); const cx = this.phase === 'arrive' ? Math.round(W / 2) : freeC;
      const big = this.phase === 'arrive' || ui.measure('THE HAVEN', 2) <= freeW + 16;
      if (a > 0) { ui.text(ACT3.includes(this.next) ? 'ACT III: THE WHEEL' : (ACT2.includes(this.next) ? 'ACT II: BEYOND THE WALLS' : 'BETWEEN THE DISTRICTS'), cx, 14, { align: 'center', color: COL.red, alpha: a }); ui.text('THE HAVEN', cx, 25, { align: 'center', color: COL.white, scale: big ? 2 : 1, alpha: a }); }
    }
    if (!active) { this.pauseRect = null; return; } // paused (or the controls, the settings): their own screen, not the menu under it
    // the first visit's guide speaks inside the panel, where the description goes, and points at what it means
    const s = this.intro >= 0 && this.phase === 'rest' ? INTRO[this.intro] : null;
    const guide = s ? { text: typeof s.text === 'string' ? s.text : (s.text[g.inputMode] || s.text.key), point: s.point, n: this.intro + 1, of: INTRO.length } : null;
    if (this.menuK > 0.01) g.lamp.draw(ui, ease(this.menuK), guide);
    // a pause button for touch (the district's touch buttons are not shown here), top of the free middle
    if (g.inputMode === 'touch' && this.phase === 'rest' && this.cardT > 5.5) {
      const r = 9, cx = lay.freeX0 + 3 + r, cy = 6 + r; const a0 = ui.g.globalAlpha; ui.g.globalAlpha = 0.6; ui.circle(cx, cy, r, '#101418'); ui.ring(cx, cy, r, '#8a8070'); ui.g.globalAlpha = 0.95; ui.text('II', cx, cy - 3, { align: 'center', shadow: false }); ui.g.globalAlpha = a0;
      this.pauseRect = { x: cx - r - 3, y: cy - r - 4, w: 2 * r + 6, h: 2 * r + 8 };
    } else this.pauseRect = null;
  }
}
