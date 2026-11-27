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
  weaponDef() { const id = this.G.eq.weapon; return (id && HL.WEAPONS[id]) || HL.FISTS; }
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
    const G = this.G, w = this.weaponDef(); this.inp = inp;
    this.t += dt; this.inv = Math.max(0, this.inv - dt); this.flash = Math.max(0, this.flash - dt); this.comboT = Math.max(0, this.comboT - dt);
    if (this.regen > 0) { this.regen -= dt; this.hp = Math.min(this.maxhp, this.hp + 3 * dt); }
    this.stDelay -= dt;
    if (this.stDelay <= 0 && this.state !== 'roll' && this.state !== 'attack') this.st = Math.min(this.maxst, this.st + 42 * (G.eq.relic === 'ember_charm' ? 1.35 : 1) * dt);
    if (this.state === 'dead') return;
    const mlen = Math.hypot(inp.mx, inp.my), mvA = Math.atan2(inp.my, inp.mx);
    // buffered inputs
    if (inp.dodge) this.buffer = { k: 'dodge', t: 0.18 };
    // press the attack button and drag to aim; release to strike that way (a tap strikes the nearest foe).
    // Hold past ~0.4 s to charge: the release becomes a heavy blow.
    if (inp.attack && w) { this.holdT = 0; this.aimA = null; }
    if (this.holdT >= 0) {
      this.holdT += dt;
      if (inp.aimX != null) { this.aimA = Math.atan2(inp.aimY, inp.aimX); if (this.state === 'move') this.face = this.aimA; }
      this.chargeT = Math.max(0, this.holdT - 0.42);
      if (inp.attackUp || !inp.attackDown) {
        const heavy = this.chargeT > 0.05;
        this.buffer = { k: heavy ? 'heavy' : 'light', t: 0.25, charge: 0.3 + this.chargeT, aim: this.aimA };
        this.holdT = -1; this.chargeT = 0; this.aimA = null;
      }
    }
    if (this.buffer) { this.buffer.t -= dt; if (this.buffer.t <= 0) this.buffer = null; }
    const canAct = this.state === 'move' || (this.state === 'attack' && this.atk.phase === 'rec') || (this.state === 'heal' && this.t > 0.15);
    if (this.buffer && canAct) {
      const b = this.buffer;
      if (b.k === 'dodge' && this.st > 0) { this.buffer = null; return this.startRoll(mlen > 0.2 ? mvA : this.face); }
      const ex = b.k === 'light' && b.aim == null ? HL.Epic.findExec(this) : null;
      if (ex) { this.buffer = null; HL.Epic.execute(this, ex); return; }
      if ((b.k === 'light' || b.k === 'heavy') && w && this.st > 0 && (this.state !== 'attack' || this.atk.phase === 'rec')) { this.buffer = null; this.startAttack(b.k === 'heavy', b.charge, b.aim != null ? b.aim : mlen > 0.2 ? mvA : null, b.aim != null); }
    }
    // Sigil of the Ward: a shell of light returns every 10 s
    if (G.flags['sigil:ward'] && !this.ward) { this.wardT = (this.wardT || 0) - dt; if (this.wardT <= 0) { this.ward = true; HL.vfx.ring3d(this.x, this.y, 6, 10, '#7fe8e0', 0.4); A.play('pickup'); } }
    // Sigil of Radiance: Lumen Burst
    this.skillCd = Math.max(0, (this.skillCd || 0) - dt);
    if (inp.skill && G.flags['sigil:burst'] && this.skillCd <= 0 && (this.state === 'move' || (this.state === 'attack' && this.atk.phase === 'rec'))) this.lumenBurst();
    if (inp.ult && this.state === 'move' && G.eq.relic === 'bell_shard' && this.ult >= 100 && G.eq.weapon) return this.startUlt(mlen > 0.2 ? mvA : this.face);
    let sp = this.speed();
    switch (this.state) {
      case 'move': {
        if (this.chargeT > 0) sp *= 0.45;
        const tx = inp.mx * sp, ty = inp.my * sp;
        this.vx = HL.approach(this.vx, tx, 520 * dt); this.vy = HL.approach(this.vy, ty, 520 * dt);
        if (mlen > 0.15) { this.face = mvA; }
        break;
      }
      case 'roll': { // the dash: a short, fast burst that slips through attacks and foes (a blink with the Sigil)
        const blink = G.flags['sigil:blink'], D = 0.17, k = this.t / D, s = this.t < D ? (blink ? 420 : 280) * (1 - k * 0.5) : 30;
        if (blink && this.t < D) { HL.vfx.burst(this.x, this.y, 6, '#7fe8e0', 2, 20, 0.35); this.ghostReq = Math.random() < 0.5; }
        this.vx = Math.cos(this.rollA) * s; this.vy = Math.sin(this.rollA) * s;
        if (this.t < D) for (let i = 0; i < 2; i++) HL.fx.add({ k: 'p', x: this.x + (Math.random() - 0.5) * 3, y: this.y, vx: 0, vy: 0, z: 2 + Math.random() * 8, vz: 0, col: i ? HL.P.cream3 : HL.P.ash1, life: 0.22 });
        if (this.t > D + 0.07) this.state = 'move';
        break;
      }
      case 'attack': this.updateAttack(dt, w); break;
      case 'heal': { this.vx = inp.mx * sp * 0.4; this.vy = inp.my * sp * 0.4; if (this.t > 0.55) { this.hp = Math.min(this.maxhp, this.hp + 45); HL.fx.burst(this.x, this.y - 6, HL.P.cream2, 6, 20); this.state = 'move'; } break; }
      case 'hurt': { this.vx *= 0.85; this.vy *= 0.85; if (this.t > 0.2) this.state = 'move'; break; }
      case 'ult': this.updateUlt(dt, w); break;
      case 'exec': { // the finisher: a leap and a killing blow
        this.vx = 0; this.vy = 0; this.lift = Math.sin(HL.clamp(this.t / 0.3, 0, 1) * Math.PI) * 10; this.inv = Math.max(this.inv, 0.1);
        if (this.t > 0.15 && this.execT) { const e = this.execT; this.execT = null; if (!e.dead) HL.Epic.execHit(this, e); }
        if (this.t > 0.38) { this.state = 'move'; this.lift = 0; }
        break;
      }
    }
    this.dir = dirOf(this.face);
    const moved = HL.dist(0, 0, this.vx, this.vy) > 4;
    G.world.riftPass = this.state === 'roll' && G.flags['sigil:blink'] && this.t < 0.2;
    G.world.move(this, this.vx * dt, this.vy * dt);
    if (G.world.riftPass && G.world.blocked(this.x, this.y, this.r)) { G.world.riftPass = true; } // still over the rift: the blink carries on
    G.world.riftPass = false;
    if (G.world.blocked(this.x, this.y, this.r)) { // landed inside a rift: finish the crossing
      const a = this.rollA || this.face; for (let k = 1; k < 14; k++) { const nx = this.x + Math.cos(a) * k * 2, ny = this.y + Math.sin(a) * k * 2; if (!G.world.blocked(nx, ny, this.r)) { this.x = nx; this.y = ny; break; } }
    }
    if (moved) {
      this.walkT += dt * (this.state === 'move' ? 1.9 : 0);
      this.stepT -= dt;
      if (this.stepT <= 0 && this.state === 'move') { this.stepT = 0.29; A.play('step', G.world.surface(this.x, this.y)); if (Math.random() < 0.3) HL.fx.dust(this.x, this.y, 1); }
    } else this.walkT = 0;
  }
  lumenBurst() {
    const G = HL.G, V = HL.vfx, C = '#7fe8e0';
    this.skillCd = 7; this.state = 'move'; this.atk = null;
    A.play('toll'); A.play('burst'); G.shake = 4;
    V.shock(this.x, this.y, 48, C, 0.55); V.shock(this.x, this.y, 30, '#e0fffb', 0.4); V.beam(this.x, this.y, C, 0.6, 7, 110); V.burst(this.x, this.y, 6, C, 30, 110);
    V.flash('#d8fffa', 0.35); V.chroma(1); V.kick(1); V.light(this.x, this.y, 0x7fe8e0, 180, 0.4);
    for (const e of G.enemies) if (!e.dead && !e.hidden && HL.dist(this.x, this.y, e.x, e.y) < 44 + e.r) HL.hitEnemy(e, 26 * this.dmgMult(), { heavy: true, breaker: true, fx: this.x, fy: this.y, poise: 99, col: C });
    for (const o of G.world.objects) if ((o.t === 'resonator' || o.t === 'pylon') && HL.dist(this.x, this.y, o.x, o.y) < 46) G.strikeProp(o);
    for (const o of G.world.objects) if (o.t === 'gate' && o.kind === 'thorns' && !o.open && HL.dist(this.x, this.y, o.x, o.y) < 54) G.breakGate(o);
  }
  startRoll(a) {
    this.perfectUsed = false; HL.Epic.onDash(this);
    if (HL.Epic.has('twin')) this.st += HL.G.flags['sigil:blink'] ? 7 : 9;
    this.state = 'roll'; this.t = 0; this.rollA = a; this.face = a; this.inv = HL.G.flags['sigil:blink'] ? 0.28 : 0.22; this.spend(HL.G.flags['sigil:blink'] ? 14 : 18);
    if (HL.G.flags['sigil:blink']) { HL.vfx.ring3d(this.x, this.y, 5, 9, '#7fe8e0', 0.3); A.play('bellHigh'); } this.atk = null; this.holdT = -1; this.chargeT = 0;
    A.play('roll'); HL.fx.dust(this.x, this.y, 4); HL.vfx.dust(this.x, this.y, 6); HL.vfx.kick(0.2);
  }
  startAttack(heavy, charge, aimA, aimed) {
    const w = this.weaponDef();
    const tgt = aimed ? null : this.nearestFoe((heavy ? w.heavy.reach : w.reach) + 14) || HL.G.targetProp(this, w.reach + 8);
    if (tgt) this.face = Math.atan2(tgt.y - this.y, tgt.x - this.x); else if (aimA != null) this.face = aimA;
    if (!heavy && this.state === 'attack' && this.comboT > 0) this.combo = (this.combo + 1) % w.combo; else if (!heavy && this.comboT <= 0) this.combo = 0;
    const fin = !heavy && this.combo === w.combo - 1 && w.combo > 1;
    this.state = 'attack'; this.t = 0;
    this.atk = { heavy, fin, phase: 'wind', pt: 0, hit: new Set(), charge: HL.clamp(((charge || 0) - 0.3) / 0.6, 0, 1), side: this.combo % 2 ? -1 : 1, tgt: !!tgt };
    this.spend(heavy ? w.heavy.stam : w.stam);
    this.vx *= 0.3; this.vy *= 0.3;
  }
  updateAttack(dt, w) {
    const a = this.atk, H = a.heavy ? w.heavy : null, spin = H && H.spin; a.pt += dt;
    const wind = a.heavy ? (H.slam ? 0.2 : 0.06) : w.wind, act = spin ? spin.dur : a.heavy ? (H.lunge ? 0.2 : 0.13) : w.active, rec = a.heavy ? w.rec + 0.14 : w.rec * (a.fin ? 1.3 : 1);
    if (a.phase === 'wind') {
      this.vx *= 0.8; this.vy *= 0.8;
      if (H && H.slam) this.lift = Math.sin(Math.min(1, a.pt / wind) * Math.PI * 0.5) * 7;
      if (a.pt >= wind) { a.phase = 'active'; a.pt = 0; this.onStrike(w, a); }
    }
    if (a.phase === 'active') {
      const shooter = w.shoot && !(H && H.nova);
      if (spin) { // whirlwind: steer with the stick, everything around is cut every tick
        a.tick = (a.tick || 0) + dt;
        if (a.tick >= spin.tick) { a.tick = 0; a.hit.clear(); A.play('swing'); }
        this.face += dt * 24;
        const m = this.inp || { mx: 0, my: 0 }; this.vx = m.mx * 48; this.vy = m.my * 48;
      } else if (H && H.lunge) { const s = H.lunge * 2.6 * (1 - a.pt / act); this.vx = Math.cos(this.face) * s; this.vy = Math.sin(this.face) * s; this.inv = Math.max(this.inv, 0.05); }
      else if (!shooter) { const step = (a.tgt ? 0.35 : 1) * w.step * (a.heavy ? 1.2 : 1); this.vx = Math.cos(this.face) * step * (1 - a.pt / act); this.vy = Math.sin(this.face) * step * (1 - a.pt / act); }
      else { this.vx *= 0.6; this.vy *= 0.6; }
      if (!shooter) this.hitSweep(w, a);
      if (a.pt >= act) { a.phase = 'rec'; a.pt = 0; this.comboT = rec + 0.25; this.lift = 0; }
    }
    if (a.phase === 'rec') { this.vx *= 0.7; this.vy *= 0.7; if (a.pt >= rec) { this.state = 'move'; this.atk = null; } }
  }
  // the moment a blow comes out: each weapon family has its own
  onStrike(w, a) {
    const G = HL.G, V = HL.vfx, P = HL.P, H = a.heavy ? w.heavy : null, reach = H ? H.reach : w.reach, arc = H ? H.arc : w.arc;
    const c = Math.cos(this.face), s = Math.sin(this.face);
    A.play('swing', a.heavy);
    HL.Epic.onStrike(this);
    if (w.shoot && !(H && H.nova)) {
      const spd = w.shoot.speed * (a.heavy ? 1.35 : 1), dmg = w.dmg * this.dmgMult() * (a.heavy ? H.mult * (0.75 + 0.25 * a.charge) : 1);
      G.pshots.push({ x: this.x + c * 6, y: this.y + s * 6, vx: c * spd, vy: s * spd, dmg, life: reach / spd + 0.15, pierce: !!(a.heavy && H.pierce), col: a.heavy ? P.lt0 : w.shoot.col, size: a.heavy ? 8 : 5, seek: w.shoot.seek || 0, hit: new Set(), heavy: a.heavy, kind: w.kind });
      A.play(w.kind === 'bow' ? 'twang' : 'bellHigh');
      V.burst(this.x + c * 7, this.y + s * 7, 7, w.shoot.col, a.heavy ? 12 : 5, 40, 0.3);
      if (a.heavy) { V.kick(0.6); V.flash(w.shoot.col, 0.18); V.ring3d(this.x, this.y, 6, 10, w.shoot.col, 0.3); }
      return;
    }
    if (H && H.nova) { A.play('bellMid'); V.shock(this.x, this.y, reach + 6, '#9fd0ff', 0.5); V.burst(this.x, this.y, 6, '#cfe6ff', 24, 90); V.light(this.x, this.y, 0x9fd0ff, 120, 0.35); V.flash('#bfe0ff', 0.25); V.kick(0.7); G.shake = 3; return; }
    if (H && H.slam) { A.play('burst'); const x = this.x + c * 6, y = this.y + s * 6; V.shock(x, y, reach + 8, P.fire, 0.5); V.debris(x, y, 14, P.st2, 1.1); V.crack(x, y, 16); V.dust(x, y, 10); V.light(x, y, 0xffa060, 100, 0.3); V.kick(1); G.shake = 4.5; this.lift = 0; return; }
    if (H && H.spinCut) { V.shock(this.x, this.y, reach + 4, P.cream, 0.35); V.kick(0.5); }
    if (H && H.lunge) { V.dust(this.x, this.y, 6); V.kick(0.4); }
    HL.fx.slash(this.x, this.y - 5, this.face, w.kind === 'spear' ? 0.25 : Math.min(arc, 5.5), reach - 2, 0.22);
    if (a.fin) V.kick(0.35);
  }
  hitSweep(w, a) {
    const G = HL.G;
    const reach = a.heavy ? w.heavy.reach : w.reach, arc = a.heavy ? w.heavy.arc : w.arc;
    let dmg = w.dmg * this.dmgMult() * (a.heavy ? w.heavy.mult * (0.75 + 0.25 * a.charge) : a.fin ? w.finisher : 1);
    const opts = { heavy: a.heavy || a.fin, breaker: w.breaker || a.heavy, fx: this.x, fy: this.y, poise: a.heavy ? 40 : a.fin ? 22 : 12, col: w.trail };
    for (const e of G.enemies) {
      if (e.dead || e.hidden || a.hit.has(e)) continue;
      const d = HL.dist(this.x, this.y, e.x, e.y);
      if (d > reach + e.r) continue;
      const ang = Math.atan2(e.y - this.y, e.x - this.x);
      if (arc < 6 && Math.abs(HL.angDiff(this.face, ang)) > arc / 2 + (d < 8 ? 1 : 0.15)) continue;
      a.hit.add(e);
      HL.hitEnemy(e, dmg, opts);
    }
    G.hitProps(this, reach, arc, a);
  }
  startUlt(a) {
    const V = HL.vfx, P = HL.P, w = this.weaponDef();
    this.state = 'ult'; this.t = 0; this.face = a; this.inv = 0.8; this.ult = 0; this.ultHit = new Set(); this.ultFired = 0; this.lift = 0;
    A.play('ult'); HL.G.shake = 2;
    V.flash(P.lt0, 0.35); V.chroma(0.9); V.kick(0.8); V.slowmo(0.3, 0.35); V.beam(this.x, this.y, P.lt0, 0.6, 5, 120); V.shock(this.x, this.y, 24, P.lt0, 0.4);
    HL.G.ultBanner = { name: HL.ULTS[w.ult].name, t: 0 };
    if (w.ult === 'veilstep') this.ultTargets = HL.G.enemies.filter((e) => !e.dead && !e.hidden && HL.dist(this.x, this.y, e.x, e.y) < 100).sort((p, q) => HL.dist(this.x, this.y, p.x, p.y) - HL.dist(this.x, this.y, q.x, q.y)).slice(0, 6);
  }
  updateUlt(dt, w) {
    const G = HL.G, V = HL.vfx, P = HL.P, kind = w.ult, mult = this.dmgMult();
    const hitAll = (x, y, r, dmg, col) => { for (const e of G.enemies) if (!e.dead && !e.hidden && HL.dist(x, y, e.x, e.y) < r + e.r) HL.hitEnemy(e, dmg * mult, { heavy: true, breaker: true, ult: true, fx: x, fy: y, poise: 99, col }); };
    this.inv = Math.max(this.inv, 0.1);
    if (kind === 'grave_arc') {
      this.vx = 0; this.vy = 0; this.face += dt * 30;
      if (this.t > 0.15 && this.ultFired === 0) { this.ultFired = 1; G.hitstop = 0.06; G.shake = 4; A.play('hitHeavy'); V.shock(this.x, this.y, 42, P.cream, 0.5); V.burst(this.x, this.y, 6, P.cream, 30, 110); V.kick(1.2); hitAll(this.x, this.y, 34, 46, P.cream); }
      if (this.t > 0.34 && this.ultFired === 1) { this.ultFired = 2; A.play('hitHeavy'); V.shock(this.x, this.y, 52, P.lt0, 0.55); V.flash(P.lt0, 0.3); hitAll(this.x, this.y, 40, 24, P.lt0); }
      if (this.t > 0.6) this.state = 'move';
    } else if (kind === 'ashen_drive') {
      const sp = this.t < 0.32 ? 290 : 0;
      this.vx = Math.cos(this.face) * sp; this.vy = Math.sin(this.face) * sp;
      if (sp) { V.embers(this.x, this.y, 3); if (Math.random() < 0.5) V.scorch(this.x, this.y, 5, '#2a1612'); }
      for (const e of G.enemies) if (!e.dead && !e.hidden && !this.ultHit.has(e) && HL.dist(this.x, this.y, e.x, e.y) < 13 + e.r) { this.ultHit.add(e); HL.hitEnemy(e, 52 * mult, { heavy: true, breaker: true, ult: true, fx: this.x, fy: this.y, poise: 99, col: P.fire }); }
      if (this.t > 0.32 && !this.ultFired) { this.ultFired = 1; V.shock(this.x, this.y, 30, P.fire, 0.5); V.burst(this.x, this.y, 5, P.fire, 26, 90); V.light(this.x, this.y, 0xff8040, 120, 0.4); V.kick(1); G.shake = 4; A.play('fire'); hitAll(this.x, this.y, 24, 20, P.fire); }
      if (this.t > 0.5) this.state = 'move';
    } else if (kind === 'kings_fall') {
      this.vx = 0; this.vy = 0;
      this.lift = this.t < 0.42 ? Math.sin((this.t / 0.42) * Math.PI) * 30 : 0;
      if (this.t < 0.42) { this.vx = Math.cos(this.face) * 40; this.vy = Math.sin(this.face) * 40; }
      if (this.t > 0.42 && !this.ultFired) {
        this.ultFired = 1; G.hitstop = 0.1; G.shake = 7; A.play('burst'); A.play('toll');
        const x = this.x + Math.cos(this.face) * 6, y = this.y + Math.sin(this.face) * 6;
        V.crack(x, y, 28); V.debris(x, y, 26, P.st2, 1.6); V.shock(x, y, 50, P.fire, 0.6); V.shock(x, y, 34, P.cream, 0.45); V.beam(x, y, P.fire, 0.7, 9, 90);
        V.flash('#fff0d0', 0.6); V.chroma(1.4); V.kick(1.6); V.slowmo(0.35, 0.3); V.light(x, y, 0xffa060, 220, 0.5); V.dust(x, y, 16);
        hitAll(x, y, 42, 72, P.fire);
      }
      if (this.t > 0.85) this.state = 'move';
    } else if (kind === 'veilstep') {
      this.vx = 0; this.vy = 0;
      const ts = this.ultTargets || [], k = Math.floor(this.t / 0.09);
      if (k > this.ultFired - 1 && this.ultFired < ts.length) {
        const e = ts[this.ultFired]; this.ultFired++;
        if (e && !e.dead) {
          this.ghostReq = true;
          const a = Math.atan2(e.y - this.y, e.x - this.x), nx = e.x + Math.cos(a) * 9, ny = e.y + Math.sin(a) * 9;
          if (!G.world.blocked(nx, ny, this.r)) { this.x = nx; this.y = ny; }
          this.face = a + Math.PI; A.play('swing', true);
          HL.hitEnemy(e, 34 * mult, { heavy: true, breaker: true, ult: true, fx: this.x, fy: this.y, poise: 99, col: '#ff6a5a' });
          V.burst(e.x, e.y, 6, '#ff6a5a', 14, 80); V.ring3d(e.x, e.y, 5, 12, '#ff6a5a', 0.3);
        }
      }
      if (this.t > Math.max(0.3, ts.length * 0.09 + 0.15) && !this.done) { this.done = true; V.shock(this.x, this.y, 34, '#ff6a5a', 0.45); V.flash('#ffb0a0', 0.25); V.kick(1); }
      if (this.t > Math.max(0.45, ts.length * 0.09 + 0.3)) { this.state = 'move'; this.done = false; }
    } else if (kind === 'blackflight') {
      this.vx = 0; this.vy = 0;
      if (!this.ultFired) {
        this.ultFired = 1; A.play('twang');
        for (let i = 0; i < 16; i++) { const d = 26 + Math.random() * 90, off = (Math.random() - 0.5) * d * 0.8, c = Math.cos(this.face), s = Math.sin(this.face); G.impacts.push({ x: this.x + c * d - s * off, y: this.y + s * d + c * off, t: 0.15 + i * 0.04 + Math.random() * 0.05, r: 12, dmg: 24 * mult, col: P.cream }); }
      }
      if (this.t > 0.45) this.state = 'move';
    } else if (kind === 'silence_burst') {
      this.vx = 0; this.vy = 0;
      if (this.t > 0.22 && !this.ultFired) {
        this.ultFired = 1; A.play('toll'); A.play('bellLow'); G.shake = 5;
        V.shock(this.x, this.y, 100, '#cfe6ff', 0.9); V.shock(this.x, this.y, 70, '#9fd0ff', 0.7); V.beam(this.x, this.y, '#9fd0ff', 0.9, 8, 140);
        V.flash('#e6f2ff', 0.75); V.chroma(1.6); V.kick(1.2); V.slowmo(0.4, 0.3); V.light(this.x, this.y, 0x9fd0ff, 200, 0.6);
        for (const e of G.enemies) if (!e.dead && !e.hidden && HL.dist(this.x, this.y, e.x, e.y) < 100) { HL.hitEnemy(e, 30 * mult, { heavy: true, breaker: true, ult: true, fx: this.x, fy: this.y, poise: 99, col: '#9fd0ff' }); if (e.type === 'keeper') { e.stunned = Math.max(e.stunned, 3); e.tele = null; } else if (!e.dead) { e.state = 'stagger'; e.stagT = 2.6; e.tele = null; } }
      }
      if (this.t > 0.6) this.state = 'move';
    }
  }
  hurt(dmg, sx, sy) {
    const G = HL.G;
    if (this.inv > 0 || this.state === 'dead' || G.state !== 'play') return false;
    if (this.state === 'roll' && this.t < 0.17 && !this.perfectUsed) { HL.Epic.perfect(this, sx, sy); return false; }
    if (this.ward) { this.ward = false; this.wardT = 10; this.inv = 0.5; A.play('clank'); HL.vfx.shock(this.x, this.y, 18, '#7fe8e0', 0.35); HL.vfx.burst(this.x, this.y, 7, '#7fe8e0', 14, 60); HL.vfx.flash('#d8fffa', 0.2); HL.fx.text(this.x, this.y - 16, 'warded', '#7fe8e0', 0.8); return false; }
    const real = Math.max(1, Math.round(dmg * (1 - this.def())));
    this.hp -= real; if (HL.HD && G.use3d) HL.HD.num(this, real, false, '#ff7a6a'); this.inv = 0.6; this.flash = 0.12; G.hitstop = 0.06; G.shake = 2.5; G.hurtVig = 0.6;
    HL.Epic.onHurt();
    const a = Math.atan2(this.y - sy, this.x - sx), kb = HL.Epic.has('giant') ? 45 : 90;
    this.vx = Math.cos(a) * kb; this.vy = Math.sin(a) * kb;
    HL.vfx.hit(this.x, this.y, a + Math.PI, 1.5, HL.P.red0); HL.vfx.flash('#c4473f', 0.22); HL.vfx.chroma(0.8); HL.vfx.kick(0.5);
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
      e.hp -= dmg; e.flash = 0.05; if (HL.HD && G.use3d) HL.HD.num(e, dmg, false, '#a8a094'); if (e.hp <= 0) HL.killEnemy(e, o);
      return;
    }
    e.state = 'stagger'; e.t = 0; e.stagT = 1.3; A.play('clank'); HL.fx.text(e.x, e.y - 16, 'guard broken', HL.P.cream2, 0.8);
  }
  let mult = HL.Epic.dmgMult();
  if (e.vuln > 0) mult *= 1.5;
  if (e.type === 'keeper' && e.stunned > 0) mult = 1.6;
  e.hp -= dmg * mult; e.flash = 0.09; e.aggro = true;
  if (HL.HD && G.use3d) HL.HD.num(e, dmg * mult, !!(o.heavy || o.ult || mult > 1.4));
  G.hitstop = Math.max(G.hitstop, o.heavy ? 0.085 : 0.045); G.shake = Math.max(G.shake, o.heavy ? 2.2 : 1);
  A.play(o.heavy ? 'hitHeavy' : 'hit');
  const armoured = e.type === 'guard' || e.type === 'keeper' || e.type === 'brute';
  HL.vfx.hit(e.x, e.y, ang + Math.PI, o.heavy ? 2 : 1, o.col || (armoured ? HL.P.lt1 : HL.P.red0));
  if (!armoured) HL.vfx.burst(e.x, e.y, 6, e.type === 'wraith' ? '#9fb4c8' : HL.P.red1, o.heavy ? 8 : 4, 50, 0.4);
  if (o.heavy) HL.vfx.kick(0.35);
  if (G.eq.relic === 'bell_shard' && !o.ult) G.player.ult = Math.min(100, G.player.ult + (o.heavy ? 9 : 6) * HL.Epic.ultMult());
  HL.Epic.onHit(e, o, dmg * mult);
  if (e.type !== 'keeper') {
    const kb = (o.heavy ? 70 : 38) * (e.type === 'guard' ? 0.4 : 1);
    e.vx = -Math.cos(ang) * kb; e.vy = -Math.sin(ang) * kb;
    e.poiseDmg = (e.poiseDmg || 0) + (o.poise || 10);
    if (e.poiseDmg >= e.poise && e.state !== 'stagger' && e.type !== 'lurker') { e.state = 'stagger'; e.t = 0; e.stagT = 0.45; e.poiseDmg = 0; e.tele = null; }
  }
  if (e.hp <= 0) HL.killEnemy(e, o);
};
HL.killEnemy = function (e, o) {
  const G = HL.G;
  if (e.dead) return;
  e.dead = true; e.deadT = 0; e.tele = null; e.wave = null;
  A.play('die');
  HL.vfx.death(e);
  HL.Epic.onKill(e, o);
  if (e.type !== 'keeper' && o && (o.heavy || o.ult)) HL.vfx.slowmo(0.16, 0.35);
  if (e.type === 'brute' || e.type === 'guard') { HL.vfx.kick(0.6); G.shake = Math.max(G.shake, 3); }
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
    // elites burn with stolen Lumen: tougher, faster, harder-hitting
    const m = spec.boss ? { hp: 3.2, dmg: 1.3, sp: 1.2 } : spec.elite ? { hp: 2.2, dmg: 1.25, sp: 1.15 } : { hp: 1, dmg: 1, sp: 1 };
    this.elite = !!(spec.elite || spec.boss); this.bossName = spec.boss ? 'The Broken Champion' : null;
    this.hp = this.maxhp = Math.round(d.hp * m.hp); this.dmg = d.dmg * m.dmg; this.chase = d.chase * m.sp; this.spd = d.speed * m.sp; this.poise = d.poise * (this.elite ? 1.6 : 1);
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
    if (this.wander.go && HL.dist(this.x, this.y, this.hx, this.hy) < 30) { this.face = this.wander.a; this.stepToward(this.wander.a, this.spd * 0.4, dt); }
    else if (this.wander.go) { const a = Math.atan2(this.hy - this.y, this.hx - this.x); this.face = a; this.stepToward(a, this.spd * 0.4, dt); }
  }
  common(dt, dist, toP, sees) {
    if (this.state === 'idle') { this.idle(dt, sees); return true; }
    if (this.state === 'alert') { if (this.t > 0.45) { this.state = 'chase'; this.t = 0; } return true; }
    if (this.state === 'return') {
      const a = Math.atan2(this.hy - this.y, this.hx - this.x); this.face = a; this.stepToward(a, this.chase, dt);
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
      this.face = toP; this.stepToward(toP, this.chase, dt);
      if (dist < 21 && sees) { this.state = 'tele'; this.t = 0; this.lockA = toP; }
    } else if (this.state === 'tele') {
      this.face = this.lockA = HL.lerp(this.lockA, toP, 0.1);
      if (this.t > 0.55) { this.state = 'atk'; this.t = 0; this.hitDone = false; A.play('swing'); }
    } else if (this.state === 'atk') {
      this.G.world.move(this, Math.cos(this.lockA) * 92 * dt, Math.sin(this.lockA) * 92 * dt);
      this.hitPlayerIf(dist < this.r + p.r + 4, this.dmg);
      if (this.t > 0.22) { this.state = 'rec'; this.t = 0; }
    } else if (this.state === 'rec') { if (this.t > 0.75) { this.state = 'chase'; this.t = 0; } }
  }
  ai_hound(dt, p, dist, toP, sees) {
    if (this.common(dt, dist, toP, sees)) return;
    if (this.state === 'chase') {
      if (this.leashCheck(dist)) return;
      if (dist > 40) { this.face = toP; this.stepToward(toP, this.chase, dt); this.circT = 0; }
      else { // circle at a distance, then pounce
        this.circT = (this.circT || 0) + dt; this.cdir = this.cdir || (Math.random() < 0.5 ? 1 : -1);
        const a = toP + this.cdir * 1.5 + (dist < 30 ? 0.6 * this.cdir : 0); this.face = toP; this.stepToward(a, this.chase * 0.7, dt);
        if (this.circT > 0.8 + Math.random() * 0.8 && sees) { this.state = 'tele'; this.t = 0; A.play('bark'); }
      }
    } else if (this.state === 'tele') {
      this.face = toP; this.lockA = Math.atan2(p.y + p.vy * 0.15 - this.y, p.x + p.vx * 0.15 - this.x);
      if (this.t > 0.38) { this.state = 'atk'; this.t = 0; this.hitDone = false; }
    } else if (this.state === 'atk') {
      this.G.world.move(this, Math.cos(this.lockA) * 150 * dt, Math.sin(this.lockA) * 150 * dt);
      this.hitPlayerIf(dist < this.r + p.r + 3, this.dmg);
      if (this.t > 0.3) { if (this.hitDone) { this.state = 'rec'; this.t = 0.3; } else { this.state = 'dazed'; this.t = 0; this.vuln = 0.95; HL.fx.text(this.x, this.y - 12, '?', HL.P.cream2, 0.8); } }
    } else if (this.state === 'dazed') { if (this.t > 0.95) { this.state = 'chase'; this.t = 0; this.cdir = -this.cdir; } }
    else if (this.state === 'rec') { this.stepToward(toP + Math.PI, this.chase * 0.5, dt); if (this.t > 0.7) { this.state = 'chase'; this.t = 0; } }
  }
  ai_archer(dt, p, dist, toP, sees) {
    if (this.common(dt, dist, toP, sees)) return;
    if (this.state === 'chase') {
      if (this.leashCheck(dist)) return;
      this.face = toP;
      if (dist < 42) this.stepToward(toP + Math.PI + (this.slide || 1) * 0.5, this.chase, dt);
      else if (dist > 95 || !sees) this.stepToward(toP, this.chase, dt);
      else { this.stepToward(toP + Math.PI / 2 * (this.slide || 1), this.spd * 0.5, dt); if (this.t > 0.6) { this.state = 'tele'; this.t = 0; } }
    } else if (this.state === 'tele') {
      if (this.t < 0.55) this.lockA = toP;
      this.face = this.lockA;
      this.tele = { k: 'line', a: this.lockA, len: 110, q: this.t / 0.8 };
      if (this.t > 0.8) {
        this.tele = null; this.state = 'rec'; this.t = 0; A.play('twang');
        this.G.shots.push({ x: this.x + Math.cos(this.lockA) * 5, y: this.y - 5 + Math.sin(this.lockA) * 4, vx: Math.cos(this.lockA) * 150, vy: Math.sin(this.lockA) * 150, life: 1.2, dmg: this.dmg, from: this });
      }
      if (!sees && this.t < 0.55) { this.tele = null; this.state = 'chase'; }
    } else if (this.state === 'rec') { if (this.t > 0.7) { this.state = 'chase'; this.t = 0; this.slide = -(this.slide || 1); } }
  }
  ai_guard(dt, p, dist, toP, sees) {
    if (this.common(dt, dist, toP, sees)) return;
    const turn = (rate) => { this.face += HL.clamp(HL.angDiff(this.face, toP), -rate * dt, rate * dt); };
    if (this.state === 'chase') {
      if (this.leashCheck(dist)) return;
      turn(2.2); this.stepToward(this.face, this.chase, dt);
      if (dist < 24) { this.state = 'tele'; this.t = 0; }
    } else if (this.state === 'tele') {
      turn(1.2);
      const cx = this.x + Math.cos(this.face) * 13, cy = this.y + Math.sin(this.face) * 11;
      this.tele = { k: 'ring', x: cx, y: cy, r: 16, q: this.t / 0.85 };
      if (this.t > 0.85) {
        this.tele = null; this.state = 'rec'; this.t = 0; A.play('hitHeavy'); this.G.shake = 2.5;
        HL.fx.ring(cx, cy, 18, HL.P.ash1, 0.35); HL.fx.burst(cx, cy, HL.P.ash2, 8, 40);
        if (HL.dist(p.x, p.y, cx, cy) < 16 + p.r) p.hurt(this.dmg, cx, cy);
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
        if (HL.dist(p.x, p.y, this.tx, this.ty) < 11 + p.r) p.hurt(this.dmg, this.tx, this.ty);
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
    const rage = this.hp < this.maxhp * 0.35 || this.phase2, sp = rage ? 0.8 : 1;
    this.rage = rage;
    if (!this.phase2 && this.hp < this.maxhp * 0.5 && (this.state === 'walk' || this.state === 'rec')) {
      const V = HL.vfx, P = HL.P;
      this.phase2 = true; this.state = 'phase2'; this.t = 0; this.tele = null; this.wave = null;
      A.play('toll'); A.play('burst'); V.slowmo(0.9, 0.3); V.flash(P.red0, 0.5); V.chroma(1.6); V.kick(1.4); V.shock(this.x, this.y, 70, P.red0, 0.9); V.beam(this.x, this.y, P.red0, 1.3, 10, 160); V.embers(this.x, this.y, 30); G.shake = 6;
      HL.UI.showBanner('THE BELL CRACKS', 'The Keeper burns. Bell shards will fall.');
    }
    if (this.state === 'phase2') { this.armsUp = this.t < 1.2; if (Math.random() < 0.5) HL.vfx.embers(this.x, this.y, 2); if (this.t > 1.7) { this.state = 'walk'; this.t = 0; this.cool = 0.4; this.armsUp = false; } return; }
    // summons at 55% and 25%
    if (this.state === 'walk' && ((this.summons === 0 && this.hp < this.maxhp * 0.55) || (this.summons === 1 && this.hp < this.maxhp * 0.25))) { this.summons++; this.state = 'summon'; this.t = 0; }
    if (this.state === 'walk') {
      this.face = toP; this.cool -= dt;
      if (dist > 26) this.stepToward(toP, this.chase * (rage ? 1.25 : 1), dt);
      if (this.cool <= 0) {
        const r = Math.random();
        if (this.phase2 && r < 0.3) this.state = 'shards';
        else if (this.phase2 && dist > 44 && r < 0.55) this.state = 'pull';
        else if (dist < 40 && r < 0.55) this.state = 'sweep';
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
        if (dist < 46 && Math.abs(HL.angDiff(this.lockA, toP)) < 1.7) p.hurt(this.dmg, this.x, this.y);
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
        if (HL.dist(p.x, p.y, this.tx, this.ty) < 22 + p.r) p.hurt(this.dmg + 4, this.tx, this.ty);
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
    } else if (this.state === 'shards') { // bell shards rain where you stand
      const V = HL.vfx, P = HL.P;
      if (!this.shards) { this.shards = []; for (let i = 0; i < 6; i++) { const a = Math.random() * HL.TAU, d = i ? 6 + Math.random() * 26 : 0; this.shards.push({ x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, t: -i * 0.2 * sp }); } A.play('bellHigh'); }
      for (const s of this.shards) s.t += dt;
      this.teles = this.shards.filter((s) => s.t > 0 && !s.done).map((s) => ({ k: 'ring', x: s.x, y: s.y, r: 12, q: s.t / 0.75 }));
      for (const s of this.shards) if (!s.done && s.t > 0.75) { s.done = true; A.play('clank'); V.beam(s.x, s.y, P.bronze, 0.35, 3, 90); V.debris(s.x, s.y, 5, P.bronze, 0.8); V.shock(s.x, s.y, 14, P.lt1, 0.3); V.crack(s.x, s.y, 7); G.shake = Math.max(G.shake, 2); if (HL.dist(p.x, p.y, s.x, s.y) < 12 + p.r) p.hurt(18, s.x, s.y); }
      if (this.shards.every((s) => s.done)) { this.shards = null; this.teles = null; this.state = 'rec'; this.t = 0; this.recT = 0.6; }
    } else if (this.state === 'pull') { // a chain lashes out and drags you in, then the sweep
      if (this.t < 0.5) this.lockA = toP;
      this.face = this.lockA; this.tele = { k: 'line', a: this.lockA, len: dist + 12, q: this.t / 0.75 };
      if (this.t > 0.75 && !this.pulled) { this.pulled = true; this.tele = null; A.play('ratchet'); if (Math.abs(HL.angDiff(this.lockA, toP)) < 0.22 && p.inv <= 0 && p.state !== 'dead') { p.vx = -Math.cos(toP) * 230; p.vy = -Math.sin(toP) * 230; p.state = 'hurt'; p.t = 0; HL.vfx.burst(p.x, p.y, 6, HL.P.st1, 10, 50); } }
      if (this.t > 1.05) { this.pulled = false; this.state = 'sweep'; this.t = 0; this.hitDone = false; this.lockA = toP; }
    } else if (this.state === 'rec') {
      if (this.t > this.recT) { this.state = 'walk'; this.t = 0; this.cool = (rage ? 0.6 : 1.1) + Math.random() * 0.6; }
    }
  }
  // Hollow Husk: the tide's rank and file, weak alone, deadly in numbers
  ai_husk(dt, p, dist, toP, sees) {
    if (this.state === 'idle' || this.state === 'alert') { this.state = 'chase'; this.t = 0; }
    if (this.state === 'chase') { this.face = toP; this.stepToward(toP + Math.sin(this.t * 3 + this.x) * 0.3, this.chase, dt); if (dist < 11) { this.state = 'tele'; this.t = 0; this.lockA = toP; } }
    else if (this.state === 'tele') { this.face = this.lockA; if (this.t > 0.24) { this.state = 'atk'; this.t = 0; this.hitDone = false; } }
    else if (this.state === 'atk') { this.G.world.move(this, Math.cos(this.lockA) * 100 * dt, Math.sin(this.lockA) * 100 * dt); this.hitPlayerIf(dist < this.r + p.r + 3, this.dmg); if (this.t > 0.15) { this.state = 'rec'; this.t = 0; } }
    else if (this.state === 'rec') { if (this.t > 0.45) { this.state = 'chase'; this.t = 0; } }
  }
  // Bell Wraith: floats, keeps its distance, casts three seeking orbs, blinks away and back
  ai_wraith(dt, p, dist, toP, sees) {
    const G = this.G, V = HL.vfx, C = '#9fb4c8';
    if (this.state === 'blink') {
      if (this.t > 0.45) {
        const tr = G.trial;
        for (let k = 0; k < 14; k++) { const a = Math.random() * HL.TAU, d = (tr ? 28 : 45) + Math.random() * 25, x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d; if (tr && HL.dist(x, y, tr.cx, tr.cy) > tr.r - 10) continue; if (!G.world.blocked(x, y, this.r) && G.world.los(x, y - 4, p.x, p.y - 4)) { this.x = x; this.y = y; break; } }
        this.hidden = false; this.state = 'chase'; this.t = 0; V.burst(this.x, this.y, 8, C, 16, 60); V.ring3d(this.x, this.y, 2, 12, C, 0.35); A.play('bellHigh');
      }
      return;
    }
    if (this.common(dt, dist, toP, sees)) return;
    if (this.state === 'chase') {
      if (this.leashCheck(dist)) return;
      this.face = toP;
      if (dist < 45) this.stepToward(toP + Math.PI, this.spd * 0.9, dt); else if (dist > 85 || !sees) this.stepToward(toP, this.chase, dt); else this.stepToward(toP + (Math.PI / 2) * (this.slide || 1), this.spd * 0.6, dt);
      this.cool = (this.cool == null ? 1.2 : this.cool) - dt;
      if (this.cool <= 0 && sees) { this.state = 'tele'; this.t = 0; A.play('bellMid'); }
    } else if (this.state === 'tele') {
      this.face = toP; this.tele = { k: 'glow', x: this.x, y: this.y, q: this.t / 0.75 };
      if (Math.random() < 0.6) V.burst(this.x, this.y, 12, C, 1, 18, 0.3);
      if (this.t > 0.75) {
        this.tele = null; A.play('bellHigh');
        for (const off of [-0.42, 0, 0.42]) G.shots.push({ x: this.x, y: this.y - 5, vx: Math.cos(toP + off) * 72, vy: Math.sin(toP + off) * 72, life: 2.6, dmg: this.dmg, from: this, orb: true, seek: 1.3, col: C });
        this.state = 'rec'; this.t = 0; this.cool = 2.2 + Math.random();
      }
    } else if (this.state === 'rec') {
      if (this.t > 0.6) { if (Math.random() < 0.4) { this.state = 'blink'; this.t = 0; this.hidden = true; V.burst(this.x, this.y, 8, C, 16, 60); A.play('roll'); } else { this.state = 'chase'; this.t = 0; this.slide = -(this.slide || 1); } }
    }
  }
  // Hollow Brute: shows a wide line, then charges; slams up close; dazed if it runs into a wall
  ai_brute(dt, p, dist, toP, sees) {
    const G = this.G, V = HL.vfx, P = HL.P;
    if (this.common(dt, dist, toP, sees)) return;
    if (this.state === 'chase') {
      if (this.leashCheck(dist)) return;
      this.face = toP; this.stepToward(toP, this.chase, dt); this.cool = (this.cool == null ? 1 : this.cool) - dt;
      if (dist < 22) { this.state = 'slamT'; this.t = 0; }
      else if (this.cool <= 0 && dist < 100 && sees) { this.state = 'tele'; this.t = 0; this.lockA = toP; A.play('growl'); }
    } else if (this.state === 'tele') {
      if (this.t < 0.6) this.lockA = toP;
      this.face = this.lockA; this.tele = { k: 'line', a: this.lockA, len: 125, q: this.t / 0.85, wide: true };
      if (this.t > 0.85) { this.tele = null; this.state = 'charge'; this.t = 0; this.hitDone = false; A.play('roll'); V.kick(0.4); }
    } else if (this.state === 'charge') {
      const ox = this.x, oy = this.y, c = Math.cos(this.lockA), s = Math.sin(this.lockA);
      G.world.move(this, c * 190 * dt, s * 190 * dt); V.dust(this.x, this.y, 1); this.walkT += dt * 4;
      if (!this.hitDone && dist < this.r + p.r + 4) { if (p.hurt(this.dmg, this.x, this.y)) { this.hitDone = true; p.vx += c * 130; p.vy += s * 130; } }
      if (HL.dist(ox, oy, this.x, this.y) < 190 * dt * 0.4 && this.t > 0.05) {
        this.state = 'dazed'; this.t = 0; this.vuln = 1.6; G.shake = 4; A.play('hitHeavy');
        V.debris(this.x, this.y, 9, P.st2, 1); V.shock(this.x, this.y, 16, P.st0, 0.3); HL.fx.text(this.x, this.y - 22, 'stunned', P.cream, 0.9);
      } else if (this.t > 0.65) { this.state = 'rec'; this.t = 0; this.cool = 2.5; }
    } else if (this.state === 'slamT') {
      this.face = toP; const cx = this.x + Math.cos(this.face) * 10, cy = this.y + Math.sin(this.face) * 9;
      this.tele = { k: 'ring', x: cx, y: cy, r: 20, q: this.t / 0.8 };
      if (this.t > 0.8) {
        this.tele = null; A.play('burst'); G.shake = 4; V.shock(cx, cy, 24, P.fire, 0.4); V.debris(cx, cy, 8, P.st2, 1); V.crack(cx, cy, 10);
        if (HL.dist(p.x, p.y, cx, cy) < 20 + p.r) p.hurt(this.dmg - 4, cx, cy);
        this.state = 'rec'; this.t = 0; this.cool = Math.max(this.cool || 0, 1);
      }
    } else if (this.state === 'dazed') { if (this.t > 1.6) { this.state = 'chase'; this.t = 0; this.cool = 2; } }
    else if (this.state === 'rec') { if (this.t > 0.9) { this.state = 'chase'; this.t = 0; } }
  }
  drawTele(g) {
    if (this.teles) { const keep = this.tele; for (const t of this.teles) { this.tele = t; this.drawTele1(g); } this.tele = keep; }
    this.drawTele1(g);
  }
  drawTele1(g) {
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
