// BLACKLINE — simulation tests (Node, no browser). Usage: node test/sim-test.js [matches]
const BL = require('./load.js');
const N = parseInt(process.argv[2] || '10', 10);
let fails = 0, passes = 0;
function ok(cond, msg) { if (cond) passes++; else { fails++; console.log('FAIL', msg); } }
function run(S, sec) { for (let i = 0; i < sec * 30; i++) { BL.step(S, BL.DT); S.events.length = 0; } }
function blank(map, seed) { return BL.createBattle({ seed: seed || 3, map: map || 'valley' }); }
function place(S, team, type, x, y) {
  const u = BL.spawn(S, team, type, x, y);
  return u;
}
const F = BL.MAPF;

// ---- maps
for (const id of ['valley', 'ford', 'ridge']) {
  const f = BL.buildMap(id);
  ok(f.sectors.length === 3 && f.bases.length === 2, `${id}: three sectors and two bases`);
  for (const s of f.sectors) ok(BL.walkable(f, 'inf', s.x, s.y), `${id}: sector ${s.id} is reachable ground`);
  const p = BL.findPath(f, 'veh', f.bases[0].x, f.bases[0].y, f.bases[1].x, f.bases[1].y);
  ok(p.length >= 1 && Math.hypot(p[p.length - 1].x - f.bases[1].x, p[p.length - 1].y - f.bases[1].y) < 60, `${id}: vehicles can drive base to base`);
}
{
  const f = BL.buildMap('valley');
  let asym = 0;
  for (let x = 100; x < f.W - 100; x += 97) for (let y = 100; y < f.H - 100; y += 89) asym = Math.max(asym, Math.abs(BL.heightAt(f, x, y) - BL.heightAt(f, f.W - x, f.H - y)));
  ok(asym < 0.6, 'valley: the ground mirrors through the centre (' + asym.toFixed(2) + ')');
  const B = f.sectors[1];
  ok(BL.heightAt(f, B.x, B.y) > BL.heightAt(f, 600, 300) + 30, 'valley: B sits on a rise');
  // a ruin blocks movement; the path goes round it
  const ru = f.ruins[0];
  ok(!BL.walkable(f, 'inf', ru.x, ru.y), 'ruins block movement');
  // woods give cover and hide; trenches give more cover
  const w = f.spec.woods[0];
  ok(BL.coverAt(f, w.x, w.y) >= 0.3 && BL.inWoods(f, w.x, w.y), 'woods give cover');
  const t = f.spec.trenches[0].pts[1];
  ok(BL.coverAt(f, t[0], t[1]) >= 0.55, 'trenches give the best cover');
  // the hill at B blocks sight between its two sides at ground level
  const h1 = BL.heightAt(f, B.x - 380, B.y) + 8, h2 = BL.heightAt(f, B.x + 380, B.y) + 8;
  ok(!BL.los(f, B.x - 380, B.y, h1, B.x + 380, B.y, h2), 'the rise at B blocks line of sight');
  ok(BL.los(f, B.x - 380, B.y, h1 + 200, B.x + 380, B.y, h2 + 200), 'from the air you see over it');
}
{
  const f = BL.buildMap('ford');
  const st = f.spec.stream;
  const ford = st.fords[0];
  ok(BL.walkable(f, 'veh', ford[0], ford[1]), 'ford: vehicles can cross at the ford');
  ok(!BL.walkable(f, 'veh', st.pts[1][0], st.pts[1][1]), 'ford: vehicles cannot drive into the stream elsewhere');
  ok(BL.speedAt(f, st.pts[1][0], st.pts[1][1], 'inf') < 0.6, 'ford: infantry wade slowly');
}

