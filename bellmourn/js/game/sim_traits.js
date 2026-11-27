// The wardens' traits at work in the fight (run.js TRAITS names them: five per warden, earned with mastery). Pure
// logic, no DOM: a mixin on the World like sim_boons.js. A hero carries its traits as e.T (a Set of ids; spawnHero
// reads stats.traits). sim.js calls, each only when e.T is set:
//   _trTick(e, h)                 every step
//   _trMul(src, dst, o)           a blow's damage multiplier (ripostes, revenge, backstabs)
//   _trHit(src, dst, real, o)     after a blow lands
//   _trGuard(dst, src, real)      a blow on the hero (returns what it takes)
//   _trKill(hero, e, st, o)       a foe falls (st: its statuses as they were)
//   _trPerfect(e, src)            a perfect dodge
//   _trDash(e, phase, h)          'start' | 'step' | 'end'
//   _trUlt(e, phase)              'start' | 'end'
//   _trShot(e, p)                 a basic shot leaves (the projectile, before it flies)
//   _trDot(e, amt, kind)          a damage-over-time tick on a foe
// Every trait that fires emits 'trait' { e, id, x, z, r, col } (the game draws it, names it the first time) and
// counts itself in world.stats.trait[id].
// PROPOSAL: every trait.

const dist = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);
// is a standing in the rear half of b (behind its facing)?
const behind = (a, b) => { const g = Math.atan2(a.x - b.x, a.z - b.z); let d = g - (b.face || 0); d = Math.atan2(Math.sin(d), Math.cos(d)); return Math.abs(d) > 1.9; };
const COL = { steel: [2.8, 0.5, 0.45], gold: [3, 2.4, 1.0], fire: [3, 1.4, 0.35], frost: [1.0, 2.2, 2.8], storm: [2.4, 2.6, 3], blood: [2.6, 0.3, 0.3], tide: [0.6, 2.2, 2.0], hymn: [1.9, 1.0, 2.8], white: [2.8, 2.8, 2.8] };

