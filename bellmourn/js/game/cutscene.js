// Cutscenes, played in the real game world with the real rigs. A scene is a script: a list of steps run
// one after another (par() runs several at once). Steps move the camera, spawn actors (any warden, any
// foe or boss look, or the hero and the boss already in the world), walk and turn them, play their clips,
// speak lines, wait, fade, flash lightning, shake, burst effects, play sounds and music, offer a choice and
// set story flags. Letterbox bars frame it; each line shows the speaker's name in their colour over a dark
// box in the 5x7 font, at most two lines a box; a tap or a key moves on. SKIP (top right, or Esc / B)
// skips the scene but never what it gives: flags and kept calls still run, and a choice still waits.
//
// The world's simulation is frozen while a scene plays; the scene poses its own actors (puppets that live
// outside world.ents, drawn by the same ActorView) and may borrow the hero or the boss.
import * as THREE from '../../vendor/three.module.min.js';
import { HEROES, WEAPONS } from './heroes.js';
import { FOES, BOSSES } from './defs.js';
import { UNITS } from './units.js';
import { BOSSES2 } from './bosses2.js';
import { COL } from '../engine/ui.js';
import { SPEAKERS, FALLBACK_LOOKS } from './scenes/cast.js';

const TAU = Math.PI * 2;
const ease = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const turnTo = (a, b, max) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return a + Math.max(-max, Math.min(max, d)); };
let UID = 1000000; // puppet ids never meet the world's own

// ------------------------------------------------------------------ steps (plain objects; scripts build them)
export const cam = (at, o = {}) => ({ k: 'cam', at, zoom: o.zoom, dur: o.dur ?? 1.2, wait: o.wait ?? true, y: o.y, off: o.off });
export const spawn = (id, spec) => ({ k: 'spawn', id, spec });
export const remove = (id) => ({ k: 'remove', id });
export const walk = (id, to, o = {}) => ({ k: 'walk', id, to, speed: o.speed, run: o.run, wait: o.wait ?? true, end: o.end, face: o.face });
export const face = (id, to, o = {}) => ({ k: 'face', id, to, dur: o.dur ?? 0.35 });
export const anim = (id, name, o = {}) => ({ k: 'anim', id, name, then: o.then, after: o.after, hold: o.hold });
export const say = (who, text, o = {}) => ({ k: 'say', who, text, ...o });
export const wait = (sec) => ({ k: 'wait', sec });
export const fade = (to, dur = 0.6) => ({ k: 'fade', to, dur });
export const flash = (strength = 1) => ({ k: 'call', fn: (cs) => cs.g.atmos.flash(strength) });
export const shake = (amt = 0.6, time = 0.5) => ({ k: 'call', fn: (cs) => { if (cs.g.settings.shake !== false) cs.g.r.shake(amt, time); } });
export const sound = (name, o = {}) => ({ k: 'call', fn: (cs) => cs.g.sound.play(name, o) });
export const music = (mode) => ({ k: 'call', fn: (cs) => cs.g.sound.setMusic(mode) });
export const call = (fn, o = {}) => ({ k: 'call', fn, keep: !!o.keep });
export const flag = (name, value = true) => ({ k: 'call', keep: true, fn: (cs) => { const S = cs.g.save; (S.flags || (S.flags = {}))[name] = value; } });
export const tween = (fn, dur, o = {}) => ({ k: 'tween', fn, dur, wait: o.wait ?? true });
export const title = (text, sub = '', dur = 3.2, o = {}) => ({ k: 'title', text, sub, dur, style: o.style }); // o.style: 'name' (a boss's name slammed in low), 'logo' (the game's title)
export const choice = (key, options, o = {}) => ({ k: 'choice', key, options, prompt: o.prompt || '', onPick: o.onPick });
export const strike = (n, onStrike, o = {}) => ({ k: 'strike', n, onStrike, prompt: o.prompt });
export const place = (id, o = {}) => ({ k: 'place', id, o });
export const par = (...steps) => ({ k: 'par', steps: steps.flat().filter(Boolean) });
// a cinematic angle: the camera swings to look from yaw/pitch (degrees; the game's own view is 45/40) over dur
// seconds (0: a cut). The game puts its own angle back when the scene ends.
export const angle = (yaw, pitch, dur = 0, o = {}) => ({ k: 'tween', dur: Math.max(0.0001, dur), wait: o.wait ?? (dur > 0), start: (cs) => ({ y0: cs.g.r.view.yaw, p0: cs.g.r.view.pitch }),
  fn: (k, cs, st) => { const e = dur > 0 ? ease(k) : 1; const Y = yaw * Math.PI / 180, P = pitch * Math.PI / 180; cs.g.r.setView(st.y0 + (Y - st.y0) * e, st.p0 + (P - st.p0) * e); } });