// ---- deployment
{
  const S = blank();
  S.teams[0].rp = 5000;
  const r = BL.deploy(S, 0, 'rifle', 1000, 600);
  ok(r.ok && Math.hypot(r.unit.x - S.field.bases[0].x, r.unit.y - S.field.bases[0].y) < 60, 'infantry deploys at the base when no sector is held');
  S.field.sectors[0].owner = 0; S.teams[0].cds = {};
  const r2 = BL.deploy(S, 0, 'rifle', S.field.sectors[0].x, S.field.sectors[0].y);
  ok(r2.ok && Math.hypot(r2.unit.x - S.field.sectors[0].x, r2.unit.y - S.field.sectors[0].y) < 60, 'infantry deploys at a held sector');
  const r3 = BL.deploy(S, 0, 'tank', S.field.sectors[0].x, S.field.sectors[0].y);
  ok(r3.ok && Math.hypot(r3.unit.x - S.field.bases[0].x, r3.unit.y - S.field.bases[0].y) < 60, 'vehicles only deploy at the base');
  S.teams[0].rp = 10;
  ok(BL.deploy(S, 0, 'scout', 200, 1000).reason === 'rp', 'no deploy without RP');
  S.teams[0].rp = 5000; S.teams[0].cds.scout = S.t + 10;
  ok(BL.deploy(S, 0, 'scout', 200, 1000).reason === 'cooldown', 'cards have cooldowns');
  S.teams[0].cds = {};
  while (BL.popCount(S, 0) < BL.RULES.popCap) { S.teams[0].cds = {}; BL.deploy(S, 0, 'scout', 200, 1000); }
  S.teams[0].cds = {};
  ok(BL.deploy(S, 0, 'scout', 200, 1000).reason === 'cap', 'unit cap holds');
  const L = BL.createBattle({ map: 'valley', allowed: [['rifle'], null] });
  L.teams[0].rp = 5000;
  ok(BL.deploy(L, 0, 'tank', 200, 1000).reason === 'locked', 'locked cards cannot be used');
  const ins = blank(); ins.teams[0].rp = 5000;
  ok(BL.deploy(ins, 0, 'insert', 3000, 1300).reason === 'sight', 'air insertion needs sight');
}

// ---- orders and movement
{
  const S = blank();
  const u = place(S, 0, 'rifle', 300, 1000);
  BL.order(S, [u.id], 'move', 900, 820);
  run(S, 35);
  ok(Math.hypot(u.x - 900, u.y - 820) < 25, 'a squad walks to its order (' + u.x.toFixed(0) + ',' + u.y.toFixed(0) + ')');
  ok(u.members.every((m) => !m.alive || BL.walkable(S.field, 'inf', m.x, m.y)), 'soldiers never stand inside ruins');
  BL.order(S, [u.id], 'retreat');
  run(S, 40);
  ok(Math.hypot(u.x - S.field.bases[0].x, u.y - S.field.bases[0].y) < 90 && u.order.type === 'hold', 'retreat returns to base and holds');
  // a squad routes around a ruin to reach the far side
  const ru = S.field.ruins[0];
  const v = place(S, 0, 'rifle', ru.x - 90, ru.y);
  BL.order(S, [v.id], 'move', ru.x + 90, ru.y);
  ok(v.path.length >= 1, 'a path is planned');
  run(S, 20);
  ok(Math.hypot(v.x - (ru.x + 90), v.y - ru.y) < 30, 'and the squad gets round the ruin');
  const t = place(S, 0, 'tank', 300, 1000);
  BL.order(S, [t.id], 'move', 1000, 800);
  run(S, 40);
  ok(Math.hypot(t.x - 1000, t.y - 800) < 40, 'a tank drives to its order');
  const h = place(S, 0, 'heli', 300, 1000);
  BL.order(S, [h.id], 'move', 1800, 1000);
  run(S, 25);
  const hm = h.members[0];
  ok(Math.hypot(hm.x - 1800, hm.y - 1000) < 40 && hm.alt > BL.heightAt(S.field, hm.x, hm.y) + 80, 'the helicopter flies over the rise');
  // several units spread out instead of piling on one spot
  const a = place(S, 0, 'rifle', 400, 600), b = place(S, 0, 'rifle', 400, 700), c = place(S, 0, 'rifle', 400, 800);
  BL.order(S, [a.id, b.id, c.id], 'move', 700, 700);
  const goals = [a, b, c].map((k) => k.order);
  ok(Math.hypot(goals[0].x - goals[2].x, goals[0].y - goals[2].y) > 60, 'a group order spreads the units');
}

// ---- capture
{
  const S = blank();
  const A = S.field.sectors[0];
  place(S, 0, 'rifle', A.x, A.y);
  run(S, 25);
  ok(A.owner === 0, 'a squad captures a sector alone');
  place(S, 1, 'rifle', A.x + 30, A.y + 20);
  run(S, 0.5);
  ok(A.contested, 'both sides inside: contested');
  ok(Math.abs(S.teams[0].income - (BL.RULES.baseIncome + BL.RULES.sectorIncome)) < 1e-6, 'a held sector adds income');
}

