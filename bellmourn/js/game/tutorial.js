// The first run's Old Road: one clean, cinematic duel with the crow-masked oath-sworn warden (RUN_DESIGN.md
// section 9). It teaches by moments, not walls of text: one word at the right beat. STRIKE (land three blows),
// DASH (slip his thrusts), then a slow-motion perfect dodge (the world all but stops on his great lunge until
// you dash), a first boon (CHOOSE), and the ULTIMATE to finish him. Then a striking finish and the title over
// the gate, and the route map. The duel cannot be lost. Later runs walk a short cinematic road instead.
// The game calls update(dt, events, input), draw(ui), timeK() (slow motion), filter(input), camera().
import * as THREE from '../../vendor/three.module.min.js';
import { ATTACKS } from './defs.js';
import { FALLBACK_LOOKS } from './scenes/cast.js';
import { drawLineBox } from './cutscene.js';
import { COL } from '../engine/ui.js';

const ease = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
// the crow's great lunge: a long windup, a long reach (the perfect-dodge beat)
const LUNGE = { ...ATTACKS.thrust, name: 'lunge', windup: 0.95, active: 1.1, dur: 1.6, lunge: 7.5, range: 3.2, width: 1.0, teleRange: 4.6, dmg: 10 };
const HINT = { // PROPOSAL: the small key hint under each word
  STRIKE: { key: 'J / LEFT CLICK', touch: 'ATK', pad: 'X' }, DASH: { key: 'SPACE', touch: 'DASH', pad: 'A' },
  ULTIMATE: { key: 'Q', touch: 'ULT', pad: 'RB' }, CHOOSE: { key: '', touch: '', pad: '' },
};
export const BEATS = ['intro', 'strike', 'dash', 'perfect', 'boon', 'ult', 'finish', 'title'];

export class Duel {
  constructor(game) {
    this.g = game; this.beat = 'intro'; this.t = 0; this.bt = 0; this.done = false; this.word = null; this.slowK = 1; this.slowT = 0;
    this.hits = 0; this.dashes = 0; this.crow = null; this.freeze = false; this.dodged = false; this.camK = 0; this.bars = 1; this.titleK = 0;
    const h = game.world.hero; h.x = 0; h.z = 6; h.face = Math.PI; game.camFocus.set(h.x, 0, h.z - 2); game.r.focus.copy(game.camFocus);
    game.world.ents = game.world.ents.filter((e) => e === h || e.team !== 'foe');
    this.gate = { x: 0, z: -20 };
  }
  get hero() { return this.g.world.hero; }

  // the word of the beat, big, with a small key hint
  say(word, o = {}) { this.word = { text: word, t: 0, hint: HINT[word], color: o.color || COL.white, sub: o.sub || '' }; this.g.sound.play(o.sound || 'toll', { vol: 0.5 }); }
  go(beat) { this.beat = beat; this.bt = 0; }
  timeK() { return this.slowK; }
  hideHud() { return this.beat === 'intro' || this.beat === 'finish' || this.beat === 'title'; }
  hideTouch() { return this.beat === 'intro' || this.beat === 'finish' || this.beat === 'title' || this.beat === 'boon'; }
  // no fighting in the opening and the ending shots: the warden walks on alone
  filter(inp) {
    if (this.beat === 'intro') { const k = this.bt < 2.1 ? 1 : 0; return { ...inp, mx: 0, mz: -k * 0.55, attackPressed: false, dashPressed: false, ultPressed: false, healPressed: false, attack: false }; }
    if (this.beat === 'finish' || this.beat === 'title') return { ...inp, mx: 0, mz: 0, attackPressed: false, dashPressed: false, ultPressed: false, healPressed: false, attack: false };
    // the dash lessons teach the plain dash: a movement skill on the dash button waits until they are over
    if ((this.beat === 'dash' || this.beat === 'perfect') && this.g.world && this.g.world.hero) { const h = this.g.world.hero, da = h.dashAbility; if (da && da.slot !== undefined && h.cds) h.cds[da.slot] = Math.max(h.cds[da.slot] || 0, 0.5); }
    // the frozen moment: the press itself is the dodge (the dash would crawl at the frozen speed before the sim reported it)
    if (this.beat === 'perfect' && this.freeze && inp.dashPressed) { this.dodge(); return inp; }
    if (this.beat === 'perfect' && this.freeze) return { ...inp, attackPressed: false, attack: false };
    return inp;
  }
  spawnCrow() {
    const g = this.g, w = g.world, h = this.hero; const x = h.x, z = h.z - 6.2;
    const c = this.crow = w.spawnFoe('warden', x, z, { rise: false, passive: true, face: 0 });
    // PROPOSAL: the name; the crow's mask and mail (cast.js)
    c.def = { ...c.def, look: FALLBACK_LOOKS.crow || c.def.look, name: 'The Crow-Masked Warden', shield: false, flinch: 0 };
    c.maxHp = c.hp = 520; c.face = Math.atan2(h.x - c.x, h.z - c.z); c.flinch = 0; c.poise = c.maxPoise = 9999;
    g.fx.mist(x, 1, z, 34, [0.3, 0.32, 0.38]); g.atmos.flash(1); g.sound.play('thunder', { vol: 1, big: true }); g.r.shake(0.4, 0.5);
  }

