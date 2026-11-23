// The boons at work in the fight (boons.js names them; this makes each one real). Pure logic, no DOM: a mixin
// that installs methods on the World (sim.js calls installBoons(World) once). sim.js calls the hooks:
//   _boonTick(e, h)          every step, for a hero that carries boons (crowns, the halo)
//   _boonMul(src, dst, o)    damage multiplier on a blow the hero lands
//   _boonHit(src, dst, real, o)   after a blow lands: the slot's riders (attack, skill, ult, dash) and the rest
//   _boonGuard(dst, src, real, o) a blow on the hero: shields, mail, the poisoned's weakness...
//   _boonKill(hero, e, st)   a foe falls (st: its statuses as they were)
//   _boonDot(e, amt, kind)   a tick of burn / bleed / poison on a foe; returns the amount
//   _boonDashStart / _boonDashStep / _boonDashEnd, _boonSkill, _boonUlt(e, phase, h), _boonPerfect, _onStatus
//   _boonWorld(h)            once a step: storms that outlast the ultimate, rifts that pull, pending shields
// Plus the elements every source shares (boons, elemental foes): _el, _chainBolt, _skyBolt, _smite, _blast.
// world.fxq: a queue of looks for the view ({ k, ... }); nothing in the sim reads it back. Capped.
//
// Every effect that fires counts itself in world.stats.boon[id] (the tests check each boon does something).

const TAU = Math.PI * 2;
const dist = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);
const BOSS_EXEC = false; // great foes are never executed, only hurt more

