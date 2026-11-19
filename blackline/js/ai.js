// BLACKLINE — the computer commander. Uses only what its team can see. Pure; no DOM.
(function (root) {
  const BL = root.BL || (root.BL = {});
  const { rng, UNITS, SUPPORT } = BL;

  const OPENING = ['rifle', 'scout', 'rifle', 'mg'];
  const LIMIT = { tank: 2, apc: 2, heli: 1, scout: 2 };

  function createAI(S, team) {
    const vet = S.difficulty !== 'recruit';
    const cfg = (S.aiCfg && S.aiCfg[team]) || {};
    if (!vet && team === 1) S.teams[team].incomeMul = 0.75;
    if (cfg.incomeMul != null) S.teams[team].incomeMul = cfg.incomeMul * (vet ? 1 : 0.8);
    return {
      cfg,
      team, rnd: rng(S.seed * 31 + team * 7 + 3),
      think: 0.5, react: vet ? 1.4 : 2.4, buys: 0, want: null, wantT: 0,
      artyT: cfg.artyT != null ? cfg.artyT : vet ? 50 : 90, dropT: vet ? 120 : 200, seen: new Map(),
    };
  }

  function aiThink(S, team, dt) {
    const A = S.ai[team];
    A.think -= dt;
    if (A.think > 0) return;
    A.think = A.react;
    const T = S.teams[team];
    for (const u of S.units) if (u.alive && u.team !== team && BL.visible(S, team, u)) A.seen.set(u.id, { type: u.type, x: u.x, t: S.t });
    for (const [id, s] of A.seen) if (S.t - s.t > 40 || !S.units.some((u) => u.id === id && u.alive)) A.seen.delete(id);
    buy(S, A, T);
    command(S, A);
    support(S, A, T);
  }

  // ---------------------------------------------------------------- spending

  function allowedHere(S, team, type) {
    return !S.allowed || !S.allowed[team] || S.allowed[team].has(type);
  }

  function chooseUnit(S, A) {
    const opening = OPENING.filter((k) => allowedHere(S, A.team, k));
    if (A.buys < opening.length) return opening[A.buys];
    const mine = count(S, A.team);
    const theirs = { inf: 0, veh: 0, air: 0 };
    for (const s of A.seen.values()) theirs[UNITS[s.type].kind]++;
    const w = { rifle: 4, mg: 2, scout: 0.8, apc: 1.4, tank: 1.1, heli: 0.6 };
    if (theirs.veh >= 1) { w.rifle += 1.5; w.tank += 1.5; }
    if (theirs.veh >= 2) { w.tank += 1.5; }
    if (theirs.air >= 1) { w.apc += 3; w.mg += 1; w.heli = 0.2; }
    if (theirs.inf >= 4) { w.mg += 1.5; w.apc += 1; w.heli += 0.6; }
    const rp = S.teams[A.team].rp;
    if (rp > 450 || S.t > 300) { w.tank *= 2.2; w.apc *= 1.8; w.heli *= 2; w.scout *= 0.5; }
    for (const k in LIMIT) if ((mine[k] || 0) >= LIMIT[k]) w[k] = 0;
    for (const k in w) if (!allowedHere(S, A.team, k)) w[k] = 0;
    let sum = 0;
    for (const k in w) sum += w[k];
    let r = A.rnd() * sum;
    for (const k in w) { r -= w[k]; if (r <= 0) return k; }
    return 'rifle';
  }

  function count(S, team) {
    const c = {};
    for (const u of S.units) if (u.alive && u.team === team) c[u.type] = (c[u.type] || 0) + 1;
    return c;
  }

  function buy(S, A, T) {
    if (A.cfg.buy === false) return;
    if (!A.want || S.t - A.wantT > 30) { A.want = chooseUnit(S, A); A.wantT = S.t; }
    const bad = BL.canAfford(S, A.team, A.want);
    if (bad === 'cap') return;
    if (bad) return;
    const pts = BL.deployPoints(S, A.team, A.want);
    const fwd = A.team === 0 ? Math.max(...pts) : Math.min(...pts);
    // forward points only when the sector is not being fought over
    let x = fwd;
    const sec = S.field.sectors.find((s) => s.x === fwd);
    if (sec && sec.contested) x = S.field.bases[A.team];
    const res = BL.deploy(S, A.team, A.want, x);
    if (res.ok) { A.buys++; A.want = null; }
  }

  // ---------------------------------------------------------------- orders

  function command(S, A) {
    const team = A.team;
    const base = S.field.bases[team];
    const dir = team === 0 ? 1 : -1;
    const sectors = S.field.sectors.slice().sort((a, b) => Math.abs(a.x - base) - Math.abs(b.x - base));
    const target = sectors.find((s) => s.owner !== team) || null;
    const owned = sectors.filter((s) => s.owner === team);
    const threats = owned.filter((s) => S.units.some((u) => u.alive && u.team !== team && Math.abs(u.x - s.x) < 320 && BL.visible(S, team, u)));

    const units = S.units.filter((u) => u.alive && u.team === team && !u.members.some((m) => m.rappel));
    const free = [];
    for (const u of units) {
      const hurt = healthFrac(u);
      const atBase = Math.abs(u.x - base) < 120;
      if (u.order.type === 'retreat') continue;
      if (hurt < (u.kind === 'inf' ? 0.4 : 0.3) && !atBase) { BL.order(S, [u.id], 'retreat'); continue; }
      if (atBase && hurt < 0.85 && S.t - u.engagedT > 3) { if (u.order.type !== 'hold') BL.order(S, [u.id], 'hold'); continue; }
      free.push(u);
    }

    const mode = A.cfg.mode || 'push';
    // one infantry squad garrisons each held sector that has no other guard
    const used = new Set();
    for (const s of mode === 'assault' ? [] : owned) {
      const inf = free.filter((u) => u.kind === 'inf' && !used.has(u.id)).sort((a, b) => Math.abs(a.x - s.x) - Math.abs(b.x - s.x));
      const g = inf[0];
      if (!g || Math.abs(g.x - s.x) > 900) continue;
      if (free.length - used.size <= 1 && target) break;
      used.add(g.id);
      give(S, g, 'hold', s.x + dir * 24);
    }
    // defend threatened sectors with the nearest units
    for (const s of threats) {
      const near = free.filter((u) => !used.has(u.id)).sort((a, b) => Math.abs(a.x - s.x) - Math.abs(b.x - s.x)).slice(0, 2);
      for (const u of near) { used.add(u.id); give(S, u, 'attack', s.x + dir * 40); }
    }
    // everyone else pushes the next sector (a defending force holds what it has)
    let k = 0;
    for (const u of free) {
      if (used.has(u.id)) continue;
      if (mode === 'defend') {
        const home = owned.slice().sort((a, b) => Math.abs(a.x - u.x) - Math.abs(b.x - u.x))[0];
        give(S, u, 'hold', home ? home.x + ((k++ % 3) - 1) * 40 : u.x);
        continue;
      }
      let x;
      if (target) x = target.x + ((k++ % 3) - 1) * 36;
      else x = S.field.bases[1 - team] - dir * 260; // all held: press toward the enemy base
      if (u.kind === 'veh') x -= dir * 60;          // armour stays a little behind the infantry
      give(S, u, 'attack', x);
    }
  }

  function give(S, u, type, x) {
    const o = u.order;
    if (o.type === type && Math.abs(o.x - x) < 30) return;
    BL.order(S, [u.id], type, x);
  }

  function healthFrac(u) {
    if (u.kind === 'inf') {
      let hp = 0;
      for (const m of u.members) if (m.alive) hp += m.hp;
      return hp / (u.def.hp * u.def.load.length);
    }
    const m = u.members[0];
    return m.alive ? m.hp / m.maxHp : 0;
  }

  // ---------------------------------------------------------------- support

  function support(S, A, T) {
    if (A.cfg.support === false) return;
    if (S.t > A.artyT && !BL.canAfford(S, A.team, 'arty') && T.rp > SUPPORT.arty.cost + 80) {
      let best = null, bestN = 0;
      for (const e of S.units) {
        if (!e.alive || e.team === A.team || e.kind !== 'inf' || !BL.visible(S, A.team, e)) continue;
        let n = 0, own = false;
        for (const o of S.units) {
          if (!o.alive) continue;
          if (Math.abs(o.x - e.x) > 110) continue;
          if (o.team === A.team) { own = true; break; }
          if (BL.visible(S, A.team, o)) n += o.kind === 'inf' ? o.members.filter((m) => m.alive).length : 2;
        }
        if (!own && n > bestN) { bestN = n; best = e.x; }
      }
      if (best != null && bestN >= (T.rp > 700 ? 4 : 6)) {
        BL.deploy(S, A.team, 'arty', best);
        A.artyT = S.t + (S.difficulty === 'recruit' ? 60 : 30);
      }
    }
    if (S.t > A.dropT && !BL.canAfford(S, A.team, 'insert') && T.rp > SUPPORT.insert.cost + 160) {
      const base = S.field.bases[A.team];
      const target = S.field.sectors.slice().sort((a, b) => Math.abs(a.x - base) - Math.abs(b.x - base)).find((s) => s.owner !== A.team);
      if (target && BL.teamSees(S, A.team, target.x) && !target.contested) {
        BL.deploy(S, A.team, 'insert', target.x - (A.team === 0 ? 60 : -60));
        A.dropT = S.t + 90;
      }
    }
  }

  BL.createAI = createAI;
  BL.aiThink = aiThink;
})(typeof window !== 'undefined' ? window : globalThis);
