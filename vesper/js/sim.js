// VESPER — the fight simulation. Pure logic (no DOM): runs in the page and in Node tests.
// A round ring seen from above: the hero moves freely against waves and a boss. Attacks are cones
// (or circles on the ground) in front of the attacker; parry, dodge, dash-cut, poise, the moon gauge
// and the two moon arts (Red Moon; the Last Ditch Effort at low health) played as cinematics.
(function (root) {
  const VS = root.VS = root.VS || {}; const D = VS.DATA;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const TAU = Math.PI * 2;
  const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
  const dir = (a) => [Math.cos(a), Math.sin(a)];

  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // ---- setup ------------------------------------------------------------------------------
  // Foes overall: tuned with the bot so a good run wins most hours and a sloppy one loses often.
  VS.DIFF = { hp: 1.4, bossHp: 1.35, dmg: 2.0 };
  VS.POWER = { dmg: 1.3, hp: 1.3, gain: 1.2, killHeal: 0.03 };
  // boons: owned passives (skill tree ids). kit: unlocked abilities; without one, the whole kit.
  const CORE = ['heavy', 'dodge', 'parry', 'skill1', 'skill2', 'art'];
  function mods(boons, H, kit, rules) {
    const has = (id) => boons.indexOf(id) >= 0; H = H || D.HERO; rules = rules || {};
    const can = {}; for (const k of CORE) can[k] = !kit || kit.indexOf(k) >= 0;
    if (rules.nomoon) can.art = false;
    const glass = rules.glass ? 2 : 1;
    return {
      can, rules, quick: has('quick') ? 0.7 : 1, exec: has('exec'),
      // The hero hits harder and lasts longer than the base kit, to match the bigger waves; kills heal.
      dmg: VS.POWER.dmg * (H.pow || 1) * (has('edge') ? 1.2 : 1) * (has('edge2') ? 1.15 : 1) * glass, hp: Math.round((Math.round(H.hp * VS.POWER.hp) + (has('vigor') ? 30 : 0) + (has('vigor2') ? 30 : 0)) / glass), parryWin: H.parry.win * (has('guard') ? 1.6 : 1),
      gain: VS.POWER.gain * (has('moonblood') ? 1.4 : 1), killHeal: rules.noheal ? 0 : VS.POWER.killHeal, thirst: has('thirst') ? 0.05 : 0, combo: Math.min(H.combo.length, has('fourth') ? 5 : 4),
      dodgeDist: H.dodge.dist * (has('ghost') ? 1.3 : 1), perfect: H.dodge.perfect + (has('ghost') ? 0.08 : 0),
      riposte: has('riposte'), ldx: has('breath') ? 0.45 : H.lastDitch, moonStart: has('rising') ? 50 : 0,
    };
  }
  function setAng(u, a) { u.ang = a; u.face = Math.cos(a) >= 0 ? 1 : -1; }
  function makeUnit(s, team, key, def, x, y, ang) {
    const sc = def.scale || 1;
    const u = { id: s.nextId++, team, key, def, set: def.set, scale: sc, rad: 8 * sc, x, y, ang: 0, face: 1,
      hp: def.hp, maxHp: def.hp, poise: def.poise || 0, maxPoise: def.poise || 0, lastHit: -9,
      state: 'idle', st: 0, dur: 0, clip: 'Idle4', frame: 0, atk: null, hits: [], cd: 0.6, iframes: 0, flash: 0, kvx: 0, kvy: 0, z: 0, vz: 0, mdir: 'f', tauntT: 0, wallT: 0, slowT: 0, stunT: 0, sigCd: 5, summonCd: 4, life: 0,
      alive: true, phase: 1, windMul: 1, spdMul: 1, queued: false, combo: 0, comboWin: 0, riposte: false, serial: 0, deadT: 0, orbit: 0 };
    setAng(u, ang || 0);
    s.units.push(u); return u;
  }

  function create(stageIdx, opts) {
    opts = opts || {};
    // A campaign node brings its own waves, arenas, difficulty and rules; otherwise the classic hour.
    const N = opts.node, st0 = D.STAGES[stageIdx], st = N ? Object.assign({}, st0, { arenas: N.arenas || st0.arenas, scale: N.scale || st0.scale }) : st0;
    const boons = opts.boons || [], H = (D.HEROES && D.HEROES[opts.hero]) || (D.HEROES ? D.HEROES.vesper : D.HERO), M = mods(boons, H, opts.kit, N && N.rules);
    const s = { stage: stageIdx, def: st, t: 0, time: 0, rand: rng(opts.seed || 1), units: [], bolts: [], events: [], nextId: 1, rules: M.rules, hasBoss: N ? !!N.boss : true,
      waves: N ? N.waves.map((w) => w.slice()) : st.waves.concat([st.bossWave]), wave: -1, waveT: 0.9, area: 0, portal: null, transit: null, freeze: 0, hitstop: 0, slow: 1, slowT: 0, cine: null,
      result: null, endT: 0, moon: M.moonStart, mods: M, boons, combo: 0, comboT: 0, serial: 0, bossIds: [],
      heroDef: H, cds: [0, 0], hazards: [], invisT: 0,
      stats: { dealt: 0, taken: 0, parries: 0, perfects: 0, arts: 0, ldx: 0, maxCombo: 0, hitsTaken: 0, bossHits: 0, zoneHits: 0 } };
    curArena = arenaOf(s);
    const en = VS.entryOf(curArena); s.hero = makeUnit(s, 'hero', H.id, Object.assign({}, H, { hp: M.hp }), en.x * 0.6, en.y * 0.6, Math.atan2(-en.y, -en.x));
    return s;
  }

  // ---- frames -----------------------------------------------------------------------------
  const F = D.FRAMES - 1;
  function loopFrame(clip, t) { return Math.floor(t * (D.FPS[clip] || 8)) % D.FRAMES; }
  function setFrame(s, u) {
    const st = u.st;
    switch (u.state) {
      case 'attack': {
        const k = u.atk, w = k.wind * u.windMul, r = k.recover * u.windMul, sk = k.blink ? 7 : (D.STRIKE[k.clip] || 7);
        u.clip = k.clip;
        u.frame = st < w ? Math.floor(sk * st / w) : Math.min(F, sk + Math.floor((st - w) / Math.max(0.05, r) * (F - sk + 1)));
        break;
      }
      case 'dodge': u.clip = 'Rolling'; u.frame = Math.min(F, Math.floor(st / u.dur * D.FRAMES)); break;
      case 'parry': u.clip = 'Idle4'; u.frame = 0; break;
      case 'hurt': u.clip = 'TakeDamage'; u.frame = Math.min(F, Math.floor(st * 22)); break;
      case 'down': { u.clip = 'Slide'; const up = u.dur - 0.5; u.frame = st < 0.45 ? Math.floor(st / 0.45 * 8) : st < up ? 7 : Math.min(F, 8 + Math.floor((st - up) / 0.5 * 7)); break; }
      case 'dead': u.clip = 'Die'; u.frame = Math.min(F, Math.floor(st * 14)); break;
      case 'win': u.clip = 'Taunt'; u.frame = loopFrame('Taunt', st); break;
      case 'spawn': u.clip = u.mode === 'side' ? 'Run' : u.mode === 'drop' ? 'Attack4' : 'Idle'; u.frame = u.mode === 'drop' ? Math.min(F, Math.floor(st / u.dur * 10)) : loopFrame(u.clip, s.t + u.id); break;
      case 'move': if (u.def.limited) { u.clip = 'Walk'; u.frame = loopFrame('Walk', s.t + u.id * 0.37); break; }
        u.clip = u.mdir === 'l' ? 'StrafeLeft' : u.mdir === 'r' ? 'StrafeRight' : u.mdir === 'b' ? 'RunBackwards' : u.team === 'hero' ? 'Run' : (u.def.spd * u.spdMul > 68 ? 'Run' : 'Walk'); u.frame = loopFrame(u.clip, s.t + u.id * 0.37); break;
      case 'air': u.clip = 'TakeDamage'; u.frame = u.vz > 0 ? Math.min(6, 2 + Math.floor(st * 20)) : Math.min(13, 8 + Math.floor(-u.vz / 60)); break;
      default: if (u.def.limited) { u.clip = 'Idle'; u.frame = loopFrame('Idle', s.t + u.id * 0.37); break; }
        if (u.tauntT > 0) { u.clip = 'Taunt'; u.frame = loopFrame('Taunt', s.t); break; } u.clip = 'Idle4'; u.frame = loopFrame('Idle4', s.t + u.id * 0.37);
    }
  }

  // ---- helpers ----------------------------------------------------------------------------
  const ev = (s, e) => { s.events.push(e); };
  const foes = (s) => s.units.filter((u) => u.team === 'foe' && u.alive);
  function gainMoon(s, n) { if (s.cine) return; const was = s.moon; s.moon = Math.min(100, s.moon + n * s.mods.gain); if (was < 100 && s.moon >= 100) ev(s, { type: 'moonFull' }); }
  function setState(u, state, dur) { u.state = state; u.st = 0; u.dur = dur || 0; }
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function nearestFoe(s, u, maxD) { let best = null, bd = maxD || 1e9; for (const o of foes(s)) { if (o.state === 'spawn') continue; const d = dist(o, u); if (d < bd) { bd = d; best = o; } } return best; }
  function push(u, from, power) { const dx = u.x - from.x, dy = u.y - from.y, n = Math.hypot(dx, dy) || 1; u.kvx = dx / n * power; u.kvy = dy / n * power; }
  function moveDir(u, vx, vy) { const d = angDiff(Math.atan2(vy, vx), u.ang), f = Math.cos(d), l = Math.sin(d); u.mdir = f > 0.45 ? 'f' : f < -0.55 ? 'b' : l > 0 ? 'r' : 'l'; }
  // Who a unit goes after. Foes: the hero, or one of his allies if it is clearly nearer; nobody while
  // he is hidden in smoke. Allies: the nearest foe.
  function targetOf(s, u) {
    if (u.team === 'hero') { let best = null, bd = 1e9; for (const o of foes(s)) { if (o.state === 'spawn') continue; const d = dist(o, u); if (d < bd) { bd = d; best = o; } } return best; }
    const h = s.hero; if (s.invisT > 0 || !h.alive) return null;
    let best = h, bd = dist(h, u) - 25;
    for (const o of s.units) if (o.ally && o.alive) { const d = dist(o, u); if (d < bd) { bd = d; best = o; } }
    return best;
  }
  // Damage with no reaction of its own (zones): hp, flash, the floater, death.
  function directDamage(s, o, dmg, quiet) {
    if (!o.alive || o.state === 'spawn') return;
    if (o === s.hero) { if (o.iframes > 0) return; dmg = Math.round(dmg); o.hp -= dmg; s.stats.taken += dmg; s.stats.zoneHits = (s.stats.zoneHits || 0) + 1; if (s.units.some((b) => b.alive && b.def.boss)) s.stats.bossHits = (s.stats.bossHits || 0) + 1; if (s.rules.nohit) o.hp = 0; o.flash = 0.6; if (!quiet) ev(s, { type: 'hurt', x: o.x, y: o.y, dmg, id: o.id, small: true }); if (o.hp <= 0) { o.hp = 0; kill(s, o); } return; }
    dmg = Math.max(1, Math.round(dmg * (o.team === 'foe' ? s.mods.dmg : 1))); o.hp -= dmg; if (o.team === 'foe') s.stats.dealt += dmg; o.flash = 0.5;
    if (!quiet) ev(s, { type: 'tick', x: o.x, y: o.y, dmg, id: o.id });
    if (o.hp <= 0) { o.hp = 0; kill(s, o); }
  }
  function addHazard(s, h) { s.hazards.push(Object.assign({ t: 0, delay: 0, dur: 0, tick: 0 }, h)); }
  VS.ldxReady = (s) => s.hero.alive && s.hero.hp / s.hero.maxHp <= s.mods.ldx;

  // ---- attacks ----------------------------------------------------------------------------
  function startAttack(s, u, k) {
    setState(u, 'attack'); u.atk = k; u.hits = []; u.serial = ++s.serial;
    if (u === s.hero) {
      // Mouse aim: the foe nearest the aimed direction, else the aimed direction itself; without aim, the nearest foe.
      if (s.aim != null) {
        let best = null, bd = 1e9;
        for (const o of foes(s)) { if (o.state === 'spawn') continue; const d = dist(o, u), da = Math.abs(angDiff(Math.atan2(o.y - u.y, o.x - u.x), s.aim)); if (d < 115 && da < 0.9 && d + da * 60 < bd) { bd = d + da * 60; best = o; } }
        setAng(u, best ? Math.atan2(best.y - u.y, best.x - u.x) : s.aim);
      } else { const o = nearestFoe(s, u, 100); if (o) setAng(u, Math.atan2(o.y - u.y, o.x - u.x)); }
    }
    else { const tg = targetOf(s, u) || s.hero; u.target = tg; if (tg) setAng(u, Math.atan2(tg.y - u.y, tg.x - u.x)); }
    ev(s, { type: 'windup', id: u.id, unparry: !!k.unparry, boss: !!u.def.boss, clip: k.clip });
  }
  // Where an area blow lands (for the danger zone on the floor).
  VS.aoeAt = (u, k) => { const d = dir(u.ang); return { x: u.x + d[0] * (k.at || 0) * u.scale, y: u.y + d[1] * (k.at || 0) * u.scale, r: k.aoe * u.scale * 0.8 }; };
  function inReach(a, k, o) {
    if (k.aoe) { const c = VS.aoeAt(a, k); return Math.hypot(o.x - c.x, o.y - c.y) <= c.r + o.rad; }
    const dx = o.x - a.x, dy = o.y - a.y, d = Math.hypot(dx, dy);
    if (d > k.reach * a.scale + o.rad) return false;
    if (d < o.rad + 4) return true;
    return Math.abs(angDiff(Math.atan2(dy, dx), a.ang)) <= (k.arc || 1.5) / 2 + 0.2;
  }
  function contact(s, a, k) {
    if (k.skill) { doSkill(s, a, k.skill); return; }
    const tg = a.team === 'foe' ? (a.target && a.target.alive ? a.target : s.hero) : null;
    if (k.zone) { const z = k.zone; addHazard(s, { kind: 'zone', team: a.team, x: tg.x, y: tg.y, r: z.r, delay: z.delay || 0.5, dur: z.dur, dps: z.dps * (a.dmgMul || 1), slow: z.slow, fx: z.fx }); ev(s, { type: 'cast', id: a.id }); return; }
    if (k.summon) {
      const n = Math.min(k.summon.n, Math.max(0, 9 - foes(s).length));
      for (let i = 0; i < n; i++) { const an = s.rand() * Math.PI * 2, c = VS.clampTo(curArena, a.x + Math.cos(an) * 40, a.y + Math.sin(an) * 40, 20); summonFoe(s, k.summon.key, c[0], c[1], 'rift'); }
      a.summonCd = 9; ev(s, { type: 'cast', id: a.id }); return;
    }
    if (k.rain) {
      const r = k.rain;
      for (let i = 0; i < r.n; i++) {
        const an = s.rand() * Math.PI * 2, rr = i === 0 ? 0 : r.spread * Math.sqrt(s.rand()), c = VS.clampTo(curArena, tg.x + Math.cos(an) * rr, tg.y + Math.sin(an) * rr, 6);
        addHazard(s, { kind: 'strike', team: a.team, x: c[0], y: c[1], r: r.r, delay: r.delay + i * 0.1, dmg: r.dmg * (a.dmgMul || 1), slow: r.slow, fx: r.fx, then: r.zone ? { kind: 'zone', r: r.r, dur: r.zone.dur, dps: r.zone.dps * (a.dmgMul || 1), fx: r.fx } : null });
      }
      return;
    }
    if (k.quake) {
      const q = k.quake;
      for (let i = 1; i <= q.rings; i++) { const n = 5 + i * 3; for (let j = 0; j < n; j++) { const an = j / n * Math.PI * 2 + i * 0.4, c = [a.x + Math.cos(an) * q.step * i, a.y + Math.sin(an) * q.step * i]; if (!VS.inside(curArena, c[0], c[1], 4)) continue; addHazard(s, { kind: 'strike', team: a.team, x: c[0], y: c[1], r: 20, delay: 0.15 + i * 0.22, dmg: q.dmg * (a.dmgMul || 1), fx: q.fx, quiet: j % 2 }); } }
      ev(s, { type: 'slam', x: a.x, y: a.y, r: 40, id: a.id }); return;
    }
    if (k.clones) {
      for (let i = 0; i < k.clones; i++) {
        const an = (i / k.clones) * Math.PI * 2 + s.rand(), c = VS.clampTo(curArena, tg.x + Math.cos(an) * 70, tg.y + Math.sin(an) * 70, 20);
        const melee = a.def.atks.find((x) => x.reach && !x.chainOnly && !x.sig) || a.def.atks[0];
        const def = { name: a.def.name, set: a.def.set, scale: a.def.scale, hp: Math.round(a.maxHp * 0.06), spd: a.def.spd * 1.1, poise: 0, minion: true, clone: true, color: a.def.color, atks: [Object.assign({}, melee, { next: undefined })] };
        const u = summonFoe(s, a.key + '_clone', c[0], c[1], 'rift', def); u.life = 9; u.dmgMul = (a.dmgMul || 1) * 0.6;
      }
      return;
    }
    if (k.tornado) {
      const t = k.tornado;
      for (let i = 0; i < t.n; i++) { const an = Math.atan2(tg.y - a.y, tg.x - a.x) + (i - (t.n - 1) / 2) * 0.8; addHazard(s, { kind: 'tornado', team: a.team, x: a.x + Math.cos(an) * 30, y: a.y + Math.sin(an) * 30, r: t.r, delay: 0.2, dur: t.dur, speed: t.speed, ang: an, dmg: t.dmg * (a.dmgMul || 1) }); }
      return;
    }
    if (k.blink) {
      const h = s.hero, d = dir(h.ang);
      a.x = h.x - d[0] * 46; a.y = h.y - d[1] * 46; keepIn(a); setAng(a, Math.atan2(h.y - a.y, h.x - a.x));
      ev(s, { type: 'blink', id: a.id, x: a.x, y: a.y }); return;
    }
    if (k.bolt) {
      const n = k.bolt.fan || 1;
      for (let i = 0; i < n; i++) {
        const an = a.ang + (n > 1 ? (i - (n - 1) / 2) * 0.32 : 0), d = dir(an);
        const B = k.bolt;
        s.bolts.push({ x: a.x + d[0] * 14 * a.scale, y: a.y + d[1] * 14 * a.scale, vx: d[0] * B.speed, vy: d[1] * B.speed, team: a.team, owner: a.id, dmg: Math.round(k.dmg * (a.dmgMul || 1)), kb: k.kb, fx: B.fx, life: 4, t: 0,
          poise: k.poise || 14, slow: k.slow, stun: k.stun, burst: B.burst, burstFx: B.burstFx, ground: B.ground, pierce: B.pierce, r: B.r || (B.big ? 14 : 6), big: B.big, unparry: k.unparry, hitIds: [] });
      }
      ev(s, { type: 'bolt', id: a.id }); return;
    }
    for (const o of s.units) {
      if (o.team === a.team || !o.alive || a.hits.indexOf(o.id) >= 0) continue;
      if (inReach(a, k, o)) { a.hits.push(o.id); hit(s, a, o, k); }
    }
    if (a === s.hero && !k.bolt) ev(s, { type: 'swing', id: a.id, clip: k.clip });
    if (k.explode && a.alive) { a.hp = 0; kill(s, a); return; }
    if (k.aoe) { const c = VS.aoeAt(a, k); ev(s, { type: a.team === 'hero' ? 'spin' : 'slam', x: c.x, y: c.y, r: c.r, id: a.id }); }
  }

  // ---- summons ------------------------------------------------------------------------------------
  function summonFoe(s, key, x, y, mode, def) {
    def = def || D.FOES[key];
    const u = makeUnit(s, 'foe', key, def, x, y, 0), sk = s.def.scale || { hp: 1, dmg: 1 };
    if (!def.clone) { u.hp = u.maxHp = Math.round(def.hp * sk.hp); u.dmgMul = sk.dmg; }
    u.mode = mode; u.from = { x, y }; u.to = { x, y }; u.orbit = s.rand() < 0.5 ? -1 : 1; u.cd = 0.6;
    setState(u, 'spawn', 0.7); ev(s, { type: 'spawn', id: u.id, x, y, mode, dur: 0.7 });
    return u;
  }
  // ---- the heroes' skills -----------------------------------------------------------------------
  // Where a skill lands: the foe nearest the aimed direction within range, else along the aim.
  function aimPoint(s, h, range) {
    const aim = s.aim != null ? s.aim : h.ang; let best = null, bd = 1e9;
    for (const o of foes(s)) { if (o.state === 'spawn') continue; const d = dist(o, h), da = Math.abs(angDiff(Math.atan2(o.y - h.y, o.x - h.x), aim)); if (d < range && da < 0.8 && d + da * 70 < bd) { bd = d + da * 70; best = o; } }
    if (!best && s.aim == null) best = nearestFoe(s, h, range);
    if (best) return { x: best.x, y: best.y, o: best };
    const d = dir(aim), c = VS.clampTo(curArena, h.x + d[0] * range * 0.75, h.y + d[1] * range * 0.75, 10); return { x: c[0], y: c[1], o: null };
  }
  function areaHit(s, a, x, y, r, k) {
    for (const o of foes(s)) if (o.state !== 'spawn' && Math.hypot(o.x - x, o.y - y) <= r + o.rad) hit(s, a, o, k);
  }
  function doSkill(s, h, sk) {
    const p0 = sk.kind === 'wave' || sk.kind === 'blink' || sk.kind === 'clones' || sk.kind === 'smoke' ? null : aimPoint(s, h, sk.range || 120);
    const aim = p0 ? Math.atan2(p0.y - h.y, p0.x - h.x) : (s.aim != null ? s.aim : h.ang), d = dir(aim);
    ev(s, { type: 'skill', kind: sk.kind, name: sk.name, x: h.x, y: h.y, ang: aim });
    switch (sk.kind) {
      case 'wave':
        setAng(h, aim);
        s.bolts.push({ x: h.x + d[0] * 14, y: h.y + d[1] * 14, vx: d[0] * sk.speed, vy: d[1] * sk.speed, team: 'hero', owner: h.id, dmg: sk.dmg, kb: 16, fx: sk.fx, life: 1.4, t: 0, poise: sk.poise, pierce: true, r: sk.r, big: true, hitIds: [] });
        break;
      case 'blinkStrike': {
        const from = { x: h.x, y: h.y }, tg = p0.o;
        const bx = tg ? tg.x + d[0] * 20 : p0.x, by = tg ? tg.y + d[1] * 20 : p0.y, c = VS.clampTo(curArena, bx, by, 10);
        h.x = c[0]; h.y = c[1]; setAng(h, aim + (tg ? Math.PI : 0)); h.iframes = 0.3;
        ev(s, { type: 'blink', id: h.id, x: from.x, y: from.y }); ev(s, { type: 'blink', id: h.id, x: h.x, y: h.y });
        areaHit(s, h, tg ? tg.x : h.x, tg ? tg.y : h.y, sk.r, { dmg: sk.dmg, poise: sk.poise, kb: 20, fx: 'finisher', finisher: true });
        break;
      }
      case 'zone': addHazard(s, { kind: 'zone', team: 'hero', x: p0.x, y: p0.y, r: sk.r, delay: 0.25, dur: sk.dur, dps: sk.dps, slow: sk.slow, fx: sk.fx }); break;
      case 'blink': {
        const from = { x: h.x, y: h.y }, c = VS.clampTo(curArena, h.x + d[0] * sk.range, h.y + d[1] * sk.range, 10);
        h.x = c[0]; h.y = c[1]; h.iframes = 0.35; ev(s, { type: 'blink', id: h.id, x: from.x, y: from.y, petals: true }); ev(s, { type: 'blink', id: h.id, x: h.x, y: h.y, petals: true });
        areaHit(s, h, from.x, from.y, sk.r, { dmg: sk.dmg, poise: sk.poise, kb: 22 });
        break;
      }
      case 'chain': {
        const pts = [[h.x, h.y]], hitIds = []; let cur = p0.o, dmg = sk.dmg;
        for (let i = 0; i < sk.jumps && cur; i++) {
          pts.push([cur.x, cur.y]); hitIds.push(cur.id); hit(s, h, cur, { dmg: Math.round(dmg), poise: 10, kb: 6, stun: sk.stun, fx: 'shock' }); dmg *= 0.85;
          let nx = null, nd = sk.hop; for (const o of foes(s)) { if (hitIds.indexOf(o.id) >= 0 || o.state === 'spawn') continue; const dd = dist(o, cur); if (dd < nd) { nd = dd; nx = o; } }
          cur = nx;
        }
        if (pts.length === 1) pts.push([h.x + d[0] * 80, h.y + d[1] * 80]);
        setAng(h, aim); ev(s, { type: 'chain', pts });
        break;
      }
      case 'leapSlam': h.leap = { fx: h.x, fy: h.y, tx: p0.x, ty: p0.y, t: 0, dur: 0.42, sk }; h.iframes = 0.5; setAng(h, aim); break;
      case 'clones':
        for (let i = 0; i < sk.n; i++) { const an = aim + (i ? 1 : -1) * 1.2, c = VS.clampTo(curArena, h.x + Math.cos(an) * 26, h.y + Math.sin(an) * 26, 10); const u = makeUnit(s, 'hero', 'clone', D.CLONE, c[0], c[1], aim); u.ally = true; u.life = sk.dur; u.cd = 0; ev(s, { type: 'blink', id: u.id, x: u.x, y: u.y }); }
        break;
      case 'smoke':
        for (const o of foes(s)) if (Math.hypot(o.x - h.x, o.y - h.y) <= sk.r + o.rad) { if (o.def.boss) { o.poise -= 15; o.lastHit = s.time; } else { setState(o, 'hurt', sk.stun); o.atk = null; o.stunT = sk.stun; } }
        h.iframes = 0.8; s.invisT = 2.2;
        break;
    }
  }
  // a: attacker (unit or bolt), o: target, k: attack.
  function hit(s, a, o, k, bolt) {
    const M = s.mods;
    if (o.team === 'hero') {
      if (o.state === 'dodge' && o.iframes > 0) {
        if (o.st <= M.perfect && !o.perfectDone) { o.perfectDone = true; s.slow = 0.3; s.slowT = 0.55; s.stats.perfects++; gainMoon(s, 15); ev(s, { type: 'perfect', x: o.x, y: o.y }); }
        return;
      }
      if (o.iframes > 0) return;
      if (o.state === 'parry' && o.st <= M.parryWin && !k.unparry) {
        s.stats.parries++; gainMoon(s, 22); s.hitstop = 0.13; o.riposte = M.riposte; if (a.def && a.def.boss) ev(s, { type: 'impact', size: 'small', x: o.x, y: o.y });
        const d = dir(o.ang); ev(s, { type: 'parry', x: o.x + d[0] * 10, y: o.y + d[1] * 10, id: o.id });
        if (bolt) {
          const own = s.units.find((u) => u.id === bolt.owner), sp = Math.hypot(bolt.vx, bolt.vy) * 1.35;
          const an = own && own.alive ? Math.atan2(own.y - bolt.y, own.x - bolt.x) : Math.atan2(-bolt.vy, -bolt.vx);
          bolt.team = 'hero'; bolt.vx = Math.cos(an) * sp; bolt.vy = Math.sin(an) * sp; bolt.dmg = Math.round(bolt.dmg * 2.5 * M.dmg); bolt.reflected = true; return 'reflect';
        }
        if (a.def.boss) {
          a.poise -= 28; a.lastHit = s.time; push(a, o, 60);
          if (a.poise <= 0) breakPoise(s, a, o); else { setState(a, 'hurt', 0.5); a.atk = null; }
        } else { setState(a, 'hurt', 0.7); a.atk = null; push(a, o, 90); }
        setState(o, 'idle'); o.iframes = 0.15;
        return;
      }
      const dmg = Math.round(k.dmg * (a.dmgMul || 1) * (a.phase === 2 ? 1.15 : 1));
      if (o !== s.hero) { o.hp -= dmg; o.flash = 1; push(o, a, (k.kb || 6) * 6); if (o.hp <= 0) { o.hp = 0; kill(s, o); } else { setState(o, 'hurt', 0.25); o.atk = null; } return; }
      if (k.slow) o.slowT = Math.max(o.slowT, k.slow);
      o.hp -= dmg; s.stats.taken += dmg; s.stats.hitsTaken++; if (s.units.some((b) => b.alive && b.def.boss)) s.stats.bossHits = (s.stats.bossHits || 0) + 1; s.combo = 0; o.flash = 1; if (s.rules.nohit) o.hp = 0;
      push(o, bolt ? { x: bolt.x - bolt.vx, y: bolt.y - bolt.vy } : a, k.kb * 7);
      gainMoon(s, 9);
      ev(s, { type: 'hurt', x: o.x, y: o.y, dmg, id: o.id, big: dmg >= 16 });
      s.hitstop = Math.max(s.hitstop, 0.08);
      if (o.hp <= 0) { o.hp = 0; kill(s, o); return; }
      setState(o, 'hurt', 0.34); o.iframes = 0.55; o.atk = null; o.queued = false;
      return;
    }
    // A foe hit by the hero (or a reflected bolt).
    if (o.iframes > 0 || o.state === 'dead' || o.state === 'spawn') return;
    const src0 = bolt ? { x: bolt.x - bolt.vx, y: bolt.y - bolt.vy } : a;
    // A shieldbearer turns aside cuts from the front; a heavy blow breaks the guard, a cut from behind slips past.
    if (o.def.guard && !(o.guardT > 0) && o.state !== 'hurt' && o.state !== 'down' && o.state !== 'air' && Math.abs(angDiff(Math.atan2(src0.y - o.y, src0.x - o.x), o.ang)) < o.def.guard.arc) {
      if ((k.poise || 0) >= 12 && !bolt) { o.guardT = 2.6; setState(o, 'hurt', 1.1); o.atk = null; push(o, src0, 60); s.hitstop = Math.max(s.hitstop, 0.12); gainMoon(s, 6); ev(s, { type: 'guardbreak', x: o.x, y: o.y, id: o.id }); }
      else { const bd = Math.max(1, Math.round(k.dmg * M.dmg * o.def.guard.mul)); o.hp -= bd; s.stats.dealt += bd; o.flash = 0.4; push(o, src0, 20); s.hitstop = Math.max(s.hitstop, 0.04); ev(s, { type: 'block', x: o.x, y: o.y, id: o.id }); if (o.hp <= 0) { o.hp = 0; kill(s, o); } return; }
    }
    // A duelist turns a light cut from the front aside and strikes back at once; heavy blows and finishers get through.
    if (o.def.counter && !bolt && (o.state === 'idle' || o.state === 'move') && (k.poise || 0) < 12 && !k.finisher && Math.abs(angDiff(Math.atan2(src0.y - o.y, src0.x - o.x), o.ang)) < 1.3 && s.rand() < o.def.counter) {
      s.hitstop = Math.max(s.hitstop, 0.07); setAng(o, Math.atan2(src0.y - o.y, src0.x - o.x)); ev(s, { type: 'counter', x: o.x, y: o.y, id: o.id });
      const ck = o.def.atks.find((x) => x.reach && !x.chainOnly) || o.def.atks[0]; startAttack(s, o, ck); o.st = ck.wind * 0.55; return;
    }
    let mult = M.dmg * (o.state === 'down' ? 1.5 : 1) * (M.exec && o.hp < o.maxHp * 0.25 ? 1.5 : 1);
    if (!bolt && a.riposte) { mult *= 3; a.riposte = false; ev(s, { type: 'riposte', x: o.x, y: o.y }); }
    const dmg = Math.max(1, Math.round(k.dmg * mult * (0.9 + 0.2 * s.rand())));
    o.hp -= dmg; s.stats.dealt += dmg; o.flash = 1; o.lastHit = s.time;
    if (M.thirst) s.hero.hp = Math.min(s.hero.maxHp, s.hero.hp + dmg * M.thirst);
    s.combo++; s.comboT = 1.6; s.stats.maxCombo = Math.max(s.stats.maxCombo, s.combo);
    gainMoon(s, (k.poise || 6) >= 12 ? 5 : 3);
    const src = bolt ? { x: bolt.x - bolt.vx, y: bolt.y - bolt.vy } : a;
    ev(s, { type: 'hit', x: o.x, y: o.y, dmg, id: o.id, heavy: (k.poise || 0) >= 12, combo: s.combo, ang: Math.atan2(o.y - src.y, o.x - src.x), fx: bolt ? 'bolt' : k.fx, finisher: !!k.finisher });
    s.hitstop = Math.max(s.hitstop, k.finisher ? 0.13 : (k.poise || 0) >= 12 ? 0.1 : 0.06);
    if (o.hp <= 0) { o.hp = 0; kill(s, o); return; }
    if (o.def.boss && o.phase === 1 && o.hp <= o.maxHp * 0.5) phaseTwo(s, o);
    // A wraith comes apart when struck and gathers again somewhere else near you.
    if (o.def.fade && o.state !== 'air' && s.rand() < o.def.fade) {
      const an = s.rand() * TAU, c = VS.clampTo(curArena, s.hero.x + Math.cos(an) * 85, s.hero.y + Math.sin(an) * 85, 20);
      ev(s, { type: 'blink', id: o.id, x: o.x, y: o.y }); o.x = c[0]; o.y = c[1]; o.iframes = 0.45; o.atk = null; setState(o, 'idle'); o.cd = 0.45; ev(s, { type: 'blink', id: o.id, x: o.x, y: o.y }); return;
    }
    if (k.slow) o.slowT = Math.max(o.slowT, k.slow);
    if (k.stun && !o.def.boss) o.stunT = Math.max(o.stunT, k.stun);
    else if (k.stun) o.poise -= k.stun * 18;
    const kb = k.kb || 6, launcher = !bolt && (k.finisher || k.fx === 'spin' || k.fx === 'dash');
    if (o.def.minion && (launcher || o.state === 'air')) {
      const first = o.state !== 'air'; if (first) setState(o, 'air');
      o.vz = Math.max(o.vz, launcher ? 270 : 165); o.atk = null; push(o, src, kb * (launcher ? 6 : 2.5));
      ev(s, { type: first ? 'launch' : 'juggle', id: o.id, x: o.x, y: o.y }); return;
    }
    if (o.maxPoise <= 0) { setState(o, 'hurt', Math.max(0.36, o.stunT)); o.atk = null; push(o, src, kb * 15); return; }
    if (o.state === 'down') return;
    o.poise -= k.poise || 6;
    if (o.poise <= 0) { if (o.def.minion) { setState(o, 'hurt', 0.45); o.atk = null; push(o, src, kb * 12); o.poise = o.maxPoise; } else breakPoise(s, o, src); }
    else push(o, src, kb * 2);
  }
  function breakPoise(s, o, src) {
    setState(o, 'down', 1.9); o.atk = null; o.poise = o.maxPoise; push(o, src || s.hero, 70); gainMoon(s, 8);
    if (o.def.boss) { s.hitstop = Math.max(s.hitstop, 0.16); ev(s, { type: 'impact', size: 'big', x: o.x, y: o.y }); }
    ev(s, { type: 'break', x: o.x, y: o.y, id: o.id });
  }
  function phaseTwo(s, o) { o.phase = 2; o.windMul = 0.86; o.spdMul = 1.15; o.aura = true; o.tauntT = 1.1; s.freeze = Math.max(s.freeze, 1.1); ev(s, { type: 'phase', id: o.id, key: o.key }); }
  function kill(s, o) {
    if (o.def.blast && !o.exploded) {
      o.exploded = true; const B = o.def.blast;
      ev(s, { type: 'explode', x: o.x, y: o.y, r: B.r });
      for (const f of s.units.slice()) { if (f === o || !f.alive || f.ally) continue; const d = Math.hypot(f.x - o.x, f.y - o.y); if (d > B.r + f.rad) continue;
        if (f.team === 'foe') { directDamage(s, f, B.dmg); if (f.alive && f.def.minion) { setState(f, 'hurt', 0.5); push(f, o, 120); } }
        else if (o.atk && o.atk.explode && !(f.iframes > 0)) { /* the contact blow already hit the hero */ } }
    }
    if (o.state === 'spawn') { const c = VS.clampTo(curArena, o.x, o.y, o.rad * 0.6); o.x = c[0]; o.y = c[1]; }
    o.alive = false; setState(o, 'dead'); o.atk = null;
    if (o.team === 'foe') { const h = s.hero; push(o, h, o.def.boss ? 90 : 210); o.vz = Math.max(o.vz, o.def.boss ? 60 : 150); }
    ev(s, { type: 'kill', id: o.id, x: o.x, y: o.y, boss: !!o.def.boss, hero: o.team === 'hero' });
    if (o.ally) { ev(s, { type: 'vanish', id: o.id, x: o.x, y: o.y }); return; }
    if (o === s.hero) { s.endT = 2.0; s.combo = 0; return; }
    if (o.team === 'foe') { const h = s.hero; if (h.alive) { const n = Math.max(2, Math.round(h.maxHp * s.mods.killHeal)); h.hp = Math.min(h.maxHp, h.hp + n); ev(s, { type: 'heal', x: h.x, y: h.y, n }); } gainMoon(s, o.def.boss ? 0 : 5); s.kills = (s.kills || 0) + 1; }
    if (o.def.boss) { s.slow = 0.25; s.slowT = 0.9; ev(s, { type: 'impact', size: 'big', x: o.x, y: o.y }); }
    else if (o.team === 'foe' && !(s.reinf && s.reinf.length) && !foes(s).length) { s.slow = 0.22; s.slowT = 0.7; ev(s, { type: 'finisher', x: o.x, y: o.y }); }
  }

  // ---- the moon arts -----------------------------------------------------------------------
  VS.ART = { moon: { dur: 3.4, name: 'RED MOON' }, ldx: { dur: 6.4, name: 'LAST DITCH EFFORT' }, petals: { dur: 4.2, name: 'THOUSAND PETALS' }, storm: { dur: 4.2, name: "HEAVEN'S SPEAR" }, cuts: { dur: 4.2, name: 'HUNDRED CUTS' } };
  function startArt(s) {
    if (!s.mods.can.art) return false;
    const h = s.hero; if (s.moon < 100 || !h.alive || s.cine || s.result) return false;
    const last = VS.ldxReady(s), art = s.heroDef.art || 'moon', kind = art === 'moon' ? (last ? 'ldx' : 'moon') : art;
    const tg = foes(s).filter((o) => o.state !== 'dead');
    if (!tg.length) return false;
    tg.sort((a, b) => (b.def.boss ? 1 : 0) - (a.def.boss ? 1 : 0) || dist(a, h) - dist(b, h));
    s.cine = { kind, last, t: 0, dur: VS.ART[kind].dur, targets: tg.map((o) => o.id), main: tg[0].id, hp0: tg[0].hp / tg[0].maxHp };
    for (const z of s.hazards) if (z.team === 'foe') z.t = 1e9;
    s.moon = 0; s.stats.arts++; if (kind === 'ldx' || (last && art !== 'moon')) s.stats.ldx++;
    setState(h, 'idle'); h.atk = null; setAng(h, Math.atan2(tg[0].y - h.y, tg[0].x - h.x));
    for (const b of s.bolts) b.life = 0;
    ev(s, { type: 'art', kind });
    return true;
  }
  VS.artDamage = function (s, kind, o) {
    if (o.def.minion) return 9999;
    const big = kind === 'ldx' || (kind !== 'moon' && s.cine && s.cine.last);
    return Math.round((big ? 60 + 0.32 * o.maxHp : (26 + 0.15 * o.maxHp) * (kind === 'moon' ? 1 : 1.25)) * s.mods.dmg);
  };
  function endArt(s) {
    const c = s.cine, h = s.hero;
    for (const id of c.targets) {
      const o = s.units.find((u) => u.id === id); if (!o || !o.alive) continue;
      const dmg = VS.artDamage(s, c.kind, o);
      o.hp -= dmg; s.stats.dealt += Math.min(dmg, o.hp + dmg); o.flash = 1;
      ev(s, { type: 'hit', x: o.x, y: o.y, dmg, id: o.id, heavy: true, art: true, ang: Math.atan2(o.y - h.y, o.x - h.x) });
      if (o.hp <= 0) { o.hp = 0; kill(s, o); continue; }
      if (o.def.boss && o.phase === 1 && o.hp <= o.maxHp * 0.5) { o.phase = 2; o.windMul = 0.86; o.spdMul = 1.15; ev(s, { type: 'phase', id: o.id, key: o.key, quiet: true }); }
      setState(o, 'down', 1.7); o.atk = null; push(o, h, 80);
    }
    s.cine = null;
    if (c.kind === 'ldx' || (c.last && c.kind !== 'moon')) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.3);
    h.iframes = 1.0;
    ev(s, { type: 'artEnd', kind: c.kind });
  }

  // ---- arenas -------------------------------------------------------------------------------
  // The shape of the current area: circle, rect, donut (a ring around a pit) or cross.
  const arenaOf = (s) => D.ARENAS[(s.def.arenas || [])[s.area]] || D.ARENAS.ring;
  VS.arenaOf = arenaOf;
  function clampRect(x, y, hw, hh, m) { return [clamp(x, -hw + m, hw - m), clamp(y, -hh + m, hh - m)]; }
  VS.clampTo = function (A, x, y, m) {
    if (A.shape === 'rect') return clampRect(x, y, A.hw, A.hh, m);
    if (A.shape === 'cross') {
      const inH = Math.abs(x) <= A.arm - m && Math.abs(y) <= A.hw - m, inV = Math.abs(x) <= A.hw - m && Math.abs(y) <= A.arm - m;
      if (inH || inV) return [x, y];
      const a = clampRect(x, y, A.arm, A.hw, m), b = clampRect(x, y, A.hw, A.arm, m);
      return Math.hypot(a[0] - x, a[1] - y) < Math.hypot(b[0] - x, b[1] - y) ? a : b;
    }
    const R = A.r - m, d = Math.hypot(x, y) || 0.001;
    if (d > R) return [x * R / d, y * R / d];
    if (A.shape === 'donut' && d < A.inner + m) { const r = A.inner + m; return d < 0.01 ? [r, 0] : [x * r / d, y * r / d]; }
    return [x, y];
  };
  VS.inside = (A, x, y, m) => { const c = VS.clampTo(A, x, y, m || 0); return Math.abs(c[0] - x) < 0.01 && Math.abs(c[1] - y) < 0.01; };
  // Where the way on opens and where the hero arrives.
  VS.exitOf = (A) => A.shape === 'rect' ? (A.hw > A.hh * 2 ? { x: A.hw - 34, y: 0 } : { x: 0, y: -A.hh + 30 }) : A.shape === 'cross' ? { x: 0, y: -A.arm + 34 } : { x: 0, y: -A.r + 34 };
  VS.entryOf = (A) => A.shape === 'rect' ? (A.hw > A.hh * 2 ? { x: -A.hw + 34, y: 0 } : { x: 0, y: A.hh - 34 }) : A.shape === 'cross' ? { x: 0, y: A.arm - 40 } : { x: 0, y: A.r - 40 };
  // Side gates the foes run in through.
  VS.sideGates = function (A) {
    if (A.shape === 'rect') return A.hw > A.hh * 2 ? [{ x: A.hw + 30, y: 0, tx: A.hw - 50, ty: 0 }, { x: -A.hw - 30, y: 0, tx: -A.hw + 50, ty: 0 }] : [{ x: -A.hw - 30, y: 0, tx: -A.hw + 50, ty: 0 }, { x: A.hw + 30, y: 0, tx: A.hw - 50, ty: 0 }, { x: 0, y: -A.hh - 30, tx: 0, ty: -A.hh + 50 }];
    if (A.shape === 'cross') return [{ x: -A.arm - 30, y: 0, tx: -A.arm + 50, ty: 0 }, { x: A.arm + 30, y: 0, tx: A.arm - 50, ty: 0 }, { x: 0, y: -A.arm - 30, tx: 0, ty: -A.arm + 50 }];
    return [0, 1, 2, 3, 4].map((i) => { const a = -Math.PI / 2 + (i - 2) * 0.9; return { x: Math.cos(a) * (A.r + 30), y: Math.sin(a) * (A.r + 30), tx: Math.cos(a) * (A.r - 50), ty: Math.sin(a) * (A.r - 50) }; });
  };
  let curArena = D.ARENAS.ring;
  function keepIn(u) { if (u.state === 'spawn' && u.mode === 'side') return; const c = VS.clampTo(curArena, u.x, u.y, u.rad * 0.6); u.x = c[0]; u.y = c[1]; }
  // ---- waves --------------------------------------------------------------------------------
  function spawnPoint(s, A, i) {
    const h = s.hero;
    for (let k = 0; k < 40; k++) {
      const x = (s.rand() * 2 - 1) * 260, y = (s.rand() * 2 - 1) * 260;
      if (VS.inside(A, x, y, 30) && Math.hypot(x - h.x, y - h.y) > 95) return { x, y };
    }
    const c = VS.clampTo(A, -h.x, -h.y, 30); return { x: c[0], y: c[1] };
  }
  // A wave comes in pulses split by '+': the next pulse charges in when one foe is left standing.
  function groupsOf(list) { const g = [[]]; for (const k of list) { if (k === '+') g.push([]); else g[g.length - 1].push(k); } return g.filter((x) => x.length); }
  function spawnWave(s) {
    s.wave++;
    const groups = groupsOf(s.waves[s.wave]), boss = s.hasBoss && s.wave === s.waves.length - 1;
    s.reinf = groups.slice(1);
    spawnGroup(s, groups[0], boss, !!s.rules.elites && !boss);
    if (boss) { s.freeze = 1.9; ev(s, { type: 'boss', keys: groups[0].slice() }); }
    else ev(s, { type: 'wave', n: s.wave + 1, of: s.waves.length - 1 });
  }
  function spawnGroup(s, list, boss, elite) {
    const h = s.hero, A = arenaOf(s), gates = VS.sideGates(A).sort((a, b) => Math.hypot(b.x - h.x, b.y - h.y) - Math.hypot(a.x - h.x, a.y - h.y));
    list.forEach((key, i) => {
      const def = D.FOES[key], mode = def.boss ? (key === 'umbral' ? 'rift' : 'drop') : A.spawn[i % A.spawn.length];
      let x, y, tx, ty;
      if (mode === 'side') { const g = gates[i % gates.length]; x = g.x; y = g.y; const c = VS.clampTo(A, g.tx + (s.rand() - 0.5) * 30, g.ty + (s.rand() - 0.5) * 30, 20); tx = c[0]; ty = c[1]; }
      else { const p = def.boss ? (() => { const c = VS.clampTo(A, -h.x * 0.6, -h.y * 0.6 - 40, 40); return { x: c[0], y: c[1] }; })() : spawnPoint(s, A, i); x = p.x; y = p.y; }
      const u = makeUnit(s, 'foe', key, def, x, y, 0);
      const sk = s.def.scale || { hp: 1, dmg: 1 }, DF = VS.DIFF; u.hp = u.maxHp = Math.round(def.hp * sk.hp * (def.boss ? DF.bossHp : DF.hp)); u.dmgMul = sk.dmg * DF.dmg;
      setAng(u, Math.atan2(h.y - u.y, h.x - u.x)); u.orbit = (s.rand() < 0.5 ? -1 : 1); u.cd = 0.4 + i * 0.3 + (def.boss ? 0.6 : 0);
      if (def.boss) s.bossIds.push(u.id);
      // An elite leads each wave of reinforcements: bigger, tougher, harder hitting, wreathed in red.
      if (elite && i === 0 && !def.boss) { u.elite = true; u.hp = u.maxHp = Math.round(u.maxHp * 2.2); u.dmgMul *= 1.25; u.scale *= 1.18; u.rad *= 1.18; u.maxPoise = (u.maxPoise || 0) * 1.6 || u.maxPoise; }
      // The entrance: rise from a rift, drop from the sky, or run in through a side gate.
      u.mode = mode; u.from = { x, y }; u.to = mode === 'side' ? { x: tx, y: ty } : { x, y };
      if (mode === 'side') setAng(u, Math.atan2(ty - y, tx - x));
      setState(u, 'spawn', def.boss ? 1.5 : mode === 'side' ? 1.1 + i * 0.2 : mode === 'drop' ? 0.75 + i * 0.18 : 0.85 + i * 0.22);
      ev(s, { type: 'spawn', id: u.id, x: u.to.x, y: u.to.y, fx: x, fy: y, boss: !!def.boss, mode, dur: u.dur });
    });
  }
  // A cleared area opens the way on: a gate, a stairway or a rift at the back of the ring.
  function openPortal(s) {
    const e = VS.exitOf(arenaOf(s)), x = e.x, y = e.y;
    s.portal = { x, y, t: 0, kind: s.def.portal || 'rift' };
    ev(s, { type: 'portal', x, y, kind: s.portal.kind });
  }
  VS.TRANSIT = { into: 0.45, swap: 1.05, dur: 1.6 };
  function transit(s, dt) {
    const h = s.hero, T = VS.TRANSIT, tr = s.transit, p = s.portal || tr.p;
    const prev = tr.t; tr.t += dt;
    if (tr.t < T.into) { const dx = p.x - h.x, dy = p.y - h.y, d = Math.hypot(dx, dy); if (d > 1) { setAng(h, Math.atan2(dy, dx)); h.x += dx / d * Math.min(d, 90 * dt); h.y += dy / d * Math.min(d, 90 * dt); } if (h.state !== 'move') setState(h, 'move'); }
    if (prev < T.swap && tr.t >= T.swap) {
      s.area++; s.units = s.units.filter((u) => u === h || u.alive); s.bolts = []; s.portal = null;
      curArena = arenaOf(s); const en = VS.entryOf(curArena); h.x = en.x; h.y = en.y; setAng(h, Math.atan2(-en.y, -en.x)); h.kvx = h.kvy = 0; h.iframes = 0; setState(h, 'move'); s.entry = { x: en.x, y: en.y, t: 0, kind: s.def.portal || 'rift' };
      ev(s, { type: 'area', n: s.area });
    }
    if (tr.t >= T.swap) { const d = dir(h.ang); h.x += d[0] * 46 * dt; h.y += d[1] * 46 * dt; }
    if (tr.t >= T.dur) { s.transit = null; setState(h, 'idle'); s.waveT = 0.35; }
    setFrame(s, h);
  }

  // ---- foe brains ---------------------------------------------------------------------------
  function fits(u, k, d) {
    if (k.range) return d >= k.range[0] * u.scale && d <= k.range[1];
    if (k.zone || k.summon || k.rain || k.quake || k.clones || k.tornado) return d <= 340;
    const r = k.aoe ? (k.at || 0) * u.scale + k.aoe * u.scale * 0.75 : k.reach * u.scale + 6;
    return d <= r;
  }
  function foeThink(s, u, dt) {
    u.sigCd -= dt; u.summonCd -= dt; if (u.guardT > 0) u.guardT -= dt;
    // A paladin's prayer: every few seconds the foes around him mend.
    if (u.def.heal && u.state !== 'spawn') {
      const Hh = u.def.heal; u.healCd = (u.healCd == null ? Hh.every * 0.6 : u.healCd) - dt;
      if (u.healCd <= 0) { u.healCd = Hh.every; let n = 0; for (const f of foes(s)) if (!f.def.boss && f.state !== 'spawn' && dist(f, u) <= Hh.r && f.hp < f.maxHp) { f.hp = Math.min(f.maxHp, f.hp + f.maxHp * Hh.pct); n++; } ev(s, { type: 'healpulse', x: u.x, y: u.y, r: Hh.r, n }); }
    }
    const h = targetOf(s, u);
    if (!h) { if (u.state === 'idle' || u.state === 'move') { setAng(u, u.ang + dt * 0.6); if (u.state !== 'idle') setState(u, 'idle'); } return; }
    u.target = h;
    if (u.state === 'spawn' || u.state === 'air' || u.stunT > 0) return;
    if (u.def.passive) { if (u.state === 'move') setState(u, 'idle'); setAng(u, Math.atan2(h.y - u.y, h.x - u.x)); return; }   // training dummies stand still
    if (u.tauntT > 0 && (u.state === 'idle' || u.state === 'move')) { if (u.state !== 'idle') setState(u, 'idle'); return; }
    // During a wind-up the foe keeps turning toward the hero, slowly: step aside and it misses.
    if (u.state === 'attack' && u.st < u.atk.wind * u.windMul * 0.75 && !u.atk.blink) {
      const want = Math.atan2(h.y - u.y, h.x - u.x), d = angDiff(want, u.ang), turn = 2.6 * dt;
      setAng(u, u.ang + clamp(d, -turn, turn));
    }
    if (u.state !== 'idle' && u.state !== 'move') return;
    const dx = h.x - u.x, dy = h.y - u.y, d = Math.hypot(dx, dy);
    setAng(u, Math.atan2(dy, dx));
    u.cd -= dt;
    const busy = s.units.filter((o) => o.team === 'foe' && o.alive && o.state === 'attack' && o.def.minion).length;
    if (u.cd <= 0 && (u.def.boss || busy < 3)) {
      // A boss's signature move, every so often, announced by its title card.
      const sigs = u.def.atks.filter((k) => k.sig && (!k.phase || u.phase >= k.phase) && fits(u, k, d));
      if (sigs.length && u.sigCd <= 0 && s.rand() < 0.5) {
        const k = sigs[Math.floor(s.rand() * sigs.length)]; u.sigCd = 9 + s.rand() * 4 - (u.phase === 2 ? 2 : 0);
        ev(s, { type: 'bossArt', key: u.key, name: k.sig, id: u.id }); s.freeze = Math.max(s.freeze, 1.05); startAttack(s, u, k); return;
      }
      const opts = u.def.atks.filter((k) => !k.chainOnly && !k.sig && (!k.rare || u.summonCd <= 0) && (!k.phase || u.phase >= k.phase) && fits(u, k, d));
      if (opts.length) { startAttack(s, u, opts[Math.floor(s.rand() * opts.length)]); return; }
    }
    // Where to stand: in reach (or hanging back while others swing), circling a little.
    const melee = u.def.atks.filter((k) => !k.range && !k.chainOnly && (!k.phase || u.phase >= k.phase));
    let want = melee.length ? Math.min(...melee.map((k) => (k.aoe ? (k.at || 0) + k.aoe * 0.5 : k.reach) * u.scale)) * 0.8 + h.rad : 100;
    if (u.key === 'umbral') want = 110;
    if (u.def.keep) want = u.def.keep;
    if (u.def.minion && busy >= 3) want = 62 + (u.id % 3) * 12;
    const nx = d > 0 ? dx / d : 1, ny = d > 0 ? dy / d : 0;
    let vx = 0, vy = 0;
    if (Math.abs(d - want) > 5) { const k = d > want ? 1 : -0.7; vx += nx * k; vy += ny * k; }
    if (u.cd > 0 || (u.def.minion && busy >= 3)) { vx += -ny * u.orbit * 0.45; vy += nx * u.orbit * 0.45; }
    for (const o of s.units) {
      if (o === u || o.team !== 'foe' || !o.alive) continue;
      const ox = u.x - o.x, oy = u.y - o.y, od = Math.hypot(ox, oy), min = u.rad + o.rad + 8;
      if (od < min && od > 0.01) { vx += ox / od * (min - od) / min * 1.6; vy += oy / od * (min - od) / min * 1.6; }
    }
    const n = Math.hypot(vx, vy), spd = u.def.spd * u.spdMul * (u.slowT > 0 ? 0.5 : 1);
    if (n > 0.08) { u.x += vx / Math.max(1, n) * spd * dt; u.y += vy / Math.max(1, n) * spd * dt; moveDir(u, vx, vy); if (u.state !== 'move') setState(u, 'move'); }
    else if (u.state !== 'idle') setState(u, 'idle');
  }

  // ---- allies (Wisp's clones) --------------------------------------------------------------------
  function allyThink(s, u, dt) {
    u.life -= dt; if (u.life <= 0) { kill(s, u); return; }
    if (u.state !== 'idle' && u.state !== 'move') return;
    const o = targetOf(s, u); u.cd -= dt;
    if (!o) { const h = s.hero, dd = dist(h, u); if (dd > 30) { u.x += (h.x - u.x) / dd * u.def.spd * dt; u.y += (h.y - u.y) / dd * u.def.spd * dt; setAng(u, Math.atan2(h.y - u.y, h.x - u.x)); if (u.state !== 'move') setState(u, 'move'); } else if (u.state !== 'idle') setState(u, 'idle'); return; }
    const dx = o.x - u.x, dy = o.y - u.y, d = Math.hypot(dx, dy); setAng(u, Math.atan2(dy, dx));
    if (d < 26 + o.rad && u.cd <= 0) { startAttack(s, u, u.def.atks[Math.floor(s.rand() * u.def.atks.length)]); u.cd = 0.15; return; }
    if (d > 20 + o.rad) { u.x += dx / d * u.def.spd * dt; u.y += dy / d * u.def.spd * dt; u.mdir = 'f'; if (u.state !== 'move') setState(u, 'move'); }
  }
  // ---- the hero -----------------------------------------------------------------------------
  function heroStep(s, h, dt, inp) {
    const M = s.mods, H = s.heroDef;
    if (!h.alive || h.leap) return;
    const can = M.can;
    if (inp.art && can.art && startArt(s)) return;
    const free = h.state === 'idle' || h.state === 'move';
    if (!can.dodge) inp.dodge = false; if (!can.parry) inp.parry = false; if (!can.heavy) inp.heavy = false;
    if (!can.skill1) inp.s1 = false; if (!can.skill2) inp.s2 = false;
    h.comboWin -= dt;
    if (inp.atk) { if (h.state === 'attack') h.queued = true; else h.bufAtk = 0.18; }
    if (inp.dodge) h.bufDodge = 0.16;
    if (inp.parry) h.bufParry = 0.12;
    if (inp.heavy) h.bufHeavy = 0.18;
    h.bufHeavy = (h.bufHeavy || 0) - dt;
    h.bufAtk = (h.bufAtk || 0) - dt; h.bufDodge = (h.bufDodge || 0) - dt; h.bufParry = (h.bufParry || 0) - dt;
    let mx = inp.mx || 0, my = inp.my || 0; const mn = Math.hypot(mx, my); if (mn > 1) { mx /= mn; my /= mn; }
    if (h.bufAtk > 0 && can.dodge && ((h.state === 'dodge' && h.st > h.dur * 0.35) || (free && s.time - (h.dodgeEnd || -9) < 0.14))) {
      h.bufAtk = 0; h.combo = 0; h.comboWin = 0; startAttack(s, h, H.dashCut); ev(s, { type: 'dashCut', x: h.x, y: h.y }); return;
    }
    const canCancel = h.state === 'attack' && h.st > h.atk.wind + 0.04;
    if ((free || canCancel) && h.bufDodge > 0) {
      h.bufDodge = 0; setState(h, 'dodge', H.dodge.dur); h.atk = null; h.queued = false; h.perfectDone = false;
      if (mn > 0.2) setAng(h, Math.atan2(my, mx)); else if (s.aim != null) setAng(h, s.aim);
      h.dodgeDir = dir(h.ang);
      ev(s, { type: 'dodge', x: h.x, y: h.y }); return;
    }
    if (free && h.bufParry > 0) { h.bufParry = 0; setState(h, 'parry', H.parry.dur); ev(s, { type: 'guard', x: h.x, y: h.y }); return; }
    // Skills (R and F): a short cast, the effect on its contact frame, then the cooldown.
    for (let i = 0; i < 2; i++) if ((free || canCancel) && inp['s' + (i + 1)] && s.cds[i] <= 0 && H.skills && H.skills[i]) {
      const sk = H.skills[i]; s.cds[i] = sk.cd * M.quick; h.combo = 0; h.queued = false;
      startAttack(s, h, { clip: sk.clip, wind: sk.kind === 'smoke' || sk.kind === 'blink' ? 0.04 : 0.12, recover: sk.kind === 'leapSlam' ? 0.05 : 0.22, skill: sk });
      return;
    }
    if (free && h.bufHeavy > 0) { h.bufHeavy = 0; h.combo = 0; h.comboWin = 0; startAttack(s, h, H.heavy); return; }
    if (free && h.bufAtk > 0) { h.bufAtk = 0; h.combo = h.comboWin > 0 ? (h.combo + 1) % M.combo : 0; startAttack(s, h, H.combo[h.combo]); return; }
    if (free) {
      const back = s.aim != null && mn > 0.2 && Math.cos(angDiff(Math.atan2(my, mx), s.aim)) < -0.55;
      const sp = H.spd * (back ? 0.8 : 1) * (h.slowT > 0 ? 0.6 : 1); h.x += mx * sp * dt; h.y += my * sp * dt;
      if (s.aim != null) { setAng(h, s.aim); if (mn > 0.2) moveDir(h, mx, my); } else if (mn > 0.2) { setAng(h, Math.atan2(my, mx)); h.mdir = 'f'; }
      if (mn > 0.2) { if (h.state !== 'move') setState(h, 'move'); } else if (h.state !== 'idle') setState(h, 'idle');
    }
  }

  // ---- the step ------------------------------------------------------------------------------
  // input: { mx, my (−1..1), atk, dodge, parry, art, skip (pressed this step) }
  function step(s, dtReal, input) {
    const inp = input || {};
    s.events.length = 0;
    if (s.result) return s;
    if (s.cine) {
      if (inp.skip && s.cine.t < s.cine.dur - 0.45) s.cine.t = s.cine.dur - 0.45;
      s.cine.t += dtReal;
      if (s.cine.t >= s.cine.dur) endArt(s);
      return s;
    }
    s.t += dtReal;
    if (s.freeze > 0) { s.freeze -= dtReal; for (const u of s.units) { if (u.tauntT > 0) u.tauntT -= dtReal; setFrame(s, u); } return s; }
    if (s.hitstop > 0) { s.hitstop -= dtReal; return s; }
    let dt = dtReal;
    if (s.slowT > 0) { s.slowT -= dtReal; dt *= s.slow; }
    s.time += dt;
    const h = s.hero;
    // A timed challenge: the clock running out ends the run.
    if (s.rules.time && s.time > s.rules.time && h.alive && !s.result && s.endT <= 0) { h.hp = 0; ev(s, { type: 'timeout' }); kill(s, h); }
    s.aim = inp.aim != null ? inp.aim : null; curArena = arenaOf(s);
    if (s.transit) { transit(s, dtReal); return s; }

    heroStep(s, h, dt, inp);
    s.cds[0] = Math.max(0, s.cds[0] - dt); s.cds[1] = Math.max(0, s.cds[1] - dt); if (s.invisT > 0) s.invisT -= dt;
    // Thunder Drop: the leap, then the slam where he lands.
    if (h.leap) {
      const L = h.leap; L.t += dt; const k = Math.min(1, L.t / L.dur); h.x = L.fx + (L.tx - L.fx) * k; h.y = L.fy + (L.ty - L.fy) * k; h.z = Math.sin(k * Math.PI) * 70;
      if (k >= 1) { h.z = 0; h.vz = 0; h.leap = null; areaHit(s, h, h.x, h.y, L.sk.r, { dmg: L.sk.dmg, poise: L.sk.poise, kb: 30, stun: L.sk.stun, fx: 'spin' }); ev(s, { type: 'thunder', x: h.x, y: h.y, r: L.sk.r }); s.hitstop = Math.max(s.hitstop, 0.08); setState(h, 'idle'); }
    }
    for (const u of s.units) if (u.alive && u.team === 'foe') foeThink(s, u, dt); else if (u.alive && u.ally) allyThink(s, u, dt);
    for (const u of s.units) {
      if (!u.alive) continue;
      if (u.slowT > 0) u.slowT -= dt; if (u.stunT > 0) u.stunT -= dt;
      if (u.def.clone) { u.life -= dt; if (u.life <= 0) { u.hp = 0; kill(s, u); } }
    }
    // Hazards: zones that tick, strikes that land after their warning, tornadoes that chase.
    for (const z of s.hazards) {
      z.t += dt; if (z.t < z.delay) continue;
      const victims = s.units.filter((o) => o.alive && o.team !== z.team && o.state !== 'spawn' && Math.hypot(o.x - z.x, o.y - z.y) <= z.r + o.rad);
      if (z.kind === 'strike' && !z.done) {
        z.done = true; ev(s, { type: 'strike', x: z.x, y: z.y, r: z.r, fx: z.fx, quiet: z.quiet, team: z.team });
        for (const o of victims) hit(s, { team: z.team, x: z.x, y: z.y, ang: 0, phase: 1, def: {}, dmgMul: 1, face: 1 }, o, { dmg: z.dmg, kb: 16, poise: 12, slow: z.slow, unparry: true });
        if (z.then) addHazard(s, Object.assign({ team: z.team, x: z.x, y: z.y }, z.then));
      } else if (z.kind === 'zone') {
        z.tick -= dt; if (z.tick <= 0) { z.tick = 0.5; for (const o of victims) { directDamage(s, o, z.dps * 0.5); if (z.slow) o.slowT = Math.max(o.slowT, z.slow); } }
      } else if (z.kind === 'tornado') {
        const tg = s.hero, want = Math.atan2(tg.y - z.y, tg.x - z.x); z.ang += clamp(angDiff(want, z.ang), -1.2 * dt, 1.2 * dt);
        z.x += Math.cos(z.ang) * z.speed * dt; z.y += Math.sin(z.ang) * z.speed * dt; const c = VS.clampTo(curArena, z.x, z.y, 8); z.x = c[0]; z.y = c[1];
        z.tick -= dt; if (z.tick <= 0 && victims.length) { z.tick = 0.6; for (const o of victims) hit(s, { team: z.team, x: z.x, y: z.y, ang: 0, phase: 1, def: {}, dmgMul: 1, face: 1 }, o, { dmg: z.dmg, kb: 30, poise: 10, unparry: true }); }
      }
    }
    s.hazards = s.hazards.filter((z) => (z.kind === 'strike' ? !z.done : z.t < z.delay + z.dur));

    for (const u of s.units) {
      u.st += dt; u.iframes = Math.max(0, u.iframes - dt); u.flash = Math.max(0, u.flash - dt * 5);
      if (u.tauntT > 0) u.tauntT -= dt; if (u.wallT > 0) u.wallT -= dt;
      if (u.kvx || u.kvy) { u.x += u.kvx * dt; u.y += u.kvy * dt; const f = Math.exp(-(u.state === 'air' || u.state === 'dead' ? 4 : 9) * dt); u.kvx *= f; u.kvy *= f; if (Math.hypot(u.kvx, u.kvy) < 2) u.kvx = u.kvy = 0; }
      if (u.z > 0 || u.vz > 0) {
        u.vz -= 780 * dt; u.z = Math.max(0, u.z + u.vz * dt);
        if (u.z <= 0 && u.vz < 0) { u.vz = 0; if (u.state === 'air') { setState(u, 'down', 0.75); ev(s, { type: 'land', id: u.id, x: u.x, y: u.y }); } }
      }
      if (u.state === 'attack') {
        const k = u.atk, w = k.wind * u.windMul, prev = u.st - dt;
        if (k.lunge) {
          const a = w - 0.1, b = w + 0.14, d = dir(u.ang);
          if (u.st > a && prev < b) { const f = Math.min(u.st, b) - Math.max(prev, a); u.x += d[0] * k.lunge / 0.24 * f; u.y += d[1] * k.lunge / 0.24 * f; }
          if (u.st >= w - 0.04 && prev < b) for (const o of s.units) if (o.team !== u.team && o.alive && u.hits.indexOf(o.id) < 0 && inReach(u, k, o)) { u.hits.push(o.id); hit(s, u, o, k); }
          if (prev < w && u.st >= w && u === s.hero) ev(s, { type: 'swing', id: u.id, clip: k.clip });
        } else if (prev < w && u.st >= w) {
          if (k.step && u === s.hero) { const d = dir(u.ang); u.x += d[0] * k.step; u.y += d[1] * k.step; }
          contact(s, u, k);
        }
        if (u.state === 'attack' && u.st >= w + k.recover * u.windMul) {
          if (u === s.hero) {
            if (u.queued && u.combo + 1 < s.mods.combo) { u.queued = false; u.combo++; startAttack(s, u, s.heroDef.combo[u.combo]); }
            else { u.queued = false; setState(u, 'idle'); u.comboWin = 0.32; u.atk = null; }
          } else if (u.ally) { setState(u, 'idle'); u.atk = null; }
          else {
            const nx = k.next != null ? u.def.atks[k.next] : null;
            if (nx && h.alive && dist(h, u) < 70 * u.scale) startAttack(s, u, nx);
            else { setState(u, 'idle'); u.atk = null; u.cd = u.def.boss ? (0.35 + s.rand() * 0.7) * (u.phase === 2 ? 0.65 : 1) : 0.9 + s.rand() * 1.0; }
          }
        }
      } else if (u.state === 'dodge') {
        const k = u.st / u.dur, sp = s.mods.dodgeDist / u.dur * 1.6 * (1 - k);
        u.x += u.dodgeDir[0] * sp * dt; u.y += u.dodgeDir[1] * sp * dt;
        const I = s.heroDef.dodge.iframes; u.iframes = u.st >= I[0] && u.st <= I[1] ? 0.02 : u.iframes;
        if (u.st >= u.dur) { setState(u, 'idle'); u.dodgeEnd = s.time; }
      } else if ((u.state === 'parry' || u.state === 'hurt' || u.state === 'down') && u.st >= u.dur) {
        setState(u, 'idle'); if (u.team === 'foe') u.cd = Math.min(u.cd, 0.25);
      } else if (u.state === 'spawn') {
        u.iframes = 0.1;
        if (u.mode === 'side') { const k = Math.min(1, u.st / u.dur); u.x = u.from.x + (u.to.x - u.from.x) * k; u.y = u.from.y + (u.to.y - u.from.y) * k; }
        if (u.st >= u.dur) { setState(u, 'idle'); ev(s, { type: 'landed', id: u.id, x: u.x, y: u.y, boss: !!u.def.boss }); if (u.def.boss) { u.tauntT = 0.9; u.cd += 0.6; }
          if (u.def.boss && u.mode === 'drop') { s.hitstop = Math.max(s.hitstop, 0.12); ev(s, { type: 'impact', size: 'big', x: u.x, y: u.y }); } }
      } else if (u.state === 'dead') u.deadT += dt;
      if (u.team === 'foe' && u.def.boss && u.alive && u.state !== 'down' && s.time - u.lastHit > 2.4) u.poise = u.maxPoise;
      const px = u.x, py = u.y, sp0 = Math.hypot(u.kvx, u.kvy);
      keepIn(u);
      // Thrown hard into an edge: bounce off it, take a knock.
      if (u.team === 'foe' && u.alive && sp0 > 150 && u.wallT <= 0 && Math.hypot(u.x - px, u.y - py) > 0.5) {
        u.kvx *= -0.45; u.kvy *= -0.45; u.wallT = 0.4; const dmg = Math.round(4 * s.mods.dmg); u.hp -= dmg; s.stats.dealt += dmg; u.flash = 1; s.hitstop = Math.max(s.hitstop, 0.05);
        ev(s, { type: 'wall', id: u.id, x: u.x, y: u.y, dmg }); if (u.hp <= 0) { u.hp = 0; kill(s, u); }
      }
      setFrame(s, u);
    }

    // Bolts.
    for (const b of s.bolts) {
      b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (Math.hypot(b.x, b.y) > 420) b.life = 0;
      if (b.life <= 0) continue;
      for (const o of s.units) {
        if (o.team === b.team || !o.alive || o.state === 'spawn' || (b.hitIds && b.hitIds.indexOf(o.id) >= 0) || Math.hypot(o.x - b.x, o.y - b.y) > (b.r || 6) + o.rad) continue;
        const r = hit(s, { ang: Math.atan2(b.vy, b.vx), phase: 1, def: {}, riposte: false, x: b.x, y: b.y, team: b.team, dmgMul: 1 }, o, { dmg: b.dmg, kb: b.kb, poise: b.poise || 14, slow: b.slow, stun: b.stun, unparry: b.unparry }, b);
        if (r === 'reflect') break;
        if (o === s.hero && o.state === 'dodge' && o.iframes > 0) continue;
        if (b.hitIds) b.hitIds.push(o.id);
        if (b.burst) { for (const o2 of s.units) if (o2 !== o && o2.alive && o2.team !== b.team && o2.state !== 'spawn' && Math.hypot(o2.x - b.x, o2.y - b.y) <= b.burst + o2.rad) hit(s, { ang: 0, phase: 1, def: {}, x: b.x, y: b.y, team: b.team, dmgMul: 1 }, o2, { dmg: Math.round(b.dmg * 0.6), kb: b.kb, poise: 8 }, b); }
        if (b.ground) addHazard(s, { kind: 'zone', team: b.team, x: b.x, y: b.y, r: b.ground.r, dur: b.ground.dur, dps: b.ground.dps, fx: b.ground.fx });
        if (!b.pierce) { b.life = 0; ev(s, { type: 'boltHit', x: b.x, y: b.y, fx: b.fx, burst: b.burst, burstFx: b.burstFx }); break; }
      }
      if (b.life > 0 && b.t > 0.05 && !VS.inside(curArena, b.x, b.y, -20)) { b.life = 0; if (b.ground) addHazard(s, { kind: 'zone', team: b.team, x: b.x, y: b.y, r: b.ground.r, dur: b.ground.dur, dps: b.ground.dps, fx: b.ground.fx }); }
    }
    s.bolts = s.bolts.filter((b) => b.life > 0);

    if (s.comboT > 0) { s.comboT -= dt; if (s.comboT <= 0) s.combo = 0; }

    if (s.endT > 0) { s.endT -= dtReal; if (s.endT <= 0) s.result = h.alive ? 'win' : 'lose'; }
    else if (h.alive && s.reinf && s.reinf.length && foes(s).filter((u) => !u.def.boss).length <= 1 && !foes(s).some((u) => u.state === 'spawn') && !foes(s).some((u) => u.def.boss && u.hp > u.maxHp * 0.6)) {
      s.reinfT = (s.reinfT || 0) + dt;
      if (s.reinfT > 0.5) { s.reinfT = 0; const g = s.reinf.shift(); spawnGroup(s, g, false, s.stage >= 1 || !!s.rules.elites); ev(s, { type: 'reinforce', n: g.length, left: s.reinf.length }); }
    }
    else if (h.alive && !foes(s).length) {
      if (s.wave >= s.waves.length - 1) { s.endT = 2.2; setState(h, 'win'); ev(s, { type: 'clear' }); }
      else if (s.wave < 0 || s.area > s.wave) { s.waveT -= dt; if (s.waveT <= 0) { spawnWave(s); s.waveT = 1.1; } }
      else if (!s.portal) openPortal(s);
      else { s.portal.t += dt; if (s.portal.t > 1.15 && Math.hypot(h.x - s.portal.x, h.y - s.portal.y) < 22 && (h.state === 'idle' || h.state === 'move')) { s.transit = { t: 0, p: s.portal }; ev(s, { type: 'transit', kind: s.portal.kind }); } }
    }
    return s;
  }

  // ---- a bot that plays the hero (auto mode and the tests) ---------------------------------
  // skill 0..1: the chance it reads a wind-up in time.
  function bot(s, skill, mem) {
    mem = mem || (s.botMem = s.botMem || { seen: {} });
    const h = s.hero, inp = { mx: 0, my: 0 };
    if (s.cine || !h.alive || s.result || s.freeze > 0) return inp;
    const r = s.rand;
    for (const u of foes(s)) {
      if (u.state !== 'attack' || mem.seen[u.serial]) continue;
      const k = u.atk, w = k.wind * u.windMul, ttc = w - u.st;
      if (ttc > 0.16 || ttc < 0) continue;
      mem.seen[u.serial] = true;
      const reach = (k.aoe ? (k.at || 0) + k.aoe : (k.reach || 0) + (k.lunge || 0)) * u.scale + 12;
      if (k.bolt || k.blink || dist(h, u) > reach) continue;
      if (r() < skill && (s.mods.can.parry || s.mods.can.dodge)) {
        if (!k.unparry && s.mods.can.parry && (r() < 0.6 || !s.mods.can.dodge)) inp.parry = true;
        else if (s.mods.can.dodge) { inp.dodge = true; const a = Math.atan2(h.y - u.y, h.x - u.x) + (r() < 0.5 ? 1.2 : -1.2); inp.mx = Math.cos(a); inp.my = Math.sin(a); }
        return inp;
      }
    }
    for (const b of s.bolts) {
      if (b.team === 'hero' || b.seen) continue;
      const rx = h.x - b.x, ry = h.y - b.y, sp = Math.hypot(b.vx, b.vy) || 1, along = (rx * b.vx + ry * b.vy) / sp, side = Math.abs(rx * b.vy - ry * b.vx) / sp;
      const ttc = along / sp;
      if (ttc > 0 && ttc < 0.14 && side < 12) {
        b.seen = true;
        if (r() < skill) { if (s.mods.can.parry && (r() < 0.5 || !s.mods.can.dodge)) { inp.parry = true; return inp; } if (s.mods.can.dodge) { inp.dodge = true; inp.mx = -b.vy / sp; inp.my = b.vx / sp; return inp; } }
      }
    }
    const can = s.mods.can;
    if (can.art && s.moon >= 100 && foes(s).some((u) => u.state !== 'spawn') && (VS.ldxReady(s) || s.units.some((u) => u.alive && u.def.boss))) { inp.art = true; return inp; }
    // Step out of danger on the floor: a strike about to land, a burning or poisoned zone, a tornado.
    for (const z of s.hazards) {
      if (z.team === 'hero') continue;
      const dx = h.x - z.x, dy = h.y - z.y, dd = Math.hypot(dx, dy) || 1;
      if (dd > z.r + h.rad + 6 || (z.kind === 'strike' && z.delay - z.t > 0.6)) continue;
      if (r() < skill) { inp.mx = dx / dd; inp.my = dy / dd; if (z.kind === 'strike' && z.delay - z.t < 0.25 && r() < 0.5 && can.dodge) inp.dodge = true; return inp; }
    }
    if (s.portal && !s.transit) {
      let tx = s.portal.x, ty = s.portal.y; const A = arenaOf(s);
      // Around the pit's hole, not into it: aim at a point further round the ring.
      if (A.shape === 'donut') {
        const sx = tx - h.x, sy = ty - h.y, L2 = sx * sx + sy * sy || 1, k = Math.max(0, Math.min(1, -(h.x * sx + h.y * sy) / L2)), cx = h.x + sx * k, cy = h.y + sy * k;
        if (Math.hypot(cx, cy) < A.inner + 16) { const ah = Math.atan2(h.y, h.x), sg = angDiff(Math.atan2(ty, tx), ah) >= 0 ? 1 : -1, rm = (A.inner + A.r) / 2; tx = Math.cos(ah + sg * 0.8) * rm; ty = Math.sin(ah + sg * 0.8) * rm; }
      }
      const dx = tx - h.x, dy = ty - h.y, d = Math.hypot(dx, dy) || 1; inp.mx = dx / d; inp.my = dy / d; return inp;
    }
    const o = nearestFoe(s, h);
    if (!o) return inp;
    if (can.heavy && foes(s).filter((f) => f.state !== 'spawn' && dist(f, h) < 40).length >= 2 && r() < 0.05) { inp.heavy = true; return inp; }
    const H = s.heroDef, d = dist(o, h), want = H.ranged ? 95 : 18 + o.rad;
    if (H.skills) for (let i = 0; i < 2; i++) if (can['skill' + (i + 1)] && s.cds[i] <= 0 && d < 130 && r() < 0.03) { inp['s' + (i + 1)] = true; return inp; }
    if (d > want + 4) { inp.mx = (o.x - h.x) / d; inp.my = (o.y - h.y) / d; } else if (H.ranged && d < want - 25) { inp.mx = -(o.x - h.x) / d; inp.my = -(o.y - h.y) / d; }
    if (H.ranged ? d <= 230 : d <= 26 + o.rad) { if (!H.ranged) { inp.mx = 0; inp.my = 0; } else inp.aim = Math.atan2(o.y - h.y, o.x - h.x); inp.atk = true; }
    return inp;
  }

  VS.sim = { create, step, bot, rng, foes, startArt, mods, angDiff, makeUnit, CORE };
})(typeof window !== 'undefined' ? window : globalThis);