// an effect burst at an actor (or a point): fx(kind, at, n, color, y)
export const fx = (kind, at, n = 20, color, y = 1) => ({ k: 'call', fn: (cs) => { const p = cs.pos(at); if (!p) return; const F = cs.g.fx; if (kind === 'mist') F.mist(p.x, y, p.z, n, color); else if (kind === 'ring') F.shockRing(p.x, p.z, n, color || [2.6, 2.2, 1.4], 0.6); else if (kind === 'dust') F.dust(p.x, p.z, n); else if (kind === 'sparks') F.sparks(p.x, y, p.z, 0, n, color); else F.embers(p.x, y, p.z, n, color); } });
// the dawn: the night lifts, the rain thins, the moon turns warm (k 0..1 over dur)
export const dawn = (to = 1, dur = 4, o = {}) => ({ k: 'tween', dur, wait: o.wait ?? false, start: (cs) => ({ d0: cs.g.r.post.dawn || 0, r0: cs.g.atmos.rainOn ?? 1, m0: cs.g.atmos.moon.intensity, c0: cs.g.atmos.moon.color.clone() }),
  fn: (k, cs, s) => { const g = cs.g, A = g.atmos; const e = ease(k); g.r.post.dawn = s.d0 + (to - s.d0) * e; if (o.rain !== false) { A.rainOn = s.r0 * (1 - e * to); if (A.weatherK !== undefined) A.weatherK = 1 - e * to; g.sound.setRain(A.rainOn); } A.moon.intensity = s.m0 + (Math.max(s.m0, 3.2) - s.m0) * e * to; A.moon.color.copy(s.c0).lerp(new THREE.Color(0xffc890), e * to); } });

// A body for a scene (or the Haven): a warden by id (their real look and weapon, or a stand-in if not
// registered yet), a foe or boss look, or a look of its own. Lives outside the simulation; ActorView
// draws it like any entity.
export function puppet(g, id, spec) {
  let e;
      let look = null, scale = 1, type = 'cut:' + id, heroId;
  if (spec.hero) {
    const H = HEROES[spec.hero]; heroId = spec.hero;
    if (H) { const P = g.save.heroes && g.save.heroes[spec.hero]; const W = WEAPONS[P && P.weapon]; look = { ...H.look, ...(W && W.look ? W.look : {}) }; type = 'cut:hero:' + spec.hero + ':' + (P && P.weapon); }
    else look = FALLBACK_LOOKS[spec.hero] || FALLBACK_LOOKS.freed;
  } else if (spec.foe) { const D = FOES[spec.foe] || UNITS[spec.foe]; look = D ? D.look : FALLBACK_LOOKS[spec.foe] || FALLBACK_LOOKS.hushed; scale = D ? (D.scale || 1) : 1; type = 'cut:foe:' + spec.foe; }
  else if (spec.boss) { const D = BOSSES[spec.boss] || BOSSES2[spec.boss]; look = D ? D.look : FALLBACK_LOOKS.boss; scale = D ? (D.scale || 1) : (FALLBACK_LOOKS.boss.scale || 1); type = 'cut:boss:' + spec.boss + (D ? '' : ':fb'); }
  else if (spec.look) { look = typeof spec.look === 'string' ? FALLBACK_LOOKS[spec.look] : spec.look; type = 'cut:look:' + (typeof spec.look === 'string' ? spec.look : id); }
  look = look || FALLBACK_LOOKS.freed; scale = spec.scale || look.scale || scale;
  e = { id: UID++, x: 0, z: 0, vx: 0, vz: 0, kbx: 0, kbz: 0, face: 0, r: 0.4, hp: 1, maxHp: 1, poise: 1, maxPoise: 1, state: 'cut', t: 0, anim: 'idle', animT: 0, atk: null, hitSet: new Set(), iframes: 0, flash: 0, dead: false, deadT: 0,
    team: 'npc', type, heroId, def: { look, scale, name: spec.name || id }, ai: {}, status: {}, mx: 0, mz: 0, moveSpeed: 0, phase: 1, leapH: 0, stats: {}, cut: true };
  return e;
}

