// VESPER — the fight simulation. Pure logic (no DOM): runs in the page and in Node tests.
// A side-on floor band; one hero against waves and a boss. Parry, dodge, combo, the moon gauge,
// and the two moon arts (Red Moon; the Last Ditch Effort at low health) played as cinematics.
(function (root) {
  const VS = root.VS = root.VS || {}; const D = VS.DATA;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const sign = (v) => (v < 0 ? -1 : 1);

  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // ---- setup ------------------------------------------------------------------------------
  function mods(boons) {
    const has = (id) => boons.indexOf(id) >= 0;
    return {
      dmg: has('edge') ? 1.2 : 1, hp: D.HERO.hp + (has('vigor') ? 30 : 0), parryWin: D.HERO.parry.win * (has('guard') ? 1.6 : 1),
      gain: has('moonblood') ? 1.4 : 1, thirst: has('thirst') ? 0.05 : 0, combo: has('fourth') ? 4 : 3,
      dodgeDist: D.HERO.dodge.dist * (has('ghost') ? 1.3 : 1), perfect: D.HERO.dodge.perfect + (has('ghost') ? 0.08 : 0),
      riposte: has('riposte'), ldx: has('breath') ? 0.45 : D.HERO.lastDitch, moonStart: has('rising') ? 50 : 0,
    };
  }

  function makeUnit(s, team, key, def, x, y) {
    const sc = def.scale || 1;
    const u = { id: s.nextId++, team, key, def, set: def.set, scale: sc, rad: 8 * sc, x, y, face: team === 'hero' ? 1 : -1,
      hp: def.hp, maxHp: def.hp, poise: def.poise || 0, maxPoise: def.poise || 0, lastHit: -9,
      state: 'idle', st: 0, dur: 0, clip: 'Idle4', frame: 0, atk: null, hits: [], cd: 0.6, iframes: 0, flash: 0, kv: 0,
      alive: true, phase: 1, windMul: 1, spdMul: 1, lane: 0, queued: false, combo: 0, comboWin: 0, riposte: false, serial: 0, deadT: 0, moving: false };
    s.units.push(u); return u;
  }

  function create(stageIdx, opts) {
    opts = opts || {};
    const st = D.STAGES[stageIdx], boons = opts.boons || [], M = mods(boons);
    const s = { stage: stageIdx, def: st, t: 0, time: 0, rand: rng(opts.seed || 1), units: [], bolts: [], events: [], nextId: 1,
      waves: st.waves.concat([st.bossWave]), wave: -1, waveT: 0.8, freeze: 0, hitstop: 0, slow: 1, slowT: 0, cine: null,
      result: null, endT: 0, moon: M.moonStart, mods: M, boons, combo: 0, comboT: 0, serial: 0, bossIds: [],
      stats: { dealt: 0, taken: 0, parries: 0, perfects: 0, arts: 0, ldx: 0, maxCombo: 0, hitsTaken: 0 } };
    const h = makeUnit(s, 'hero', 'vesper', Object.assign({}, D.HERO, { hp: M.hp }), 110, D.ARENA.depth * 0.55);
    s.hero = h;
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
      case 'down': {
        u.clip = 'Slide';
        const up = u.dur - 0.5;
        u.frame = st < 0.45 ? Math.floor(st / 0.45 * 8) : st < up ? 7 : Math.min(F, 8 + Math.floor((st - up) / 0.5 * 7));
        break;
      }
      case 'dead': u.clip = 'Die'; u.frame = Math.min(F, Math.floor(st * 14)); break;
      case 'win': u.clip = 'Taunt'; u.frame = loopFrame('Taunt', st); break;
      case 'move': {
        u.clip = u.team === 'hero' ? 'Run' : (u.def.spd * u.spdMul > 68 ? 'Run' : 'Walk');
        u.frame = loopFrame(u.clip, s.t + u.id * 0.37); break;
      }
      default: u.clip = 'Idle4'; u.frame = loopFrame('Idle4', s.t + u.id * 0.37);
    }
  }

  // ---- helpers ----------------------------------------------------------------------------
  const ev = (s, e) => { s.events.push(e); };
  const foes = (s) => s.units.filter((u) => u.team === 'foe' && u.alive);
  function gainMoon(s, n) { if (s.cine) return; const was = s.moon; s.moon = Math.min(100, s.moon + n * s.mods.gain); if (was < 100 && s.moon >= 100) ev(s, { type: 'moonFull' }); }
  function setState(u, state, dur) { u.state = state; u.st = 0; u.dur = dur || 0; }
  function nearestFoe(s, u, maxD) {
    let best = null, bd = maxD || 1e9;
    for (const o of foes(s)) { const d = Math.abs(o.x - u.x) + Math.abs(o.y - u.y) * 1.5; if (d < bd) { bd = d; best = o; } }
    return best;
  }
  VS.ldxReady = (s) => s.hero.alive && s.hero.hp / s.hero.maxHp <= s.mods.ldx;

  // ---- attacks ----------------------------------------------------------------------------
  function startAttack(s, u, k) {
    setState(u, 'attack'); u.atk = k; u.hits = []; u.serial = ++s.serial;
    if (u.team === 'hero') {
      const o = nearestFoe(s, u, 90);
      if (o) { u.face = sign(o.x - u.x); u.y += clamp(o.y - u.y, -8, 8); }
    }
    ev(s, { type: 'windup', id: u.id, unparry: !!k.unparry, boss: !!u.def.boss, clip: k.clip });
  }
  function inReach(a, k, o) {
    const sc = a.scale;
    if (k.aoe) {
      const cx = a.x + a.face * (k.at || 0) * sc;
      return Math.abs(o.x - cx) <= k.aoe * sc * 0.75 + o.rad && Math.abs(o.y - a.y) <= k.aoe * sc * 0.42 + 4;
    }
    const dx = (o.x - a.x) * a.face;
    return dx >= -6 && dx <= k.reach * sc + o.rad && Math.abs(o.y - a.y) <= 11 + 3 * sc;
  }
  function contact(s, a, k) {
    if (k.blink) {
      const h = s.hero; const side = -h.face;
      a.x = clamp(h.x + side * 46, 14, D.ARENA.w - 14); a.y = clamp(h.y + (s.rand() - 0.5) * 16, 0, D.ARENA.depth); a.face = sign(h.x - a.x);
      ev(s, { type: 'blink', id: a.id, x: a.x, y: a.y }); return;
    }
    if (k.bolt) {
      const n = k.bolt.fan || 1;
      for (let i = 0; i < n; i++) {
        s.bolts.push({ delay: i * 0.24, x: a.x + a.face * 14 * a.scale, y: a.y, vx: a.face * k.bolt.speed, team: a.team, owner: a.id, dmg: Math.round(k.dmg * (a.dmgMul || 1)), kb: k.kb, fx: k.bolt.fx, life: 4, t: 0 });
      }
      ev(s, { type: 'bolt', id: a.id }); return;
    }
    for (const o of s.units) {
      if (o.team === a.team || !o.alive || a.hits.indexOf(o.id) >= 0) continue;
      if (inReach(a, k, o)) { a.hits.push(o.id); hit(s, a, o, k); }
    }
    if (a.team === 'hero') ev(s, { type: 'swing', id: a.id, clip: k.clip });
  }

  // a: attacker (unit or bolt), o: target, k: attack.
  function hit(s, a, o, k, bolt) {
    const M = s.mods;
    if (o.team === 'hero') {
      if (o.state === 'dodge' && o.iframes > 0) {
        if (o.st <= M.perfect && !o.perfectDone) {
          o.perfectDone = true; s.slow = 0.3; s.slowT = 0.55; s.stats.perfects++; gainMoon(s, 15);
          ev(s, { type: 'perfect', x: o.x, y: o.y });
        }
        return;
      }
      if (o.iframes > 0) return;
      if (o.state === 'parry' && o.st <= M.parryWin && !k.unparry) {
        s.stats.parries++; gainMoon(s, 22); s.hitstop = 0.11; o.riposte = M.riposte;
        ev(s, { type: 'parry', x: o.x + o.face * 10, y: o.y, id: o.id });
        if (bolt) { bolt.team = 'hero'; bolt.vx = -bolt.vx * 1.35; bolt.dmg = Math.round(bolt.dmg * 2.5 * M.dmg); bolt.reflected = true; return 'reflect'; }
        if (a.def.boss) {
          a.poise -= 28; a.lastHit = s.time; a.kv = -a.face * 60;
          if (a.poise <= 0) breakPoise(s, a); else { setState(a, 'hurt', 0.5); a.atk = null; }
        } else { setState(a, 'hurt', 0.7); a.atk = null; a.kv = -a.face * 90; }
        setState(o, 'idle'); o.iframes = 0.15;
        return;
      }
      const dmg = Math.round(k.dmg * (a.dmgMul || 1) * (a.phase === 2 ? 1.15 : 1));
      o.hp -= dmg; s.stats.taken += dmg; s.stats.hitsTaken++; s.combo = 0;
      o.flash = 1; o.kv = (bolt ? sign(bolt.vx) : a.face) * k.kb * 7;
      gainMoon(s, 9);
      ev(s, { type: 'hurt', x: o.x, y: o.y, dmg, id: o.id, big: dmg >= 16 });
      s.hitstop = Math.max(s.hitstop, 0.08);
      if (o.hp <= 0) { o.hp = 0; kill(s, o); return; }
      setState(o, 'hurt', 0.34); o.iframes = 0.55; o.atk = null; o.queued = false;
      return;
    }
    // A foe hit by the hero (or a reflected bolt).
    if (o.iframes > 0 || o.state === 'dead') return;
    let mult = M.dmg * (o.state === 'down' ? 1.5 : 1);
    if (!bolt && a.riposte) { mult *= 3; a.riposte = false; ev(s, { type: 'riposte', x: o.x, y: o.y }); }
    const dmg = Math.max(1, Math.round(k.dmg * mult * (0.9 + 0.2 * s.rand())));
    o.hp -= dmg; s.stats.dealt += dmg; o.flash = 1; o.lastHit = s.time;
    if (M.thirst) s.hero.hp = Math.min(s.hero.maxHp, s.hero.hp + dmg * M.thirst);
    s.combo++; s.comboT = 1.6; s.stats.maxCombo = Math.max(s.stats.maxCombo, s.combo);
    gainMoon(s, (k.poise || 6) >= 12 ? 5 : 3);
    ev(s, { type: 'hit', x: o.x, y: o.y, dmg, id: o.id, heavy: (k.poise || 0) >= 12, combo: s.combo, face: bolt ? sign(bolt.vx) : a.face });
    s.hitstop = Math.max(s.hitstop, (k.poise || 0) >= 12 ? 0.075 : 0.045);
    if (o.hp <= 0) { o.hp = 0; kill(s, o); return; }
    if (o.def.boss && o.def.boss && o.phase === 1 && o.hp <= o.maxHp * 0.5) phaseTwo(s, o);
    const kb = (bolt ? sign(bolt.vx) : a.face) * (k.kb || 6);
    if (o.maxPoise <= 0) { setState(o, 'hurt', 0.3); o.atk = null; o.kv = kb * 9; return; }
    if (o.state === 'down') return;
    o.poise -= k.poise || 6;
    if (o.poise <= 0) { if (o.def.minion) { setState(o, 'hurt', 0.45); o.atk = null; o.kv = kb * 10; o.poise = o.maxPoise; } else breakPoise(s, o); }
    else o.kv = kb * 2;
  }
  function breakPoise(s, o) {
    setState(o, 'down', 1.9); o.atk = null; o.poise = o.maxPoise; o.kv = -o.face * 70; gainMoon(s, 8);
    ev(s, { type: 'break', x: o.x, y: o.y, id: o.id });
  }
  function phaseTwo(s, o) {
    o.phase = 2; o.windMul = 0.86; o.spdMul = 1.15; s.freeze = Math.max(s.freeze, 1.1);
    ev(s, { type: 'phase', id: o.id, key: o.key });
  }
  function kill(s, o) {
    o.alive = false; setState(o, 'dead'); o.atk = null;
    ev(s, { type: 'kill', id: o.id, x: o.x, y: o.y, boss: !!o.def.boss, hero: o.team === 'hero' });
    if (o.team === 'hero') { s.endT = 2.0; s.combo = 0; }
    else if (o.def.boss) { s.slow = 0.25; s.slowT = 0.9; }
  }

  // ---- the moon arts -----------------------------------------------------------------------
  // Red Moon (gauge full): 3.4 s. Last Ditch Effort (gauge full at low health): 6.4 s, more damage, heals.
  VS.ART = { moon: { dur: 3.4, name: 'RED MOON' }, ldx: { dur: 6.4, name: 'LAST DITCH EFFORT' } };
  function startArt(s) {
    const h = s.hero; if (s.moon < 100 || !h.alive || s.cine || s.result) return false;
    const kind = VS.ldxReady(s) ? 'ldx' : 'moon';
    const tg = foes(s).filter((o) => o.state !== 'dead');
    if (!tg.length) return false;
    tg.sort((a, b) => (b.def.boss ? 1 : 0) - (a.def.boss ? 1 : 0) || Math.abs(a.x - h.x) - Math.abs(b.x - h.x));
    s.cine = { kind, t: 0, dur: VS.ART[kind].dur, targets: tg.map((o) => o.id), main: tg[0].id, hp0: tg[0].hp / tg[0].maxHp };
    s.moon = 0; s.stats.arts++; if (kind === 'ldx') s.stats.ldx++;
    setState(h, 'idle'); h.atk = null;
    for (const b of s.bolts) b.life = 0;
    ev(s, { type: 'art', kind });
    return true;
  }
  VS.artDamage = function (s, kind, o) {
    if (o.def.minion) return 9999;
    return Math.round((kind === 'ldx' ? 60 + 0.32 * o.maxHp : 26 + 0.15 * o.maxHp) * s.mods.dmg);
  };
  function endArt(s) {
    const c = s.cine, h = s.hero; s.cine = null;
    for (const id of c.targets) {
      const o = s.units.find((u) => u.id === id); if (!o || !o.alive) continue;
      const dmg = VS.artDamage(s, c.kind, o);
      o.hp -= dmg; s.stats.dealt += Math.min(dmg, o.hp + dmg); o.flash = 1;
      ev(s, { type: 'hit', x: o.x, y: o.y, dmg, id: o.id, heavy: true, art: true });
      if (o.hp <= 0) { o.hp = 0; kill(s, o); continue; }
      if (o.def.boss && o.phase === 1 && o.hp <= o.maxHp * 0.5) { o.phase = 2; o.windMul = 0.86; o.spdMul = 1.15; ev(s, { type: 'phase', id: o.id, key: o.key, quiet: true }); }
      setState(o, 'down', 1.7); o.atk = null; o.kv = sign(o.x - h.x) * 80;
    }
    if (c.kind === 'ldx') h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.3);
    h.iframes = 1.0;
    ev(s, { type: 'artEnd', kind: c.kind });
  }

  // ---- waves --------------------------------------------------------------------------------
  function spawnWave(s) {
    s.wave++;
    const list = s.waves[s.wave], h = s.hero, W = D.ARENA.w, boss = s.wave === s.waves.length - 1;
    list.forEach((key, i) => {
      const def = D.FOES[key];
      let side = i % 2 ? -1 : 1; if (boss && list.length === 1) side = h.x < W / 2 ? 1 : -1;
      let x = h.x + side * (190 + i * 18);
      if (x < 16 || x > W - 16) { side = -side; x = h.x + side * (190 + i * 18); }
      x = clamp(x, 16, W - 16);
      const u = makeUnit(s, 'foe', key, def, x, clamp(D.ARENA.depth * (0.2 + 0.6 * ((i * 0.37 + 0.5) % 1)), 0, D.ARENA.depth));
      const sk = s.def.scale || { hp: 1, dmg: 1 }; u.hp = u.maxHp = Math.round(def.hp * sk.hp); u.dmgMul = sk.dmg;
      u.face = sign(h.x - x); u.lane = (s.rand() - 0.5) * 14; u.cd = 0.5 + i * 0.5 + (def.boss ? 0.8 : 0);
      if (def.boss) s.bossIds.push(u.id);
    });
    if (boss) { s.freeze = 1.9; ev(s, { type: 'boss', keys: list.slice() }); }
    else ev(s, { type: 'wave', n: s.wave + 1, of: s.waves.length - 1 });
  }

  // ---- foe brains ---------------------------------------------------------------------------
  function fits(u, k, adx, ady) {
    if (k.range) return adx >= k.range[0] * u.scale && adx <= k.range[1] && ady <= (k.bolt ? 8 : 14);
    const r = k.aoe ? (k.at || 0) * u.scale + k.aoe * u.scale * 0.7 : k.reach * u.scale + 4;
    return adx <= r && ady <= 9;
  }
  function foeThink(s, u, dt) {
    const h = s.hero;
    if (!h.alive) { if (u.state === 'idle' || u.state === 'move') setState(u, 'idle'); return; }
    if (u.state !== 'idle' && u.state !== 'move') return;
    const dx = h.x - u.x, adx = Math.abs(dx), ady = Math.abs(h.y - u.y);
    u.face = sign(dx);
    u.cd -= dt;
    const busy = s.units.filter((o) => o.team === 'foe' && o.alive && o.state === 'attack' && o.def.minion).length;
    if (u.cd <= 0 && (u.def.boss || busy < 2)) {
      const opts = u.def.atks.filter((k) => !k.chainOnly && (!k.phase || u.phase >= k.phase) && fits(u, k, adx, ady));
      if (opts.length) { startAttack(s, u, opts[Math.floor(s.rand() * opts.length)]); return; }
    }
    // Where to stand: in reach, or hanging back while others swing.
    const melee = u.def.atks.filter((k) => !k.range && !k.chainOnly && (!k.phase || u.phase >= k.phase));
    let want = melee.length ? Math.min(...melee.map((k) => (k.aoe ? (k.at || 0) + k.aoe * 0.5 : k.reach) * u.scale)) * 0.8 : 100;
    if (u.key === 'umbral') want = 110;
    if (u.def.minion && busy >= 2) want = 64 + (u.id % 3) * 14;
    if (u.def.minion) { const ahead = s.units.filter((o) => o !== u && o.team === 'foe' && o.alive && o.def.minion && sign(o.x - h.x) === sign(u.x - h.x) && Math.abs(o.x - h.x) < adx - 2).length; want += ahead * 20; }
    let mx = 0, my = 0;
    if (Math.abs(adx - want) > 5) mx = adx > want ? sign(dx) : -sign(dx);
    const ty = clamp(h.y + (u.def.minion ? u.lane : 0), 0, D.ARENA.depth);
    if (Math.abs(ty - u.y) > 2.5) my = sign(ty - u.y);
    for (const o of s.units) if (o !== u && o.team === 'foe' && o.alive && Math.abs(o.x - u.x) < 14 && Math.abs(o.y - u.y) < 8) my = my || (u.id > o.id ? 1 : -1);
    const spd = u.def.spd * u.spdMul;
    u.x += mx * spd * dt; u.y += my * spd * 0.55 * dt;
    if (mx || my) { if (u.state !== 'move') setState(u, 'move'); } else if (u.state !== 'idle') setState(u, 'idle');
  }

  // ---- the hero -----------------------------------------------------------------------------
  function heroStep(s, h, dt, inp) {
    const M = s.mods, H = D.HERO;
    if (!h.alive) return;
    if (inp.art && startArt(s)) return;
    const free = h.state === 'idle' || h.state === 'move';
    h.comboWin -= dt;
    if (inp.atk) { if (h.state === 'attack') h.queued = true; else h.bufAtk = 0.18; }
    if (inp.dodge) h.bufDodge = 0.16;
    if (inp.parry) h.bufParry = 0.12;
    h.bufAtk = (h.bufAtk || 0) - dt; h.bufDodge = (h.bufDodge || 0) - dt; h.bufParry = (h.bufParry || 0) - dt;
    // The dash-cut: cut late in a dash, or right after one.
    if (h.bufAtk > 0 && ((h.state === 'dodge' && h.st > h.dur * 0.35) || (free && s.time - (h.dodgeEnd || -9) < 0.14))) {
      h.bufAtk = 0; h.combo = 0; h.comboWin = 0; startAttack(s, h, H.dashCut); ev(s, { type: 'dashCut', x: h.x, y: h.y }); return;
    }
    const canCancel = h.state === 'attack' && h.st > h.atk.wind + 0.04;
    if ((free || canCancel) && h.bufDodge > 0) {
      h.bufDodge = 0; setState(h, 'dodge', H.dodge.dur); h.atk = null; h.queued = false; h.perfectDone = false;
      const dx = inp.mx || 0;
      h.dodgeDir = [dx ? sign(dx) : h.face, 0];
      if (dx) h.face = sign(dx);
      ev(s, { type: 'dodge', x: h.x, y: h.y }); return;
    }
    if (free && h.bufParry > 0) { h.bufParry = 0; setState(h, 'parry', H.parry.dur); ev(s, { type: 'guard', x: h.x, y: h.y }); return; }
    if (free && h.bufAtk > 0) {
      h.bufAtk = 0; h.combo = h.comboWin > 0 ? (h.combo + 1) % M.combo : 0;
      startAttack(s, h, H.combo[h.combo]); return;
    }
    if (free) {
      const mx = inp.mx || 0, my = 0;
      h.x += mx * H.spdX * dt;
      if (mx) h.face = sign(mx);
      if (mx || my) { if (h.state !== 'move') setState(h, 'move'); } else if (h.state !== 'idle') setState(h, 'idle');
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
    if (s.freeze > 0) { s.freeze -= dtReal; for (const u of s.units) setFrame(s, u); return s; }
    if (s.hitstop > 0) { s.hitstop -= dtReal; return s; }
    let dt = dtReal;
    if (s.slowT > 0) { s.slowT -= dtReal; dt *= s.slow; }
    s.time += dt;
    const h = s.hero, W = D.ARENA.w, DP = D.ARENA.depth;

    heroStep(s, h, dt, inp);
    for (const u of s.units) if (u.team === 'foe' && u.alive) foeThink(s, u, dt);

    for (const u of s.units) {
      u.st += dt; u.iframes = Math.max(0, u.iframes - dt); u.flash = Math.max(0, u.flash - dt * 5);
      if (u.kv) { u.x += u.kv * dt; u.kv *= Math.exp(-9 * dt); if (Math.abs(u.kv) < 2) u.kv = 0; }
      if (u.state === 'attack') {
        const k = u.atk, w = k.wind * u.windMul, prev = u.st - dt;
        if (k.lunge) {
          const a = w - 0.1, b = w + 0.14;
          if (u.st > a && prev < b) { const f = Math.min(u.st, b) - Math.max(prev, a); u.x += u.face * k.lunge / 0.24 * f; }
          if (u.st >= w - 0.04 && prev < b) for (const o of s.units) if (o.team !== u.team && o.alive && u.hits.indexOf(o.id) < 0 && inReach(u, k, o)) { u.hits.push(o.id); hit(s, u, o, k); }
        } else if (prev < w && u.st >= w) {
          if (k.step && u.team === 'hero') u.x += u.face * k.step;
          contact(s, u, k);
        }
        if (u.state === 'attack' && u.st >= w + k.recover * u.windMul) {
          if (u.team === 'hero') {
            if (u.queued && u.combo + 1 < s.mods.combo) { u.queued = false; u.combo++; startAttack(s, u, D.HERO.combo[u.combo]); }
            else { u.queued = false; setState(u, 'idle'); u.comboWin = 0.32; u.atk = null; }
          } else {
            const nx = k.next != null ? u.def.atks[k.next] : null;
            const close = Math.abs(h.x - u.x) < 70 * u.scale && h.alive;
            if (nx && close) startAttack(s, u, nx);
            else { setState(u, 'idle'); u.atk = null; u.cd = u.def.boss ? (0.35 + s.rand() * 0.7) * (u.phase === 2 ? 0.65 : 1) : 0.9 + s.rand() * 1.0; }
          }
        }
      } else if (u.state === 'dodge') {
        const k = u.st / u.dur, sp = s.mods.dodgeDist / u.dur * 1.6 * (1 - k);
        u.x += u.dodgeDir[0] * sp * dt; u.y += u.dodgeDir[1] * sp * dt;
        const I = D.HERO.dodge.iframes; u.iframes = u.st >= I[0] && u.st <= I[1] ? 0.02 : u.iframes;
        if (u.st >= u.dur) { setState(u, 'idle'); u.dodgeEnd = s.time; }
      } else if ((u.state === 'parry' || u.state === 'hurt' || u.state === 'down') && u.st >= u.dur) {
        setState(u, 'idle'); if (u.team === 'foe') u.cd = Math.min(u.cd, 0.25);
      } else if (u.state === 'dead') u.deadT += dt;
      if (u.team === 'foe' && u.def.boss && u.alive && u.state !== 'down' && s.time - u.lastHit > 2.4) u.poise = u.maxPoise;
      if (u.alive || u.state === 'dead') { u.x = clamp(u.x, 10, W - 10); u.y = clamp(u.y, 0, DP); }
      setFrame(s, u);
    }

    // Bolts.
    for (const b of s.bolts) {
      if (b.delay > 0) { b.delay -= dt; continue; }
      b.t += dt; b.x += b.vx * dt; b.life -= dt;
      if (b.x < -20 || b.x > W + 20) b.life = 0;
      if (b.life <= 0) continue;
      for (const o of s.units) {
        if (o.team === b.team || !o.alive || Math.abs(o.x - b.x) > 6 + o.rad || Math.abs(o.y - b.y) > 9) continue;
        const r = hit(s, { face: sign(b.vx), phase: 1, def: {}, riposte: false, x: b.x }, o, { dmg: b.dmg, kb: b.kb, poise: 14 }, b);
        if (r === 'reflect') break;
        if (o.team === 'hero' && (o.state === 'dodge' && o.iframes > 0)) continue;
        b.life = 0; ev(s, { type: 'boltHit', x: b.x, y: b.y, fx: b.fx }); break;
      }
    }
    s.bolts = s.bolts.filter((b) => b.life > 0);

    if (s.comboT > 0) { s.comboT -= dt; if (s.comboT <= 0) s.combo = 0; }

    // Waves and the end.
    if (s.endT > 0) {
      s.endT -= dtReal;
      if (s.endT <= 0) s.result = h.alive ? 'win' : 'lose';
    } else if (h.alive && !foes(s).length) {
      if (s.wave >= s.waves.length - 1) { s.endT = 2.2; setState(h, 'win'); ev(s, { type: 'clear' }); }
      else { s.waveT -= dt; if (s.waveT <= 0) { spawnWave(s); s.waveT = 1.1; } }
    }
    return s;
  }

  // ---- a bot that plays the hero (auto mode and the tests) ---------------------------------
  // skill 0..1: the chance it reads a wind-up in time.
  function bot(s, skill, mem) {
    mem = mem || (s.botMem = s.botMem || { seen: {}, atkT: 0 });
    const h = s.hero, inp = { mx: 0, my: 0 };
    if (s.cine || !h.alive || s.result || s.freeze > 0) return inp;
    const r = s.rand;
    // Threats: wind-ups about to land, bolts about to arrive.
    for (const u of foes(s)) {
      if (u.state !== 'attack' || mem.seen[u.serial]) continue;
      const k = u.atk, w = k.wind * u.windMul, ttc = w - u.st;
      if (ttc > 0.16 || ttc < 0) continue;
      mem.seen[u.serial] = true;
      const reach = (k.aoe ? (k.at || 0) + k.aoe : (k.reach || 0) + (k.lunge || 0)) * u.scale + 12;
      if (k.bolt || k.blink || Math.abs(h.x - u.x) > reach || Math.abs(h.y - u.y) > 18) continue;
      if (r() < skill) { if (!k.unparry && r() < 0.6) inp.parry = true; else { inp.dodge = true; inp.mx = -sign(u.x - h.x); } return inp; }
    }
    for (const b of s.bolts) {
      if (b.team === 'hero' || b.seen || b.delay > 0) continue;
      const ttc = (h.x - b.x) / b.vx;
      if (ttc > 0 && ttc < 0.14 && Math.abs(b.y - h.y) < 10) {
        b.seen = true;
        if (r() < skill) { if (r() < 0.5) inp.parry = true; else { inp.dodge = true; inp.mx = sign(b.x - h.x); } return inp; }
      }
    }
    if (s.moon >= 100 && (VS.ldxReady(s) || s.units.some((u) => u.alive && u.def.boss))) { inp.art = true; return inp; }
    const o = nearestFoe(s, h);
    if (!o) return inp;
    const side = sign(h.x - o.x), tx = o.x + side * (18 + o.rad), ty = o.y;
    if (Math.abs(tx - h.x) > 4) inp.mx = sign(tx - h.x);
    if (Math.abs(ty - h.y) > 3) inp.my = sign(ty - h.y);
    if (Math.abs(o.x - h.x) <= 26 + o.rad && Math.abs(o.y - h.y) <= 10) { inp.mx = 0; inp.my = 0; inp.atk = true; }
    return inp;
  }

  VS.sim = { create, step, bot, rng, foes, startArt, mods };
})(typeof window !== 'undefined' ? window : globalThis);
