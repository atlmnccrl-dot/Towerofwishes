// HOLDFAST - the settlement simulation. Pure logic, no DOM: runs in the browser and in Node.
// State is plain JSON (saved as is); runtime caches live in st._ and are rebuilt on load.
(function (root) {
  const HF = root.HF = root.HF || {};
  const D = HF.D, Wd = HF.World;
  const S = HF.Sim = {};
  const TS = D.TILE, N = D.W, M = D.H;
  const HOUR = D.DAY / 24;          // real seconds per game hour at 1x
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const tileOf = v => Math.floor(v / TS);
  const ctr = t => t * TS + TS / 2;

  // ---- Creation -----------------------------------------------------------------------
  S.create = function (seed, starter) {
    const gen = Wd.generate(seed);
    const st = {
      v: 1, seed, rs: (seed * 2654435761) >>> 0, hours: 7, speed: 1, nextId: 1,
      terrain: gen.terrain, wear: new Array(N * M).fill(0), fog: new Array(N * M).fill(0),
      nodes: {}, buildings: {}, units: {}, proj: [], ruins: gen.ruins, pond: gen.pond,
      res: { wood: 0, stone: 0, food: 4, water: 6, metal: 0, knowledge: 0 },
      era: 1, techs: {}, relics: {}, items: { club: 0, spear: 0, bow: 0, sword: 0, hide: 0, mail: 0 }, craftQ: [],
      alarm: false, camp: null, clearing: gen.clearing, obj: 0, objDone: {},
      threat: { raid: null, beasts: null, beastCalm: 0, raiderCalm: 0, raids: 0, active: false, waveId: 0 },
      exps: [], sites: D.SITES.map(s => ({ id: s.id, type: s.type, dist: s.dist, dir: s.dir, known: !!s.known, visits: 0, cleared: false })),
      pending: [], log: [], stats: { raids: 0, deaths: 0, built: 0, recruited: 1, expeditions: 0, kills: 0, daysSurvived: 0 },
      flags: {}, weather: { rain: false, until: 0 }, mill: 0, graves: [], deco: [],
      gameOver: false, lastDay: 1, victory: 0, morale: { death: 0, win: 0 }, trader: null, lastTrader: 0,
    };
    for (const n of gen.nodes) st.nodes[n.id] = n;
    st.decoBlock = Array.from(gen.decoBlock);
    rebuild(st);
    // The lone survivor walks in from the south-west edge of the clearing.
    const pick = D.STARTERS[starter || 0];
    const u = makeSurvivor(st, { set: pick.set, sex: pick.sex, trait: pick.trait, skills: pick.skills, x: ctr(gen.clearing.x - 9), y: ctr(gen.clearing.y + 7) });
    u.leader = true; u.job = 'labor';
    reveal(st, tileOf(u.x), tileOf(u.y), 9);
    reveal(st, gen.clearing.x, gen.clearing.y, 8);
    for (const a of gen.animals) spawnAnimal(st, a.kind, ctr(a.x), ctr(a.y));
    return st;
  };

  S.R = st => { if (!st._.rng) { st._.rng = Wd.rng(st.rs); } return st._.rng; };
  const rnd = st => { const r = S.R(st); const v = r.next(); st.rs = r.s; return v; };
  const rint = (st, a, b) => Math.floor(a + (b - a + 1) * rnd(st));
  const rpick = (st, arr) => arr[Math.floor(rnd(st) * arr.length)];
  const nid = (st, p) => p + (st.nextId++);

  // ---- Runtime caches -----------------------------------------------------------------
  function rebuild(st) {
    st._ = { nodeAt: new Array(N * M).fill(null), bAt: new Array(N * M).fill(null), ev: [], pathBudget: 0, rng: null, dirty: new Set(), fogDirty: true };
    for (const id in st.nodes) { const n = st.nodes[id]; st._.nodeAt[n.y * N + n.x] = id; }
    for (const id in st.buildings) stamp(st, st.buildings[id], true);
  }
  S.rebuild = rebuild;
  function stamp(st, b, on) {
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) {
      const i = y * N + x; if (on) st._.bAt[i] = b.id; else if (st._.bAt[i] === b.id) st._.bAt[i] = null;
    }
  }
  // Which footprint tiles block walking. Fields are walkable; the first campfire only blocks the fire.
  function solidTile(b, x, y) {
    if (b.type === 'farm') return false;
    if (b.type === 'heart' && b.tier === 0) return x === b.x + 2 && y === b.y + 1;
    return true;
  }
  S.solidTile = solidTile;
  const isWater = (st, i) => st.terrain[i] === D.T.WATER;
  // Path cost for survivors and for enemies.
  function costS(st) {
    const roads = !!st.techs.roads;
    return i => {
      if (isWater(st, i) || st._.nodeAt[i]) return -1;
      const bid = st._.bAt[i];
      if (bid) { const b = st.buildings[bid]; if (b && !b.gate && solidTile(b, i % N, (i / N) | 0) && !(b.state === 'ruin')) return -1; }
      return roads && st.wear[i] > 60 ? 0.65 : st.wear[i] > 25 ? 0.9 : 1;
    };
  }
  function costE(st) {
    return i => {
      if (isWater(st, i) || st._.nodeAt[i]) return -1;
      const bid = st._.bAt[i];
      if (bid) { const b = st.buildings[bid]; if (b && b.state !== 'ruin' && solidTile(b, i % N, (i / N) | 0)) return 5 + b.hp / 45; }
      return 1;
    };
  }

  // ---- Events to the client (sounds, effects, cinematics) -------------------------------
  const ev = (st, e) => { st._.ev.push(e); };
  S.drain = st => { const e = st._.ev; st._.ev = []; return e; };
  function note(st, text, kind) { st.log.push({ h: st.hours, text, kind: kind || 'info' }); if (st.log.length > 60) st.log.shift(); ev(st, { type: 'note', text, kind: kind || 'info' }); }
  S.note = note;

  // ---- Time helpers -------------------------------------------------------------------
  S.day = st => Math.floor(st.hours / 24) + 1;
  S.hour = st => st.hours % 24;
  S.isNight = st => { const h = S.hour(st); return h >= 20 || h < 5; };
  S.light = st => { // 0 = full night, 1 = full day
    const h = S.hour(st);
    if (h >= 7 && h < 18) return 1; if (h >= 21 || h < 4) return 0;
    if (h >= 18) return 1 - (h - 18) / 3; return (h - 4) / 3;
  };

  // ---- Survivors ----------------------------------------------------------------------
  function makeSurvivor(st, o) {
    const sex = o.sex || (rnd(st) < 0.5 ? 'f' : 'm');
    let set = o.set;
    if (!set) {
      const used = new Set(Object.values(st.units).filter(u => u.side === 's').map(u => u.set));
      const pool = (rnd(st) < 0.3 ? D.FIGHT_SETS : D.CIVIL_SETS).filter(s => !used.has(s[0]));
      const all = pool.length ? pool : D.CIVIL_SETS;
      const p = rpick(st, all); set = p[0];
      o.sex = p[1];
    }
    const s2 = o.sex || sex;
    const trait = o.trait || rpick(st, D.TRAIT_KEYS);
    const skills = { build: 1, gather: 1, combat: 1, medic: 0, scout: 1, craft: 0 };
    for (const k of D.SKILLS) skills[k] += Math.floor(rnd(st) * 3);
    if (o.skills) for (const k in o.skills) skills[k] = Math.max(skills[k], o.skills[k]);
    const tr = D.TRAITS[trait]; if (tr.skill) for (const k in tr.skill) skills[k] += tr.skill[k];
    if (D.ARMED[set]) skills.combat += 1;
    const first = rpick(st, s2 === 'f' ? D.NAMES_F : D.NAMES_M);
    const u = {
      id: nid(st, 'u'), side: 's', name: first + ' ' + rpick(st, D.SURNAMES), set, sex: s2, trait,
      origin: rpick(st, D.ORIGINS), skills, xp: {}, level: 1, job: 'labor', gear: { w: D.ARMED[set] ? 'spear' : 'none', a: 'none' },
      x: o.x, y: o.y, dir: 0, hp: 100, maxHp: 100, morale: 60, anim: 'idle', at: 0, path: null, task: null, cd: 0,
      inside: null, home: null, post: null, injury: null, downed: 0, away: null, carry: null, joined: S.day(st), kills: 0, swing: 0,
    };
    if (u.gear.w === 'spear' && set === 'guild_adventurer') u.gear.w = 'club';
    u.maxHp = Math.round(100 * (tr.hp || 1)); u.hp = u.maxHp;
    st.units[u.id] = u;
    return u;
  }
  S.makeSurvivor = makeSurvivor;
  S.survivors = st => Object.values(st.units).filter(u => u.side === 's' && !u.dead && !u.stranger);
  S.present = st => S.survivors(st).filter(u => !u.away);
  S.foes = st => Object.values(st.units).filter(u => u.side === 'e' && !u.dead);
  const spd = u => 50 * ((D.TRAITS[u.trait] || {}).spd || 1) * (u.injury && u.injury.slow ? 0.55 : 1);
  function skillOf(u, k) { return u.skills[k] || 0; }
  function gainXp(st, u, k, amt) {
    u.xp[k] = (u.xp[k] || 0) + amt;
    const need = 20 + u.skills[k] * 14;
    if (u.xp[k] >= need && u.skills[k] < 12) {
      u.xp[k] -= need; u.skills[k]++;
      const total = D.SKILLS.reduce((a, s) => a + u.skills[s], 0);
      const lvl = 1 + Math.floor(total / 6);
      if (lvl > u.level) { u.level = lvl; u.maxHp += 4; u.hp += 4; ev(st, { type: 'fx', fx: 'level_up', x: u.x, y: u.y - 20 }); ev(st, { type: 'sfx', s: 'reward' }); note(st, u.name + ' grew more capable (' + D.SKILL_NAME[k] + ' ' + u.skills[k] + ').', 'good'); }
    }
  }
  const workRate = (st, u, k) => (0.7 + (u.morale / 100) * 0.5) * (1 + skillOf(u, k) * 0.12) * (u.injury && u.injury.weak ? 0.6 : 1);

  // ---- Wildlife -------------------------------------------------------------------------
  function spawnAnimal(st, kind, x, y) {
    const a = { id: nid(st, 'a'), side: 'a', kind, x, y, hp: kind === 'deer' ? 24 : 8, maxHp: kind === 'deer' ? 24 : 8, dir: 0, anim: 'idle', at: 0, path: null, wander: 0, flee: 0 };
    st.units[a.id] = a; return a;
  }

  // ---- Enemies ------------------------------------------------------------------------
  function spawnFoe(st, kind, x, y, wave) {
    const F = D.FOE[kind]; const day = S.day(st);
    const k = 1 + Math.max(0, day - 3) * 0.035;
    const e = { id: nid(st, 'e'), side: 'e', kind, set: F.set, born: st.hours, px: x, py: y, stuckN: 0, x, y, hp: Math.round(F.hp * k), maxHp: Math.round(F.hp * k), dir: Math.PI, anim: 'idle', at: 0, path: null, target: null, cd: rnd(st), wave, carry: 0, flee: false, swing: 0, retarget: 0 };
    if (kind === 'thug' && rnd(st) < 0.5) e.set = 'thug_b';
    if (kind === 'raider' && rnd(st) < 0.35) e.set = 'bandit_grabber';
    st.units[e.id] = e; return e;
  }
  S.spawnFoe = spawnFoe;

  // ---- Buildings ----------------------------------------------------------------------
  S.canAfford = (st, cost) => { for (const k in cost) if ((st.res[k] || 0) < cost[k]) return false; return true; };
  const pay = (st, cost) => { for (const k in cost) st.res[k] -= cost[k]; };
  const refund = (st, cost, f) => { for (const k in cost) st.res[k] += Math.floor(cost[k] * f); clampRes(st); };
  S.capacity = st => { let c = 0; for (const id in st.buildings) { const b = st.buildings[id]; if (b.state !== 'done') continue; const B = D.B[b.type]; if (B.store) c += B.store[b.tier]; } return Math.max(c, 40); };
  function clampRes(st) { const c = S.capacity(st); for (const k of D.RES) { if (k === 'knowledge') continue; if (st.res[k] > c) st.res[k] = c; if (st.res[k] < 0) st.res[k] = 0; } }
  S.beds = st => { let n = 0; for (const id in st.buildings) { const b = st.buildings[id]; if (b.state !== 'done') continue; const B = D.B[b.type]; if (B.beds) n += B.beds[b.tier] || 0; } return n; };
  S.heart = st => { for (const id in st.buildings) if (st.buildings[id].type === 'heart') return st.buildings[id]; return null; };
  S.count = (st, type, done) => Object.values(st.buildings).filter(b => b.type === type && (!done || b.state === 'done')).length;
  S.has = (st, type) => Object.values(st.buildings).some(b => b.type === type && b.state === 'done');
  // Is a building type (tier 0) available to place?
  S.unlocked = function (st, type) {
    const B = D.B[type]; if (!B) return false;
    if (st.obj < 2 && type !== 'heart') return false;          // the opening: campfire first
    if (type === 'heart') return !S.heart(st);
    if (st.obj < 3 && type !== 'tent') return false;
    if (B.era[0] > st.era) return false;
    if (B.tech && B.tech[0] && !st.techs[B.tech[0]]) return false;
    return true;
  };
  S.lockReason = function (st, type, tier) {
    const B = D.B[type]; tier = tier || 0;
    if (B.era[tier] > st.era) return 'Needs the ' + D.ERAS[B.era[tier]];
    if (B.tech && B.tech[tier] && !st.techs[B.tech[tier]]) return 'Research ' + D.TECH[B.tech[tier]].name;
    return '';
  };
  // Can a building of this type sit with its top-left at (x, y)?
  S.canPlace = function (st, type, x, y) {
    const B = D.B[type];
    if (x < 1 || y < 1 || x + B.w > N - 1 || y + B.h > M - 1) return false;
    for (let yy = y; yy < y + B.h; yy++) for (let xx = x; xx < x + B.w; xx++) {
      const i = yy * N + xx;
      if (isWater(st, i) || st._.nodeAt[i] || st._.bAt[i] || st.decoBlock[i] === 2) return false;
      if (!st.fog[i]) return false;
      for (const id in st.units) { const u = st.units[id]; if (u.side === 'e' && !u.dead && tileOf(u.x) === xx && tileOf(u.y) === yy) return false; }
    }
    if (st.camp && type !== 'heart') { const h = S.heart(st); if (h && Math.hypot(x + B.w / 2 - (h.x + 2.5), y + B.h / 2 - (h.y + 1.5)) > 30) return false; }
    return true;
  };
  function addBuilding(st, type, x, y, tier, done) {
    const B = D.B[type];
    const b = { id: nid(st, 'b'), type, x, y, w: B.w, h: B.h, tier: tier || 0, hp: 1, maxHp: B.hp[tier || 0], state: done ? 'done' : 'site', prog: done ? 1 : 0, up: false, wall: !!B.wall, gate: !!B.gate, slots: [], crop: B.crop ? { stage: 'fallow', g: 0 } : null };
    if (done) b.hp = b.maxHp;
    st.buildings[b.id] = b; stamp(st, b, true);
    // Units standing inside a fresh footprint step out.
    for (const id in st.units) { const u = st.units[id]; if (u.dead || u.inside) continue; const tx = tileOf(u.x), ty = tileOf(u.y); if (tx >= x && tx < x + B.w && ty >= y && ty < y + B.h && solidTile(b, tx, ty)) { const p = nearestFree(st, tx, ty); if (p) { u.x = ctr(p.x); u.y = ctr(p.y); } u.path = null; } }
    invalidatePaths(st);
    return b;
  }
  S.addBuilding = addBuilding;
  function removeBuilding(st, b) {
    stamp(st, b, false); delete st.buildings[b.id];
    for (const id in st.units) { const u = st.units[id]; if (u.inside === b.id) exitBuilding(st, u); if (u.home === b.id) u.home = null; if (u.post === b.id) u.post = null; if (u.task && u.task.bid === b.id) u.task = null; if (u.onTower === b.id) { u.onTower = null; const p = nearestFree(st, b.x + 1, b.y + b.h - 1); if (p) { u.x = ctr(p.x); u.y = ctr(p.y); } } if (u.side === 'e' && u.target && u.target.b === b.id) u.target = null; }
    invalidatePaths(st);
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) st._.dirty.add(y * N + x);
  }
  function invalidatePaths(st) { for (const id in st.units) st.units[id].path = null; }
  function nearestFree(st, tx, ty) {
    const cs = costS(st);
    for (let r = 1; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = tx + dx, y = ty + dy; if (x < 1 || y < 1 || x >= N - 1 || y >= M - 1) continue;
      if (cs(y * N + x) >= 0) return { x, y };
    }
    return null;
  }
  S.nearestFree = nearestFree;

  // ---- Fog ------------------------------------------------------------------------------
  function reveal(st, tx, ty, r) {
    let ch = false;
    for (let y = Math.max(0, ty - r); y <= Math.min(M - 1, ty + r); y++) for (let x = Math.max(0, tx - r); x <= Math.min(N - 1, tx + r); x++) {
      if ((x - tx) * (x - tx) + (y - ty) * (y - ty) > r * r) continue;
      const i = y * N + x; if (!st.fog[i]) { st.fog[i] = 1; ch = true; }
    }
    if (ch) st._.fogDirty = true;
  }
  S.reveal = reveal;

  // ---- Commands from the player -----------------------------------------------------------
  S.cmd = function (st, name, a) {
    a = a || {};
    const fn = CMD[name]; if (!fn) return { ok: false, msg: 'Unknown command' };
    return fn(st, a) || { ok: true };
  };
  const fail = msg => ({ ok: false, msg });
  const CMD = {
    makeCamp(st, a) {
      if (st.camp) return fail('Camp already made');
      const c = st.clearing;
      if (Math.hypot(a.x - c.x, a.y - c.y) > 6) return fail('Too far from the clearing');
      st.camp = { x: c.x, y: c.y };
      reveal(st, c.x, c.y, 11);
      done(st, 'camp');
      ev(st, { type: 'sfx', s: 'confirm' });
      return { ok: true };
    },
    place(st, a) {
      const B = D.B[a.type]; if (!B) return fail('No such building');
      if (!S.unlocked(st, a.type)) return fail(S.lockReason(st, a.type) || 'Not yet');
      if (a.type === 'heart' && !st.camp) return fail('Make camp first');
      if (!S.canPlace(st, a.type, a.x, a.y)) return fail('Cannot build there');
      if (!S.canAfford(st, B.cost[0])) return fail('Not enough resources');
      pay(st, B.cost[0]);
      const b = addBuilding(st, a.type, a.x, a.y, 0, false);
      for (const u of S.present(st)) if (u.task && u.task.manual && (u.task.t === 'gather' || u.task.t === 'water') && (u.job === 'labor' || u.job === 'build')) { if (u.carry) deposit(st, u); u.task = null; }
      ev(st, { type: 'sfx', s: 'place' }); ev(st, { type: 'fx', fx: 'dust_cloud', x: (b.x + b.w / 2) * TS, y: (b.y + b.h) * TS - 8 });
      return { ok: true, id: b.id };
    },
    placeLine(st, a) { // walls: a.tiles = [[x,y],...]
      let n = 0, last = null;
      for (const [x, y] of a.tiles) { const r = CMD.place(st, { type: a.type, x, y }); if (r.ok) n++; else last = r.msg; }
      return n ? { ok: true, n } : fail(last || 'Cannot build there');
    },
    cancel(st, a) {
      const b = st.buildings[a.id]; if (!b) return fail('Gone');
      const B = D.B[b.type];
      if (b.type === 'heart' && b.state === 'done') return fail('The heart of the camp stays');
      if (b.state === 'site') refund(st, B.cost[b.tier], 1); else if (b.up) refund(st, B.cost[b.tier + 1], 1); else refund(st, B.cost[b.tier], 0.5);
      if (b.up) { b.up = false; b.prog = 1; return { ok: true }; }
      removeBuilding(st, b); ev(st, { type: 'sfx', s: 'cancel' });
      return { ok: true };
    },
    upgrade(st, a) {
      const b = st.buildings[a.id]; if (!b || b.state !== 'done' || b.up) return fail('Not ready');
      const B = D.B[b.type], t = b.tier + 1;
      if (!B.cost[t]) return fail('Fully upgraded');
      const why = S.upgradeBlock(st, b); if (why) return fail(why);
      if (!S.canAfford(st, B.cost[t])) return fail('Not enough resources');
      pay(st, B.cost[t]); b.up = true; b.prog = 0;
      ev(st, { type: 'sfx', s: 'place' });
      return { ok: true };
    },
    job(st, a) {
      const u = st.units[a.id]; if (!u || u.side !== 's') return fail('No one');
      const J = D.JOBS[a.job]; if (!J) return fail('No such job');
      if (J.need && !S.has(st, J.need)) return fail('Needs a ' + D.B[J.need].name[0]);
      if (u.job !== a.job) { u.job = a.job; u.task = null; u.post = null; if (u.inside) exitBuilding(st, u); }
      if (st.obj >= 7) done(st, 'jobs');
      return { ok: true };
    },
    order(st, a) { // a.ids, a.kind: move|gather|attack|build, a.x, a.y (tile), a.target
      for (const id of a.ids || []) {
        const u = st.units[id]; if (!u || u.side !== 's' || u.away || u.downed) continue;
        if (u.inside) exitBuilding(st, u);
        u.path = null;
        if (a.kind === 'move') u.task = { t: 'move', x: a.x, y: a.y, manual: true };
        else if (a.kind === 'gather') { const n = st.nodes[a.target]; if (n) u.task = { t: 'gather', node: n.id, res: nodeRes(n), manual: true }; }
        else if (a.kind === 'water') u.task = { t: 'water', manual: true };
        else if (a.kind === 'attack') u.task = { t: 'fight', eid: a.target, manual: true };
        else if (a.kind === 'hunt') u.task = { t: 'hunt', aid: a.target, manual: true };
        else if (a.kind === 'build') u.task = { t: 'build', bid: a.target, manual: true };
      }
      ev(st, { type: 'sfx', s: 'click' });
      return { ok: true };
    },
    alarm(st, a) { st.alarm = a.on != null ? !!a.on : !st.alarm; ev(st, { type: 'sfx', s: st.alarm ? 'horn' : 'click' }); note(st, st.alarm ? 'The alarm sounds! Everyone takes cover; fighters to arms.' : 'All clear. Back to work.', st.alarm ? 'warn' : 'info'); for (const u of S.present(st)) { u.task = null; u.path = null; } return { ok: true }; },
    research(st, a) {
      const T = D.TECH[a.id]; if (!T || st.techs[a.id]) return fail('Not available');
      const why = S.techBlock(st, a.id); if (why) return fail(why);
      if (st.res.knowledge < T.cost) return fail('Not enough Knowledge');
      st.res.knowledge -= T.cost; st.techs[a.id] = true;
      note(st, 'Research complete: ' + T.name + '.', 'good'); ev(st, { type: 'sfx', s: 'reward' });
      if (a.id === 'masonry') done(st, 'masonry');
      if (a.id === 'roads') for (let i = 0; i < N * M; i++) if (st.wear[i] > 60) st._.dirty.add(i);
      return { ok: true };
    },
    craft(st, a) {
      const it = D.WEAPON[a.item] || D.ARMOR[a.item]; if (!it || !it.cost) return fail('Cannot craft');
      if (!S.has(st, 'workshop')) return fail('Needs a Workshop');
      if (it.tech && !st.techs[it.tech]) return fail('Research ' + D.TECH[it.tech].name);
      if ((a.item === 'sword' || a.item === 'mail') && !Object.values(st.buildings).some(b => b.type === 'workshop' && b.tier >= 1 && b.state === 'done')) return fail('Needs a Smithy');
      if (!S.canAfford(st, it.cost)) return fail('Not enough resources');
      if (st.craftQ.length >= 6) return fail('Queue is full');
      pay(st, it.cost); st.craftQ.push({ item: a.item, p: 0 });
      ev(st, { type: 'sfx', s: 'craft' });
      return { ok: true };
    },
    equip(st, a) {
      const u = st.units[a.id]; if (!u) return fail('No one');
      const isW = !!D.WEAPON[a.item], slot = isW ? 'w' : 'a';
      if (a.item !== 'none' && !st.items[a.item]) return fail('None in stock');
      const old = u.gear[slot];
      if (old !== 'none' && old !== a.item) st.items[old] = (st.items[old] || 0) + 1;
      if (a.item !== 'none' && old !== a.item) st.items[a.item]--;
      u.gear[slot] = a.item;
      ev(st, { type: 'sfx', s: 'craft' });
      return { ok: true };
    },
    post(st, a) { // assign a guard to a tower
      const u = st.units[a.id], b = st.buildings[a.bid]; if (!u || !b || !D.B[b.type].slots || b.state !== 'done') return fail('No');
      const used = S.present(st).filter(x => x.post === b.id).length;
      if (used >= D.B[b.type].slots[b.tier]) return fail('The tower is full');
      u.job = 'guard'; u.post = b.id; u.task = null; return { ok: true };
    },
    expedition(st, a) { return startExpedition(st, a.site, a.ids, a.food); },
    trade(st, a) {
      const T = st.trader; if (!T) return fail('No trader here');
      const o = T.offers[a.i]; if (!o || o.used) return fail('That deal is done');
      const deal = D.TRADES[o.i];
      if (!S.canAfford(st, deal.give)) return fail('You cannot afford that');
      pay(st, deal.give); o.used = true;
      const tu = st.units[T.uid];
      for (const k in deal.get) {
        if (k === 'recruit') { const nu = makeSurvivor(st, { x: tu ? tu.x : ctr(st.camp.x), y: tu ? tu.y : ctr(st.camp.y) }); assignHome(st, nu); st.stats.recruited++; note(st, nu.name + ' signs on with the camp.', 'good'); }
        else if (k === 'item') { st.items[deal.get.item] = (st.items[deal.get.item] || 0) + 1; autoEquip(st, deal.get.item); }
        else { st.res[k] += deal.get[k]; }
      }
      clampRes(st); ev(st, { type: 'sfx', s: 'coins' });
      return { ok: true };
    },
    choose(st, a) { return choosePending(st, a.choice); },
    speed(st, a) { st.speed = a.v; return { ok: true }; },
  };
  S.upgradeBlock = function (st, b) {
    const B = D.B[b.type], t = b.tier + 1;
    if (!B.cost[t]) return 'Fully upgraded';
    if (b.type === 'heart') {
      const R = D.ERA_REQ[t + 1]; if (!R) return '';
      const pop = S.survivors(st).length;
      if (pop < R.pop) return 'Needs ' + R.pop + ' survivors';
      if (R.raids && st.stats.raids < R.raids) return 'Repel a raid first';
      if (R.tech && !st.techs[R.tech]) return 'Research ' + D.TECH[R.tech].name;
      if (R.relic && !st.relics[R.relic]) return 'Needs ' + D.RELICS[R.relic].name;
      return '';
    }
    if (B.era[t] > st.era) return 'Needs the ' + D.ERAS[B.era[t]];
    if (B.tech && B.tech[t] && !st.techs[B.tech[t]]) return 'Research ' + D.TECH[B.tech[t]].name;
    return '';
  };
  S.techBlock = function (st, id) {
    const T = D.TECH[id];
    if (!S.has(st, 'study')) return "Needs a Scholar's Study";
    if (T.era > st.era) return 'Needs the ' + D.ERAS[T.era];
    if (T.req) for (const r of T.req) if (!st.techs[r]) return 'Needs ' + D.TECH[r].name;
    if (T.relic && !st.relics[T.relic]) return 'Needs ' + D.RELICS[T.relic].name;
    return '';
  };

  // ---- Objectives ---------------------------------------------------------------------
  function done(st, id) {
    if (st.objDone[id]) return;
    const cur = D.OBJ[st.obj]; if (!cur || cur.id !== id) { st.objDone[id] = true; return; }
    st.objDone[id] = true; advance(st);
  }
  function advance(st) {
    while (D.OBJ[st.obj] && st.objDone[D.OBJ[st.obj].id] && D.OBJ[st.obj].id !== 'free') st.obj++;
    ev(st, { type: 'obj', obj: st.obj }); ev(st, { type: 'sfx', s: 'confirm' });
    onObjective(st, D.OBJ[st.obj] && D.OBJ[st.obj].id);
  }
  function onObjective(st, id) {
    if (id === 'defend' && !st.threat.raid) planRaid(st, S.day(st) + (S.hour(st) < 12 ? 1 : 2), 18, true);
  }
  function checkObjectives(st) {
    const o = D.OBJ[st.obj]; if (!o) return;
    const pop = S.survivors(st).length;
    switch (o.id) {
      case 'gather': if (st.res.wood >= 10 && st.res.stone >= 6) done(st, 'gather'); break;
      case 'fire': { const h = S.heart(st); if (h && h.state === 'done') done(st, 'fire'); break; }
      case 'shelter': if (S.count(st, 'tent', true) > 0) done(st, 'shelter'); break;
      case 'food': if (st.res.food >= 6 + 4 || st.flags.foraged >= 6) done(st, 'food'); break;
      case 'stock': if (S.has(st, 'stockpile') && S.has(st, 'water')) done(st, 'stock'); break;
      case 'defend': if (S.has(st, 'tower') && S.count(st, 'wall', true) >= 6) done(st, 'defend'); break;
      case 'grow': if (pop >= 8) done(st, 'grow'); break;
      case 'masonry': if (st.techs.masonry) done(st, 'masonry'); break;
      case 'banner': if (st.relics.banner) done(st, 'banner'); break;
      case 'era2': if (st.era >= 2) done(st, 'era2'); break;
      case 'era3': if (st.era >= 3) done(st, 'era3'); break;
      case 'jobs': if (S.survivors(st).some(u => u.job !== 'labor')) done(st, 'jobs'); break;
    }
  }

  // ---- The main step --------------------------------------------------------------------
  S.step = function (st, dt) {
    if (st.gameOver) return;
    if (st.pending.length) return;            // a decision is waiting: time stands still
    st._.pathBudget = 14;
    // Clock. The first day runs slow, and holds at dusk until the camp is ready for the night.
    let rate = 24 / D.DAY;
    const day = S.day(st);
    if (day === 1 && st.obj < 5) { rate *= 0.5; }
    const before = st.hours;
    st.hours += dt * rate;
    if (day === 1 && st.obj < 5 && S.hour(st) > 18.4) st.hours = 18.4;
    if (Math.floor(before / 24) !== Math.floor(st.hours / 24)) { /* midnight */ }
    const hb = before % 24, ha = st.hours % 24;
    const crossed = h => (hb < h && ha >= h) || (hb > ha && (hb < h || ha >= h));
    if (crossed(6)) dawn(st);
    if (crossed(19.5) && S.day(st) === 1) { ev(st, { type: 'cine', id: 'firstNight' }); note(st, 'Night is falling. Something is moving in the trees.', 'warn'); }
    if (crossed(21) && S.day(st) === 1 && !st.flags.night1) { st.flags.night1 = true; spawnWave(st, [['stalker', 2]], 1, 'beast'); }
    if (crossed(8) && S.day(st) === 2 && !st.flags.stranger) { st.flags.stranger = true; spawnStranger(st, true); }
    if (crossed(12)) midday(st);
    threatTick(st);
    // Weather.
    if (st.weather.rain && st.hours > st.weather.until) { st.weather.rain = false; }
    // Production.
    production(st, dt);
    // Units.
    const ids = Object.keys(st.units);
    for (const id of ids) {
      const u = st.units[id]; if (!u) continue;
      if (u.dead) { u.deadT = (u.deadT || 0) + dt; if (u.deadT > 6) delete st.units[id]; continue; }
      u.at += dt; if (u.hurtT > 0) u.hurtT -= dt;
      if (u.side === 's') survivorStep(st, u, dt);
      else if (u.side === 'e') foeStep(st, u, dt);
      else if (u.side === 'n') traderStep(st, u, dt);
      else animalStep(st, u, dt);
    }
    separate(st);
    projStep(st, dt);
    expeditionStep(st, dt);
    checkObjectives(st);
    // Game over: nobody left at home or on the road.
    if (S.survivors(st).length === 0 && !st.exps.length) { st.gameOver = true; ev(st, { type: 'gameover' }); }
  };

  function dawn(st) {
    const day = S.day(st);
    st.stats.daysSurvived = day - 1;
    const pop = S.present(st);
    // Rations.
    const n = pop.length; let shortF = 0, shortW = 0;
    if (st.res.food >= n) st.res.food -= n; else { shortF = n - st.res.food; st.res.food = 0; }
    if (st.res.water >= n) st.res.water -= n; else { shortW = n - st.res.water; st.res.water = 0; }
    st.flags.hungry = shortF > 0; st.flags.thirsty = shortW > 0;
    if (shortF || shortW) { note(st, 'Not enough ' + (shortF && shortW ? 'food or water' : shortF ? 'food' : 'water') + ' this morning. People go without.', 'bad'); for (const u of pop) { u.hp = Math.max(1, u.hp - 6); } }
    // Neglect has a price: long hunger kills the weakest; despair makes people leave.
    st.flags.hungerDays = shortF || shortW ? (st.flags.hungerDays || 0) + 1 : 0;
    if (st.flags.hungerDays >= 3 && pop.length > 1 && rnd(st) < 0.4) { const v = pop.slice().sort((a, b) => a.hp - b.hp)[0]; killSurvivor(st, v, shortF ? 'starvation' : 'thirst'); }
    for (const u of S.present(st)) {
      if (S.present(st).length <= 1) break;
      if (u.leader) continue;
      if (u.morale < 18 && u.trait !== 'brave' && rnd(st) < 0.35) {
        note(st, u.name + ' could not bear it any more and left in the night.', 'bad');
        if (u.gear.w !== 'none') st.items[u.gear.w] = (st.items[u.gear.w] || 0) + 1;
        if (u.gear.a !== 'none') st.items[u.gear.a] = (st.items[u.gear.a] || 0) + 1;
        if (u.inside) exitBuilding(st, u);
        delete st.units[u.id]; st.stats.deserted = (st.stats.deserted || 0) + 1; st.morale.death = Math.min(30, st.morale.death + 6);
        break;
      }
    }
    ev(st, { type: 'dawn', day, food: n, water: n, short: shortF + shortW });
    if (day === 2 && !st.flags.night1done) { st.flags.night1done = true; done(st, 'night'); ev(st, { type: 'cine', id: 'dawn1' }); }
    // Regrowth and wildlife.
    for (const id in st.nodes) { const nd = st.nodes[id]; if (nd.type === 'bush' && nd.amt < nd.max) nd.amt = Math.min(nd.max, nd.amt + 3); }
    const animals = Object.values(st.units).filter(u => u.side === 'a' && !u.dead).length;
    if (animals < 12) for (let k = 0; k < 3; k++) { const p = edgePoint(st, rnd(st) * Math.PI * 2, 6); if (p) spawnAnimal(st, rnd(st) < 0.4 ? 'deer' : 'rabbit', p.x, p.y); }
    // Weather.
    if (rnd(st) < 0.25 && day > 1) { st.weather.rain = true; st.weather.until = st.hours + 4 + rnd(st) * 8; note(st, 'Rain today. The barrels will fill.', 'info'); }
    // Wanderers: more likely when there is room and spirits are high.
    if (day >= 4 && rnd(st) < 0.3 + (S.beds(st) > n ? 0.25 : 0) + (st.era - 1) * 0.15) spawnStranger(st, false);
    st.morale.death *= 0.5; st.morale.win *= 0.6;
    ev(st, { type: 'autosave' });
  }
  function midday(st) {
    const day = S.day(st);
    // Night beasts: plan for tonight.
    if (day >= 2 && !st.threat.beasts && day >= st.threat.beastCalm) {
      if (rnd(st) < (day < 4 ? 0.35 : 0.5)) {
        const p = 2 + day * 0.7; const comp = []; let left = p;
        while (left > 1) { const k = day >= 6 && rnd(st) < 0.3 ? 'pale' : 'stalker'; comp.push(k); left -= D.FOE[k].power; }
        st.threat.beasts = { day, hour: 22 + rnd(st) * 3, comp };
      }
    }
    if (st.threat.raids === 0 && !st.threat.raid && !st.threat.active && day >= 3 && st.obj >= 6) planRaid(st, day + 1, 18, true);
    if (!st.trader && day >= 5 && day - st.lastTrader >= (S.has(st, 'market') ? 2 : 4) && S.heart(st) && !st.threat.active) spawnTrader(st);
    // Raids: after the first, every 3 days or so, growing.
    if (st.threat.raids >= 1 && !st.threat.raid && day >= 4) {
      const gap = rnd(st) < 0.5 ? 2 : 3;
      const rd = day + gap;
      const hollow = rd >= 8 && rnd(st) < 0.45;
      planRaid(st, rd, hollow ? 22 : 17 + rnd(st) * 3, false, hollow);
    }
  }
  function planRaid(st, day, hour, first, hollow) {
    const era = st.era;
    let P = first ? 8 : (7 + (day - 3) * 2.3) * (1 + 0.25 * (era - 1));
    if (!hollow && day < st.threat.raiderCalm) P *= 0.6;
    const pool = hollow ? ['hollow', 'hollow', 'hspear', 'harcher'].concat(day >= 11 ? ['hexer'] : []) : ['raider', 'raider', 'thug'].concat(day >= 5 ? ['thrower'] : []).concat(day >= 7 ? ['brute'] : []);
    const comp = []; let left = P;
    if (first) comp.push('first');
    else {
      if (hollow && day >= 14 && st.threat.raids % 3 === 2) { comp.push('warlord'); left -= D.FOE.warlord.power; }
      let guard = 0; while (left > 2 && guard++ < 60) { const k = rpick(st, pool); comp.push(k); left -= D.FOE[k].power; }
    }
    const dirs = []; const nd = first ? 1 : Math.min(3, 1 + Math.floor(day / 7) + (rnd(st) < 0.3 ? 1 : 0));
    const base = rnd(st) * Math.PI * 2; for (let i = 0; i < nd; i++) dirs.push(base + i * (Math.PI * 2 / nd) + (rnd(st) - 0.5) * 0.6);
    const lead = st.techs.watchfires ? 24 : 12;
    st.threat.raid = { day, hour, comp, dirs, warned: false, warnAt: (day - 1) * 24 + hour - lead, at: (day - 1) * 24 + hour, hollow: !!hollow, first: !!first };
  }
  S.planRaid = planRaid;
  function dirName(a) { const n = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east']; return n[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8]; }
  function threatTick(st) {
    const T = st.threat, h = st.hours;
    if (T.raid && !T.raid.warned && h >= T.raid.warnAt) {
      T.raid.warned = true;
      const R = T.raid; const who = R.hollow ? 'The Hollow are stirring' : 'Ash Raiders have been seen';
      note(st, who + ' to the ' + R.dirs.map(dirName).join(' and ') + '. They will strike ' + (R.hollow ? 'tonight' : 'by dusk') + (h > R.at - 12 ? '' : ' tomorrow') + '.', 'warn');
      ev(st, { type: 'warn', raid: R }); ev(st, { type: 'sfx', s: 'horn_far' });
    }
    if (T.raid && h >= T.raid.at) {
      const R = T.raid; T.raid = null;
      if (R.comp[0] === 'first') { const pop = S.present(st).length; R.comp = ['raider', 'raider'].concat(pop >= 3 ? ['thug'] : []).concat(pop >= 5 ? ['raider', 'thrower'] : []); }
      const per = Math.ceil(R.comp.length / R.dirs.length);
      const groups = R.dirs.map((d, i) => ({ dir: d, comp: R.comp.slice(i * per, (i + 1) * per) }));
      T.waveId++;
      for (const gp of groups) { const counts = {}; for (const k of gp.comp) counts[k] = (counts[k] || 0) + 1; spawnWave(st, Object.entries(counts), T.waveId, R.hollow ? 'hollow' : 'raider', gp.dir); }
      T.active = true; T.activeKind = R.hollow ? 'hollow' : 'raider'; T.first = R.first; T.spawned = S.foes(st).length;
      ev(st, { type: 'cine', id: R.first ? 'firstRaid' : 'raid', dir: groups[0].dir, boss: R.comp.includes('warlord') });
      note(st, R.hollow ? 'The Hollow are here!' : 'Raiders at the edge of camp!', 'bad');
    }
    if (T.beasts && h >= (T.beasts.day - 1) * 24 + T.beasts.hour) { const B = T.beasts; T.beasts = null; const counts = {}; for (const k of B.comp) counts[k] = (counts[k] || 0) + 1; spawnWave(st, Object.entries(counts), ++T.waveId, 'beast'); note(st, 'Eyes in the dark. Stalkers circle the camp.', 'warn'); }
    // Wave over? A band that loses most of its fighters breaks and runs.
    if (T.active) {
      const all = S.foes(st), foes = all.filter(e => !e.flee);
      if (T.activeKind !== 'beast' && T.spawned >= 3 && foes.length && foes.length <= Math.floor(T.spawned * 0.3) && !foes.some(e => D.FOE[e.kind].boss)) { for (const e of foes) { e.flee = true; e.path = null; } note(st, 'The attackers break and run!', 'good'); foes.length = 0; }
      if (!foes.length && T.activeKind === 'beast') { T.active = false; note(st, 'The stalkers are gone. The camp breathes again.', 'good'); ev(st, { type: 'sfx', s: 'confirm' }); }
      else if (!foes.length) {
        T.active = false; st.threat.raids++; st.stats.raids++; st.morale.win = 12;
        note(st, T.activeKind === 'raider' ? 'The raid is broken. The camp holds!' : 'The dead fall still. The camp holds!', 'good');
        ev(st, { type: 'victory', first: T.first }); ev(st, { type: 'sfx', s: 'reward' });
        if (st.alarm) CMD.alarm(st, { on: false });
        done(st, 'raid');
      }
    }
  }
  S.dirName = dirName;
  function edgePoint(st, ang, inset) {
    const cx = N / 2, cy = M / 2; const c = st.camp || st.clearing;
    for (let k = 0; k < 20; k++) {
      const a = ang + (k ? (rnd(st) - 0.5) * 0.8 : 0);
      const R = Math.min(N, M) / 2 - (inset || 3);
      let x = Math.round(cx + Math.cos(a) * R), y = Math.round(cy + Math.sin(a) * R);
      x = clamp(x, 2, N - 3); y = clamp(y, 2, M - 3);
      const i = y * N + x; if (!isWater(st, i) && !st._.nodeAt[i] && !st._.bAt[i] && Math.hypot(x - c.x, y - c.y) > 18) return { x: ctr(x), y: ctr(y) };
    }
    return null;
  }
  S.edgePoint = edgePoint;
  function spawnWave(st, counts, wave, faction, dir) {
    const d = dir != null ? dir : rnd(st) * Math.PI * 2;
    const out = [];
    for (const [k, n] of counts) for (let i = 0; i < n; i++) {
      const p = edgePoint(st, d + (rnd(st) - 0.5) * 0.5, 3 + rnd(st) * 3); if (!p) continue;
      out.push(spawnFoe(st, k, p.x + (rnd(st) - 0.5) * 20, p.y + (rnd(st) - 0.5) * 20, wave));
    }
    if (faction === 'beast' && !st.threat.active) { st.threat.active = true; st.threat.activeKind = 'beast'; st.threat.first = false; st.threat.spawned = out.length; }
    return out;
  }
  S.spawnWave = spawnWave;
  function spawnTrader(st) {
    const p = edgePoint(st, rnd(st) * Math.PI * 2, 8); if (!p) return;
    const u = { id: nid(st, 'n'), side: 'n', set: 'erdra_vendor', name: 'Travelling Trader', x: p.x, y: p.y, dir: 0, hp: 60, maxHp: 60, anim: 'idle', at: 0, path: null, task: { t: 'approach' } };
    st.units[u.id] = u;
    const pool = D.TRADES.map((o, i) => i); const offers = [];
    const n = 3 + (S.has(st, 'market') ? 1 : 0);
    while (offers.length < n && pool.length) { const i = pool.splice(Math.floor(rnd(st) * pool.length), 1)[0]; offers.push({ i, used: false }); }
    st.trader = { uid: u.id, offers }; st.lastTrader = S.day(st); st.stats.traders = (st.stats.traders || 0) + 1;
    note(st, 'A trader\'s cart is coming up the track.', 'info'); ev(st, { type: 'cine', id: 'stranger', uid: u.id });
  }
  S.spawnTrader = spawnTrader;
  function traderStep(st, u, dt) {
    const h = S.heart(st); const hr = S.hour(st);
    if (u.task.t === 'approach') {
      const c = h ? { x: h.x + 6, y: h.y + h.h } : (st.camp || st.clearing);
      const r = goTo(st, u, rectT(c.x, c.y, true, true), dt);
      if (r !== 'moving') { u.anim = 'idle'; if (!u.arrived) { u.arrived = true; note(st, 'The trader has set up by the fire. Tap them to trade.', 'good'); ev(st, { type: 'sfx', s: 'coins' }); } }
      if (hr >= 19.5 || st.threat.active) { u.task = { t: 'go' }; u.path = null; if (st.threat.active) note(st, 'The trader packs up in a hurry.', 'info'); }
    } else {
      if (!u.exit) { const p = edgePoint(st, rnd(st) * Math.PI * 2, 2); u.exit = p ? [tileOf(p.x), tileOf(p.y)] : [1, 1]; }
      const r = goTo(st, u, rectT(u.exit[0], u.exit[1], true, true), dt, true);
      if (r !== 'moving') { delete st.units[u.id]; st.trader = null; }
    }
  }
  function spawnStranger(st, scripted) {
    const p = edgePoint(st, rnd(st) * Math.PI * 2, 8); if (!p) return;
    const u = makeSurvivor(st, { x: p.x, y: p.y });
    u.stranger = true; u.task = { t: 'approach' };
    if (scripted) { u.trait = 'gentle'; u.skills.medic = Math.max(u.skills.medic, 4); }
    ev(st, { type: 'cine', id: 'stranger', uid: u.id });
    note(st, 'Someone is walking toward the camp.', 'info');
  }
  S.spawnStranger = spawnStranger;

  // ---- Production ---------------------------------------------------------------------
  function production(st, dt) {
    const hrs = dt / HOUR;
    let water = 0;
    for (const id in st.buildings) {
      const b = st.buildings[id]; if (b.state !== 'done') continue; const B = D.B[b.type];
      if (B.waterDay) water += B.waterDay[b.tier] / 24 * hrs * (st.weather.rain ? 2 : 1);
      if (b.crop && b.crop.stage === 'growing') { b.crop.g += hrs / 30; if (b.crop.g >= 1) { b.crop.g = 1; b.crop.stage = 'ripe'; } }
      // Fire damage on broken buildings fades; hp regen nothing.
    }
    st.res.water += water; clampRes(st);
  }

  // ---- Survivor AI ----------------------------------------------------------------------
  const DIST = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function nearestFoe(st, u, rTiles) {
    let best = null, bd = rTiles * TS;
    for (const id in st.units) { const e = st.units[id]; if (e.side !== 'e' || e.dead) continue; const d = DIST(u, e); if (d < bd) { bd = d; best = e; } }
    return best;
  }
  S.nearestFoe = nearestFoe;
  function isFighter(st, u) { return u.job === 'guard' || (D.TRAITS[u.trait] || {}).brave || (u.skills.combat >= 4 && u.gear.w !== 'none') || u.leader && S.present(st).length <= 2; }
  function exitBuilding(st, u) {
    const b = st.buildings[u.inside]; u.inside = null;
    if (b) { const p = nearestFree(st, b.x + (b.w >> 1), b.y + b.h - 1) || { x: b.x + (b.w >> 1), y: b.y + b.h }; u.x = ctr(p.x); u.y = ctr(p.y); }
    u.path = null;
  }
  function enterBuilding(st, u, b) { u.inside = b.id; u.path = null; u.anim = 'idle'; }
  function shelters(st) { return Object.values(st.buildings).filter(b => b.state === 'done' && (D.B[b.type].beds || (b.type === 'heart' && b.tier >= 1))); }

  function survivorStep(st, u, dt) {
    if (u.stranger) { strangerStep(st, u, dt); return; }
    if (u.away) return;
    if (u.cd > 0) u.cd -= dt;
    // Downed: bleeding out until someone helps.
    if (u.downed > 0) {
      u.downed -= dt; u.anim = 'down';
      if (u.downed <= 0) killSurvivor(st, u, u.lastHit || 'their wounds');
      return;
    }
    // Healing and injuries.
    const rest = !u.task || u.task.t === 'sleep' || u.task.t === 'rest' || u.inside;
    if (u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + dt * (rest ? 0.6 : 0.15));
    if (u.injury) { u.injury.t -= dt / HOUR * healRate(st, u); if (u.injury.t <= 0) { note(st, u.name + ' has recovered from ' + u.injury.name.toLowerCase() + '.', 'good'); u.injury = null; } }
    // Morale drifts toward its target.
    const tgt = moraleTarget(st, u); u.morale += (tgt - u.morale) * Math.min(1, dt * 0.02);
    // Fog: survivors see around them.
    if ((u.fogT = (u.fogT || 0) - dt) <= 0) { u.fogT = 0.5; reveal(st, tileOf(u.x), tileOf(u.y), D.TRAITS[u.trait] && D.TRAITS[u.trait].skill && D.TRAITS[u.trait].skill.scout ? 9 : 7); }
    // Footsteps wear paths into roads.
    if (!u.inside && (u.anim === 'walk' || u.anim === 'run')) { const i = tileOf(u.y) * N + tileOf(u.x); const before = st.wear[i]; st.wear[i] = Math.min(100, st.wear[i] + dt * 1.6); if ((before < 25 && st.wear[i] >= 25) || (before < 60 && st.wear[i] >= 60)) st._.dirty.add(i); }
    // Decide.
    decide(st, u);
    if (u.onTower && (!u.task || u.task.t !== 'guard')) { const tb = st.buildings[u.onTower]; u.onTower = null; if (tb) { const p = nearestFree(st, tb.x + 1, tb.y + tb.h); if (p) { u.x = ctr(p.x); u.y = ctr(p.y); } } u.path = null; }
    doTask(st, u, dt);
  }
  function healRate(st, u) {
    let r = 1; const inf = u.inside && st.buildings[u.inside] && st.buildings[u.inside].type === 'infirmary';
    if (inf) { r = 2; if (S.present(st).some(m => m.job === 'medic' && m.task && m.task.t === 'treat')) r = 3.5 * (st.techs.herbalism ? 1.6 : 1); }
    return r;
  }
  function moraleTarget(st, u) {
    let m = 55 + (st.era - 1) * 4;
    const home = u.home && st.buildings[u.home];
    if (home) m += home.type === 'cabin' ? 12 : 6; else m -= 12;
    if (st.flags.hungry) m -= 18; if (st.flags.thirsty) m -= 18;
    if (u.injury) m -= 8;
    m -= st.morale.death; m += st.morale.win;
    const cheer = S.present(st).filter(x => x.trait === 'cheerful' && x !== u).length; m += Math.min(12, cheer * 5);
    if (st.weather.rain) m -= 3;
    if (st.relics.banner) m += 6;
    if (S.has(st, 'fountain')) m += D.B.fountain.morale;
    if (u.trait === 'grim') m = 50 + (m - 50) * 0.4;
    return clamp(m, 5, 100);
  }
  S.moraleTarget = moraleTarget;

  function decide(st, u) {
    const t = u.task;
    const foe = nearestFoe(st, u, isFighter(st, u) ? (u.job === 'guard' ? 11 : 8) : 5);
    const fighter = isFighter(st, u);
    // Danger first.
    if (foe && !(t && (t.t === 'fight' || t.t === 'flee' || t.t === 'hide' || (t.t === 'guard' && u.post)))) {
      if (u.inside && !fighter) return;              // stay hidden
      if (u.inside) exitBuilding(st, u);
      if (fighter && u.hp > u.maxHp * 0.25) { u.task = { t: 'fight', eid: foe.id }; u.path = null; return; }
      const sh = nearestShelter(st, u);
      if (sh) { u.task = { t: 'hide', bid: sh.id }; u.path = null; return; }
      // Nowhere to hide: fight back if cornered, else run toward the fire.
      if (DIST(u, foe) < TS * 1.5) { u.task = { t: 'fight', eid: foe.id }; u.path = null; return; }
      const h = S.heart(st); const c = h ? { x: h.x + 2, y: h.y + h.h } : st.camp || st.clearing;
      u.task = { t: 'flee', x: c.x, y: c.y + 1 }; u.path = null; return;
    }
    if (st.alarm && !fighter && !(t && t.t === 'hide')) { if (u.inside) return; const sh = nearestShelter(st, u); if (sh) { u.task = { t: 'hide', bid: sh.id }; u.path = null; return; } }
    if (st.alarm && fighter && u.job !== 'guard' && !foe && !(t && t.manual)) { if (!t || t.t !== 'muster') { u.task = { t: 'muster' }; u.path = null; } return; }
    if (t && t.manual) return;
    if (t && t.t === 'leave') return;
    // Rescue anyone bleeding out nearby.
    if (!t || (t.t !== 'rescue' && t.t !== 'fight')) {
      const down = S.present(st).find(x => x.downed > 0 && x !== u && DIST(x, u) < TS * 14 && !S.present(st).some(y => y.task && y.task.t === 'rescue' && y.task.uid === x.id));
      if (down && (!nearestFoe(st, down, 2) || (fighter && u.hp > u.maxHp * 0.5))) { if (u.inside) exitBuilding(st, u); u.task = { t: 'rescue', uid: down.id }; u.path = null; return; }
    }
    if (t && S.isNight(st) && u.job !== 'guard' && st.camp && WORK[t.t]) { u.task = null; if (u.carry) deposit(st, u); }
    if (u.task) return;
    if (u.inside && st.buildings[u.inside] && !(u.task)) {
      // Woken: night still? stay.
      if (S.isNight(st) && u.job !== 'guard' && !foe) { u.task = { t: 'sleep', bid: u.inside }; return; }
      exitBuilding(st, u);
    }
    // Night: sleep (guards keep watch).
    if (S.isNight(st) && u.job !== 'guard' && st.camp) {
      const home = assignHome(st, u);
      u.task = home ? { t: 'sleep', bid: home.id } : { t: 'campsleep' }; u.path = null; return;
    }
    // Evenings: people drift to the fire and sit together before bed.
    { const hr = S.hour(st); const h = S.heart(st); if (hr >= 18.3 && hr < 20 && h && h.state === 'done' && u.job !== 'guard' && !(u.injury && u.injury.t > 0)) { u.task = { t: 'social' }; u.path = null; return; } }
    // Injured rest at the healer's tent, if there is one.
    if (u.injury && u.injury.t > 0) { const inf = Object.values(st.buildings).find(b => b.type === 'infirmary' && b.state === 'done'); if (inf && u.job !== 'medic') { u.task = { t: 'rest', bid: inf.id }; return; } }
    u.task = jobTask(st, u) || { t: 'idle', until: st.hours + 0.4 };
  }
  function nearestShelter(st, u) {
    let best = null, bd = 1e9;
    for (const b of shelters(st)) { const d = Math.hypot(ctr(b.x + b.w / 2) - u.x, ctr(b.y + b.h) - u.y); if (d < bd) { bd = d; best = b; } }
    return best;
  }
  function assignHome(st, u) {
    if (u.home && st.buildings[u.home] && st.buildings[u.home].state === 'done') return st.buildings[u.home];
    u.home = null;
    for (const b of Object.values(st.buildings)) {
      if (b.state !== 'done') continue; const B = D.B[b.type]; if (!B.beds) continue;
      const used = S.survivors(st).filter(x => x.home === b.id).length;
      if (used < B.beds[b.tier]) { u.home = b.id; return b; }
    }
    return null;
  }
  S.assignHome = assignHome;

  // What a survivor does for their job when nothing else matters.
  function jobTask(st, u) {
    const job = u.job;
    const sites = Object.values(st.buildings).filter(b => b.state === 'site' || b.up);
    const damaged = Object.values(st.buildings).filter(b => b.state === 'done' && !b.up && b.hp < b.maxHp * 0.85);
    const crew = (b, kind) => S.present(st).filter(x => x.task && x.task.bid === b.id && x.task.t === kind).length;
    const pickSite = () => { let best = null, bd = 1e9; for (const b of sites) { if (crew(b, 'build') >= 3 || (b.unreach && b.unreach > st.hours)) continue; const d = Math.hypot(ctr(b.x) - u.x, ctr(b.y) - u.y) + (b.type === 'heart' ? -400 : 0) + (b.wall ? 60 : 0); if (d < bd) { bd = d; best = b; } } return best; };
    if (job === 'build' || job === 'labor') {
      const s = pickSite(); if (s) return { t: 'build', bid: s.id };
      const r = damaged.find(b => crew(b, 'repair') < 2 && !nearestFoe(st, { x: ctr(b.x), y: ctr(b.y) }, 6)); if (r) return { t: 'repair', bid: r.id };
    }
    if (u.leader && st.obj < 3) return null;      // the opening: the player gathers by hand
    if (job === 'guard') {
      if (u.post && st.buildings[u.post] && st.buildings[u.post].state === 'done') return { t: 'guard', bid: u.post };
      const tw = Object.values(st.buildings).find(b => D.B[b.type].slots && b.state === 'done' && S.present(st).filter(x => x.post === b.id).length < D.B[b.type].slots[b.tier]);
      if (tw) { u.post = tw.id; return { t: 'guard', bid: tw.id }; }
      const yard = Object.values(st.buildings).find(b => b.type === 'training' && b.state === 'done');
      if (yard && !S.isNight(st) && crew(yard, 'train') < 3) return { t: 'train', bid: yard.id };
      return { t: 'patrol' };
    }
    if (job === 'medic') {
      const inf = Object.values(st.buildings).find(b => b.type === 'infirmary' && b.state === 'done');
      if (inf) return { t: 'treat', bid: inf.id };
    }
    if (job === 'craft') {
      const ws = Object.values(st.buildings).find(b => b.type === 'workshop' && b.state === 'done');
      if (ws && st.craftQ.length) return { t: 'craft', bid: ws.id };
    }
    if (job === 'research') {
      const sd = Object.values(st.buildings).find(b => b.type === 'study' && b.state === 'done');
      if (sd) return { t: 'study', bid: sd.id };
    }
    if (job === 'farm') {
      const f = Object.values(st.buildings).filter(b => b.type === 'farm' && b.state === 'done' && b.crop && b.crop.stage !== 'growing' && crew(b, 'farm') < 1);
      if (f.length) return { t: 'farm', bid: f[0].id };
      return gatherTask(st, u, 'food');
    }
    if (job === 'wood') return gatherTask(st, u, 'wood');
    if (job === 'stone') return gatherTask(st, u, 'stone');
    if (job === 'forage') return gatherTask(st, u, st.res.water < st.res.food * 0.7 ? 'water' : 'food');
    // Laborer: gather what is shortest.
    if (job === 'labor' || job === 'build' || job === 'craft' || job === 'research' || job === 'medic') {
      const pop = S.present(st).length, cap = S.capacity(st);
      const need = [['food', (st.res.food) / (pop * 3 + 6)], ['water', st.res.water / (pop * 3 + 6)], ['wood', st.res.wood / (cap * 0.6)], ['stone', st.res.stone / (cap * 0.4)]];
      if (!S.has(st, 'water') && st.camp) need[1][1] *= 0.8;
      need.sort((a, b) => a[1] - b[1]);
      for (const [r, v] of need) { if (v > 1 && r !== 'wood') continue; const tk = gatherTask(st, u, r); if (tk) return tk; }
    }
    return null;
  }
  const nodeRes = n => n.type === 'tree' ? 'wood' : n.type === 'rock' ? 'stone' : n.type === 'bush' ? 'food' : n.type === 'scrap' ? 'metal' : null;
  S.nodeRes = nodeRes;
  function gatherTask(st, u, res) {
    if (res === 'water') return { t: 'water' };
    if (res === 'food') {
      // Bushes first, then game.
      const n = nearestNode(st, u, 'bush', 28);
      if (n) return { t: 'gather', node: n.id, res: 'food' };
      const a = Object.values(st.units).filter(x => x.side === 'a' && !x.dead).sort((p, q) => DIST(p, u) - DIST(q, u))[0];
      if (a && DIST(a, u) < TS * 30) return { t: 'hunt', aid: a.id };
      return null;
    }
    const type = res === 'wood' ? 'tree' : res === 'stone' ? 'rock' : res === 'metal' ? 'scrap' : null;
    if (!type) return null;
    const n = nearestNode(st, u, type, 40); if (!n) return null;
    return { t: 'gather', node: n.id, res };
  }
  function nearestNode(st, u, type, maxTiles) {
    const tx = tileOf(u.x), ty = tileOf(u.y);
    const base = st.camp ? (S.heart(st) || { x: st.camp.x, y: st.camp.y }) : { x: tx, y: ty };
    let best = null, bd = 1e9;
    const taken = new Set(S.present(st).filter(x => x !== u && x.task && x.task.node).map(x => x.task.node));
    for (const id in st.nodes) {
      const n = st.nodes[id]; if (n.type !== type || n.amt <= 0 || !st.fog[n.y * N + n.x] || (n.unreach && n.unreach > st.hours)) continue;
      if (type === 'bush' && n.amt < 2) continue;
      const d = Math.hypot(n.x - tx, n.y - ty) * 0.6 + Math.hypot(n.x - base.x, n.y - base.y) * 0.4 + (taken.has(id) ? 6 : 0);
      if (d < bd && d < maxTiles) { bd = d; best = n; }
    }
    return best;
  }
  function dropoff(st, u, res) {
    let best = null, bd = 1e9;
    for (const id in st.buildings) {
      const b = st.buildings[id]; if (b.state !== 'done') continue; const B = D.B[b.type];
      if (!(b.type === 'heart' || b.type === 'stockpile' || (B.drop && B.drop === res))) continue;
      const d = Math.hypot(ctr(b.x + b.w / 2) - u.x, ctr(b.y + b.h / 2) - u.y); if (d < bd) { bd = d; best = b; }
    }
    return best;
  }
  function deposit(st, u) {
    if (!u.carry) return;
    const { res, amt } = u.carry; u.carry = null;
    const before = st.res[res];
    st.res[res] += amt; clampRes(st);
    if (res === 'food' && u.foraged) { st.flags.foraged = (st.flags.foraged || 0) + amt; }
    ev(st, { type: 'gain', res, amt: Math.round(st.res[res] - before), x: u.x, y: u.y - 30 });
    if (st.res[res] - before < amt - 0.5) ev(st, { type: 'full', res });
  }

  // Movement: follow a path to a goal rectangle. Returns 'arrived' | 'moving' | 'stuck'.
  function goTo(st, u, goal, dt, run) {
    const tx = tileOf(u.x), ty = tileOf(u.y);
    const inGoal = goal.adj ? (tx >= goal.x0 - 1 && tx <= goal.x1 + 1 && ty >= goal.y0 - 1 && ty <= goal.y1 + 1) : (tx >= goal.x0 && tx <= goal.x1 && ty >= goal.y0 && ty <= goal.y1);
    const key = goal.x0 + ',' + goal.y0 + ',' + goal.x1 + ',' + goal.y1 + (goal.adj ? 'a' : '');
    if (inGoal && (!u.path || !u.path.length)) { u.path = null; return 'arrived'; }
    if (!u.path || u.pathKey !== key) {
      if (u.retryAt && st.hours < u.retryAt && u.retryKey === key) { if (u.anim === 'walk' || u.anim === 'run') u.anim = 'idle'; return 'moving'; }
      if (st._.pathBudget <= 0) { u.anim = 'idle'; return 'moving'; }
      st._.pathBudget--;
      const cost = u.side === 'e' ? costE(st) : costS(st);
      const p = Wd.path(N, M, tx, ty, goal, cost, u.side === 'e' ? 12000 : 7000);
      if (!p) { u.path = null; u.stuck = (u.stuck || 0) + 1; u.retryKey = key; u.retryAt = st.hours + 0.1 * u.stuck; if (u.stuck > 2) { u.stuck = 0; u.retryAt = st.hours + 0.4; return 'stuck'; } return 'moving'; }
      u.path = p; u.pathKey = key; u.stuck = 0; u.retryAt = 0;
      if (!p.length) return 'arrived';
    }
    return follow(st, u, dt, run) ;
  }
  function follow(st, u, dt, run) {
    if (!u.path || !u.path.length) { u.path = null; return 'arrived'; }
    const i = u.path[0], nx = ctr(i % N), ny = ctr((i / N) | 0);
    // Enemies break what is in their way.
    if (u.side === 'e') { const bid = st._.bAt[i]; if (bid) { const b = st.buildings[bid]; if (b && b.state !== 'ruin' && solidTile(b, i % N, (i / N) | 0)) return { block: b }; } }
    else if (costS(st)(i) < 0) { u.path = null; return 'moving'; }
    const dx = nx - u.x, dy = ny - u.y, d = Math.hypot(dx, dy);
    let sp = (u.side === 'e' ? D.FOE[u.kind].spd : u.side === 'a' ? (u.flee > 0 ? 80 : 26) : spd(u)) * (run ? 1.7 : 1);
    if (u.side !== 'e' && st.techs.roads && st.wear[tileOf(u.y) * N + tileOf(u.x)] > 60) sp *= 1.35;
    const step = sp * dt;
    if (d <= step) { u.x = nx; u.y = ny; u.path.shift(); }
    else { u.x += dx / d * step; u.y += dy / d * step; }
    u.dir = Math.atan2(dy, dx); u.anim = run ? 'run' : 'walk';
    return u.path.length ? 'moving' : 'arrived';
  }
  const rectB = (b, adj) => ({ x0: b.x, y0: b.y, x1: b.x + b.w - 1, y1: b.y + b.h - 1, adj: adj !== false });
  const rectT = (x, y, adj, partial) => ({ x0: x, y0: y, x1: x, y1: y, adj: !!adj, partial: !!partial });
  function face(u, x, y) { u.dir = Math.atan2(y - u.y, x - u.x); }

  function doTask(st, u, dt) {
    const t = u.task;
    if (!t) { u.anim = 'idle'; return; }
    switch (t.t) {
      case 'idle': {
        u.anim = 'idle';
        if (st.hours > t.until) u.task = null;
        else if (!t.wx && st.camp && rnd(st) < 0.01) { const h = S.heart(st) || st.camp; t.wx = (h.x || st.camp.x) + rint(st, -4, 6); t.wy = (h.y || st.camp.y) + rint(st, -2, 5); }
        if (t.wx != null) { const r = goTo(st, u, rectT(t.wx, t.wy, true, true), dt); if (r !== 'moving') { t.wx = null; } }
        break;
      }
      case 'move': { const r = goTo(st, u, rectT(t.x, t.y, false), dt); if (r === 'arrived' || r === 'stuck') { u.task = null; u.anim = 'idle'; } break; }
      case 'flee': { const r = goTo(st, u, rectT(t.x, t.y, true, true), dt, true); if (r !== 'moving') { u.task = null; } break; }
      case 'muster': {
        const h = S.heart(st); if (!h) { u.task = null; break; }
        const r = goTo(st, u, Object.assign(rectB(h, true), { partial: true }), dt, true); if (r !== 'moving') u.anim = 'idle';
        if (!st.alarm) u.task = null; break;
      }
      case 'gather': {
        if (u.carry && u.carry.amt > 0) { deliver(st, u, dt); break; }
        const n = st.nodes[t.node];
        if (!n || n.amt <= 0) { const nt = t.manual ? gatherTask(st, u, t.res) : null; u.task = nt ? Object.assign(nt, { manual: true }) : null; break; }
        const r = goTo(st, u, rectT(n.x, n.y, true), dt);
        if (r === 'stuck') { n.unreach = st.hours + 12; u.task = null; break; }
        if (r !== 'arrived') { t.w = 0; break; }
        face(u, ctr(n.x), ctr(n.y));
        u.anim = n.type === 'bush' || n.type === 'scrap' ? 'crouch' : 'work';
        const yieldB = (n.type === 'tree' && nearCamp(st, n, 'woodcamp')) || (n.type === 'rock' && nearCamp(st, n, 'quarry')) ? 1.25 : 1;
        t.w = (t.w || 0) + dt * workRate(st, u, 'gather');
        const need = n.type === 'bush' ? 2.2 : n.type === 'scrap' ? 4.5 : 3.2;
        if ((t.sfxT = (t.sfxT || 0) - dt) <= 0 && n.type !== 'bush') { t.sfxT = 0.8; ev(st, { type: 'sfx', s: n.type === 'tree' ? 'chop' : 'pick', x: u.x, y: u.y }); ev(st, { type: 'fx', fx: n.type === 'tree' ? 'leaves' : 'rock', x: ctr(n.x), y: ctr(n.y) - 12, small: true }); }
        if (t.w >= need) {
          t.w = 0;
          const amt = Math.min(n.amt, n.type === 'bush' ? 3 : n.type === 'scrap' ? 4 : 5);
          n.amt -= amt; u.carry = { res: t.res, amt: Math.round(amt * yieldB) }; if (t.res === 'food') u.foraged = true;
          gainXp(st, u, 'gather', 3);
          if (n.amt <= 0 && n.type !== 'bush') { removeNode(st, n); }
          if (!dropoff(st, u, t.res)) deposit(st, u);
        }
        break;
      }
      case 'water': {
        if (u.carry && u.carry.amt > 0) { deliver(st, u, dt); break; }
        if (!t.tile) t.tile = shoreTile(st, u);
        if (!t.tile) { u.task = null; break; }
        const r = goTo(st, u, rectT(t.tile[0], t.tile[1], false), dt);
        if (r === 'stuck') { st._.badShore = st._.badShore || new Set(); st._.badShore.add(t.tile[1] * N + t.tile[0]); t.tile = null; u.task = null; break; }
        if (r !== 'arrived') break;
        u.anim = 'crouch'; t.w = (t.w || 0) + dt * workRate(st, u, 'gather');
        if (t.w >= 2.5) { t.w = 0; u.carry = { res: 'water', amt: 4 }; ev(st, { type: 'fx', fx: 'water_splash', x: u.x, y: u.y }); if (!dropoff(st, u, 'water')) deposit(st, u); }
        break;
      }
      case 'hunt': {
        if (u.carry && u.carry.amt > 0) { deliver(st, u, dt); break; }
        const a = st.units[t.aid];
        if (!a || a.dead) { if (a && a.dead && !a.butchered && DIST(a, u) < TS * 1.8) { a.butchered = true; u.carry = { res: 'food', amt: a.kind === 'deer' ? 14 : 5 }; u.foraged = true; gainXp(st, u, 'gather', 4); break; } u.task = null; break; }
        const W = D.WEAPON[u.gear.w];
        const range = (W.ranged ? W.range : Math.max(1, W.range)) * TS;
        if (DIST(u, a) > range) { goTo(st, u, rectT(tileOf(a.x), tileOf(a.y), true), dt, true); if (u.at > 0.5) { u.path = null; u.at = 0; } }
        else attack(st, u, a, dt);
        break;
      }
      case 'build': case 'repair': {
        const b = st.buildings[t.bid];
        if (!b || (t.t === 'build' && b.state !== 'site' && !b.up) || (t.t === 'repair' && b.hp >= b.maxHp)) { u.task = null; break; }
        const r = goTo(st, u, rectB(b), dt);
        if (r === 'stuck') { b.unreach = st.hours + 2; u.task = null; break; }
        if (r !== 'arrived') break;
        face(u, ctr(b.x + b.w / 2), ctr(b.y + b.h / 2)); u.anim = 'work';
        const k = workRate(st, u, 'build');
        if ((t.sfxT = (t.sfxT || 0) - dt) <= 0) { t.sfxT = 0.55; ev(st, { type: 'sfx', s: 'hammer', x: u.x, y: u.y }); }
        if (t.t === 'build') {
          const B = D.B[b.type]; const tier = b.up ? b.tier + 1 : b.tier;
          b.prog += dt * k / B.work[tier];
          if (!b.up) b.hp = Math.max(b.hp, Math.round(b.maxHp * b.prog));
          gainXp(st, u, 'build', dt * 0.8);
          if (b.prog >= 1) finishBuilding(st, b);
        } else {
          b.hp = Math.min(b.maxHp, b.hp + dt * 8 * k);
          if ((t.costT = (t.costT || 0) + dt * 8 * k) >= 30) { t.costT = 0; const res = (b.tier >= 1 && (b.type === 'wall' || b.type === 'tower')) || b.type === 'ballista' || b.type === 'fountain' ? 'stone' : 'wood'; if (st.res[res] >= 1) st.res[res] -= 1; else { u.task = null; } }
          gainXp(st, u, 'build', dt * 0.4);
        }
        break;
      }
      case 'farm': {
        const b = st.buildings[t.bid]; if (!b || !b.crop || b.crop.stage === 'growing') { u.task = null; break; }
        const r = goTo(st, u, rectB(b, false), dt); if (r === 'stuck') { u.task = null; break; } if (r !== 'arrived') break;
        u.anim = 'crouch'; t.w = (t.w || 0) + dt * workRate(st, u, 'gather');
        if (t.w >= 5) {
          if (b.crop.stage === 'fallow') { b.crop.stage = 'growing'; b.crop.g = 0; }
          else if (b.crop.stage === 'ripe') { const amt = Math.round(20 * (st.techs.agriculture ? 1.5 : 1) * (1 + skillOf(u, 'gather') * 0.04)); const bf = st.res.food; st.res.food += amt; clampRes(st); ev(st, { type: 'gain', res: 'food', amt: Math.round(st.res.food - bf), x: u.x, y: u.y - 30 }); b.crop.stage = 'fallow'; b.crop.g = 0; }
          gainXp(st, u, 'gather', 4); u.task = null;
        }
        break;
      }
      case 'craft': {
        const b = st.buildings[t.bid]; if (!b || !st.craftQ.length) { u.task = null; break; }
        const r = goTo(st, u, rectB(b), dt); if (r === 'stuck') { u.task = null; break; } if (r !== 'arrived') break;
        u.anim = 'work'; face(u, ctr(b.x + 1), ctr(b.y + 1));
        if ((t.sfxT = (t.sfxT || 0) - dt) <= 0) { t.sfxT = 0.7; ev(st, { type: 'sfx', s: 'anvil', x: u.x, y: u.y }); ev(st, { type: 'fx', fx: 'embers', x: ctr(b.x + 1), y: ctr(b.y + 1), small: true }); }
        const q = st.craftQ[0]; q.p += dt * workRate(st, u, 'craft') / 14;
        gainXp(st, u, 'craft', dt * 0.5);
        if (q.p >= 1) { st.craftQ.shift(); st.items[q.item] = (st.items[q.item] || 0) + 1; const it = D.WEAPON[q.item] || D.ARMOR[q.item]; note(st, it.name + ' crafted.', 'good'); ev(st, { type: 'sfx', s: 'reward' }); autoEquip(st, q.item); }
        break;
      }
      case 'study': {
        const b = st.buildings[t.bid]; if (!b) { u.task = null; break; }
        const r = goTo(st, u, rectB(b), dt); if (r === 'stuck') { u.task = null; break; } if (r !== 'arrived') break;
        u.anim = 'crouch'; st.res.knowledge += dt * 0.05 * workRate(st, u, 'craft');
        gainXp(st, u, 'craft', dt * 0.3);
        if (S.isNight(st) || rnd(st) < dt * 0.01) u.task = null;
        break;
      }
      case 'treat': {
        const b = st.buildings[t.bid]; if (!b) { u.task = null; break; }
        const r = goTo(st, u, rectB(b), dt); if (r === 'stuck') { u.task = null; break; } if (r !== 'arrived') break;
        const patients = S.present(st).filter(x => x.inside === b.id);
        u.anim = patients.length ? 'crouch' : 'idle';
        if (patients.length) { gainXp(st, u, 'medic', dt * 0.6); for (const p of patients) p.hp = Math.min(p.maxHp, p.hp + dt * (0.5 + skillOf(u, 'medic') * 0.15)); }
        else if (rnd(st) < dt * 0.05) u.task = null;
        break;
      }
      case 'rest': {
        const b = st.buildings[t.bid]; if (!b || !u.injury) { if (u.inside) exitBuilding(st, u); u.task = null; break; }
        if (u.inside === b.id) break;
        const r = goTo(st, u, rectB(b), dt); if (r === 'arrived') enterBuilding(st, u, b); else if (r === 'stuck') u.task = null;
        break;
      }
      case 'sleep': {
        const b = st.buildings[t.bid];
        if (!b || !S.isNight(st)) { if (u.inside) exitBuilding(st, u); u.task = null; break; }
        if (u.inside === b.id) break;
        const r = goTo(st, u, rectB(b), dt); if (r === 'arrived') enterBuilding(st, u, b); else if (r === 'stuck') u.task = { t: 'campsleep' };
        break;
      }
      case 'social': {
        const h = S.heart(st); const hr = S.hour(st);
        if (!h || hr < 18 || hr >= 20) { u.task = null; break; }
        if (!t.spot) { const k = parseInt(u.id.slice(1), 10) || 0; const a = k * 2.399; t.spot = [Math.round(h.x + 2 + Math.cos(a) * 3.4), Math.round(h.y + 1 + Math.sin(a) * 2.6)]; }
        const r = goTo(st, u, rectT(t.spot[0], t.spot[1], true, true), dt);
        if (r === 'stuck') { u.task = null; break; }
        if (r !== 'moving') { u.anim = (parseInt(u.id.slice(1), 10) || 0) % 3 ? 'crouch' : 'idle'; face(u, ctr(h.x + 2), ctr(h.y + 1)); }
        break;
      }
      case 'campsleep': {
        if (!S.isNight(st)) { u.task = null; break; }
        const h = S.heart(st); const c = h ? { x: h.x + (u.id.charCodeAt(1) % 5), y: h.y + h.h } : (st.camp || st.clearing);
        const r = goTo(st, u, rectT(c.x, c.y, true, true), dt); if (r !== 'moving') u.anim = 'crouch';
        break;
      }
      case 'hide': {
        const b = st.buildings[t.bid];
        if (!b) { u.task = null; break; }
        if (u.inside === b.id) { if (!st.alarm && !nearestFoe(st, u, 8)) { exitBuilding(st, u); u.task = null; } break; }
        const r = goTo(st, u, rectB(b), dt, true); if (r === 'arrived') enterBuilding(st, u, b); else if (r === 'stuck') u.task = null;
        break;
      }
      case 'fight': {
        const e = st.units[t.eid];
        if (!e || e.dead || e.flee) { u.task = null; break; }
        const W = D.WEAPON[u.gear.w];
        const range = W.ranged ? W.range * TS : Math.max(0.9, W.range) * TS + 8;
        if (DIST(u, e) > range) { if (!t.manual && DIST(u, e) > TS * 16) { u.task = null; break; } chase(st, u, e, dt); }
        else attack(st, u, e, dt);
        break;
      }
      case 'guard': {
        const b = st.buildings[t.bid]; if (!b || b.state !== 'done') { u.post = null; u.task = null; break; }
        if (!u.onTower) { const r = goTo(st, u, rectB(b), dt); if (r === 'arrived') { u.onTower = b.id; const k = S.present(st).filter(x => x.onTower === b.id).indexOf(u); u.x = ctr(b.x + 1) + (k ? 14 : -6); u.y = ctr(b.y) + 6; u.path = null; } else if (r === 'stuck') u.task = null; break; }
        u.anim = 'idle';
        const R = D.B[b.type].range[b.tier] * TS;
        const e = nearestFoe(st, u, R / TS + 1);
        if (e && DIST(u, e) <= R + 16) shoot(st, u, e, dt, b);
        break;
      }
      case 'patrol': {
        const h = S.heart(st); if (!h) { u.task = null; break; }
        if (!t.wx || rnd(st) < dt * 0.05) { const a = rnd(st) * Math.PI * 2; t.wx = clamp(Math.round(h.x + 2 + Math.cos(a) * 7), 2, N - 3); t.wy = clamp(Math.round(h.y + 1 + Math.sin(a) * 6), 2, M - 3); }
        const r = goTo(st, u, rectT(t.wx, t.wy, true, true), dt); if (r !== 'moving') { u.anim = 'idle'; if (rnd(st) < dt * 0.3) u.task = null; }
        break;
      }
      case 'train': {
        const b = st.buildings[t.bid]; if (!b || S.isNight(st)) { u.task = null; break; }
        const r = goTo(st, u, rectB(b), dt); if (r === 'stuck') { u.task = null; break; } if (r !== 'arrived') break;
        face(u, ctr(b.x + 0.5), ctr(b.y + 1)); u.anim = 'attack'; if (u.at > 0.9) u.at = 0;
        gainXp(st, u, 'combat', dt * 0.5);
        if (rnd(st) < dt * 0.02) u.task = null;
        break;
      }
      case 'rescue': {
        const p = st.units[t.uid]; if (!p || p.dead || p.downed <= 0) { u.task = null; break; }
        const r = goTo(st, u, rectT(tileOf(p.x), tileOf(p.y), true), dt, true);
        if (r === 'arrived' && DIST(u, p) < TS * 1.7) { u.anim = 'crouch'; t.w = (t.w || 0) + dt * (1 + skillOf(u, 'medic') * 0.2); if (t.w >= 3) { p.downed = 0; p.hp = Math.round(p.maxHp * 0.3); if (!p.injury) injure(st, p, true); note(st, u.name + ' pulled ' + p.name + ' back from the brink.', 'good'); gainXp(st, u, 'medic', 6); u.task = null; p.task = null; } }
        else if (r === 'stuck') u.task = null;
        break;
      }
      case 'leave': { // walking out on an expedition
        const r = goTo(st, u, rectT(t.x, t.y, true), dt);
        if (r === 'arrived' || r === 'stuck' || (t.time = (t.time || 0) + dt) > 50) { u.away = t.exp; u.task = null; u.x = ctr(t.x); u.y = ctr(t.y); }
        break;
      }
      case 'return': {
        const h = S.heart(st); if (!h) { u.task = null; break; }
        const r = goTo(st, u, rectB(h), dt); if (r !== 'moving') u.task = null;
        break;
      }
      default: u.task = null;
    }
  }
  function nearCamp(st, n, type) { return Object.values(st.buildings).some(b => b.type === type && b.state === 'done' && Math.hypot(b.x - n.x, b.y - n.y) < 12); }
  function deliver(st, u, dt) {
    const b = dropoff(st, u, u.carry.res);
    if (!b) { deposit(st, u); return; }
    const r = goTo(st, u, rectB(b), dt);
    if (r === 'arrived' || r === 'stuck') { deposit(st, u); if (u.task && !u.task.manual && rnd(st) < 0.5) u.task = null; }
  }
  function shoreTile(st, u) {
    const tx = tileOf(u.x), ty = tileOf(u.y); let best = null, bd = 1e9;
    const cs = costS(st);
    for (let y = Math.max(1, ty - 30); y < Math.min(M - 1, ty + 30); y++) for (let x = Math.max(1, tx - 30); x < Math.min(N - 1, tx + 30); x++) {
      const i = y * N + x; if (cs(i) < 0 || !st.fog[i] || (st._.badShore && st._.badShore.has(i))) continue;
      if (!(isWater(st, i + 1) || isWater(st, i - 1) || isWater(st, i + N) || isWater(st, i - N))) continue;
      const d = Math.hypot(x - tx, y - ty); if (d < bd) { bd = d; best = [x, y]; }
    }
    return best;
  }
  function removeNode(st, n) {
    delete st.nodes[n.id]; st._.nodeAt[n.y * N + n.x] = null;
    if (n.type === 'tree') st.deco.push({ k: 'stump', x: n.x, y: n.y });
    invalidatePaths(st);
  }
  function finishBuilding(st, b) {
    const B = D.B[b.type];
    if (b.up) { b.tier++; b.up = false; b.maxHp = B.hp[b.tier]; b.hp = b.maxHp; b.prog = 1; note(st, B.name[b.tier - 1] + ' upgraded to ' + B.name[b.tier] + '.', 'good'); ev(st, { type: 'built', id: b.id, up: true }); stamp(st, b, true); invalidatePaths(st);
      if (b.type === 'heart') { st.era = b.tier + 1; ev(st, { type: 'cine', id: 'era', era: st.era, bid: b.id }); note(st, 'The ' + D.ERAS[st.era - 1] + ' becomes a ' + D.ERAS[st.era] + '!', 'good'); }
    } else {
      b.state = 'done'; b.hp = b.maxHp; b.prog = 1; st.stats.built++;
      ev(st, { type: 'built', id: b.id });
      if (b.type === 'heart' && !st.flags.fireLit) { st.flags.fireLit = true; ev(st, { type: 'cine', id: 'fire', bid: b.id }); }
      if (b.type === 'wall' && !st.flags.firstWall) { st.flags.firstWall = true; ev(st, { type: 'cine', id: 'firstWall', bid: b.id }); }
      if (B.beds) for (const u of S.survivors(st)) if (!u.home) assignHome(st, u);
    }
    ev(st, { type: 'sfx', s: 'built' }); ev(st, { type: 'fx', fx: 'dust_cloud', x: ctr(b.x + b.w / 2), y: ctr(b.y + b.h) - 8 });
    if (B.reveal) reveal(st, Math.floor(b.x + b.w / 2), Math.floor(b.y + b.h / 2), B.reveal[b.tier] + (st.techs.watchfires ? 3 : 0));
    invalidatePaths(st);
  }
  function autoEquip(st, item) {
    const isW = !!D.WEAPON[item];
    const rank = it => isW ? D.WEAPON[it].dmg : D.ARMOR[it].def;
    const cand = S.survivors(st).filter(u => !u.away).sort((a, b) => (b.job === 'guard') - (a.job === 'guard') || b.skills.combat - a.skills.combat);
    for (const u of cand) { const cur = isW ? u.gear.w : u.gear.a; if (rank(item) > rank(cur)) { CMD.equip(st, { id: u.id, item }); note(st, u.name + ' takes the ' + (isW ? D.WEAPON[item] : D.ARMOR[item]).name.toLowerCase() + '.', 'info'); return; } }
  }

  // ---- Combat ---------------------------------------------------------------------------
  function chase(st, u, e, dt) {
    if (!u.path || (u.chaseT = (u.chaseT || 0) - dt) <= 0) { u.chaseT = 0.6; u.path = null; }
    const r = goTo(st, u, rectT(tileOf(e.x), tileOf(e.y), true), dt, true);
    if (r === 'arrived') { const dx = e.x - u.x, dy = e.y - u.y, d = Math.hypot(dx, dy) || 1; const s = (u.side === 'e' ? D.FOE[u.kind].spd : spd(u)) * 1.5 * dt; u.x += dx / d * Math.min(s, d - 12); u.y += dy / d * Math.min(s, d - 12); u.dir = Math.atan2(dy, dx); u.anim = 'run'; }
    if (r && r.block) { /* survivors never get blocks */ }
  }
  function survivorDmg(st, u) {
    const W = D.WEAPON[u.gear.w]; let d = W.dmg * (1 + skillOf(u, 'combat') * 0.06);
    if (S.has(st, 'barracks') && u.job === 'guard') d *= 1.2;
    if (u.injury && u.injury.weak) d *= 0.7;
    return d;
  }
  function attack(st, u, target, dt) {
    face(u, target.x, target.y);
    const W = u.side === 's' ? D.WEAPON[u.gear.w] : null;
    if (W && W.ranged) { shoot(st, u, target, dt, false); return; }
    if (u.swing > 0) { u.swing -= dt; if (u.swing <= 0) landHit(st, u, target); u.anim = 'attack'; return; }
    if (u.cd > 0) { if (u.anim === 'attack' && u.at > 0.6) u.anim = 'idle'; return; }
    const cd = u.side === 's' ? W.cd : D.FOE[u.kind].cd;
    u.cd = cd * (0.9 + rnd(st) * 0.2); u.swing = 0.32; u.anim = 'attack'; u.at = 0;
    ev(st, { type: 'sfx', s: 'swing', x: u.x, y: u.y });
  }
  function landHit(st, u, target) {
    if (!target || target.dead) return;
    const reach = u.side === 's' ? Math.max(0.9, D.WEAPON[u.gear.w].range) * TS + 14 : D.FOE[u.kind].range * TS + 16;
    if (target.side && DIST(u, target) > reach) return;
    let dmg = u.side === 's' ? survivorDmg(st, u) : D.FOE[u.kind].dmg * (1 + Math.max(0, S.day(st) - 3) * 0.025);
    const beast = u.side === 'e' ? D.FOE[u.kind].faction === 'beast' : (target.side === 'e' && D.FOE[target.kind].faction === 'beast');
    if (beast && inFirelight(st, u.side === 'e' ? u : target)) dmg *= u.side === 'e' ? 0.6 : 1.3;
    if (target.side) damageUnit(st, target, dmg, u, 'hit_slash');
    else damageBuilding(st, target, dmg * (u.side === 'e' ? D.FOE[u.kind].bdmg : 1), u);
  }
  function inFirelight(st, p) {
    const h = S.heart(st); if (!h || h.state !== 'done') return false;
    return Math.hypot(ctr(h.x + 2) - p.x, ctr(h.y + 1) - p.y) < D.B.heart.light[h.tier] * TS;
  }
  S.inFirelight = inFirelight;
  const WORK = { gather: 1, water: 1, hunt: 1, build: 1, repair: 1, farm: 1, craft: 1, study: 1, treat: 1, idle: 1, patrol: 1, train: 1, muster: 0 };
  S.pendingEnc = function (st) {
    const p = st.pending[0]; if (!p) return null;
    if (p.kind === 'stranger') return null;
    const x = st.exps.find(e => e.id === p.exp); if (!x) return null;
    const site = st.sites.find(s => s.id === x.site); const SD = D.SITE[site.type];
    return p.kind === 'road' ? D.ROAD[p.enc] : D.ENC[SD.enc[Math.min(SD.enc.length - 1, site.visits % SD.enc.length)]];
  };
  function shoot(st, u, target, dt, tower) {
    face(u, target.x, target.y);
    if (u.cd > 0) { if (u.anim === 'attack' && u.at > 0.6) u.anim = 'idle'; return; }
    let dmg, kind = 'arrow', cd;
    if (u.side === 's') {
      const W = D.WEAPON[u.gear.w];
      dmg = W.ranged ? survivorDmg(st, u) : 5 + skillOf(u, 'combat') * 0.6;  // unarmed tower guards throw stones/spears
      if (!W.ranged) kind = 'rock';
      if (tower) { dmg *= 1.2 * (st.techs.bowcraft ? 1.25 : 1); }
      cd = W.ranged ? W.cd : 1.6;
      if (tower && tower.type && D.B[tower.type].heavy) { dmg = 34 + skillOf(u, 'combat') * 2; cd = 2.8; kind = 'bolt'; }
      gainXp(st, u, 'combat', 0.6);
    } else { const F = D.FOE[u.kind]; dmg = F.dmg; kind = F.ranged; cd = F.cd; }
    u.cd = cd * (0.9 + rnd(st) * 0.2); u.anim = 'attack'; u.at = 0;
    st.proj.push({ x: u.x, y: u.y - 22 - (u.onTower ? 30 : 0), tid: target.id, tb: !target.side, dmg, kind, from: u.id, side: u.side, sp: kind === 'rock' ? 260 : 330, life: 3 });
    ev(st, { type: 'sfx', s: kind === 'dark' ? 'magic' : 'bow', x: u.x, y: u.y });
  }
  function projStep(st, dt) {
    for (let i = st.proj.length - 1; i >= 0; i--) {
      const p = st.proj[i]; p.life -= dt;
      const t = p.tb ? st.buildings[p.tid] : st.units[p.tid];
      if (!t || t.dead || p.life <= 0) { st.proj.splice(i, 1); continue; }
      const tx = p.tb ? ctr(t.x + t.w / 2) : t.x, ty = p.tb ? ctr(t.y + t.h / 2) : t.y - 18;
      const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
      if (d < 10) {
        st.proj.splice(i, 1);
        const src = st.units[p.from];
        if (p.tb) damageBuilding(st, t, p.dmg * 0.4, src);
        else damageUnit(st, t, p.dmg, src, p.kind === 'dark' ? 'dark_curse' : 'hit_pierce');
        continue;
      }
      p.x += dx / d * p.sp * dt; p.y += dy / d * p.sp * dt; p.a = Math.atan2(dy, dx);
    }
  }
  function damageUnit(st, t, dmg, src, fx) {
    if (t.dead || t.downed > 0 || t.inside) return;
    if (t.side === 's') { const A = D.ARMOR[t.gear.a]; dmg = Math.max(1, dmg - A.def * 0.7); }
    dmg = Math.round(dmg * (0.85 + rnd(st) * 0.3));
    t.hp -= dmg; t.hurtT = 0.18;
    ev(st, { type: 'hit', x: t.x, y: t.y - 20, dmg, fx: fx || 'hit', side: t.side });
    if (t.side === 'a') { t.flee = 4; t.fleeFrom = src ? { x: src.x, y: src.y } : null; }
    if (t.side === 'e' && src && src.side === 's') { if (!t.target || rnd(st) < 0.4) t.target = { u: src.id }; }
    if (t.side === 's' && src && !t.task) t.task = null;
    if (t.side === 's' && src && t.task && t.task.t !== 'fight' && isFighter(st, t)) { t.task = { t: 'fight', eid: src.id }; t.path = null; }
    if (t.hp <= 0) {
      if (t.side === 's') {
        if (!t.injury || rnd(st) < 0.5) injure(st, t, false);
        t.hp = 0; t.downed = 30; t.task = null; t.path = null; t.onTower = null; t.lastHit = src ? (D.FOE[src.kind] || { name: 'a wound' }).name : 'a wound';
        note(st, t.name + ' is down and bleeding!', 'bad'); ev(st, { type: 'sfx', s: 'down' });
      } else {
        t.dead = true; t.anim = 'die'; t.at = 0; t.path = null;
        if (t.side === 'e') {
          st.stats.kills++; if (src && src.side === 's') { src.kills = (src.kills || 0) + 1; gainXp(st, src, 'combat', 6); }
          if (t.carry) { st.res[t.lootRes || 'food'] += t.carry; clampRes(st); note(st, 'The stolen ' + (t.lootRes || 'supplies') + ' are recovered.', 'good'); }
          ev(st, { type: 'sfx', s: D.FOE[t.kind].boss ? 'boss_die' : 'ko' });
        }
      }
    } else if (t.side === 's' && dmg >= 8 && rnd(st) < 0.08) injure(st, t, false);
  }
  S.damageUnit = damageUnit;
  const INJ = [['Gashed arm', false, true, 18], ['Twisted ankle', true, false, 14], ['Cracked ribs', true, true, 30], ['Concussion', false, true, 20], ['Broken leg', true, false, 48]];
  function injure(st, u, severe) {
    const k = INJ[Math.min(INJ.length - 1, Math.floor(rnd(st) * (severe ? INJ.length : 3)))];
    u.injury = { name: k[0], slow: k[1], weak: k[2], t: k[3] * (st.techs.herbalism ? 0.7 : 1), max: k[3] };
    note(st, u.name + ': ' + k[0].toLowerCase() + '.', 'bad');
  }
  S.injure = injure;
  function killSurvivor(st, u, cause) {
    u.dead = true; u.anim = 'die'; u.at = 0; u.downed = 0; st.stats.deaths++; st.morale.death = Math.min(30, st.morale.death + 14);
    if (u.gear.w !== 'none') st.items[u.gear.w] = (st.items[u.gear.w] || 0) + 1;
    if (u.gear.a !== 'none') st.items[u.gear.a] = (st.items[u.gear.a] || 0) + 1;
    st.graves.push({ name: u.name, day: S.day(st), cause, x: tileOf(u.x), y: tileOf(u.y) });
    note(st, u.name + ' is dead. (' + cause + ')', 'bad'); ev(st, { type: 'death', uid: u.id, name: u.name }); ev(st, { type: 'sfx', s: 'death' });
  }
  S.killSurvivor = killSurvivor;
  function damageBuilding(st, b, dmg, src) {
    if (!b || b.state === 'ruin' || !st.buildings[b.id]) return;
    b.hp -= dmg; b.hitT = 0.15;
    ev(st, { type: 'bhit', id: b.id, x: ctr(b.x + b.w / 2) + (rnd(st) - 0.5) * b.w * 20, y: ctr(b.y + b.h / 2) - 10 });
    // Raiders loot stores instead of only smashing them.
    if (src && src.side === 'e' && D.FOE[src.kind].loot && (b.type === 'stockpile' || b.type === 'heart') && b.state === 'done' && src.carry < 30) {
      const pick = ['food', 'wood', 'stone', 'metal'].filter(r => st.res[r] > 4);
      if (pick.length) { const r = rpick(st, pick), amt = Math.min(10, st.res[r]); st.res[r] -= amt; src.carry += amt; src.lootRes = r; if (src.carry >= 20) { src.flee = true; src.path = null; note(st, 'A raider is running off with our ' + r + '!', 'warn'); } }
    }
    if (b.hp <= 0) {
      ev(st, { type: 'sfx', s: 'collapse' }); ev(st, { type: 'fx', fx: 'smoke_burst', x: ctr(b.x + b.w / 2), y: ctr(b.y + b.h) - 10 });
      const B = D.B[b.type];
      if (b.type === 'heart') { b.hp = 1; b.state = 'done'; note(st, 'The ' + B.name[b.tier] + ' is burning! Defend it!', 'bad'); return; }
      note(st, B.name[b.tier] + ' was destroyed.', 'bad');
      st.deco.push({ k: 'rubble', x: b.x + (b.w >> 1), y: b.y + b.h - 1 });
      removeBuilding(st, b);
    }
  }
  S.damageBuilding = damageBuilding;

  // ---- Enemy AI -------------------------------------------------------------------------
  function foeStep(st, e, dt) {
    const F = D.FOE[e.kind];
    if (e.cd > 0) e.cd -= dt;
    reveal(st, tileOf(e.x), tileOf(e.y), 1);
    // Night creatures slink away at dawn; looters run for the edge.
    if (F.faction === 'beast' && !S.isNight(st) && S.hour(st) > 6) e.flee = true;
    if (!e.flee && !F.boss && st.hours - e.born > 9) { e.flee = true; e.path = null; }   // a raid does not last forever
    // Stuck (no reachable target): pick the nearest structure, then give up and leave.
    if (!e.flee && (e.stuckT = (e.stuckT || 0) + dt) > 5) { e.stuckT = 0; const moved = Math.hypot(e.x - e.px, e.y - e.py); e.px = e.x; e.py = e.y; if (moved < 10 && e.anim !== 'attack' && !e.swing) { e.stuckN++; e.target = nearestStructure(st, e); e.path = null; if (e.stuckN > 3) { e.flee = true; } } else e.stuckN = 0; }
    if (e.flee) {
      if (!e.fleeTo) { const a = Math.atan2(e.y - M * TS / 2, e.x - N * TS / 2); e.fleeTo = { x: clamp(Math.round(N / 2 + Math.cos(a) * N * 0.6), 0, N - 1), y: clamp(Math.round(M / 2 + Math.sin(a) * M * 0.6), 0, M - 1) }; }
      const r = goTo(st, e, rectT(e.fleeTo.x, e.fleeTo.y, true, true), dt, true);
      const tx = tileOf(e.x), ty = tileOf(e.y);
      if (r === 'stuck' || tx <= 1 || ty <= 1 || tx >= N - 2 || ty >= M - 2 || (r === 'arrived')) { if (e.carry) note(st, 'The raider escaped with ' + e.carry + ' ' + (e.lootRes || 'supplies') + '.', 'bad'); delete st.units[e.id]; }
      if (r && r.block) { attackBuilding(st, e, r.block, dt); }
      return;
    }
    if (e.swing > 0) { e.swing -= dt; if (e.swing <= 0) { const t = e.target && (e.target.u ? st.units[e.target.u] : st.buildings[e.target.b]); if (t) landHit(st, e, t); } e.anim = 'attack'; return; }
    // Pick a target now and then.
    if ((e.retarget -= dt) <= 0 || !validTarget(st, e)) { e.retarget = 1.2 + rnd(st); e.target = chooseTarget(st, e); e.path = null; }
    let t = e.target && (e.target.u ? st.units[e.target.u] : st.buildings[e.target.b]);
    if (t && e.target.u && t.onTower && !F.ranged && st.buildings[t.onTower]) { e.target = { b: t.onTower }; t = st.buildings[t.onTower]; e.path = null; }
    if (!t) { e.anim = 'idle'; return; }
    if (e.target.u) {
      const range = F.range * TS + (F.ranged ? 0 : 6);
      if (DIST(e, t) <= range && (!F.ranged || true)) { if (F.ranged) shoot(st, e, t, dt, false); else attack(st, e, t, dt); return; }
      if ((e.chaseT = (e.chaseT || 0) - dt) <= 0) { e.chaseT = 0.7; e.path = null; }
      const r = goTo(st, e, rectT(tileOf(t.x), tileOf(t.y), true), dt, F.faction === 'beast');
      if (r && r.block) attackBuilding(st, e, r.block, dt);
      else if (r === 'arrived' && DIST(e, t) > range) { const dx = t.x - e.x, dy = t.y - e.y, d = Math.hypot(dx, dy) || 1; e.x += dx / d * F.spd * dt; e.y += dy / d * F.spd * dt; e.dir = Math.atan2(dy, dx); e.anim = 'walk'; }
      else if (r === 'stuck') e.target = null;
    } else {
      const b = t;
      if (F.ranged) { const d = Math.hypot(ctr(b.x + b.w / 2) - e.x, ctr(b.y + b.h / 2) - e.y); if (d < F.range * TS) { shoot(st, e, b, dt, false); return; } }
      const r = goTo(st, e, rectB(b), dt);
      if (r && r.block) attackBuilding(st, e, r.block, dt);
      else if (r === 'arrived') attackBuilding(st, e, b, dt);
      else if (r === 'stuck') e.target = null;
    }
  }
  function nearestStructure(st, e) { let best = null, bd = 1e9; for (const b of Object.values(st.buildings)) { const d = Math.hypot(ctr(b.x + b.w / 2) - e.x, ctr(b.y + b.h / 2) - e.y); if (d < bd) { bd = d; best = b; } } return best ? { b: best.id } : null; }
  function attackBuilding(st, e, b, dt) {
    e.target = { b: b.id }; face(e, ctr(b.x + b.w / 2), ctr(b.y + b.h / 2));
    if (e.cd > 0) { if (e.anim === 'attack' && e.at > 0.6) e.anim = 'idle'; return; }
    e.cd = D.FOE[e.kind].cd * (0.9 + rnd(st) * 0.2); e.swing = 0.35; e.anim = 'attack'; e.at = 0;
    ev(st, { type: 'sfx', s: 'swing', x: e.x, y: e.y });
  }
  function validTarget(st, e) {
    if (!e.target) return false;
    if (e.target.u) { const u = st.units[e.target.u]; return u && !u.dead && !u.inside && !(u.downed > 0) && !u.away; }
    return !!st.buildings[e.target.b];
  }
  function chooseTarget(st, e) {
    const F = D.FOE[e.kind];
    let best = null, bd = 1e9;
    const aggro = (F.faction === 'beast' ? 14 : 7) * TS;
    for (const u of S.present(st)) {
      if (u.inside || u.downed > 0 || u.away) continue;
      const d = DIST(u, e) - (u.onTower ? -60 : 0); if (d < bd && d < aggro) { bd = d; best = { u: u.id }; }
    }
    if (best) return best;
    // Buildings: raiders want the stores; beasts and the dead want people inside shelters.
    bd = 1e9;
    for (const b of Object.values(st.buildings)) {
      if (b.wall) continue;
      let d = Math.hypot(ctr(b.x + b.w / 2) - e.x, ctr(b.y + b.h / 2) - e.y);
      if (F.loot && (b.type === 'stockpile' || b.type === 'heart')) d *= 0.6;
      if (F.faction !== 'raider' && D.B[b.type].beds) d *= 0.7;
      if (d < bd) { bd = d; best = { b: b.id }; }
    }
    if (best) return best;
    const anyone = S.present(st).filter(u => !u.inside && !(u.downed > 0)).sort((a, b) => DIST(a, e) - DIST(b, e))[0];
    return anyone ? { u: anyone.id } : null;
  }

  // ---- Animals --------------------------------------------------------------------------
  function animalStep(st, a, dt) {
    if (a.flee > 0) a.flee -= dt;
    const threat = S.present(st).find(u => !u.inside && DIST(u, a) < TS * (a.kind === 'deer' ? 5 : 3.5));
    if (threat && !a.flee) { a.flee = 3; a.fleeFrom = { x: threat.x, y: threat.y }; a.path = null; }
    if (a.flee > 0 && a.fleeFrom) {
      if (!a.path || !a.path.length) { const ang = Math.atan2(a.y - a.fleeFrom.y, a.x - a.fleeFrom.x) + (rnd(st) - 0.5); const tx = clamp(Math.round(tileOf(a.x) + Math.cos(ang) * 6), 1, N - 2), ty = clamp(Math.round(tileOf(a.y) + Math.sin(ang) * 6), 1, M - 2); a.goal = [tx, ty]; a.path = null; }
      const r = goTo(st, a, rectT(a.goal[0], a.goal[1], true, true), dt, true); if (r !== 'moving') a.path = null;
      return;
    }
    if (!a.goal || (a.wander -= dt) <= 0) { a.wander = 4 + rnd(st) * 8; const tx = clamp(tileOf(a.x) + rint(st, -5, 5), 1, N - 2), ty = clamp(tileOf(a.y) + rint(st, -5, 5), 1, M - 2); a.goal = [tx, ty]; a.path = null; a.rest = rnd(st) < 0.5; }
    if (a.rest) { a.anim = 'idle'; return; }
    const r = goTo(st, a, rectT(a.goal[0], a.goal[1], true, true), dt); if (r !== 'moving') { a.anim = 'idle'; a.rest = true; }
  }

  // Keep units from stacking on one spot.
  function separate(st) {
    const arr = []; for (const id in st.units) { const u = st.units[id]; if (!u.dead && !u.inside && !u.away && !u.onTower && u.side !== 'a') arr.push(u); }
    const cs = costS(st);
    for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) {
      const a = arr[i], b = arr[j]; const dx = b.x - a.x, dy = b.y - a.y; const d2 = dx * dx + dy * dy;
      if (d2 > 0.01 && d2 < 144) { const d = Math.sqrt(d2), push = (12 - d) * 0.25; const nx = dx / d * push, ny = dy / d * push;
        const ok = (u, x, y) => cs(tileOf(y) * N + tileOf(x)) >= 0;
        if (ok(a, a.x - nx, a.y - ny)) { a.x -= nx; a.y -= ny; } if (ok(b, b.x + nx, b.y + ny)) { b.x += nx; b.y += ny; } }
    }
  }

  // ---- Strangers ------------------------------------------------------------------------
  function strangerStep(st, u, dt) {
    const h = S.heart(st); const c = h ? { x: h.x + 2, y: h.y + h.h } : (st.camp || st.clearing);
    const r = goTo(st, u, rectT(c.x, c.y + 1, true, true), dt);
    if (r === 'arrived' || r === 'stuck') { u.anim = 'idle'; if (!u.asked) { u.asked = true; st.pending.push({ kind: 'stranger', uid: u.id }); ev(st, { type: 'modal' }); } }
  }

  // ---- Expeditions ----------------------------------------------------------------------
  S.siteName = s => D.SITE_NAMES[s.id] || D.SITE[s.type].name;
  S.supplyNeed = (st, site, n) => Math.ceil(n * site.dist * D.HOURS_PER_LEAGUE * 2 / 24 * 1.5) + 1;
  function startExpedition(st, siteId, ids, food) {
    const site = st.sites.find(s => s.id === siteId); if (!site || !site.known) return fail('Unknown place');
    const S2 = D.SITE[site.type]; if (S2.locked && st.era < S2.locked) return fail('You are not ready for this place');
    if (st.exps.some(x => x.site === siteId)) return fail('A party is already headed there');
    const party = ids.map(id => st.units[id]).filter(u => u && u.side === 's' && !u.away && !u.dead && !(u.downed > 0));
    if (!party.length) return fail('Choose who goes');
    if (party.length >= S.present(st).length) return fail('Someone must stay behind');
    food = Math.max(0, Math.min(food | 0, st.res.food));
    st.res.food -= food;
    const ang = site.dir * Math.PI / 180;
    const p = edgePoint(st, ang, 2) || { x: ctr(2), y: ctr(2) };
    const ex = { id: nid(st, 'x'), site: siteId, party: party.map(u => u.id), food, phase: 'leave', t: 0, ex: tileOf(p.x), ey: tileOf(p.y), loot: {}, recruits: 0, log: [], hurt: [], dead: [], relic: null };
    for (const u of party) { if (u.inside) exitBuilding(st, u); u.task = { t: 'leave', exp: ex.id, x: ex.ex, y: ex.ey }; u.post = null; u.onTower = null; u.path = null; }
    st.exps.push(ex); st.stats.expeditions++;
    note(st, party.map(u => u.name.split(' ')[0]).join(', ') + ' set out for ' + S.siteName(site) + '.', 'info');
    done(st, 'expedition');
    ev(st, { type: 'sfx', s: 'confirm' });
    return { ok: true };
  }
  function expeditionStep(st, dt) {
    for (let i = st.exps.length - 1; i >= 0; i--) {
      const x = st.exps[i]; const site = st.sites.find(s => s.id === x.site);
      const party = x.party.map(id => st.units[id]).filter(u => u && !u.dead);
      if (x.phase === 'leave') {
        if (party.every(u => u.away)) { x.phase = 'out'; x.t = site.dist * D.HOURS_PER_LEAGUE; x.road = rnd(st) < 0.35 ? x.t * 0.5 : -1; }
        continue;
      }
      if (x.phase === 'out' || x.phase === 'back') {
        x.t -= dt / HOUR;
        // Rations on the road.
        x.eat = (x.eat || 0) + dt / HOUR * party.length / 24;
        if (x.eat >= 1) { x.eat -= 1; if (x.food > 0) x.food--; else { x.hungry = true; for (const u of party) u.hp = Math.max(5, u.hp - 4); } }
        if (x.phase === 'out' && x.road > 0 && x.t <= x.road) { x.road = -1; st.pending.push({ kind: 'road', exp: x.id, enc: Math.floor(rnd(st) * D.ROAD.length) }); ev(st, { type: 'modal' }); return; }
        if (x.t <= 0) {
          if (x.phase === 'out') { st.pending.push({ kind: 'site', exp: x.id }); ev(st, { type: 'modal' }); x.phase = 'site'; return; }
          // Home: they walk back in from the edge.
          returnHome(st, x, party); st.exps.splice(i, 1);
        }
      }
    }
  }
  function partyScore(st, party, skill) {
    if (!party.length) return 0;
    const v = party.map(u => skillOf(u, skill) + (skill === 'combat' ? D.WEAPON[u.gear.w].dmg / 8 + D.ARMOR[u.gear.a].def / 4 : 0) + u.morale / 60);
    v.sort((a, b) => b - a);
    return v[0] + v.slice(1).reduce((a, b) => a + b * 0.35, 0);
  }
  S.partyScore = partyScore;
  S.chance = (st, party, ch) => ch.check ? clamp(0.5 + (partyScore(st, party, ch.check) - ch.diff) * 0.12, 0.1, 0.95) : 1;
  function choosePending(st, choice) {
    const p = st.pending[0]; if (!p) return fail('Nothing to decide');
    if (p.kind === 'stranger') {
      const u = st.units[p.uid]; st.pending.shift();
      if (!u) return { ok: true };
      if (choice === 0) { u.stranger = false; u.task = null; st.stats.recruited++; assignHome(st, u); note(st, u.name + ' joins the camp.', 'good'); ev(st, { type: 'sfx', s: 'reward' }); done(st, 'stranger'); }
      else { u.stranger = false; u.leaving = true; delete st.units[u.id]; note(st, 'The stranger walks back into the trees.', 'info'); done(st, 'stranger'); }
      return { ok: true };
    }
    const x = st.exps.find(e => e.id === p.exp); if (!x) { st.pending.shift(); return { ok: true }; }
    const site = st.sites.find(s => s.id === x.site); const SD = D.SITE[site.type];
    const party = x.party.map(id => st.units[id]).filter(u => u && !u.dead);
    const enc = p.kind === 'road' ? D.ROAD[p.enc] : D.ENC[p.enc || SD.enc[Math.min(SD.enc.length - 1, site.visits % SD.enc.length)]];
    const ch = enc.choices[choice]; if (!ch) return fail('No such choice');
    if (ch.trade && !S.canAfford(st, ch.trade.give)) return fail('You cannot afford that');
    if (ch.cost && !S.canAfford(st, ch.cost)) return fail('You cannot afford that');
    st.pending.shift();
    const okRoll = rnd(st) < S.chance(st, party, ch);
    const out = okRoll || !ch.fail ? ch.ok : ch.fail;
    const res = { title: enc.title, text: out.text, ok: okRoll || !ch.check, loot: {}, hurt: [], dead: [], recruits: 0, relic: null, reveal: [] };
    if (ch.trade) { pay(st, ch.trade.give); for (const k in ch.trade.get) { x.loot[k] = (x.loot[k] || 0) + ch.trade.get[k]; res.loot[k] = ch.trade.get[k]; } }
    if (ch.cost) pay(st, ch.cost);
    if (p.kind === 'site') {
      const mult = (out.loot != null ? out.loot : 1) * (site.visits ? 0.5 : 1);
      for (const k in SD.loot) { const v = Math.round(SD.loot[k] * mult * (0.8 + rnd(st) * 0.4)); if (v > 0) { x.loot[k] = (x.loot[k] || 0) + v; res.loot[k] = (res.loot[k] || 0) + v; } }
      site.visits++;
    }
    if (out.extra) for (const k in out.extra) { x.loot[k] = (x.loot[k] || 0) + out.extra[k]; res.loot[k] = (res.loot[k] || 0) + out.extra[k]; }
    if (out.lose) { const l = Math.floor(x.food * out.lose); x.food -= l; res.lostFood = l; }
    if (out.delay) x.t += out.delay;
    const danger = SD.danger;
    for (const u of party) {
      if (out.kill && rnd(st) < out.kill * (1.2 - Math.min(0.6, partyScore(st, [u], 'combat') / 20))) { res.dead.push(u.name); x.dead.push(u.name); u.away = null; killSurvivor(st, u, 'lost at ' + S.siteName(site)); continue; }
      if (out.hurt && rnd(st) < out.hurt) { u.hp = Math.max(5, u.hp - 10 - danger * 6); if (rnd(st) < 0.5 + danger * 0.08) injure(st, u, danger >= 4); res.hurt.push(u.name); x.hurt.push(u.name); }
      gainXp(st, u, 'scout', 6 + danger * 2); if (ch.check) gainXp(st, u, ch.check, 4 + danger);
    }
    x.party = party.filter(u => !u.dead).map(u => u.id);
    if (out.recruit) { x.recruits += out.recruit; res.recruits = out.recruit; }
    if (out.relic && !st.relics[out.relic]) { x.relic = out.relic; res.relic = out.relic; }
    if (out.reveal) res.reveal = revealSites(st, site, out.reveal);
    if (SD.reveal && p.kind === 'site' && site.visits === 1 && okRoll) res.reveal = res.reveal.concat(revealSites(st, site, 1));
    if (out.clear) { site.cleared = true; if (out.clear === 'beast') st.threat.beastCalm = S.day(st) + 6; else st.threat.raiderCalm = S.day(st) + 6; }
    if (out.rep) st.mill += out.rep;
    if (p.kind === 'site' && site.visits === 1 && !out.reveal) res.reveal = res.reveal.concat(revealSites(st, site, 1));
    x.log.push(res); st.lastResult = res;
    ev(st, { type: 'result', res });
    if (!x.party.length) { st.exps.splice(st.exps.indexOf(x), 1); note(st, 'The expedition to ' + S.siteName(site) + ' never came home.', 'bad'); return { ok: true, res }; }
    if (p.kind === 'site') { x.phase = 'back'; x.t = site.dist * D.HOURS_PER_LEAGUE; }
    return { ok: true, res };
  }
  function revealSites(st, from, n) {
    const out = [];
    const cand = st.sites.filter(s => !s.known).sort((a, b) => Math.abs(a.dist - from.dist) + Math.abs(((a.dir - from.dir + 540) % 360) - 180) / 60 - (Math.abs(b.dist - from.dist) + Math.abs(((b.dir - from.dir + 540) % 360) - 180) / 60));
    for (const s of cand.slice(0, n)) { s.known = true; out.push(S.siteName(s)); }
    if (out.length) note(st, 'New places found: ' + out.join(', ') + '.', 'good');
    return out;
  }
  function returnHome(st, x, party) {
    const site = st.sites.find(s => s.id === x.site);
    const pts = { x: ctr(x.ex), y: ctr(x.ey) };
    for (const u of party) { u.away = null; u.x = pts.x + (rnd(st) - 0.5) * 30; u.y = pts.y + (rnd(st) - 0.5) * 30; u.task = { t: 'return' }; u.path = null; }
    const newbies = [];
    for (let k = 0; k < x.recruits; k++) { const nu = makeSurvivor(st, { x: pts.x + (rnd(st) - 0.5) * 40, y: pts.y + (rnd(st) - 0.5) * 40 }); nu.task = { t: 'return' }; newbies.push(nu.name); st.stats.recruited++; assignHome(st, nu); }
    const got = [];
    for (const k in x.loot) { const b = st.res[k]; st.res[k] += x.loot[k]; clampRes(st); const g = Math.round(st.res[k] - b); if (g > 0) got.push(g + ' ' + k); }
    st.res.food += x.food; clampRes(st);
    if (x.relic) { st.relics[x.relic] = true; note(st, 'Recovered: ' + D.RELICS[x.relic].name + '!', 'good'); }
    note(st, 'The party is back from ' + S.siteName(site) + (got.length ? ' with ' + got.join(', ') : '') + (newbies.length ? '. New faces: ' + newbies.join(', ') : '') + '.', 'good');
    ev(st, { type: 'home', exp: x, recruits: newbies, got }); ev(st, { type: 'sfx', s: 'reward' });
    checkObjectives(st);
  }

  // ---- Save / load ----------------------------------------------------------------------
  const rle = arr => { let out = [], prev = arr[0], n = 0; for (const v of arr) { if (v === prev) n++; else { out.push(prev, n); prev = v; n = 1; } } out.push(prev, n); return out; };
  const unrle = (r) => { const out = []; for (let i = 0; i < r.length; i += 2) for (let k = 0; k < r[i + 1]; k++) out.push(r[i]); return out; };
  S.save = function (st) {
    const o = Object.assign({}, st); delete o._;
    o.terrain = rle(st.terrain); o.fog = rle(st.fog); o.wear = rle(st.wear.map(v => Math.round(v))); o.decoBlock = rle(st.decoBlock);
    o.units = {}; for (const id in st.units) { const u = Object.assign({}, st.units[id]); u.path = null; o.units[id] = u; }
    return JSON.stringify(o);
  };
  S.load = function (str) {
    const o = JSON.parse(str);
    o.terrain = unrle(o.terrain); o.fog = unrle(o.fog); o.wear = unrle(o.wear); o.decoBlock = unrle(o.decoBlock);
    for (const id in o.units) { const u = o.units[id]; u.path = null; if (u.task && (u.task.t === 'leave')) { /* keep */ } else if (u.task && !u.task.manual) u.task = null; u.onTower = null; }
    rebuild(o);
    return o;
  };
})(typeof window !== 'undefined' ? window : globalThis);