// ------------------------------------------------------------------ the player
export class Cutscene {
  // scene: { id, steps(S) -> step[], music, hideWorld, keepHero }  ctx: values the script reads (lead, boss...)
  constructor(game, scene, ctx = {}, opts = {}) {
    this.g = game; this.scene = scene; this.id = scene.id; this.onEnd = opts.onEnd;
    this.actors = new Map(); this.ents = []; this.borrowed = []; this.hidden = [];
    this.t = 0; this.bars = 0; this.fade = scene.fadeIn ? 1 : 0; this.result = {}; this.lines = 0;
    this.speed = opts.speed || game.cutSpeed || 1; this.auto = !!(opts.auto || game.cutAuto);
    this.camPos = game.camFocus.clone(); this.zoom = game.zoom || 1; this.camSpec = null;
    this.S = { g: game, cs: this, save: game.save, lead: game.save.hero, world: game.world, level: game.level, def: game.level && game.level.def, boss: game.boss, ...ctx };
    if (scene.hideWorld && game.world) for (const e of game.world.ents) { this.hidden.push([e, e.hidden]); e.hidden = true; }
    this.queue = (typeof scene.steps === 'function' ? scene.steps(this.S) : scene.steps).flat().filter(Boolean);
    this.i = 0; this.active = []; this.line = null; this.titleCard = null; this.pick = null; this.strikeS = null; this.waiting = 0; this.finished = false; this.outT = -1;
    if (scene.music) game.sound.setMusic(scene.music);
  }

  // ---- actors
  actor(id) { return this.actors.get(id) || null; }
  pos(at) {
    if (typeof at === 'function') at = at(this.S);
    if (!at) return null;
    if (typeof at === 'string') { const a = this.actor(at); return a ? { x: a.x, y: (a.leapH || 0) + 1.0 * this.scaleOf(a), z: a.z } : null; }
    if (Array.isArray(at)) return at.length === 3 ? { x: at[0], y: at[1], z: at[2] } : { x: at[0], y: 0.9, z: at[1] };
    if (at.mid) { const ps = at.mid.map((m) => this.pos(m)).filter(Boolean); if (!ps.length) return null; const p = { x: 0, y: 0, z: 0 }; for (const q of ps) { p.x += q.x / ps.length; p.y += q.y / ps.length; p.z += q.z / ps.length; } return p; }
    return { x: at.x, y: at.y ?? 0.9, z: at.z };
  }
  scaleOf(e) { return (e.def && (e.def.scale || (e.def.look && e.def.look.scale))) || 1; }

  // spec: { use: 'hero' | 'boss' | <world entity> } | { hero: id } | { foe: type } | { boss: type } | { look: {...} }
  //       plus x, z, face, anim, y (height above the ground), hidden, name
  makeActor(id, spec) {
    const g = this.g; let e = null;
    if (spec.use) {
      e = spec.use === 'hero' ? g.world && g.world.hero : (spec.use === 'boss' ? g.boss : spec.use);
      if (e) { const h = this.hidden.find((x) => x[0] === e); this.borrowed.push({ e, state: e.state, anim: e.anim, hidden: h ? h[1] : e.hidden }); e.state = 'cut'; e.vx = e.vz = 0; e.hidden = false; if (h) h[1] = false; }
    }
    if (!e) { e = puppet(g, id, spec); this.ents.push(e); }
    if (spec.at) { const p = this.pos(spec.at); if (p) { e.x = p.x; e.z = p.z; } }
    if (spec.x !== undefined) e.x = spec.x; if (spec.z !== undefined) e.z = spec.z;
    if (spec.face !== undefined) e.face = typeof spec.face === 'number' ? spec.face : this.angleTo(e, spec.face);
    if (spec.anim) { e.anim = spec.anim; e.animT = spec.animT || 0; }
    if (spec.y !== undefined) e.leapH = spec.y;
    if (spec.hidden !== undefined) e.hidden = spec.hidden;
    if (spec.dead) { e.dead = true; e.anim = 'die'; e.animT = 3; }
    e.speaker = spec.speaker || spec.hero || spec.boss || (typeof spec.look === 'string' ? spec.look : null) || (spec.use === 'hero' ? e.heroId : (spec.use === 'boss' ? e.type : null)) || id;
    this.actors.set(id, e); return e;
  }
  angleTo(e, to) { const p = typeof to === 'number' ? null : this.pos(to); return p ? Math.atan2(p.x - e.x, p.z - e.z) : (to || 0); }
  drop(id) { const e = this.actors.get(id); if (!e) return; this.actors.delete(id); this.ents = this.ents.filter((x) => x !== e); }