  update(dt, evs) {
    this.freezeGuard();
    const g = this.g, w = g.world, h = this.hero, c = this.crow; this.t += dt; this.bt += dt;
    if (this.word) this.word.t += dt;
    for (const ev of evs) {
      if (ev.type === 'hit' && c && ev.dst === c) this.hits++;
      if (ev.type === 'dash' && ev.e === h) { this.dashes++; if (this.freeze) this.dodge(); }
      if (ev.type === 'perfect') this.dodged = true;
      if (ev.type === 'special' && this.beat === 'ult') { this.ultT = 0; this.slowFor(1.4, 0.35); g.zoomPunch = 1.35; }
      if (ev.type === 'kill' && c && ev.e === c) this.finish();
      if (ev.type === 'hit' && ev.dst === h && this.beat === 'perfect' && this.lunging) { this.lunging = false; this.freeze = false; this.slowK = 1; this.retryT = 1.2; } // missed: he tries again
    }
    // nobody dies here: the warden is kept on their feet, the crow until the last blow
    if (h && !h.dead) h.hp = Math.max(h.hp, h.maxHp * 0.3);
    if (c && !c.dead && this.beat !== 'ult') c.hp = Math.max(c.hp, c.maxHp * 0.35);
    if (this.slowT > 0) { this.slowT -= dt; if (this.slowT <= 0 && !this.freeze) this.slowK = 1; }
    // the frozen moment drains the colour from the world; the finish too
    if (this.freeze || (this.beat === 'finish' && this.bt < 1.4)) g.r.post.desat = Math.max(g.r.post.desat || 0, this.freeze ? 0.6 : 0.45);
    if (g.sound) g.sound.setMusic(this.beat === 'finish' || this.beat === 'title' ? 'none' : (this.beat === 'intro' ? 'title' : 'boss'));
    const turnCrow = () => { if (c && !c.dead && c.state !== 'windup' && c.state !== 'attack') c.face = Math.atan2(h.x - c.x, h.z - c.z); };
    const near = (d) => { if (!c || c.dead || c.state === 'windup' || c.state === 'attack' || c.state === 'stagger') return; const dx = h.x - c.x, dz = h.z - c.z, L = Math.hypot(dx, dz); if (L > d) { const s = Math.min(L - d, 2.6 * dt); c.x += dx / L * s; c.z += dz / L * s; c.anim = 'walk'; } else if (c.anim === 'walk') c.anim = 'idle'; };
    switch (this.beat) {
      case 'intro':
        if (this.bt > 1.3 && !c) this.spawnCrow();
        if (this.crow) turnCrow();
        if (this.bt > 2.3 && !this.line) { const lead = g.run ? g.run.hero : 'warden'; this.line = { text: lead === 'warden' ? 'OATHBREAKER. YOU SWORE NEVER TO COME BACK.' : 'TURN BACK. THE BELL IS SILENT BY OATH.', t: 0 }; } // PROPOSAL (STORY_BIBLE.md)
        if (this.line) this.line.t += dt;
        this.bars = 1 - ease((this.bt - 4.6) / 0.6);
        if (this.bt > 5.0 || (this.bt > 2.8 && g.input && false)) { this.line = null; this.go('strike'); this.say('STRIKE'); g.ui.clearToasts && g.ui.clearToasts(); }
        break;
      case 'strike':
        turnCrow(); near(1.9);
        if (this.hits >= 3 && !this.passed) { this.passed = true; this.ok(); w._stagger && w._stagger(c, 0.9); this.after = 0.9; }
        if (this.passed && (this.after -= dt) <= 0) { this.passed = false; this.go('dash'); this.say('DASH'); this.dashes = 0; c.ai.passive = false; c.ai.aggro = true; c.ai.cd = 0.4; }
        break;
      case 'dash':
        if (this.dashes >= 2 && this.bt > 2.2 && !this.passed && c.state !== 'windup' && c.state !== 'attack') { this.passed = true; this.ok(); c.ai.passive = true; this.after = 0.8; }
        if (this.passed && (this.after -= dt) <= 0) { this.passed = false; this.go('perfect'); this.word = null; this.retryT = 0.6; this.dodged = false; }
        break;
      case 'perfect': {
        turnCrow();
        if (!this.lunging) {
          near(3.2); this.retryT = (this.retryT || 0) - dt;
          if (this.retryT <= 0 && c.state !== 'stagger' && Math.hypot(h.x - c.x, h.z - c.z) < 4.6) { w.foeAttack(c, LUNGE); this.lunging = true; this.dodgeT = 0; this.slowFor(9, 0.55); }
        } else {
          // the world all but stops just before the blow lands, until the warden dashes
          if (!this.freeze && !this.dodgeT && c.state === 'windup' && c.t >= LUNGE.windup - 0.14) { this.freeze = true; this.slowK = 0.03; this.say('DASH', { color: '#9adcf0', sound: 'perfect' }); }
          if (this.dodgeT) { this.dodgeT += dt; if (this.dodgeT > 0.32 && !this.dodged) { this.dodged = true; g.handleEvents([{ type: 'perfect', e: h }]); w.meter = Math.min(100, w.meter + 22); } }
          if (this.dodged && this.dodgeT > 0.6 && !this.passed) { this.passed = true; this.ok(); this.slowFor(1.0, 0.3); this.after = 1.2; }
          if (c.state !== 'windup' && c.state !== 'attack' && !this.dodgeT && !this.freeze) { this.lunging = false; this.retryT = 0.8; }
        }
        if (this.passed && (this.after -= dt) <= 0) { this.passed = false; this.lunging = false; c.ai.passive = true; if (w._stagger) w._stagger(c, 3); this.go('boon'); this.say('CHOOSE', { color: COL.gold }); this.boonAsked = false; }
        break;
      }
      case 'boon':
        if (!this.boonAsked && this.bt > 0.7) { this.boonAsked = true; g.offerBoon('tutorial', () => { this.go('ult'); this.say('ULTIMATE', { color: '#ff7060' }); w.meter = 100; if (h.meter !== undefined) h.meter = 100; if (c && !c.dead) { c.hp = Math.min(c.hp, Math.round(c.maxHp * 0.16)); c.ai.passive = true; } }); }
        break;
      case 'ult':
        near(2.4); turnCrow(); if (w.meter < 100 && this.ultT === undefined) w.meter = 100;
        if (this.ultT !== undefined) { this.ultT += dt; if (this.ultT > 2.2 && c && !c.dead) { c.hp = 1; w._damage ? w._damage(h, c, 999, { special: true }) : (c.hp = 0); if (!c.dead && w._kill) w._kill(c, h, {}); } }
        break;
      case 'finish':
        this.bars = ease(this.bt / 0.8);
        if (this.bt > 1.2) this.slowK = Math.min(1, this.slowK + dt * 0.8);
        if (this.bt > 2.4) { this.go('title'); g.sound.play('bigBell'); g.sound.setMusic('title'); }
        break;
      case 'title':
        this.titleK = ease((this.bt - 1.6) / 1.4);
        if (this.bt > 7.5 || (this.bt > 3.6 && this.tapped)) this.end();
        break;
    }
    this.tapped = false;
  }
  tap() { this.tapped = true; }
  ok() { this.g.sound.play('uiOk'); if (this.word) this.word.okT = 0.001; }
  slowFor(sec, k) { this.slowT = sec; this.slowK = k; }
  // called every frame by update(): if the frozen moment lasts too long (missed or unregistered press), dodge for the player
  freezeGuard() { if (!this.freeze) { this.freezeAt = 0; return; } const now = performance.now(); if (!this.freezeAt) this.freezeAt = now; if (now - this.freezeAt > 8000) { this.freezeAt = 0; this.dodge(); } }
  dodge() { if (this.dodgeT) return; this.freeze = false; this.dodgeT = 0.001; this.slowK = 1; this.slowT = 0; this.word = null; this.g.sound.play('perfect'); }
  // the last blow: the world slows to a crawl, the bell, a white flash; the crow kneels and falls
  finish() {
    if (this.beat === 'finish' || this.beat === 'title') return;
    const g = this.g, c = this.crow; this.go('finish'); this.word = null; this.slowK = 0.12; this.slowT = 0;
    g.r.post.flash = 0.6; g.flashT = 0.18; g.sound.play('bigBell'); g.sound.play('roar', { vol: 0.5 }); g.r.shake(0.9, 1.0); g.zoomPunch = 1.5;
    if (c) { g.fx.shockRing(c.x, c.z, 8, [3, 2.6, 1.8], 1); g.fx.embers(c.x, 1.2, c.z, 70, [3, 1.8, 0.6]); g.fx.mist(c.x, 1, c.z, 40, [0.3, 0.32, 0.38]); }
  }
  end() {
    if (this.done) return; this.done = true; const g = this.g;
    g.markSeen('tutorial'); g.leaving = true; g.fadeOut = 0;
    g.after(0.7, () => { g.leaving = false; g.duelOn = false; g.tutorial = null; g.openMap(); });
  }

