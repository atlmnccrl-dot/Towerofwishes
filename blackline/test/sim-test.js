// BLACKLINE — simulation tests (Node, no browser). Usage: node test/sim-test.js [matches]
const BL = require('./load.js');
const N = parseInt(process.argv[2] || '12', 10);
let fails = 0, passes = 0;
function ok(cond, msg) { if (cond) passes++; else { fails++; console.log('FAIL', msg); } }
function run(S, sec) { for (let i = 0; i < sec * 30; i++) { BL.step(S, BL.DT); S.events.length = 0; } }
function blank(seed) { return BL.createBattle({ seed: seed || 3 }); }
function place(S, team, type, x) {
  S.teams[team].rp = 99999; S.teams[team].cds = {};
  const u = BL.deploy(S, team, type, S.field.bases[team]).unit;
  const dx = x - u.x; u.x = x;
  for (const m of u.members) { m.x += dx; m.y = BL.heightAt(S.field, m.x) + (u.kind === 'air' ? 150 : 0); }
  u.order = { type: 'hold', x, target: 0 };
  return u;
}

// ---- terrain and sight
{
  const f = BL.createBattlefield(7);
  ok(f.W === 4800 && f.sectors.length === 3, 'battlefield size and sectors');
  const hB = BL.heightAt(f, 2400), hValley = BL.heightAt(f, 1800);
  ok(hB > hValley + 120, 'ridge B stands well above the valley');
  // the ridge blocks sight between the two valleys at ground level
  ok(!BL.los(f, 1800, hValley + 8, 3000, BL.heightAt(f, 3000) + 8), 'ridge blocks line of sight');
  ok(BL.los(f, 2400, hB + 150, 1800, hValley + 6), 'from the air you see into the valley');
  // symmetric ground: fair for both sides
  let asym = 0;
  for (let x = 100; x < 2300; x += 50) asym = Math.max(asym, Math.abs(BL.heightAt(f, x) - BL.heightAt(f, 4800 - x)));
  ok(asym < 1, 'terrain mirrors around the centre');
  ok(BL.coverAt(f, 1395, 2000) && BL.coverAt(f, 1395, 2000).obj.kind === 'trench', 'trench gives cover');
  const h0 = BL.heightAt(f, 1700);
  BL.crater(f, 1700, 30, 5);
  ok(BL.heightAt(f, 1700) < h0 - 4, 'explosions crater the ground');
}

// ---- deployment rules
{
  const S = blank();
  const r = BL.deploy(S, 0, 'rifle', 1300);
  ok(r.ok && Math.abs(r.unit.x - S.field.bases[0]) < 20, 'infantry deploys at the base when no sector is held');
  S.field.sectors[0].owner = 0;
  S.teams[0].cds = {};
  const r2 = BL.deploy(S, 0, 'rifle', 1290);
  ok(r2.ok && Math.abs(r2.unit.x - 1300) < 20, 'infantry deploys forward at a held sector');
  S.teams[0].rp = 5000;
  const r3 = BL.deploy(S, 0, 'tank', 1290);
  ok(r3.ok && Math.abs(r3.unit.x - S.field.bases[0]) < 20, 'vehicles only deploy at the base');
  S.teams[0].rp = 10;
  ok(BL.deploy(S, 0, 'scout', 200).reason === 'rp', 'cannot deploy without RP');
  S.teams[0].rp = 5000;
  S.teams[0].cds.scout = S.t + 10;
  ok(BL.deploy(S, 0, 'scout', 200).reason === 'cooldown', 'cards have cooldowns');
  S.teams[0].cds = {};
  while (BL.popCount(S, 0) < BL.RULES.popCap) { S.teams[0].cds = {}; BL.deploy(S, 0, 'scout', 200); }
  S.teams[0].cds = {};
  ok(BL.deploy(S, 0, 'scout', 200).reason === 'cap', 'unit cap holds');
  const ins = blank();
  ins.teams[0].rp = 5000;
  ok(BL.deploy(ins, 0, 'insert', 3600).reason === 'sight', 'air insertion needs sight');
}