export function installBoons(World) {
  const P = World.prototype;

  P._fx = function (o) { const q = this.fxq || (this.fxq = []); if (q.length < 300) q.push(o); };
  P._proc = function (id, n = 1) { const b = this.stats.boon || (this.stats.boon = {}); b[id] = (b[id] || 0) + n; };
  P._foesNear = function (x, z, r, not) { return this.foes().filter((f) => f !== not && f.state !== 'spawn' && !f.hidden && Math.hypot(f.x - x, f.z - z) < r + f.r); };

  // ---------------------------------------------------------------- shared elemental tools
  // an area blow from the hero's side: { x, z, r, warn, dmg, kind, el, src, onHit, status, slot }
  P._blast = function (src, x, z, r, dmg, kind, o = {}) {
    // lingering clouds and trails merge with one of their kind close by (so a crowd of kills cannot pile them up)
    if (o.tick && !o.follow) { const near = this.zones.find((q) => q.kind === kind && !q.follow && q.src === src && Math.hypot(q.x - x, q.z - z) < r * 0.6); if (near) { near.t = Math.min(near.t, near.warn); near.life = Math.max(near.life, o.life ?? 0.12); return near; } }
    if (this.zones.length > 220) return null;
    return this.addZone({ shape: 'circle', x, z, r, warn: o.warn ?? 0.08, life: o.life ?? 0.12, dmg: Math.round(dmg), kb: o.kb ?? 3, poise: o.poise ?? 10, kind, el: o.el, boon: true, src, status: o.status, onHit: o.onHit, tick: o.tick, follow: o.follow, special: o.special, fxOwn: true, pull: o.pull });
  };
  // a pillar of light from above (Dawn): lands after a beat; Judgement stuns, Solar Flare burns, Heaven's Wrath chains, Eclipse marks
  P._smite = function (src, x, z, dmg, o = {}) {
    const B = src && src.B; const v = B ? B.v : {};
    this._fx({ k: 'smite', x, z, warn: 0.22 });
    this._blast(src, x, z, o.r ?? 1.3, dmg, 'smite', { warn: 0.22, kb: 2, poise: 18, el: 'holy', onHit: (w, zn, f) => {
      if (o.stun && !f.boss) w.applyStatus(f, 'stun', { dur: o.stun });
      if (v.duo_eclipse) { w.applyStatus(f, 'mark', { stacks: v.duo_eclipse, max: w._markMax(src) }); w._proc('duo_eclipse'); }
      if (v.duo_wrath && !zn.chained) { zn.chained = true; w._chainBolt(src, f, dmg * 0.5, v.duo_wrath); w._proc('duo_wrath'); }
    } });
    if (v.duo_solar) { this._blast(src, x, z, 2.0, v.duo_solar, 'fire', { warn: 0.26, status: { burn: 1 }, el: 'fire' }); this._proc('duo_solar'); }
  };
  // a bolt from the sky on a foe (or a spot)
  P._skyBolt = function (src, x, z, dmg, o = {}) {
    this._fx({ k: 'sky', x, z, el: 'storm' });
    this._blast(src, x, z, o.r ?? 1.1, dmg, 'tbolt', { warn: o.warn ?? 0.1, kb: 1.5, poise: 14, el: 'storm', onHit: (w, zn, f) => w._stormHit(src, f, dmg) });
  };
  // what lightning does where it lands (shock, Acid Rain, Plasma, Null Storm, Superconduct)
  P._stormHit = function (src, f, dmg) {
    if (f.dead) return; this.applyStatus(f, 'shock', {});
    const v = src && src.B ? src.B.v : null; if (!v) return;
    if (v.duo_acid) { this.applyStatus(f, 'poison', { dps: Math.max(3, dmg * 0.2), stack: true, stacks: v.duo_acid, max: src.B.poisonMax }); this._proc('duo_acid'); }
    if (v.duo_plasma) { this.applyStatus(f, 'burn', { dps: Math.max(3, dmg * v.duo_plasma) * src.B.burnMul }); this._proc('duo_plasma'); }
    if (v.duo_nullstorm) { this.applyStatus(f, 'mark', { stacks: v.duo_nullstorm, max: this._markMax(src) }); this._proc('duo_nullstorm'); }
    if (v.duo_supercon && f.status.freeze && !f.dead) {
      delete f.status.freeze; f.stun = 0; this._fx({ k: 'shatter', x: f.x, z: f.z });
      this._damage(src, f, dmg * v.duo_supercon, { boon: true, kind: 'shatter', heavy: true, poise: 30 }); this._proc('duo_supercon');
    }
  };
  // chain lightning from a foe to `jumps` more (each struck once), marked foes first with Null Storm
  P._chainBolt = function (src, from, dmg, jumps, o = {}) {
    const B = src && src.B; const range = B ? B.chainRange : 4.8; const hit = new Set([from.id]); let cur = from;
    if (B && B.v.duo_plasma && from.status && from.status.burn) jumps++;
    for (let i = 0; i < jumps; i++) {
      const near = this.foes().filter((f) => !hit.has(f.id) && f.state !== 'spawn' && !f.hidden && dist(cur, f) < range + f.r);
      if (!near.length) break;
      near.sort((a, b) => (B && B.v.duo_nullstorm ? ((b.status.mark ? 1 : 0) - (a.status.mark ? 1 : 0)) * 9 : 0) + dist(cur, a) - dist(cur, b));
      const f = near[0]; hit.add(f.id);
      this._fx({ k: 'arc', x0: cur.x, z0: cur.z, x1: f.x, z1: f.z, el: 'storm' }); this.emit('chain', { from: cur, to: f, boon: true });
      this._damage(src, f, dmg, { chain: true, boon: true, kb: 1, dotLike: true, kind: 'storm' });
      this._stormHit(src, f, dmg); cur = f;
    }
    if (from && !from.dead) this.applyStatus(from, 'shock', {});
  };
  P._markMax = function (src) { return src && src.B && src.B.v.silence_unmake ? 3 : 5; };

  // one element on a foe from the hero's side: power = the blow's damage (dps and bolts scale from it)
  P._el = function (src, dst, el, power, o = {}) {
    if (!dst || dst.dead || dst.element === el) return; // a foe of an element shrugs off its own
    const B = src && src.B; const v = B ? B.v : {};
    const s = dst.status;
    if (el === 'fire') {
      if (v.duo_steam && (s.chill || s.freeze) && this._cd(dst, 'steam', 0.8)) this._steam(src, dst, v.duo_steam);
      if (v.duo_firedamp && s.poison && this._cd(dst, 'damp', 0.8)) {
        const left = s.poison.dps * (s.poison.stacks || 1) * Math.max(0, s.poison.t) * 0.5; delete s.poison;
        this._fx({ k: 'burst', x: dst.x, z: dst.z, el: 'fire', r: 2.2 }); this._blast(src, dst.x, dst.z, 2.2, v.duo_firedamp + left, 'fire', { status: { burn: 1 }, el: 'fire' }); this._proc('duo_firedamp');
      }
      this.applyStatus(dst, 'burn', { dps: Math.max(4, power * 0.25) * (B ? B.burnMul : 1) });
    } else if (el === 'frost') {
      if (v.duo_steam && s.burn && this._cd(dst, 'steam', 0.8)) this._steam(src, dst, v.duo_steam);
      this.applyStatus(dst, 'chill', { stacks: o.stacks || 1, at: B ? B.freezeAt : 3, src });
    } else if (el === 'poison') this.applyStatus(dst, 'poison', { dps: Math.max(3, power * 0.18) * (B ? B.poisonMul : 1), stack: true, stacks: o.stacks || 1, max: B ? B.poisonMax : 5 });
    else if (el === 'storm') this._chainBolt(src, dst, Math.max(4, power * 0.5), B ? B.chainJumps : 2);
    else if (el === 'blood') this.applyStatus(dst, 'bleed', { dps: Math.max(3, power * 0.18), max: B ? B.bleedMax : 3 });
    else if (el === 'holy') this._smite(src, dst.x, dst.z, Math.max(14, power * 2.2), o);
    else if (el === 'void') this.applyStatus(dst, 'mark', { stacks: o.stacks || 1, max: this._markMax(src), src });
  };
  P._cd = function (e, key, t) { const c = e.bcd || (e.bcd = {}); if ((c[key] || -9) > this.t) return false; c[key] = this.t + t; return true; };
  P._steam = function (src, dst, dmg) {
    this._fx({ k: 'burst', x: dst.x, z: dst.z, el: 'steam', r: 2.4 });
    this._blast(src, dst.x, dst.z, 2.4, dmg, 'steam', { el: 'steam', onHit: (w, zn, f) => w.applyStatus(f, 'blind', { dur: 3 }) });
    this._proc('duo_steam');
  };
  P._shield = function (e, amt, id) {
    const B = e.B; let cap = B ? B.shieldMax : 20; if (B && B.v.crimson_bound) cap = Math.max(cap, Math.round(e.maxHp * B.v.crimson_bound));
    if (cap <= 0 || amt <= 0) return; const before = e.aegis || 0; e.aegis = Math.min(cap, before + amt); e.aegisMax = cap;
    if (e.aegis > before && before <= 0) this._fx({ k: 'shieldUp', e }); if (id) this._proc(id);
  };
  // heal from a boon; past full health it may become a shield (Bloodbound, Consecrated Blood)
  P._boonHeal = function (e, amt, id, look = 'blood') {
    if (!(amt > 0) || e.dead) return; const B = e.B; const room = e.maxHp - e.hp; const over = Math.max(0, amt - room);
    e.hp = Math.min(e.maxHp, e.hp + amt); if (id) this._proc(id);
    if (over > 0 && B) {
      if (B.v.crimson_bound) { this._shield(e, over, 'crimson_bound'); }
      if (B.v.duo_consecrate) { this._shield(e, over * B.v.duo_consecrate, 'duo_consecrate'); }
    }
    if ((e.healFx = (e.healFx || 0) + amt) >= 3) { this._fx({ k: 'heal', e, el: look, amt: e.healFx }); e.healFx = 0; }
  };
  // a pull toward a point for a while (Void Gate, the Great Hush, void foes' rifts on the hero)
  P._pullTo = function (list, x, z, k, h) {
    for (const f of list) {
      if (f.dead || f.boss) continue; const d = Math.hypot(x - f.x, z - f.z); if (d < 0.3) continue;
      const s = Math.min(d, k) * h * 6 / Math.max(1, f.mass || 1); f.kbx += (x - f.x) / d * s * 4; f.kbz += (z - f.z) / d * s * 4;
    }
  };

  // ---------------------------------------------------------------- the hooks
  P._boonMul = function (src, dst, o) {
    const B = src.B; if (!B) return 1; const v = B.v; const s = dst.status; let k = 1;
    if (v.ember_pyre && s.burn) k += v.ember_pyre;
    if (v.rime_bite && (s.chill || s.freeze || s.frost)) k += v.rime_bite * (s.freeze ? 2 : 1);
    if (v.thunder_charge && s.shock) k += v.thunder_charge;
    if (v.blight_necro && s.poison) k += v.blight_necro * (s.poison.stacks || 1);
    const frac = dst.hp / Math.max(1, dst.maxHp);
    if (v.silence_quiet && s.mark && frac < 0.5) k += v.silence_quiet;
    if (v.silence_exec && s.mark && frac < 0.33) k += v.silence_exec;
    if (v.crimson_price && src.hp < src.maxHp * 0.5) k += v.crimson_price;
    if (v.dawn_aegis && src.aegis > 0) k += v.dawn_aegis;
    if (v.silence_crown && dst.boss && frac < 0.3) k += v.silence_crown * 2;
    return k;
  };

  // the veil (Vanish): the next blow after a dash is critical and marks deep
  P._veilCrit = function (src, o) {
    if (!src.B || !(src.buffs && src.buffs.veil > 0) || o.boon || o.chain || o.dotLike) return false;
    delete src.buffs.veil; src.veilHit = true; this._proc('silence_veil'); return true;
  };

  P._boonHit = function (src, dst, real, o) {
    const B = src.B; if (!B) return; const v = B.v;
    if (o.boon || o.chain) { this._leech(src, real, null, o); return; }
    const slot = o.slot || (o.basic ? 'attack' : (o.special ? 'ult' : null));
    const r = () => this.rand(); const alive = () => !dst.dead && dst.hp > 0;
    if (src.veilHit) { src.veilHit = false; this.applyStatus(dst, 'mark', { stacks: 2, max: this._markMax(src), src }); }
    if (slot === 'attack') {
      src.bHits = (src.bHits || 0) + 1;
      if (v.ember_edge && r() < v.ember_edge) { this._el(src, dst, 'fire', real); this._proc('ember_edge'); }
      if (v.rime_edge && r() < v.rime_edge) { this._el(src, dst, 'frost', real); this._proc('rime_edge'); }
      if (v.blight_edge && r() < v.blight_edge) { this._el(src, dst, 'poison', real); this._proc('blight_edge'); }
      if (v.thunder_edge && r() < v.thunder_edge + B.chainBonus) { this._el(src, dst, 'storm', real); this._proc('thunder_edge'); }
      if (v.crimson_edge && r() < v.crimson_edge) { this._el(src, dst, 'blood', real); this._proc('crimson_edge'); }
      if (v.dawn_edge && r() < v.dawn_edge && this._cd(src, 'smite', 0.3)) { this._el(src, dst, 'holy', real); this._proc('dawn_edge'); }
      if (v.silence_edge && r() < v.silence_edge) { this._el(src, dst, 'void', real); this._proc('silence_edge'); }
      if (v.thunder_fork && dst.status.shock) this._proc('thunder_fork');
      if (v.blight_virul && dst.status.poison) this._proc('blight_virul');
      // finishers: the last blow of a combo (heavy) or every fourth shot
      const shooter = src.kit && src.kit.attack.kind === 'shoot';
      const fin = shooter ? (o.proj && (src.bShots = (src.bShots || 0) + 1) % 4 === 0) : !!(o.atk && o.atk.heavy);
      if (fin && v.ember_flash && this._cd(src, 'flash', 0.45)) { this._fx({ k: 'burst', x: dst.x, z: dst.z, el: 'fire', r: 1.9 }); this._blast(src, dst.x, dst.z, 1.9, v.ember_flash, 'fire', { status: { burn: 1 }, el: 'fire' }); this._proc('ember_flash'); }
      if (fin && v.crimson_hemo && dst.status.bleed && alive()) {
        const n = dst.status.bleed.stacks || 1; delete dst.status.bleed; this._fx({ k: 'burst', x: dst.x, z: dst.z, el: 'blood', r: 1.4 });
        this._damage(src, dst, v.crimson_hemo * n, { boon: true, kind: 'hemo', heavy: true }); this._proc('crimson_hemo');
      }
      if (v.rime_shatter && dst.status.freeze && alive()) {
        delete dst.status.freeze; dst.stun = 0; this._fx({ k: 'shatter', x: dst.x, z: dst.z });
        this._blast(src, dst.x, dst.z, 2.1, v.rime_shatter, 'shards', { el: 'frost', onHit: (w, zn, f) => { if (f !== dst) w.applyStatus(f, 'chill', { stacks: 1, at: B.freezeAt, src }); } }); this._proc('rime_shatter');
      }
      if (v.dawn_judge && src.bHits % 5 === 0) { this._smite(src, dst.x, dst.z, v.dawn_judge, { stun: 0.6 }); this._proc('dawn_judge'); }
    } else if (slot === 'skill') {
      if (v.ember_rite && r() < 0.5) { this._el(src, dst, 'fire', real); }
      if (v.rime_rite) { this._el(src, dst, 'frost', real, { stacks: v.rime_rite }); this._proc('rime_rite'); }
      if (v.rime_tomb && alive()) { if (dst.boss) this.applyStatus(dst, 'chill', { stacks: 2, at: 99, src }); else this.applyStatus(dst, 'freeze', { dur: v.rime_tomb, src }); this._proc('rime_tomb'); }
      if (v.silence_rite) { this._el(src, dst, 'void', real, { stacks: v.silence_rite }); this._proc('silence_rite'); }
      if (v.blight_bloom && dst.status.poison && alive()) {
        const p = dst.status.poison; const left = p.dps * (p.stacks || 1) * Math.max(0, p.t) * v.blight_bloom; delete dst.status.poison;
        this._fx({ k: 'burst', x: dst.x, z: dst.z, el: 'poison', r: 1.6 }); this._damage(src, dst, Math.max(4, left), { boon: true, kind: 'bloom' }); this._proc('blight_bloom');
      }
    } else if (slot === 'ult') {
      if (v.crimson_requiem) {
        const cap = src.maxHp * 0.2; const amt = Math.min(src.maxHp * v.crimson_requiem, cap - (src.reqHeal || 0));
        if (amt > 0) { src.reqHeal = (src.reqHeal || 0) + amt; this._boonHeal(src, amt, 'crimson_requiem'); }
        this.applyStatus(dst, 'bleed', { dps: Math.max(3, real * 0.2), max: B.bleedMax }); this.applyStatus(dst, 'bleed', { dps: Math.max(3, real * 0.2), max: B.bleedMax });
      }
    }
    // every blow, whatever slot
    if (slot) {
      if (v.thunder_crown) { this.applyStatus(dst, 'shock', {}); this._proc('thunder_crown'); }
      if (v.dawn_crown && src.aegis > 0 && this._cd(src, 'crownSmite', 0.35)) { this._smite(src, dst.x, dst.z, v.dawn_crown); this._proc('dawn_crown'); }
      // executions (never the great foes)
      if (alive() && !dst.boss) {
        const frac = dst.hp / dst.maxHp;
        if (v.silence_crown && frac < v.silence_crown) { this._unmake(src, dst, 'silence_crown'); }
        else if (v.duo_zero && dst.status.freeze && frac < v.duo_zero) { this._fx({ k: 'shatter', x: dst.x, z: dst.z }); this._unmake(src, dst, 'duo_zero', 'shatter'); }
      }
    }
    if (dst.status.mark && v.silence_exec && dst.hp / dst.maxHp < 0.33) this._proc('silence_exec');
    if (dst.status.mark && v.silence_quiet && dst.hp / dst.maxHp < 0.5) this._proc('silence_quiet');
    if (v.ember_pyre && dst.status.burn) this._proc('ember_pyre');
    if (v.rime_bite && (dst.status.chill || dst.status.freeze)) this._proc('rime_bite');
    if (v.thunder_charge && dst.status.shock) this._proc('thunder_charge');
    if (v.blight_necro && dst.status.poison) this._proc('blight_necro');
    if (v.crimson_price && src.hp < src.maxHp * 0.5) this._proc('crimson_price');
    if (v.dawn_aegis && src.aegis > 0) this._proc('dawn_aegis');
    this._leech(src, real, slot, o);
  };
  P._unmake = function (src, dst, id, look = 'void') {
    if (dst.dead || dst.boss) return; this._fx({ k: 'unmake', x: dst.x, z: dst.z, el: look === 'void' ? 'void' : 'frost' });
    dst.hp = 0; this._proc(id); // _damage's own check sees it and kills
  };
  P._leech = function (src, real, slot, o) {
    const B = src.B; if (!B || !(real > 0)) return; const v = B.v;
    let k = B.leech; if (slot === 'skill' && v.crimson_rite) { k += v.crimson_rite; this._proc('crimson_rite'); }
    if (!k) return; if (v.crimson_thirst) this._proc('crimson_thirst');
    if (v.crimson_price && src.hp < src.maxHp * 0.5) k *= 2;
    if (v.duo_consecrate && src.aegis > 0) k *= 1.25;
    this._boonHeal(src, real * k, null);
  };

  // a blow on the hero (or an ally): the boons that soften or answer it. Returns the damage left.
  P._boonGuard = function (dst, src, real, o) {
    const B = dst.B; const v = B ? B.v : {};
    if (src && src.status) {
      if (src.status.blind) real *= 0.6;
      if (v.blight_wither && src.status.poison) { real *= 1 - v.blight_wither; this._proc('blight_wither'); }
    }
    if (!B) return real;
    real *= B.dmgTaken; if (v.rime_mail) this._proc('rime_mail');
    if (v.rime_mail && src && src.team === 'foe' && !src.dead && (o.melee || o.proj)) this.applyStatus(src, 'chill', { stacks: 2, at: B.freezeAt, src: dst });
    if (v.dawn_sanct && this.zones.some((z) => z.kind === 'sanct' && Math.hypot(dst.x - z.x, dst.z - z.z) < z.r)) { real *= 1 - v.dawn_sanct; this._proc('dawn_sanct'); }
    if (dst.aegis > 0) {
      const ab = Math.min(dst.aegis, real); dst.aegis -= ab; real -= ab; this._fx({ k: 'shieldHit', e: dst });
      if (dst.aegis <= 0) {
        dst.aegis = 0; this._fx({ k: 'shieldBreak', e: dst });
        if (v.dawn_radiance && this._cd(dst, 'radiance', 2.5)) { this._fx({ k: 'burst', x: dst.x, z: dst.z, el: 'holy', r: 3 }); this._blast(dst, dst.x, dst.z, 3, v.dawn_radiance, 'smite', { kb: 6, el: 'holy' }); this._proc('dawn_radiance'); }
        if (v.duo_eclipse) for (const f of this._foesNear(dst.x, dst.z, 4)) { this.applyStatus(f, 'mark', { stacks: 1, max: this._markMax(dst), src: dst }); this._proc('duo_eclipse'); }
      }
    }
    dst.lastHurt = this.t;
    return real;
  };

  P._boonKill = function (hero, e, st) {
    const B = hero.B; if (!B) return; const v = B.v;
    if (v.ember_funeral && st.burn) { this._fx({ k: 'burst', x: e.x, z: e.z, el: 'fire', r: 2.3 }); this._blast(hero, e.x, e.z, 2.3, v.ember_funeral, 'fire', { status: { burn: 1 }, kb: 4, el: 'fire' }); this._proc('ember_funeral'); }
    if (v.blight_contagion && st.poison) { this._blast(hero, e.x, e.z, 2.2, v.blight_contagion * 0.5, 'miasma', { warn: 0, life: 3, tick: 0.5, el: 'poison', onHit: (w, zn, f) => w.applyStatus(f, 'poison', { dps: v.blight_contagion * 0.6, stack: true, max: B.poisonMax }) }); this._proc('blight_contagion'); }
    if (v.thunder_over) { this._fx({ k: 'burst', x: e.x, z: e.z, el: 'storm', r: 2 }); this._chainBolt(hero, e, v.thunder_over, 3); this._proc('thunder_over'); }
    if (v.crimson_motes) { this._fx({ k: 'mote', x: e.x, z: e.z, e: hero }); this._boonHeal(hero, v.crimson_motes, 'crimson_motes'); }
    if (v.rime_crown && st.freeze) { this._fx({ k: 'shatter', x: e.x, z: e.z }); this.addZone({ shape: 'ring', x: e.x, z: e.z, r0: 0.5, r1: 3.4, life: 0.35, dmg: v.rime_crown, kb: 2, kind: 'shards', el: 'frost', boon: true, src: hero, fxOwn: true, onHit: (w, zn, f) => w.applyStatus(f, 'chill', { stacks: 2, at: B.freezeAt, src: hero }) }); this._proc('rime_crown'); }
    if (v.duo_exsang && (st.mark || st.bleed)) { this._fx({ k: 'mote', x: e.x, z: e.z, e: hero }); this._boonHeal(hero, v.duo_exsang, 'duo_exsang'); }
  };

  // a tick of damage over time on a foe
  P._boonDot = function (e, amt, kind) {
    const hero = this.hero; const B = hero && hero.B; if (!B || hero.dead) return amt; const v = B.v; const s = e.status;
    if (v.duo_boil && (kind === 'burn' || kind === 'bleed') && s.burn && s.bleed) { amt *= 1 + v.duo_boil; this._proc('duo_boil'); }
    if (v.duo_blackflame && kind === 'burn' && s.mark) { amt *= 1 + v.duo_blackflame * s.mark.stacks; this._proc('duo_blackflame'); }
    amt = Math.max(1, Math.round(amt));
    if (kind === 'burn') {
      if (v.ember_wildfire && this.rand() < v.ember_wildfire) {
        const near = this._foesNear(e.x, e.z, 2.6, e).filter((f) => !f.status.burn); const f = near[0];
        if (f) { this._fx({ k: 'arc', x0: e.x, z0: e.z, x1: f.x, z1: f.z, el: 'fire' }); this.applyStatus(f, 'burn', { dps: s.burn.dps }); this._proc('ember_wildfire'); }
      }
    } else if (kind === 'poison') {
      if (v.duo_cryotox && this.rand() < v.duo_cryotox) { this.applyStatus(e, 'chill', { stacks: 1, at: B.freezeAt, src: hero }); this._proc('duo_cryotox'); }
      if (v.blight_crown) this._boonHeal(hero, v.blight_crown, 'blight_crown', 'poison');
      if (v.duo_sepsis) this._boonHeal(hero, amt * v.duo_sepsis, 'duo_sepsis');
    } else if (kind === 'bleed') {
      if (v.crimson_crown) { this._boonHeal(hero, v.crimson_crown, 'crimson_crown'); if ((e.status.bleed?.stacks || 0) > 3) this._fx({ k: 'mote', x: e.x, z: e.z, e: hero }); }
    }
    return amt;
  };

  // a status just landed on a foe
  P._onStatus = function (e, kind, o) {
    const src = (o && o.src && o.src.B) ? o.src : this.hero; const B = src && src.B; if (!B) return; const v = B.v;
    if (kind === 'mark' && v.silence_unmake && e.status.mark && e.status.mark.stacks >= 3 && !e.dead) {
      delete e.status.mark; this._fx({ k: 'unmakeBurst', x: e.x, z: e.z, el: 'void', r: 2.2 });
      this._blast(src, e.x, e.z, 2.2, v.silence_unmake, 'voidburst', { warn: 0.18, kb: 1, el: 'void' }); this._proc('silence_unmake');
    }
    if (kind === 'freeze' && v.duo_frostbite) { for (let i = 0; i < v.duo_frostbite; i++) this.applyStatus(e, 'bleed', { dps: 5, max: B.bleedMax }); this._proc('duo_frostbite'); }
  };

  // ---------------------------------------------------------------- dash
  P._boonDashStart = function (e, move) {
    const B = e.B; if (!B) return; const v = B.v;
    e.dashing = { x0: e.x, z0: e.z, lx: e.x, lz: e.z, move: !!move, hit: new Set(), n: 0 };
    if (v.dawn_step && this._cd(e, 'dayStep', 1.2)) this._shield(e, v.dawn_step, 'dawn_step');
    if (v.blight_step) { this._blast(e, e.x, e.z, 1.7, v.blight_step * 0.5, 'miasma', { warn: 0, life: 3, tick: 0.5, el: 'poison', onHit: (w, zn, f) => w.applyStatus(f, 'poison', { dps: v.blight_step * 0.5, stack: true, max: B.poisonMax }) }); this._proc('blight_step'); }
  };
  // while the hero travels on a dash (or a rush, a charge): trails and pass-through cuts
  P._boonDashStep = function (e, h) {
    const B = e.B; const D = e.dashing; if (!B || !D) return; const v = B.v;
    const step = Math.hypot(e.x - D.lx, e.z - D.lz);
    if (step >= 0.7) {
      D.lx = e.x; D.lz = e.z; D.n++;
      if (v.ember_wake) { this._blast(e, e.x, e.z, 0.85, v.ember_wake * 0.4, 'emberwake', { warn: 0, life: 2.2, tick: 0.4, kb: 0.5, poise: 2, el: 'fire', onHit: (w, zn, f) => w.applyStatus(f, 'burn', { dps: v.ember_wake * 0.5 * B.burnMul }) }); this._proc('ember_wake'); }
      if (v.rime_step && D.n % 2 === 1) { this._blast(e, e.x, e.z, 1.1, v.rime_step, 'crystal', { warn: 0.5, el: 'frost', onHit: (w, zn, f) => w.applyStatus(f, 'chill', { stacks: 2, at: B.freezeAt, src: e }) }); this._proc('rime_step'); }
    }
    if (v.crimson_rush || v.silence_shadow) for (const f of this.foes()) {
      if (D.hit.has(f.id) || f.state === 'spawn' || f.hidden || dist(e, f) > f.r + 0.9) continue; D.hit.add(f.id);
      if (v.crimson_rush) { this._damage(e, f, v.crimson_rush, { boon: true, kind: 'rushcut', kb: 1, poise: 8, slot: 'dash' }); this.applyStatus(f, 'bleed', { dps: 5, max: B.bleedMax }); this._fx({ k: 'burst', x: f.x, z: f.z, el: 'blood', r: 0.9 }); this._proc('crimson_rush'); }
      if (v.silence_shadow) { this._damage(e, f, v.silence_shadow, { boon: true, kind: 'voidcut', kb: 1, poise: 10, slot: 'dash' }); this.applyStatus(f, 'mark', { stacks: 1, max: this._markMax(e), src: e }); this._fx({ k: 'burst', x: f.x, z: f.z, el: 'void', r: 0.9 }); this._proc('silence_shadow'); }
    }
  };
  // the move is over: explosions, the bolt line, the veil
  P._boonDashEnd = function (e) {
    const B = e.B; const D = e.dashing; if (!B || !D) return; e.dashing = null; const v = B.v;
    // blinks jump: lay the trail along the line they skipped
    const len = Math.hypot(e.x - D.x0, e.z - D.z0);
    if (len > 1 && D.n === 0 && (v.ember_wake || v.rime_step)) { const n = Math.max(1, Math.floor(len / 0.8)); for (let i = 0; i <= n; i++) { const k = i / n; const sx = e.x, sz = e.z; e.x = D.x0 + (sx - D.x0) * k; e.z = D.z0 + (sz - D.z0) * k; D.lx = e.x - 1; this._boonDashStep(e, 0); e.x = sx; e.z = sz; } }
    if (v.ember_comet && this._cd(e, 'comet', 1.2)) { this._fx({ k: 'burst', x: e.x, z: e.z, el: 'fire', r: 2.3, big: true }); this._blast(e, e.x, e.z, 2.3, v.ember_comet, 'fire', { kb: 6, poise: 25, status: { burn: 1 }, el: 'fire' }); this.emit('shake', { amt: 0.35 }); this._proc('ember_comet'); }
    if (len > 0.8) {
      const face = Math.atan2(e.x - D.x0, e.z - D.z0);
      if (v.thunder_step) { this._fx({ k: 'arc', x0: D.x0, z0: D.z0, x1: e.x, z1: e.z, el: 'storm', ground: true }); this._line(e, D.x0, D.z0, face, len, 1.4, v.thunder_step, 'sline', 'storm'); this._proc('thunder_step'); }
      if (v.thunder_bolt && D.move) { this._fx({ k: 'arc', x0: D.x0, z0: D.z0, x1: e.x, z1: e.z, el: 'storm', ground: true, big: true }); this._line(e, D.x0, D.z0, face, len, 2.0, v.thunder_bolt, 'sline', 'storm', 'skill'); this._proc('thunder_bolt'); }
    }
    if (v.silence_veil) { e.buffs.veil = v.silence_veil; this._fx({ k: 'veil', e }); }
  };
  // a line of hurt from (x, z) along face (zones are circles: a row of them, struck once each)
  P._line = function (src, x, z, face, len, w, dmg, kind, el, slot) {
    const hit = new Set(); const fx = Math.sin(face), fz = Math.cos(face);
    for (const f of this.foes()) {
      if (f.state === 'spawn' || f.hidden) continue; const dx = f.x - x, dz = f.z - z; const al = dx * fx + dz * fz;
      if (al < -f.r || al > len + f.r || Math.abs(dx * fz - dz * fx) > w / 2 + f.r || hit.has(f.id)) continue; hit.add(f.id);
      this._damage(src, f, dmg, { boon: !slot, slot, kind, kb: 1.5, poise: 15, aoe: true }); if (el === 'storm') this._stormHit(src, f, dmg);
    }
    return hit.size;
  };
  P._boonPerfect = function (e) {
    const B = e.B; if (!B) return; const v = B.v;
    if (v.rime_still) { this._fx({ k: 'burst', x: e.x, z: e.z, el: 'frost', r: v.rime_still, big: true }); for (const f of this._foesNear(e.x, e.z, v.rime_still)) this.applyStatus(f, f.boss ? 'chill' : 'freeze', { dur: 1.8, stacks: 2, at: 99, src: e }); this._proc('rime_still'); }
  };

  // ---------------------------------------------------------------- skills
  P._boonSkill = function (e, slot, A, tg, at) {
    const B = e.B; if (!B) return; const v = B.v;
    const px = at ? at.x : (tg && !tg.dead ? tg.x : e.x + Math.sin(e.face) * 3), pz = at ? at.z : (tg && !tg.dead ? tg.z : e.z + Math.cos(e.face) * 3);
    if (v.ember_rite) { this._fx({ k: 'burst', x: px, z: pz, el: 'fire', r: 1.9 }); this._blast(e, px, pz, 1.9, v.ember_rite, 'fire', { warn: 0.15, status: { burn: 1 }, el: 'fire' }); this._proc('ember_rite'); }
    if (v.blight_rite) { this._blast(e, px, pz, 2.1, v.blight_rite * 0.5, 'miasma', { warn: 0.1, life: 4, tick: 0.5, el: 'poison', onHit: (w, zn, f) => w.applyStatus(f, 'poison', { dps: v.blight_rite * 0.5, stack: true, max: B.poisonMax }) }); this._proc('blight_rite'); }
    if (v.thunder_rite) {
      const near = this._foesNear(e.x, e.z, 10).sort((a, b) => dist(e, a) - dist(e, b)).slice(0, 2);
      near.forEach((f, i) => this._skyBolt(e, f.x, f.z, v.thunder_rite, { warn: 0.12 + i * 0.12 })); if (near.length) this._proc('thunder_rite');
    }
    if (v.dawn_rite) this._shield(e, v.dawn_rite, 'dawn_rite');
    if (v.thunder_head) { this.addZone({ shape: 'circle', x: px, z: pz, r: 2.8, warn: 0.3, life: 4, tick: 0.6, dmg: v.thunder_head, kb: 1, poise: 8, kind: 'thunderhead', el: 'storm', boon: true, src: e, fxOwn: true, onHit: (w, zn, f) => { w._fx({ k: 'sky', x: f.x, z: f.z, el: 'storm', small: true }); w._stormHit(e, f, v.thunder_head); } }); this._proc('thunder_head'); }
    if (v.dawn_sanct) { this.addZone({ shape: 'circle', x: e.x, z: e.z, r: 2.8, life: 4, tick: 1, dmg: 6, kb: 0, poise: 4, kind: 'sanct', el: 'holy', boon: true, src: e, fxOwn: true }); this._proc('dawn_sanct'); }
    if (v.silence_gate) { this.addZone({ shape: 'circle', x: px, z: pz, r: 3.2, life: 1.3, dmg: 0, visual: true, kind: 'rift', el: 'void', boon: true, src: e, fxOwn: true, pull: 2.4, closeDmg: v.silence_gate }); this._proc('silence_gate'); }
  };

  // ---------------------------------------------------------------- the ultimate
  P._boonUlt = function (e, phase, h) {
    const B = e.B; if (!B) return; const v = B.v; const D = e.ultDef || {}; const S = this.boonStorms || (this.boonStorms = []);
    if (phase === 'start') {
      e.reqHeal = 0;
      if (v.ember_fall) { S.push({ kind: 'fire', src: e, t: 0, life: (D.dur || 1.5) + 0.8, rate: 0.16, acc: 0, dmg: v.ember_fall }); this._proc('ember_fall'); }
      if (v.thunder_tempest) { S.push({ kind: 'storm', src: e, t: 0, life: (D.dur || 1.5) + 1, rate: 0.2, acc: 0, dmg: v.thunder_tempest }); this._proc('thunder_tempest'); }
      if (v.rime_blizzard) { this.addZone({ shape: 'circle', follow: e, r: 6, life: (D.dur || 1.5) + 3, tick: 0.4, dmg: v.rime_blizzard, kb: 0.5, poise: 6, kind: 'blizzard', el: 'frost', boon: true, src: e, fxOwn: true, special: true, onHit: (w, zn, f) => w.applyStatus(f, 'chill', { stacks: 1, at: B.freezeAt, src: e }) }); this._proc('rime_blizzard'); }
      if (v.blight_pest) { this.addZone({ shape: 'circle', follow: e, r: 4.5, life: 6, tick: 0.5, dmg: v.blight_pest * 0.5, kb: 0, poise: 3, kind: 'plague', el: 'poison', boon: true, src: e, fxOwn: true, special: true, onHit: (w, zn, f) => w.applyStatus(f, 'poison', { dps: v.blight_pest * 0.5, stack: true, max: B.poisonMax }) }); this._proc('blight_pest'); }
    } else if (phase === 'end') {
      if (v.dawn_sunrise) {
        this._fx({ k: 'burst', x: e.x, z: e.z, el: 'holy', r: 9, big: true });
        this._foesNear(e.x, e.z, 9).forEach((f, i) => this._smite(e, f.x, f.z, v.dawn_sunrise, { r: 1.6 }));
        this._shield(e, 999, 'dawn_sunrise');
      }
      if (v.silence_hush) { this.addZone({ shape: 'circle', x: e.x, z: e.z, r: 6, life: 1.4, dmg: 0, visual: true, kind: 'rift', el: 'void', boon: true, src: e, fxOwn: true, pull: 3.2, big: true, closeDmg: 30, unmake: v.silence_hush }); this._proc('silence_hush'); }
    }
  };

  // ---------------------------------------------------------------- once a step
  P._boonWorld = function (h) {
    const S = this.boonStorms;
    if (S && S.length) {
      for (const s of S) {
        s.t += h; s.acc -= h; if (s.t > s.life || !s.src || s.src.dead) { s.dead = true; continue; }
        if (s.acc > 0) continue; s.acc = s.rate;
        const near = this._foesNear(s.src.x, s.src.z, 8); let x, z;
        if (near.length && this.rand() < 0.8) { const f = near[(this.rand() * near.length) | 0]; x = f.x + (this.rand() - 0.5) * 0.8; z = f.z + (this.rand() - 0.5) * 0.8; }
        else { const a = this.rand() * TAU, d = 1.5 + this.rand() * 6; x = s.src.x + Math.sin(a) * d; z = s.src.z + Math.cos(a) * d; }
        if (s.kind === 'fire') { this._fx({ k: 'meteor', x, z, warn: 0.35 }); this._blast(s.src, x, z, 1.5, s.dmg, 'fire', { warn: 0.35, status: { burn: 1 }, el: 'fire', special: true }); }
        else this._skyBolt(s.src, x, z, s.dmg, { warn: 0.08 });
      }
      this.boonStorms = S.filter((s) => !s.dead);
    }
    // rifts pull, then close
    for (const z of this.zones) {
      if (!z.pull) continue; const inside = this._foesNear(z.x, z.z, z.r);
      if (z.t < z.life - 0.05) this._pullTo(inside, z.x, z.z, z.pull, h);
      else if (!z.closed) {
        z.closed = true; this._fx({ k: 'unmakeBurst', x: z.x, z: z.z, el: 'void', r: z.r * 0.7, big: z.big });
        for (const f of inside) {
          if (z.unmake && !f.boss && f.hp / f.maxHp < z.unmake) { this._fx({ k: 'unmake', x: f.x, z: f.z, el: 'void' }); this._damage(z.src || this.hero, f, f.hp + 1, { boon: true, kind: 'void' }); continue; }
          this._damage(z.src || this.hero, f, z.closeDmg || 10, { boon: true, kind: 'void', aoe: true, kb: 3 });
          if (z.src && z.src.B) this.applyStatus(f, 'mark', { stacks: 1, max: this._markMax(z.src), src: z.src });
        }
      }
    }
  };

  // ---------------------------------------------------------------- the hero, every step
  P._boonTick = function (e, h) {
    const B = e.B; const v = B.v; if (e.dead) return;
    e.aegisMax = B.shieldMax;
    // the halo regrows after a while unhurt (sooner with the Crown of Dawn)
    if (v.dawn_halo && this.t - (e.lastHurt ?? -99) > (v.dawn_crown ? 3 : 4)) { if ((e.aegis || 0) < v.dawn_halo) { const before = e.aegis || 0; this._shield(e, Math.min(v.dawn_halo - before, v.dawn_halo * h * (v.dawn_crown ? 1.5 : 1)), null); if (e.aegis > before && this._cd(e, 'halo', 1)) this._proc('dawn_halo'); } }
    if ((e.crownT = (e.crownT || 0) - h) > 0) return; e.crownT = 0.5;
    if (v.ember_crown) for (const f of this._foesNear(e.x, e.z, 2.6)) { this.applyStatus(f, 'burn', { dps: v.ember_crown * B.burnMul }); this._proc('ember_crown'); }
    if (v.rime_crown) for (const f of this._foesNear(e.x, e.z, 3.2)) this.applyStatus(f, 'frost', { dur: 0.8 });
    if (v.blight_crown) for (const f of this._foesNear(e.x, e.z, 2.8)) this.applyStatus(f, 'poison', { dps: 4, stack: true, max: B.poisonMax });
    if (v.thunder_crown && (e.stormT = (e.stormT || 0) + 0.5) >= 1.0) {
      const near = this._foesNear(e.x, e.z, 7); if (near.length) { e.stormT = 0; const f = near[(this.rand() * near.length) | 0]; this._skyBolt(e, f.x, f.z, v.thunder_crown); }
    }
  };
}
