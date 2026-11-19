'use strict';
// HOLLOWLANDS — the Wayfarer, the hollow, the Keeper, projectiles and hit effects.
const A = HL.Audio;
const dirOf = (a) => { const c = Math.cos(a), s = Math.sin(a); return Math.abs(c) > Math.abs(s) * 1.1 ? (c > 0 ? 2 : 3) : s > 0 ? 0 : 1; };
HL.dirOf = dirOf;

// ------------------------------------------------------------------ effects
HL.fx = {
  list: [],
  add(f) { f.t = 0; this.list.push(f); if (this.list.length > 260) this.list.shift(); return f; },
  burst(x, y, col, n = 6, sp = 40, life = 0.4) { for (let i = 0; i < n; i++) { const a = Math.random() * HL.TAU, s = sp * (0.4 + Math.random() * 0.6); this.add({ k: 'p', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 10, z: 4 + Math.random() * 4, vz: 20 + Math.random() * 30, col, life: life * (0.6 + Math.random() * 0.6) }); } },
  dust(x, y, n = 3) { for (let i = 0; i < n; i++) this.add({ k: 'd', x: x + (Math.random() - 0.5) * 4, y: y + (Math.random() - 0.5) * 2, life: 0.35 + Math.random() * 0.2 }); },
  ring(x, y, r, col = HL.P.cream, life = 0.35, w = 1) { this.add({ k: 'ring', x, y, r, col, life, w }); },
  slash(x, y, a, arc, r, life = 0.12, col = HL.P.cream) { this.add({ k: 'slash', x, y, a, arc, r, life, col }); },
  text(x, y, s, col = HL.P.cream, life = 1.4) { this.add({ k: 'text', x, y, s, col, life }); },
  update(dt) {
    for (const f of this.list) {
      f.t += dt;
      if (f.k === 'p') { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.9; f.vy *= 0.9; f.vz -= 140 * dt; f.z = Math.max(0, f.z + f.vz * dt); }
      if (f.k === 'text') f.y -= 8 * dt;
    }
    this.list = this.list.filter((f) => f.t < f.life);
  },
  draw(g, ground) {
    const P = HL.P;
    for (const f of this.list) {
      const q = f.t / f.life;
      if (ground !== (f.k === 'ring' || f.k === 'd')) continue;
      if (f.k === 'p') { g.fillStyle = f.col; g.fillRect(Math.round(f.x), Math.round(f.y - f.z), 1, 1); }
      else if (f.k === 'd') { g.fillStyle = q < 0.5 ? P.ash1 : P.ash2; const r = 1 + q * 2; g.fillRect(Math.round(f.x - r / 2), Math.round(f.y - q * 4), Math.ceil(r), 1); }
      else if (f.k === 'ring') { HL.ringPx(g, f.x, f.y, f.r * (0.3 + q * 0.7), f.col, f.w); }
      else if (f.k === 'slash') {
        g.fillStyle = q < 0.5 ? f.col : P.cream3;
        const n = Math.ceil(f.arc * f.r);
        for (let i = 0; i <= n; i++) { const a = f.a - f.arc / 2 + (f.arc * i) / n; if (i / n > 1 - q * 1.2 + 0.2 && q > 0.5) continue; g.fillRect(Math.round(f.x + Math.cos(a) * f.r), Math.round(f.y + Math.sin(a) * f.r * 0.85), 1, 1); }
      } else if (f.k === 'text') { HL.text(g, f.s, f.x, f.y, q > 0.7 ? P.cream3 : f.col, 0.5, 1, P.ink); }
    }
  },
};
// pixel ring/arc helpers (ground-plane ellipse, y squashed)
HL.ringPx = (g, x, y, r, col, w = 1, a0 = 0, a1 = HL.TAU) => {
  g.fillStyle = col;
  const n = Math.max(8, Math.ceil((a1 - a0) * r * 1.2));
  for (let k = 0; k < w; k++) for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; g.fillRect(Math.round(x + Math.cos(a) * (r - k)), Math.round(y + Math.sin(a) * (r - k) * 0.8), 1, 1); }
};
HL.discDither = (g, x, y, r, col, fill, a0 = 0, a1 = HL.TAU) => {
  g.fillStyle = col;
  for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
    const yy = j / 0.8; if (i * i + yy * yy > r * r) continue;
    if (a1 - a0 < HL.TAU - 0.01) { const a = Math.atan2(yy, i), d = HL.angDiff((a0 + a1) / 2, a); if (Math.abs(d) > (a1 - a0) / 2) continue; }
    const X = Math.round(x + i), Y = Math.round(y + j);
    if (HL.bayer(X, Y) < fill) g.fillRect(X, Y, 1, 1);
  }
};