// ---- orders and movement
{
  const S = blank();
  const u = place(S, 0, 'rifle', 400);
  BL.order(S, [u.id], 'move', 900);
  run(S, 25);
  ok(Math.abs(u.x - 900) < 20, 'squad moves to its order (' + u.x.toFixed(0) + ')');
  ok(u.members.every((m) => Math.abs(m.y - BL.heightAt(S.field, m.x)) < 0.01), 'soldiers stand on the ground');
  BL.order(S, [u.id], 'retreat');
  run(S, 30);
  ok(Math.abs(u.x - S.field.bases[0]) < 80 && u.order.type === 'hold', 'retreat returns to base and holds');
  const t = place(S, 0, 'tank', 400);
  BL.order(S, [t.id], 'move', 1000);
  run(S, 30);
  ok(Math.abs(t.x - 1000) < 30, 'tank drives to its order');
  const h = place(S, 0, 'heli', 400);
  BL.order(S, [h.id], 'move', 2400);
  run(S, 30);
  const hm = h.members[0];
  ok(Math.abs(hm.x - 2400) < 40 && hm.y > BL.heightAt(S.field, hm.x) + 100, 'helicopter flies over the ridge');
}

// ---- capture
{
  const S = blank();
  const u = place(S, 0, 'rifle', 1300);
  run(S, 25);
  ok(S.field.sectors[0].owner === 0, 'a squad captures a sector alone');
  const e = place(S, 1, 'rifle', 1320);
  S.teams[0].vis.clear(); S.teams[1].vis.clear();
  run(S, 0.5);
  ok(S.field.sectors[0].contested, 'both sides present: contested');
  const income = S.teams[0].income;
  ok(Math.abs(income - (BL.RULES.baseIncome + BL.RULES.sectorIncome)) < 1e-6, 'held sector adds income');
}

// ---- combat rules
{
  const S = blank();
  const a = place(S, 0, 'rifle', 1700), b = place(S, 1, 'rifle', 1900);
  run(S, 20);
  const supp = b.members.filter((m) => m.alive).some((m) => m.supp > 0) || a.members.some((m) => m.supp > 0);
  ok(supp, 'gunfire suppresses');
  ok(S.teams[0].stats.kills + S.teams[1].stats.kills > 0, 'squads kill each other');
  // small arms cannot hurt a tank; rockets can
  const S2 = blank();
  const tank = place(S2, 1, 'tank', 2000);
  const m = tank.members[0];
  BL._internal.damage(S2, m, 500, 'small', 0);
  ok(m.hp > m.maxHp * 0.97, 'rifle fire barely scratches a tank');
  BL._internal.damage(S2, m, 150, 'rocket', 0);
  ok(m.hp < m.maxHp * 0.9, 'an AT rocket hurts a tank');
  // helicopter falls before it dies, then leaves a wreck
  const S3 = blank();
  const heli = place(S3, 1, 'heli', 2000);
  BL._internal.damage(S3, heli.members[0], 5000, 'cannon', 0);
  ok(heli.members[0].falling && heli.members[0].alive, 'a shot-down helicopter falls');
  run(S3, 6);
  ok(!heli.alive && S3.wrecks.length === 1, 'it crashes and leaves a wreck');
  ok(S3.field.cover.some((c) => c.kind === 'wreck'), 'wrecks become cover');
  // artillery hits everyone in the area, its own side too
  const S4 = blank();
  const mine = place(S4, 0, 'rifle', 2000);
  S4.teams[0].rp = 1000;
  BL.deploy(S4, 0, 'arty', 2000);
  run(S4, 8);
  ok(mine.members.some((k) => !k.alive || k.hp < k.maxHp), 'artillery is friendly fire');
  // tanks cannot aim at aircraft
  const S5 = blank();
  const tk = place(S5, 0, 'tank', 1800);
  place(S5, 1, 'heli', 1900);
  run(S5, 4);
  ok(!tk.members[0].weapons[0].target || tk.members[0].weapons[0].target.unit.kind !== 'air', 'tank gun ignores aircraft');
  // unseen units cannot be targeted: a squad behind the ridge is safe
  const S6 = blank();
  const left = place(S6, 0, 'rifle', 1800), right = place(S6, 1, 'rifle', 3000);
  run(S6, 5);
  ok(!BL.visible(S6, 0, right) && left.members.every((k) => !k.target), 'no fire through the ridge');
}

