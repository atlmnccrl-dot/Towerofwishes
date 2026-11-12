// Bannerborn — what the dead build. Enemy defences that stand where the horde holds ground (a watchtower, a mortar,
// a hex obelisk, a brazier, a cage), each with its own attack and effects, taking its element from the land it
// stands in; the art made for them and for the far marches (drawn here, pixel by pixel, into an atlas of its own);
// and the scatter of that art over a land's maps. Loaded after battle.js; pure logic first (it runs in Node), art last.
(function () {
  const BB = (typeof window !== 'undefined' ? window : globalThis).BB, Battle = BB.Battle;
  const hyp = Math.hypot, TAU = Math.PI * 2;

  // ---------------------------------------------------------------- the defences
  // All are turrets to the engine (they never move, cannot be staggered, are not counted as the wave), and all must
  // fall before a field is won. barH: where the health bar sits; stone: how it breaks.
  Object.assign(BB.FOES, {
    watchtower: { name: 'Bone Watchtower', art: null, hp: 230, atk: 8, def: 5, spd: 0, range: 6.6, aspd: 0.8, xp: 16, gold: 7, ranged: true, turret: true, struct: 'tower', r: 0.55, barH: 96 },
    mortar: { name: 'Grave Mortar', art: null, hp: 190, atk: 19, def: 4, spd: 0, range: 9.5, aspd: 0.19, xp: 18, gold: 8, ranged: true, turret: true, struct: 'mortar', r: 0.5, barH: 44 },
    obelisk: { name: 'Hex Obelisk', art: null, hp: 280, atk: 0, def: 7, spd: 0, range: 4.6, aspd: 0.22, xp: 20, gold: 9, turret: true, struct: 'obelisk', r: 0.45, barH: 82, stone: true },
    brazier: { name: 'Cinder Brazier', art: null, hp: 210, atk: 11, def: 5, spd: 0, range: 7.2, aspd: 0.16, xp: 16, gold: 7, ranged: true, turret: true, struct: 'brazier', r: 0.55, barH: 62, stone: true },
    cage: { name: 'Bone Cage', art: null, hp: 220, atk: 0, def: 4, spd: 0, range: 0, aspd: 0.13, xp: 16, gold: 7, turret: true, struct: 'cage', r: 0.45, barH: 52 },
    nest: { name: 'Grave Nest', art: null, hp: 300, atk: 0, def: 5, spd: 0, range: 0, aspd: 0.12, xp: 22, gold: 10, turret: true, struct: 'nest', r: 0.6, barH: 40 },
    ballista: { name: 'Bone Ballista', art: null, hp: 210, atk: 24, def: 4, spd: 0, range: 10, aspd: 0.26, xp: 20, gold: 9, ranged: true, turret: true, struct: 'ballista', r: 0.5, barH: 50 },
  });
  // what a land lends its defences: the touch their blasts carry, and their light
  const LAND = {
    none: { col: '255,120,40', hit: { burn: true }, brazier: 'Cinder Brazier' },
    frost: { col: '120,200,255', hit: { slow: true }, brazier: 'Rime Brazier' },
    ash: { col: '255,90,30', hit: { burn: true }, brazier: 'Cinder Brazier' },
    mire: { col: '110,230,120', hit: { venom: true }, brazier: 'Bog Censer', gas: true },
    blight: { col: '200,140,255', hit: { drain: true }, brazier: 'Blight Censer' },
  };
  const landOf = (sc) => LAND[sc.map.skin] || LAND.none;
  BB.structLand = landOf;

  // Which defences a stage has. A stage may name its own (`defs`); otherwise the chapter decides: none on the first
  // road, then each land's own pair, on the stages where the horde holds ground (not sieges of your ward, not duels).
  const BY_CHAPTER = { 2: [['watchtower'], ['watchtower', 'mortar']], 3: [['mortar'], ['watchtower', 'mortar']], 4: [['obelisk', 'cage'], ['cage', 'obelisk']],
    5: [['brazier', 'watchtower'], ['watchtower', 'brazier']], 6: [['mortar', 'brazier'], ['brazier', 'mortar']], 7: [['cage', 'brazier'], ['brazier', 'cage']], 8: [['obelisk', 'mortar'], ['obelisk', 'cage']] };
  BB.defencesFor = function (M, teamN) {
    if (M.defs) return M.defs.slice();
    if (!M || !/^(rout|gates|boss)$/.test(M.type) || !BY_CHAPTER[M.chapter]) return [];
    const n = +String(M.code || '').split('-')[1] || 0; if (n < 2) return []; // the first stage of a land shows the land, not its works
    if (M.type === 'boss' && (teamN || 5) <= 2) return []; // one or two heroes have the lord of the land to deal with
    const pair = BY_CHAPTER[M.chapter][n % 2];
    return pair.slice(0, M.type === 'boss' || (teamN || 5) <= 2 ? 1 : 2);
  };

  Battle.prototype.placeDefences = function () {
    const M = this.mission, m = this.map; if (!M || this.peaceful) return;
    const list = BB.defencesFor(M, this.teamN); if (!list.length) return;
    const from = m.heroSpawn, guard = M.type === 'gates' && this.obj.gates ? this.obj.gates.map((g) => ({ x: g.x, y: g.y })) : M.type === 'boss' ? [m.bossSpot] : m.foeSpawns;
    const L = landOf(this), added = [];
    list.forEach((kind, i) => {
      const a = guard[i % guard.length], dx = from.x - a.x, dy = from.y - a.y, d = hyp(dx, dy) || 1, ux = dx / d, uy = dy / d, flank = (i % 2 ? 1 : -1) * (1.7 + (i >> 1) * 0.8);
      // each stands forward of what it guards, toward the heroes, where the fight will be: a tower farthest out, a mortar well back
      const out = Math.min(d * { watchtower: 0.36, brazier: 0.32, obelisk: 0.28, cage: 0.24, nest: 0.2, mortar: 0.12, ballista: 0.1 }[kind], { watchtower: 6.5, brazier: 6, obelisk: 5, cage: 4.5, nest: 4, mortar: 2.4, ballista: 2.2 }[kind] * (M.type === 'boss' ? 0.5 : 1));
      const e = this.spawnFoe(kind, a.x + ux * out - uy * flank, a.y + uy * out + ux * flank, {});
      e.cd = 2.5 + i * 1.3; e.phase = this.r() * TAU; if (kind === 'brazier') e.name = L.brazier; if (kind === 'cage') e.budget = 3;
      // its works around it: stakes toward the heroes, the banner of the dead behind
      for (const [nm, f, s] of [['Stakes', 1.25, -0.7], ['Stakes', 1.25, 0.7], ['Dead Banner', -0.9, 0.5]]) added.push(m.add(nm, e.x + ux * f - uy * s, e.y + uy * f + ux * s, { biome: 'craft', r: 0.04 }));
    });
    for (const p of added) { const q = BB.iso(p.x, p.y); p.depth = p.x + p.y; p.sx = q.x; p.sy = q.y; }
    m.props.sort((a, b) => (a.depth === undefined ? a.x + a.y : a.depth) - (b.depth === undefined ? b.x + b.y : b.depth));
    if (BB.rebuildGrid) BB.rebuildGrid(m);
  };

  // a blast on the ground: a ring of warning, then the land's own harm to whoever is still standing in it
  Battle.prototype.structBlast = function (src, x, y, rad, delay, mult) {
    const self = this, L = landOf(this);
    this.tele.push({ kind: 'circle', x, y, rad, t: 0, dur: delay, col: L.col, onEnd() {
      self.fx.push({ key: '_ring', x, y, t: 0, fps: 1, n: 0.8, rad, ring: true });
      if (L.gas) { self.clouds.push({ x, y, rad, t: 0, dur: 3.5, side: 'hero', dps: src.atk * 0.5, key: 'gas' }); self.addFx('gas', x, y, { sc: rad * 0.55, fps: 12 }); }
      else self.addFx('aoe', x, y, { sc: rad * 0.42, add: true, hue: L === LAND.frost ? 200 : L === LAND.blight ? 275 : 18 });
      for (const o of self.inRadius(x, y, rad, 'hero')) if (!o.ward) self.hit(src, o, mult, Object.assign({ aoe: true }, L.hit));
      if (self.ward && !self.ward.dead && hyp(self.ward.x - x, self.ward.y - y) < rad + 0.7) self.hit(src, self.ward, mult, { aoe: true });
      BB.sfx && BB.sfx('flame');
    } });
  };

  Battle.prototype.structAI = function (e, t, d, dt) {
    const k = e.F.struct, heroes = this.heroesAlive().filter((h) => !h.ward && !h.hidden);
    if (e.fireT > 0) e.fireT -= dt; if (e.pulseT > 0) e.pulseT -= dt; if (e.shell) { e.shell.t += dt; if (e.shell.t >= e.shell.dur) e.shell = null; }
    if (e.cd > 0) return;
    if (k === 'tower') { // quick arrows from the platform at whoever is nearest
      if (d < e.range) { e.cd = 1 / e.aspd; e.fireT = 0.18; this.shoot(e, t.x, t.y, 'arrow', 1, { z: 2.5 }); }
    } else if (k === 'mortar') { // a slow shell at the thickest knot of heroes: its shadow is marked, there is time to step out
      const in_ = heroes.filter((h) => hyp(h.x - e.x, h.y - e.y) < e.range); if (!in_.length) return;
      let best = in_[0], bn = -1; for (const h of in_) { const n = in_.filter((o) => hyp(o.x - h.x, o.y - h.y) < 1.7).length + (h.ranged ? 0.5 : 0); if (n > bn) { bn = n; best = h; } }
      e.cd = 1 / e.aspd; e.fireT = 0.3; e.shell = { x: best.x, y: best.y, t: 0, dur: 1.35 };
      this.structBlast(e, best.x, best.y, 1.45, 1.35, 1.25); this.addFx('x_stone', e.x, e.y - 0.3, { sc: 0.35 }); BB.sfx && BB.sfx('mortar');
    } else if (k === 'brazier') { // spits the land's fire: a patch under each of up to three heroes
      const in_ = heroes.filter((h) => hyp(h.x - e.x, h.y - e.y) < e.range); if (!in_.length) return;
      e.cd = 1 / e.aspd; e.fireT = 0.5; BB.sfx && BB.sfx('brazier');
      in_.sort(() => this.r() - 0.5).slice(0, 3).forEach((h, i) => this.later(i * 0.22, () => { if (!e.dead) this.structBlast(e, h.x + this.r.range(-0.3, 0.3), h.y + this.r.range(-0.3, 0.3), 1.15, 1.05, 0.9); }));
    } else if (k === 'obelisk') { // a pulse: every one of the dead near it is mended and hits harder for a while
      const near = this.foesAlive().filter((f) => f !== e && !f.gate && !f.turret && hyp(f.x - e.x, f.y - e.y) < e.range); if (!near.length) return;
      e.cd = 1 / e.aspd; e.pulseT = 0.9; e.links = near.slice(0, 8);
      for (const f of near) { this.heal(e, f, f.maxhp * 0.07); f.buffs.hex = 3.5; }
      BB.sfx && BB.sfx('hex');
    } else if (k === 'cage') { // rattles, then lets one more out, until it is empty or broken
      if (!(e.budget > 0) || this.foesAlive().length >= BB.teamK('cap', this.teamN) + 2) { e.cd = 1.5; return; }
      e.cd = 1 / e.aspd / Math.sqrt(this.waveK || 1) * 0.9; e.budget--; e.fireT = 0.7; BB.sfx && BB.sfx('cage');
      this.later(0.6, () => { if (!e.dead) { this.spawnFoe(this.r.pick(this.obj.pool), e.x + this.r.range(0.5, 1), e.y + this.r.range(0.5, 1), { rise: true }); this.addFx('bones', e.x, e.y, { sc: 0.6 }); } });
    } else if (k === 'nest') { // never empty: one more of the dead climbs out, for as long as it stands
      if (this.foesAlive().length >= BB.teamK('cap', this.teamN) + 2) { e.cd = 1.5; return; }
      e.cd = 1 / e.aspd / Math.sqrt(this.waveK || 1); e.fireT = 0.8; BB.sfx && BB.sfx('cage');
      this.later(0.6, () => { if (!e.dead) { this.spawnFoe(this.r.pick(this.obj.pool), e.x + this.r.range(0.6, 1.1), e.y + this.r.range(0.6, 1.1), { rise: true }); this.addFx('bones', e.x, e.y, { sc: 0.8 }); } });
    } else if (k === 'ballista') { // one heavy bolt at whoever stands farthest back
      let far = null, fd = -1; for (const h of heroes) { const q = hyp(h.x - e.x, h.y - e.y); if (q < e.range && q > fd) { fd = q; far = h; } }
      if (!far) return; e.cd = 1 / e.aspd; e.fireT = 0.3; this.shoot(e, far.x, far.y, 'arrow', 1, { z: 1.6 }); BB.sfx && BB.sfx('mortar');
    }
  };

  // ---------------------------------------------------------------- drawing
  const PROP = { tower: ['vale', 'Misc B55_S', 1], mortar: ['vale', 'Misc C3_S', 1.15], obelisk: ['craft', 'Hex Obelisk', 1], brazier: ['vale', 'Misc C8_S', 0.9], nest: ['craft', 'Grave Nest', 1.15], ballista: ['craft', 'Bone Ballista', 1.2], cage: ['vale', 'Misc C13_S', 1.1] };
  Battle.prototype.drawStruct = function (ctx, e, s) {
    const k = e.F.struct, L = landOf(this), P = PROP[k], t = this.time + (e.phase || 0), skin = this.map.skin;
    if (e.dead) { if (e.deadT < 6) BB.drawEnv(ctx, 'craft', 'Rubble', s.x, s.y, 1, Math.min(1, 6 - e.deadT)); return; }
    const fire = Math.max(0, e.fireT || 0), biome = P[0] === 'vale' && skin && BB.A.env[skin] ? skin : P[0];
    let ox = 0, sq = 1;
    if (k === 'cage' && fire > 0) ox = Math.sin(this.time * 60) * 1.6;           // rattling
    if (k === 'mortar' && fire > 0) sq = 1 - fire * 0.5;                          // the recoil
    ctx.save(); ctx.translate(s.x + ox, s.y); ctx.scale(1, sq);
    BB.drawEnv(ctx, biome, P[1], 0, 0, P[2]);
    if (e.flash > 0) { ctx.globalCompositeOperation = 'lighter'; BB.drawEnv(ctx, biome, P[1], 0, 0, P[2], Math.min(1, e.flash * 3)); ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore();
    ctx.globalCompositeOperation = 'lighter';
    if (k === 'tower') { // the watch-fire of the dead on the platform; it flares at each shot
      BB.drawGlow(ctx, '170,90,255', s.x, s.y - 74, 16 + fire * 60, 13 + fire * 50, 0.5 + fire * 2);
      ctx.globalCompositeOperation = 'source-over'; BB.drawFx(ctx, 'torch', Math.floor(t * 12) % (BB.fxLen('torch') || 1), s.x, s.y - 66, 0.5, { hue: 270 });
    } else if (k === 'mortar') {
      BB.drawGlow(ctx, L.col, s.x + 6, s.y - 20, 10 + fire * 70, 8 + fire * 60, 0.35 + fire * 2.5);
      const sh = e.shell; if (sh) { // the shell: up out of the mouth and down onto its mark
        const q = Math.min(1, sh.t / sh.dur), a = BB.iso(e.x, e.y), b = BB.iso(sh.x, sh.y), px = a.x + (b.x - a.x) * q, py = a.y - 18 + (b.y - a.y + 18) * q - Math.sin(q * Math.PI) * 96;
        BB.drawGlow(ctx, L.col, px, py, 12, 12, 0.9); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#1a1414'; ctx.beginPath(); ctx.arc(px, py, 2.8, 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = 'lighter'; for (let i = 1; i < 5; i++) { const q2 = Math.max(0, q - i * 0.035), tx = a.x + (b.x - a.x) * q2, ty = a.y - 18 + (b.y - a.y + 18) * q2 - Math.sin(q2 * Math.PI) * 96; BB.drawGlow(ctx, L.col, tx, ty, 7 - i, 7 - i, 0.45 - i * 0.08); }
      }
    } else if (k === 'brazier') { // the bowl burns in the land's colour and roars before it spits
      const n = BB.fxLen('fire') || 1; ctx.globalCompositeOperation = 'source-over';
      BB.drawFx(ctx, 'fire', Math.floor(t * 14) % n, s.x, s.y - 30, 0.55 + fire * 0.5, { hue: L === LAND.frost ? 200 : L === LAND.mire ? 110 : L === LAND.blight ? 275 : undefined });
      ctx.globalCompositeOperation = 'lighter'; BB.drawGlow(ctx, L.col, s.x, s.y - 36, 26 + fire * 40, 22 + fire * 30, 0.5 + fire);
    } else if (k === 'obelisk') { // the rune breathes; shards turn about it; a pulse runs out along threads to the dead it mends
      const br = 0.55 + Math.sin(t * 2.4) * 0.25 + (e.pulseT > 0 ? e.pulseT : 0);
      BB.drawEnv(ctx, 'craft', 'Hex Rune', s.x, s.y, 1, Math.min(1, br)); BB.drawGlow(ctx, L.col, s.x, s.y - 44, 22, 26, 0.3 * br);
      ctx.fillStyle = 'rgba(' + L.col + ',0.9)'; for (let i = 0; i < 3; i++) { const a = t * 1.3 + i * TAU / 3, px = s.x + Math.cos(a) * 17, py = s.y - 40 + Math.sin(a) * 6 + Math.sin(t * 2 + i) * 3; ctx.fillRect(Math.round(px) - 1, Math.round(py) - 2, 2, 4); }
      if (e.pulseT > 0) {
        const q = 1 - e.pulseT / 0.9, R = e.range * BB.TW * 0.5 * q;
        ctx.strokeStyle = 'rgba(' + L.col + ',' + (1 - q) * 0.9 + ')'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(s.x, s.y, R, R * 0.5, 0, 0, TAU); ctx.stroke();
        ctx.lineWidth = 1.2; for (const f of e.links || []) { if (f.dead) continue; const b = BB.iso(f.x, f.y); ctx.strokeStyle = 'rgba(' + L.col + ',' + (1 - q) * 0.7 + ')'; ctx.beginPath(); ctx.moveTo(s.x, s.y - 44); ctx.quadraticCurveTo((s.x + b.x) / 2, Math.min(s.y, b.y) - 50, b.x, b.y - 20); ctx.stroke(); }
      }
    } else if (k === 'cage') { // eyes in the dark between the bars while something is still inside
      if (e.budget > 0) { const a = 0.5 + Math.sin(t * 3) * 0.3; BB.drawGlow(ctx, '255,60,60', s.x - 3, s.y - 24, 3, 3, a); BB.drawGlow(ctx, '255,60,60', s.x + 4, s.y - 24, 3, 3, a); }
    }
    ctx.globalCompositeOperation = 'source-over';
  };
  // the dead an obelisk has touched: its colour at their feet while it lasts (and they hit harder: see hit in battle.js)
  Battle.prototype.drawHexed = function (ctx, e, s) { if (!(e.buffs.hex > 0)) return; ctx.globalCompositeOperation = 'lighter'; BB.drawGlow(ctx, landOf(this).col, s.x, s.y - 2, 12, 6, 0.35 + Math.sin(this.time * 6) * 0.1); ctx.globalCompositeOperation = 'source-over'; };

  // ---------------------------------------------------------------- the lords of the far marches
  // Each has one move nobody else has, and wears his land: Hroald walks a glacier out of the ground, Maelis calls
  // stones of fire down, Old Morwen makes the fen bloom under you, Aurelian takes a tithe of every hero at once.
  // `deco`: a thing standing on the field for a while (ice, a vent, a glowcap), drawn from the crafted art.
  Battle.prototype.addDeco = function (name, x, y, life, o) {
    const e = Object.assign({ id: BB.uid('d'), side: 'none', prop: true, deco: name, kind: 'deco', F: {}, x, y, r: 0, hp: 1, maxhp: 1, def: 0, buffs: {}, born: this.time, life, sc: 1, z: 0, dir: 0, state: 'idle' }, o || {});
    this.ents.push(e); this.later(life, () => { this.ents = this.ents.filter((q) => q !== e); });
    return e;
  };
  Battle.prototype.drawDeco = function (ctx, e, s) {
    const age = this.time - e.born, k = Math.min(1, age / 0.25), out = Math.min(1, Math.max(0, (e.life - age) / 0.5));
    ctx.save(); ctx.translate(s.x, s.y); ctx.scale(e.sc, e.sc * (0.3 + 0.7 * k)); BB.drawEnv(ctx, 'craft', e.deco, 0, 0, 1, out); ctx.restore(); // it rises out of the ground, and fades
    if (e.glow) { ctx.globalCompositeOperation = 'lighter'; BB.drawGlow(ctx, e.glow, s.x, s.y - 12, 26, 18, 0.45 * out * (e.swell ? 0.6 + 0.4 * Math.sin(age * 9) : 1)); ctx.globalCompositeOperation = 'source-over'; }
  };
  Battle.prototype.farMove = function (e, t, mv) {
    const self = this, cast = (dur, clip) => { e.state = 'attack'; e.lock = dur; e.atkDur = dur; e.hitAt = 99; e.hitDone = true; this.face(e, t.x, t.y); this.setClip(e, BB.hasClip(e.art, clip) ? clip : 'Attack1', true); if (BB.foeVoice) BB.foeVoice(e, 'cast'); };
    const heroes = this.heroesAlive().filter((h) => !h.ward);
    if (mv === 'glacier') { // a wall of ice walks out from him along a line: it bites, slows, and stands for a while
      const dx = t.x - e.x, dy = t.y - e.y, d = hyp(dx, dy) || 1, ux = dx / d, uy = dy / d, len = Math.min(9, d + 3), x2 = e.x + ux * len, y2 = e.y + uy * len;
      cast(1.25, 'Attack4');
      this.tele.push({ kind: 'line', x: e.x, y: e.y, x2, y2, w: 1.5, t: 0, dur: 1.05, col: '120,200,255', onEnd() {
        for (let i = 1.2, n = 0; i < len; i += 1.15, n++) self.later(n * 0.06, () => { const x = e.x + ux * i, y = e.y + uy * i; self.addDeco('Ice Shards', x + self.r.range(-0.2, 0.2), y + self.r.range(-0.2, 0.2), 4.5, { sc: 0.9 + self.r() * 0.4, glow: '120,200,255' }); self.addFx('x_stone', x, y - 0.1, { sc: 0.4 }); });
        for (const h of heroes) { const px = h.x - e.x, py = h.y - e.y, along = px * ux + py * uy, off = Math.abs(px * uy - py * ux); if (along > 0 && along < len && off < 0.95 + (h.r || 0.3)) { self.hit(e, h, 1.45, { aoe: true, slow: true, heavy: true }); h.buffs.slow = 3.5; } }
        self.shake = 0.5; BB.sfx && BB.sfx('ice');
      } });
      return true;
    }
    if (mv === 'meteors') { // five stones of fire, one after another, each on a hero; where one lands the ground keeps burning
      cast(1.6, 'Special1');
      const marks = []; for (let i = 0; i < 5 && heroes.length; i++) marks.push(heroes[i % heroes.length]);
      marks.forEach((h, i) => this.later(i * 0.28, () => {
        if (e.dead) return; const x = h.x + self.r.range(-0.5, 0.5), y = h.y + self.r.range(-0.5, 0.5), rad = 1.25;
        (e.falls = e.falls || []).push({ x, y, t0: self.time, dur: 1.15 });
        self.tele.push({ kind: 'circle', x, y, rad, t: 0, dur: 1.15, col: '255,90,30', onEnd() {
          self.fx.push({ key: '_ring', x, y, t: 0, fps: 1, n: 0.8, rad, ring: true }); self.addFx('aoe', x, y, { sc: 0.5, add: true, hue: 18 });
          for (const o of self.inRadius(x, y, rad, 'hero')) if (!o.ward) self.hit(e, o, 1.05, { aoe: true, burn: true });
          self.addDeco('Lava Vent', x, y, 5, { glow: '255,110,40', swell: true }); self.clouds.push({ x, y, rad: 0.95, t: 0, dur: 5, side: 'hero', dps: e.atk * 0.22, key: 'none' });
          self.shake = Math.max(self.shake || 0, 0.35); BB.sfx && BB.sfx('meteor');
        } });
      }));
      return true;
    }
    if (mv === 'bloom') { // the fen blooms: caps push up by the heroes, swell, and burst into her poison
      cast(1.2, 'Special1');
      const spots = heroes.slice().sort(() => this.r() - 0.5).slice(0, 4);
      spots.forEach((h, i) => { const a = this.r() * TAU, x = h.x + Math.cos(a) * 0.9, y = h.y + Math.sin(a) * 0.9;
        this.later(i * 0.15, () => { if (e.dead) return; self.addDeco('Glowcaps', x, y, 2.3, { glow: '70,230,190', swell: true });
          self.tele.push({ kind: 'circle', x, y, rad: 1.6, t: 0, dur: 2.2, col: '110,230,120', onEnd() { self.clouds.push({ x, y, rad: 1.6, t: 0, dur: 4, side: 'hero', dps: e.atk * 0.3, key: 'gas' }); self.addFx('gas', x, y, { sc: 0.9, fps: 12 }); for (const o of self.inRadius(x, y, 1.6, 'hero')) if (!o.ward) self.hit(e, o, 0.5, { aoe: true, venom: true }); BB.sfx && BB.sfx('flame'); } }); }); });
      return true;
    }
    if (mv === 'tithe') { // a thread to every hero in reach: for three seconds each pays him in blood, and he is the better for it
      cast(1.0, 'Special1'); e.tithe = { t: 0, dur: 3, next: 0.5, who: heroes.filter((h) => hyp(h.x - e.x, h.y - e.y) < 8) };
      this.addFx('buff9', e.x, e.y, { sc: 1.2, add: true, hue: 275 }); BB.sfx && BB.sfx('hex');
      return true;
    }
    return false;
  };
  // what a lord's standing moves do between casts (called each frame from the boss's own turn)
  Battle.prototype.farTick = function (e, dt) {
    const T = e.tithe; if (!T) return;
    T.t += dt; if (T.t >= T.dur || e.dead) { e.tithe = null; return; }
    if (T.t >= T.next) { T.next += 0.5; for (const h of T.who) if (!h.dead && hyp(h.x - e.x, h.y - e.y) < 9) { const dmg = this.hit(e, h, 0.2, { aoe: true }); if (dmg > 0) this.heal(e, e, dmg * 0.6); } }
  };
  const LORD = { frost: '120,200,255', ash: '255,110,40', mire: '90,230,150', blight: '200,140,255' };
  // how a lord wears his land: light at his feet and something turning about him (`front`: drawn over him, or under)
  Battle.prototype.drawLord = function (ctx, e, s, y, front) {
    const k = e.F.lord, col = LORD[k], t = this.time, sc = e.sc || 1; if (!col) return;
    ctx.globalCompositeOperation = 'lighter';
    if (!front) {
      BB.drawGlow(ctx, col, s.x, s.y - 2, 34 * sc, 16 * sc, 0.4 + Math.sin(t * 2) * 0.08);
      ctx.strokeStyle = 'rgba(' + col + ',0.5)'; ctx.lineWidth = 1.2; ctx.setLineDash([5, 6]); ctx.lineDashOffset = -t * 14; ctx.beginPath(); ctx.ellipse(s.x, s.y, 24 * sc, 12 * sc, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    }
    // a crown of the land turning about his head: splinters of ice, embers, spores, shards of the hollow
    const n = k === 'ash' ? 7 : 5, hy = y - 40 * sc;
    for (let i = 0; i < n; i++) {
      const a = t * (k === 'mire' ? 0.7 : 1.3) + i * TAU / n, behind = Math.sin(a) < 0; if (behind === front) continue;
      const px = s.x + Math.cos(a) * 15 * sc, py = hy + Math.sin(a) * 5 * sc + Math.sin(t * 2.2 + i) * 2;
      ctx.fillStyle = 'rgba(' + col + ',0.95)';
      if (k === 'frost' || k === 'blight') ctx.fillRect(Math.round(px) - 1, Math.round(py) - 3, 2, 6); else { ctx.beginPath(); ctx.arc(px, py, k === 'ash' ? 1.6 : 2, 0, TAU); ctx.fill(); }
      BB.drawGlow(ctx, col, px, py, 6, 6, 0.5);
    }
    if (front) {
      for (const f of e.falls || []) { const q = (t - f.t0) / f.dur; if (q >= 1) continue; const b = BB.iso(f.x, f.y), px = b.x + (1 - q) * 70, py = b.y - (1 - q) * 300; BB.drawGlow(ctx, '255,150,60', px, py, 16, 16, 0.9); for (let i = 1; i < 5; i++) BB.drawGlow(ctx, '255,90,30', px + i * 5, py - i * 21, 9 - i, 9 - i, 0.5 - i * 0.09); }
      if (e.falls) e.falls = e.falls.filter((f) => t - f.t0 < f.dur);
      const T = e.tithe; if (T) { const a = Math.min(1, T.t * 3) * Math.min(1, (T.dur - T.t) * 3); ctx.lineWidth = 1.6;
        for (const h of T.who) { if (h.dead) continue; const b = BB.iso(h.x, h.y), mx = (s.x + b.x) / 2, my = Math.min(y, b.y) - 60, q = (t * 1.6) % 1; ctx.strokeStyle = 'rgba(' + col + ',' + 0.75 * a + ')'; ctx.beginPath(); ctx.moveTo(b.x, b.y - 22); ctx.quadraticCurveTo(mx, my, s.x, y - 30 * sc); ctx.stroke();
          const u = 1 - q, bx = u * u * b.x + 2 * u * q * mx + q * q * s.x, by = u * u * (b.y - 22) + 2 * u * q * my + q * q * (y - 30 * sc); BB.drawGlow(ctx, col, bx, by, 7, 7, 0.9 * a); } }
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  // ---------------------------------------------------------------- the far marches' own growth, scattered over their maps
  const DECOR = { frost: ['Ice Shards', 8, '120,200,255', 1.4], ash: ['Lava Vent', 6, '255,110,40', 1.9], mire: ['Glowcaps', 8, '70,230,190', 1.6], blight: ['Blight Pod', 7, '190,130,255', 1.6] };
  BB.landDecor = function (m) {
    const D = DECOR[m.skin]; if (!D || /camp|title/.test(m.layout || '')) return;
    const r = BB.rng((m.seed || 1) * 13 + 777), keep = [m.heroSpawn, m.bossSpot, m.wardSpot].concat(m.foeSpawns || [], m.gateSpots || []).filter(Boolean);
    for (let i = 0, n = 0; i < D[1] * 6 && n < D[1]; i++) {
      const x = 3 + r() * (m.w - 6), y = 3 + r() * (m.h - 6);
      if (keep.some((k) => hyp(k.x - x, k.y - y) < 3) || !m.free(x, y, 0.8)) continue;
      m.add(D[0], x, y, { biome: 'craft', r: 0.28 }); m.lights.push({ x, y, rad: D[3], col: D[2] }); n++;
      if (m.skin === 'ash') m.anim('fire2', x + 0.02, y + 0.02, { sc: 0.3, fps: 10, ground: true });
    }
  };

  // ---------------------------------------------------------------- the art (browser only)
  if (typeof document === 'undefined' || !BB.A) return;
  // Each piece is drawn small on its own canvas with hard edges, then packed into one atlas. Frames are
  // [x, y, w, h, ox, oy] like the other atlases: (ox, oy) is where the picture's corner sits from the foot of the thing.
  function piece(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    draw(g, w, h);
    const d = g.getImageData(0, 0, w, h), p = d.data; for (let i = 3; i < p.length; i += 4) p[i] = p[i] > 110 ? 255 : 0; g.putImageData(d, 0, 0); // hard edges: pixels, not blur
    return c;
  }
  const poly = (g, pts, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); };
  const line = (g, x0, y0, x1, y1, col, w) => { g.strokeStyle = col; g.lineWidth = w || 1; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
  const blob = (g, x, y, rx, ry, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); };
  const shadow = (g, x, y, rx, ry) => blob(g, x, y, rx, ry, 'rgba(0,0,0,0.5)');
  const rnd = BB.rng(4242);
  const speck = (g, w, h, col, n) => { g.fillStyle = col; for (let i = 0; i < n; i++) { const x = Math.floor(rnd() * w), y = Math.floor(rnd() * h); if (g.getImageData(x, y, 1, 1).data[3] > 200) g.fillRect(x, y, 1, 1); } };
  // a crystal: a tall prism leaning by `lean`, lit from the left
  const shard = (g, x, y, w, h, lean, c) => { const tx = x + lean, ty = y - h; poly(g, [x - w, y, x, y + w * 0.5, tx, ty], c[0]); poly(g, [x, y + w * 0.5, x + w, y, tx, ty], c[1]); line(g, x, y + w * 0.5, tx, ty, c[2], 1); };
  const PIECES = {
    'Grave Nest': [64, 46, (g) => { // heaped earth, ribs standing out of it, and a pit that glows
      shadow(g, 32, 38, 28, 6);
      blob(g, 32, 31, 27, 12, '#231c2a'); blob(g, 29, 28, 21, 9, '#372d42'); blob(g, 24, 25, 9, 4, '#4a3d58');
      for (const [x, y, lean] of [[9, 31, -5], [17, 24, -3], [47, 24, 3], [55, 31, 5], [26, 20, -1], [39, 20, 1]]) { poly(g, [x, y + 6, x + 3, y + 6, x + lean + 2, y - 13, x + lean, y - 12], '#e6dfcc'); line(g, x + 3, y + 6, x + lean + 2, y - 13, '#a39c88', 1); }
      blob(g, 32, 27, 12, 5.5, '#0c0812'); blob(g, 32, 27, 8, 3.4, '#6a35c0'); blob(g, 32, 27, 4, 1.8, '#e3c4ff');
      blob(g, 20, 36, 3.6, 3.2, '#e6dfcc'); g.fillStyle = '#231c2a'; g.fillRect(18, 35, 2, 2); g.fillRect(21, 35, 2, 2); blob(g, 45, 37, 3.2, 2.8, '#cfc8b4'); g.fillRect(43, 36, 2, 2); g.fillRect(46, 36, 2, 2);
      speck(g, 64, 46, '#5a4c6a80', 50);
    }, 38],
    'Bone Ballista': [58, 52, (g) => { // a frame of timber, a bow of two great ribs, a bolt as long as a man
      shadow(g, 29, 46, 23, 5);
      poly(g, [9, 46, 15, 46, 27, 24, 23, 24], '#5a4030'); poly(g, [43, 46, 49, 46, 35, 24, 31, 24], '#3a281a'); poly(g, [20, 26, 38, 26, 38, 32, 20, 32], '#6f4c2c'); line(g, 20, 26, 38, 26, '#8d6a44', 1);
      poly(g, [29, 24, 5, 11, 7, 7, 30, 19], '#e6dfcc'); poly(g, [29, 24, 53, 11, 51, 7, 28, 19], '#cfc8b4'); line(g, 5, 11, 29, 24, '#a39c88', 1);
      line(g, 6, 9, 29, 34, '#d9d2bd', 1); line(g, 52, 9, 29, 34, '#d9d2bd', 1);
      poly(g, [28, 6, 30, 6, 30, 35, 28, 35], '#7a7468'); poly(g, [25, 8, 29, 0, 33, 8], '#c9d2e0'); line(g, 29, 0, 29, 8, '#ffffff', 1);
      blob(g, 29, 29, 3, 3, '#3a281a'); speck(g, 58, 52, '#2a1c1280', 40);
    }, 46],
    'Hex Obelisk': [40, 88, (g) => {
      shadow(g, 20, 80, 17, 6);
      poly(g, [9, 76, 15, 82, 12, 70], '#3a3f4c'); poly(g, [26, 82, 34, 76, 31, 70], '#22252e');                       // broken stone at its foot
      poly(g, [7, 74, 20, 82, 22, 8, 14, 26], '#474d5c'); poly(g, [20, 82, 33, 73, 29, 22, 22, 8], '#23262f');            // the shard: a lit face, a dark face
      poly(g, [14, 26, 22, 8, 21, 30], '#5d6475'); line(g, 20, 82, 22, 8, '#6b7386', 1);                                    // the ridge catches the light
      line(g, 11, 56, 17, 61, '#2a2e38', 1); line(g, 24, 50, 30, 46, '#15171d', 1); line(g, 13, 38, 18, 44, '#2a2e38', 1);   // cracks
      speck(g, 40, 88, '#59607080', 60); speck(g, 40, 88, '#1b1d24', 50);
    }, 80],
    'Hex Rune': [40, 88, (g) => { // only the carving, drawn over the obelisk in light
      g.strokeStyle = '#fff'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(15, 34); g.lineTo(19, 30); g.lineTo(19, 62); g.moveTo(15, 46); g.lineTo(19, 50); g.moveTo(13, 58); g.lineTo(19, 62); g.stroke();
      g.beginPath(); g.arc(17, 40, 2.6, 0, TAU); g.stroke(); g.fillStyle = '#fff'; g.fillRect(24, 36, 2, 5); g.fillRect(25, 46, 2, 7); g.fillRect(26, 58, 2, 4);
    }, 80],
    'Stakes': [56, 36, (g) => {
      shadow(g, 28, 30, 24, 5);
      for (const [x, lean] of [[8, 9], [19, 12], [30, 10], [41, 13]]) { poly(g, [x, 30, x + 4, 31, x + lean + 3, 6, x + lean, 8], '#6f4c2c'); poly(g, [x + 4, 31, x + 7, 29, x + lean + 3, 6], '#3f2a18'); poly(g, [x + lean, 8, x + lean + 3, 6, x + lean + 2, 1], '#e9e2cf'); }
      poly(g, [4, 24, 50, 18, 51, 21, 5, 27], '#523720'); line(g, 4, 24, 50, 18, '#86603a', 1);                               // the bar that ties them
    }, 30],
    'Dead Banner': [30, 76, (g) => {
      shadow(g, 13, 71, 7, 3);
      poly(g, [12, 72, 15, 72, 15, 4, 12, 4], '#3a2a1c'); line(g, 12, 72, 12, 4, '#6b4c30', 1); poly(g, [10, 5, 28, 8, 28, 11, 10, 8], '#3a2a1c');   // pole and yard
      poly(g, [14, 10, 27, 12, 27, 40, 24, 36, 22, 46, 19, 38, 17, 50, 14, 42], '#4a2370'); poly(g, [21, 11, 27, 12, 27, 40, 24, 36, 22, 46, 21, 40], '#34184f');   // the torn cloth
      blob(g, 20, 22, 3.4, 3.2, '#e6dfcc'); g.fillStyle = '#34184f'; g.fillRect(18, 21, 2, 2); g.fillRect(21, 21, 2, 2); g.fillStyle = '#e6dfcc'; g.fillRect(18, 25, 5, 2);   // a skull on it
    }, 71],
    'Rubble': [44, 24, (g) => {
      shadow(g, 22, 18, 20, 5);
      for (const [x, y, s] of [[8, 16, 5], [17, 12, 7], [28, 15, 6], [36, 17, 4], [22, 19, 4]]) { poly(g, [x - s, y, x, y - s * 0.8, x + s * 0.3, y + s * 0.5, x - s * 0.5, y + s * 0.6], '#4a4f5a'); poly(g, [x, y - s * 0.8, x + s, y - s * 0.1, x + s * 0.3, y + s * 0.5], '#262a33'); }
    }, 18],
    'Ice Shards': [50, 56, (g) => {
      shadow(g, 25, 49, 20, 5);
      const C = ['#d6f2ff', '#7fb8ea', '#ffffff'], D = ['#a9d8f7', '#4f86c8', '#e8f8ff'];
      shard(g, 13, 46, 5, 22, -5, D); shard(g, 37, 45, 5, 26, 6, D); shard(g, 24, 47, 7, 42, 1, C); shard(g, 31, 49, 4, 16, 4, C); shard(g, 18, 50, 3, 12, -3, C);
      g.fillStyle = '#ffffff'; g.fillRect(22, 14, 1, 6); g.fillRect(36, 26, 1, 4);
    }, 49],
    'Lava Vent': [48, 30, (g) => {
      shadow(g, 24, 22, 22, 6);
      poly(g, [3, 22, 10, 13, 20, 9, 31, 10, 41, 15, 45, 22, 36, 27, 14, 27], '#2a2225'); poly(g, [10, 13, 20, 9, 31, 10, 28, 15, 16, 16], '#473a3c');   // a mound of black rock, its rim lit
      poly(g, [16, 16, 28, 15, 33, 19, 25, 23, 15, 21], '#ff7a2a'); poly(g, [19, 17, 27, 17, 29, 19, 24, 21, 18, 20], '#ffd27a');                         // the mouth
      line(g, 33, 19, 41, 22, '#ff7a2a', 1); line(g, 15, 21, 8, 23, '#ff7a2a', 1); line(g, 25, 23, 27, 27, '#ff9a3a', 1);                                  // cracks running out from it
      speck(g, 48, 30, '#17111280', 40);
    }, 22],
    'Glowcaps': [46, 54, (g) => {
      shadow(g, 23, 48, 18, 4);
      for (const [x, y, h, r] of [[12, 47, 16, 7], [33, 46, 22, 8], [23, 49, 34, 11]]) {
        poly(g, [x - 2, y, x + 2, y, x + 2, y - h, x - 1, y - h], '#d9d2b8'); g.fillStyle = '#9c957c'; g.fillRect(x + 1, y - h, 1, h);         // the stem
        blob(g, x, y - h, r, r * 0.55, '#1f7a68'); g.fillStyle = '#0000'; g.clearRect(x - r, y - h + 1, r * 2, r);                          // the cap: a dome, cut flat beneath
        poly(g, [x - r, y - h + 1, x + r, y - h + 1, x + r - 3, y - h + 3, x - r + 3, y - h + 3], '#125246');                                 // its dark gills
        blob(g, x - r * 0.25, y - h - r * 0.22, r * 0.55, r * 0.22, '#47e0bb'); g.fillStyle = '#c9fff0'; g.fillRect(x - 3, y - h - 2, 2, 1); g.fillRect(x + 2, y - h - 1, 1, 1);
      }
    }, 48],
    'Blight Pod': [42, 48, (g) => {
      shadow(g, 21, 42, 16, 4);
      for (const [x0, x1] of [[10, 2], [14, 8], [28, 34], [32, 40]]) line(g, x0, 38, x1, 43, '#2b2033', 2);                                    // roots gripping the ground
      blob(g, 21, 26, 13, 16, '#3b2b47'); blob(g, 17, 22, 8, 11, '#55406a'); blob(g, 15, 18, 3, 5, '#7a5f96');                                  // the sac, lit from the left
      line(g, 12, 30, 17, 38, '#b9a8d6', 1); line(g, 29, 20, 31, 32, '#b9a8d6', 1); line(g, 21, 11, 22, 16, '#b9a8d6', 1);                      // veins
      poly(g, [20, 20, 23, 19, 24, 34, 21, 36], '#e3c4ff'); poly(g, [21, 23, 22, 23, 23, 32, 21, 33], '#ffffff');                               // the slit it glows through
      poly(g, [14, 11, 17, 4, 19, 11], '#2b2033'); poly(g, [24, 11, 28, 5, 28, 12], '#2b2033');                                                  // thorns
    }, 42],
  };
  const names = Object.keys(PIECES), cv = document.createElement('canvas'); let x = 0, hmax = 0; const f = {};
  const made = names.map((n) => piece(PIECES[n][0], PIECES[n][1], PIECES[n][2]));
  made.forEach((c) => { hmax = Math.max(hmax, c.height); }); cv.width = made.reduce((a, c) => a + c.width + 2, 0); cv.height = hmax;
  const g = cv.getContext('2d'); made.forEach((c, i) => { g.drawImage(c, x, 0); f[names[i]] = [x, 0, c.width, c.height, -c.width / 2, -PIECES[names[i]][3]]; x += c.width + 2; });
  BB.A.env.craft = { img: cv, meta: { f } };
})();