// ---- combat
{
  const S = blank();
  place(S, 0, 'rifle', 900, 1350); place(S, 1, 'rifle', 1150, 1350);
  run(S, 20);
  ok(S.teams[0].stats.kills + S.teams[1].stats.kills > 0, 'squads in the open kill each other');
  const S2 = blank();
  const tank = place(S2, 1, 'tank', 2000, 1000);
  const m = tank.members[0];
  BL._internal.damage(S2, m, 500, 'small', 0);
  ok(m.hp > m.maxHp * 0.97, 'rifle fire barely scratches a tank');
  BL._internal.damage(S2, m, 150, 'rocket', 0);
  ok(m.hp < m.maxHp * 0.9, 'an AT rocket hurts a tank');
  const S3 = blank();
  const heli = place(S3, 1, 'heli', 2000, 1000);
  BL._internal.damage(S3, heli.members[0], 5000, 'cannon', 0);
  ok(heli.members[0].falling && heli.members[0].alive, 'a shot-down helicopter falls');
  run(S3, 6);
  ok(!heli.alive && S3.wrecks.length === 1 && S3.field.extraCover.length === 1, 'it crashes and its wreck becomes cover');
  const S4 = blank();
  const mine = place(S4, 0, 'rifle', 2000, 1500);
  S4.teams[0].rp = 1000;
  BL.deploy(S4, 0, 'arty', 2000, 1500);
  run(S4, 8);
  ok(mine.members.some((k) => !k.alive || k.hp < k.maxHp), 'artillery hits its own side too');
  ok(S4.craters.length > 0, 'shells leave craters');
  const S5 = blank();
  const tk = place(S5, 0, 'tank', 1500, 1500);
  place(S5, 1, 'heli', 1600, 1500);
  run(S5, 4);
  ok(!tk.members[0].weapons[0].target || tk.members[0].weapons[0].target.unit.kind !== 'air', 'a tank gun ignores aircraft');
  // woods hide a squad from distant eyes
  const S6 = blank();
  const w = S6.field.spec.woods[4];
  const hid = place(S6, 1, 'rifle', w.x, w.y);
  place(S6, 0, 'scout', w.x - 330, w.y);
  run(S6, 2);
  ok(!BL.visible(S6, 0, hid), 'a squad in the woods is hidden at range');
}

// ---- air insertion
{
  const S = blank();
  S.teams[0].rp = 2000;
  const r = BL.deploy(S, 0, 'insert', 420, 1000);
  ok(r.ok, 'insertion accepted where we can see');
  run(S, 30);
  ok(r.unit.members.every((m) => !m.rappel), 'the squad rappels down and lands');
  run(S, 12);
  ok(S.transports.length === 0, 'the transport leaves');
}

// ---- determinism
{
  const a = BL.createBattle({ seed: 42, ai: [true, true] }), b = BL.createBattle({ seed: 42, ai: [true, true] });
  run(a, 120); run(b, 120);
  const sig = (S) => JSON.stringify(S.teams.map((T) => [T.tickets.toFixed(3), T.rp.toFixed(3), T.stats])) + S.units.map((u) => u.x.toFixed(2) + u.y.toFixed(2)).join();
  ok(sig(a) === sig(b), 'same seed, same battle');
}

// ---- AI vs AI on the skirmish map
{
  const lens = [], wins = [0, 0];
  let maxProj = 0, veh = 0;
  for (let k = 1; k <= N; k++) {
    const S = BL.createBattle({ seed: k * 101, map: 'valley', ai: [true, true] });
    let bad = null;
    while (!S.over && S.t < 1800) {
      BL.step(S, BL.DT);
      for (const e of S.events) if (e.t === 'deploy' && BL.UNITS[e.type].kind !== 'inf') veh++;
      S.events.length = 0;
      maxProj = Math.max(maxProj, S.proj.length);
      if ((S.t * 30 | 0) % 30 === 0) for (const u of S.units) for (const m of u.members) {
        if (!m.alive) continue;
        if (!isFinite(m.x) || !isFinite(m.y) || !isFinite(m.hp)) bad = 'NaN ' + u.type;
        if (m.x < 0 || m.x > S.field.W || m.y < 0 || m.y > S.field.H) bad = 'out of bounds ' + u.type;
      }
      if (bad) break;
    }
    ok(!bad, `match ${k}: ${bad || 'clean'}`);
    ok(S.over, `match ${k} ends (t=${S.t.toFixed(0)})`);
    if (S.over) { lens.push(S.t); wins[S.winner]++; }
  }
  const avg = lens.reduce((a, b) => a + b, 0) / Math.max(1, lens.length);
  console.log(`AI vs AI: ${lens.length}/${N} finished, average ${(avg / 60).toFixed(1)} min, wins west/east ${wins.join('/')}, peak projectile pool ${maxProj}, vehicles bought ${veh}`);
  ok(maxProj <= 520, 'projectile pool stays capped');
  ok(veh > 0, 'the AI buys vehicles');
}

console.log(`${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
