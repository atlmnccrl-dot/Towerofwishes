// BLACKLINE — campaign tests: data integrity, progress and unlocks, and each mission played
// out by an AI commanding the player's side. Usage: node test/campaign-test.js [seedsPerMission]
const BL = require('./load.js');
const C = BL.campaign;
const N = parseInt(process.argv[2] || '6', 10);
let fails = 0, passes = 0;
function ok(cond, msg) { if (cond) passes++; else { fails++; console.log('FAIL', msg); } }

// ---- data
ok(C.MISSIONS.length === 5, 'five missions');
const all = new Set(['rifle']);
for (const M of C.MISSIONS) {
  ok(M.brief.length >= 3 && M.shots.every((s) => s.line == null || M.brief[s.line]), `${M.id}: briefing lines exist for each shot`);
  ok((M.intro || []).every((k) => C.DOSSIER[k]), `${M.id}: every introduced unit has a dossier`);
  if (M.allowed) ok(M.allowed.every((k) => all.has(k) || (M.intro || []).includes(k)), `${M.id}: only unlocked or introduced cards`);
  for (const k of M.intro || []) all.add(k);
  for (const k of M.unlocks) all.add(k);
  ok(C.HINTS[M.hints], `${M.id}: has tutorial hints`);
}
ok(all.size === 8, 'the campaign unlocks every card (' + [...all].join(',') + ')');

// ---- progress and unlocks
{
  const mem = {}; const store = { getItem: (k) => mem[k] || null, setItem: (k, v) => { mem[k] = v; } };
  let P = C.loadProgress(store);
  ok(C.unlockedCards(P).join() === 'rifle', 'fresh save: rifle only');
  ok(C.missionOpen(P, 0) && !C.missionOpen(P, 1) && !C.skirmishOpen(P), 'fresh save: only mission 01 open');
  const fresh = C.record(P, C.MISSIONS[0], 2);
  ok(fresh.join() === 'mg', 'winning 01 unlocks the MG');
  ok(C.missionOpen(P, 1) && C.skirmishOpen(P), '01 opens 02 and skirmish');
  C.record(P, C.MISSIONS[0], 1);
  ok(P.stars.m1 === 2, 'best stars are kept');
  C.saveProgress(store, P);
  P = C.loadProgress(store);
  ok(P.stars.m1 === 2, 'progress survives a reload');
  const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  ok(C.loadProgress(broken).stars && (C.saveProgress(broken, P), true), 'blocked storage does not crash');
  ok(C.rank({ stars: { m1: 3, m2: 3, m3: 3, m4: 3, m5: 3 } }).name === 'COLONEL', 'full stars: top rank');
}

// ---- each mission, played by the AI on our side
const report = [];
for (const M of C.MISSIONS) {
  let wins = 0, total = 0, lens = [], waves = 0;
  for (let k = 1; k <= N; k++) {
    const opts = C.battleOptions(M, { stars: {} }, k * 97 + 11, 'veteran');
    opts.ai = [true, true];
    const S = BL.createBattle(opts);
    const ms = C.setupBattle(S, M);
    if (M.insert) ok(S.transports.length === 1, `${M.id}: the opening rope drop is under way`);
    // the briefing runs calm for a few seconds, then H-hour
    for (let i = 0; i < 30 * 12; i++) { BL.step(S, BL.DT); S.events.length = 0; }
    ok(S.teams[0].stats.kills === 0 && S.teams[1].stats.kills === 0, `${M.id}: nobody fights during the briefing`);
    S.calm = false;
    while (!ms.result && S.t < 1500) {
      BL.step(S, BL.DT);
      C.tick(S, M, ms, BL.DT);
      for (const e of S.events) if (e.t === 'wave') waves++;
      S.events.length = 0;
    }
    total++;
    if (ms.result === 'win') wins++;
    if (ms.result) lens.push(S.t);
    ok(!!ms.result, `${M.id} seed ${k}: ends (t=${S.t.toFixed(0)})`);
    if (ms.result === 'win') ok(C.stars(S, M, true) >= 1, `${M.id}: a win earns a star`);
  }
  const avg = lens.reduce((a, b) => a + b, 0) / Math.max(1, lens.length);
  report.push(`${M.id} ${M.name}: AI-player wins ${wins}/${total}, average ${(avg / 60).toFixed(1)} min${M.waves ? `, waves ${waves / total}` : ''}`);
  ok(wins >= 1, `${M.id}: winnable`);
}
console.log(report.join('\n'));
console.log(`${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