// ---- air insertion lands a squad
{
  const S = blank();
  S.teams[0].rp = 2000;
  const r = BL.deploy(S, 0, 'insert', 450);
  ok(r.ok, 'insertion accepted where we can see');
  run(S, 25);
  ok(r.unit.members.every((m) => !m.rappel) && r.unit.members.every((m) => Math.abs(m.x - 450) < 90), 'the squad rappels down and lands');
  run(S, 10);
  ok(S.transports.length === 0, 'the transport leaves');
}

// ---- determinism (replays)
{
  const a = BL.createBattle({ seed: 42, ai: [true, true] });
  const b = BL.createBattle({ seed: 42, ai: [true, true] });
  run(a, 120); run(b, 120);
  const sig = (S) => JSON.stringify(S.teams.map((T) => [T.tickets.toFixed(3), T.rp.toFixed(3), T.stats])) + S.units.map((u) => u.x.toFixed(3)).join();
  ok(sig(a) === sig(b), 'same seed, same battle');
}

// ---- full AI vs AI matches: no NaN, no stalls, always a result
{
  const lens = [], wins = [0, 0];
  let maxProj = 0, vehBuys = 0;
  for (let seed = 1; seed <= N; seed++) {
    const S = BL.createBattle({ seed: seed * 101, ai: [true, true] });
    let bad = null;
    while (!S.over && S.t < 1800) {
      BL.step(S, BL.DT);
      for (const e of S.events) if (e.t === 'deploy' && (e.type === 'tank' || e.type === 'apc' || e.type === 'heli')) vehBuys++;
      S.events.length = 0;
      maxProj = Math.max(maxProj, S.proj.length);
      if ((S.t * 30 | 0) % 30 === 0) {
        for (const u of S.units) for (const m of u.members) {
          if (!m.alive) continue;
          if (!isFinite(m.x) || !isFinite(m.y) || !isFinite(m.hp)) bad = 'NaN in ' + u.type;
          if (m.x < 0 || m.x > S.field.W) bad = 'out of bounds ' + u.type;
          if (!m.veh && !m.rappel && m.y < BL.heightAt(S.field, m.x) - 0.5) bad = 'soldier under ground';
        }
      }
      if (bad) break;
    }
    ok(!bad, `match ${seed}: ${bad || 'clean'}`);
    ok(S.over, `match ${seed} ends (t=${S.t.toFixed(0)})`);
    if (S.over) { lens.push(S.t); wins[S.winner]++; }
  }
  const avg = lens.reduce((a, b) => a + b, 0) / Math.max(1, lens.length);
  console.log(`AI vs AI: ${lens.length}/${N} finished, average ${(avg / 60).toFixed(1)} min (min ${(Math.min(...lens) / 60).toFixed(1)}, max ${(Math.max(...lens) / 60).toFixed(1)}), wins west/east ${wins.join('/')}, peak projectile pool ${maxProj}, vehicles bought ${vehBuys}`);
  ok(maxProj <= 520, 'projectile pool stays capped');
  ok(avg > 240 && avg < 1500, 'matches last a sensible time');
  ok(vehBuys > 0, 'the AI buys vehicles');
}

console.log(`${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
