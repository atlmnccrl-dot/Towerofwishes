// BLACKLINE — the battle simulation on a 2D field seen from above. Pure logic, no DOM.
// Team 0 is the player's (west), team 1 the enemy (east). x east, y south, z height.
(function (root) {
  const BL = root.BL || (root.BL = {});
  const { rng, clamp, UNITS, WEAPONS, SUPPORT, RULES, ARMOR } = BL;
  const { heightAt, coverAt, inWoods, speedAt, los, findPath, walkable } = BL;

  const DT = 1 / 30;
  const MAX_PROJ = 520;
  const TAU = Math.PI * 2;

  // ---------------------------------------------------------------- creation

  function createBattle(opts) {
    opts = opts || {};
    const seed = opts.seed || 1;
    const field = BL.buildMap(opts.map || 'valley');
    const S = {
      t: 0, seed, field,
      rnd: rng(seed * 9973 + 17),
      units: [], nextId: 1, proj: [], events: [], strikes: [], transports: [], wrecks: [], corpses: [], craters: [],
      over: false, winner: -1, sightT: 0,
      teams: [0, 1].map((id) => ({
        id, rp: RULES.startRP, tickets: RULES.tickets, cds: {}, vis: new Map(),
        stats: { kills: 0, lost: 0, spent: 0, deployed: 0, vehKills: 0 }, income: RULES.baseIncome, owned: 0,
      })),
      ai: [null, null],
      difficulty: opts.difficulty || 'veteran',
    };
    S.allowed = (opts.allowed || [null, null]).map((a) => (a ? new Set(a) : null));
    S.drain = opts.drain !== false;
    S.calm = !!opts.calm;
    S.aiCfg = opts.aiCfg || [{}, {}];
    if (opts.sectors) for (const s of field.sectors) {
      const o = opts.sectors[s.id];
      if (o == null) continue;
      s.owner = o; s.prog = o === 0 ? 100 : o === 1 ? -100 : 0;
    }
    if (opts.startRP) opts.startRP.forEach((rp, team) => { if (rp != null) S.teams[team].rp = rp; });
    if (opts.ai) opts.ai.forEach((on, team) => { if (on) S.ai[team] = BL.createAI(S, team); });
    return S;
  }

  function emit(S, ev) { if (S.events.length < 3000) S.events.push(ev); }
  function ground(S, x, y) { return heightAt(S.field, x, y); }
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // ---------------------------------------------------------------- units

  function makeUnit(S, team, type, x, y) {
    const def = UNITS[type];
    const head = team === 0 ? 0 : Math.PI;
    const u = {
      id: S.nextId++, team, type, def, kind: def.kind, x, y, heading: head,
      order: { type: 'hold', x, y, target: 0 }, path: [],
      members: [], alive: true, engagedT: -99, spawnT: S.t, reinforceT: 0, holdT: 0, halted: true,
    };
    if (def.kind === 'inf') {
      const n = def.load.length;
      for (let i = 0; i < n; i++) {
        // a loose two-deep line across the direction of travel
        const slot = { a: (i - (n - 1) / 2) * 12 + S.rnd.range(-3, 3), b: (i % 2 ? -8 : 0) + S.rnd.range(-3, 3) };
        const p = slotPos(u, slot);
        u.members.push(makeSoldier(S, u, def.load[i], p.x, p.y, slot));
      }
    } else {
      const z = ground(S, x, y);
      u.members.push({
        unit: u, veh: true, x, y, z, alt: def.kind === 'air' ? z + 110 : z, hp: def.hp, maxHp: def.hp,
        heading: head, speed: 0, vx: 0, vy: 0, alive: true, deadT: 0, track: 0, recoil: 0, rotor: 0,
        falling: false, spin: 0, smoke: 0, face: team === 0 ? 1 : -1,
        weapons: def.load.map((k) => ({ key: k, w: WEAPONS[k], cd: S.rnd.range(0.5, 1.5), burst: 0, gap: 0, target: null, aim: head, retarget: S.rnd.range(0, 0.4) })),
      });
    }
    S.units.push(u);
    return u;
  }

  function slotPos(u, slot) {
    const c = Math.cos(u.heading), s = Math.sin(u.heading);
    // a = across the heading, b = along it (negative = behind)
    return { x: u.x - s * slot.a + c * slot.b, y: u.y + c * slot.a + s * slot.b };
  }

  function makeSoldier(S, u, key, x, y, slot) {
    return {
      unit: u, veh: false, x, y, z: ground(S, x, y), slot, hp: u.def.hp, maxHp: u.def.hp,
      wkey: key, w: WEAPONS[key], alt: key === 'at' ? WEAPONS.rifle : null,
      cd: S.rnd.range(0.3, 1.4), burst: 0, gap: 0, useAlt: false,
      target: null, retarget: S.rnd.range(0, 0.6), supp: 0, suppT: 0, stance: 'stand',
      moving: false, face: u.team === 0 ? 1 : -1, dir: u.heading, phase: S.rnd.range(0, 6.28), alive: true, deadT: 0,
      setup: 0, flinch: 0, rappel: null, speedK: S.rnd.range(0.92, 1.08), cover: null,
    };
  }

  function aliveMembers(u) { return u.members.filter((m) => m.alive); }
  function targetable(m) { return m.alive && !m.rappel && !(m.veh && m.falling); }
  function armorOf(m) { return m.unit.def.armor; }

  function centerZ(m) {
    if (m.veh) return m.unit.kind === 'air' ? m.alt : m.z + m.unit.def.hgt * 0.5;
    return m.z + (m.stance === 'prone' ? 1.6 : m.stance === 'crouch' ? 4.2 : 6);
  }
  function eyeZ(m) {
    if (m.veh) return m.unit.kind === 'air' ? m.alt : m.z + m.unit.def.hgt * 0.95;
    return m.z + (m.stance === 'prone' ? 2.4 : m.stance === 'crouch' ? 5.5 : 8);
  }

  // Where a shot leaves the weapon (shared with the renderer).
  function muzzle(m, wi) {
    if (!m.veh) {
      const a = m.dir;
      return { x: m.x + Math.cos(a) * 5, y: m.y + Math.sin(a) * 5, z: m.z + (m.stance === 'prone' ? 2 : m.stance === 'crouch' ? 4.8 : 6.8) };
    }
    const d = m.unit.def;
    const wp = m.weapons[wi || 0];
    const a = wp ? wp.aim : m.heading;
    if (m.unit.kind === 'air') return { x: m.x + Math.cos(m.heading) * d.len * 0.3, y: m.y + Math.sin(m.heading) * d.len * 0.3, z: m.alt - 6 };
    const L = wp && wp.key === 'coax' ? d.len * 0.3 : d.len * 0.62;
    const tx = m.x - Math.cos(m.heading) * d.len * 0.06, ty = m.y - Math.sin(m.heading) * d.len * 0.06;
    return { x: tx + Math.cos(a) * L, y: ty + Math.sin(a) * L, z: m.z + d.hgt * 0.8 };
  }

  // ---------------------------------------------------------------- deployment

  function deployPoints(S, team, type) {
    const pts = [S.field.bases[team]];
    const def = UNITS[type];
    if (def && def.kind === 'inf') for (const s of S.field.sectors) if (s.owner === team) pts.push({ x: s.x, y: s.y });
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
    if (S.allowed && S.allowed[team] && !S.allowed[team].has(type)) return 'locked';
    if (T.rp < cost) return 'rp';
    if ((T.cds[type] || 0) > S.t) return 'cooldown';
    if ((UNITS[type] || type === 'insert') && popCount(S, team) >= RULES.popCap) return 'cap';
    return null;
  }

  function teamSees(S, team, x, y) {
    const b = S.field.bases[team];
    if (Math.hypot(b.x - x, b.y - y) < 320) return true;
    for (const s of S.field.sectors) if (s.owner === team && Math.hypot(s.x - x, s.y - y) < 320) return true;
    for (const u of S.units) {
      if (!u.alive || u.team !== team) continue;
      for (const m of u.members) if (m.alive && !m.rappel && Math.hypot(m.x - x, m.y - y) < u.def.sight * 0.8) return true;
    }
    return false;
  }

  function deploy(S, team, type, x, y, force) {
    if (S.over) return { ok: false, reason: 'over' };
    const bad = canAfford(S, team, type);
    if (bad) return { ok: false, reason: bad };
    const T = S.teams[team];
    x = clamp(x, 40, S.field.W - 40); y = clamp(y, 40, S.field.H - 40);
    if (type === 'arty') {
      const sp = SUPPORT.arty;
      S.strikes.push({ team, x, y, t: sp.delay, shells: sp.shells, next: 0, spread: sp.spread });
      emit(S, { t: 'artyWarn', team, x, y });
      pay(S, T, type, sp.cost, sp.cd);
      return { ok: true, x, y };
    }
    if (type === 'insert') {
      if (!force && !teamSees(S, team, x, y)) return { ok: false, reason: 'sight' };
      if (!walkable(S.field, 'inf', x, y)) return { ok: false, reason: 'ground' };
      const sp = SUPPORT.insert;
      const u = makeUnit(S, team, sp.unit, x, y);
      const b = S.field.bases[team];
      const tr = { team, x: b.x - (team === 0 ? 200 : -200), y: b.y, alt: 0, tx: x, ty: y, phase: 'in', t: 0, unit: u, heading: 0, next: 0, rotor: 0 };
      tr.heading = Math.atan2(y - tr.y, x - tr.x);
      tr.alt = ground(S, tr.x, tr.y) + 130;
      for (const m of u.members) m.rappel = { stage: 'wait', z: 0 };
      S.transports.push(tr);
      emit(S, { t: 'insert', team, x, y });
      pay(S, T, type, sp.cost, sp.cd);
      return { ok: true, unit: u, x, y };
    }
    const pts = deployPoints(S, team, type);
    let best = pts[0];
    for (const p of pts) if (Math.hypot(p.x - x, p.y - y) < Math.hypot(best.x - x, best.y - y)) best = p;
    const u = makeUnit(S, team, type, best.x + S.rnd.range(-20, 20), best.y + S.rnd.range(-30, 30));
    u.order = { type: 'hold', x: u.x, y: u.y, target: 0 };
    pay(S, T, type, UNITS[type].cost, UNITS[type].cd);
    emit(S, { t: 'deploy', team, x: u.x, y: u.y, id: u.id, type });
    return { ok: true, unit: u, x: u.x, y: u.y };
  }

  function pay(S, T, type, cost, cd) {
    T.rp -= cost; T.cds[type] = S.t + cd; T.stats.spent += cost; T.stats.deployed++;
  }

  // ---------------------------------------------------------------- orders

  function order(S, ids, type, x, y, targetId) {
    const list = ids.map((id) => S.units.find((u) => u.id === id && u.alive)).filter(Boolean);
    if (!list.length) return 0;
    const n = list.length;
    let cx = 0, cy = 0;
    for (const u of list) { cx += u.x; cy += u.y; }
    cx /= n; cy /= n;
    // several units spread across the line of advance
    const ang = x == null ? 0 : Math.atan2(y - cy, x - cx);
    list.sort((a, b) => (-Math.sin(ang) * a.x + Math.cos(ang) * a.y) - (-Math.sin(ang) * b.x + Math.cos(ang) * b.y));
    list.forEach((u, i) => {
      let ox = x, oy = y;
      if (type === 'retreat') { ox = S.field.bases[u.team].x; oy = S.field.bases[u.team].y; }
      else if (x == null) { ox = u.x; oy = u.y; }
      else if (n > 1) {
        const off = (i - (n - 1) / 2) * 46;
        ox += -Math.sin(ang) * off; oy += Math.cos(ang) * off;
      }
      ox = clamp(ox, 30, S.field.W - 30); oy = clamp(oy, 30, S.field.H - 30);
      u.order = { type, x: ox, y: oy, target: targetId || 0 };
      u.holdT = 0;
      setPath(S, u, ox, oy);
      for (const m of u.members) if (!m.veh) m.cover = null;
    });
    return list.length;
  }

  function setPath(S, u, x, y) {
    if (u.kind === 'air') { u.path = [{ x, y }]; return; }
    u.path = findPath(S.field, u.kind === 'inf' ? 'inf' : 'veh', u.x, u.y, x, y);
    u.pathGoal = { x, y };
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
      if (Math.abs(u.x - target.x) > sight + 90 || Math.abs(u.y - target.y) > sight + 90) continue;
      const eyes = u.members.filter(targetable);
      for (let i = 0; i < eyes.length; i += eyes.length > 3 ? 2 : 1) {
        const e = eyes[i];
        for (let j = 0; j < tm.length; j += tm.length > 3 ? 2 : 1) {
          const t = tm[j];
          let r = sight;
          // woods hide whoever stands in them
          if (!t.veh || t.unit.kind !== 'air') if (inWoods(S.field, t.x, t.y)) r *= 0.42;
          const dx = t.x - e.x, dy = t.y - e.y;
          if (dx * dx + dy * dy > r * r) continue;
          if (los(S.field, e.x, e.y, eyeZ(e), t.x, t.y, centerZ(t) + 1.5)) return true;
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
    const u = m.unit, team = u.team;
    const oz = eyeZ(m);
    let best = null, bestScore = 1e9;
    const forced = u.order.type === 'attack' && u.order.target ? u.order.target : 0;
    for (const e of S.units) {
      if (!e.alive || e.team === team) continue;
      if (Math.abs(e.x - m.x) > w.range + 80 || Math.abs(e.y - m.y) > w.range + 80) continue;
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
        const dx = t.x - m.x, dy = t.y - m.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > w.range * w.range) continue;
        const score = Math.sqrt(d2) * pref + (t.stance === 'prone' ? 40 : 0);
        if (score >= bestScore) continue;
        if (!los(S.field, m.x, m.y, oz, t.x, t.y, centerZ(t))) continue;
        best = t; bestScore = score;
      }
    }
    return best;
  }

  function hitChance(S, shooter, target, w, d) {
    const rf = 1 - 0.55 * clamp(d / w.range, 0, 1);
    let p = w.acc * rf;
    if (!target.veh) {
      if (target.stance === 'prone') p *= 0.45;
      else if (target.stance === 'crouch') p *= 0.75;
      if (target.moving) p *= 0.88;
    } else if (target.unit.kind === 'air') {
      p *= w.airAcc != null ? w.airAcc / Math.max(0.01, w.acc) * 0.9 : 0.8;
    } else p = Math.min(0.95, p * 1.45);
    if (!shooter.veh) {
      p *= 1 - (shooter.supp / 100) * 0.7;
      if (shooter.moving) p *= 0.7;
    } else if (shooter.speed > 6) p *= shooter.unit.kind === 'air' ? 0.85 : 0.62;
    return clamp(p, 0.02, 0.95);
  }

  // ---------------------------------------------------------------- firing

  function fire(S, m, w, target, wi) {
    const mz = muzzle(m, wi);
    const tx = target.x, ty = target.y, tz = centerZ(target);
    const d = Math.hypot(tx - mz.x, ty - mz.y);
    const p = hitChance(S, m, target, w, d);
    let hit = S.rnd() < p;
    let absorbed = false;
    if (hit && !target.veh) {
      let v = coverAt(S.field, target.x, target.y);
      if (v > 0) {
        if (target.unit.order.type === 'hold' && target.unit.holdT > 4) v += 0.12;
        if (S.rnd() < v) { hit = false; absorbed = true; }
      }
    }
    let dx, dy, dz;
    if (hit) { dx = tx; dy = ty; dz = tz; }
    else if (absorbed) {
      const k = 1 - 5 / Math.max(6, d);
      dx = mz.x + (tx - mz.x) * k; dy = mz.y + (ty - mz.y) * k; dz = ground(S, dx, dy) + S.rnd.range(1, 4);
    } else {
      const a = S.rnd() * TAU, r = S.rnd.range(6, 30);
      dx = tx + Math.cos(a) * r; dy = ty + Math.sin(a) * r;
      dz = w.proj === 'bullet' ? tz + S.rnd.range(-6, 10) : ground(S, dx, dy) + 1;
    }
    const L = Math.max(1, Math.hypot(dx - mz.x, dy - mz.y, dz - mz.z));
    const pr = spawnProj(S);
    if (!pr) return;
    const sp = w.speed;
    pr.kind = w.proj; pr.team = m.unit.team;
    pr.x = mz.x; pr.y = mz.y; pr.z = mz.z;
    pr.vx = (dx - mz.x) / L * sp; pr.vy = (dy - mz.y) / L * sp; pr.vz = (dz - mz.z) / L * sp;
    pr.left = L; pr.dx = dx; pr.dy = dy; pr.dz = dz;
    pr.hit = hit ? target : null; pr.absorbed = absorbed; pr.w = w; pr.ttl = 3; pr.passed = false; pr.src = m;
    S.teams[1 - m.unit.team].vis.set(m.unit.id, S.t);
    emit(S, { t: 'shot', x: mz.x, y: mz.y, z: mz.z, a: Math.atan2(dy - mz.y, dx - mz.x), team: m.unit.team, w: w.proj, k: m.veh ? m.unit.type : 'inf', wk: w.name });
    if (m.veh && w.proj === 'shell') m.recoil = 1;
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
    const dmg = amount * ARMOR[cls][armorOf(m)];
    if (dmg <= 0) return;
    m.hp -= dmg;
    if (m.veh) emit(S, { t: 'hit', x: m.x, y: m.y, z: centerZ(m), armor: armorOf(m), big: dmg > 60 });
    else { m.flinch = 0.3; emit(S, { t: 'blood', x: m.x, y: m.y, z: centerZ(m) }); }
    if (m.hp <= 0) kill(S, m, fromTeam);
  }

  function kill(S, m, fromTeam) {
    const u = m.unit;
    m.hp = 0;
    if (m.veh && u.kind === 'air' && !m.falling) {
      m.falling = true; m.spin = 0;
      emit(S, { t: 'heliHit', x: m.x, y: m.y, z: m.alt, team: u.team });
      creditKill(S, u, fromTeam, true);
      return;
    }
    m.alive = false; m.deadT = S.t;
    if (m.veh) {
      if (u.kind !== 'air') creditKill(S, u, fromTeam, true);
      explode(S, m.x, m.y, centerZ(m), u.kind === 'air' ? 40 : 34, 50, 'shell', -1, true);
      emit(S, { t: 'vehDie', x: m.x, y: m.y, z: m.z, type: u.type, team: u.team });
      addWreck(S, m);
    } else {
      creditKill(S, u, fromTeam, false);
      if (S.corpses.length > 160) S.corpses.shift();
      S.corpses.push({ x: m.x, y: m.y, dir: m.dir, team: u.team, t: S.t, wkey: m.wkey });
      emit(S, { t: 'die', x: m.x, y: m.y, team: u.team });
    }
    if (!u.members.some((k) => k.alive)) { u.alive = false; emit(S, { t: 'unitLost', team: u.team, type: u.type, x: u.x, y: u.y }); }
  }

  function creditKill(S, u, fromTeam, veh) {
    const T = S.teams[u.team];
    T.tickets = Math.max(0, T.tickets - u.def.tickets);
    T.stats.lost++;
    if (fromTeam === 0 || fromTeam === 1) { S.teams[fromTeam].stats.kills++; if (veh) S.teams[fromTeam].stats.vehKills++; }
  }

  function addWreck(S, m) {
    const u = m.unit;
    if (S.wrecks.length >= 12) {
      const old = S.wrecks.shift();
      const i = S.field.extraCover.indexOf(old.cover);
      if (i >= 0) S.field.extraCover.splice(i, 1);
    }
    const cover = { x: m.x, y: m.y, r: u.kind === 'air' ? 18 : u.def.len * 0.6, v: 0.42 };
    S.field.extraCover.push(cover);
    S.wrecks.push({ x: m.x, y: m.y, heading: m.heading + (u.kind === 'air' ? m.spin : 0), type: u.type, team: u.team, t: S.t, cover });
  }

  function explode(S, x, y, z, r, dmg, cls, team, ff) {
    const r2 = r * r, sr = r * 2.3;
    for (const u of S.units) {
      if (!u.alive) continue;
      if (Math.abs(u.x - x) > sr + 60 || Math.abs(u.y - y) > sr + 60) continue;
      const friendly = u.team === team;
      for (const m of u.members) {
        if (!m.alive || m.rappel) continue;
        const dx = m.x - x, dy = m.y - y, dz = (centerZ(m) - z) * 0.6;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (!m.veh) {
          const d = Math.sqrt(d2);
          if (d < sr) { m.supp = Math.min(100, m.supp + 70 * (1 - d / sr) * (friendly && !ff ? 0.4 : 1)); m.suppT = S.t; m.flinch = 0.3; }
        }
        if ((friendly && !ff) || m._spare) continue;
        if (d2 > r2) continue;
        let k = 1 - Math.sqrt(d2) / r;
        if (!m.veh) {
          if (m.stance === 'prone') k *= 0.6;
          if (BL.flagAt(S.field, m.x, m.y) & BL.MAPF.TRENCH) k *= 0.5;
        }
        damage(S, m, dmg * k, cls, team);
      }
    }
    const gz = ground(S, x, y);
    const onGround = z - gz < r * 0.6 && cls !== 'small';
    if (onGround) { if (S.craters.length > 60) S.craters.shift(); S.craters.push({ x, y, r: r * 0.7, t: S.t, fresh: true }); }
    emit(S, { t: 'boom', x, y, z, r, big: r >= 30, cls, ground: onGround });
  }

  // ---------------------------------------------------------------- per-step updates

  function step(S, dt) {
    dt = dt || DT;
    S.t += dt;
    if (S.over) return;
    S.sightT -= dt;
    if (S.sightT <= 0) { S.sightT = RULES.sightTick; updateSight(S); }
    if (!S.calm) for (let i = 0; i < 2; i++) if (S.ai[i]) BL.aiThink(S, i, dt);
    for (const u of S.units) {
      if (!u.alive) continue;
      if (u.kind === 'inf') stepSquad(S, u, dt);
      else if (u.kind === 'veh') stepVehicle(S, u, dt);
      else stepHeli(S, u, dt);
    }
    separate(S);
    stepProjectiles(S, dt);
    stepStrikes(S, dt);
    stepTransports(S, dt);
    if (!S.calm) { stepSectors(S, dt); stepEconomy(S, dt); }
    if (S.units.some((u) => !u.alive && !u.members.some((m) => m.alive))) S.units = S.units.filter((u) => u.alive || u.members.some((m) => m.alive));
    if (S.events.length > 2500) S.events.length = 0;
  }

  function goal(S, u) {
    const o = u.order;
    if (o.type === 'attack' && o.target) {
      const t = S.units.find((e) => e.id === o.target && e.alive);
      if (t && visible(S, u.team, t)) {
        const range = u.kind === 'inf' ? 240 : u.members[0].weapons[0].w.range * 0.7;
        const d = Math.hypot(u.x - t.x, u.y - t.y) || 1;
        const nx = t.x + (u.x - t.x) / d * range, ny = t.y + (u.y - t.y) / d * range;
        if (!u.pathGoal || Math.hypot(nx - u.pathGoal.x, ny - u.pathGoal.y) > 60) { o.x = nx; o.y = ny; setPath(S, u, nx, ny); }
      } else if (!t) o.target = 0;
    }
  }

  // Move a point along the unit's path; returns true while moving.
  function advance(S, u, sp, dt) {
    while (u.path.length && Math.hypot(u.path[0].x - u.x, u.path[0].y - u.y) < 6) u.path.shift();
    if (!u.path.length) return false;
    const p = u.path[0];
    const d = Math.hypot(p.x - u.x, p.y - u.y);
    const a = Math.atan2(p.y - u.y, p.x - u.x);
    u.heading = turn(u.heading, a, 5 * dt);
    const st = Math.min(d, sp * dt);
    u.x += Math.cos(a) * st; u.y += Math.sin(a) * st;
    return true;
  }

  function turn(cur, want, rate) {
    let d = want - cur;
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    return cur + clamp(d, -rate, rate);
  }

  // ---- infantry

  function stepSquad(S, u, dt) {
    const field = S.field;
    stepRappel(S, u, dt);
    const live = u.members.filter((m) => m.alive && !m.rappel);
    if (!live.length) return;
    goal(S, u);
    const o = u.order;
    const retreat = o.type === 'retreat';
    const engaged = S.t - u.engagedT < 1.6;
    const pinned = live.filter((m) => m.supp > 75).length;
    let near = 1e9;
    for (const m of live) if (m.target) near = Math.min(near, Math.hypot(m.target.x - m.x, m.target.y - m.y));
    const reach = u.def.load.includes('mg') ? 0.85 : 0.62;
    const range = WEAPONS[u.def.load[0]].range;
    let halt = false;
    if (o.type === 'attack' && engaged && (near < range * reach || pinned > live.length * 0.3 || near === 1e9)) halt = true;
    if (!retreat && pinned > live.length / 2) halt = true;

    let moving = false;
    if (!halt && u.path.length) {
      let sp = u.def.speed * (retreat ? 1.3 : 1) * speedAt(field, u.x, u.y, 'inf');
      // uphill is slower
      const p = u.path[0];
      const a = Math.atan2(p.y - u.y, p.x - u.x);
      const up = ground(S, u.x + Math.cos(a) * 12, u.y + Math.sin(a) * 12) - ground(S, u.x, u.y);
      sp *= 1 - clamp(up / 12 * 0.9, 0, 0.35);
      let avg = 0;
      for (const m of live) { const sp2 = slotPos(u, m.slot); avg += Math.hypot(m.x - sp2.x, m.y - sp2.y); }
      if (avg / live.length > 30) sp *= 0.3;
      moving = advance(S, u, sp, dt);
    }
    u.halted = !moving;
    if (o.type === 'hold' && !moving) u.holdT += dt; else u.holdT = 0;
    const base = field.bases[u.team];
    if (retreat && !u.path.length) u.order = { type: 'hold', x: u.x, y: u.y, target: 0 };

    const atBase = Math.hypot(u.x - base.x, u.y - base.y) < RULES.baseHealRadius;
    if (atBase) {
      for (const m of live) m.hp = Math.min(m.maxHp, m.hp + 6 * dt);
      u.reinforceT += dt;
      if (u.reinforceT > 3.5 && live.length < u.def.load.length && !engaged) {
        u.reinforceT = 0;
        const idx = u.members.findIndex((m) => !m.alive);
        if (idx >= 0) {
          const old = u.members[idx];
          u.members[idx] = makeSoldier(S, u, u.def.load[idx] || 'rifle', base.x, base.y, old.slot);
          emit(S, { t: 'reinforce', team: u.team, x: base.x, y: base.y });
        }
      }
    }
    for (const m of live) stepSoldier(S, u, m, dt, moving, halt, retreat);
  }

  function stepRappel(S, u, dt) {
    for (const m of u.members) {
      if (!m.alive || !m.rappel || m.rappel.stage !== 'down') continue;
      m.rappel.z -= 60 * dt;
      const g = ground(S, m.x, m.y);
      if (m.rappel.z <= g) { m.rappel = null; m.z = g; m.stance = 'crouch'; emit(S, { t: 'land', x: m.x, y: m.y, team: u.team }); }
    }
  }

  function stepSoldier(S, u, m, dt, moving, halt, retreat) {
    const field = S.field;
    if (S.t - m.suppT > 1) m.supp = Math.max(0, m.supp - 16 * dt);
    if (m.flinch > 0) m.flinch -= dt;
    let tgt = slotPos(u, m.slot);
    // stopped: take the best cover close to the slot
    if (!moving && !retreat) {
      if (!m.cover || Math.hypot(m.cover.x - tgt.x, m.cover.y - tgt.y) > 50) {
        m.cover = null;
        let bv = coverAt(field, tgt.x, tgt.y) + 0.01, bx = tgt.x, by = tgt.y;
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * TAU, r = 18 + (k % 2) * 16;
          const cx = tgt.x + Math.cos(a) * r, cy = tgt.y + Math.sin(a) * r;
          const v = coverAt(field, cx, cy);
          if (v > bv + 0.05 && walkable(field, 'inf', cx, cy)) { bv = v; bx = cx; by = cy; }
        }
        m.cover = { x: bx, y: by };
      }
      tgt = m.cover;
    }
    tgt = { x: clamp(tgt.x, 10, field.W - 10), y: clamp(tgt.y, 10, field.H - 10) };
    const pinned = m.supp > 75 && !retreat;
    const dx = tgt.x - m.x, dy = tgt.y - m.y;
    const d = Math.hypot(dx, dy);
    m.moving = false;
    if (d > 1.5 && !pinned) {
      let sp = u.def.speed * m.speedK * (retreat ? 1.35 : 1) * (d > 20 ? 1.25 : 0.8) * speedAt(field, m.x, m.y, 'inf');
      if (m.stance === 'prone') sp *= 0.35;
      else if (m.supp > 40) sp *= 0.7;
      const st = Math.min(d, sp * dt);
      const nx = m.x + dx / d * st, ny = m.y + dy / d * st;
      if (walkable(field, 'inf', nx, ny)) { m.x = nx; m.y = ny; }
      m.moving = true;
      m.dir = Math.atan2(dy, dx);
      m.phase += dt * sp * 0.42;
      m.setup = 0;
    } else m.setup += dt;
    m.z = ground(S, m.x, m.y);
    if (m.supp > 75 && !retreat) m.stance = 'prone';
    else if (m.supp > 38 || (halt && (m.target || u.order.type === 'hold') && !m.moving)) m.stance = m.wkey === 'mg' && m.setup > 0.6 ? 'prone' : 'crouch';
    else m.stance = 'stand';
    if (m.moving && m.stance === 'prone' && !pinned) m.stance = 'crouch';
    m.face = Math.cos(m.dir) >= 0 ? 1 : -1;
    if (retreat || S.calm) { m.target = null; return; }

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
    m.dir = Math.atan2(m.target.y - m.y, m.target.x - m.x);
    m.face = Math.cos(m.dir) >= 0 ? 1 : -1;
    if (w.setup && m.setup < w.setup) return;
    if (m.stance === 'prone' && m.supp > 90 && S.rnd() < 0.7) m.cd = Math.max(m.cd, 0.4);
    if (m.burst > 0) {
      m.gap -= dt;
      if (m.gap <= 0) {
        fire(S, m, w, m.target, 0);
        m.burst--; m.gap = w.gap;
        if (m.burst === 0) m.cd = S.rnd.range(w.cd[0], w.cd[1]);
      }
      return;
    }
    m.cd -= dt;
    if (m.cd <= 0) { m.burst = S.rnd.int(w.burst[0], w.burst[1]); m.gap = 0; }
  }

  // ---- ground vehicles

  function stepVehicle(S, u, dt) {
    const m = u.members[0];
    if (!m.alive) return;
    const field = S.field, def = u.def;
    goal(S, u);
    const o = u.order;
    const retreat = o.type === 'retreat';
    const main = m.weapons[0];
    const engaged = main.target && targetable(main.target);
    const halt = o.type === 'attack' && engaged;
    let want = 0;
    while (u.path.length && Math.hypot(u.path[0].x - m.x, u.path[0].y - m.y) < 14) u.path.shift();
    if (!halt && u.path.length) {
      const p = u.path[0];
      const a = Math.atan2(p.y - m.y, p.x - m.x);
      const rate = u.type === 'tank' ? 1.1 : 1.8;
      m.heading = turn(m.heading, a, rate * dt);
      let da = Math.abs(a - m.heading); if (da > Math.PI) da = TAU - da;
      let sp = def.speed * (retreat ? 1.15 : 1) * speedAt(field, m.x, m.y, 'veh');
      const up = ground(S, m.x + Math.cos(m.heading) * 14, m.y + Math.sin(m.heading) * 14) - m.z;
      sp *= 1 - clamp(up / 14 * 0.8, 0, 0.5);
      const left = Math.hypot(p.x - m.x, p.y - m.y) + (u.path.length > 1 ? 100 : 0);
      if (left < 40) sp *= Math.max(0.3, left / 40);
      want = sp * Math.max(0, Math.cos(da));
    }
    const acc = u.type === 'tank' ? 16 : 30;
    m.speed += clamp(want - m.speed, -acc * dt * 2, acc * dt);
    const nx = m.x + Math.cos(m.heading) * m.speed * dt, ny = m.y + Math.sin(m.heading) * m.speed * dt;
    if (walkable(field, 'veh', nx, ny)) { m.x = clamp(nx, 20, field.W - 20); m.y = clamp(ny, 20, field.H - 20); } else m.speed *= 0.3;
    u.x = m.x; u.y = m.y; m.z = ground(S, m.x, m.y);
    m.track += m.speed * dt;
    m.face = Math.cos(m.heading) >= 0 ? 1 : -1;
    m.recoil = Math.max(0, m.recoil - dt * 2.5);
    if (retreat && !u.path.length) u.order = { type: 'hold', x: m.x, y: m.y, target: 0 };
    const base = field.bases[u.team];
    if (Math.hypot(m.x - base.x, m.y - base.y) < RULES.baseHealRadius) m.hp = Math.min(m.maxHp, m.hp + 28 * dt);
    m.smoke = m.hp < m.maxHp * 0.4 ? 1 : 0;
    if (retreat) { for (const wp of m.weapons) wp.target = null; return; }
    stepMounted(S, u, m, dt);
  }

  function stepMounted(S, u, m, dt) {
    if (S.calm) { for (const wp of m.weapons) wp.target = null; return; }
    m.weapons.forEach((wp, wi) => {
      const w = wp.w;
      wp.retarget -= dt;
      if (wp.retarget <= 0) { wp.retarget = S.rnd.range(0.35, 0.6); wp.target = pickTarget(S, m, w); }
      if (wp.target && !targetable(wp.target)) wp.target = null;
      const t = wp.target;
      const want = t ? Math.atan2(t.y - m.y, t.x - m.x) : m.heading;
      let da = want - wp.aim;
      while (da > Math.PI) da -= TAU;
      while (da < -Math.PI) da += TAU;
      const rate = u.kind === 'air' ? 6 : u.type === 'tank' && wi === 0 ? 1.4 : 3;
      wp.aim += clamp(da, -rate * dt, rate * dt);
      if (!t) { wp.burst = 0; return; }
      u.engagedT = S.t;
      if (Math.abs(da) > 0.1 && u.kind !== 'air') return;
      if (wp.burst > 0) {
        wp.gap -= dt;
        if (wp.gap <= 0) {
          fire(S, m, w, t, wi);
          wp.burst--; wp.gap = w.gap;
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
      m.alt -= (40 + m.spin * 30) * dt;
      m.spin += dt * 4;
      m.heading += dt * 4;
      m.x += m.vx * dt * 0.6; m.y += m.vy * dt * 0.6;
      u.x = m.x; u.y = m.y;
      if (m.alt <= ground(S, m.x, m.y) + 3) {
        m.alt = ground(S, m.x, m.y); m.alive = false; m.deadT = S.t;
        explode(S, m.x, m.y, m.alt, 46, 70, 'shell', -1, true);
        emit(S, { t: 'vehDie', x: m.x, y: m.y, z: m.alt, type: u.type, team: u.team });
        addWreck(S, m);
        u.alive = false;
        emit(S, { t: 'unitLost', team: u.team, type: u.type, x: m.x, y: m.y });
      }
      return;
    }
    goal(S, u);
    const o = u.order;
    const retreat = o.type === 'retreat';
    let gx = o.x, gy = o.y;
    const t = m.weapons[0].target || m.weapons[1].target;
    if (!retreat && t && o.type !== 'move') {
      const d = Math.hypot(m.x - t.x, m.y - t.y) || 1;
      const stand = 250;
      if (d < stand - 40 || d > stand + 80) { gx = t.x + (m.x - t.x) / d * stand; gy = t.y + (m.y - t.y) / d * stand; } else { gx = m.x; gy = m.y; }
    }
    const dx = gx - m.x, dy = gy - m.y, d = Math.hypot(dx, dy);
    const sp = d < 6 ? 0 : Math.min(u.def.speed * (retreat ? 1.2 : 1), d * 1.2);
    const wvx = d > 0 ? dx / d * sp : 0, wvy = d > 0 ? dy / d * sp : 0;
    m.vx += clamp(wvx - m.vx, -60 * dt, 60 * dt);
    m.vy += clamp(wvy - m.vy, -60 * dt, 60 * dt);
    m.x = clamp(m.x + m.vx * dt, 20, field.W - 20); m.y = clamp(m.y + m.vy * dt, 20, field.H - 20);
    u.x = m.x; u.y = m.y;
    m.speed = Math.hypot(m.vx, m.vy);
    m.z = ground(S, m.x, m.y);
    const top = Math.max(m.z, ground(S, m.x + m.vx, m.y + m.vy));
    const ta = top + 110 + Math.sin(S.t * 1.3 + u.id) * 5;
    m.alt += clamp(ta - m.alt, -40 * dt, 40 * dt);
    const face = t ? Math.atan2(t.y - m.y, t.x - m.x) : m.speed > 8 ? Math.atan2(m.vy, m.vx) : m.heading;
    m.heading = turn(m.heading, face, 2.5 * dt);
    m.face = Math.cos(m.heading) >= 0 ? 1 : -1;
    if (retreat && d < 30) u.order = { type: 'hold', x: m.x, y: m.y, target: 0 };
    const base = field.bases[u.team];
    if (Math.hypot(m.x - base.x, m.y - base.y) < RULES.baseHealRadius) m.hp = Math.min(m.maxHp, m.hp + 22 * dt);
    m.smoke = m.hp < m.maxHp * 0.4 ? 1 : 0;
    if (retreat) { for (const wp of m.weapons) wp.target = null; return; }
    stepMounted(S, u, m, dt);
  }

  // Ground vehicles and squads don't stack on one spot.
  function separate(S) {
    const vs = S.units.filter((u) => u.alive && u.kind === 'veh');
    for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) {
      const a = vs[i].members[0], b = vs[j].members[0];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.1;
      const min = (vs[i].def.len + vs[j].def.len) * 0.45;
      if (d < min) {
        const k = (min - d) / 2 / d;
        if (walkable(S.field, 'veh', a.x - dx * k, a.y - dy * k)) { a.x -= dx * k; a.y -= dy * k; vs[i].x = a.x; vs[i].y = a.y; }
        if (walkable(S.field, 'veh', b.x + dx * k, b.y + dy * k)) { b.x += dx * k; b.y += dy * k; vs[j].x = b.x; vs[j].y = b.y; }
      }
    }
  }

  // ---- projectiles

  function stepProjectiles(S, dt) {
    for (const p of S.proj) {
      if (!p.on) continue;
      p.ttl -= dt;
      if (p.ttl <= 0) { p.on = false; continue; }
      if (p.kind === 'arty') {
        p.vz -= 40 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        if (p.z <= ground(S, p.x, p.y)) {
          p.on = false;
          const sp = SUPPORT.arty;
          explode(S, p.x, p.y, ground(S, p.x, p.y), sp.radius, sp.dmg, 'arty', p.team, true);
        }
        continue;
      }
      const sx = p.vx * dt, sy = p.vy * dt, sz = p.vz * dt;
      const L = Math.hypot(sx, sy, sz);
      if (!p.passed && L >= p.left) { p.x = p.dx; p.y = p.dy; p.z = p.dz; arrive(S, p); continue; }
      p.x += sx; p.y += sy; p.z += sz;
      if (!p.passed) p.left -= L;
      const g = ground(S, p.x, p.y);
      if (p.z <= g && (p.passed || (!p.hit && !p.absorbed))) {
        p.z = g; p.on = false;
        if (p.kind === 'bullet') emit(S, { t: 'dirt', x: p.x, y: p.y, z: g });
        else impactExplode(S, p, p.x, p.y, g);
      }
      if (p.x < -50 || p.x > S.field.W + 50 || p.y < -50 || p.y > S.field.H + 50) p.on = false;
    }
  }

  function arrive(S, p) {
    const w = p.w;
    if (p.hit && targetable(p.hit)) {
      const t = p.hit;
      damage(S, t, w.dmg, w.cls, p.team);
      if (w.splash) impactExplode(S, p, p.x, p.y, p.z, t);
      else if (!t.veh) { t.supp = Math.min(100, t.supp + w.supp); t.suppT = S.t; }
      p.on = false;
      return;
    }
    if (p.absorbed) {
      emit(S, { t: 'spark', x: p.x, y: p.y, z: p.z });
      p.on = false;
      if (w.splash) impactExplode(S, p, p.x, p.y, p.z);
      return;
    }
    suppressNear(S, p.x, p.y, w.supp, 1 - p.team, w.proj === 'bullet' ? 26 : 36);
    if (w.splash) { impactExplode(S, p, p.x, p.y, p.z); p.on = false; return; }
    p.passed = true;
    p.ttl = Math.min(p.ttl, 0.5);
  }

  function impactExplode(S, p, x, y, z, direct) {
    const w = p.w;
    if (!w.splash) return;
    p.on = false;
    if (direct) direct._spare = true;
    explode(S, x, y, z, w.splash, w.splashDmg, w.cls, p.team, false);
    if (direct) direct._spare = false;
  }

  function suppressNear(S, x, y, amount, team, rad) {
    for (const u of S.units) {
      if (!u.alive || u.team !== team || u.kind !== 'inf') continue;
      if (Math.abs(u.x - x) > rad + 70 || Math.abs(u.y - y) > rad + 70) continue;
      for (const m of u.members) {
        if (!m.alive || m.rappel) continue;
        const d = Math.hypot(m.x - x, m.y - y);
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
        const a = S.rnd() * TAU, r = Math.sqrt(S.rnd()) * s.spread / 2;
        const x = s.x + Math.cos(a) * r, y = s.y + Math.sin(a) * r;
        const p = spawnProj(S);
        if (p) {
          p.kind = 'arty'; p.team = s.team; p.x = x - 50; p.y = y; p.z = ground(S, x, y) + 700;
          p.vx = 50 / 1.05; p.vy = 0; p.vz = -700; p.ttl = 4; p.w = null; p.passed = true; p.hit = null; p.absorbed = false;
          emit(S, { t: 'artyShell', x, y, team: s.team });
        }
      }
    }
    S.strikes = S.strikes.filter((s) => s.shells > 0 || s.t > 0);
  }

  function stepTransports(S, dt) {
    for (const tr of S.transports) {
      tr.rotor += dt * 40; tr.t += dt;
      const g = ground(S, tr.tx, tr.ty);
      if (tr.phase === 'in') {
        const dx = tr.tx - tr.x, dy = tr.ty - tr.y, d = Math.hypot(dx, dy);
        const sp = Math.min(150, d * 1.1 + 20);
        if (d > 1) { tr.x += dx / d * Math.min(d, sp * dt); tr.y += dy / d * Math.min(d, sp * dt); tr.heading = Math.atan2(dy, dx); }
        tr.alt += ((g + 130) - tr.alt) * dt * 2;
        if (d < 2) { tr.phase = 'hover'; tr.t = 0; }
      } else if (tr.phase === 'hover') {
        tr.alt += ((g + 70) - tr.alt) * dt * 2;
        tr.next -= dt;
        const ms = tr.unit.members;
        if (tr.next <= 0 && tr.t > 0.8) {
          const m = ms.find((k) => k.alive && k.rappel && k.rappel.stage === 'wait');
          if (m) {
            m.rappel.stage = 'down'; m.rappel.z = tr.alt - 6;
            const p = slotPos(tr.unit, m.slot);
            m.x = tr.x + (p.x - tr.unit.x) * 0.25; m.y = tr.y + (p.y - tr.unit.y) * 0.25;
            tr.next = 0.5;
          } else if (!ms.some((k) => k.alive && k.rappel)) { tr.phase = 'out'; tr.t = 0; }
        }
      } else {
        const b = S.field.bases[tr.team];
        const a = Math.atan2(b.y - tr.y, b.x - tr.x);
        tr.heading = turn(tr.heading, a, 2 * dt);
        tr.x += Math.cos(tr.heading) * 160 * dt * Math.min(1, tr.t);
        tr.y += Math.sin(tr.heading) * 160 * dt * Math.min(1, tr.t);
        tr.alt += 30 * dt;
      }
    }
    S.transports = S.transports.filter((tr) => tr.phase !== 'out' || tr.t < 12);
  }

  // ---- sectors, income, end

  function stepSectors(S, dt) {
    const R = RULES.captureRadius;
    for (const s of S.field.sectors) {
      const pts = [0, 0];
      for (const u of S.units) {
        if (!u.alive || u.kind === 'air') continue;
        if (Math.abs(u.x - s.x) > R + 80 || Math.abs(u.y - s.y) > R + 80) continue;
        for (const m of u.members) if (m.alive && !m.rappel && Math.hypot(m.x - s.x, m.y - s.y) <= R) pts[u.team] += m.veh ? 3 : 1;
      }
      s.pts = pts;
      s.contested = pts[0] > 0 && pts[1] > 0;
      if (s.contested) continue;
      const side = pts[0] > 0 ? 0 : pts[1] > 0 ? 1 : -1;
      if (side < 0) {
        if (s.owner >= 0) s.prog = clamp(s.prog + (s.owner === 0 ? 1 : -1) * 8 * dt, -100, 100);
        continue;
      }
      const rate = 5 + 1.7 * Math.min(pts[side], 8);
      const before = s.owner;
      s.prog = clamp(s.prog + (side === 0 ? 1 : -1) * rate * dt, -100, 100);
      if (s.owner === 1 && s.prog > 0) s.owner = -1;
      if (s.owner === 0 && s.prog < 0) s.owner = -1;
      if (s.prog >= 100) s.owner = 0;
      if (s.prog <= -100) s.owner = 1;
      if (before !== s.owner) emit(S, { t: 'sector', id: s.id, owner: s.owner, from: before, x: s.x, y: s.y });
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
    const diff = S.drain ? owned[0] - owned[1] : 0;
    if (diff > 0) S.teams[1].tickets -= RULES.drainPerSector * diff * dt;
    if (diff < 0) S.teams[0].tickets -= RULES.drainPerSector * -diff * dt;
    for (const T of S.teams) T.tickets = Math.max(0, T.tickets);
    if (S.drain && (S.teams[0].tickets <= 0 || S.teams[1].tickets <= 0)) endBattle(S, S.teams[0].tickets <= 0 ? 1 : 0);
  }

  function endBattle(S, winner) {
    if (S.over) return;
    S.over = true; S.winner = winner; S.endT = S.t;
    emit(S, { t: 'end', winner });
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
  BL.centerZ = centerZ;
  BL.targetable = targetable;
  BL.aliveMembers = aliveMembers;
  BL.slotPos = slotPos;
  BL.endBattle = endBattle;
  BL.spawn = function (S, team, type, x, y, ord) {
    const u = makeUnit(S, team, type, x, y);
    if (ord && ord.x != null && (ord.type !== 'hold' || Math.hypot(ord.x - x, ord.y - y) > 10)) order(S, [u.id], ord.type, ord.x, ord.y);
    else u.order = { type: 'hold', x, y, target: 0 };
    return u;
  };
  BL._internal = { explode, damage, fire, pickTarget, hitChance, updateSight, seenBy };
})(typeof window !== 'undefined' ? window : globalThis);