  // ---- running steps
  startStep(s) {
    const g = this.g; const st = { s, t: 0, done: false };
    switch (s.k) {
      case 'cam': { st.from = this.camPos.clone(); st.z0 = this.zoom; if (s.dur <= 0) { this.camSpec = s; this.applyCam(s, 1, st); st.done = true; } break; }
      case 'spawn': this.makeActor(s.id, typeof s.spec === 'function' ? s.spec(this.S) : s.spec); st.done = true; break;
      case 'remove': this.drop(s.id); st.done = true; break;
      case 'walk': {
        const e = this.actor(s.id); if (!e) { st.done = true; break; }
        const to = typeof s.to === 'function' ? s.to(this.S) : s.to;
        const pts = (Array.isArray(to) && (Array.isArray(to[0]) || typeof to[0] === 'object' || typeof to[0] === 'function') ? to : [to]).map((p) => this.pos(p)).filter(Boolean);
        st.path = pts; st.e = e; e.anim = s.run ? 'run' : 'walk'; e.animT = 0; if (!pts.length) st.done = true; break;
      }
      case 'face': { const e = this.actor(s.id); if (!e) { st.done = true; break; } st.e = e; st.to = this.angleTo(e, s.to); break; }
      case 'anim': { const e = this.actor(s.id); if (e) { e.anim = s.name; e.animT = 0; if (s.name === 'die' || s.name === 'dieHard') e.dead = true; else e.dead = false; st.e = e; } st.done = !s.then; break; }
      case 'say': this.startLine(s); st.line = this.line; break;
      case 'fade': st.f0 = this.fade; break;
      case 'call': { try { s.fn(this, g, this.S); } catch (err) { console.error('cutscene call', err); } st.done = true; break; }
      case 'tween': st.data = s.start ? s.start(this) : null; break;
      case 'title': this.titleCard = { text: s.text, sub: s.sub, t: 0, dur: s.dur, style: s.style }; break;
      case 'choice': {
        const opts = s.options.filter((o) => o.when === undefined || (typeof o.when === 'function' ? o.when(this.S) : o.when));
        this.pick = { key: s.key, options: opts, sel: 0, prompt: s.prompt, onPick: s.onPick, t: 0 }; this.line = null; break;
      }
      case 'strike': this.strikeS = { n: s.n, i: 0, t: 0, cool: 0, onStrike: s.onStrike, prompt: s.prompt }; break;
      case 'place': {
        this.waiting++; st.wait = true;
        Promise.resolve(g.stageAt ? g.stageAt(s.id, s.o) : null).then(() => {
          // the stage is new: keep borrowed actors only if they still exist, hide the new world
          this.S.staged = true; this.S.world = g.world; this.S.level = g.level; this.S.def = g.level && g.level.def;
          this.hidden = []; if (g.world) for (const e of g.world.ents) { this.hidden.push([e, e.hidden]); e.hidden = true; }
          this.camPos.copy(g.camFocus); st.done = true; this.waiting--;
        }).catch((err) => { console.error('cutscene place', err); st.done = true; this.waiting--; });
        break;
      }
      case 'par': st.subs = s.steps.map((x) => this.startStep(x)); break;
    }
    return st;
  }
  // true when the step is over
  runStep(st, dt, inp) {
    const s = st.s, g = this.g; if (st.done) return true; st.t += dt;
    switch (s.k) {
      case 'cam': { const k = ease(st.t / s.dur); this.applyCam(s, k, st); if (st.t >= s.dur) { this.camSpec = s; st.done = true; } return st.done || !s.wait; }
      case 'walk': {
        const e = st.e, p = st.path[0]; if (!p) { this.endWalk(st); return true; }
        const sp = (s.speed || (s.run ? 4.6 : 1.8)) * dt; const dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz);
        e.face = turnTo(e.face, Math.atan2(dx, dz), dt * 9);
        if (d <= sp) { e.x = p.x; e.z = p.z; st.path.shift(); if (!st.path.length) { this.endWalk(st); return true; } } else { e.x += dx / d * sp; e.z += dz / d * sp; }
        e.vx = dx / Math.max(d, 1e-3) * (s.speed || 1.8); e.vz = dz / Math.max(d, 1e-3) * (s.speed || 1.8);
        return !s.wait;
      }
      case 'face': { st.e.face = turnTo(st.e.face, st.to, dt * Math.PI / Math.max(0.05, s.dur) * 1.2); if (Math.abs(((st.to - st.e.face) % TAU + TAU + Math.PI) % TAU - Math.PI) < 0.02 || st.t > s.dur + 0.4) { st.e.face = st.to; st.done = true; } return st.done; }
      case 'anim': { if (st.e && st.t >= (s.after ?? 0.6)) { st.e.anim = s.then; st.e.animT = 0; st.done = true; } return st.done || !st.e; }
      case 'say': return !this.line || this.line !== st.line;
      case 'wait': return st.t >= s.sec;
      case 'fade': { const k = Math.min(1, st.t / Math.max(0.01, s.dur)); this.fade = st.f0 + (s.to - st.f0) * k; return k >= 1; }
      case 'tween': { const k = Math.min(1, st.t / Math.max(0.01, s.dur)); try { s.fn(k, this, st.data); } catch (err) { console.error('cutscene tween', err); st.done = true; return true; } if (k >= 1) st.done = true; return st.done || !s.wait; }
      case 'title': return !this.titleCard;
      case 'choice': return !this.pick;
      case 'strike': return !this.strikeS;
      case 'place': return st.done;
      case 'par': { let all = true; for (const sub of st.subs) { const r = this.runStep(sub, dt, inp); const mover = sub.s.k === 'walk' || sub.s.k === 'cam' || sub.s.k === 'tween'; if (mover ? !sub.done : !r) all = false; } return all; }
    }
    return true;
  }
  endWalk(st) { const e = st.e, s = st.s; e.vx = e.vz = 0; st.done = true; e.anim = s.end || 'idle'; e.animT = 0; if (s.face !== undefined) e.face = this.angleTo(e, s.face); }
  applyCam(s, k, st) {
    const p = this.pos(s.at); if (p) { const tgt = new THREE.Vector3(p.x + (s.off ? s.off[0] : 0), s.y ?? p.y ?? 0.9, p.z + (s.off ? s.off[1] : 0)); this.camPos.copy(st.from || this.camPos).lerp(tgt, k); }
    if (s.zoom) this.zoom = (st.z0 ?? this.zoom) + (s.zoom - (st.z0 ?? this.zoom)) * k;
  }

  startLine(s) {
    const sp = this.speaker(s.who, s); const ui = this.g.ui;
    const maxW = this.textW(); const all = ui.wrap(String(s.text).toUpperCase(), maxW);
    const pages = []; for (let i = 0; i < all.length; i += 2) pages.push(all.slice(i, i + 2));
    this.line = { name: sp.name, color: sp.color, pages, page: 0, t: 0, actor: s.actor !== undefined ? s.actor : (this.actor(s.who) ? s.who : null), shout: !!s.shout, soft: !!s.soft, auto: s.auto };
    this.lines++;
  }
  speaker(who, s = {}) {
    if (s.name) return { name: s.name, color: s.color || COL.text };
    const key = who === 'lead' ? this.S.lead : who;
    const a = this.actor(who); const sk = (a && a.speaker) ? a.speaker : key;
    const base = SPEAKERS[sk] || SPEAKERS[key] || { name: String(key || '').toUpperCase(), color: COL.text };
    const H = HEROES[sk]; return { name: (H && H.name) || base.name, color: s.color || base.color };
  }
  textW() { const ui = this.g.ui; return Math.max(120, Math.min(ui.w - Math.round(ui.safe.l + ui.safe.r) - 28, 252)); }

  // ---- frame
  update(dt, inp) {
    const g = this.g; dt *= this.speed; this.t += dt;
    for (const e of this.ents) e.animT += dt;
    for (const b of this.borrowed) if (b.e) b.e.animT += dt;
    if (this.outT >= 0) { this.outT += dt; this.bars = Math.max(0, 1 - this.outT / 0.35); if (this.outT >= 0.35) this.finish(); return; }
    this.bars = Math.min(1, this.bars + dt / 0.45);
    // input: SKIP first (its tap is not also an advance), then the line, the choice, the strikes
    const taps = inp ? inp.taps.filter((tp) => !(this.skipRect && hitR(this.skipRect, tp))) : [];
    const skipTap = inp && inp.taps.length !== taps.length;
    if (inp && (skipTap || inp.back) && !this.pick && this.t > 0.25) { this.skip(); return; }
    if (this.skipping && !this.waiting && !this.pick) this.skipCore();
    const adv = inp && (inp.confirm || taps.length || inp.attackPressed);
    if (this.pick) this.updatePick(dt, inp, taps);
    else if (this.strikeS) this.updateStrike(dt, adv);
    else if (this.line) {
      const L = this.line; L.t += dt; const full = this.revealed(L) >= this.pageLen(L);
      const autoGo = (this.auto || L.auto) && full && L.t > this.pageLen(L) / 60 + (this.auto ? 0.35 : (L.auto || 1.6));
      if (adv || autoGo) { if (!full && !autoGo) L.t = 99; else { L.page++; L.t = 0; if (L.page >= L.pages.length) this.line = null; } }
    }
    if (this.titleCard) { const T = this.titleCard; T.t += dt; if (T.t >= T.dur || (adv && T.t > 0.6) || this.auto && T.t > 0.5) this.titleCard = null; }
    // the camera keeps tracking its last subject
    if (this.camSpec && !this.active.some((st) => st.s.k === 'cam' && !st.done)) this.applyCam(this.camSpec, 1, { from: this.camPos, z0: this.zoom });
    // steps
    for (let guard = 0; guard < 400; guard++) {
      this.active = this.active.filter((st) => !this.runStep(st, 0, inp) || this.keepBg(st));
      const blocking = this.active.filter((st) => !st.bg);
      if (blocking.length || this.waiting) break;
      if (this.i >= this.queue.length) { this.outT = 0; break; }
      const st = this.startStep(this.queue[this.i++]);
      if (!this.runStep(st, 0, inp)) this.active.push(st);
      else if (((st.s.k === 'walk' || st.s.k === 'cam' || st.s.k === 'tween') && !st.done)) { st.bg = true; this.active.push(st); }
    }
    for (const st of this.active) this.runStep(st, dt, inp);
  }
  keepBg(st) { return st.bg && !st.done; }
  revealed(L) { return Math.floor(L.t * 60); }
  pageLen(L) { return (L.pages[L.page] || []).join(' ').length; }

  updatePick(dt, inp, taps) {
    const P = this.pick; P.t += dt; const n = P.options.length; if (!n) { this.pick = null; return; }
    if (this.auto && P.t > 0.4) { const want = this.g.autoChoice ? this.g.autoChoice(P.key, P.options.map((o) => o.id)) : null; const i = Math.max(0, P.options.findIndex((o) => o.id === want)); return this.choose(i); }
    if (!inp || P.t < 0.35) return;
    if (inp.up) { P.sel = (P.sel + n - 1) % n; this.g.sound.play('ui'); }
    if (inp.down) { P.sel = (P.sel + 1) % n; this.g.sound.play('ui'); }
    for (const tp of taps) for (const r of P.rects || []) if (hitR(r, tp)) return this.choose(r.i);
    if (inp.confirm) this.choose(P.sel);
  }
  choose(i) {
    const P = this.pick; const o = P.options[i]; if (!o) return;
    this.result[P.key] = o.id; this.g.sound.play('uiOk');
    const S = this.g.save; (S.flags || (S.flags = {}))[P.key] = o.id;
    if (P.onPick) try { P.onPick(o.id, this); } catch (err) { console.error(err); }
    this.pick = null;
  }
  updateStrike(dt, adv) {
    const T = this.strikeS; T.t += dt; T.cool -= dt;
    const go = (adv && T.cool <= 0 && T.t > 0.4) || (this.auto && T.cool <= -0.5 && T.t > 1.2);
    if (!go) return;
    T.i++; T.cool = 0.55; try { T.onStrike && T.onStrike(this, T.i); } catch (err) { console.error(err); }
    if (T.i >= T.n) { this.strikeS = null; }
  }

  // SKIP: run what the rest of the scene gives (flags, kept calls), stop at a choice, else end
  skip() { this.skipping = true; if (!this.waiting) this.skipCore(); }
  skipCore() {
    this.line = null; this.titleCard = null; this.strikeS = null;
    const keep = (s) => { if (!s) return false; if (s.k === 'call' && s.keep) { try { s.fn(this, this.g, this.S); } catch (err) { console.error(err); } } if (s.k === 'spawn') this.makeActor(s.id, typeof s.spec === 'function' ? s.spec(this.S) : s.spec); if (s.k === 'remove') this.drop(s.id); if (s.k === 'par') for (const x of s.steps) if (keep(x)) return true; if (s.k === 'choice' || s.k === 'place') return true; return false; };
    // the steps under way: finish them
    for (const st of this.active) { if (st.s.k === 'walk' && st.e) { const last = st.path[st.path.length - 1]; if (last) { st.e.x = last.x; st.e.z = last.z; } this.endWalk(st); } if (st.s.k === 'fade') this.fade = st.s.to; if (st.s.k === 'tween') { try { st.s.fn(1, this, st.data); } catch (err) { /* */ } } }
    this.active = this.active.filter((st) => st.s.k === 'place' && !st.done);
    while (this.i < this.queue.length) {
      const s = this.queue[this.i];
      if (s.k === 'choice') { this.skipping = false; break; } // a choice must be made
      if (s.k === 'place') break; // a new stage must load first (the skip carries on after it)
      this.i++;
      if (s.k === 'par') { if (keep(s)) break; continue; }
      if (s.k === 'fade') this.fade = s.to;
      if (s.k === 'tween' && s.skipTo !== false) { try { const d = s.start ? s.start(this) : null; s.fn(1, this, d); } catch (err) { /* */ } }
      keep(s);
    }
    if (this.i >= this.queue.length && !this.active.length) { this.outT = 0; this.skipping = false; }
  }

  finish() {
    if (this.finished) return; this.finished = true;
    for (const [e, h] of this.hidden) e.hidden = h;
    for (const b of this.borrowed) { const e = b.e; if (!e) continue; e.hidden = b.hidden; if (e.state === 'cut') { e.state = 'idle'; if (!e.dead) { e.anim = 'idle'; e.animT = 0; } e.t = 0; e.vx = e.vz = 0; e.leapH = 0; } }
    this.ents = []; this.actors.clear();
    if (this.onEnd) this.onEnd(this.result, this);
  }

  // what the view draws: the world's entities and the puppets
  viewList(world) { const v = world ? Object.create(world) : { projs: [], hazards: [], zones: [] }; v.ents = world ? world.ents.concat(this.ents) : this.ents; return v; }

  // ---- drawing
  draw(ui) {
    const W = ui.w, H = ui.h, k = ease(this.bars); const sl = Math.round(ui.safe.l), sr = Math.round(ui.safe.r);
    const L = this.line; const boxH = L || this.strikeS ? 36 : 0;
    const top = Math.round(H * 0.11 * k), bot = Math.round(Math.max(H * 0.11, boxH) * k);
    if (top > 0) { ui.rect(0, 0, W, top, '#000'); ui.rect(0, H - bot, W, bot, '#000'); }
    // the speaker: a small mark over their head
    if (L && L.actor && this.bars > 0.9) {
      const e = this.actor(L.actor); if (e && !e.hidden) {
        const p = this.g.r.project(new THREE.Vector3(e.x, (e.leapH || 0) + 2.15 * this.scaleOf(e), e.z)); const bob = Math.round(Math.sin(this.t * 5) * 1);
        if (isFinite(p.x) && p.y > top + 4 && p.y < H - bot) { const x = Math.round(p.x), y = Math.round(p.y) - 3 + bob; ui.rect(x - 2, y, 5, 1, L.color); ui.rect(x - 1, y + 1, 3, 1, L.color); ui.rect(x, y + 2, 1, 1, L.color); }
      }
    }
    // the line: the name in the speaker's colour, then the words, in the dark box at the bottom
    if (L && k > 0.6) {
      const page = L.pages[L.page] || []; const tw = this.textW(); const bx = Math.round(Math.max(sl + 8, (W - tw) / 2 - 6)); const by = H - bot + 3;
      ui.rect(bx - 6, by - 1, 2, bot - 6, L.color);
      ui.text(L.name, bx, by + 1, { color: L.color, shadow: false });
      let left = this.revealed(L);
      page.forEach((ln, r) => { const show = ln.slice(0, Math.max(0, left)); left -= ln.length + 1; if (show) ui.text(show, bx, by + 12 + r * 10, { color: L.soft ? COL.dim : (L.shout ? COL.white : COL.text), shadow: false }); });
      if (this.revealed(L) >= this.pageLen(L)) { const more = L.page < L.pages.length - 1; const a = 0.5 + 0.5 * Math.sin(this.t * 5); ui.text(more ? '>' : '>', W - sr - 10, H - 10, { color: L.color, alpha: a, shadow: false }); }
    }
    // a title card (an act ends, a time passes)
    if (this.titleCard) {
      const T = this.titleCard; const a = Math.min(1, T.t * 1.6, Math.max(0, (T.dur - T.t) * 2));
      if (T.style === 'name') {
        // a boss's name: slammed in on the lower third, a beat bigger at first, a red bar under it, its ground over it
        const fit = Math.max(2, Math.min(4, Math.floor((W - 30) / Math.max(1, ui.measure(T.text)))));
        const sc = fit + (T.t < 0.12 ? 1 : 0); const y = Math.round(H * 0.68) + (T.t < 0.12 ? -2 : 0); const a2 = Math.min(1, T.t * 8, Math.max(0, (T.dur - T.t) * 3));
        if (T.sub) ui.text(T.sub, W / 2, y - 12, { align: 'center', color: COL.gold, alpha: a2 * 0.9 });
        ui.text(T.text, W / 2, y, { align: 'center', scale: sc, color: COL.white, alpha: a2 });
        const bw = Math.round(ui.measure(T.text, sc) * Math.min(1, T.t * 4)); ui.rect(Math.round(W / 2 - bw / 2), y + sc * 7 + 3, bw, 2, '#c02028');
      } else if (T.style === 'logo' && ui.logo) {
        ui.logo(W / 2, Math.round(H * 0.4), a);
        if (T.sub) ui.text(T.sub, W / 2, Math.round(H * 0.4) + 34, { align: 'center', color: COL.dim, alpha: a });
      } else {
        const sc = ui.measure(T.text, 2) <= W - 24 ? 2 : 1; const y = Math.round(H / 2 - (T.sub ? 14 : 7));
        ui.text(T.text, W / 2, y, { align: 'center', scale: sc, color: COL.white, alpha: a });
        if (T.sub) ui.wrap(T.sub, W - 40).forEach((l, i) => ui.text(l, W / 2, y + 7 * sc + 8 + i * 10, { align: 'center', color: COL.gold, alpha: a }));
      }
    }
    // a choice: big buttons in the middle, the prompt over them
    if (this.pick) {
      const P = this.pick; const n = P.options.length; const bw = Math.min(W - sl - sr - 24, 270);
      const fitT = (t) => { if (!t || ui.measure(t) <= bw - 10) return t; let x = t; while (x.length > 3 && ui.measure(x + '...') > bw - 10) x = x.slice(0, -1); return x.trim() + '...'; }; const bh = Math.max(18, Math.min(24, Math.floor((H - top - bot - 30) / n) - 4));
      const total = n * bh + (n - 1) * 4; let y = Math.round((H - total) / 2) + 6; const x = Math.round(W / 2 - bw / 2);
      ui.veil(0.35);
      if (P.prompt) ui.wrap(P.prompt, W - 40).forEach((l, i, arr) => ui.text(l, W / 2, y - 12 - (arr.length - 1 - i) * 10, { align: 'center', color: COL.gold }));
      P.rects = P.options.map((o, i) => { const r = ui.button(x, y + i * (bh + 4), bw, bh, o.label, { sel: i === P.sel, sub: fitT(o.sub), color: o.color }); return { ...r, i }; });
    }
    // the bell: strike it
    if (this.strikeS) {
      // in the bottom bar: what to press, and a bell-mark for each strike (lit once struck)
      const T = this.strikeS; const a = 0.7 + 0.3 * Math.sin(this.t * 6); const touch = this.g.inputMode === 'touch';
      const txt = T.prompt || (touch ? 'TAP TO STRIKE THE BELL' : (this.g.inputMode === 'pad' ? 'X: STRIKE THE BELL' : 'ATTACK (J): STRIKE THE BELL'));
      const by = H - bot; const sc = ui.measure(txt, 2) <= W - 40 && bot >= 30 ? 2 : 1;
      ui.text(txt, W / 2, by + 4, { align: 'center', scale: sc, color: COL.gold, alpha: a, shadow: false });
      for (let i = 0; i < T.n; i++) { const cx = Math.round(W / 2 + (i - (T.n - 1) / 2) * 12); ui.circle(cx, by + 7 * sc + 11, 3, i < T.i ? COL.gold : '#3a3226'); }
    }
    // SKIP, top right, inside the bar
    if (!this.pick && this.t > 0.25 && this.outT < 0) {
      const w = 44, h = Math.max(14, top - 4); const x = W - sr - w - 6, y = Math.max(2, Math.round((top - h) / 2));
      const a0 = ui.g.globalAlpha; ui.g.globalAlpha = a0 * 0.85; ui.frame(x, y, w, h, 'rgba(20,18,16,0.9)', '#5a4a32'); ui.text('SKIP >', x + w / 2, y + Math.round((h - 7) / 2), { align: 'center', color: COL.dim, shadow: false }); ui.g.globalAlpha = a0;
      this.skipRect = { x: x - 6, y: 0, w: w + 12, h: h + y + 6 };
    } else this.skipRect = null;
  }
}
// A line outside a scene (a boss's last words): the name in its colour and up to two lines in a dark box,
// at the bottom of the screen (or the top, clear of the touch controls).
export function drawLineBox(ui, name, color, text, alpha = 1, where = 'bottom') {
  const W = ui.w, H = ui.h; const tw = Math.max(120, Math.min(W - Math.round(ui.safe.l + ui.safe.r) - 28, 252));
  const lines = ui.wrap(String(text).toUpperCase(), tw).slice(0, 2); const bh = 14 + lines.length * 10; const bx = Math.round((W - tw) / 2) - 8, bw = tw + 16;
  const by = where === 'top' ? 22 : H - bh - 30;
  const g = ui.g, a0 = g.globalAlpha; g.globalAlpha = a0 * alpha;
  ui.rect(bx, by, bw, bh, 'rgba(4,5,8,0.82)'); ui.rect(bx, by, 2, bh, color);
  ui.text(name, bx + 8, by + 3, { color, shadow: false }); lines.forEach((l, i) => ui.text(l, bx + 8, by + 13 + i * 10, { color: COL.text, shadow: false }));
  g.globalAlpha = a0;
}
const hitR = (r, p) => r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