  // the camera: close on the two of them in the duel, the gate and the title at the end
  camera() {
    const g = this.g, h = this.hero, c = this.crow;
    if (this.beat === 'title') { const k = ease(this.bt / 2.4); return { target: new THREE.Vector3(h.x + (this.gate.x - h.x) * k, 2.2 * k, h.z + (this.gate.z - h.z) * k * 0.85), zoom: 1.6 - 0.45 * k }; }
    if (!c || c.dead && this.beat !== 'finish') return { target: new THREE.Vector3(h.x, 0.4, h.z - 1.2), zoom: 1.7 };
    const mid = new THREE.Vector3((h.x + c.x) / 2, 0.6, (h.z + c.z) / 2);
    const d = Math.hypot(h.x - c.x, h.z - c.z); const z = this.beat === 'finish' ? 2.1 : (this.freeze ? 2.0 : Math.max(1.35, Math.min(1.8, 7 / Math.max(1, d))));
    return { target: mid, zoom: z };
  }

  draw(ui, dt) {
    const g = this.g, W = ui.w, H = ui.h;
    if (this.bars > 0.01) ui.letterbox(this.bars);
    if (this.line && this.beat === 'intro') { const a = Math.min(1, this.line.t * 3); drawLineBox(ui, 'THE CROW-MASKED WARDEN', '#b4bac4', this.line.text, a, 'bottom'); } // PROPOSAL
    const wd = this.word;
    if (wd && this.beat !== 'title') {
      const a = Math.min(1, wd.t * 4) * (wd.okT ? Math.max(0, 1 - (wd.okT += dt) * 1.6) : 1); if (a <= 0.01) { if (wd.okT) this.word = null; }
      else {
        // big, but above the two of them (they stand in the middle of the frame)
        const pop = wd.t < 0.18 ? 1 : 0; const sc = Math.max(2, Math.min(this.freeze ? 4 : 3, Math.floor((W * 0.34) / Math.max(1, ui.measure(wd.text))))) + pop;
        const y = Math.round(Math.max(this.bars > 0.05 ? H * 0.13 : 8, H * 0.08) + (this.freeze ? Math.sin(this.t * 14) : 0));
        ui.text(wd.text, W / 2, y, { align: 'center', scale: sc, color: wd.okT ? COL.gold : wd.color, alpha: a });
        const hint = wd.hint && (wd.hint[g.inputMode] ?? wd.hint.key); if (hint) ui.text(hint, W / 2, y + sc * 7 + 5, { align: 'center', color: COL.dim, alpha: a * 0.9 });
      }
    }
    if (this.beat === 'title' && this.titleK > 0) {
      const a = this.titleK; ui.letterbox(1);
      ui.logo(W / 2, Math.round(H * 0.26), a);
      ui.text('RING THE BELL. BRING THE DAWN.', W / 2, Math.round(H * 0.26) + 34, { align: 'center', color: COL.dim, alpha: a });
      if (this.bt > 3.6) ui.text(g.inputMode === 'touch' ? 'TAP TO GO ON' : 'ENTER TO GO ON', W / 2, H - 14, { align: 'center', color: '#6a6252', alpha: 0.5 + 0.3 * Math.sin(this.t * 3) });
    }
  }
}
