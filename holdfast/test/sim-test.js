// HOLDFAST - headless playthrough. An autoplayer walks the opening, builds, defends, explores.
// Usage: node holdfast/test/sim-test.js [days=12] [seeds=3]
const path = require('path');
const J = f => require(path.join(__dirname, '..', 'js', f));
J('data.js'); J('world.js'); J('sim.js');
const HF = globalThis.HF, D = HF.D, S = HF.Sim;
const DAYS = +process.argv[2] || 12, SEEDS = +process.argv[3] || 3;
let failures = 0;
const check = (c, msg) => { if (!c) { failures++; console.log('  FAIL', msg); } };

function findSpot(st, type, near, rmin) {
  const B = D.B[type];
  for (let r = rmin || 2; r < 26; r++) for (let k = 0; k < r * 8; k++) {
    const a = k / (r * 8) * Math.PI * 2; const x = Math.round(near.x + Math.cos(a) * r - B.w / 2), y = Math.round(near.y + Math.sin(a) * r - B.h / 2);
    if (S.canPlace(st, type, x, y)) return { x, y };
  }
  return null;
}
function place(st, type, near, rmin) { const p = findSpot(st, type, near, rmin); if (!p) return null; const r = S.cmd(st, 'place', { type, x: p.x, y: p.y }); return r.ok ? r.id : null; }

