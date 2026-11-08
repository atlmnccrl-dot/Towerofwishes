// Bannerborn — battlefield tactics: what fighters do besides trading blows, so a fight never reads as two lines
// spamming attacks. Every few swings, or when the moment calls for it, a fighter breaks off and does something
// you can see: drinks a potion out of the press, runs to shield the weakest ally, lays hands on a wounded one,
// grabs a stone off the ground and lobs it at an archer, kicks a foe sliding back, falls back and charges,
// pounces from range, or rolls out of a blow. Loaded after battle.js; battle.js calls in through optional hooks.
(function () {
  const BB = window.BB, B = BB.Battle.prototype, hyp = Math.hypot, TAU = Math.PI * 2;
  const clamp01 = (k) => Math.max(0, Math.min(1, k));
  const isBack = (r) => r === 'ranged' || r === 'healer';
  const has = (b, e, clip) => BB.hasClip(b.artKey(e), clip);
  const atkClip = (b, e, i) => e.side === 'hero' ? BB.CALLINGS[e.calling].basic[(i || 0) % BB.CALLINGS[e.calling].basic.length] : (e.F.atkClips || ['Attack1'])[(i || 0) % (e.F.atkClips || ['Attack1']).length];
  const POUNCERS = { ghoul: 1, beastkin: 1, stalker: 1 }, MENDERS = { necro: 1, warlock: 1 };

  // ---------------------------------------------------------------- loose stones on the field
  B.updateTactics = function (dt) {
    if (!this.pebbles) { this.pebbles = []; this.rocks = []; this.pebT = 0; }
    this.pebT -= dt;
    if (this.pebT <= 0 && this.pebbles.length < 9 && !this.peaceful) {
      this.pebT = 2.2;
      const c = this.warCenter || this.map.heroSpawn;
      for (let k = 0; k < 10; k++) {
        const a = this.r() * TAU, d = 2.5 + this.r() * 6, x = c.x + Math.cos(a) * d, y = c.y + Math.sin(a) * d;
        if (this.map.at(x, y) !== undefined && !BB.blocked(this.map, x, y)) { this.pebbles.push({ x, y, s: 0.8 + this.r() * 0.5, rot: this.r() * 3, born: this.time }); break; }
      }
    }
    // stones in flight: a high lob that follows its mark a little
    for (const r of this.rocks) {
      r.t += dt; const k = Math.min(1, r.t / r.dur);
      if (r.tgt && !r.tgt.dead) { r.tx += (r.tgt.x - r.tx) * Math.min(1, dt * 3); r.ty += (r.tgt.y - r.ty) * Math.min(1, dt * 3); }
      r.x = r.sx + (r.tx - r.sx) * k; r.y = r.sy + (r.ty - r.sy) * k; r.z = 0.9 + Math.sin(k * Math.PI) * r.arc - k * 0.6; r.spin += dt * 14;
      if (k >= 1) {
        r.done = true;
        const t = r.tgt && !r.tgt.dead && hyp(r.tgt.x - r.x, r.tgt.y - r.y) < 0.9 ? r.tgt : null;
        this.addFx('x_stone', r.x, r.y - 0.1, { sc: 0.45 }); BB.sfx && BB.sfx('slam');
        if (t && !(t.invuln > 0)) {
          this.hit(r.src, t, 1.35, { heavy: true }); this.text(t.x, t.y + 0.2, 'BONK!', '#d8c8a8', 1);
          this.knock(t, r.sx, r.sy, 0.7, t.boss ? 0 : 0.7); this.shake = Math.max(this.shake, 0.2);
        }
      }
    }
    this.rocks = this.rocks.filter((r) => !r.done);
  };
  // shoved: slide back along the ground, maybe dazed
  B.knock = function (e, fx, fy, dist, stun) {
    if (!e || e.dead || e.gate || e.turret || e.ward || e.prop) return;
    if (e.boss) dist *= 0.25;
    const dx = e.x - fx, dy = e.y - fy, l = hyp(dx, dy) || 1, sp = 9;
    e.kb = { vx: dx / l * sp, vy: dy / l * sp, t: dist / sp };
    if (stun) this.stun(e, stun);
    const sv = BB.iso(dx, dy); this.addFx('dash', e.x, e.y, { sc: 0.4, rot: Math.atan2(sv.y, sv.x), alpha: 0.7, fps: 40 });
  };
  B.updateKnock = function (e, dt) {
    if (!e.kb) return;
    e.x += e.kb.vx * dt; e.y += e.kb.vy * dt; e.kb.t -= dt; e.kb.vx *= 0.92; e.kb.vy *= 0.92;
    if (Math.floor(this.time * 20) % 3 === 0) this.addFx('x_grass', e.x, e.y, { sc: 0.18 });
    if (e.kb.t <= 0) e.kb = null;
  };
  // a leap that lands on someone
  B.updateArc = function (e, dt) {
    const A = e.arc; if (!A) return false;
    A.t += dt; const k = Math.min(1, A.t / A.dur);
    if (A.tgt && !A.tgt.dead && k < 0.7) { A.tx += (A.tgt.x - A.tx) * dt * 4; A.ty += (A.tgt.y - A.ty) * dt * 4; }
    e.x = A.sx + (A.tx - A.sx) * k; e.y = A.sy + (A.ty - A.sy) * k; e.z = Math.sin(k * Math.PI) * A.h; e.ct += dt;
    if (k >= 1) {
      e.arc = null; e.z = 0; e.lock = 0.35; e.state = 'attack'; e.atkDur = 0.35; e.hitDone = true;
      this.addFx('x_stone', e.x, e.y - 0.05, { sc: 0.5 }); BB.sfx && BB.sfx('slam'); this.shake = Math.max(this.shake, 0.25);
      const t = A.tgt; if (t && !t.dead && hyp(t.x - e.x, t.y - e.y) < 1.3) { this.hit(e, t, A.mult || 1.4, { heavy: true }); this.knock(t, e.x - (A.tx - A.sx) * 0.1, e.y - (A.ty - A.sy) * 0.1, 1.1, t.boss ? 0 : 0.45); }
    }
    return true;
  };

  // ---------------------------------------------------------------- choosing a move
  // called by the AI each frame it is free; returns true while a move is playing out
  B.tactic = function (e, t, dt) {
    if (this.peaceful || e.boss || e.gate || e.turret || e.ward || e.scripted) return false;
    if (e.tac) return this.runTac(e, t, dt);
    e.tacCd = (e.tacCd === undefined ? 1.5 + this.r() * 3 : e.tacCd) - dt;
    if (e.potCd > 0) e.potCd -= dt;
    if (e.tacCd > 0 && !(e.side === 'hero' && e.hp < e.maxhp * 0.35 && !(e.potCd > 0))) return false;
    const m = this.pickTac(e, t);
    if (!m) { e.tacCd = 0.5 + this.r() * 0.6; return false; }
    e.tac = Object.assign({ t: 0, phase: 0 }, m); e.tacCd = m.cd; e.swings = 0;
    return this.runTac(e, t, dt);
  };
  B.pickTac = function (e, t) {
    const role = this.roleOf(e), hero = e.side === 'hero', opts = [], sw = e.swings || 0;
    const allies = hero ? this.heroesAlive() : this.foesAlive().filter((o) => !o.gate && !o.turret);
    const enemies = hero ? this.foesAlive().filter((o) => !o.gate && !o.hidden) : this.heroesAlive();
    const nearFoe = (x, y, r) => enemies.find((o) => hyp(o.x - x, o.y - y) < r);
    const dT = t ? hyp(t.x - e.x, t.y - e.y) : 99;
    // a potion, out of the press
    const sg = this.sigOption && this.sigOption(e, t); if (sg) opts.push(sg); // their signature, when it is ready
    if (hero && e.hp < e.maxhp * (e.temper ? e.temper.potion : 0.42) && !(e.potCd > 0)) opts.push({ kind: 'potion', w: 9, cd: 3 });
    // run to the weakest ally and take the heat off them
    if (hero && (role === 'tank' || (role === 'bruiser' && this.r() < 0.5))) {
      let a = null; for (const o of allies) if (o !== e && o.hp < o.maxhp * 0.45 && (!a || o.hp / o.maxhp < a.hp / a.maxhp)) a = o;
      if (a && hyp(a.x - e.x, a.y - e.y) < 9) { const th = enemies.filter((o) => o.tgt === a || hyp(o.x - a.x, o.y - a.y) < 1.6).sort((p, q) => hyp(p.x - a.x, p.y - a.y) - hyp(q.x - a.x, q.y - a.y))[0]; if (th) opts.push({ kind: 'rescue', ally: a, foe: th, w: 8, cd: 7 }); }
    }
    // hands-on healing
    if ((hero && e.calling === 'warpriest') || (!hero && MENDERS[e.kind])) {
      let a = null; for (const o of allies) if (o !== e && o.hp < o.maxhp * 0.5 && !o.boss && hyp(o.x - e.x, o.y - e.y) < 8 && (!a || o.hp / o.maxhp < a.hp / a.maxhp)) a = o;
      if (a) opts.push({ kind: 'mend', ally: a, w: hero ? 7 : 4, cd: hero ? 8 : 11 });
    }
    // a stone off the ground, lobbed at someone soft
    if (!e.ranged && role !== 'tank' && this.pebbles && this.pebbles.length) {
      let p = null, pd = 6; for (const q of this.pebbles) { const d = hyp(q.x - e.x, q.y - e.y); if (d < pd && (!q.claim || q.claim.dead || q.claim === e)) { pd = d; p = q; } }
      const soft = enemies.filter((o) => isBack(this.roleOf(o)) || o.ranged).sort((a, b) => hyp(a.x - e.x, a.y - e.y) - hyp(b.x - e.x, b.y - e.y))[0];
      if (p && (soft || t)) opts.push({ kind: 'rock', peb: p, mark: soft && hyp(soft.x - e.x, soft.y - e.y) < 11 ? soft : t, w: (hero ? 3.5 : 3) + (sw >= 3 ? 2 : 0) + (soft ? 1.5 : 0), cd: 4.5 });
    }
    if (!t) return this.choose(this.temperW(e, opts));
    // a kick or a shield bash that sends them sliding
    if (!e.ranged && dT < e.range + 0.8 && sw >= 2) opts.push({ kind: 'shove', tgt: t, w: role === 'tank' ? 5 : 4, cd: 4 });
    // fall back, wind up, charge through
    if (!e.ranged && dT < 2.6 && (hero ? ['berserker', 'monk', 'lancer', 'shadowblade'].includes(e.calling) : e.kind === 'beastkin' || e.elite) && sw >= 2) opts.push({ kind: 'charge', tgt: t, w: 4.5, cd: 5.5 });
    // pounce from range
    if (!hero && POUNCERS[e.kind] && dT > 2.2 && dT < 7) opts.push({ kind: 'pounce', tgt: t, w: 7, cd: 4.5 });
    // the back line tumbles away from anyone on top of it
    if (isBack(role) && hero && nearFoe(e.x, e.y, 1.5) && !(e.dodgeCd > 0)) opts.push({ kind: 'tumble', w: 5, cd: 3.5 });
    // skirmishers strike and spring away
    if (e.temper && e.temper.hitrun && !e.ranged && sw >= 3 && dT < 2) opts.push({ kind: 'hitrun', tgt: t, w: 4, cd: 3 });
    return this.choose(this.temperW(e, opts));
  };
  // a temperament leans on the moves it likes
  B.temperW = function (e, opts) { const W = e.temper && e.temper.w; if (W) for (const o of opts) if (W[o.kind]) o.w *= W[o.kind]; return opts; };
  B.choose = function (opts) {
    if (!opts.length) return null;
    let sum = 0; for (const o of opts) sum += o.w; let r = this.r() * (sum + 1); // sometimes: just keep fighting
    for (const o of opts) { r -= o.w; if (r <= 0) return o; }
    return null;
  };

  // ---------------------------------------------------------------- playing a move out
  B.runTac = function (e, t, dt) {
    const m = e.tac; m.t += dt;
    const done = () => { if (m.peb) m.peb.claim = null; e.tac = null; e.carry = false; return true; };
    if (m.t > 6) return done();
    switch (m.kind) {
      case 'potion': {
        if (m.phase === 0) { // back out of the fight
          if (!m.spot) {
            const foes = (e.side === 'hero' ? this.foesAlive() : this.heroesAlive()).filter((o) => hyp(o.x - e.x, o.y - e.y) < 6);
            let ax = 0, ay = 0; for (const o of foes) { ax += e.x - o.x; ay += e.y - o.y; }
            const l = hyp(ax, ay) || 1, c = this.warCenter || e;
            const dx = foes.length ? ax / l : (e.x - c.x) || 1, dy = foes.length ? ay / l : (e.y - c.y);
            const ll = hyp(dx, dy) || 1; m.spot = BB.freeSpot(this.map, e.x + dx / ll * 3.2, e.y + dy / ll * 3.2, 0.3) || { x: e.x, y: e.y };
            this.text(e.x, e.y + 0.2, 'FALL BACK', '#9fe3a0');
          }
          if (hyp(m.spot.x - e.x, m.spot.y - e.y) > 0.4 && m.t < 1.8) { this.moveToward(e, m.spot.x, m.spot.y, dt, 1.25); return true; }
          this.halt(e); m.phase = 1; e.state = 'attack'; e.lock = 1.05; e.atkDur = 1.05; e.hitAt = 99; e.hitDone = true; e.flask = 1.05;
          this.setClip(e, has(this, e, 'Taunt') ? 'Taunt' : 'Idle', true); BB.sfx && BB.sfx('heal');
          this.text(e.x, e.y + 0.2, 'POTION', '#7dff9a', 1);
          const amt = e.maxhp * 0.28;
          for (let i = 0; i < 4; i++) this.later(0.25 + i * 0.22, () => { if (!e.dead) { this.heal(e, e, amt / 4); this.addFx('buff9', e.x, e.y, { sc: 0.45, add: true, hue: 100, fps: 30 }); } });
          e.potCd = 16;
          return true;
        }
        return done();
      }
      case 'rescue': {
        const a = m.ally, f = m.foe;
        if (!f || f.dead || !a || a.dead) return done();
        if (m.phase === 0) { m.phase = 1; this.text(e.x, e.y + 0.2, 'PROTECT!', '#8fd4ff', 1); }
        if (m.phase === 1) {
          const d = hyp(f.x - e.x, f.y - e.y);
          if (d > (f.r || 0.3) + 1.0 && m.t < 3) { this.moveToward(e, f.x, f.y, dt, 1.45); return true; }
          if (d > 2) return done();
          this.halt(e); this.face(e, f.x, f.y); m.phase = 2;
          e.state = 'attack'; e.lock = 0.5; e.atkDur = 0.5; e.hitAt = 99; e.hitDone = true;
          this.setClip(e, has(this, e, 'Kick') ? 'Kick' : atkClip(this, e, 1), true); BB.sfx && BB.sfx('swing');
          this.later(0.2, () => {
            if (e.dead || f.dead || hyp(f.x - e.x, f.y - e.y) > 2.2) return;
            this.text(f.x, f.y + 0.2, 'SHIELD BASH', '#8fd4ff', 1); this.hit(e, f, 0.9, { heavy: true }); this.knock(f, e.x, e.y, 2.4, 0.8); this.breakPoise(f, 25);
            this.shake = Math.max(this.shake, 0.3); this.hitstop = Math.max(this.hitstop, 0.06);
            for (const o of this.foesAlive()) if (!o.boss && hyp(o.x - e.x, o.y - e.y) < 3.5) { o.taunt = e; o.tauntT = 3.5; }
          });
          this.later(0.55, () => { if (!e.dead && !e.tac) { e.state = 'attack'; e.lock = 0.5; e.atkDur = 0.5; e.hitDone = true; this.setClip(e, has(this, e, 'Taunt') ? 'Taunt' : 'Idle', true); this.text(e.x, e.y + 0.2, 'FACE ME!', '#ffd23a'); } });
          return true;
        }
        return done();
      }
      case 'mend': {
        const a = m.ally; if (!a || a.dead) return done();
        if (m.phase === 0) {
          const d = hyp(a.x - e.x, a.y - e.y);
          if (d > 1.1 && m.t < 3) { this.moveToward(e, a.x, a.y, dt, 1.3); return true; }
          this.halt(e); this.face(e, a.x, a.y); m.phase = 1;
          e.state = 'attack'; e.lock = 0.9; e.atkDur = 0.9; e.hitAt = 99; e.hitDone = true; this.setClip(e, has(this, e, 'Special1') ? 'Special1' : 'Taunt', true);
          this.addFx('buff9', a.x, a.y, { sc: 0.8, add: true, hue: e.side === 'hero' ? 60 : -60, fps: 24 });
          this.later(0.45, () => { if (!a.dead && !e.dead) { this.heal(e, a, a.maxhp * (e.side === 'hero' ? 0.3 * (1 + ((e.st && e.st.heal) || 0)) : 0.22)); this.text(a.x, a.y + 0.2, e.side === 'hero' ? 'MEND' : 'DARK MEND', e.side === 'hero' ? '#ffe7a3' : '#c9a8ff', 1); this.addFx('levelup', a.x, a.y, { sc: 0.7, add: true }); } });
          return true;
        }
        return done();
      }
      case 'rock': {
        const p = m.peb;
        if (m.phase === 0) {
          if (!this.pebbles.includes(p) || (p.claim && p.claim !== e && !p.claim.dead)) return done();
          p.claim = e;
          if (hyp(p.x - e.x, p.y - e.y) > 0.45 && m.t < 2.6) { this.moveToward(e, p.x, p.y, dt, 1.25, true); return true; }
          if (hyp(p.x - e.x, p.y - e.y) > 0.8) return done();
          this.pebbles.splice(this.pebbles.indexOf(p), 1); m.peb = null;
          this.halt(e); e.carry = true; m.phase = 1; m.hold = 0.35;
          e.state = 'attack'; e.lock = 0.35; e.atkDur = 0.35; e.hitAt = 99; e.hitDone = true; this.setClip(e, has(this, e, 'CrouchIdle') ? 'CrouchIdle' : 'TakeDamage', true);
          this.addFx('x_grass', e.x, e.y, { sc: 0.3 });
          return true;
        }
        if (m.phase === 1) {
          let mk = m.mark; if (!mk || mk.dead) mk = t; if (!mk || mk.dead) return done();
          if (hyp(mk.x - e.x, mk.y - e.y) > 11) return done();
          this.face(e, mk.x, mk.y); m.phase = 2;
          e.state = 'attack'; e.lock = 0.5; e.atkDur = 0.5; e.hitAt = 99; e.hitDone = true; this.setClip(e, atkClip(this, e, 0), true); BB.sfx && BB.sfx('swing');
          this.later(0.22, () => {
            if (e.dead) return; e.carry = false;
            const d = hyp(mk.x - e.x, mk.y - e.y);
            this.rocks.push({ src: e, tgt: mk, sx: e.x, sy: e.y, tx: mk.x, ty: mk.y, x: e.x, y: e.y, z: 1, t: 0, dur: 0.35 + d * 0.07, arc: 0.8 + d * 0.18, spin: 0, s: 1 });
          });
          return true;
        }
        return done();
      }
      case 'shove': {
        const f = m.tgt; if (!f || f.dead) return done();
        if (m.phase === 0) {
          m.phase = 1; this.face(e, f.x, f.y);
          const tank = this.roleOf(e) === 'tank';
          e.state = 'attack'; e.lock = 0.55; e.atkDur = 0.55; e.hitAt = 99; e.hitDone = true;
          this.setClip(e, has(this, e, 'Kick') ? 'Kick' : has(this, e, 'AttackRun') ? 'AttackRun' : atkClip(this, e, 2), true); BB.sfx && BB.sfx('swing');
          e.dash = { vx: (f.x - e.x) * 2.2, vy: (f.y - e.y) * 2.2, t: 0.12 };
          this.later(0.22, () => {
            if (e.dead || f.dead || hyp(f.x - e.x, f.y - e.y) > e.range + 1.2) return;
            if (f.invuln > 0) return;
            this.text(f.x, f.y + 0.2, tank ? 'SHIELD BASH' : 'KICK', '#ffd9a0', 1); this.hit(e, f, 0.8, { heavy: true });
            this.knock(f, e.x, e.y, tank ? 2.6 : 2.0, f.boss ? 0 : 0.6); this.breakPoise(f, 18); this.hitstop = Math.max(this.hitstop, 0.05);
          });
          return true;
        }
        return done();
      }
      case 'charge': {
        const f = m.tgt; if (!f || f.dead) return done();
        if (m.phase === 0) { // spring back
          m.phase = 1; const dx = e.x - f.x, dy = e.y - f.y, l = hyp(dx, dy) || 1;
          e.dash = { vx: dx / l * 10, vy: dy / l * 10, t: 0.24 }; e.state = 'attack'; e.lock = 0.3; e.atkDur = 0.34; e.hitAt = 99; e.hitDone = true;
          this.face(e, f.x, f.y); this.setClip(e, has(this, e, 'Rolling') ? 'Rolling' : 'Run', true); BB.sfx && BB.sfx('dodge');
          return true;
        }
        if (m.phase === 1) { // wind up
          m.phase = 2; this.face(e, f.x, f.y); e.state = 'attack'; e.lock = 0.4; e.atkDur = 0.4; e.hitAt = 99; e.hitDone = true;
          this.setClip(e, has(this, e, 'Taunt') ? 'Taunt' : 'Idle', true); this.text(e.x, e.y + 0.2, 'CHARGE!', '#ff9a5a', 1);
          return true;
        }
        if (m.phase === 2) { // through them
          m.phase = 3; const dx = f.x - e.x, dy = f.y - e.y, l = hyp(dx, dy) || 1, sp = 15, dur = Math.min(0.4, (l + 0.6) / sp);
          e.dash = { vx: dx / l * sp, vy: dy / l * sp, t: dur }; e.state = 'attack'; e.lock = dur + 0.15; e.atkDur = dur + 0.15; e.hitAt = 99; e.hitDone = true;
          this.setClip(e, has(this, e, 'AttackRun') ? 'AttackRun' : atkClip(this, e, 1), true); BB.sfx && BB.sfx('swing');
          const sv = BB.iso(dx, dy); this.addFx('dash', e.x, e.y, { sc: 0.55, rot: Math.atan2(sv.y, sv.x) + Math.PI, alpha: 0.9, fps: 40 });
          this.later(dur * 0.8, () => { if (!e.dead && !f.dead && hyp(f.x - e.x, f.y - e.y) < 1.4 && !(f.invuln > 0)) { this.hit(e, f, 1.6, { heavy: true }); this.knock(f, e.x - dx / l, e.y - dy / l, 1.6, f.boss ? 0 : 0.55); this.shake = Math.max(this.shake, 0.3); this.hitstop = Math.max(this.hitstop, 0.07); } });
          return true;
        }
        return done();
      }
      case 'pounce': {
        const f = m.tgt; if (!f || f.dead) return done();
        if (m.phase === 0) {
          m.phase = 1; this.face(e, f.x, f.y); e.state = 'attack'; e.lock = 0.3; e.atkDur = 0.3; e.hitAt = 99; e.hitDone = true; this.setClip(e, has(this, e, 'Taunt') ? 'Taunt' : 'Idle', true);
          this.text(e.x, e.y + 0.3, '!', '#ff5a3a', 1); if (BB.foeVoice) { BB.foeVoice(e, 'pounce'); BB.foeVoice(e, 'atk'); }
          return true;
        }
        if (m.phase === 1) {
          m.phase = 2; const d = hyp(f.x - e.x, f.y - e.y);
          e.arc = { sx: e.x, sy: e.y, tx: f.x, ty: f.y, t: 0, dur: 0.35 + d * 0.05, h: 1.1 + d * 0.12, tgt: f, mult: 1.4 };
          this.setClip(e, has(this, e, 'AttackRun') ? 'AttackRun' : atkClip(this, e, 0), true); BB.sfx && BB.sfx('swing');
          return true;
        }
        if (e.arc) return true;
        return done();
      }
      case 'sig': {
        if (m.phase === 0) { m.phase = 1; this.runSig(e, t, m); return true; }
        if (e.arc) return true;
        return done();
      }
      case 'hitrun': {
        const f = m.tgt;
        if (f && !f.dead) { const dx = e.x - f.x, dy = e.y - f.y, l = hyp(dx, dy) || 1; e.dash = { vx: dx / l * 10, vy: dy / l * 10, t: 0.26 }; e.state = 'attack'; e.lock = 0.5; e.atkDur = 0.34; e.hitAt = 99; e.hitDone = true; this.setClip(e, has(this, e, 'Rolling') ? 'Rolling' : 'Run', true); BB.sfx && BB.sfx('dodge'); }
        return done();
      }
      case 'tumble': {
        const f = (e.side === 'hero' ? this.foesAlive() : this.heroesAlive()).filter((o) => !o.gate).sort((a, b) => hyp(a.x - e.x, a.y - e.y) - hyp(b.x - e.x, b.y - e.y))[0];
        if (f) { const dx = e.x - f.x, dy = e.y - f.y, l = hyp(dx, dy) || 1, sd = this.r() < 0.5 ? 1 : -1; this.dodge(e, dx / l * 0.8 - dy / l * 0.6 * sd, dy / l * 0.8 + dx / l * 0.6 * sd); }
        return done();
      }
    }
    return done();
  };

  // ---------------------------------------------------------------- seeing a blow coming and rolling out of it
  const DODGE = { assassin: 0.22, ranged: 0.14, healer: 0.1, bruiser: 0.07, tank: 0 };
  B.tryDodge = function (e, t, hitAt) {
    if (t.ward || t.gate || t.turret || t.boss || t.stunT > 0 || (t.lock > 0.15) || (t.dodgeCd > 0) || t.tac) return false;
    let ch = DODGE[this.roleOf(t)] || 0;
    if (t.side === 'hero') { if (t.calling === 'monk') ch = 0.16; ch += Math.min(0.06, (t.hero.level || 1) * 0.002) + ((t.temper && t.temper.dodge) || 0); }
    else ch = t.kind === 'stalker' ? 0.25 : t.elite ? 0.06 : ch * 0.6;
    if (this.r() >= ch) return false;
    this.later(Math.max(0, hitAt - 0.14), () => {
      if (t.dead || t.stunT > 0 || t.lock > 0.2) return;
      const dx = t.x - e.x, dy = t.y - e.y, l = hyp(dx, dy) || 1, sd = this.r() < 0.5 ? 1 : -1;
      this.dodge(t, -dy / l * sd * 0.85 + dx / l * 0.5, dx / l * sd * 0.85 + dy / l * 0.5);
      t.perfectDone = true; this.text(t.x, t.y + 0.2, 'DODGE', '#bfefff', 1);
    });
    return true;
  };

  // ---------------------------------------------------------------- drawing
  B.drawPebbles = function (ctx) {
    for (const p of this.pebbles || []) {
      const s = BB.iso(p.x, p.y), a = Math.min(1, (this.time - p.born) * 3), r = 4.6 * p.s;
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(s.x, s.y + 1, r * 1.3, r * 0.55, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#8a857c'; ctx.strokeStyle = '#3a342c'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(s.x, s.y - r * 0.4, r * 1.15, r * 0.8, p.rot, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#b7b0a3'; ctx.beginPath(); ctx.ellipse(s.x - r * 0.3, s.y - r * 0.7, r * 0.5, r * 0.3, p.rot, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
  };
  function stone(ctx, x, y, r, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = '#8a857c'; ctx.strokeStyle = '#2e2922'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-r, -r * 0.2); ctx.lineTo(-r * 0.4, -r * 0.9); ctx.lineTo(r * 0.6, -r * 0.7); ctx.lineTo(r, r * 0.1); ctx.lineTo(r * 0.3, r * 0.8); ctx.lineTo(-r * 0.7, r * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#b7b0a3'; ctx.beginPath(); ctx.arc(-r * 0.25, -r * 0.35, r * 0.35, 0, TAU); ctx.fill();
    ctx.restore();
  }
  B.drawRocks = function (ctx) {
    for (const r of this.rocks || []) {
      const s = BB.iso(r.x, r.y), sy = s.y - r.z * 24;
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(s.x, s.y, 6, 3, 0, 0, TAU); ctx.fill();
      r.trail = r.trail || []; r.trail.push([s.x, sy]); if (r.trail.length > 9) r.trail.shift();
      ctx.strokeStyle = 'rgba(230,220,200,0.45)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath(); r.trail.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      stone(ctx, s.x, sy, 7, r.spin);
    }
  };
  // what a fighter holds over the fight: a stone to throw, a potion to drink
  B.drawTac = function (ctx, e, x, y) {
    const hh = 44 * (e.sc || 1);
    if (e.carry) stone(ctx, x, y - hh * 1.05, 7, Math.sin(this.time * 3) * 0.3);
    if (e.flask > 0) {
      e.flask -= this.dt || 0.016;
      const fx = x + 5, fy = y - hh * 0.62;
      ctx.fillStyle = '#e8dcc0'; ctx.fillRect(fx - 1, fy - 7, 2, 3);
      ctx.fillStyle = '#d23a4a'; ctx.beginPath(); ctx.arc(fx, fy - 1.5, 3.2, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(fx - 1.6, fy - 3, 1, 1.5);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gl = ctx.createRadialGradient(fx, fy - 1.5, 0, fx, fy - 1.5, 9); gl.addColorStop(0, 'rgba(255,90,110,0.5)'); gl.addColorStop(1, 'rgba(255,90,110,0)'); ctx.fillStyle = gl; ctx.fillRect(fx - 10, fy - 11, 20, 20); ctx.restore();
    }
  };
})();