// ------------------------------------------------------------------ the Wayfarer
HL.Player = class Player {
  constructor(x, y) {
    Object.assign(this, { x, y, r: 3, vx: 0, vy: 0, face: Math.PI / 2, dir: 0, hp: 100, maxhp: 100, st: 100, maxst: 100, stDelay: 0, state: 'move', t: 0, walkT: 0, combo: 0, comboT: 0, inv: 0, flash: 0, holdT: -1, chargeT: 0, ult: 0, regen: 0, stepT: 0, atk: null, buffer: null });
  }
  get G() { return HL.G; }
  weaponDef() { const id = this.G.eq.weapon; return id ? HL.WEAPONS[id] : null; }
  dmgMult() { const id = this.G.eq.weapon; return 1 + (this.G.wlv[id] || 0) * HL.UPGRADE.perLevel; }
  def() { const a = HL.ITEMS[this.G.eq.armor]; return a ? a.def || 0 : 0; }
  speed() { const a = HL.ITEMS[this.G.eq.armor]; return 52 * (1 - ((a && a.slow) || 0)); }
  spend(n) { this.st -= n; this.stDelay = this.st <= 0 ? 1.1 : 0.55; if (this.st < 0) this.st = 0; }
  nearestFoe(range) {
    let best = null, bd = range;
    for (const e of this.G.enemies) { if (e.dead || e.hidden) continue; const d = HL.dist(this.x, this.y, e.x, e.y) - e.r; if (d < bd && this.G.world.los(this.x, this.y - 4, e.x, e.y - 4)) { bd = d; best = e; } }
    return best;
  }
  update(dt, inp) {
    const G = this.G, w = this.weaponDef();
    this.t += dt; this.inv = Math.max(0, this.inv - dt); this.flash = Math.max(0, this.flash - dt); this.comboT = Math.max(0, this.comboT - dt);
    if (this.regen > 0) { this.regen -= dt; this.hp = Math.min(this.maxhp, this.hp + 3 * dt); }
    this.stDelay -= dt;
    if (this.stDelay <= 0 && this.state !== 'roll' && this.state !== 'attack') this.st = Math.min(this.maxst, this.st + 42 * (G.eq.relic === 'ember_charm' ? 1.35 : 1) * dt);
    if (this.state === 'dead') return;
    const mlen = Math.hypot(inp.mx, inp.my), mvA = Math.atan2(inp.my, inp.mx);
    // buffered inputs
    if (inp.dodge) this.buffer = { k: 'dodge', t: 0.18 };
    // strike on press; keep holding after the swing to charge a heavy blow, release to unleash it
    if (inp.attack && w) { this.buffer = { k: 'light', t: 0.28 }; this.holdT = 0; this.chargeT = 0; }
    if (this.holdT >= 0) {
      this.holdT += dt;
      if (this.state === 'move' && this.holdT > 0.22 && !this.buffer) this.chargeT += dt;
      if (inp.attackUp || !inp.attackDown) { if (this.chargeT > 0.16) this.buffer = { k: 'heavy', t: 0.2, charge: 0.3 + this.chargeT }; this.holdT = -1; this.chargeT = 0; }
    }
    if (this.buffer) { this.buffer.t -= dt; if (this.buffer.t <= 0) this.buffer = null; }
    const canAct = this.state === 'move' || (this.state === 'attack' && this.atk.phase === 'rec') || (this.state === 'heal' && this.t > 0.15);
    if (this.buffer && canAct) {
      const b = this.buffer;
      if (b.k === 'dodge' && this.st > 0) { this.buffer = null; return this.startRoll(mlen > 0.2 ? mvA : this.face); }
      if ((b.k === 'light' || b.k === 'heavy') && w && this.st > 0 && (this.state !== 'attack' || this.atk.phase === 'rec')) { this.buffer = null; this.startAttack(b.k === 'heavy', b.charge, mlen > 0.2 ? mvA : null); }
    }
    if (inp.ult && this.state === 'move' && G.eq.relic === 'bell_shard' && this.ult >= 100 && w) return this.startUlt(mlen > 0.2 ? mvA : this.face);
    let sp = this.speed();
    switch (this.state) {
      case 'move': {
        if (this.chargeT > 0) sp *= 0.45;
        const tx = inp.mx * sp, ty = inp.my * sp;
        this.vx = HL.approach(this.vx, tx, 520 * dt); this.vy = HL.approach(this.vy, ty, 520 * dt);
        if (mlen > 0.15) { this.face = mvA; }
        break;
      }
      case 'roll': {
        const k = this.t / 0.32, s = 125 * (1 - k * 0.7);
        this.vx = Math.cos(this.rollA) * s; this.vy = Math.sin(this.rollA) * s;
        if (this.t > 0.32) this.state = 'move';
        break;
      }
      case 'attack': this.updateAttack(dt, w); break;
      case 'heal': { this.vx = inp.mx * sp * 0.4; this.vy = inp.my * sp * 0.4; if (this.t > 0.55) { this.hp = Math.min(this.maxhp, this.hp + 45); HL.fx.burst(this.x, this.y - 6, HL.P.cream2, 6, 20); this.state = 'move'; } break; }
      case 'hurt': { this.vx *= 0.85; this.vy *= 0.85; if (this.t > 0.2) this.state = 'move'; break; }
      case 'ult': this.updateUlt(dt, w); break;
    }
    this.dir = dirOf(this.face);
    const moved = HL.dist(0, 0, this.vx, this.vy) > 4;
    G.world.move(this, this.vx * dt, this.vy * dt);
    if (moved) {
      this.walkT += dt * (this.state === 'move' ? 1.9 : 0);
      this.stepT -= dt;
      if (this.stepT <= 0 && this.state === 'move') { this.stepT = 0.29; A.play('step', G.world.surface(this.x, this.y)); if (Math.random() < 0.3) HL.fx.dust(this.x, this.y, 1); }
    } else this.walkT = 0;
  }
  startRoll(a) {
    this.state = 'roll'; this.t = 0; this.rollA = a; this.face = a; this.inv = 0.24; this.spend(20); this.atk = null; this.holdT = -1; this.chargeT = 0;
    A.play('roll'); HL.fx.dust(this.x, this.y, 4);
  }
  startAttack(heavy, charge, aimA) {
    const w = this.weaponDef();
    const tgt = this.nearestFoe((heavy ? w.heavy.reach : w.reach) + 14) || HL.G.targetProp(this, w.reach + 8);
    if (tgt) this.face = Math.atan2(tgt.y - this.y, tgt.x - this.x); else if (aimA != null) this.face = aimA;
    if (!heavy && this.state === 'attack' && this.comboT > 0) this.combo = (this.combo + 1) % w.combo; else if (!heavy && this.comboT <= 0) this.combo = 0;
    const fin = !heavy && this.combo === w.combo - 1 && w.combo > 1;
    this.state = 'attack'; this.t = 0;
    this.atk = { heavy, fin, phase: 'wind', pt: 0, hit: new Set(), charge: HL.clamp(((charge || 0) - 0.3) / 0.6, 0, 1), side: this.combo % 2 ? -1 : 1, tgt: !!tgt };
    this.spend(heavy ? w.heavy.stam : w.stam);
    this.vx *= 0.3; this.vy *= 0.3;
  }
  updateAttack(dt, w) {
    const a = this.atk; a.pt += dt;
    const wind = a.heavy ? 0.06 : w.wind, act = a.heavy ? 0.13 : w.active, rec = a.heavy ? w.rec + 0.16 : w.rec * (a.fin ? 1.3 : 1);
    if (a.phase === 'wind' && a.pt >= wind) { a.phase = 'active'; a.pt = 0; A.play('swing', a.heavy); const reach = a.heavy ? w.heavy.reach : w.reach; HL.fx.slash(this.x, this.y - 5, this.face, w.kind === 'spear' ? 0.25 : a.heavy ? w.heavy.arc : w.arc, reach - 2, 0.14); }
    if (a.phase === 'active') {
      const step = (a.tgt ? 0.35 : 1) * w.step * (a.heavy ? 1.2 : 1);
      this.vx = Math.cos(this.face) * step * (1 - a.pt / act); this.vy = Math.sin(this.face) * step * (1 - a.pt / act);
      this.hitSweep(w, a);
      if (a.pt >= act) { a.phase = 'rec'; a.pt = 0; this.comboT = rec + 0.25; }
    }
    if (a.phase === 'rec') { this.vx *= 0.7; this.vy *= 0.7; if (a.pt >= rec) { this.state = 'move'; this.atk = null; } }
  }
  hitSweep(w, a) {
    const G = HL.G;
    const reach = a.heavy ? w.heavy.reach : w.reach, arc = a.heavy ? w.heavy.arc : w.arc;
    let dmg = w.dmg * this.dmgMult() * (a.heavy ? w.heavy.mult * (0.75 + 0.25 * a.charge) : a.fin ? w.finisher : 1);
    const opts = { heavy: a.heavy || a.fin, breaker: w.breaker || a.heavy, fx: this.x, fy: this.y, poise: a.heavy ? 40 : a.fin ? 22 : 12 };
    for (const e of G.enemies) {
      if (e.dead || e.hidden || a.hit.has(e)) continue;
      const d = HL.dist(this.x, this.y, e.x, e.y);
      if (d > reach + e.r) continue;
      const ang = Math.atan2(e.y - this.y, e.x - this.x);
      if (Math.abs(HL.angDiff(this.face, ang)) > arc / 2 + (d < 8 ? 1 : 0.15)) continue;
      a.hit.add(e);
      HL.hitEnemy(e, dmg, opts);
    }
    G.hitProps(this, reach, arc, a);
  }
  startUlt(a) {
    this.state = 'ult'; this.t = 0; this.face = a; this.inv = 0.7; this.ult = 0; this.ultHit = new Set(); this.ultFired = false;
    A.play('ult'); HL.G.shake = 2; HL.fx.ring(this.x, this.y - 2, 22, HL.P.lt0, 0.3);
  }
  updateUlt(dt, w) {
    const G = HL.G, kind = w.ult, mult = this.dmgMult();
    this.inv = Math.max(this.inv, 0.1);
    if (kind === 'grave_arc') {
      this.vx = 0; this.vy = 0;
      if (this.t > 0.15 && !this.ultFired) {
        this.ultFired = true; G.hitstop = 0.08; G.shake = 3; A.play('hitHeavy');
        HL.fx.slash(this.x, this.y - 5, this.t * 20, HL.TAU, 26, 0.3); HL.fx.ring(this.x, this.y, 34, HL.P.cream, 0.4, 2);
        for (const e of G.enemies) if (!e.dead && !e.hidden && HL.dist(this.x, this.y, e.x, e.y) < 32 + e.r) HL.hitEnemy(e, 46 * mult, { heavy: true, breaker: true, ult: true, fx: this.x, fy: this.y, poise: 99 });
      }
      if (this.t > 0.5) this.state = 'move';
    } else if (kind === 'ashen_drive') {
      const s = this.t < 0.3 ? 260 : 0;
      this.vx = Math.cos(this.face) * s; this.vy = Math.sin(this.face) * s;
      if (s) HL.fx.dust(this.x, this.y, 1);
      for (const e of G.enemies) if (!e.dead && !e.hidden && !this.ultHit.has(e) && HL.dist(this.x, this.y, e.x, e.y) < 12 + e.r) { this.ultHit.add(e); HL.hitEnemy(e, 52 * mult, { heavy: true, breaker: true, ult: true, fx: this.x, fy: this.y, poise: 99 }); }
      if (this.t > 0.45) this.state = 'move';
    } else {
      this.vx = 0; this.vy = 0;
      if (this.t > 0.42 && !this.ultFired) {
        this.ultFired = true; G.hitstop = 0.12; G.shake = 5; A.play('burst');
        const cx = this.x + Math.cos(this.face) * 10, cy = this.y + Math.sin(this.face) * 10;
        HL.fx.ring(cx, cy, 40, HL.P.cream, 0.5, 2); HL.fx.burst(cx, cy, HL.P.ash1, 16, 70);
        for (const e of G.enemies) if (!e.dead && !e.hidden && HL.dist(cx, cy, e.x, e.y) < 38 + e.r) HL.hitEnemy(e, 72 * mult, { heavy: true, breaker: true, ult: true, fx: cx, fy: cy, poise: 99 });
      }
      if (this.t > 0.75) this.state = 'move';
    }
  }
  hurt(dmg, sx, sy) {
    const G = HL.G;
    if (this.inv > 0 || this.state === 'dead' || G.state !== 'play') return false;
    const real = Math.max(1, Math.round(dmg * (1 - this.def())));
    this.hp -= real; this.inv = 0.6; this.flash = 0.12; G.hitstop = 0.06; G.shake = 2.5; G.hurtVig = 0.6;
    const a = Math.atan2(this.y - sy, this.x - sx);
    this.vx = Math.cos(a) * 90; this.vy = Math.sin(a) * 90;
    HL.fx.burst(this.x, this.y - 5, HL.P.red0, 7, 45);
    A.play('hurt');
    if (this.state !== 'ult') { this.state = 'hurt'; this.t = 0; this.atk = null; this.holdT = -1; this.chargeT = 0; }
    if (this.hp <= 0) { this.hp = 0; this.state = 'dead'; this.t = 0; A.play('die'); G.onDeath(); }
    return true;
  }
  draw(g, silhouette) {
    const G = HL.G, w = this.weaponDef();
    const look = HL.LOOKS[G.eq.armor] || HL.LOOKS.player;
    let wpn = null;
    if (w) {
      const len = w.kind === 'spear' ? 11 : 7;
      let ang;
      if (this.state === 'attack' && this.atk) {
        const a = this.atk, arc = (a.heavy ? w.heavy.arc : w.arc);
        if (w.kind === 'spear') ang = this.face;
        else if (a.phase === 'wind') ang = this.face - (arc / 2) * a.side;
        else if (a.phase === 'active') ang = this.face - (arc / 2) * a.side + arc * a.side * Math.min(1, a.pt / 0.09);
        else ang = this.face + (arc / 2) * a.side;
      } else if (this.state === 'ult') ang = this.t * 25;
      else if (this.chargeT > 0) ang = this.face + Math.PI + 0.6;
      else ang = this.dir === 0 ? 1.9 : this.dir === 1 ? -1.3 : this.dir === 2 ? 1.1 : Math.PI - 1.1;
      wpn = { kind: w.kind, ang, len };
      if (w.kind === 'spear' && this.state === 'attack' && this.atk && this.atk.phase === 'active') wpn.thrust = 3;
    }
    const f = { dir: this.dir, look, moving: this.walkT > 0, t: this.walkT, weapon: wpn, flash: silhouette ? silhouette : this.flash > 0 ? HL.P.cream : null };
    if (this.state === 'roll') { f.pose = 'roll'; f.t = this.t * 3; }
    if (this.state === 'dead') f.pose = 'dead';
    if (!silhouette && this.inv > 0 && this.state !== 'roll' && Math.floor(this.inv * 20) % 2) return;
    HL.drawFigure(g, this.x, this.y, f);
    if (!silhouette && this.chargeT > 0) { const q = HL.clamp(this.chargeT / 0.6, 0, 1); g.fillStyle = q >= 1 ? HL.P.cream : HL.P.cream3; g.fillRect(Math.round(this.x - 4), Math.round(this.y + 2), Math.round(8 * q), 1); }
  }
};

