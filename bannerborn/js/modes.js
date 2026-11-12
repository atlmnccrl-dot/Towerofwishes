// Bannerborn — more ways to fight. Loaded after structures.js; pure logic (it runs in Node).
//   survive      a stage type: no gate to break and no last wave. The dead come from every side, faster as the time
//                runs down, with a last surge; hold out until it ends.
//   expedition   one long fight on one great map (layout 'road' in world.js): a road that winds from one corner to
//                the other, cut by three gates. The warband marches the road on its own and meets what is set along
//                it: an ambush springs when they come near, works of the dead stand where the road narrows. A gate
//                opens only when everything on its side of it has fallen. At each gate the player chooses (rest or
//                press on, break a vault or leave it, how to face the last guard): safer, or richer and harder.
//                Beyond the third gate the land's lord guards the way out.
(function () {
  const BB = (typeof window !== 'undefined' ? window : globalThis).BB, Battle = BB.Battle, hyp = Math.hypot;

  const setup0 = Battle.prototype.setupObjective, update0 = Battle.prototype.updateObjective;
  const resort = (m) => { for (const p of m.props) if (p.depth === undefined) { const q = BB.iso(p.x, p.y); p.depth = p.x + p.y; p.sx = q.x; p.sy = q.y; } m.props.sort((a, b) => a.depth - b.depth); if (BB.rebuildGrid) BB.rebuildGrid(m); };
  Battle.prototype.setupObjective = function () {
    setup0.call(this);
    const M = this.mission, o = this.obj;
    if (M.type === 'survive') { o.time = o.timeLeft = M.time || 60; o.nextWaveT = 1.5; o.n = 0; o.text = 'Hold out'; }
    if (M.type === 'expedition' && this.map.trek) {
      const T = this.map.trek; Object.assign(o, { sec: 0, i: 0, greed: 0, caches: 0, horn: false, opened: false, gatesOpen: 0, lord: null, text: 'The long road' });
      T.gates.forEach((G, gi) => { for (let x = G.x0; x <= G.x1; x++) this.map.add('Stakes', x + 0.5, G.y, { biome: 'craft', r: 0.55, gate: gi }); if (G.x0 > 2) this.map.add('Dead Banner', G.x0 - 0.2, G.y - 0.4, { biome: 'craft', r: 0.04, gate: gi }); });
      resort(this.map); this.trekWorks(0);
    }
  };
  // what the dead have built in a part of the road stands from the moment the warband enters it
  Battle.prototype.trekWorks = function (sec) {
    for (const s of this.map.trek.works) if (s.s === sec && BB.FOES[s.kind]) { const e = this.spawnFoe(s.kind, s.x, s.y, {}); e.cd = 3 + this.r() * 2; e.phase = this.r() * 6.28; if (s.kind === 'cage') e.budget = 3; }
  };
  Battle.prototype.openGate = function (gi) {
    const m = this.map, o = this.obj, gone = m.props.filter((p) => p.gate === gi);
    m.props = m.props.filter((p) => p.gate !== gi); if (BB.rebuildGrid) BB.rebuildGrid(m);
    for (const p of gone) this.addFx('x_wood', p.x, p.y - 0.2, { sc: 0.9 });
    o.gatesOpen++; this.shake = Math.max(this.shake || 0, 0.5);
    { const sr = BB.workRank ? BB.workRank(this.save || BB.save, 'shrine') : 0; if (sr) for (const h of this.heroesAlive()) this.heal(null, h, h.maxhp * 0.06 * sr); } this.banner('THE GATE OPENS', 1.6); if (BB.sfx) BB.sfx('gate');
    if (this.march) this.march.path = null;
  };
  const CHOICES = [
    (B) => ({ title: 'A wayside shrine', text: 'The first gate is down and the dead beyond it have not yet turned. A shrine stands by the road.', opts: [
      { label: 'Rest', hint: 'Everyone is mended by two fifths.', fn() { for (const h of B.heroesAlive()) B.heal(null, h, h.maxhp * 0.4); } },
      { label: 'Press on', hint: 'No rest. The dead ahead are a level stronger, and the spoils a quarter richer.', fn() { B.obj.greed++; B.level++; } }] }),
    (B) => ({ title: 'A sealed vault', text: 'Cut into the bank beside the second gate: a door of black stone, and a seal of bone on it.', opts: [
      { label: 'Break the seal', hint: 'Its guards wake. Beat them and what it holds is yours.', fn() { B.obj.caches++; const g = B.map.trek.gates[1], w = B.mission.waves[B.mission.waves.length - 1].slice(); const el = B.mission.elites; B.mission.elites = (el || 0) + 2; B.spawnWave(w, [{ x: (g.x0 + g.x1) / 2 + 0.5, y: g.y - 3 }]); B.mission.elites = el; B.banner('THE VAULT WAKES', 1.4); } },
      { label: 'Leave it', hint: 'The road is long enough. A short rest instead: everyone mended by a sixth.', fn() { for (const h of B.heroesAlive()) B.heal(null, h, h.maxhp * 0.16); } }] }),
    (B) => ({ title: 'The last gate', text: 'Beyond it the road ends in a yard, and something waits there that has waited a long time.', opts: [
      { label: 'Sound the horn', hint: 'Call it out in its fury: it is a quarter stronger, and the spoils half again as rich.', fn() { B.obj.horn = true; if (BB.sfx) BB.sfx('rally'); } },
      { label: 'Go quietly', hint: 'Every ultimate is charged before it knows you are there.', fn() { for (const h of B.heroesAlive()) h.energy = 100; } }] }),
  ];
  Battle.prototype.trekChoose = function (k) { const c = this.choice; if (!c) return; this.choice = null; const o = c.opts[k] || c.opts[0]; o.fn(); };
  // how rich the spoils of an expedition are, for the choices made on it
  BB.trekMult = (o) => 1 + (o.greed || 0) * 0.25 + (o.horn ? 0.5 : 0);

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
    if (o && !this.result && o.type === 'expedition' && this.map.trek && !this.choice) {
      const T = this.map.trek, wc = this.warCenter, left = this.foesAlive().filter((f) => !f.prop).length, here = T.enc.filter((e) => e.s === o.sec), e = here[o.i], W = this.mission.waves;
      this.goal = null;
      if (e) { // what is set along this part of the road: it springs when they come near
        if (!e.up) { this.goal = e; if (hyp(wc.x - e.x, wc.y - e.y) < 7.5) { e.up = true; const n = o.sec * 2 + o.i; let w = W[n % W.length].slice(); if (o.sec > 0) w = w.concat(W[(n + 1) % W.length].slice(0, 2)); this.spawnWave(w, [{ x: e.ax, y: e.ay }]); if (this.onWave) this.onWave(); } }
        else if (!left) o.i++;
      } else if (!left) {
        if (o.sec < T.gates.length) { // this side of the gate is clear: it opens, and there is something to decide
          if (!o.opened) { o.opened = true; this.openGate(o.sec); this.choice = CHOICES[o.sec % CHOICES.length](this); }
          else { o.sec++; o.i = 0; o.opened = false; this.trekWorks(o.sec); }
        } else if (!o.lord) { this.goal = T.boss; if (hyp(wc.x - T.boss.x, wc.y - T.boss.y) < 8.5) { const b = o.lord = this.spawnFoe(this.mission.boss, T.boss.x, T.boss.y, { rise: true }); if (o.horn) { b.maxhp = Math.round(b.maxhp * 1.25); b.hp = b.maxhp; b.atk *= 1.12; } this.boss = b; this.shake = 0.6; this.banner(b.F.name, 2.2, 'boss'); if (BB.sfx) BB.sfx('boss'); } }
        else if (o.lord.dead) { this.crumbleAll(); this.win(); return; }
      }
      o.text = o.lord ? 'The way out — bring down its guard' : o.sec >= T.gates.length ? 'The way out lies ahead' : 'The long road — gate ' + (o.sec + 1) + ' of ' + T.gates.length;
    }
    update0.call(this, dt);
  };

  // the mission an expedition is: the land's own dead along the road, its lord at the end
  BB.expedition = function (chapter, level, seed) {
    const r = BB.rng(seed || 1), ch = BB.CHAPTERS[chapter - 1], pool = BB.MISSIONS.filter((m) => m.chapter === chapter && /^(rout|gates|survive)$/.test(m.type)), lord = BB.MISSIONS.find((m) => m.chapter === chapter && m.type === 'boss');
    const waves = []; for (let i = 0; i < 7; i++) { const src = pool[(i + r.int(pool.length)) % pool.length].waves; waves.push(src[Math.min(src.length - 1, 1 + (i % Math.max(1, src.length - 1)))].slice()); }
    return { id: 'trek', code: '', name: 'The Long Road', type: 'expedition', layout: 'road', waves, boss: lord ? lord.boss : 'ossric', chapter, region: 'c' + chapter, level, elites: ch.elites || 0, trek: true };
  };
})();
