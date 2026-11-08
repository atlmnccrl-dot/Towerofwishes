// The campaign, walked as a player would: every node in map order with the profile it would have by
// then (levels from the XP earned so far, skills bought in a sensible order), each fight played by
// the bot. Checks the map is sound and reports win rates and fight length per node.
// Usage: node vesper/test/campaign-test.js [runs per node] [hero] [skill]
require('../js/data.js'); require('../js/sim.js'); require('../js/progress.js');
const VS = globalThis.VS, D = VS.DATA, S = VS.sim, P = VS.PROG, DT = 1 / 60;
const runs = +process.argv[2] || 4, hero = process.argv[3] || 'vesper', skill = +(process.argv[4] || 0.55), useGear = process.argv[5] !== 'nogear';
let seed = 7; const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
let fails = 0; const bad = (m) => { fails++; console.log('FAIL', m); };

// The map: ids unique, links valid, every node reachable from the first trial, every foe known.
const ids = new Set(); for (const n of P.NODES) { if (ids.has(n.id)) bad('duplicate ' + n.id); ids.add(n.id); }
for (const n of P.NODES) for (const m of n.next) if (!ids.has(m)) bad(n.id + ' links to missing ' + m);
const seen = new Set(['a0-t']), q = ['a0-t']; while (q.length) for (const m of P.node(q.shift()).next) if (!seen.has(m)) { seen.add(m); q.push(m); }
for (const n of P.NODES) if (!seen.has(n.id)) bad('unreachable ' + n.id);
for (const n of P.NODES) { if (n.type === 'shrine') continue; const b = P.build(n); for (const w of b.node.waves) for (const k of w) if (k !== '+' && !D.FOES[k]) bad(n.id + ' foe ' + k); if (!b.node.waves.length) bad(n.id + ' has no waves'); }
for (const id in P.UNLOCKS) if (!D.HEROES[id]) bad('unlock for unknown hero ' + id);
for (const k of P.SKILLS) for (const r of k.req) if (!P.skill(r)) bad(k.id + ' needs unknown ' + r);

const ORDER = ['dodge', 'heavy', 'skill1', 'parry', 'art', 'fourth', 'ghost', 'skill2', 'edge', 'guard', 'moonblood', 'vigor', 'riposte', 'rising', 'vigor2', 'edge2', 'breath', 'thirst', 'exec', 'quick'];
const p = P.fresh(); p.hero = hero; if (!P.heroOk(p, hero)) p.heroes.push(hero);
const rows = []; let act = -1, line = '';
for (const n of P.NODES) {
  if (n.act !== act) { if (line) console.log(line); act = n.act; line = `Act ${P.ACTS[act].num.padEnd(3)}`; }
  for (const id of ORDER) P.buy(p, id);
  if (n.type === 'shrine') { P.claimShrine(p, n.id); line += `  ${n.id}:shrine`; continue; }
  const b = P.build(n); let w = 0, T = 0, best = null;
  for (let i = 0; i < runs; i++) {
    const s = S.create(b.stage, { seed: 11 + i * 97, hero, node: b.node, kit: P.kit(p), boons: P.passives(p), gear: useGear ? VS.LOOT.mods(p, hero) : null }); let t = 0;
    let pt = 0, idle = 0, dealt = 0;
    while (!s.result && t < 400) {
      S.step(s, DT, S.bot(s, skill)); t += DT;
      // Stuck checks: the way on open for 30 s, or foes standing for 30 s without a blow landing on them.
      if (s.portal && !s.transit) { if ((pt += DT) > 30) { bad(`${n.id} stuck before the portal (seed ${11 + i * 97})`); break; } } else pt = 0;
      const live = S.foes(s).filter((u) => u.state !== 'spawn').length;
      if (live && s.stats.dealt === dealt && !s.cine) { if ((idle += DT) > 30) { bad(`${n.id} no blow landed for 30 s with ${live} foes up (seed ${11 + i * 97}) at ${S.foes(s).map((u) => u.key + '@' + Math.round(u.x) + ',' + Math.round(u.y)).join(' ')}`); break; } } else { idle = 0; dealt = s.stats.dealt; }
    }
    if (!s.result && t >= 400) bad(`${n.id} timed out (seed ${11 + i * 97})`);
    const r = { win: s.result === 'win', time: s.time, hpFrac: s.hero.hp / s.hero.maxHp, bossHits: s.stats.bossHits, maxCombo: s.stats.maxCombo, kills: 0 };
    if (r.win) { w++; if (!best) best = r; } T += s.time;
  }
  rows.push({ id: n.id, win: w / runs, t: T / runs });
  P.finish(p, n.id, Object.assign({ rand, chests: rand() < 0.5 ? ['wood'] : [] }, best || { win: true, time: 999, hpFrac: 0.3, bossHits: 9, maxCombo: 0 }));   // the player keeps going until they win
  if (useGear) VS.LOOT.autoEquip(p, hero);
  line += `  ${n.id}:${Math.round(w / runs * 100)}%/${Math.round(T / runs)}s`;
}
console.log(line);
const avg = rows.reduce((a, r) => a + r.win, 0) / rows.length;
const G = VS.LOOT.mods(p, hero); console.log(`gear: ${p.bag.length} items, ${p.gold} gold, +${Math.round((G.dmg - 1) * 100)}% damage, +${G.hp} health, ${Math.round(G.armor * 100)}% armour`);
console.log(`hero ${hero}, skill ${skill}: average win ${Math.round(avg * 100)}%, level ${p.lvl}, skills ${p.skills.length}/${P.SKILLS.length} (${p.sp} sp left), heroes ${p.heroes.join(' ')}, stars ${P.totalStars(p)}/${P.maxStars()}`);
const walls = rows.filter((r) => r.win === 0); if (walls.length) console.log('never won:', walls.map((r) => r.id).join(' '));
console.log(fails ? fails + ' failures' : 'campaign sound');
process.exit(fails ? 1 : 0);