export function installTraits(World) {
  const P = World.prototype;
  const has = (e, id) => !!(e && e.T && e.T.has(id));
  const tr = (e) => e.tr || (e.tr = { pend: [] });

  P._trCount = function (id) { const s = this.stats.trait || (this.stats.trait = {}); s[id] = (s[id] || 0) + 1; }; // counted, no look (it shows by itself)
  P._trFire = function (e, id, x, z, r = 0, col = COL.white) { this.emit('trait', { e, id, x, z, r, col }); const s = this.stats.trait || (this.stats.trait = {}); s[id] = (s[id] || 0) + 1; };
  // a blow from the warden's side that ignores the traits (no echoes of echoes)
  P._trHurt = function (e, f, dmg, o = {}) { if (!f || f.dead) return; this._damage(e, f, Math.round(dmg), { special: true, kb: o.kb ?? 2, poise: o.poise ?? 20, kind: o.kind || 'trait', trait: true, stun: o.stun, status: o.status }); };
  P._trBlast = function (e, x, z, r, dmg, kind, o = {}) { return this._blast(e, x, z, r, Math.round(dmg), kind, { warn: o.warn ?? 0.06, life: o.life ?? 0.14, kb: o.kb ?? 4, poise: o.poise ?? 24, status: o.status, tick: o.tick, special: true, onHit: o.onHit }); };
  P._trBolt = function (e, kind, a, dmg, o = {}) { // a projectile of the warden's, from (o.x, o.z) or the warden
    const x = o.x ?? e.x, z = o.z ?? e.z; const sp = o.speed ?? 20;
    this.projs.push({ id: this.nextId++, kind, team: 'hero', x: x + Math.sin(a) * 0.5, z: z + Math.cos(a) * 0.5, y: 1.1, vx: Math.sin(a) * sp, vz: Math.cos(a) * sp, r: o.r ?? 0.25, dmg: Math.round(dmg), poise: o.poise ?? 8, life: o.life ?? 0.6, pierce: !!o.pierce, status: o.status, resonate: o.resonate, hitSet: new Set(o.skip ? [o.skip.id] : []), face: a, src: e, trait: true });
  };
  const lastOf = (e) => { const C = e.kit.attack.combo || []; return C[C.length - 1]; };
  const finisher = (e, o) => { const L = lastOf(e); return !!(o.basic && o.atk && L && o.atk.name === L.name); };
  const isDashAtk = (e, o) => !!(o.atk && e.kit.attack.dashAttack && o.atk.name === e.kit.attack.dashAttack.name);
  const oncePerSwing = (e, key, o) => { const T = tr(e); if (T[key] === o.atk && this_t(e) - (T[key + 'T'] || -9) < 0.5) return false; T[key] = o.atk; T[key + 'T'] = this_t(e); return true; };
  const this_t = (e) => e._worldT || 0;

  P._trTick = function (e, h) {
    const T = tr(e); e._worldT = this.t;
    // delayed blows: the Requiem's echoes, aftershocks
    if (T.pend.length) { const now = this.t; const due = T.pend.filter((q) => q.at <= now); T.pend = T.pend.filter((q) => q.at > now); for (const q of due) q.fn(); }
    // the Huntress stands still: her hand steadies
    if (has(e, 'stillhand')) {
      const moved = Math.hypot(e.x - (T.px ?? e.x), e.z - (T.pz ?? e.z)) > 0.02; T.px = e.x; T.pz = e.z;
      T.stillT = moved || e.state === 'dash' ? 0 : (T.stillT || 0) + h;
      if (T.stillT > 0.6 && !(T.still > 0)) { T.still = 3; this._trFire(e, 'stillhand', e.x, e.z, 1.2, COL.white); }
    }
    // Sister Ash warms her hands at the fires she lit
    if (has(e, 'warmhands') && !e.dead) {
      T.warmT = (T.warmT || 0) - h;
      if (T.warmT <= 0) { T.warmT = 1; const n = Math.min(4, this.foes().filter((f) => f.status.burn && dist(e, f) < 6).length); if (n && e.hp < e.maxHp) { e.hp = Math.min(e.maxHp, e.hp + n); this.emit('heal', { e, amt: n }); this._trCount('warmhands'); } }
    }
  };

  P._trMul = function (src, dst, o) {
    if (o.trait) return 1; const T = tr(src); let m = 1;
    if (has(src, 'riposte') && T.riposte > this.t && o.basic) { T.riposte = 0; m *= 3; if (!dst.boss) this.applyStatus(dst, 'stun', { dur: 1.2 }); this._trFire(src, 'riposte', dst.x, dst.z, 1.6, COL.steel); }
    if (has(src, 'revenge') && T.revenge > this.t && o.basic) { T.revenge = 0; m *= 2; this._trFire(src, 'revenge', dst.x, dst.z, 2, COL.fire); }
    if (has(src, 'backstab') && o.basic && !o.proj && dst.status.bleed && behind(src, dst)) { m *= 2; this._trFire(src, 'backstab', dst.x, dst.z, 0.8, COL.blood); }
    if (has(src, 'shadowstep') && T.shadowCrit > this.t && (o.basic || o.proj)) { T.shadowCrit = 0; m *= 2.2; }
    return m;
  };

  P._trHit = function (e, dst, real, o) {
    if (o.trait) return; const T = tr(e);
    // ---- the Bell-Warden
    if (has(e, 'thirdbell') && finisher(e, o) && oncePerSwing(e, 'bell', o)) { this._trBolt(e, 'wave', e.face, real * 0.6, { r: 1.0, speed: 15, life: 0.45, pierce: true, poise: 20 }); this._trFire(e, 'thirdbell', e.x, e.z, 0, COL.steel); }
    if (has(e, 'requiem') && T.echoUntil > this.t && finisher(e, o) && !dst.dead) { const f = dst, d = real * 0.6; T.pend.push({ at: this.t + 0.28, fn: () => { if (!f.dead) { this._trHurt(e, f, d, { kind: 'echo' }); this._trFire(e, 'requiem', f.x, f.z, 1.2, COL.steel); } } }); }
    // ---- the Huntress
    if (has(e, 'markedprey') && o.proj && o.basic && !dst.dead) { dst.prey = (dst.prey || 0) + 1; if (dst.prey >= 5) { dst.prey = 0; this._trHurt(e, dst, this.heroDmg(e, 34), { kind: 'prey', poise: 40 }); this._trFire(e, 'markedprey', dst.x, dst.z, 1.4, COL.gold); } }
    // ---- the Bellbreaker
    if (has(e, 'aftershock') && o.basic && o.atk && o.atk.quake && oncePerSwing(e, 'after', o)) { const x = e.x + Math.sin(e.face) * 2.2, z = e.z + Math.cos(e.face) * 2.2; T.pend.push({ at: this.t + 0.55, fn: () => { this._trBlast(e, x, z, 2.5, this.heroDmg(e, 20), 'quake', { kb: 6 }); this._trFire(e, 'aftershock', x, z, 2.5, COL.fire); } }); }
    if (has(e, 'bellringer') && o.basic && o.heavy && oncePerSwing(e, 'ring', o)) { T.rings = (T.rings || 0) + 1; if (T.rings >= 4) { T.rings = 0; this._trBlast(e, e.x, e.z, 3.6, this.heroDmg(e, 14), 'toll', { kb: 7, onHit: (w, z, f) => { if (!f.boss) w.applyStatus(f, 'stun', { dur: 1.0 }); } }); this._trFire(e, 'bellringer', e.x, e.z, 3.6, COL.gold); } }
    // ---- the Lamplighter: every sixth bolt is a sunspot that bursts where it lands
    if (has(e, 'sunspot') && o.p && o.p.sunspot) { this._trBlast(e, dst.x, dst.z, 2.2, this.heroDmg(e, 16), 'fire', { status: { burn: 1 } }); this._trFire(e, 'sunspot', dst.x, dst.z, 2.2, COL.fire); }
    // ---- Kestrel
    if (has(e, 'hemorrhage') && (o.basic || o.proj) && dst.status.bleed && dst.status.bleed.stacks >= 3 && !dst.dead) { dst.hem = (dst.hem || 0) + 1; if (dst.hem >= 3) { dst.hem = 0; delete dst.status.bleed; this._trHurt(e, dst, this.heroDmg(e, 26), { kind: 'bleedburst' }); this._trFire(e, 'hemorrhage', dst.x, dst.z, 1.2, COL.blood); } }
    if (has(e, 'gallowsdance') && isDashAtk(e, o) && oncePerSwing(e, 'dance', o)) { for (const s of [-1, 1]) this._trBolt(e, 'knife', e.face + s * Math.PI / 2, this.heroDmg(e, 10), { status: { bleed: 1 }, life: 0.5 }); this._trFire(e, 'gallowsdance', e.x, e.z, 0, COL.blood); }
    // ---- Hollis
    if (has(e, 'colddeep') && o.basic && o.pull && !dst.dead) { this.applyStatus(dst, 'chill', { src: e }); this._trCount('colddeep'); }
    if (has(e, 'tidesurge') && finisher(e, o) && oncePerSwing(e, 'surge', o)) { const x = e.x + Math.sin(e.face) * 2.6, z = e.z + Math.cos(e.face) * 2.6; this._trBlast(e, x, z, 2.4, this.heroDmg(e, 4), 'tidepool', { life: 2.6, tick: 0.5, kb: 0.5, status: { frost: 1 } }); this._trFire(e, 'tidesurge', x, z, 2.4, COL.tide); }
    if (has(e, 'highwater') && T.highUntil > this.t && o.basic && !o.chain) {
      let n = 0; for (const f of this.foes()) { if (f === dst || n >= 2 || dist(f, dst) > 4.5) continue; n++; this.emit('chain', { from: dst, to: f }); this._damage(e, f, Math.round(real * 0.45), { chain: true, special: true, trait: true, kind: 'shock' }); }
      if (n) this._trFire(e, 'highwater', dst.x, dst.z, 0, COL.storm);
    }
    // ---- Mother Wren
    if (has(e, 'chorus') && dst.status.resonate && !o.chorus) { let n = 0; for (const f of this.foes()) { if (f === dst || !f.status.resonate || dist(f, dst) > 5 || n >= 3) continue; n++; this._damage(e, f, Math.round(real * 0.25), { special: true, trait: true, chorus: true, kind: 'chorus', kb: 0.5 }); } if (n) this._trFire(e, 'chorus', dst.x, dst.z, 0, COL.hymn); }
    if (dst.status.resonate && dst.status.resonate.stacks >= 3 && !dst.dead) {
      if (has(e, 'sanctus') && e.hp < e.maxHp) { e.hp = Math.min(e.maxHp, e.hp + 2); this.emit('heal', { e, amt: 2 }); this._trCount('sanctus'); }
      if (has(e, 'crescendo') && !o.chorus) { delete dst.status.resonate; this._trBlast(e, dst.x, dst.z, 1.9, this.heroDmg(e, 22), 'hymn', { kb: 3 }); this._trFire(e, 'crescendo', dst.x, dst.z, 1.9, COL.hymn); }
    }
  };

  P._trGuard = function (dst, src, real) {
    const T = tr(dst);
    // the Refused Oath: once in each area, a blow that would end the warden leaves them standing
    if (has(dst, 'laststand') && !T.stood && real >= dst.hp) { T.stood = true; real = Math.max(0, dst.hp - 1); dst.iframes = 1.6; this.slow(0.6, 0.3); this._trFire(dst, 'laststand', dst.x, dst.z, 2.5, COL.steel); }
    if (has(dst, 'revenge') && real > 0) T.revenge = this.t + 4;
    if (has(dst, 'barnaclehide') && real > 0 && !(T.barnCd > this.t)) { T.barnCd = this.t + 9; dst.buffs.barnacle = 3; dst.barnReduce = 0.4; this._trFire(dst, 'barnaclehide', dst.x, dst.z, 1.2, COL.tide); }
    return real;
  };

  P._trKill = function (e, f, st, o = {}) {
    const T = tr(e);
    // the Huntress's bolt flies on to the next
    if (has(e, 'ricochet') && o.proj && !o.trait) { const n = this.foes().filter((x) => x !== f && !x.dead && dist(x, f) < 8).sort((a, b) => dist(a, f) - dist(b, f))[0]; if (n) { this._trBolt(e, 'hbolt', Math.atan2(n.x - f.x, n.z - f.z), this.heroDmg(e, (e.kit.attack.proj || {}).dmg || 9) * 1.2, { x: f.x, z: f.z, speed: 24, skip: f }); this._trFire(e, 'ricochet', f.x, f.z, 0, COL.white); } }
    if (has(e, 'scatter') && o.heavy && o.basic) { this._trBlast(e, f.x, f.z, 2.1, this.heroDmg(e, 18), 'quake', { kb: 8 }); this._trFire(e, 'scatter', f.x, f.z, 2.1, COL.fire); }
    if (has(e, 'kindling') && st && st.burn) { this._trBlast(e, f.x, f.z, 2.0, this.heroDmg(e, 14), 'fire', { status: { burn: 1 } }); this._trFire(e, 'kindling', f.x, f.z, 2, COL.fire); }
    if (has(e, 'keys') && st && st.bleed) { e.cds = e.cds.map((c) => c * 0.7); this._trFire(e, 'keys', e.x, e.z, 0, COL.gold); }
  };

  P._trPerfect = function (e, src) {
    const T = tr(e);
    if (has(e, 'riposte')) { T.riposte = this.t + 3; this._trFire(e, 'riposteReady', e.x, e.z, 1, COL.steel); }
    if (has(e, 'rooftop')) { for (let i = -2; i <= 2; i++) this._trBolt(e, 'hbolt', e.face + i * 0.22, this.heroDmg(e, (e.kit.attack.proj || {}).dmg || 9), { speed: 22 }); this._trFire(e, 'rooftop', e.x, e.z, 0, COL.white); }
    if (has(e, 'shadowstep') && src && !src.dead && src.team === 'foe') {
      const bx = src.x - Math.sin(src.face) * (src.r + 0.9), bz = src.z - Math.cos(src.face) * (src.r + 0.9);
      if (!this._blocked(bx, bz, e.r)) { this._trFire(e, 'shadowstepFrom', e.x, e.z, 0, COL.blood); e.x = bx; e.z = bz; e.face = Math.atan2(src.x - bx, src.z - bz); T.shadowCrit = this.t + 1.5; this._trFire(e, 'shadowstep', bx, bz, 1, COL.blood); }
    }
    if (has(e, 'lullgrace')) { let n = 0; for (const f of this.foes()) if (!f.boss && dist(f, e) < 5) { this.applyStatus(f, 'stun', { dur: 1.6 }); n++; } if (n) this._trFire(e, 'lullgrace', e.x, e.z, 5, COL.hymn); }
  };

  P._trDash = function (e, phase) {
    const T = tr(e);
    if (phase === 'start') {
      T.dashHit = new Set();
      if (has(e, 'caltrops')) { this._trBlast(e, e.x, e.z, 1.3, this.heroDmg(e, 3), 'snare', { life: 3, tick: 0.5, kb: 0.2, poise: 4, status: { bleed: 1 }, onHit: (w, z, f) => { if (!f.boss && !f.status.root) w.applyStatus(f, 'root', { dur: 0.8 }); } }); this._trFire(e, 'caltrops', e.x, e.z, 1.3, COL.white); }
    } else if (phase === 'step') {
      if (has(e, 'rushsteel')) for (const f of this.foes()) { if (T.dashHit && !T.dashHit.has(f.id) && dist(f, e) < f.r + 0.9 && !f.hidden && f.state !== 'spawn') { T.dashHit.add(f.id); this._trHurt(e, f, this.heroDmg(e, 11), { kind: 'rush', status: { bleed: 1 } }); this._trFire(e, 'rushsteel', f.x, f.z, 0, COL.steel); } }
    } else if (phase === 'end') {
      if (has(e, 'anchordrop')) { this._trBlast(e, e.x, e.z, 2.1, this.heroDmg(e, 16), 'splash', { kb: 4, onHit: (w, z, f) => { if (!f.boss) w.applyStatus(f, 'stun', { dur: 0.8 }); } }); this._trFire(e, 'anchordrop', e.x, e.z, 2.1, COL.tide); }
    }
  };

  P._trUlt = function (e, phase) {
    if (phase !== 'end') return; const T = tr(e);
    if (has(e, 'requiem')) { T.echoUntil = this.t + 6; this._trFire(e, 'requiemOn', e.x, e.z, 2, COL.steel); }
    if (has(e, 'lasttoll')) { this._trBlast(e, e.x, e.z, 5, this.heroDmg(e, 60), 'toll', { kb: 9, poise: 60, onHit: (w, z, f) => { if (!f.boss) w.applyStatus(f, 'stun', { dur: 1.5 }); } }); this._trFire(e, 'lasttoll', e.x, e.z, 5, COL.gold); }
    if (has(e, 'dawnbreak')) { T.dawnUntil = this.t + 5; this._trFire(e, 'dawnbreakOn', e.x, e.z, 2, COL.gold); }
    if (has(e, 'highwater')) { T.highUntil = this.t + 8; this._trFire(e, 'highwaterOn', e.x, e.z, 2, COL.storm); }
    if (has(e, 'amen')) { let n = 0; for (const f of this.foes()) if (f.status.resonate && dist(f, e) < 12) { n++; const s = f.status.resonate.stacks; delete f.status.resonate; this._trHurt(e, f, this.heroDmg(e, 18 * s), { kind: 'amen', poise: 40 }); this._trFire(e, 'amen', f.x, f.z, 1.6, COL.hymn); } }
  };

  P._trShot = function (e, p) {
    const T = tr(e);
    if (has(e, 'stillhand') && T.still > 0) { T.still--; p.pierce = true; p.dmg = Math.round(p.dmg * 1.8); p.still = true; }
    if (has(e, 'sunspot')) { T.shots = (T.shots || 0) + 1; if (T.shots % 6 === 0) { p.sunspot = true; p.r *= 1.8; p.dmg = Math.round(p.dmg * 1.6); } }
    if (has(e, 'dawnbreak') && T.dawnUntil > this.t && (this._trCount('dawnbreak'), true)) for (const s of [-1, 1]) this._trBolt(e, p.kind, p.face + s * 0.26, p.dmg * 0.7, { speed: Math.hypot(p.vx, p.vz), r: p.r, life: p.life, status: p.status });
  };

  P._trDot = function (f, amt, kind) {
    const h = this.hero; if (!has(h, 'wildfire') || kind !== 'burn' || this.rand() > 0.22) return;
    const n = this.foes().find((x) => x !== f && !x.status.burn && dist(x, f) < 3.2); if (n) { this.applyStatus(n, 'burn', { dps: Math.max(3, amt * 2) }); this._trFire(h, 'wildfire', n.x, n.z, 0, COL.fire); }
  };
}