// ------------------------------------------------------------------ hitting things
HL.hitEnemy = function (e, dmg, o) {
  const G = HL.G;
  if (e.dead || e.hidden) return;
  const ang = Math.atan2(o.fy - e.y, o.fx - e.x);
  // the Rustbound Guard's shield
  if (e.type === 'guard' && e.state !== 'stagger' && Math.abs(HL.angDiff(e.face, ang)) < 1.25) {
    if (!o.breaker) {
      dmg *= 0.15; A.play('clank'); HL.fx.burst((e.x + o.fx) / 2, e.y - 6, HL.P.cream, 4, 50, 0.2); G.hitstop = 0.05;
      const p = G.player; const k = Math.atan2(p.y - e.y, p.x - e.x); p.vx += Math.cos(k) * 60; p.vy += Math.sin(k) * 60;
      e.hp -= dmg; e.flash = 0.05; if (e.hp <= 0) HL.killEnemy(e);
      return;
    }
    e.state = 'stagger'; e.t = 0; e.stagT = 1.3; A.play('clank'); HL.fx.text(e.x, e.y - 16, 'guard broken', HL.P.cream2, 0.8);
  }
  let mult = 1;
  if (e.vuln > 0) mult = 1.5;
  if (e.type === 'keeper' && e.stunned > 0) mult = 1.6;
  e.hp -= dmg * mult; e.flash = 0.09; e.aggro = true;
  G.hitstop = Math.max(G.hitstop, o.heavy ? 0.085 : 0.045); G.shake = Math.max(G.shake, o.heavy ? 2.2 : 1);
  A.play(o.heavy ? 'hitHeavy' : 'hit');
  HL.fx.burst(e.x, e.y - 5, e.type === 'guard' || e.type === 'keeper' ? HL.P.st0 : HL.P.red0, o.heavy ? 9 : 5, o.heavy ? 60 : 40);
  if (G.eq.relic === 'bell_shard' && !o.ult) G.player.ult = Math.min(100, G.player.ult + (o.heavy ? 9 : 6));
  if (e.type !== 'keeper') {
    const kb = (o.heavy ? 70 : 38) * (e.type === 'guard' ? 0.4 : 1);
    e.vx = -Math.cos(ang) * kb; e.vy = -Math.sin(ang) * kb;
    e.poiseDmg = (e.poiseDmg || 0) + (o.poise || 10);
    if (e.poiseDmg >= e.def.poise && e.state !== 'stagger' && e.type !== 'lurker') { e.state = 'stagger'; e.t = 0; e.stagT = 0.45; e.poiseDmg = 0; e.tele = null; }
  }
  if (e.hp <= 0) HL.killEnemy(e);
};
HL.killEnemy = function (e) {
  const G = HL.G;
  if (e.dead) return;
  e.dead = true; e.deadT = 0; e.tele = null;
  A.play('die');
  HL.fx.burst(e.x, e.y - 4, e.type === 'guard' ? HL.P.st1 : HL.P.red1, 12, 50, 0.6);
  if (G.eq.relic === 'bell_shard') G.player.ult = Math.min(100, G.player.ult + 10);
  for (const [item, ch] of e.def.drops) if (Math.random() < ch) G.dropItem(item, 1, e.x + (Math.random() - 0.5) * 8, e.y + (Math.random() - 0.5) * 6);
  if (e.id) G.flags['k:' + e.id] = 1;
  G.onEnemyDeath(e);
};

