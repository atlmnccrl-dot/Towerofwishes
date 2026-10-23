// Walks every path through the campaign graph and plays each battle in the sim.
// Usage: node test/story-test.js [fightsPerBattle]
'use strict';
const assert = require('assert');
const Story = require('../js/story.js');
const Sim = require('../js/sim.js');

const N = Number(process.argv[2]) || 6;
const DT = 1 / 60;

// 1. Every node is well formed and every link resolves.
for (const [id, n] of Object.entries(Story.NODES)) {
  const links = [];
  if (n.next && n.next !== 'map') links.push(n.next);
  if (n.win && n.win !== 'map') links.push(n.win);
  if (n.lose && n.lose !== 'map') links.push(n.lose);
  for (const o of n.options || []) if (o.next !== 'map') links.push(o.next);
  for (const l of links) assert(Story.NODES[l], `${id} links to missing node ${l}`);
  if (n.type === 'battle') assert(Sim.SCENARIOS[n.scenario], `${id}: unknown scenario ${n.scenario}`);
  assert(n.chapter === 'side' || Story.CHAPTERS.some((c) => c.id === n.chapter), `${id}: unknown chapter ${n.chapter}`);
}
for (const c of Story.CHAPTERS) assert(Story.NODES[c.from], `chapter ${c.id} starts at missing node`);

// 2. Play one battle; returns the outcome.
function fight(spec, seed) {
  const s = Sim.createMatch({ seed, scenario: spec.scenario, party: spec.party, mods: spec.mods, allyLevel: spec.allyLevel });
  while (!s.result && s.t < 240) {
    Sim.step(s, DT);
    for (const u of s.units) assert(Number.isFinite(u.x) && Number.isFinite(u.y), 'NaN position');
    s.fx.length = 0; s.log.length = 0;
  }
  return s.result ? s.result.outcome : 'timeout';
}

// 3. Walk every combination of choices (depth first); battles are won by
//    retrying, and we record each battle's win rate per branch.
const stats = new Map();
let endings = 0;
function walk(st, depth) {
  assert(depth < 200, 'story loops');
  const n = Story.node(st);
  if (n.type === 'end') { endings++; return; }
  if (n.type === 'scene' || n.type === 'fork') {
    const ls = Story.lines(st);
    assert(ls.length, `${st.node}: no lines for this branch`);
    for (const l of ls) assert(l.silent || (typeof l.text === 'string' && l.text.length), `${st.node}: empty line`); // (silent beats are shots without words)
  }
  if (n.type === 'select') {
    for (const k of Object.keys(Story.STARTERS)) { const c = clone(st); Story.pickStarter(c, k); walk(c, depth + 1); }
    return;
  }
  if (n.type === 'fork') {
    let open = 0;
    n.options.forEach((o, i) => {
      if (!Story.optionOpen(st, o)) return;
      open++;
      const c = clone(st); Story.choose(c, i); walk(c, depth + 1);
    });
    assert(open > 0, `${st.node}: no option available`);
    return;
  }
  if (n.type === 'battle') {
    const spec = Story.battle(st);
    const key = `${st.node} ${st.starter || '-'} party=${spec.party.map((p) => p.key + p.level).join('+') || 'climber'} ${JSON.stringify(spec.mods || {})}`;
    if (!stats.has(key)) {
      let win = 0, timeouts = 0;
      for (let seed = 1; seed <= N; seed++) {
        const o = fight(spec, seed);
        if (o === 'win') win++;
        if (o === 'timeout') timeouts++;
      }
      stats.set(key, { win, timeouts });
    }
    const c = clone(st);
    Story.finishBattle(c, 'win');
    walk(c, depth + 1);
    return;
  }
  const c = clone(st); Story.advance(c); walk(c, depth + 1);
}
function clone(st) { return JSON.parse(JSON.stringify(st)); }

walk(Story.fresh(), 0);

// 4. The prologue is all cutscene (the climber's fight is filmed); the first fight is Kael's in the
// clearing, and it carries the tutorial. Losing a story fight keeps you there.
{
  const st = Story.fresh();
  while (Story.node(st).type !== 'battle') Story.advance(st);
  assert.strictEqual(Story.cur(st), 'c1.fight', 'the first fight should be Kael\'s in the clearing');
  assert.ok(Story.node(st).tutorial, 'the first fight should carry the tutorial');
  const s2 = Story.fresh(); s2.node = 'c1.fight';
  Story.finishBattle(s2, 'loss');
  assert.strictEqual(s2.node, 'c1.fight');
  Story.finishBattle(s2, 'win');
  assert.strictEqual(Story.teamLevel(s2), 2);
}

let bad = 0;
for (const [k, v] of [...stats.entries()].sort()) {
  const rate = Math.round((100 * v.win) / N);
  if (v.timeouts) bad++;
  console.log(`${String(rate).padStart(3)}%  ${v.timeouts ? 'TIMEOUTS ' + v.timeouts + '  ' : ''}${k}`);
}
console.log(`${endings} paths reach the end; ${stats.size} distinct battles`);
if (bad) { console.error('battles timed out'); process.exit(1); }
console.log('story ok');