function run(seed, starter) {
  const st = S.create(seed, starter);
  const t0 = Date.now();
  const dt = 0.05; let steps = 0; const log = [];
  const leader = Object.values(st.units).find(u => u.leader);
  const answer = () => {
    while (st.pending.length) {
      const p = st.pending[0];
      if (p.kind === 'stranger') { S.cmd(st, 'choose', { choice: 0 }); continue; }
      const enc = S.pendingEnc(st); const pick = enc.choices.findIndex(c => !c.trade && !c.cost) ;
      const r = S.cmd(st, 'choose', { choice: pick < 0 ? 0 : pick }); if (!r.ok) S.cmd(st, 'choose', { choice: 0 });
      if (r.res) log.push('    exp: ' + r.res.title + ' -> ' + (r.res.ok ? 'ok' : 'fail') + ' ' + JSON.stringify(r.res.loot) + (r.res.dead.length ? ' DEAD ' + r.res.dead : ''));
    }
  };
  const until = (cond, maxSec) => { let s = 0; while (!cond() && s < maxSec && !st.gameOver) { answer(); S.step(st, dt); S.drain(st); s += dt; steps++; } return cond(); };
  // 1. Camp.
  check(until(() => true, 1), 'start');
  check(S.cmd(st, 'makeCamp', { x: st.clearing.x, y: st.clearing.y }).ok, 'make camp');
  // 2. Gather (the laborer does it alone; nudge with a manual order like a player would).
  const tree = Object.values(st.nodes).filter(n => n.type === 'tree').sort((a, b) => Math.hypot(a.x - st.clearing.x, a.y - st.clearing.y) - Math.hypot(b.x - st.clearing.x, b.y - st.clearing.y))[0];
  S.cmd(st, 'order', { ids: [leader.id], kind: 'gather', target: tree.id });
  check(until(() => st.res.wood >= 12, 120), 'gather wood (' + st.res.wood + ')');
  const rock = Object.values(st.nodes).filter(n => n.type === 'rock').sort((a, b) => Math.hypot(a.x - st.clearing.x, a.y - st.clearing.y) - Math.hypot(b.x - st.clearing.x, b.y - st.clearing.y))[0];
  S.cmd(st, 'order', { ids: [leader.id], kind: 'gather', target: rock.id });
  check(until(() => st.res.stone >= 6, 120), 'gather stone (' + st.res.stone + ')');
  leader.task = null;
  check(D.OBJ[st.obj].id === 'fire', 'objective is fire, got ' + D.OBJ[st.obj].id);
  // 3. Campfire.
  const heartId = place(st, 'heart', st.clearing, 0); check(heartId, 'place heart');
  check(until(() => S.heart(st) && S.heart(st).state === 'done', 60), 'heart built');
  const H = () => { const h = S.heart(st); return { x: h.x + 2, y: h.y + 1 }; };
  // 4. Shelter.
  until(() => st.res.wood >= 12, 120);
  check(place(st, 'tent', H(), 4), 'place tent');
  check(until(() => S.count(st, 'tent', true) > 0, 80), 'tent built');
  // 5. Food.
  check(until(() => st.objDone.food, 200), 'forage food');
  // 6. Night.
  check(until(() => S.day(st) >= 2 && S.hour(st) > 6.1, 400), 'reach dawn of day 2');
  check(st.objDone.night, 'survived night (alive ' + S.survivors(st).length + ')');
  log.push('    day 2 dawn: pop ' + S.survivors(st).length + ' res ' + JSON.stringify(roundRes(st.res)));
  // Day loop: a simple manager.
  let lastDay = 2;
  while (S.day(st) <= DAYS && !st.gameOver) {
    until(() => false, 2);
    const day = S.day(st);
    const surv = S.present(st);
    const h = H();
    // Jobs: one guard, the rest split.
    surv.forEach((u, i) => { const want = i === 0 ? 'guard' : i === 1 ? 'build' : i % 3 === 0 ? 'wood' : i % 3 === 1 ? 'forage' : 'stone'; if (u.job !== want && !u.away) S.cmd(st, 'job', { id: u.id, job: want }); });
    const want = [['stockpile', 1], ['water', 1], ['tower', 1], ['woodcamp', 1], ['tent', Math.ceil((surv.length + 1) / 2)], ['workshop', 1]];
    if (st.era >= 2) want.push(['study', 1], ['farm', 2], ['cabin', Math.floor(surv.length / 5)], ['infirmary', 1], ['training', 1]);
    for (const [t, n] of want) if (S.unlocked(st, t) && S.count(st, t) < n && S.canAfford(st, D.B[t].cost[0])) place(st, t, h, 4);
    // A ring of barricades on the east side.
    if (S.count(st, 'wall') < 8 && st.res.wood > 30 && S.unlocked(st, 'wall')) { const tiles = []; for (let k = -4; k < 4; k++) tiles.push([h.x + 9, h.y + k]); S.cmd(st, 'placeLine', { type: 'wall', tiles }); }
    // Craft and research.
    if (S.has(st, 'workshop') && st.craftQ.length < 2 && st.res.wood > 40) S.cmd(st, 'craft', { item: 'spear' });
    for (const t of D.TECH_ORDER) if (!st.techs[t] && st.res.knowledge >= D.TECH[t].cost) S.cmd(st, 'research', { id: t });
    // Upgrade the heart when allowed.
    const hb = S.heart(st); if (hb && !S.upgradeBlock(st, hb) && S.canAfford(st, D.B.heart.cost[hb.tier + 1] || { x: 1e9 })) S.cmd(st, 'upgrade', { id: hb.id });
    // Expeditions: send two when there are 4+.
    if (surv.length >= 4 && !st.exps.length) {
      const site = st.sites.filter(s => s.known && !s.cleared && !(D.SITE[s.type].locked > st.era)).sort((a, b) => a.visits - b.visits || a.dist - b.dist)[0];
      if (site) { const party = surv.filter(u => u.job !== 'guard').slice(0, 2).map(u => u.id); const r = S.cmd(st, 'expedition', { site: site.id, ids: party, food: S.supplyNeed(st, site, 2) }); if (r.ok) log.push('    day ' + day + ' expedition -> ' + S.siteName(site)); }
    }
    if (day !== lastDay) {
      lastDay = day;
      log.push('    day ' + day + ': pop ' + S.survivors(st).length + ' era ' + st.era + ' raids ' + st.stats.raids + ' deaths ' + st.stats.deaths + ' bld ' + Object.keys(st.buildings).length + ' res ' + JSON.stringify(roundRes(st.res)) + ' obj ' + D.OBJ[st.obj].id);
    }
    // Invariants.
    for (const u of Object.values(st.units)) { if (!isFinite(u.x) || !isFinite(u.y) || !isFinite(u.hp)) { check(false, 'NaN unit ' + u.id + ' ' + u.kind); u.x = 100; u.y = 100; } }
    for (const k of D.RES) check(isFinite(st.res[k]) && st.res[k] >= 0, 'resource ' + k + ' = ' + st.res[k]);
  }
  // Save / load round trip.
  const json = S.save(st); const st2 = S.load(json);
  check(Object.keys(st2.units).length === Object.keys(st.units).length, 'save/load units');
  check(st2.terrain.length === D.W * D.H && st2.fog.length === D.W * D.H, 'save/load grids');
  for (let k = 0; k < 200; k++) S.step(st2, 0.05);
  const ms = Date.now() - t0;
  console.log('seed ' + seed + ' starter ' + starter + ': day ' + S.day(st) + ', pop ' + S.survivors(st).length + ', era ' + st.era + ', raids ' + st.stats.raids + ', deaths ' + st.stats.deaths + ', kills ' + st.stats.kills + ', expeditions ' + st.stats.expeditions + ', obj ' + D.OBJ[st.obj].id + (st.gameOver ? ' GAME OVER' : '') + ', save ' + (json.length / 1024 | 0) + ' KB, ' + steps + ' steps in ' + ms + ' ms (' + (ms / steps).toFixed(2) + ' ms/step)');
  for (const l of log) console.log(l);
  return st;
}
const roundRes = r => { const o = {}; for (const k in r) o[k] = Math.round(r[k]); return o; };
for (let s = 1; s <= SEEDS; s++) run(s * 101, (s - 1) % 3);
console.log(failures ? failures + ' FAILURES' : 'all checks passed');
process.exit(failures ? 1 : 0);
