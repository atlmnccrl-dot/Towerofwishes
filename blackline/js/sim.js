// BLACKLINE — the battle simulation. Pure logic, no DOM; runs in Node for tests.
// Team 0 is the player's (west), team 1 the enemy (east). y points up.
(function (root) {
  const BL = root.BL || (root.BL = {});
  const { rng, clamp, UNITS, WEAPONS, SUPPORT, RULES, ARMOR } = BL;
  const { heightAt, slopeAt, los, coverAt, onWire, crater } = BL;

  const DT = 1 / 30;
  const MAX_PROJ = 520;

  // ---------------------------------------------------------------- creation

  function createBattle(opts) {
    opts = opts || {};
    const seed = opts.seed || 1;
    const field = BL.createBattlefield(opts.mapSeed || 7);
    const S = {
      t: 0, seed, field,
      rnd: rng(seed * 9973 + 17),
      units: [], nextId: 1,
      proj: [],
      events: [],
      strikes: [],
      transports: [],
      wrecks: [],
      corpses: [],
      over: false, winner: -1,
      sightT: 0,
      teams: [0, 1].map((id) => ({
        id, rp: RULES.startRP, tickets: RULES.tickets, cds: {},
        vis: new Map(),            // enemy unit id -> time last seen
        stats: { kills: 0, lost: 0, spent: 0, deployed: 0, vehKills: 0 },
        income: RULES.baseIncome,
      })),
      ai: [null, null],
      difficulty: opts.difficulty || 'veteran',
    };
    if (opts.ai) opts.ai.forEach((on, team) => { if (on) S.ai[team] = BL.createAI(S, team); });
    return S;
  }

  function emit(S, ev) {
    if (S.events.length < 3000) S.events.push(ev);
  }

  function ground(S, x) { return heightAt(S.field, x); }

  // ---------------------------------------------------------------- units

  function makeUnit(S, team, type, x) {
    const def = UNITS[type];
    const u = {
      id: S.nextId++, team, type, def, kind: def.kind,
      x, dir: team === 0 ? 1 : -1,
      order: { type: 'hold', x, target: 0 },
      members: [], alive: true,
      engagedT: -99, spawnT: S.t, reinforceT: 0, holdT: 0, halted: false,
    };
    if (def.kind === 'inf') {
      const n = def.load.length;
      for (let i = 0; i < n; i++) {
        const key = def.load[i];
        const off = (i - (n - 1) / 2) * 11 + S.rnd.range(-3, 3);
        u.members.push(makeSoldier(S, u, key, x + off, off));
      }
    } else {
      const y = def.kind === 'air' ? ground(S, x) + 150 : ground(S, x);
      u.members.push({
        unit: u, veh: true, x, y, hp: def.hp, maxHp: def.hp, vx: 0, vy: 0, face: u.dir,
        ang: 0, alive: true, deadT: 0, track: 0, recoil: 0, rotor: 0, falling: false, spin: 0,
        smoke: 0,
        weapons: def.load.map((k) => ({
          key: k, w: WEAPONS[k], cd: S.rnd.range(0.5, 1.5), burst: 0, gap: 0, target: null,
          aim: u.dir > 0 ? 0 : Math.PI, retarget: S.rnd.range(0, 0.4),
        })),
      });
    }
    S.units.push(u);
    return u;
  }

  function makeSoldier(S, u, key, x, off) {
    const w = WEAPONS[key];
    return {
      unit: u, veh: false, x, y: ground(S, x), slot: off, hp: u.def.hp, maxHp: u.def.hp,
      wkey: key, w, alt: key === 'at' ? WEAPONS.rifle : null,
      cd: S.rnd.range(0.3, 1.4), burst: 0, gap: 0, useAlt: false,
      target: null, retarget: S.rnd.range(0, 0.6), supp: 0, suppT: 0, stance: 'stand',
      moving: false, face: u.dir, phase: S.rnd.range(0, 6.28), alive: true, deadT: 0,
      setup: 0, flinch: 0, rappel: null, speedK: S.rnd.range(0.92, 1.08), cover: null,
    };
  }

  function aliveMembers(u) { return u.members.filter((m) => m.alive); }

  function targetable(m) { return m.alive && !m.rappel && !(m.veh && m.falling); }

  function armorOf(m) { return m.unit.def.armor; }

  function centerY(m) {
    if (m.veh) return m.unit.kind === 'air' ? m.y : m.y + m.unit.def.hgt * 0.5;
    return m.y + (m.stance === 'prone' ? 1.6 : m.stance === 'crouch' ? 4.2 : 6);
  }

  function eyeY(m) {
    if (m.veh) return m.unit.kind === 'air' ? m.y : m.y + m.unit.def.hgt * 0.95;
    return m.y + (m.stance === 'prone' ? 2.2 : m.stance === 'crouch' ? 5.5 : 8);
  }

  // Where a shot leaves the weapon. Shared with the renderer so effects line up.
  function muzzle(m, wi) {
    if (!m.veh) {
      const h = m.stance === 'prone' ? 1.8 : m.stance === 'crouch' ? 4.6 : 6.6;
      return { x: m.x + m.face * 5, y: m.y + h };
    }
    const d = m.unit.def;
    const wp = m.weapons[wi || 0];
    if (m.unit.kind === 'air') {
      if (wp && wp.key === 'hrocket') return { x: m.x + m.face * 4, y: m.y - 5 };
      return { x: m.x + m.face * d.len * 0.36, y: m.y - 7 };
    }
    const ca = Math.cos(m.ang), sa = Math.sin(m.ang);
    // turret ring sits a little behind centre, near the roof
    const tx = m.x - m.face * d.len * 0.06 * ca - (d.hgt * 0.78) * sa * m.face;
    const ty = m.y + d.hgt * 0.78 * ca + m.face * d.len * 0.06 * sa;
    const L = wp && wp.key === 'coax' ? d.len * 0.3 : d.len * 0.62;
    const a = wp ? wp.aim : 0;
    return { x: tx + Math.cos(a) * L, y: ty + Math.sin(a) * L };
  }

  // ---------------------------------------------------------------- deployment

  function deployPoints(S, team, type) {
    const pts = [S.field.bases[team]];
    const def = UNITS[type];
    if (def && def.kind === 'inf') {
      for (const s of S.field.sectors) if (s.owner === team) pts.push(s.x);
    }
    return pts;
  }

  function popCount(S, team) {
    let n = 0;
    for (const u of S.units) if (u.alive && u.team === team) n++;
    return n;
  }

  function canAfford(S, team, type) {
    const cost = (UNITS[type] || SUPPORT[type]).cost;
    const T = S.teams[team];
    if (T.rp < cost) return 'rp';
    if ((T.cds[type] || 0) > S.t) return 'cooldown';
    if ((UNITS[type] || type === 'insert') && popCount(S, team) >= RULES.popCap) return 'cap';
    return null;
  }

  // Is x somewhere this team can see or holds (for air insertion)?
  function teamSees(S, team, x) {
    if (Math.abs(S.field.bases[team] - x) < 300) return true;
    for (const s of S.field.sectors) if (s.owner === team && Math.abs(s.x - x) < 300) return true;
    for (const u of S.units) {
      if (!u.alive || u.team !== team) continue;
      for (const m of u.members) if (m.alive && !m.rappel && Math.abs(m.x - x) < u.def.sight * 0.8) return true;
    }
    return false;
  }

  function deploy(S, team, type, x) {
    if (S.over) return { ok: false, reason: 'over' };
    const bad = canAfford(S, team, type);
    if (bad) return { ok: false, reason: bad };
    const T = S.teams[team];
    x = clamp(x, 40, S.field.W - 40);

    if (type === 'arty') {
      const sp = SUPPORT.arty;
      S.strikes.push({ team, x, t: sp.delay, shells: sp.shells, next: 0, spread: sp.spread, warn: sp.delay });
      emit(S, { t: 'artyWarn', team, x });
      pay(S, T, type, sp.cost, sp.cd);
      return { ok: true, x };
    }
    if (type === 'insert') {
      if (!teamSees(S, team, x)) return { ok: false, reason: 'sight' };
      const sp = SUPPORT.insert;
      const u = makeUnit(S, team, sp.unit, x);
      u.order = { type: 'hold', x, target: 0 };
      const edge = team === 0 ? -120 : S.field.W + 120;
      const tr = { team, x: edge, y: ground(S, x) + 175, tx: x, phase: 'in', t: 0, unit: u, face: team === 0 ? 1 : -1, next: 0, idx: 0, rotor: 0 };
      for (const m of u.members) { m.rappel = { stage: 'wait', y: 0 }; m.x = x; }
      S.transports.push(tr);
      emit(S, { t: 'insert', team, x });
      pay(S, T, type, sp.cost, sp.cd);
      return { ok: true, unit: u, x };
    }

    const pts = deployPoints(S, team, type);
    let best = pts[0];
    for (const p of pts) if (Math.abs(p - x) < Math.abs(best - x)) best = p;
    const u = makeUnit(S, team, type, best + S.rnd.range(-12, 12));
    u.order = { type: 'hold', x: u.x, target: 0 };
    pay(S, T, type, UNITS[type].cost, UNITS[type].cd);
    emit(S, { t: 'deploy', team, x: u.x, id: u.id, type });
    return { ok: true, unit: u, x: u.x };
  }

  function pay(S, T, type, cost, cd) {
    T.rp -= cost;
    T.cds[type] = S.t + cd;
    T.stats.spent += cost;
    T.stats.deployed++;
  }

  // ---------------------------------------------------------------- orders

  function order(S, ids, type, x, targetId) {
    const list = ids.map((id) => S.units.find((u) => u.id === id && u.alive)).filter(Boolean);
    list.sort((a, b) => a.x - b.x);
    const n = list.length;
    list.forEach((u, i) => {
      const spread = n > 1 ? (i - (n - 1) / 2) * 26 : 0;
      let ox = x == null ? u.x : x + spread;
      if (type === 'retreat') ox = S.field.bases[u.team];
      if (type === 'hold' && x == null) ox = u.x;
      u.order = { type, x: clamp(ox, 30, S.field.W - 30), target: targetId || 0 };
      u.holdT = 0;
      for (const m of u.members) if (!m.veh) m.cover = null;
    });
    return list.length;
  }

  // ---------------------------------------------------------------- sight

  function updateSight(S) {
    for (const T of S.teams) {
      for (const u of S.units) {
        if (!u.alive || u.team === T.id) continue;
        if (seenBy(S, T.id, u)) T.vis.set(u.id, S.t);
      }
      for (const [id, t] of T.vis) if (S.t - t > 4) T.vis.delete(id);
    }
  }

  function seenBy(S, team, target) {
    const tm = target.members.filter(targetable);
    if (!tm.length) return false;
    for (const u of S.units) {
      if (!u.alive || u.team !== team) continue;
      const sight = u.def.sight;
      if (Math.abs(u.x - target.x) > sight + 90) continue;
      const eyes = u.members.filter(targetable);
      for (let i = 0; i < eyes.length; i += eyes.length > 3 ? 2 : 1) {
        const e = eyes[i];
        for (let j = 0; j < tm.length; j += tm.length > 3 ? 2 : 1) {
          const t = tm[j];
          const dx = t.x - e.x, dy = centerY(t) - eyeY(e);
          if (dx * dx + dy * dy > sight * sight) continue;
          if (los(S.field, e.x, eyeY(e), t.x, centerY(t) + 1.5)) return true;
        }
      }
    }
    return false;
  }

  function visible(S, team, u) {
    const t = S.teams[team].vis.get(u.id);
    return t != null && S.t - t < 1.2;
  }

  // ---------------------------------------------------------------- targeting

  function pickTarget(S, m, w) {
    const u = m.unit;
    const team = u.team;
    const ox = m.x, oy = eyeY(m);
    let best = null, bestScore = 1e9;
    const forced = u.order.type === 'attack' && u.order.target ? u.order.target : 0;
    for (const e of S.units) {
      if (!e.alive || e.team === team) continue;
      if (Math.abs(e.x - ox) > w.range + 80) continue;
      if (!visible(S, team, e)) continue;
      const ek = e.kind;
      if (ek === 'air' && !w.vsAir) continue;
      if (w.cls === 'small' && e.def.armor === 'heavy') continue;
      let pref = 1;
      if (w.prefers === 'veh') pref = ek === 'inf' ? 3 : 0.5;
      else if (w.cls === 'small') pref = ek === 'inf' ? 1 : ek === 'air' ? 1.6 : 3.5;
      else if (w.cls === 'cannon') pref = ek === 'air' ? 0.6 : 1;
      if (forced === e.id) pref *= 0.35;
      for (const t of e.members) {
        if (!targetable(t)) continue;
        const dx = t.x - ox, dy = centerY(t) - oy;
        const d2 = dx * dx + dy * dy;
        if (d2 > w.range * w.range) continue;
        const score = Math.sqrt(d2) * pref + (t.stance === 'prone' ? 40 : 0);
        if (score >= bestScore) continue;
        if (!los(S.field, ox, oy, t.x, centerY(t))) continue;
        best = t; bestScore = score;
      }
    }
    return best;
  }

  function hitChance(S, shooter, target, w, dist) {
    const rf = 1 - 0.55 * clamp(dist / w.range, 0, 1);
    let p = w.acc * rf;
    if (!target.veh) {
      if (target.stance === 'prone') p *= 0.45;
      else if (target.stance === 'crouch') p *= 0.75;
      if (target.moving) p *= 0.88;
    } else if (target.unit.kind === 'air') {
      p *= w.airAcc != null ? w.airAcc / Math.max(0.01, w.acc) * 0.9 : 0.8;
    } else {
      p = Math.min(0.95, p * 1.45);
    }
    if (!shooter.veh) {
      p *= 1 - (shooter.supp / 100) * 0.7;
      if (shooter.moving) p *= 0.7;
    } else if (Math.abs(shooter.vx) > 6) {
      p *= shooter.unit.kind === 'air' ? 0.85 : 0.62;
    }
    return clamp(p, 0.02, 0.95);
  }

  // ---------------------------------------------------------------- firing

  function fire(S, m, w, target, wi) {
    const mz = muzzle(m, wi);
    const tx = target.x, ty = centerY(target);
    const dist = Math.hypot(tx - mz.x, ty - mz.y);
    const p = hitChance(S, m, target, w, dist);
    let hit = S.rnd() < p;
    let absorbed = null;
    let dx, dy;
    if (hit && !target.veh) {
      const cv = coverAt(S.field, target.x, m.x);
      if (cv) {
        let v = cv.v;
        if (target.unit.order.type === 'hold' && target.unit.holdT > 4) v += 0.12;
        if (S.rnd() < v) { hit = false; absorbed = cv.obj; }
      }
    }
    if (hit) { dx = tx; dy = ty; }
    else if (absorbed) {
      const side = Math.sign(m.x - target.x) || 1;
      dx = absorbed.x + side * Math.min(absorbed.w / 2, 6) * S.rnd.range(0.3, 1);
      dy = ground(S, dx) + (absorbed.h ? absorbed.h * S.rnd.range(0.2, 0.7) : S.rnd.range(1, 4));
    } else {
      const along = S.rnd.range(-30, 30);
      dx = tx + along;
      dy = w.proj === 'bullet' ? ty + S.rnd.range(-7, 12) : ground(S, dx) + 1;
    }
    const L = Math.max(1, Math.hypot(dx - mz.x, dy - mz.y));
    const sp = w.speed;
    const pr = spawnProj(S);
    if (!pr) return;
    pr.kind = w.proj; pr.team = m.unit.team; pr.x = mz.x; pr.y = mz.y;
    pr.vx = (dx - mz.x) / L * sp; pr.vy = (dy - mz.y) / L * sp;
    pr.left = L; pr.dest = pr.dest || { x: 0, y: 0 }; pr.dest.x = dx; pr.dest.y = dy;
    pr.hit = hit ? target : null; pr.absorbed = absorbed; pr.w = w; pr.ttl = 3; pr.passed = false;
    pr.src = m; pr.ff = false; pr.t0 = S.t;
    // firing reveals the shooter to the other side for a moment
    S.teams[1 - m.unit.team].vis.set(m.unit.id, S.t);
    emit(S, { t: 'shot', x: mz.x, y: mz.y, a: Math.atan2(dy - mz.y, dx - mz.x), team: m.unit.team, w: w.proj, k: m.veh ? m.unit.type : 'inf', wk: w.name });
    if (m.veh) {
      if (w.proj === 'shell') m.recoil = 1;
    }
  }

  function spawnProj(S) {
    for (const p of S.proj) if (!p.on) { p.on = true; return p; }
    if (S.proj.length >= MAX_PROJ) return null;
    const p = { on: true };
    S.proj.push(p);
    return p;
  }

  // ---------------------------------------------------------------- damage

  function damage(S, m, amount, cls, fromTeam) {
    if (!m.alive || (m.veh && m.falling)) return;
    const mult = ARMOR[cls][armorOf(m)];
    const d = amount * mult;
    if (d <= 0) return;
    m.hp -= d;
    if (m.veh) emit(S, { t: 'hit', x: m.x, y: centerY(m), armor: armorOf(m), big: d > 60 });
    else { m.flinch = 0.3; emit(S, { t: 'blood', x: m.x, y: centerY(m) }); }
    if (m.hp <= 0) kill(S, m, fromTeam);
  }

  function kill(S, m, fromTeam) {
    const u = m.unit;
    m.hp = 0;
    if (m.veh && u.kind === 'air' && !m.falling) {
      // the helicopter falls first; it dies on impact
      m.falling = true; m.spin = 0; m.vy = 0;
      emit(S, { t: 'heliHit', x: m.x, y: m.y, team: u.team });
      creditKill(S, u, fromTeam, true);
      return;
    }
    m.alive = false;
    m.deadT = S.t;
    if (m.veh) {
      if (u.kind !== 'air') creditKill(S, u, fromTeam, true);
      explode(S, m.x, centerY(m), u.kind === 'air' ? 40 : 34, 50, 'shell', -1, true);
      emit(S, { t: 'vehDie', x: m.x, y: m.y, type: u.type, team: u.team, face: m.face, ang: m.ang });
      addWreck(S, m);
    } else {
      creditKill(S, u, fromTeam, false);
      if (S.corpses.length > 160) S.corpses.shift();
      S.corpses.push({ x: m.x, y: m.y, face: m.face, team: u.team, t: S.t, wkey: m.wkey });
      emit(S, { t: 'die', x: m.x, y: m.y, team: u.team });
    }
    if (!u.members.some((k) => k.alive)) {
      u.alive = false;
      emit(S, { t: 'unitLost', team: u.team, type: u.type, x: u.x });
    }
  }

  function creditKill(S, u, fromTeam, veh) {
    const T = S.teams[u.team];
    T.tickets = Math.max(0, T.tickets - u.def.tickets);
    T.stats.lost++;
    if (fromTeam === 0 || fromTeam === 1) {
      S.teams[fromTeam].stats.kills++;
      if (veh) S.teams[fromTeam].stats.vehKills++;
    }
  }

  function addWreck(S, m) {
    const u = m.unit;
    if (S.wrecks.length >= 12) {
      const old = S.wrecks.shift();
      const i = S.field.cover.indexOf(old.cover);
      if (i >= 0) S.field.cover.splice(i, 1);
    }
    const gy = ground(S, m.x);
    const cover = u.kind === 'air' ? { x: m.x, w: 30, v: 0.35, kind: 'wreck', side: 0, h: 8 } : { x: m.x, w: u.def.len * 0.9, v: 0.42, kind: 'wreck', side: 0, h: u.def.hgt * 0.8 };
    S.field.cover.push(cover);
    S.wrecks.push({ x: m.x, y: gy, ang: u.kind === 'air' ? m.spin * 0.3 : m.ang, type: u.type, team: u.team, face: m.face, t: S.t, cover });
  }

  function explode(S, x, y, r, dmg, cls, team, ff) {
    const r2 = r * r, sr = r * 2.3;
    for (const u of S.units) {
      if (!u.alive) continue;
      if (Math.abs(u.x - x) > sr + 60) continue;
      const friendly = u.team === team;
      for (const m of u.members) {
        if (!m.alive || m.rappel) continue;
        const dx = m.x - x, dy = centerY(m) - y;
        const d2 = dx * dx + dy * dy;
        if (!m.veh) {
          const d = Math.sqrt(d2);
          if (d < sr) { m.supp = Math.min(100, m.supp + 70 * (1 - d / sr) * (friendly && !ff ? 0.4 : 1)); m.suppT = S.t; m.flinch = 0.3; }
        }
        if ((friendly && !ff) || m._spare) continue;
        if (d2 > r2) continue;
        let k = 1 - Math.sqrt(d2) / r;
        if (!m.veh) {
          if (m.stance === 'prone') k *= 0.6;
          const cv = coverAt(S.field, m.x, x);
          if (cv && cv.obj.kind === 'trench') k *= 0.5;
        }
        damage(S, m, dmg * k, cls, team);
      }
    }
    const gy = ground(S, x);
    if (y - gy < r * 0.6 && cls !== 'small') crater(S.field, x, r * 0.9, Math.min(5, r * 0.12));
    emit(S, { t: 'boom', x, y, r, big: r >= 30, cls });
  }

  // ---------------------------------------------------------------- per-step updates

  function step(S, dt) {
    dt = dt || DT;
    if (S.over) { S.t += dt; return; }
    S.t += dt;

    S.sightT -= dt;
    if (S.sightT <= 0) { S.sightT = RULES.sightTick; updateSight(S); }

    for (let i = 0; i < 2; i++) if (S.ai[i]) BL.aiThink(S, i, dt);

    for (const u of S.units) {
      if (!u.alive) continue;
      if (u.kind === 'inf') stepSquad(S, u, dt);
      else if (u.kind === 'veh') stepVehicle(S, u, dt);
      else stepHeli(S, u, dt);
    }
    stepProjectiles(S, dt);
    stepStrikes(S, dt);
    stepTransports(S, dt);
    stepSectors(S, dt);
    stepEconomy(S, dt);

    // drop dead units (corpses and wrecks are kept separately)
    if (S.units.some((u) => !u.alive && !u.members.some((m) => m.alive))) {
      S.units = S.units.filter((u) => u.alive || u.members.some((m) => m.alive));
    }
    // a consumer-less event queue (tests) must not grow forever
    if (S.events.length > 2500) S.events.length = 0;
  }

  function goalX(S, u) {
    const o = u.order;
    if (o.type === 'attack' && o.target) {
      const t = S.units.find((e) => e.id === o.target && e.alive);
      if (t && visible(S, u.team, t)) {
        const range = u.kind === 'inf' ? 260 : u.members[0].weapons[0].w.range * 0.75;
        const side = Math.sign(u.x - t.x) || -u.dir;
        o.x = clamp(t.x + side * range, 30, S.field.W - 30);
      } else if (!t) {
        o.target = 0;
      }
    }
    return o.x;
  }

  // ---- infantry

  function stepSquad(S, u, dt) {
    const field = S.field;
    const o = u.order;
    const gx = goalX(S, u);
    const live = u.members.filter((m) => m.alive && !m.rappel);
    if (!live.length) { stepRappel(S, u, dt); return; }
    stepRappel(S, u, dt);

    const retreat = o.type === 'retreat';
    const engaged = S.t - u.engagedT < 1.6;
    const pinned = live.filter((m) => m.supp > 75).length;
    let halt = false;
    if (o.type === 'attack' && engaged) halt = true;
    if (o.type === 'hold') halt = Math.abs(gx - u.x) < 4;
    if (!retreat && pinned > live.length / 2) halt = true;

    // anchor
    const dx = gx - u.x;
    let moving = false;
    if (!halt && Math.abs(dx) > 3) {
      let sp = u.def.speed * (retreat ? 1.3 : 1);
      const dir = Math.sign(dx);
      const sl = slopeAt(field, u.x) * dir;
      sp *= 1 - clamp(sl * 0.9, 0, 0.35);
      if (onWire(field, u.x)) sp *= 0.45;
      // wait for stragglers
      let avg = 0;
      for (const m of live) avg += m.x - m.slot;
      avg /= live.length;
      if ((u.x - avg) * dir > 34) sp *= 0.25;
      u.x += dir * Math.min(Math.abs(dx), sp * dt);
      moving = true;
    }
    u.halted = !moving;
    if (o.type === 'hold' && !moving) u.holdT += dt; else u.holdT = 0;
    if (retreat && Math.abs(u.x - field.bases[u.team]) < 60) {
      u.order = { type: 'hold', x: u.x, target: 0 };
    }

    // base: heal and refill
    const atBase = Math.abs(u.x - field.bases[u.team]) < RULES.baseHealRadius;
    if (atBase) {
      for (const m of live) m.hp = Math.min(m.maxHp, m.hp + 6 * dt);
      u.reinforceT += dt;
      const n = u.def.load.length;
      if (u.reinforceT > 3.5 && live.length < n && !engaged) {
        u.reinforceT = 0;
        const missing = u.def.load.find((k, i) => !u.members[i] || !u.members[i].alive);
        const idx = u.members.findIndex((m) => !m.alive);
        const key = idx >= 0 ? u.def.load[idx] || missing : missing;
        const off = idx >= 0 ? u.members[idx].slot : 0;
        const nm = makeSoldier(S, u, key || 'rifle', field.bases[u.team] - u.dir * 30, off);
        if (idx >= 0) u.members[idx] = nm; else u.members.push(nm);
        emit(S, { t: 'reinforce', team: u.team, x: nm.x });
      }
    }

    for (const m of live) stepSoldier(S, u, m, dt, moving, halt, retreat);
  }

  function stepRappel(S, u, dt) {
    for (const m of u.members) {
      if (!m.alive || !m.rappel) continue;
      const r = m.rappel;
      if (r.stage === 'down') {
        r.y -= 62 * dt;
        const g = ground(S, m.x);
        if (r.y <= g) { m.rappel = null; m.y = g; m.stance = 'crouch'; emit(S, { t: 'land', x: m.x, y: g, team: u.team }); }
      }
    }
  }

  function stepSoldier(S, u, m, dt, moving, halt, retreat) {
    const field = S.field;
    // suppression decays after a second without new fire
    if (S.t - m.suppT > 1) m.supp = Math.max(0, m.supp - 16 * dt);
    if (m.flinch > 0) m.flinch -= dt;

    // slot target, with cover seeking when the squad is stopped
    let tx = u.x + m.slot;
    if (!moving && !retreat) {
      if (!m.cover || Math.abs(m.cover.x - tx) > 46) {
        m.cover = null;
        let best = null, bd = 40;
        for (const c of field.cover) {
          const d = Math.abs(c.x - tx);
          if (d < bd) { bd = d; best = c; }
        }
        if (best) m.cover = { x: best.x + clamp(m.slot * 0.35, -best.w / 2 + 1, best.w / 2 - 1), ref: best };
      }
      if (m.cover) tx = m.cover.x;
    }
    tx = clamp(tx, 10, field.W - 10);
    const pinned = m.supp > 75 && !retreat;
    const d = tx - m.x;
    m.moving = false;
    if (Math.abs(d) > 1.5 && !pinned) {
      let sp = u.def.speed * m.speedK * (retreat ? 1.35 : 1) * (Math.abs(d) > 20 ? 1.25 : 0.8);
      if (m.stance === 'prone') sp *= 0.35;
      else if (m.supp > 40) sp *= 0.7;
      if (onWire(field, m.x)) sp *= 0.45;
      m.x += Math.sign(d) * Math.min(Math.abs(d), sp * dt);
      m.moving = true;
      m.face = Math.sign(d);
      m.phase += dt * sp * 0.42;
      m.setup = 0;
    } else {
      m.setup += dt;
    }
    m.y = ground(S, m.x);

    // stance: suppression and holding drive it
    if (m.supp > 75 && !retreat) m.stance = 'prone';
    else if (m.supp > 38 || (halt && (m.target || u.order.type === 'hold') && !m.moving)) m.stance = m.wkey === 'mg' && m.setup > 0.6 ? 'prone' : 'crouch';
    else m.stance = 'stand';
    if (m.moving && m.stance === 'prone' && !pinned) m.stance = 'crouch';

    if (retreat) { m.target = null; return; }

    // weapons
    m.retarget -= dt;
    let w = m.useAlt ? m.alt : m.w;
    if (m.retarget <= 0) {
      m.retarget = S.rnd.range(0.45, 0.8);
      let t = pickTarget(S, m, m.w);
      m.useAlt = false;
      if ((!t || (m.w.prefers === 'veh' && !t.veh)) && m.alt) {
        const t2 = pickTarget(S, m, m.alt);
        if (t2 && (!t || !t.veh)) { t = t2; m.useAlt = true; }
      }
      m.target = t;
      w = m.useAlt ? m.alt : m.w;
    }
    if (m.target && !targetable(m.target)) m.target = null;
    if (!m.target) { m.burst = 0; return; }
    u.engagedT = S.t;
    m.face = Math.sign(m.target.x - m.x) || m.face;
    if (w.setup && m.setup < w.setup) return;
    if (m.stance === 'prone' && m.supp > 90 && S.rnd() < 0.7) { m.cd = Math.max(m.cd, 0.4); }

    if (m.burst > 0) {
      m.gap -= dt;
      if (m.gap <= 0) {
        fire(S, m, w, m.target, 0);
        m.burst--;
        m.gap = w.gap;
        if (m.burst === 0) m.cd = S.rnd.range(w.cd[0], w.cd[1]);
      }
      return;
    }
    m.cd -= dt;
    if (m.cd <= 0) {
      m.burst = S.rnd.int(w.burst[0], w.burst[1]);
      m.gap = 0;
    }
  }

  // ---- ground vehicles

  function stepVehicle(S, u, dt) {
    const m = u.members[0];
    if (!m.alive) return;
    const field = S.field;
    const def = u.def;
    const o = u.order;
    const gx = goalX(S, u);
    const retreat = o.type === 'retreat';
    const main = m.weapons[0];
    const engaged = main.target && targetable(main.target);
    let want = 0;
    const dx = gx - m.x;
    const halt = (o.type === 'attack' && engaged) || Math.abs(dx) < 4;
    if (!halt) {
      const dir = Math.sign(dx);
      let sp = def.speed * (retreat ? 1.15 : 1);
      const sl = slopeAt(field, m.x) * dir;
      sp *= 1 - clamp(sl * 0.8, 0, 0.5);
      if (Math.abs(dx) < 40) sp *= Math.max(0.25, Math.abs(dx) / 40);
      // keep spacing from friendly vehicles ahead
      for (const v of S.units) {
        if (v === u || !v.alive || v.team !== u.team || v.kind !== 'veh') continue;
        const a = v.members[0];
        const ahead = (a.x - m.x) * dir;
        if (ahead > 0 && ahead < (def.len + v.def.len) * 0.6 + 6) sp = Math.min(sp, Math.abs(a.vx) * 0.9);
      }
      want = dir * sp;
    }
    const acc = u.type === 'tank' ? 14 : 30;
    m.vx += clamp(want - m.vx, -acc * dt * 2, acc * dt * 2);
    m.x = clamp(m.x + m.vx * dt, 20, field.W - 20);
    u.x = m.x;
    m.y = ground(S, m.x);
    m.ang = Math.atan(slopeAt(field, m.x) * 0.9);
    m.track += m.vx * dt;
    if (Math.abs(m.vx) > 2) m.face = Math.sign(m.vx);
    m.recoil = Math.max(0, m.recoil - dt * 2.5);
    if (retreat && Math.abs(m.x - field.bases[u.team]) < 60) u.order = { type: 'hold', x: m.x, target: 0 };
    if (Math.abs(m.x - field.bases[u.team]) < RULES.baseHealRadius) m.hp = Math.min(m.maxHp, m.hp + 28 * dt);
    m.smoke = m.hp < m.maxHp * 0.4 ? 1 : 0;
    if (retreat) { for (const wp of m.weapons) wp.target = null; return; }
    stepMounted(S, u, m, dt);
  }

  function stepMounted(S, u, m, dt) {
    m.weapons.forEach((wp, wi) => {
      const w = wp.w;
      wp.retarget -= dt;
      if (wp.retarget <= 0) {
        wp.retarget = S.rnd.range(0.35, 0.6);
        wp.target = pickTarget(S, m, w);
      }
      if (wp.target && !targetable(wp.target)) wp.target = null;
      const t = wp.target;
      // aim: turrets swing toward the target, or rest forward
      const mz = muzzle(m, wi);
      const want = t ? Math.atan2(centerY(t) - mz.y, t.x - mz.x) : (m.face > 0 ? m.ang : Math.PI + m.ang);
      let da = want - wp.aim;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      const rate = u.kind === 'air' ? 6 : u.type === 'tank' && wi === 0 ? 1.5 : 3;
      wp.aim += clamp(da, -rate * dt, rate * dt);
      if (!t) { wp.burst = 0; return; }
      u.engagedT = S.t;
      if (Math.abs(da) > 0.1 && u.kind !== 'air') return;
      if (wp.burst > 0) {
        wp.gap -= dt;
        if (wp.gap <= 0) {
          fire(S, m, w, t, wi);
          wp.burst--;
          wp.gap = w.gap;
          if (wp.burst === 0) wp.cd = S.rnd.range(w.cd[0], w.cd[1]);
        }
        return;
      }
      wp.cd -= dt;
      if (wp.cd <= 0) { wp.burst = S.rnd.int(w.burst[0], w.burst[1]); wp.gap = 0; }
    });
  }

  // ---- helicopter

  function stepHeli(S, u, dt) {
    const m = u.members[0];
    if (!m.alive) return;
    const field = S.field;
    m.rotor += dt * 40;
    if (m.falling) {
      m.vy -= 130 * dt;
      m.vx *= 1 - 0.4 * dt;
      m.spin += dt * 5;
      m.x = clamp(m.x + m.vx * dt, 20, field.W - 20);
      m.y += m.vy * dt;
      u.x = m.x;
      if (m.y <= ground(S, m.x) + 4) {
        m.y = ground(S, m.x) + 4;
        m.alive = false;
        m.deadT = S.t;
        explode(S, m.x, m.y, 46, 70, 'shell', -1, true);
        emit(S, { t: 'vehDie', x: m.x, y: m.y, type: u.type, team: u.team, face: m.face, ang: m.spin });
        addWreck(S, m);
        u.alive = false;
        emit(S, { t: 'unitLost', team: u.team, type: u.type, x: m.x });
      }
      return;
    }
    const o = u.order;
    let gx = goalX(S, u);
    const retreat = o.type === 'retreat';
    const t = m.weapons[0].target || m.weapons[1].target;
    if (!retreat && t && o.type !== 'move') {
      // hold a standoff from what it is shooting
      const side = Math.sign(m.x - t.x) || -u.dir;
      const stand = 260;
      if (Math.abs(m.x - t.x) < stand - 40 || Math.abs(m.x - t.x) > stand + 80) gx = t.x + side * stand;
      else gx = m.x;
    }
    const dx = gx - m.x;
    const want = Math.abs(dx) < 6 ? 0 : Math.sign(dx) * Math.min(u.def.speed * (retreat ? 1.2 : 1), Math.abs(dx) * 1.2);
    m.vx += clamp(want - m.vx, -60 * dt, 60 * dt);
    m.x = clamp(m.x + m.vx * dt, 20, field.W - 20);
    u.x = m.x;
    let top = 0;
    for (let x = m.x - 90; x <= m.x + 90; x += 15) top = Math.max(top, ground(S, x));
    const ty = top + 150 + Math.sin(S.t * 1.3 + u.id) * 6;
    m.vy += clamp((ty - m.y) * 1.5 - m.vy, -40 * dt, 40 * dt);
    m.y += m.vy * dt;
    if (t) m.face = Math.sign(t.x - m.x) || m.face;
    else if (Math.abs(m.vx) > 8) m.face = Math.sign(m.vx);
    m.ang = clamp(-m.vx / 300, -0.25, 0.25) * m.face * -1;
    if (retreat && Math.abs(m.x - field.bases[u.team]) < 60) u.order = { type: 'hold', x: m.x, target: 0 };
    if (Math.abs(m.x - field.bases[u.team]) < RULES.baseHealRadius) m.hp = Math.min(m.maxHp, m.hp + 22 * dt);
    m.smoke = m.hp < m.maxHp * 0.4 ? 1 : 0;
    if (retreat) { for (const wp of m.weapons) wp.target = null; return; }
    stepMounted(S, u, m, dt);
  }

  // ---- projectiles

  function stepProjectiles(S, dt) {
    for (const p of S.proj) {
      if (!p.on) continue;
      p.ttl -= dt;
      if (p.ttl <= 0) { p.on = false; continue; }
      if (p.kind === 'arty') {
        p.vy -= 40 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.y <= ground(S, p.x)) {
          p.on = false;
          const sp = SUPPORT.arty;
          explode(S, p.x, ground(S, p.x), sp.radius, sp.dmg, 'arty', p.team, true);
        }
        continue;
      }
      const sx = p.vx * dt, sy = p.vy * dt;
      const stepLen = Math.hypot(sx, sy);
      if (!p.passed && stepLen >= p.left) {
        // arrival at the planned point
        p.x = p.dest.x; p.y = p.dest.y;
        arrive(S, p);
        continue;
      }
      p.x += sx; p.y += sy;
      if (!p.passed) p.left -= stepLen;
      const g = ground(S, p.x);
      if (p.y <= g) {
        p.y = g;
        p.on = false;
        if (p.kind === 'bullet') emit(S, { t: 'dirt', x: p.x, y: g, team: p.team });
        else impactExplode(S, p, p.x, g);
      }
      if (p.x < -50 || p.x > S.field.W + 50 || p.y > 2000) p.on = false;
    }
  }

  function arrive(S, p) {
    const w = p.w;
    if (p.hit && targetable(p.hit)) {
      const t = p.hit;
      if (w.splash) {
        damage(S, t, w.dmg, w.cls, p.team);
        impactExplode(S, p, p.x, p.y, t);
        p.on = false;
      } else {
        damage(S, t, w.dmg, w.cls, p.team);
        if (!t.veh) { t.supp = Math.min(100, t.supp + w.supp); t.suppT = S.t; }
        p.on = false;
      }
      return;
    }
    if (p.absorbed) {
      emit(S, { t: 'spark', x: p.x, y: p.y, team: p.team });
      p.on = false;
      if (w.splash) impactExplode(S, p, p.x, p.y);
      return;
    }
    // a miss: it suppresses whoever it passes near
    suppressNear(S, p.x, p.y, w.supp, 1 - p.team, w.proj === 'bullet' ? 24 : 34);
    if (w.splash) { impactExplode(S, p, p.x, p.y); p.on = false; return; }
    p.passed = true;
    p.ttl = Math.min(p.ttl, 0.5);
  }

  function impactExplode(S, p, x, y, direct) {
    const w = p.w;
    if (!w.splash) return;
    p.on = false;
    // the direct target already took the full hit; splash spares it
    const r = w.splash;
    if (direct) direct._spare = true;
    explode(S, x, y, r, w.splashDmg, w.cls, p.team, false);
    if (direct) direct._spare = false;
  }

  function suppressNear(S, x, y, amount, team, rad) {
    for (const u of S.units) {
      if (!u.alive || u.team !== team || u.kind !== 'inf') continue;
      if (Math.abs(u.x - x) > rad + 60) continue;
      for (const m of u.members) {
        if (!m.alive || m.rappel) continue;
        const d = Math.hypot(m.x - x, centerY(m) - y);
        if (d < rad) { m.supp = Math.min(100, m.supp + amount * (1 - d / rad * 0.5)); m.suppT = S.t; if (S.rnd() < 0.3) m.flinch = 0.2; }
      }
    }
  }

  // ---- support

  function stepStrikes(S, dt) {
    for (const s of S.strikes) {
      s.t -= dt;
      if (s.t > 0) continue;
      s.next -= dt;
      if (s.next <= 0 && s.shells > 0) {
        s.shells--;
        s.next = 0.38 + S.rnd() * 0.25;
        const x = s.x + S.rnd.range(-s.spread / 2, s.spread / 2);
        const p = spawnProj(S);
        if (p) {
          p.kind = 'arty'; p.team = s.team; p.x = x + 60 * (s.team === 0 ? -1 : 1); p.y = ground(S, x) + 760;
          p.vx = (x - p.x) / 1.05; p.vy = -700; p.ttl = 4; p.w = null; p.passed = true; p.hit = null; p.absorbed = null;
          emit(S, { t: 'artyShell', x, team: s.team });
        }
      }
    }
    S.strikes = S.strikes.filter((s) => s.shells > 0 || s.t > 0);
  }

  function stepTransports(S, dt) {
    for (const tr of S.transports) {
      tr.rotor += dt * 40;
      tr.t += dt;
      const gy = ground(S, tr.tx);
      if (tr.phase === 'in') {
        const dx = tr.tx - tr.x;
        const sp = Math.min(150, Math.abs(dx) * 1.1 + 20);
        tr.x += Math.sign(dx) * Math.min(Math.abs(dx), sp * dt);
        tr.y += ((gy + 165) - tr.y) * dt * 2;
        if (Math.abs(dx) < 2) { tr.phase = 'hover'; tr.t = 0; }
      } else if (tr.phase === 'hover') {
        tr.y += ((gy + 120) - tr.y) * dt * 2;
        tr.next -= dt;
        const ms = tr.unit.members;
        if (tr.next <= 0 && tr.t > 0.8) {
          const m = ms.find((k) => k.alive && k.rappel && k.rappel.stage === 'wait');
          if (m) {
            m.rappel.stage = 'down';
            m.rappel.y = tr.y - 8;
            m.x = tr.x + tr.face * 3;
            tr.next = 0.5;
          } else if (!ms.some((k) => k.alive && k.rappel)) {
            tr.phase = 'out'; tr.t = 0;
            // the squad spreads out from the rope
            ms.forEach((k) => { k.x = tr.tx + k.slot * 0.4; });
          }
        }
      } else {
        tr.x += tr.face * -1 * 160 * dt * Math.min(1, tr.t);
        tr.y += 40 * dt;
      }
    }
    S.transports = S.transports.filter((tr) => tr.phase !== 'out' || (tr.x > -200 && tr.x < S.field.W + 200));
  }

  // ---- sectors, income, end

  function stepSectors(S, dt) {
    const R = RULES.captureRadius;
    for (const s of S.field.sectors) {
      const pts = [0, 0];
      for (const u of S.units) {
        if (!u.alive || u.kind === 'air') continue;
        if (Math.abs(u.x - s.x) > R + 60) continue;
        for (const m of u.members) {
          if (!m.alive || m.rappel) continue;
          if (Math.abs(m.x - s.x) <= R) pts[u.team] += m.veh ? 3 : 1;
        }
      }
      s.pts = pts;
      s.contested = pts[0] > 0 && pts[1] > 0;
      if (s.contested) continue;
      let side = pts[0] > 0 ? 0 : pts[1] > 0 ? 1 : -1;
      if (side < 0) {
        if (s.owner >= 0) s.prog += (s.owner === 0 ? 1 : -1) * 8 * dt;
        s.prog = clamp(s.prog, -100, 100);
        continue;
      }
      const p = pts[side];
      const rate = 5 + 1.7 * Math.min(p, 8);
      const before = s.owner;
      s.prog = clamp(s.prog + (side === 0 ? 1 : -1) * rate * dt, -100, 100);
      if (s.owner === 1 && s.prog > 0) s.owner = -1;
      if (s.owner === 0 && s.prog < 0) s.owner = -1;
      if (s.prog >= 100) s.owner = 0;
      if (s.prog <= -100) s.owner = 1;
      if (before !== s.owner) emit(S, { t: 'sector', id: s.id, owner: s.owner, from: before, x: s.x });
    }
  }

  function stepEconomy(S, dt) {
    const owned = [0, 0];
    for (const s of S.field.sectors) if (s.owner >= 0) owned[s.owner]++;
    for (const T of S.teams) {
      T.income = RULES.baseIncome + RULES.sectorIncome * owned[T.id];
      T.rp += T.income * (T.incomeMul || 1) * dt;
      T.owned = owned[T.id];
    }
    const diff = owned[0] - owned[1];
    if (diff > 0) S.teams[1].tickets -= RULES.drainPerSector * diff * dt;
    if (diff < 0) S.teams[0].tickets -= RULES.drainPerSector * -diff * dt;
    for (const T of S.teams) T.tickets = Math.max(0, T.tickets);
    if (S.teams[0].tickets <= 0 || S.teams[1].tickets <= 0) {
      S.over = true;
      S.winner = S.teams[0].tickets <= 0 ? 1 : 0;
      S.endT = S.t;
      emit(S, { t: 'end', winner: S.winner });
    }
  }

  BL.DT = DT;
  BL.createBattle = createBattle;
  BL.step = step;
  BL.deploy = deploy;
  BL.deployPoints = deployPoints;
  BL.order = order;
  BL.canAfford = canAfford;
  BL.popCount = popCount;
  BL.teamSees = teamSees;
  BL.visible = visible;
  BL.muzzle = muzzle;
  BL.centerY = centerY;
  BL.targetable = targetable;
  BL.aliveMembers = aliveMembers;
  BL.groundY = ground;
  BL._internal = { explode, damage, fire, pickTarget, hitChance, updateSight, seenBy };
})(typeof window !== 'undefined' ? window : globalThis);
