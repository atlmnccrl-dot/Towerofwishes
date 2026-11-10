// Bannerborn — signature moves. Each hero has one (js/identity.js deals them out); it comes round every ten seconds or
// so and is played out on the field: a whirlwind, a ground pound, a blink strike, a war cry, a ricocheting shield,
// a fan of arrows, a net, chain lightning, a meteor, a pillar of light, a blood frenzy, a pole vault, a shadow decoy,
// a flurry of blows, a barrier of light. Loaded after tactics.js.
(function () {
  const BB = window.BB, B = BB.Battle.prototype, hyp = Math.hypot, TAU = Math.PI * 2;
  const has = (b, e, clip) => BB.hasClip(b.artKey(e), clip);
  const basic = (e, i) => BB.CALLINGS[e.calling].basic[(i || 0) % BB.CALLINGS[e.calling].basic.length];
  const isBack = (r) => r === 'ranged' || r === 'healer';
  const busy = (b, e, dur, clip) => { e.state = 'attack'; e.lock = dur; e.atkDur = dur; e.hitAt = 99; e.hitDone = true; if (clip) b.setClip(e, clip, true); };
  const callout = () => {}; // a signature is seen, not announced

  // when a hero's signature is ready, and whether it has something to use it on
  B.sigOption = function (e, t) {
    if (e.side !== 'hero' || !e.brain || (e.sigCd || 0) > 0) return null;
    const s = e.brain.sig, foes = this.foesAlive().filter((o) => !o.gate && !o.hidden), near = (r) => foes.filter((o) => hyp(o.x - e.x, o.y - e.y) < r);
    const dT = t ? hyp(t.x - e.x, t.y - e.y) : 99;
    let ok = false;
    switch (s) {
      case 'whirlwind': case 'groundpound': ok = near(2.4).length >= 1; break;
      case 'warcry': ok = near(4).length >= 1; break;
      case 'blinkstrike': case 'flurry': ok = !!t && dT < 7; break;
      case 'shieldtoss': case 'snare': ok = !!t && dT < 7; break;
      case 'multishot': case 'chainbolt': case 'smite': ok = !!t && dT < 8; break;
      case 'meteor': ok = !!t && dT < 9; break;
      case 'bloodrush': ok = near(2.5).length >= 1; break;
      case 'vault': ok = foes.some((o) => isBack(this.roleOf(o)) || o.ranged); break;
      case 'decoy': ok = this.heroesAlive && foes.some((o) => o.tgt === e) || near(2).length >= 2; break;
      case 'barrier': ok = this.heroesAlive().some((o) => o.hp < o.maxhp * 0.6); break;
    }
    return ok ? { kind: 'sig', sig: s, tgt: t, w: 14, cd: 1.5 } : null;
  };

  // playing it out; called from runTac with the 'sig' move
  B.runSig = function (e, t, m) {
    const s = m.sig, S = BB.SIGNATURES[s], f = m.tgt && !m.tgt.dead ? m.tgt : t;
    e.sigCd = 9 + this.r() * 4;
    callout(this, e, S.name.toUpperCase(), BB.CLASSES[e.brain.cls].col);
    switch (s) {
      case 'whirlwind': {
        busy(this, e, 1.0, has(this, e, 'Rolling') ? 'Rolling' : basic(e, 0)); e.spinT = 1.0;
        for (let i = 0; i < 3; i++) this.later(0.15 + i * 0.3, () => { if (e.dead) return; this.addFx('aoe', e.x, e.y, { sc: 0.45, ground: true, add: true, hue: 180, fps: 30 }); for (const o of this.inRadius(e.x, e.y, 1.9, 'foe')) this.hit(e, o, 0.75, { aoe: true }); BB.sfx && BB.sfx('swing'); if (i < 2) this.setClip(e, has(this, e, 'Rolling') ? 'Rolling' : basic(e, i + 1), true); });
        break;
      }
      case 'groundpound': {
        busy(this, e, 0.6, has(this, e, 'AttackRun') ? 'AttackRun' : basic(e, 0));
        e.arc = { sx: e.x, sy: e.y, tx: e.x, ty: e.y, t: 0, dur: 0.5, h: 1.5, land: () => {
          this.addFx('x_stone', e.x, e.y, { sc: 1.0 }); this.addFx('aoe', e.x, e.y, { sc: 0.75, ground: true, add: true, hue: -40, fps: 30 }); this.shake = Math.max(this.shake, 0.5); BB.sfx && BB.sfx('slam');
          for (const o of this.inRadius(e.x, e.y, 2.4, 'foe')) { this.hit(e, o, 1.1, { aoe: true, heavy: true }); this.knock(o, e.x, e.y, 1.8, o.boss ? 0 : 0.5); }
        } };
        break;
      }
      case 'blinkstrike': {
        if (!f) break;
        const dx = f.x - e.x, dy = f.y - e.y, l = hyp(dx, dy) || 1; e.blinkCd = 0;
        if (this.blink(e, f.x + dx / l * 0.9, f.y + dy / l * 0.9)) {
          this.face(e, f.x, f.y); busy(this, e, 0.45, basic(e, 1));
          this.later(0.15, () => { if (!e.dead && !f.dead) { this.hit(e, f, 1.9, { sureCrit: true }); this.addFx('hit2', f.x, f.y - 0.3, { sc: 0.8, add: true, hue: -60 }); this.hitstop = Math.max(this.hitstop, 0.08); } });
        }
        break;
      }
      case 'warcry': {
        busy(this, e, 0.8, has(this, e, 'Taunt') ? 'Taunt' : 'Special1'); BB.sfx && BB.sfx('rally');
        for (let i = 0; i < 3; i++) this.later(i * 0.15, () => this.addFx('aoe', e.x, e.y, { sc: 0.5 + i * 0.25, ground: true, add: true, hue: 30, fps: 30 }));
        for (const o of this.heroesAlive()) if (hyp(o.x - e.x, o.y - e.y) < 5) { o.buffs.rally = Math.max(o.buffs.rally || 0, 5); this.addFx('buff9', o.x, o.y, { sc: 0.5, add: true, hue: 30, fps: 30 }); }
        for (const o of this.inRadius(e.x, e.y, 3, 'foe')) this.knock(o, e.x, e.y, 1.0, 0);
        this.shake = Math.max(this.shake, 0.25);
        break;
      }
      case 'shieldtoss': {
        if (!f) break; this.face(e, f.x, f.y); busy(this, e, 0.5, basic(e, 0));
        this.later(0.2, () => { if (!e.dead) this.rocks.push({ kind: 'disc', src: e, tgt: f, sx: e.x, sy: e.y, tx: f.x, ty: f.y, x: e.x, y: e.y, z: 1, t: 0, dur: 0.3, arc: 0.3, spin: 0, bounces: 2, hitIds: {} }); });
        break;
      }
      case 'multishot': {
        if (!f) break; this.face(e, f.x, f.y); busy(this, e, 0.55, basic(e, 0));
        this.later(0.28, () => { if (e.dead) return; const a0 = Math.atan2(f.y - e.y, f.x - e.x); for (let i = -2; i <= 2; i++) { const a = a0 + i * 0.16; this.shoot(e, e.x + Math.cos(a) * 6, e.y + Math.sin(a) * 6, 'arrow', 0.8); } });
        break;
      }
      case 'snare': {
        if (!f) break; this.face(e, f.x, f.y); busy(this, e, 0.5, basic(e, 0));
        this.later(0.22, () => { if (!e.dead && !f.dead) { const d = hyp(f.x - e.x, f.y - e.y); this.rocks.push({ kind: 'net', src: e, tgt: f, sx: e.x, sy: e.y, tx: f.x, ty: f.y, x: e.x, y: e.y, z: 1, t: 0, dur: 0.3 + d * 0.06, arc: 0.6 + d * 0.12, spin: 0 }); } });
        break;
      }
      case 'chainbolt': {
        if (!f) break; this.face(e, f.x, f.y); busy(this, e, 0.6, has(this, e, 'Special1') ? 'Special1' : basic(e, 0));
        this.later(0.3, () => {
          if (e.dead) return; let cur = e, mult = 1.3; const hitIds = {}; this.zaps = this.zaps || [];
          for (let j = 0; j < 4; j++) {
            let nx = null, nd = j ? 3.5 : 9; for (const o of this.foesAlive()) if (!hitIds[o.id] && !o.hidden) { const d = hyp(o.x - cur.x, o.y - cur.y); if (d < nd) { nd = d; nx = o; } }
            if (!nx) break; hitIds[nx.id] = 1; this.zaps.push({ x1: cur.x, y1: cur.y, x2: nx.x, y2: nx.y, t: 0, seed: Math.random() * 99 });
            this.hit(e, nx, mult, { elem: 'storm' }); this.stun(nx, 0.3); this.addFx('buff9', nx.x, nx.y, { sc: 0.4, add: true, hue: -110, fps: 30 }); cur = nx; mult *= 0.8;
          }
          BB.sfx && BB.sfx('cast'); this.flash = Math.max(this.flash, 0.12);
        });
        break;
      }
      case 'meteor': {
        if (!f) break; const cl = this.bestCluster ? this.bestCluster(e, 'foe', 9) : null, x = cl ? cl.x : f.x, y = cl ? cl.y : f.y;
        busy(this, e, 0.7, has(this, e, 'Special1') ? 'Special1' : basic(e, 0));
        this.tele.push({ kind: 'circle', x, y, rad: 1.7, t: 0, dur: 1.0, col: '255,120,40', onEnd: () => {
          this.addFx('aoe', x, y, { sc: 0.9, ground: true, add: true, hue: -30, fps: 26 }); this.addFx('fire', x, y, { sc: 0.9, add: true, fps: 20 }); this.addFx('x_stone', x, y, { sc: 1.1 });
          for (const o of this.inRadius(x, y, 1.8, 'foe')) { this.hit(e, o, 1.8, { aoe: true, heavy: true, burn: true }); this.knock(o, x, y, 1.2, 0); }
          this.shake = Math.max(this.shake, 0.6); this.flash = Math.max(this.flash, 0.2); BB.sfx && BB.sfx('slam');
        } });
        this.meteors = this.meteors || []; this.meteors.push({ x, y, t: 0, dur: 1.0 });
        break;
      }
      case 'smite': {
        if (!f) break; busy(this, e, 0.7, has(this, e, 'Special1') ? 'Special1' : basic(e, 0));
        this.later(0.3, () => {
          if (e.dead || f.dead) return; this.rays.push({ x: f.x, y: f.y, t: 0, dur: 0.9, hue: 30 });
          this.hit(e, f, 1.6, { elem: 'holy' }); this.addFx('levelup', f.x, f.y, { sc: 0.8, add: true });
          for (const o of this.heroesAlive()) if (hyp(o.x - f.x, o.y - f.y) < 4) this.heal(e, o, o.maxhp * 0.1);
        });
        break;
      }
      case 'bloodrush': {
        busy(this, e, 0.6, has(this, e, 'Taunt') ? 'Taunt' : 'Special1'); e.rushT = 5; const a0 = e.aspd; e.aspd = a0 * 1.6;
        this.later(5, () => { e.aspd = a0; }); for (let i = 0; i < 5; i++) this.later(0.5 + i, () => { if (!e.dead) this.heal(e, e, e.maxhp * 0.04); });
        this.addFx('buff9', e.x, e.y, { sc: 0.7, add: true, hue: 110, fps: 24 }); BB.sfx && BB.sfx('rally');
        break;
      }
      case 'vault': {
        const prey = this.foesAlive().filter((o) => isBack(this.roleOf(o)) || o.ranged).sort((a, b) => hyp(a.x - e.x, a.y - e.y) - hyp(b.x - e.x, b.y - e.y))[0] || f;
        if (!prey) break; const d = hyp(prey.x - e.x, prey.y - e.y);
        busy(this, e, 0.3, has(this, e, 'AttackRun') ? 'AttackRun' : basic(e, 0));
        e.arc = { sx: e.x, sy: e.y, tx: prey.x, ty: prey.y, t: 0, dur: 0.45 + d * 0.05, h: 2.2, tgt: prey, mult: 1.7 };
        break;
      }
      case 'decoy': {
        this.clones = this.clones || []; this.clones.push({ x: e.x, y: e.y, dir: e.dir, clip: e.clip, hero: e.hero, layers: e.layers, t: 0, dur: 3 });
        for (const o of this.foesAlive()) if (hyp(o.x - e.x, o.y - e.y) < 4) { if (o.tgt === e) o.tgt = null; this.stun(o, 0.7); this.text(o.x, o.y + 0.2, '?', '#c9a8ff'); }
        this.addFx('buff9', e.x, e.y, { sc: 0.6, add: true, hue: -60, fps: 30 });
        e.stealth = true; const away = this.warCenter || e; const fs = BB.freeSpot(this.map, e.x + (away.x - e.x) * 0.4 + (this.r() - 0.5) * 2, e.y + (away.y - e.y) * 0.4 + (this.r() - 0.5) * 2, 0.3);
        if (fs) { e.blinkCd = 0; this.blink(e, fs.x, fs.y); }
        break;
      }
      case 'flurry': {
        if (!f) break; this.face(e, f.x, f.y);
        if (hyp(f.x - e.x, f.y - e.y) > 1.4) { const dx = f.x - e.x, dy = f.y - e.y, l = hyp(dx, dy); e.dash = { vx: dx / l * 14, vy: dy / l * 14, t: Math.max(0, (l - 0.9) / 14) }; }
        busy(this, e, 1.0, basic(e, 0)); e.flurryT = 1.0;
        for (let i = 0; i < 5; i++) this.later(0.12 + i * 0.16, () => { if (e.dead || f.dead) return; this.setClip(e, basic(e, i), true); this.hit(e, f, i === 4 ? 0.9 : 0.42, i === 4 ? { heavy: true } : {}); this.addFx('hit2', f.x, f.y - 0.3, { sc: 0.4, add: true, hue: 40 }); if (i === 4) { this.knock(f, e.x, e.y, 2.2, f.boss ? 0 : 0.6); this.hitstop = Math.max(this.hitstop, 0.07); } });
        break;
      }
      case 'barrier': {
        let a = null; for (const o of this.heroesAlive()) if (!a || o.hp / o.maxhp < a.hp / a.maxhp) a = o;
        if (!a) break; busy(this, e, 0.6, has(this, e, 'Special1') ? 'Special1' : 'Taunt');
        a.buffs.guard = Math.max(a.buffs.guard || 0, 4); a.barrierT = 4; this.addFx('levelup', a.x, a.y, { sc: 0.8, add: true }); this.text(a.x, a.y + 0.2, 'SHIELDED', '#9fdcff');
        break;
      }
    }
    return true;
  };

  // projectiles of the signature kind, and lingering effects
  const baseUpdate = B.updateTactics;
  B.updateTactics = function (dt) {
    // discs and nets land through the stone system; intercept them first
    for (const r of this.rocks || []) {
      if (!r.kind || r.done) continue;
      const k = Math.min(1, (r.t + dt) / r.dur);
      if (k >= 1) {
        r.done = true; const t = r.tgt && !r.tgt.dead && hyp(r.tgt.x - r.tx, r.tgt.y - r.ty) < 1.2 ? r.tgt : null;
        if (r.kind === 'disc' && t && !r.returning) {
          r.hitIds[t.id] = 1; this.hit(r.src, t, 1.0, { heavy: true }); this.stun(t, 0.6); this.addFx('hit2', t.x, t.y - 0.3, { sc: 0.5, add: true, hue: 180 }); BB.sfx && BB.sfx('guard');
          if (r.bounces > 0) { let nx = null, nd = 4.5; for (const o of this.foesAlive()) if (!r.hitIds[o.id] && !o.hidden) { const d = hyp(o.x - t.x, o.y - t.y); if (d < nd) { nd = d; nx = o; } }
            const back = nx || r.src; this.rocks.push(Object.assign({}, r, { done: false, tgt: back, sx: t.x, sy: t.y, tx: back.x, ty: back.y, t: 0, dur: 0.25 + nd * 0.03, bounces: nx ? r.bounces - 1 : 0, returning: !nx, trail: [] })); }
        } else if (r.kind === 'net' && t) {
          this.stun(t, 1.8); t.netT = 1.8; this.text(t.x, t.y + 0.2, 'SNARED!', '#d8c8a8', 1); BB.sfx && BB.sfx('guard');
        }
      }
    }
    this.rocks = (this.rocks || []).filter((r) => !(r.kind && r.done));
    baseUpdate.call(this, dt);
    for (const z of this.zaps || []) z.t += dt; if (this.zaps) this.zaps = this.zaps.filter((z) => z.t < 0.3);
    for (const c of this.clones || []) c.t += dt; if (this.clones) this.clones = this.clones.filter((c) => c.t < c.dur);
    for (const m of this.meteors || []) m.t += dt; if (this.meteors) this.meteors = this.meteors.filter((m) => m.t < m.dur);
    for (const e of this.ents) { if (e.rushT > 0) e.rushT -= dt; if (e.netT > 0) e.netT -= dt; if (e.barrierT > 0) e.barrierT -= dt; if (e.spinT > 0) e.spinT -= dt; if (e.flurryT > 0) e.flurryT -= dt; if (e.sigCd > 0 && !e.dead) e.sigCd -= dt; }
  };
  // the arc of a ground pound lands on its own callback
  const baseArc = B.updateArc;
  B.updateArc = function (e, dt) {
    const A = e.arc; if (!A || !A.land) return baseArc.call(this, e, dt);
    A.t += dt; const k = Math.min(1, A.t / A.dur); e.z = Math.sin(k * Math.PI) * A.h; e.ct += dt;
    if (k >= 1) { e.arc = null; e.z = 0; e.lock = 0.3; e.state = 'attack'; e.atkDur = 0.3; e.hitDone = true; A.land(); }
    return true;
  };

  // drawing: discs, nets, lightning, decoys, meteors, auras
  const baseRocks = B.drawRocks;
  B.drawRocks = function (ctx) {
    for (const r of this.rocks || []) {
      if (!r.kind) continue;
      const s = BB.iso(r.x, r.y), y = s.y - r.z * 24;
      if (r.kind === 'disc') {
        ctx.save(); ctx.translate(s.x, y); ctx.rotate(r.spin); ctx.fillStyle = '#9aa7b8'; ctx.strokeStyle = '#e8c66a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 8, 5, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#e8c66a'; ctx.beginPath(); ctx.arc(0, 0, 2, 0, TAU); ctx.fill(); ctx.restore();
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(160,210,255,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, y, 11, r.spin, r.spin + 2.4); ctx.stroke(); ctx.restore();
      } else if (r.kind === 'net') {
        ctx.save(); ctx.translate(s.x, y); ctx.rotate(r.spin * 0.3); ctx.strokeStyle = '#d8c8a8'; ctx.lineWidth = 1;
        for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 3, -7); ctx.lineTo(i * 3, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-7, i * 3); ctx.lineTo(7, i * 3); ctx.stroke(); }
        ctx.restore();
      }
    }
    const keep = this.rocks; this.rocks = (keep || []).filter((r) => !r.kind); baseRocks.call(this, ctx); this.rocks = keep;
    // lightning between foes
    for (const z of this.zaps || []) {
      const a = BB.iso(z.x1, z.y1), b = BB.iso(z.x2, z.y2); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(190,230,255,' + (1 - z.t / 0.3) + ')'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(a.x, a.y - 22); for (let i = 1; i < 7; i++) { const k = i / 7; ctx.lineTo(a.x + (b.x - a.x) * k + Math.sin(z.seed + i * 7.3) * 6, a.y - 22 + (b.y - a.y) * k + Math.cos(z.seed + i * 5.1) * 6); } ctx.lineTo(b.x, b.y - 22); ctx.stroke(); ctx.restore();
    }
    // a meteor on its way down
    for (const m of this.meteors || []) {
      const k = m.t / m.dur, s = BB.iso(m.x, m.y), h = (1 - k) * 260;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createRadialGradient(s.x + h * 0.4, s.y - h, 0, s.x + h * 0.4, s.y - h, 18); gr.addColorStop(0, 'rgba(255,240,180,1)'); gr.addColorStop(0.4, 'rgba(255,140,40,0.8)'); gr.addColorStop(1, 'rgba(255,60,10,0)');
      ctx.fillStyle = gr; ctx.fillRect(s.x + h * 0.4 - 20, s.y - h - 20, 40, 40); ctx.strokeStyle = 'rgba(255,150,60,0.5)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(s.x + h * 0.4, s.y - h); ctx.lineTo(s.x + h * 0.4 + 40, s.y - h - 90); ctx.stroke(); ctx.restore();
    }
  };
  // the decoy double, drawn among the fighters' shadows
  const basePeb = B.drawPebbles;
  B.drawPebbles = function (ctx) {
    basePeb.call(this, ctx);
    for (const c of this.clones || []) {
      const s = BB.iso(c.x, c.y), a = Math.min(1, (c.dur - c.t) * 2) * 0.55;
      ctx.save(); ctx.globalAlpha = a; ctx.imageSmoothingEnabled = false; BB.drawLayers(ctx, c.layers, 'Idle', c.dir, Math.floor(c.t * 8) % 15, s.x, s.y, 1, { flash: 0.5 }); ctx.restore();
    }
  };
  const baseTac = B.drawTac;
  B.drawTac = function (ctx, e, x, y) {
    baseTac.call(this, ctx, e, x, y);
    const hh = 44 * (e.sc || 1);
    if (e.rushT > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; BB.drawGlow(ctx, '255,40,40', x, y - hh * 0.5, 28, 28, 0.34 + Math.sin(this.time * 12) * 0.1); ctx.restore(); }
    if (e.barrierT > 0) { ctx.save(); ctx.strokeStyle = 'rgba(160,220,255,' + Math.min(0.8, e.barrierT) + ')'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(x, y - hh * 0.45, 16, hh * 0.62, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 0.12; ctx.fillStyle = '#9fdcff'; ctx.fill(); ctx.restore(); }
    if (e.netT > 0) { ctx.save(); ctx.strokeStyle = 'rgba(216,200,168,0.9)'; ctx.lineWidth = 1; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(x + i * 3.5, y - hh * 0.8); ctx.lineTo(x + i * 3.5 * 1.3, y); ctx.stroke(); } for (let j = 0; j < 4; j++) { const yy = y - hh * 0.8 + j * hh * 0.22; ctx.beginPath(); ctx.moveTo(x - 11, yy); ctx.lineTo(x + 11, yy); ctx.stroke(); } ctx.restore(); }
    if (e.spinT > 0 || e.flurryT > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = e.flurryT > 0 ? 'rgba(255,220,120,0.6)' : 'rgba(200,230,255,0.55)'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { const a = this.time * 18 + i * 2.1; ctx.beginPath(); ctx.ellipse(x, y - hh * 0.4, 18, 7, 0, a, a + 1.6); ctx.stroke(); } ctx.restore(); }
  };
})();

