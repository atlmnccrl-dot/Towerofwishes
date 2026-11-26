// The evolving bosses of Acts II and III and the run's five (docs/ASCENT_DESIGN.md §3; bosses4.js, bosses5.js):
// each fight, played by the skilled bot with an unhurtable warden, must reach every stage, start and end each of
// its interludes (two for the Archon and the Wheel), show its new form (e.form 2 then 3), use moves in its later
// stages that it never used in its first, and die; a returning mini-boss (e.mini) must keep one stage.
// node bellmourn/test/stages-test.mjs [seeds=2] [boss,boss,...]
import { World } from '../js/game/sim.js';
import { makeBot } from '../js/game/bot.js';
import { heroStats, newHeroSave, MAX_LEVEL, weaponsOfType, HEROES } from '../js/game/heroes.js';
import '../js/game/bosses2.js';
import '../js/game/ai.js';

const N = +(process.argv[2] || 2);
const ONLY = process.argv[3] ? process.argv[3].split(',') : null;
const BOSSES = [['frostgiant', 8, 1], ['sandwyrm', 9, 1], ['lich', 10, 1], ['archon', 11, 2], ['bogmother', 12, 1], ['clockmaster', 13, 1], ['wheel', 14, 2],
  ['kingcrab', 2, 1], ['hollowmother', 4, 1], ['ronin', 6, 1], ['smiling', 2, 1], ['pyresaint', 5, 1]].filter(([t]) => !ONLY || ONLY.includes(t));
const ARENA = { bounds: [-12, -11, 12, 11], solids: [{ x: -6, z: -4, r: 0.7, h: 3 }, { x0: 5, z0: 3, x1: 6.4, z1: 4.4, h: 3 }] };
function prog(heroId, tier) {
  const save = { heroes: {}, relicsOn: tier >= 2 ? ['psalter'] : [], bossTonics: Math.min(3, tier) };
  const P = save.heroes[heroId] = newHeroSave(heroId); P.level = Math.min(MAX_LEVEL, 1 + tier * 3);
  const ws = weaponsOfType(HEROES[heroId].weapon); if (ws.length) { P.weapon = ws[Math.min(ws.length - 1, Math.floor(tier / 2))]; P.plus = { [P.weapon]: Math.min(10, Math.round(tier * 0.8)) }; }
  return heroStats(save, heroId);
}
let fail = 0; const bad = (m) => { fail++; console.log('  FAIL', m); };

function fight(type, tier, seed, o = {}) {
  const w = new World({ ...ARENA, seed }); const hero = w.spawnHero(0, 7, prog('warden', tier)); hero.iframes = 1e9;
  const boss = w.spawnBoss(type, 0, -4, { face: 0 }); if (o.mini) { boss.mini = true; boss.maxHp = boss.hp = Math.round(boss.maxHp * 0.45); }
  const bot = makeBot(1, seed * 7 + 1); const dt = 1 / 60; let t = 0;
  const R = { il: 0, ilEnd: 0, kinds: [], forms: new Set([1]), moves: { 1: new Set(), 2: new Set(), 3: new Set() }, stuck: null, t: 0, win: false, maxAway: 0 };
  let awayT = 0, hidT = 0, chanT = 0;
  while (t < 420 && !boss.dead) {
    hero.iframes = 1e9; hero.hp = hero.maxHp; w.update(dt, bot(w, dt)); t += dt;
    const st = Math.min(3, boss.form || 1);
    for (const ev of w.drain()) {
      if (ev.type === 'interlude' && ev.e === boss) { R.il++; R.kinds.push(ev.kind); }
      if (ev.type === 'interludeEnd' && ev.e === boss) R.ilEnd++;
      if (ev.type === 'tele' && ev.e === boss && ev.atk) R.moves[st].add(ev.atk.name);
    }
    if (boss.ai.chan) R.moves[st].add('rite:' + boss.ai.chan.id);
    R.forms.add(boss.form || 1);
    if (boss.away) { awayT += dt; R.maxAway = Math.max(R.maxAway, awayT); } else awayT = 0;
    if (boss.hidden && !boss.away) hidT += dt; else hidT = 0;
    if (boss.ai.chan && boss.state === 'idle') chanT += dt; else chanT = 0;
    if (awayT > 30) { R.stuck = 'away'; break; } if (hidT > 9) { R.stuck = 'hidden'; break; } if (chanT > 9) { R.stuck = 'rite ' + boss.ai.chan.id; break; }
    for (const e of w.ents) if (!Number.isFinite(e.x) || !Number.isFinite(e.hp)) { R.stuck = 'NaN on ' + e.type; break; }
    if (R.stuck) break;
  }
  R.t = t; R.win = boss.dead; return R;
}

for (const [type, tier, nIl] of BOSSES) {
  let wins = 0, tt = 0; const kinds = new Set(); const seen1 = new Set(), later = new Set();
  for (let s = 1; s <= N; s++) {
    const R = fight(type, tier, s);
    if (R.stuck) bad(`${type} seed ${s}: stuck (${R.stuck})`);
    if (R.win) wins++; tt += R.t; R.kinds.forEach((k) => kinds.add(k));
    if (R.il < nIl) bad(`${type} seed ${s}: ${R.il} interludes (want ${nIl})`);
    if (R.ilEnd < R.il) bad(`${type} seed ${s}: an interlude never ended (${R.ilEnd}/${R.il})`);
    if (R.maxAway > 27) bad(`${type} seed ${s}: away ${R.maxAway.toFixed(1)} s`);
    if (!R.forms.has(2) || !R.forms.has(3)) bad(`${type} seed ${s}: forms ${[...R.forms].join('')} (want 1, 2, 3)`);
    R.moves[1].forEach((m) => seen1.add(m)); [...R.moves[2], ...R.moves[3]].forEach((m) => later.add(m));
    if (s === 1) console.log(`  ${type.padEnd(12)} stage moves: 1 [${[...R.moves[1]].join(' ')}]  2 [${[...R.moves[2]].join(' ')}]  3 [${[...R.moves[3]].join(' ')}]`);
  }
  const newMoves = [...later].filter((m) => !seen1.has(m)).length;
  if (newMoves < 4) bad(`${type}: only ${newMoves} moves in stages 2-3 that stage 1 never used`);
  if (wins < N) bad(`${type}: the boss died in ${wins}/${N} fights`);
  console.log(`${type.padEnd(12)} t${tier}: died ${wins}/${N}  avg ${(tt / N).toFixed(1)} s  interludes ${[...kinds].join(', ')}  new moves ${newMoves}`);
  // a returning mini-boss: one stage, no interlude
  const M = fight(type, tier, 99, { mini: true });
  if (M.il || M.forms.has(2)) bad(`${type} as a mini-boss: ${M.il} interludes, forms ${[...M.forms].join('')}`);
}
console.log(fail ? `${fail} failures` : 'all stages hold');
process.exit(fail ? 1 : 0);