// ------------------------------------------------------------------ enemies
HL.Enemy = class Enemy {
  constructor(spec) {
    const d = HL.FOES[spec.foe];
    Object.assign(this, { type: spec.foe, def: d, id: spec.id, x: spec.x, y: spec.y, hx: spec.x, hy: spec.y, r: d.r, hp: d.hp, maxhp: d.hp, vx: 0, vy: 0, face: Math.PI / 2, state: 'idle', t: Math.random() * 2, flash: 0, walkT: 0, vuln: 0, tele: null, wander: null, summoned: !!spec.summoned });
    if (this.type === 'lurker') { this.hidden = true; this.state = 'hidden'; this.emerge = 0; }
    if (this.type === 'keeper') { this.state = 'dormant'; this.stunned = 0; this.cool = 1.5; this.summons = 0; this.chainA = 0; }
    if (spec.summoned) { this.state = 'chase'; this.aggro = true; }
  }
  get G() { return HL.G; }
  update(dt) {
    const G = this.G, p = G.player;
    this.t += dt; this.flash = Math.max(0, this.flash - dt); this.vuln = Math.max(0, this.vuln - dt);
    if (this.dead) { this.deadT += dt; return; }
    // knockback
    if (Math.abs(this.vx) + Math.abs(this.vy) > 1) { G.world.move(this, this.vx * dt, this.vy * dt); this.vx *= 0.82; this.vy *= 0.82; }
    const dx = p.x - this.x, dy = p.y - this.y, dist = Math.hypot(dx, dy), toP = Math.atan2(dy, dx);
    const sees = p.state !== 'dead' && dist < this.def.aggro && G.world.los(this.x, this.y - 4, p.x, p.y - 4);
    if (this.state === 'stagger') { this.stagT -= dt; if (this.stagT <= 0) { this.state = 'chase'; this.t = 0; } return; }
    this['ai_' + this.type](dt, p, dist, toP, sees);
  }
  stepToward(a, sp, dt) {
    const G = this.G, ox = this.x, oy = this.y;
    G.world.move(this, Math.cos(a) * sp * dt, Math.sin(a) * sp * dt);
    if (HL.dist(ox, oy, this.x, this.y) < sp * dt * 0.3) { // blocked: slide around
      const s = (this.slide = this.slide || (Math.random() < 0.5 ? 1 : -1));
      G.world.move(this, Math.cos(a + s * 1.4) * sp * dt, Math.sin(a + s * 1.4) * sp * dt);
      if (Math.random() < 0.01) this.slide = -s;
    }
    this.walkT += dt * 1.6;
  }
  leashCheck(dist) {
    if (HL.dist(this.x, this.y, this.hx, this.hy) > this.def.leash && dist > 50) { this.state = 'return'; this.tele = null; return true; }
    return false;
  }
  idle(dt, sees) {
    if (sees) { this.state = 'alert'; this.t = 0; this.face = Math.atan2(this.G.player.y - this.y, this.G.player.x - this.x); if (this.type === 'hound') A.play('bark'); else A.play('growl'); return; }
    if (!this.wander || this.t > this.wander.t) this.wander = { a: Math.random() * HL.TAU, t: this.t + 1.5 + Math.random() * 2.5, go: Math.random() < 0.5 };
    if (this.wander.go && HL.dist(this.x, this.y, this.hx, this.hy) < 30) { this.face = this.wander.a; this.stepToward(this.wander.a, this.def.speed * 0.4, dt); }
    else if (this.wander.go) { const a = Math.atan2(this.hy - this.y, this.hx - this.x); this.face = a; this.stepToward(a, this.def.speed * 0.4, dt); }
  }
  common(dt, dist, toP, sees) {
    if (this.state === 'idle') { this.idle(dt, sees); return true; }
    if (this.state === 'alert') { if (this.t > 0.45) { this.state = 'chase'; this.t = 0; } return true; }
    if (this.state === 'return') {
      const a = Math.atan2(this.hy - this.y, this.hx - this.x); this.face = a; this.stepToward(a, this.def.chase, dt);
      this.hp = Math.min(this.maxhp, this.hp + 20 * dt);
      if (HL.dist(this.x, this.y, this.hx, this.hy) < 6) { this.state = 'idle'; this.t = 0; }
      return true;
    }
    if (this.state === 'chase' && !sees && dist > this.def.aggro * 1.4 && !this.summoned) { this.state = 'return'; return true; }
    return false;
  }
  hitPlayerIf(cond, dmg) { if (!this.hitDone && cond) { if (this.G.player.hurt(dmg, this.x, this.y)) this.hitDone = true; } }

  ai_drifter(dt, p, dist, toP, sees) {
    if (this.common(dt, dist, toP, sees)) return;
    if (this.state === 'chase') {
      if (this.leashCheck(dist)) return;
      this.face = toP; this.stepToward(toP, this.def.chase, dt);
      if (dist < 21 && sees) { this.state = 'tele'; this.t = 0; this.lockA = toP; }
    } else if (this.state === 'tele') {
      this.face = this.lockA = HL.lerp(this.lockA, toP, 0.1);
      if (this.t > 0.55) { this.state = 'atk'; this.t = 0; this.hitDone = false; A.play('swing'); }
    } else if (this.state === 'atk') {
      this.G.world.move(this, Math.cos(this.lockA) * 92 * dt, Math.sin(this.lockA) * 92 * dt);
      this.hitPlayerIf(dist < this.r + p.r + 4, this.def.dmg);
      if (this.t > 0.22) { this.state = 'rec'; this.t = 0; }
    } else if (this.state === 'rec') { if (this.t > 0.75) { this.state = 'chase'; this.t = 0; } }
  }
  ai_hound(dt, p, dist, toP, sees) {
    if (this.common(dt, dist, toP, sees)) return;
    if (this.state === 'chase') {
      if (this.leashCheck(dist)) return;
      if (dist > 40) { this.face = toP; this.stepToward(toP, this.def.chase, dt); this.circT = 0; }
      else { // circle at a distance, then pounce
        this.circT = (this.circT || 0) + dt; this.cdir = this.cdir || (Math.random() < 0.5 ? 1 : -1);
        const a = toP + this.cdir * 1.5 + (dist < 30 ? 0.6 * this.cdir : 0); this.face = toP; this.stepToward(a, this.def.chase * 0.7, dt);
        if (this.circT > 0.8 + Math.random() * 0.8 && sees) { this.state = 'tele'; this.t = 0; A.play('bark'); }
      }
    } else if (this.state === 'tele') {
      this.face = toP; this.lockA = Math.atan2(p.y + p.vy * 0.15 - this.y, p.x + p.vx * 0.15 - this.x);
      if (this.t > 0.38) { this.state = 'atk'; this.t = 0; this.hitDone = false; }
    } else if (this.state === 'atk') {
      this.G.world.move(this, Math.cos(this.lockA) * 150 * dt, Math.sin(this.lockA) * 150 * dt);
      this.hitPlayerIf(dist < this.r + p.r + 3, this.def.dmg);
      if (this.t > 0.3) { if (this.hitDone) { this.state = 'rec'; this.t = 0.3; } else { this.state = 'dazed'; this.t = 0; this.vuln = 0.95; HL.fx.text(this.x, this.y - 12, '?', HL.P.cream2, 0.8); } }
    } else if (this.state === 'dazed') { if (this.t > 0.95) { this.state = 'chase'; this.t = 0; this.cdir = -this.cdir; } }
    else if (this.state === 'rec') { this.stepToward(toP + Math.PI, this.def.chase * 0.5, dt); if (this.t > 0.7) { this.state = 'chase'; this.t = 0; } }
  }
  ai_archer(dt, p, dist, toP, sees) {
    if (this.common(dt, dist, toP, sees)) return;
    if (this.state === 'chase') {
      if (this.leashCheck(dist)) return;
      this.face = toP;
      if (dist < 42) this.stepToward(toP + Math.PI + (this.slide || 1) * 0.5, this.def.chase, dt);
      else if (dist > 95 || !sees) this.stepToward(toP, this.def.chase, dt);
      else { this.stepToward(toP + Math.PI / 2 * (this.slide || 1), this.def.speed * 0.5, dt); if (this.t > 0.6) { this.state = 'tele'; this.t = 0; } }
    } else if (this.state === 'tele') {
      if (this.t < 0.55) this.lockA = toP;
      this.face = this.lockA;
      this.tele = { k: 'line', a: this.lockA, len: 110, q: this.t / 0.8 };
      if (this.t > 0.8) {
        this.tele = null; this.state = 'rec'; this.t = 0; A.play('twang');
        this.G.shots.push({ x: this.x + Math.cos(this.lockA) * 5, y: this.y - 5 + Math.sin(this.lockA) * 4, vx: Math.cos(this.lockA) * 150, vy: Math.sin(this.lockA) * 150, life: 1.2, dmg: this.def.dmg, from: this });
      }
      if (!sees && this.t < 0.55) { this.tele = null; this.state = 'chase'; }
    } else if (this.state === 'rec') { if (this.t > 0.7) { this.state = 'chase'; this.t = 0; this.slide = -(this.slide || 1); } }
  }
  ai_guard(dt, p, dist, toP, sees) {
    if (this.common(dt, dist, toP, sees)) return;
    const turn = (rate) => { this.face += HL.clamp(HL.angDiff(this.face, toP), -rate * dt, rate * dt); };
    if (this.state === 'chase') {
      if (this.leashCheck(dist)) return;
      turn(2.2); this.stepToward(this.face, this.def.chase, dt);
      if (dist < 24) { this.state = 'tele'; this.t = 0; }
    } else if (this.state === 'tele') {
      turn(1.2);
      const cx = this.x + Math.cos(this.face) * 13, cy = this.y + Math.sin(this.face) * 11;
      this.tele = { k: 'ring', x: cx, y: cy, r: 16, q: this.t / 0.85 };
      if (this.t > 0.85) {
        this.tele = null; this.state = 'rec'; this.t = 0; A.play('hitHeavy'); this.G.shake = 2.5;
        HL.fx.ring(cx, cy, 18, HL.P.ash1, 0.35); HL.fx.burst(cx, cy, HL.P.ash2, 8, 40);
        if (HL.dist(p.x, p.y, cx, cy) < 16 + p.r) p.hurt(this.def.dmg, cx, cy);
      }
    } else if (this.state === 'rec') { turn(0.6); if (this.t > 1.0) { this.state = 'chase'; this.t = 0; } }
  }
  ai_lurker(dt, p, dist, toP) {
    if (this.state === 'hidden') { this.hidden = true; this.hp = Math.min(this.maxhp, this.hp + 10 * dt); if (dist < this.def.aggro && p.state !== 'dead') { this.state = 'emerge'; this.t = 0; A.play('growl'); HL.fx.dust(this.x, this.y, 6); } return; }
    if (this.state === 'emerge') { this.emerge = this.t / 0.5; if (this.t > 0.5) { this.hidden = false; this.state = 'wait'; this.t = 0.6; } return; }
    this.hidden = false;
    if (dist > this.def.leash) { this.state = 'hidden'; this.hidden = true; this.tele = null; this.emerge = 0; return; }
    if (this.state === 'wait') { if (this.t > 1.3) { this.state = 'tele'; this.t = 0; this.tx = p.x; this.ty = p.y; } }
    else if (this.state === 'tele') {
      if (this.t < 0.3) { this.tx = p.x; this.ty = p.y; }
      this.tele = { k: 'ring', x: this.tx, y: this.ty, r: 11, q: this.t / 0.75 };
      if (this.t > 0.75) {
        this.tele = null; this.state = 'wait'; this.t = 0; A.play('burst');
        HL.fx.burst(this.tx, this.ty, HL.P.mo2, 10, 45); HL.fx.ring(this.tx, this.ty, 12, HL.P.mo1, 0.3);
        if (HL.dist(p.x, p.y, this.tx, this.ty) < 11 + p.r) p.hurt(this.def.dmg, this.tx, this.ty);
      }
    }
  }
  // -------------------------------------------------------------- the Bellworn Keeper
  ai_keeper(dt, p, dist, toP) {
    const G = this.G;
    this.chainA += dt * 0.6;
    if (this.state === 'dormant') { if (G.bossAwake) { this.state = 'intro'; this.t = 0; A.play('toll'); G.shake = 3; } return; }
    if (this.state === 'intro') { if (this.t > 1.6) { this.state = 'walk'; this.t = 0; } return; }
    if (this.stunned > 0) { this.stunned -= dt; this.tele = null; this.armsUp = false; if (this.stunned <= 0) { this.state = 'walk'; this.t = 0; } return; }
    const rage = this.hp < this.maxhp * 0.35, sp = rage ? 0.8 : 1;
    this.rage = rage;
    // summons at 55% and 25%
    if (this.state === 'walk' && ((this.summons === 0 && this.hp < this.maxhp * 0.55) || (this.summons === 1 && this.hp < this.maxhp * 0.25))) { this.summons++; this.state = 'summon'; this.t = 0; }
    if (this.state === 'walk') {
      this.face = toP; this.cool -= dt;
      if (dist > 26) this.stepToward(toP, this.def.chase * (rage ? 1.25 : 1), dt);
      if (this.cool <= 0) {
        const r = Math.random();
        if (dist < 40 && r < 0.55) this.state = 'sweep';
        else if (this.hp < this.maxhp * 0.75 && r < 0.8) this.state = 'toll';
        else this.state = 'slam';
        this.t = 0; this.hitDone = false; this.lockA = toP; this.tx = p.x; this.ty = p.y;
      }
    } else if (this.state === 'sweep') {
      if (this.t < 0.35 * sp) this.lockA = toP;
      const T = 0.9 * sp;
      this.tele = { k: 'arc', x: this.x, y: this.y, r: 44, a: this.lockA, arc: 3.4, q: this.t / T };
      if (this.t > T) {
        this.tele = null; A.play('hitHeavy'); G.shake = 3; HL.fx.slash(this.x, this.y - 6, this.lockA, 3.4, 40, 0.25, HL.P.ash1);
        if (dist < 46 && Math.abs(HL.angDiff(this.lockA, toP)) < 1.7) p.hurt(this.def.dmg, this.x, this.y);
        this.state = 'rec'; this.t = 0; this.recT = 0.85;
      }
    } else if (this.state === 'slam') {
      const T = 1.05 * sp;
      if (this.t < 0.45 * sp) { this.tx = p.x; this.ty = p.y; }
      this.armsUp = true;
      this.tele = { k: 'ring', x: this.tx, y: this.ty, r: 22, q: this.t / T };
      if (this.t > T) {
        this.tele = null; this.armsUp = false; A.play('burst'); G.shake = 4;
        HL.fx.ring(this.tx, this.ty, 24, HL.P.ash1, 0.4, 2); HL.fx.burst(this.tx, this.ty, HL.P.st1, 14, 60);
        if (HL.dist(p.x, p.y, this.tx, this.ty) < 22 + p.r) p.hurt(this.def.dmg + 4, this.tx, this.ty);
        this.state = 'rec'; this.t = 0; this.recT = 0.7;
      }
    } else if (this.state === 'toll') {
      const T = 0.75 * sp;
      if (this.t < T) this.tele = { k: 'glow', x: this.x, y: this.y, q: this.t / T };
      else if (!this.wave) { this.tele = null; A.play('toll'); G.shake = 2; this.wave = { r: 4 }; }
      if (this.wave) {
        this.wave.r += 105 * dt;
        if (!this.hitDone && Math.abs(dist - this.wave.r) < 5 && p.inv <= 0) { if (p.hurt(16, this.x, this.y)) this.hitDone = true; }
        if (this.wave.r > 130) { this.wave = null; this.state = 'rec'; this.t = 0; this.recT = 0.5; }
      }
    } else if (this.state === 'summon') {
      this.tele = { k: 'glow', x: this.x, y: this.y, q: this.t };
      if (this.t > 1.0) {
        this.tele = null; A.play('toll');
        for (const [sx, sy] of [[12 * 8, 18 * 8], [28 * 8, 18 * 8]]) { G.spawnEnemy({ foe: 'drifter', x: sx, y: sy, summoned: true }); HL.fx.ring(sx, sy, 10, HL.P.red0, 0.5); }
        this.state = 'rec'; this.t = 0; this.recT = 0.6;
      }
    } else if (this.state === 'rec') {
      if (this.t > this.recT) { this.state = 'walk'; this.t = 0; this.cool = (rage ? 0.6 : 1.1) + Math.random() * 0.6; }
    }
  }
  drawTele(g) {
    const P = HL.P, tl = this.tele;
    if (this.dead) return;
    if (this.wave) { HL.ringPx(g, this.x, this.y, this.wave.r, P.red0, 2); HL.ringPx(g, this.x, this.y, Math.max(1, this.wave.r - 4), P.red2, 1); }
    if (!tl) return;
    const q = HL.clamp(tl.q, 0, 1);
    if (tl.k === 'ring') { HL.discDither(g, tl.x, tl.y, tl.r, P.red1, 0.15 + q * 0.45); HL.ringPx(g, tl.x, tl.y, tl.r, q > 0.8 ? P.red0 : P.red1); HL.ringPx(g, tl.x, tl.y, tl.r * q, P.red0); }
    else if (tl.k === 'arc') { HL.discDither(g, tl.x, tl.y, tl.r, P.red1, 0.1 + q * 0.45, tl.a - tl.arc / 2, tl.a + tl.arc / 2); HL.ringPx(g, tl.x, tl.y, tl.r, P.red0, 1, tl.a - tl.arc / 2, tl.a + tl.arc / 2); }
    else if (tl.k === 'line') { g.fillStyle = q > 0.7 ? P.red0 : P.red1; const n = tl.len * Math.min(1, q * 1.5); for (let i = 6; i < n; i += 2) { const x = this.x + Math.cos(tl.a) * i, y = this.y - 4 + Math.sin(tl.a) * i; if (this.G.world.sightBlocked(x, y)) break; g.fillRect(Math.round(x), Math.round(y), 1, 1); } }
    else if (tl.k === 'glow') { HL.ringPx(g, tl.x, tl.y, 10 + (q % 0.3) * 30, P.red0); }
  }
  draw(g, sil) {
    const P = HL.P;
    const flash = sil || (this.flash > 0 ? P.cream : null);
    if (this.dead && this.deadT > 1.6 && this.type !== 'keeper') return;
    const pose = this.dead ? 'dead' : null;
    const glint = this.state === 'tele' || this.state === 'alert';
    const moving = this.state === 'chase' || this.state === 'idle' && this.wander && this.wander.go || this.state === 'return' || this.state === 'walk';
    const dir = dirOf(this.face);
    if (this.type === 'hound') HL.drawHound(g, this.x, this.y, { ang: this.face, t: this.walkT, flash, pose, glint });
    else if (this.type === 'lurker') HL.drawLurker(g, this.x, this.y, { pose: this.hidden ? 'hidden' : pose, t: this.t, emerge: this.state === 'emerge' ? this.emerge : 1, flash });
    else if (this.type === 'keeper') HL.drawKeeper(g, this.x, this.y, { t: this.t, flash, pose, armsUp: this.armsUp, stunned: this.stunned > 0, rage: this.rage, chainA: this.chainA });
    else {
      const look = HL.LOOKS[this.type];
      let weapon = null;
      if (this.type === 'archer') weapon = { kind: 'bow', ang: this.face };
      if (this.type === 'guard') weapon = { kind: 'maul', ang: this.state === 'tele' ? this.face + Math.PI : this.state === 'rec' && this.t < 0.3 ? this.face : dir === 0 ? 1.7 : dir === 1 ? -1.4 : dir === 2 ? 1.2 : Math.PI - 1.2 };
      if (this.type === 'drifter') weapon = { kind: 'claw', ang: this.face };
      HL.drawFigure(g, this.x, this.y + (this.state === 'tele' && this.type === 'drifter' ? 1 : 0), { dir, look, moving, t: this.walkT, weapon, flash, pose, glint, shield: this.type === 'guard' && !this.dead, tabard: this.type === 'guard' ? P.red0 : null });
    }
    if (!sil && this.state === 'alert' && !this.dead) HL.text(g, '!', this.x, this.y - (this.type === 'keeper' ? 40 : 20), P.red0, 0.5, 1, P.ink);
    if (!sil && this.vuln > 0 && !this.dead) { g.fillStyle = P.cream; g.fillRect(Math.round(this.x) - 1, Math.round(this.y) - 14, 3, 1); }
    // tiny health tick under wounded foes
    if (!sil && !this.dead && this.hp < this.maxhp && this.type !== 'keeper' && !this.hidden) {
      const w = 8, f = Math.max(0, this.hp / this.maxhp);
      g.fillStyle = P.ink; g.fillRect(Math.round(this.x - w / 2), Math.round(this.y + 2), w, 1);
      g.fillStyle = P.red0; g.fillRect(Math.round(this.x - w / 2), Math.round(this.y + 2), Math.ceil(w * f), 1);
    }
  }
};