// ---------------------------------------------------------------- entrances: each hero arrives their own way while the camera opens the battle
(function () {
  const BB = window.BB, B = BB.Battle.prototype, hyp = Math.hypot, TAU = Math.PI * 2;
  B.updateEntrances = function (dt) {
    const hs = this.ents.filter((e) => e.side === 'hero' && !e.ward && e.brain);
    if (!this.entInit) {
      this.entInit = true; const c = { x: this.map.w / 2, y: this.map.h / 2 };
      hs.forEach((e, i) => {
        const k = e.brain.entrance, dx = e.x - c.x, dy = e.y - c.y, l = hyp(dx, dy) || 1;
        e.ent = { k, t: -(1.05 + i * 0.36), dur: k === 'stride' ? 1.1 : k === 'holy' ? 0.9 : 0.7, hx: e.x, hy: e.y, bx: dx / l, by: dy / l, fired: false };
        e.entAlpha = 0;
      });
    }
    for (const e of hs) {
      const E = e.ent; if (!E || E.done) continue;
      E.t += dt; const k = Math.max(0, Math.min(1, E.t / E.dur));
      if (E.t < 0) { e.entAlpha = 0; continue; }
      if (!E.fired) { E.fired = true; this.entranceFx(e, 'start'); }
      e.entAlpha = 1; e.x = E.hx; e.y = E.hy; e.z = 0;
      switch (E.k) {
        case 'slam': e.z = (1 - k * k) * 5; e.clip = 'AttackRun'; if (k >= 1) this.entranceFx(e, 'land'); break;
        case 'charge': { const d = (1 - (1 - (1 - k) * (1 - k))) * 0 + (1 - k) * (1 - k) * 4.5; e.x = E.hx + E.bx * d; e.y = E.hy + E.by * d; e.clip = k < 0.85 ? 'Run' : 'Idle'; if (k > 0.75 && !E.skid) { E.skid = true; this.addFx('x_grass', e.x, e.y, { sc: 0.45 }); this.addFx('dash', e.x, e.y, { sc: 0.5, alpha: 0.7, fps: 40 }); } break; }
        case 'stride': { const d = (1 - k) * 2.2; e.x = E.hx + E.bx * d; e.y = E.hy + E.by * d; e.clip = k < 0.95 ? (BB.hasClip(this.artKey(e), 'Walk') ? 'Walk' : 'Run') : 'Idle'; e.entAlpha = Math.min(1, k * 2.5); break; }
        case 'holy': e.z = (1 - k) * 2.2; e.entAlpha = Math.min(1, k * 2); break;
        case 'shadow': e.entAlpha = k; e.z = -(1 - k) * 0.8; break;
        case 'blink': case 'lightning': case 'flame': case 'frost': case 'leaves': e.entAlpha = k < 0.25 ? 0 : 1; if (k >= 0.25 && !E.pop) { E.pop = true; this.entranceFx(e, 'pop'); } break;
      }
      this.face(e, E.hx - E.bx, E.hy - E.by);
      if (k >= 1) { E.done = true; e.entAlpha = undefined; e.z = 0; e.x = E.hx; e.y = E.hy; this.setClip(e, BB.hasClip(this.artKey(e), 'Taunt') && (E.k === 'slam' || E.k === 'stride') ? 'Taunt' : 'Idle', true); e.lock = 0.4; }
    }
    for (const f of this.fx) f.t += dt; this.fx = this.fx.filter((f) => f.loop || f.t * f.fps < f.n);
    for (const t of this.texts) { t.t += dt; t.z += dt * 0.9; } this.texts = this.texts.filter((t) => t.t < 1.3);
    for (const r of this.rays || []) r.t += dt; if (this.rays) this.rays = this.rays.filter((r) => r.t < r.dur);
    this.shake = Math.max(0, this.shake - dt * 1.5); this.flash = Math.max(0, this.flash - dt * 1.5);
  };
  B.endEntrances = function () {
    for (const e of this.ents) if (e.ent && !e.ent.done) { e.ent.done = true; e.x = e.ent.hx; e.y = e.ent.hy; e.z = 0; e.entAlpha = undefined; this.setClip(e, 'Idle', true); }
  };
  B.entranceFx = function (e, phase) {
    const k = e.ent.k, x = e.ent.hx, y = e.ent.hy, s = (n) => BB.sfx && BB.sfx(n);
    if (phase === 'start') {
      if (k === 'slam') s('charge');
      if (k === 'holy') { this.rays.push({ x, y, t: 0, dur: 1.4, god: true }); s('chime'); }
      if (k === 'shadow') { this.addFx('buff9', x, y, { sc: 0.7, add: true, hue: -60, fps: 20 }); s('portal'); }
      if (k === 'charge') s('dodge');
      if (k === 'stride') { for (let i = 0; i < 3; i++) this.addFx('buff9', x + e.ent.bx * (1.5 + i * 0.4), y + e.ent.by * (1.5 + i * 0.4), { sc: 0.6, add: false, hue: 0, fps: 14, alpha: 0.4 }); }
      if (k === 'lightning') s('charge');
      if (k === 'frost') s('enchant');
      if (k === 'flame') { this.addFx('fire', x, y, { sc: 0.8, add: true, fps: 18 }); s('burst'); }
      if (k === 'leaves') s('enchant');
      if (k === 'blink') { this.addFx('portalopen', x, y - 0.1, { sc: 0.4, add: true, fps: 30 }); s('portal'); }
    } else if (phase === 'land') {
      this.addFx('x_stone', x, y, { sc: 0.9 }); this.addFx('aoe', x, y, { sc: 0.6, ground: true, add: true, hue: -40, fps: 30 }); this.shake = Math.max(this.shake, 0.45); s('slam');
      this.text(x, y + 0.4, BB.ENTRANCES[k].name.toUpperCase(), '#ffd9a0', 1);
    } else if (phase === 'pop') {
      const hue = { blink: 200, lightning: -110, flame: 150, frost: 180, leaves: 80 }[k];
      this.addFx('buff9', x, y, { sc: 0.8, add: true, hue, fps: 26 });
      if (k === 'blink') { this.addFx('hit2', x, y - 0.3, { sc: 0.7, add: true, hue: 200 }); s('slash'); }
      if (k === 'lightning') { this.flash = Math.max(this.flash, 0.3); this.shake = Math.max(this.shake, 0.3); s('slam'); }
      if (k === 'frost') { this.addFx('x_stone', x, y, { sc: 0.5 }); s('guard'); }
      if (k === 'flame') this.addFx('aoe', x, y, { sc: 0.5, ground: true, add: true, hue: -30, fps: 30 });
    }
  };
  // what the entrance looks like around the hero while it plays
  const baseTac = B.drawTac;
  B.drawTac = function (ctx, e, x, y) {
    baseTac.call(this, ctx, e, x, y);
    const E = e.ent; if (!E || E.done || E.t < 0) return;
    const k = Math.min(1, E.t / E.dur), hh = 44 * (e.sc || 1), s = BB.iso(E.hx, E.hy);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (E.k === 'lightning' && k < 0.45) { ctx.strokeStyle = 'rgba(200,230,255,' + (1 - k * 2) + ')'; ctx.lineWidth = 3; ctx.beginPath(); let px = s.x, py = s.y - 400; ctx.moveTo(px, py); for (let i = 1; i <= 10; i++) { px = s.x + (i < 10 ? Math.sin(i * 12.3 + E.hx) * 14 : 0); py = s.y - 400 + i * 40; ctx.lineTo(px, py); } ctx.stroke(); }
    if (E.k === 'flame') { const gr = ctx.createLinearGradient(0, s.y - 90, 0, s.y); gr.addColorStop(0, 'rgba(255,90,20,0)'); gr.addColorStop(1, 'rgba(255,140,40,' + (0.7 * (1 - k)) + ')'); ctx.fillStyle = gr; ctx.fillRect(s.x - 14, s.y - 90, 28, 90); }
    if (E.k === 'shadow') { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'rgba(20,0,30,' + (0.6 * (1 - k)) + ')'; ctx.beginPath(); ctx.ellipse(s.x, s.y, 20, 8, 0, 0, TAU); ctx.fill(); }
    if (E.k === 'frost' && k < 0.6) { ctx.fillStyle = 'rgba(170,220,255,' + (0.35 * (1 - k / 0.6)) + ')'; ctx.strokeStyle = 'rgba(220,245,255,0.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(s.x - 12, s.y); ctx.lineTo(s.x - 14, s.y - hh); ctx.lineTo(s.x, s.y - hh - 8); ctx.lineTo(s.x + 14, s.y - hh); ctx.lineTo(s.x + 12, s.y); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (k > 0.25) for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, d = (k - 0.25) * 90; ctx.fillStyle = 'rgba(220,245,255,' + (1 - k) + ')'; ctx.fillRect(s.x + Math.cos(a) * d, s.y - hh * 0.5 + Math.sin(a) * d * 0.6, 3, 3); } }
    if (E.k === 'leaves') for (let i = 0; i < 14; i++) { const a = i / 14 * TAU + k * 8, r = 26 * (1 - k * 0.6); ctx.fillStyle = i % 2 ? 'rgba(140,220,90,' + (1 - k) + ')' : 'rgba(220,200,90,' + (1 - k) + ')'; ctx.beginPath(); ctx.ellipse(s.x + Math.cos(a) * r, s.y - hh * 0.5 + Math.sin(a) * r * 0.5 - k * 20, 3, 1.5, a, 0, TAU); ctx.fill(); }
    if (E.k === 'stride') { ctx.globalCompositeOperation = 'source-over'; for (let i = 0; i < 5; i++) { const q = (k + i / 5) % 1, gx = x + E.bx * 20 * q + Math.sin(i * 3) * 8, gy = y - 6 - q * 18; ctx.fillStyle = 'rgba(60,55,60,' + (0.35 * (1 - q)) + ')'; ctx.beginPath(); ctx.arc(gx, gy, 6 + q * 10, 0, TAU); ctx.fill(); }
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,190,90,0.9)'; ctx.fillRect(x - 3, y - hh * 0.82, 2, 1.5); ctx.fillRect(x + 1, y - hh * 0.82, 2, 1.5); }
    if (E.k === 'charge' && k < 0.85) { ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x, y - 8 - i * 9); ctx.lineTo(x + E.bx * 40 - E.by * 20, y - 8 - i * 9 + (E.bx + E.by) * 12); ctx.stroke(); } }
    ctx.restore();
  };
})();
