// Plays the whole campaign in Node with the party on full auto, levelling as the game would.
// Usage: node emberfall/test/play-test.js [runs]
require('../js/data.js'); require('../js/story.js'); require('../js/combat.js');
const EF = globalThis.EF; const D = EF.DATA; const S = EF.STORY;
const runs = +process.argv[2] || 3; let seed = 11;
function fight(party, waves, level, intro) {
  const c = new EF.Combat({ party, waves, seed: seed++, level, auto: true, potions: 2, intro });
  let t = 0; while (!c.result && t < 400) { c.step(1 / 60, {}); t += 1 / 60; c.drainEvents(); }
  const hp = c.heroes.reduce((a, h) => a + Math.max(0, h.hp) / h.maxHp, 0) / c.heroes.length;
  const bad = c.ents.some(e => isNaN(e.x) || isNaN(e.y) || isNaN(e.hp)) || isNaN(c.stats.dmg);
  return { result: c.result || 'timeout', t: Math.round(t), hp: Math.round(hp * 100), stats: c.stats, bad };
}
let walls = 0, nan = 0, timeouts = 0;
for (let run = 0; run < runs; run++) {
  const G = { heroes: {}, roster: [] }; const add = id => { if (!G.roster.includes(id)) { G.roster.push(id); G.heroes[id] = { level: 1, xp: 0 }; } };
  const rows = [];
  for (const act of S.ACTS) {
    for (const id of act.party) add(id);
    for (const key of ['fight1', 'boss']) {
      const party = act.party.map(id => ({ id, level: G.heroes[id].level, items: {}, talents: {} })); const level = G.heroes.rook.level;
      let r, tries = 0; do { r = fight(party, act[key].waves, level, act[key].intro); tries++; } while (r.result !== 'win' && tries < 4);
      if (r.bad) nan++; if (r.result === 'timeout') timeouts++; if (r.result !== 'win') walls++;
      if (r.result === 'win') for (const id of act.party) { const hs = G.heroes[id]; hs.xp += r.stats.xp; while (hs.xp >= D.xpForLevel(hs.level)) { hs.xp -= D.xpForLevel(hs.level); hs.level++; } }
      rows.push(`${act.id} ${key.padEnd(6)} lv${String(party[0].level).padStart(2)} ${r.result.padEnd(7)} tries ${tries} ${String(r.t).padStart(3)}s  party hp ${String(r.hp).padStart(3)}%  taken ${r.stats.taken}  dealt ${r.stats.dmg}`);
    }
  }
  if (run === 0) console.log(rows.join('\n'));
}
console.log(`runs ${runs}: walls ${walls}, timeouts ${timeouts}, NaN ${nan}`);
process.exit(nan || timeouts ? 1 : 0);
