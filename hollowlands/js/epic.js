'use strict';
// HOLLOWLANDS — the systems that make a fight feel big: style rank and kill callouts, the perfect dash,
// executions, experience and perk cards, and the Hollow Tide horde events.
HL.Epic = (() => {
  const E = {};
  const P = HL.P, A = HL.Audio, V = () => HL.vfx, G = () => HL.G;
  const LUM = '#7fe8e0', GOLD = '#ffc95a';

  // ---------------------------------------------------------------- style rank + callouts
  E.RANKS = [[0, 'D', P.cream3], [6, 'C', P.cream2], [14, 'B', '#7fd8ff'], [26, 'A', '#9ff5ec'], [42, 'S', GOLD], [66, 'SS', '#ff9a4a'], [100, 'SSS', '#ff4a4a']];
  E.combo = { n: 0, t: 0, best: 0, rank: 0, pop: 0 };
  E.callouts = [];
  E.callout = (s, col = P.cream, size = 2) => { E.callouts.push({ s, col, size, t: 0 }); if (E.callouts.length > 2) E.callouts.shift(); };
  E.rankOf = (n) => { let r = 0; for (let i = 0; i < E.RANKS.length; i++) if (n >= E.RANKS[i][0]) r = i; return r; };
  E.dmgMult = () => {
    const g = G(), p = g.player, f = g.flags;
    let m = 1 + E.combo.rank * 0.05 + (g.inv.tide_mark || 0) * 0.1;
    if (p && p.crit > 0) m *= 1.6;
    return m;
  };
  function bump(k = 1) {
    const c = E.combo; c.n += k; c.t = 0; c.best = Math.max(c.best, c.n);
    const r = E.rankOf(c.n);
    if (r > c.rank) { c.rank = r; c.pop = 1; if (r >= 3) { A.play('bellHigh'); E.callout('RANK ' + E.RANKS[r][1], E.RANKS[r][2], 2); } }
  }
  const kills = [];

  // ---------------------------------------------------------------- experience and perks
  E.PERKS = {
    chain: { name: 'Arc Lightning', desc: 'Heavy blows and finishers chain lightning to two more foes.', col: '#9fd0ff' },
    embers: { name: 'Burning Path', desc: 'Your dash leaves a trail of fire that burns whatever crosses it.', col: '#ff8a3a' },
    nova: { name: 'Death Nova', desc: 'Foes you slay explode, hurting everything near them.', col: '#ff5a4a' },
    leech: { name: 'Bloodthirst', desc: 'Every kill heals you a little.', col: '#c4473f' },
    fury: { name: 'Rising Fury', desc: 'Your ultimate charges half again as fast.', col: GOLD },
    twin: { name: 'Second Wind', desc: 'Dashing costs half the stamina: dash twice.', col: '#dff' },
    blades: { name: 'Phantom Blades', desc: 'Every fourth strike throws a spectral blade ahead.', col: '#c8b4ff' },
    shock: { name: 'Thunderstep', desc: 'Heavy blows release a shockwave around you.', col: '#ffe08a' },
    giant: { name: 'Colossus', desc: '+25 max health. Blows push you less.', col: P.cream },
    exec: { name: 'Executioner', desc: 'Execute foes below 35% health; executions heal more.', col: '#ff6a6a' },
    orbit: { name: 'Lumen Orbit', desc: 'Two orbs of light circle you and burn what they touch.', col: LUM },
  };
  E.has = (k) => !!G().flags['perk:' + k];
  E.XP = { husk: 3, drifter: 8, hound: 8, archer: 9, lurker: 8, wraith: 12, guard: 22, brute: 30, keeper: 300 };
  E.need = (lvl) => 50 + lvl * 40;
  E.addXp = (n) => {
    const f = G().flags; f.xp = (f.xp || 0) + n; f.lvl = f.lvl || 1;
    while (f.xp >= E.need(f.lvl)) { f.xp -= E.need(f.lvl); f.lvl++; E.levelUp(); }
  };
  E.levelUp = () => {
    const g = G(), p = g.player;
    V().beam(p.x, p.y, GOLD, 1.2, 6, 150); V().shock(p.x, p.y, 30, GOLD, 0.6); V().flash(GOLD, 0.3); V().slowmo(0.5, 0.3); A.play('ult');
    g.recalcHp(); p.hp = Math.min(p.maxhp, p.hp + 30);
    E.callout('LEVEL ' + g.flags.lvl, GOLD, 3);
    const pool = Object.keys(E.PERKS).filter((k) => !E.has(k));
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    if (pool.length) { g.perkChoice = pool.slice(0, 3); g.perkT = 0.9; }
  };
  E.pickPerk = (k) => {
    const g = G(); g.flags['perk:' + k] = 1; g.perkChoice = null; g.state = 'play';
    if (k === 'giant') g.recalcHp();
    const p = g.player; V().beam(p.x, p.y, E.PERKS[k].col, 0.9, 5, 130); V().shock(p.x, p.y, 26, E.PERKS[k].col, 0.5); A.play('item');
    HL.UI.showBanner(E.PERKS[k].name, E.PERKS[k].desc); g.save();
  };

  // ---------------------------------------------------------------- hooks from combat
  E.onHit = (e, o, dmg) => {
    const g = G(), p = g.player;
    bump(1);
    if (o.ult || !p) return;
    if (E.has('chain') && o.heavy && !o.chained) {
      let from = e; const hit = new Set([e]);
      for (let k = 0; k < 2; k++) {
        let best = null, bd = 60; for (const q of g.enemies) { if (q.dead || q.hidden || hit.has(q)) continue; const d = HL.dist(from.x, from.y, q.x, q.y); if (d < bd) { bd = d; best = q; } }
        if (!best) break; hit.add(best); E.bolt(from.x, from.y, best.x, best.y, '#9fd0ff');
        HL.hitEnemy(best, 12 * p.dmgMult(), { fx: from.x, fy: from.y, poise: 20, chained: true, col: '#9fd0ff' }); from = best;
      }
      A.play('clank');
    }
    if (E.has('shock') && o.heavy && !o.chained && !o.shocked && p.atk && !p.atk.shocked) {
      p.atk.shocked = true; V().shock(p.x, p.y, 26, '#ffe08a', 0.4);
      for (const q of g.enemies) if (!q.dead && !q.hidden && q !== e && HL.dist(p.x, p.y, q.x, q.y) < 24) HL.hitEnemy(q, 12 * p.dmgMult(), { fx: p.x, fy: p.y, poise: 15, shocked: true, col: '#ffe08a' });
    }
  };
  E.onKill = (e, o) => {
    const g = G(), p = g.player, now = g.time;
    E.addXp(Math.round((E.XP[e.type] || 8) * (e.bossName ? 6 : e.elite ? 3 : 1)));
    if (E.has('leech') && p) p.hp = Math.min(p.maxhp, p.hp + (e.type === 'husk' ? 1 : 3));
    if (E.has('nova') && !(o && o.nova)) {
      V().shock(e.x, e.y, 18, '#ff5a4a', 0.35); V().burst(e.x, e.y, 6, '#ff5a4a', 10, 60, 0.4);
      for (const q of g.enemies) if (!q.dead && !q.hidden && q !== e && HL.dist(e.x, e.y, q.x, q.y) < 18) HL.hitEnemy(q, 14, { fx: e.x, fy: e.y, poise: 15, nova: true, col: '#ff5a4a' });
    }
    kills.push(now); while (kills.length && now - kills[0] > 1.4) kills.shift();
    const n = kills.length;
    const label = n >= 14 ? 'HOLLOW BREAKER' : n >= 9 ? 'ANNIHILATION' : n >= 6 ? 'MASSACRE' : n >= 4 ? 'QUAD KILL' : n === 3 ? 'TRIPLE' : n === 2 ? 'DOUBLE' : null;
    if (label && label !== E.lastLabel) { E.callout(label, n >= 6 ? '#ff4a4a' : n >= 4 ? '#ff9a4a' : GOLD, n >= 6 ? 3 : 2); E.lastLabel = label; if (n >= 6) { V().kick(0.6); g.shake = Math.max(g.shake, 3); } }
    if (n <= 1) E.lastLabel = null;
    if (g.tide && g.tide.active) g.tide.killed++;
  };
  E.onHurt = () => { const c = E.combo; if (c.n >= 10) E.callout('STYLE BROKEN', P.cream3, 1); c.n = 0; c.rank = 0; };
  // dash through a blow at the last instant
  E.perfect = (p, sx, sy) => {
    const g = G();
    p.perfectUsed = true; p.crit = 1.6; p.inv = Math.max(p.inv, 0.4);
    V().slowmo(0.65, 0.18); V().flash(LUM, 0.32); V().chroma(1.4); V().kick(0.9); V().ring3d(p.x, p.y, 4, 22, LUM, 0.45); V().burst(p.x, p.y, 7, LUM, 16, 70);
    A.play('bellHigh'); A.play('swing', true);
    E.callout('PERFECT', LUM, 2);
    if (g.eq.relic === 'bell_shard') p.ult = Math.min(100, p.ult + 25);
    bump(4);
  };
  // finish a stunned or broken foe
  E.executable = (e) => {
    if (e.dead || e.hidden || e.type === 'keeper' || e.bossName || e.type === 'lurker' && e.state === 'emerge') return false;
    const thr = E.has('exec') ? 0.35 : 0.2;
    return e.state === 'stagger' || e.state === 'dazed' || e.vuln > 0 || (e.hp / e.maxhp < thr && !e.elite) || (e.elite && e.hp / e.maxhp < 0.12);
  };
  E.findExec = (p) => { let best = null, bd = 22; for (const e of G().enemies) { if (!E.executable(e)) continue; const d = HL.dist(p.x, p.y, e.x, e.y); if (d < bd) { bd = d; best = e; } } return best; };
  E.execute = (p, e) => {
    const g = G();
    const a = Math.atan2(e.y - p.y, e.x - p.x);
    p.state = 'exec'; p.t = 0; p.face = a; p.execT = e; p.inv = 0.6; p.atk = null; p.holdT = -1; p.chargeT = 0;
    const nx = e.x - Math.cos(a) * 7, ny = e.y - Math.sin(a) * 7; if (!g.world.blocked(nx, ny, p.r)) { p.x = nx; p.y = ny; }
    V().slowmo(0.5, 0.2); V().kick(1.2); A.play('swing', true); p.ghostReq = true;
  };
  E.execHit = (p, e) => {
    const g = G();
    const col = (g.player.weaponDef().trail) || GOLD;
    e.hp = 0; HL.killEnemy(e, { heavy: true, ult: true });
    V().hit(e.x, e.y, p.face, 3, col); V().shock(e.x, e.y, 22, col, 0.45); V().burst(e.x, e.y, 6, col, 24, 100); V().beam(e.x, e.y, col, 0.5, 4, 90); V().flash(col, 0.3); V().chroma(1);
    g.hitstop = 0.1; g.shake = 4; A.play('hitHeavy'); A.play('burst');
    p.hp = Math.min(p.maxhp, p.hp + (E.has('exec') ? 14 : 7)); if (g.eq.relic === 'bell_shard') p.ult = Math.min(100, p.ult + 15);
    E.callout('EXECUTION', '#ff6a6a', 2); bump(3);
  };

  // ---------------------------------------------------------------- dash fire, orbit, phantom blades
  E.zones = [];
  E.onDash = (p) => { if (E.has('embers')) p.fireTrail = 0.3; };
  E.onStrike = (p) => {
    if (!E.has('blades')) return;
    p.bladeN = (p.bladeN || 0) + 1;
    if (p.bladeN % 4) return;
    const g = G(), c = Math.cos(p.face), s = Math.sin(p.face);
    g.pshots.push({ x: p.x + c * 6, y: p.y + s * 6, vx: c * 220, vy: s * 220, dmg: 14 * p.dmgMult(), life: 0.6, pierce: true, col: '#c8b4ff', size: 7, hit: new Set(), heavy: false, kind: 'blade' });
    A.play('swing');
  };
  E.bolt = (x1, y1, x2, y2, col) => {
    if (!V().ok) return HL.fx.ring(x2, y2, 6, col, 0.2);
    const n = Math.ceil(HL.dist(x1, y1, x2, y2) / 2.5);
    for (let i = 0; i <= n; i++) { const k = i / n, j = i && i < n ? (Math.random() - 0.5) * 6 : 0; V().orb(x1 + (x2 - x1) * k + j, y1 + (y2 - y1) * k + j, 7 + Math.random() * 3, col, 3, false); }
    V().light(x2, y2, 0x9fd0ff, 50, 0.2);
  };

  // ---------------------------------------------------------------- Hollow Tides: hordes out of the forest
  E.TIDES = {
    tide_square: { map: 'ashwick', x: 40 * 8, y: 51 * 8, r: 70, when: (f) => f.storehouse_open, total: 46, herald: 'brute', name: 'THE FIRST TIDE' },
    tide_bridge: { map: 'ashwick', x: 118 * 8, y: 54 * 8, r: 40, when: (f) => f['p:p_sword'] && f.got_gate_key, total: 60, herald: 'guard', name: 'THE BRIDGE TIDE' },
  };
  E.startTide = (id) => {
    const g = G(), d = E.TIDES[id], p = g.player;
    g.tide = { id, d, active: false, spawned: 0, killed: 0, spawnT: 0, herald: false, list: [] };
    g.cutAt = { x: p.x, y: p.y, name: d.name };
    for (let k = 0; k < 18; k++) { const a = (k / 18) * HL.TAU + Math.random() * 0.2, dd = 70 + Math.random() * 40, x = p.x + Math.cos(a) * dd, y = p.y + Math.sin(a) * dd; if (g.world.blocked(x, y, 4)) continue; const e = g.spawnEnemy({ foe: 'husk', x, y, summoned: true }); e.face = a + Math.PI; g.tide.list.push(e); g.tide.spawned++; }
    g.playCut('tide', () => { g.tide.active = true; A.ambient('boss'); });
  };
  E.updateTide = (dt) => {
    const g = G(), T = g.tide; if (!T || !T.active) return;
    const p = g.player, d = T.d;
    const alive = T.list.filter((e) => !e.dead);
    // stragglers lost behind walls come back around
    for (const e of alive) {
      const far = HL.dist(e.x, e.y, p.x, p.y) > 150 || !g.world.los(e.x, e.y - 4, p.x, p.y - 4);
      e.lostT = far ? (e.lostT || 0) + dt : 0;
      if (e.lostT > 3) { for (let k = 0; k < 12; k++) { const a = Math.random() * HL.TAU, dd = 70 + Math.random() * 40, x = p.x + Math.cos(a) * dd, y = p.y + Math.sin(a) * dd; if (!g.world.blocked(x, y, 4) && g.world.los(x, y - 4, p.x, p.y - 4)) { e.x = x; e.y = y; e.lostT = 0; V().burst(x, y, 6, P.red1, 8, 40, 0.4); break; } } }
    }
    T.spawnT -= dt;
    if (T.spawned < d.total && alive.length < 30 && T.spawnT <= 0) {
      T.spawnT = 0.9;
      const a0 = Math.random() * HL.TAU;
      for (let k = 0; k < 7 && T.spawned < d.total; k++) {
        for (let tries = 0; tries < 10; tries++) {
          const a = a0 + (Math.random() - 0.5) * 1.1, dd = 120 + Math.random() * 40, x = p.x + Math.cos(a) * dd, y = p.y + Math.sin(a) * dd;
          if (g.world.blocked(x, y, 4) || x < 10 || y < 10 || x > g.world.pw - 10 || y > g.world.ph - 10) continue;
          const foe = T.spawned % 9 === 8 ? 'hound' : T.spawned % 13 === 12 ? 'drifter' : 'husk';
          const e = g.spawnEnemy({ foe, x, y, summoned: true }); T.list.push(e); T.spawned++;
          break;
        }
      }
    }
    if (T.spawned >= d.total && !T.herald && alive.length < 8) {
      T.herald = true;
      const a = Math.random() * HL.TAU, x = p.x + Math.cos(a) * 70, y = p.y + Math.sin(a) * 70;
      const e = g.spawnEnemy({ foe: d.herald, x: g.world.blocked(x, y, 6) ? p.x + 30 : x, y: g.world.blocked(x, y, 6) ? p.y : y, summoned: true, elite: true }); e.heraldOf = true; T.list.push(e);
      V().beam(e.x, e.y, '#ff4a4a', 1.2, 8, 150); V().shock(e.x, e.y, 30, '#ff4a4a', 0.6); A.play('toll');
      HL.UI.showBanner('THE HERALD OF THE TIDE', 'Break it and the tide breaks.');
    }
    const heraldDead = T.herald && T.list.filter((e) => e.heraldOf).every((e) => e.dead);
    if (heraldDead && !T.list.every((e) => e.dead) && T.killed >= d.total * 0.75) { for (const e of T.list) if (!e.dead) { V().death(e); e.dead = true; e.deadT = 0; } } // the rest crumble to ash
    if (T.herald && T.list.every((e) => e.dead)) {
      g.flags['tide:' + T.id] = 1; g.tide = null; A.ambient(g.world.amb);
      V().beam(p.x, p.y, GOLD, 1.4, 7, 170); V().shock(p.x, p.y, 50, GOLD, 0.8); V().flash(GOLD, 0.4); V().slowmo(0.8, 0.3);
      E.callout('THE TIDE BREAKS', GOLD, 3);
      g.give('tide_mark', 1); g.give('poultice', 2); g.give('iron_scrap', 3);
      g.save();
    }
  };
  E.tideCheck = () => {
    const g = G(); if (g.tide || g.trial || g.bossAwake || (g.waves && g.waves.active) || g.state !== 'play') return;
    const p = g.player;
    for (const id in E.TIDES) { const d = E.TIDES[id]; if (d.map === g.world.id && !g.flags['tide:' + id] && d.when(g.flags) && HL.dist(p.x, p.y, d.x, d.y) < d.r) { E.startTide(id); return; } }
  };

  // ---------------------------------------------------------------- per frame
  E.update = (dt) => {
    const g = G(), p = g.player, c = E.combo;
    c.t += dt; c.pop = Math.max(0, c.pop - dt * 3);
    if (c.t > 3.2 && c.n) { c.n = 0; c.rank = 0; }
    for (const k of E.callouts) k.t += dt; E.callouts = E.callouts.filter((k) => k.t < 1.4);
    if (p) {
      p.crit = Math.max(0, (p.crit || 0) - dt);
      if (p.fireTrail > 0) { p.fireTrail -= dt; E.zones.push({ x: p.x, y: p.y, t: 2.2, r: 7 }); V().embers(p.x, p.y, 2, '#ff8a3a'); if (Math.random() < 0.5) V().scorch(p.x, p.y, 4, '#2a1612'); }
      if (E.has('orbit') && p.state !== 'dead') {
        p.orbA = (p.orbA || 0) + dt * 4;
        for (let i = 0; i < 2; i++) {
          const ox = p.x + Math.cos(p.orbA + i * Math.PI) * 15, oy = p.y + Math.sin(p.orbA + i * Math.PI) * 12;
          V().orb(ox, oy, 7, LUM, 5);
          for (const e of g.enemies) { if (e.dead || e.hidden || HL.dist(ox, oy, e.x, e.y) > e.r + 4) continue; if ((e.orbCd || 0) > g.time) continue; e.orbCd = g.time + 0.45; HL.hitEnemy(e, 7 * p.dmgMult(), { fx: ox, fy: oy, poise: 6, col: LUM, chained: true }); }
        }
      }
    }
    for (const z of E.zones) {
      z.t -= dt; if (Math.random() < 0.15) V().embers(z.x, z.y, 1, '#ff8a3a');
      for (const e of g.enemies) { if (e.dead || e.hidden || HL.dist(z.x, z.y, e.x, e.y) > z.r + e.r) continue; if ((e.burnCd || 0) > g.time) continue; e.burnCd = g.time + 0.4; HL.hitEnemy(e, 5, { fx: z.x, fy: z.y - 1, poise: 3, col: '#ff8a3a', chained: true }); }
    }
    E.zones = E.zones.filter((z) => z.t > 0);
    E.updateTide(dt);
    E.tideCheck();
  };
  E.reset = () => { E.zones = []; E.combo.n = 0; E.combo.rank = 0; };

  // ---------------------------------------------------------------- HUD: rank, xp, callouts, the perk cards
  E.drawHUD = (g, Gm, dt) => {
    const P_ = HL.P, c = E.combo, r = E.RANKS[c.rank], W = Gm.W, x = W - 40 - Gm.safe.r, y = 34 + Gm.safe.t;
    if (c.n >= 3) {
      const sc = 3 + (c.pop > 0.5 ? 1 : 0);
      HL.text(g, r[1], x, y, r[2], 0.5, sc, P_.ink);
      HL.text(g, 'x' + c.n, x, y + sc * 9 + 2, P_.cream, 0.5, 1, P_.ink);
      const f = Math.max(0, 1 - c.t / 3.2); g.fillStyle = P_.ink; g.fillRect(x - 15, y + sc * 9 + 12, 30, 2); g.fillStyle = r[2]; g.fillRect(x - 15, y + sc * 9 + 12, Math.round(30 * f), 2);
    }
    const f = Gm.flags, lvl = f.lvl || 1, m = 8 + Gm.safe.l, t = 8 + Gm.safe.t;
    g.fillStyle = P_.ink; g.fillRect(m - 1, t + 11, 60, 3); g.fillStyle = GOLD; g.fillRect(m, t + 12, Math.round(58 * Math.min(1, (f.xp || 0) / E.need(lvl))), 1);
    HL.text(g, 'Lv ' + lvl, m + 82, t - 1, GOLD, 0, 1, P_.ink);
    E.callouts.forEach((k, i) => {
      const a = k.t < 0.12 ? k.t / 0.12 : k.t > 1 ? 1 - (k.t - 1) / 0.4 : 1, sc = k.size + (k.t < 0.12 ? 2 : 0);
      g.globalAlpha = HL.clamp(a, 0, 1);
      const jx = k.t < 0.3 ? Math.round((Math.random() - 0.5) * 3) : 0;
      HL.text(g, k.s, W / 2 + jx, Gm.H * 0.22 + i * (sc * 9 + 4) - (k.t * 6), k.col, 0.5, sc, P_.ink);
      g.globalAlpha = 1;
    });
    if (Gm.tide && Gm.tide.active) {
      const T = Gm.tide, w = 150, bx = (W - w) / 2, by = Gm.H - 18 - Gm.safe.b, tot = T.d.total + 1, done = Math.min(tot, T.killed + (T.herald && T.list.every((e) => e.dead) ? 1 : 0));
      HL.text(g, 'Hold back the tide', W / 2, by - 10, '#ff6a6a', 0.5, 1, P_.ink);
      HL.UI.bar(g, bx, by, w, 3, done / tot, '#ff4a4a');
    }
  };
  E.drawPerks = (g, Gm) => {
    const P_ = HL.P, ch = Gm.perkChoice; if (!ch) return;
    g.fillStyle = 'rgba(6,4,4,0.8)'; g.fillRect(0, 0, Gm.W, Gm.H);
    HL.text(g, 'LEVEL ' + (Gm.flags.lvl || 1), Gm.W / 2, 14, GOLD, 0.5, 2, P_.ink);
    HL.text(g, 'Choose a power', Gm.W / 2, 36, P_.cream2, 0.5);
    const cw = Math.min(118, (Gm.W - 40) / 3 - 8), ch2 = 108, gap = 8, x0 = (Gm.W - (cw * ch.length + gap * (ch.length - 1))) / 2, y0 = 52;
    ch.forEach((k, i) => {
      const pk = E.PERKS[k], x = x0 + i * (cw + gap), pulse = Math.sin(Gm.time * 4 + i) * 0.5 + 0.5;
      g.fillStyle = HL.P.ui; g.fillRect(x, y0, cw, ch2);
      HL.UI.dotRect(g, x, y0, cw, ch2, pk.col);
      g.fillStyle = pk.col; for (let j = -6; j <= 6; j++) { const w = 6 - Math.abs(j); g.fillRect(x + cw / 2 - w, y0 + 18 + j, w * 2 + 1, 1); }
      g.fillStyle = HL.P.ink; g.fillRect(x + cw / 2 - 1, y0 + 15, 3, 6);
      HL.text(g, pk.name, x + cw / 2, y0 + 32, pk.col, 0.5, 1, P_.ink);
      HL.wrap(pk.desc, cw - 10).forEach((l, j) => HL.text(g, l, x + cw / 2, y0 + 46 + j * 10, P_.cream2, 0.5));
      HL.text(g, 'take', x + cw / 2, y0 + ch2 - 13, pulse > 0.5 ? P_.cream : P_.cream3, 0.5);
      HL.UI.region(x, y0, cw, ch2, () => { if ((Gm.perkT || 0) <= 0) E.pickPerk(k); });
    });
  };
  return E;
})();
