// Bannerborn — more ways to fight. Loaded after structures.js; pure logic (it runs in Node).
//   survive      a stage type: no gate to break and no last wave. The dead come from every side, faster as the time
//                runs down, with a last surge; hold out until it ends.
//   expeditions  a long march through several fields in a row, the same heroes carried from one to the next with the
//                wounds they took. After a field the road forks and each way gives a clue: one leads on toward the
//                way out, the other to a side road (a cache, a shrine, or an ambush) and back. The last field is
//                guarded; beyond it is the way out.
(function () {
  const BB = (typeof window !== 'undefined' ? window : globalThis).BB, Battle = BB.Battle;

  // ---------------------------------------------------------------- survive
  const setup0 = Battle.prototype.setupObjective, update0 = Battle.prototype.updateObjective;
  Battle.prototype.setupObjective = function () {
    setup0.call(this);
    if (this.mission.type === 'survive') { const o = this.obj; o.time = o.timeLeft = this.mission.time || 60; o.nextWaveT = 1.5; o.n = 0; o.text = 'Hold out'; }
  };
  Battle.prototype.updateObjective = function (dt) {
    const o = this.obj;
    if (o && !this.result && o.type === 'survive') {
      o.timeLeft -= dt; o.nextWaveT -= dt;
      const k = 1 - Math.max(0, o.timeLeft) / o.time, foes = this.foesAlive().filter((f) => !f.gate && !f.turret).length, cap = BB.teamK('cap', this.teamN) + 2 + Math.round(k * 3), W = this.mission.waves, sp = this.map.foeSpawns;
      const send = () => { const w = W[o.n % W.length].slice(); for (let i = 1; i < w.length; i += 2) w[i] = Math.max(1, Math.round(w[i] * (1 + k * 0.6))); this.spawnWave(w, [sp[o.n % sp.length]]); if (this.onWave) this.onWave(); o.n++; }; // each from another side, and more of them as it goes
      if (o.timeLeft > 4 && o.nextWaveT <= 0 && foes < cap) { send(); o.nextWaveT = (10 - k * 3) * Math.sqrt(BB.teamK('wait', this.teamN)); }
      if (!o.surged && o.timeLeft <= 15 && o.time > 30) { o.surged = true; this.banner('THE LAST SURGE', 1.6); send(); if (this.teamN > 2) send(); o.nextWaveT = 6; }
      o.text = 'Hold out — ' + Math.max(0, Math.ceil(o.timeLeft)) + ' s';
      if (o.timeLeft <= 0) { this.crumbleAll(); this.win(); return; }
    }
    update0.call(this, dt);
  };

  // ---------------------------------------------------------------- expeditions
  BB.TREK = {
    heal: 0.15, carried: 0.25, // what a field's rest mends; what a fallen hero comes back with
    way: ['A cold draught comes from this way.', 'Old cart ruts run on this way.', 'The birds are flying this way.', 'The ground climbs toward open sky.'],
    side: { cache: ['Something glints in the dark.', 'A cart lies overturned down there.'], shrine: ['A lantern still burns down there.', 'You can hear running water.'], ambush: ['Fresh tracks. Many of them.', 'It is very quiet this way.'] },
    name: { road: ['The Long Road', 'The Broken Mile', 'Through the Deadfall'], hold: ['Hold the Crossing'], guard: ['The Way Out'], cache: ['A Buried Cache'], shrine: ['A Wayside Shrine'], ambush: ['Ambush!'] },
    defs: { road: [['nest'], ['ballista', 'watchtower'], ['cage', 'mortar'], ['nest', 'ballista'], ['obelisk', 'ballista']], guard: [['nest', 'ballista']], ambush: [['nest', 'cage']], cache: [['watchtower']], shrine: [[]], hold: [[]] },
  };
  // the plan of one expedition: the fields on the way (the last is guarded), and where the road forks to a side field
  BB.trekPlan = function (chapter, level, seed, teamN) {
    const r = BB.rng(seed || 1), T = BB.TREK, pool = BB.MISSIONS.filter((m) => m.chapter === chapter && /^(rout|gates|survive)$/.test(m.type)), ch = BB.CHAPTERS[chapter - 1];
    const leg = (kind, i) => {
      const src = r.pick(pool), type = kind === 'hold' ? 'survive' : kind === 'road' && src.type === 'gates' ? 'gates' : 'rout';
      let waves = src.waves.map((w) => w.slice()); if (kind === 'guard' || kind === 'ambush') waves = waves.concat(r.pick(pool).waves.slice(0, 2).map((w) => w.slice())); if (kind === 'shrine') waves = waves.slice(0, 1); if (kind === 'cache') waves = waves.slice(0, 3);
      const defs = r.pick(T.defs[kind]).slice(0, (teamN || 5) <= 2 ? 1 : 2);
      return { id: 'trek', code: '', name: r.pick(T.name[kind]), type, layout: src.layout, waves, gates: type === 'gates' ? src.gates || 1 : undefined, time: 45, chapter, region: 'c' + chapter, level: level + Math.floor(i * 0.7) + (kind === 'ambush' ? 1 : 0), elites: (ch.elites || 0) + (kind === 'guard' || kind === 'ambush' ? 1 : 0), defs, trek: kind };
    };
    const kinds = ['road', 'road', 'hold', 'road', 'guard'], legs = kinds.map((k, i) => leg(k, i));
    const sides = ['cache', 'shrine', 'ambush'], at = [0, 1, 2, 3]; at.splice(r.int(4), 1); // three of the four forks have a side road
    const forks = {}; at.forEach((i, n) => { const kind = sides[(n + r.int(3)) % 3], onLeft = r() < 0.5; forks[i] = { kind, leg: leg(kind, i), clueWay: r.pick(T.way), clueSide: r.pick(T.side[kind]), onLeft }; });
    { const seen = {}; for (const i of at) { let f = forks[i], g = 0; while (seen[f.kind] && g++ < 3) { f.kind = sides[(sides.indexOf(f.kind) + 1) % 3]; f.leg = leg(f.kind, i); f.clueSide = r.pick(T.side[f.kind]); } seen[f.kind] = 1; } } // one of each
    return { chapter, level, legs, forks };
  };
  // the team as the last field left it, brought into the next
  BB.trekCarryOut = function (sc) { const c = {}; for (const e of sc.heroList) c[e.hero.id] = { f: e.dead ? 0 : Math.max(0, e.hp / e.maxhp), en: e.energy || 0 }; return c; };
  BB.trekCarryIn = function (sc, carry) {
    if (!carry) return; const T = BB.TREK;
    for (const e of sc.heroList) { const c = carry[e.hero.id]; if (!c) continue; e.hp = Math.max(1, Math.round(e.maxhp * Math.min(1, (c.f > 0 ? c.f : T.carried) + T.heal))); e.energy = Math.min(100, c.en || 0); }
  };
})();
