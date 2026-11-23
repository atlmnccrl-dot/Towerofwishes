// The run's pure rules (js/game/run.js): the route maps for many seeds, newRun, moving along the map, the act
// change, endRun and what it pays into meta, the migration of the old v2 save, the Tower, the talents, the shop.
// node bellmourn/test/run-test.mjs [seeds=300]
import * as R from '../js/game/run.js';
import { freshSave } from '../js/game/progress.js';
import { HEROES, HERO_ORDER, START_HEROES, heroStats } from '../js/game/heroes.js';

const N = +(process.argv[2] || 300);
let fail = 0, checks = 0; const ok = (c, m) => { checks++; if (!c) { fail++; if (fail < 40) console.log('  FAIL', m); } };

// ---------------------------------------------------------------- maps
const areaCount = []; const seenAreas = new Set(); const kinds = {};
for (let s = 1; s <= N; s++) {
  const seed = (s * 2654435761) >>> 0; let total = 0;
  for (const act of [1, 2, 3]) {
    const map = R.buildMap(seed, act, R.freshMeta());
    const byId = new Map(map.nodes.map((n) => [n.id, n]));
    ok(map.nodes.length === byId.size, `seed ${seed} act ${act}: ids unique`);
    ok(map.start.length >= 1 && map.start.every((id) => byId.has(id)), `seed ${seed} act ${act}: a start`);
    const bosses = map.nodes.filter((n) => n.kind === 'boss');
    ok(bosses.length === 1, `seed ${seed} act ${act}: one boss`);
    const boss = bosses[0]; const maxRow = Math.max(...map.nodes.map((n) => n.row));
    ok(boss && boss.row === maxRow && boss.next.length === 0, `seed ${seed} act ${act}: the boss is last`);
    ok(boss && boss.area === R.ACTS[act].boss, `seed ${seed} act ${act}: the act's boss area`);
    for (const n of map.nodes) {
      kinds[n.kind] = (kinds[n.kind] || 0) + 1;
      ok(n.x >= 0 && n.x <= 1 && n.y >= 0 && n.y <= 1, `${n.id}: x, y in 0..1`);
      ok(n.next.every((id) => byId.has(id) && byId.get(id).row === n.row + 1), `${n.id}: edges go one row up`);
      if (n !== boss) ok(n.next.length >= 1, `${n.id}: leads on`);
      ok(typeof n.label === 'string' && n.label && n.icon, `${n.id}: label and icon`);
      if (n.kind === 'area' || n.kind === 'boss') { ok(!!R.AREA_NAMES[n.area] && n.tier !== undefined, `${n.id}: a known area with a tier`); seenAreas.add(n.area); }
    }
    // every node reached from the start, and every node reaches the boss
    const reach = new Set(map.start); const q = [...map.start];
    while (q.length) for (const id of byId.get(q.shift()).next) if (!reach.has(id)) { reach.add(id); q.push(id); }
    ok(reach.size === map.nodes.length, `seed ${seed} act ${act}: every node reachable (${reach.size}/${map.nodes.length})`);
    const toBoss = new Set([boss.id]); let grew = true;
    while (grew) { grew = false; for (const n of map.nodes) if (!toBoss.has(n.id) && n.next.some((id) => toBoss.has(id))) { toBoss.add(n.id); grew = true; } }
    ok(toBoss.size === map.nodes.length, `seed ${seed} act ${act}: every node reaches the boss`);
    // every route: the same number of areas, no area twice
    const counts = new Set(); let routes = 0;
    const walk = (id, areas) => { const n = byId.get(id); const a = n.kind === 'area' || n.kind === 'boss' ? [...areas, n.area] : areas; if (!n.next.length) { routes++; counts.add(a.length); ok(new Set(a).size === a.length, `seed ${seed} act ${act}: a route visits ${a.join(',')}`); return; } for (const x of n.next) walk(x, a); };
    for (const id of map.start) walk(id, []);
    ok(counts.size === 1, `seed ${seed} act ${act}: every route has the same number of areas`);
    const per = [...counts][0]; total += per;
    ok(per === { 1: 5, 2: 3, 3: 2 }[act], `seed ${seed} act ${act}: ${per} areas a route`);
    ok(routes >= 2, `seed ${seed} act ${act}: more than one route (${routes})`);
    // the map is the same for the same seed
    ok(JSON.stringify(R.buildMap(seed, act, R.freshMeta())) === JSON.stringify(map), `seed ${seed} act ${act}: deterministic`);
  }
  areaCount.push(total);
}
ok(areaCount.every((n) => n === 10), 'about 10 areas a run (every run: ' + [...new Set(areaCount)].join(',') + ')');
ok(seenAreas.size === 15, 'every area appears in some run (' + seenAreas.size + '/15)');
for (const k of ['area', 'boss', 'event', 'shrine', 'merchant', 'trial']) ok(kinds[k] > 0, 'node kind ' + k + ' appears');
console.log(`maps: ${N} seeds x 3 acts; areas a run: ${[...new Set(areaCount)]}; node kinds: ${JSON.stringify(kinds)}`);

// quest nodes from a provider are inserted into a row of small nodes and keep the map valid
R.setProviders({ quests: { questNodes: (run, meta) => (meta.hints && meta.hints.toy ? [{ quest: 'vesper', act: 1, label: "TAM'S TOY BELL" }] : []) } });
{
  const meta = R.freshMeta(); meta.hints.toy = true;
  for (let s = 1; s <= 40; s++) {
    const map = R.buildMap(s * 977, 1, meta, { act: 1 }); const q = map.nodes.filter((n) => n.kind === 'quest');
    ok(q.length === 1 && q[0].quest === 'vesper' && q[0].next.length === 1, `seed ${s}: the quest node sits in the map`);
    const byId = new Map(map.nodes.map((n) => [n.id, n])); const reach = new Set(map.start); const qq = [...map.start];
    while (qq.length) for (const id of byId.get(qq.shift()).next) if (!reach.has(id)) { reach.add(id); qq.push(id); }
    ok(reach.size === map.nodes.length, `seed ${s}: the quest node is reachable`);
  }
  ok(R.buildMap(5, 1, R.freshMeta(), { act: 1 }).nodes.every((n) => n.kind !== 'quest'), 'no hint, no quest node');
}
R.setProviders({ quests: null });

// ---------------------------------------------------------------- newRun, moving, the act change
{
  const meta = R.freshMeta(); meta.tower.purse = 2; meta.tower.reroll = 1;
  const run = R.newRun(meta, 'huntress', 777);
  ok(run.hero === 'huntress' && run.act === 1 && run.at === null && run.map && run.map.act === 1, 'newRun: hero, act 1, at the start');
  ok(run.embers === 80 && run.rerolls === 1, 'newRun: the Tower fills the purse and the dice (' + run.embers + ', ' + run.rerolls + ')');
  ok(Array.isArray(run.boons) && Array.isArray(run.echoes) && run.stats && run.quest && Array.isArray(run.quest.active), 'newRun: the shapes of the contract');
  ok(JSON.parse(JSON.stringify(run)).map.nodes.length === run.map.nodes.length, 'the run survives JSON');
  ok(R.nextNodes(run).length === 1 && R.nextNodes(run)[0].area === 'gate', 'the first node is Gallows Gate');
  ok(R.enterNode(run, '1-8-0') === null, 'cannot jump to the boss');
  const g = R.enterNode(run, R.nextNodes(run)[0].id); ok(g && run.at === g.id && run.depth === 1, 'enterNode');
  ok(R.nextNodes(run).length === 0, 'nothing ahead until the node is cleared');
  R.completeNode(run, { boss: 'gaoler', echo: 'gaoler' });
  ok(run.stats.areas.includes('gate') && run.stats.bosses.includes('gaoler') && run.echoes.includes('gaoler'), 'completeNode notes the area, the boss and the Echo');
  ok(R.nextNodes(run).length >= 2, 'a choice after the gate');
  // walk the whole run, always the first choice
  let guard = 0;
  while (guard++ < 200) {
    const nx = R.nextNodes(run); if (!nx.length) { if (R.actOver(run)) { if (!R.advanceAct(run, meta)) break; continue; } ok(false, 'stuck at ' + run.at); break; }
    const n = R.enterNode(run, nx[guard % nx.length].id); R.completeNode(run, n.boss ? { boss: n.boss, echo: n.boss } : {});
  }
  ok(run.act === 3 && R.actOver(run), 'a whole run walks to the Empyrean');
  ok(run.stats.areas.length === 10, 'ten areas in the whole run (' + run.stats.areas.length + ')');
  ok(run.tier === 14, 'the deepest tier is the Empyrean\'s');
  ok(R.advanceAct(run, meta) === false, 'no act after the third');
  const st = R.applyRunStats(heroStats(R.statSave(run, meta), run.hero), run, meta);
  ok(st.maxHp > 0 && st.dmgMul > 1 && Number.isFinite(st.maxTonics), 'heroStats on the run\'s virtual save');
}

// talents and the Tower change the stats
{
  const meta = R.freshMeta(); meta.mastery.warden = { xp: R.masteryNeed(9), talents: [] };
  ok(R.masteryOf(meta, 'warden').level === 9 && R.talentSlots(9) === 3, 'mastery 9: three talent slots');
  ok(R.toggleTalent(meta, 'warden', 'vigor') === 'TALENT CHOSEN' && R.toggleTalent(meta, 'warden', 'edge') === 'TALENT CHOSEN', 'pick talents');
  R.toggleTalent(meta, 'warden', 'oath'); R.toggleTalent(meta, 'warden', 'flask');
  ok(meta.mastery.warden.talents.length === 3 && !meta.mastery.warden.talents.includes('vigor'), 'the oldest talent falls out past the slots');
  const low = R.freshMeta(); ok(R.toggleTalent(low, 'warden', 'focus').startsWith('MASTERY'), 'a locked talent cannot be picked');
  meta.tower.vigor = 2; meta.tower.mercy = 1;
  const run = R.newRun(meta, 'warden', 4);
  const base = heroStats(R.statSave(run, meta), 'warden'); const st = R.applyRunStats(base, run, meta);
  ok(st.dmgMul > base.dmgMul * 1.07 && st.maxTonics === 3 && st.revives >= 1 && st.maxHp >= Math.round(base.maxHp * 1.11), 'talents (edge, flask) and the Tower (vigor, mercy) apply');
  for (const id of HERO_ORDER) ok(R.talentsOf(id).length >= 6 && R.talentsOf(id).some((t) => t.level === 0), id + ': talents, one free from the start');
  const m2 = R.freshMeta(); m2.shards = 100;
  ok(R.buyTower(m2, 'flask') !== 'NOT ENOUGH SHARDS' && m2.shards === 60 && m2.tower.flask === 1, 'buy a Tower upgrade');
  ok(R.buyTower(m2, 'flask') === 'NOT ENOUGH SHARDS', 'not enough shards');
  m2.shards = 999; R.buyTower(m2, 'flask'); ok(R.buyTower(m2, 'flask') === 'FULLY BUILT', 'an upgrade stops at its max');
}

// the merchant
{
  const run = R.newRun(R.freshMeta(), 'bellbreaker', 9); run.embers = 1000; run.tonics = 1; run.at = 'x';
  const stock = R.merchantStock(run, 'node-a');
  ok(stock.some((i) => i.kind === 'tonic') && stock.some((i) => i.kind === 'relic') && stock.every((i) => i.price > 0), 'the merchant has tonics, relics, prices');
  ok(JSON.stringify(R.merchantStock(run, 'node-a')) === JSON.stringify(stock), 'the stock is stable for a node');
  const relic = stock.find((i) => i.kind === 'relic'); const r1 = R.buyItem(run, relic, 3);
  ok(r1.ok && run.relics.includes(relic.relic) && run.embers === 1000 - relic.price, 'buy a relic');
  ok(!R.buyItem(run, relic, 3).ok, 'a relic sells once');
  const t = R.buyItem(run, stock.find((i) => i.kind === 'tonic'), 3); ok(t.ok && run.tonics === 2, 'buy a tonic');
  run.embers = 0; ok(R.buyItem(run, stock.find((i) => i.kind === 'heal'), 3).msg === 'NOT ENOUGH EMBERS', 'not enough embers');
}

// ---------------------------------------------------------------- endRun
{
  const meta = R.freshMeta();
  const run = R.newRun(meta, 'warden', 31);
  Object.assign(run.stats, { kills: 120, perfects: 4, areas: ['gate', 'market', 'docks'], bosses: ['gaoler', 'tallow'] }); run.boons = [{ id: 'emberDash', rarity: 'rare' }]; run.echoes = ['gaoler'];
  const sum = R.endRun(meta, run, 'death');
  ok(sum.shards > 0 && meta.shards === sum.shards, 'endRun pays shards (' + sum.shards + ')');
  ok(sum.masteryXp > 0 && meta.mastery.warden.xp === sum.masteryXp, 'endRun pays mastery (' + sum.masteryXp + ')');
  ok(meta.runs === 1 && meta.best.act === 1, 'endRun counts the run and the best');
  ok(meta.codex.bosses.gaoler === 1 && meta.codex.boons.emberDash && meta.codex.echoes.gaoler, 'endRun fills the codex');
  ok(Array.isArray(sum.lines) && sum.lines.length >= 4 && sum.lines.every((l) => typeof l === 'string'), 'the summary has lines');
  ok(run.over === 'death', 'the run is over');
  const run2 = R.newRun(meta, 'warden', 32); run2.act = 3; run2.stats.areas = new Array(10).fill(0).map((_, i) => 'a' + i); run2.stats.bosses = ['wheel'];
  const s2 = R.endRun(meta, run2, 'ending:song');
  ok(s2.ending === 'song' && meta.codex.endings.includes('song') && s2.shards > sum.shards, 'an ending pays more and is remembered');
  // challenges from a provider: tracked at the end, their unlocks counted
  R.setProviders({ challenges: { CHALLENGES: [{ id: 'c1', title: 'Test' }], trackChallenges: (m, r, ev) => { if (ev.type === 'runEnd' && !m.done.includes('c1')) m.done.push('c1'); }, challengeUnlocks: (m) => (m.done.includes('c1') ? ['kestrel'] : []) } });
  const s3 = R.endRun(meta, R.newRun(meta, 'warden', 33), 'death');
  ok(s3.challengesDone.includes('c1') && s3.unlocks.includes('kestrel') && meta.unlocked.includes('kestrel'), 'challenges at the run end, and their unlocks');
  R.setProviders({ challenges: null });
}

// ---------------------------------------------------------------- migrateSave
{
  const v2 = freshSave('huntress');
  Object.assign(v2, { unlocked: [...START_HEROES, 'kestrel', 'lamplighter'], embers: 800, bosses: { gate: true, market: true, belfry: true }, echoes: ['gaoler', 'tallow'], endings: ['dawn'],
    seen: { 'prologue.road@0': true, 'belfry.bell@0': true, 'haven.ash@1': true }, tutorial: true, bestiary: { hushed: 40, ghoul: 3 } });
  v2.heroes.huntress.level = 12;
  const m = R.migrateSave(v2);
  ok(m.v === 3 && R.upgradeMeta(m), 'migrateSave makes a meta v3');
  ok(['warden', 'huntress', 'bellbreaker', 'kestrel', 'lamplighter'].every((id) => m.unlocked.includes(id)), 'the unlocked wardens are kept');
  ok(m.story.seen['prologue.road'] && m.story.seen['belfry.bell'] && m.story.seen['haven.ash'] && m.story.seen.tutorial, 'the story seen is kept (without the New Game+ suffix)');
  ok(m.shards > 0 && m.codex.foes.hushed === 40 && m.codex.echoes.gaoler && m.codex.bosses.silence && m.codex.endings.includes('dawn'), 'the rest is carried: shards, bestiary, Echoes, bosses, endings');
  ok(m.mastery.huntress && m.mastery.huntress.xp > 0, 'levels become mastery');
  ok(m.best.act === 2, 'the furthest act reached');
  ok(R.migrateSave(null).v === 3 && R.migrateSave({}).unlocked.length === START_HEROES.length, 'migrateSave copes with nothing');
  const bad = R.upgradeMeta({ v: 3, unlocked: 'x', codex: null, story: 5 });
  ok(bad && Array.isArray(bad.unlocked) && bad.codex.endings && bad.story.seen, 'upgradeMeta repairs a broken meta');
  ok(R.upgradeMeta({ v: 2 }) === null, 'upgradeMeta refuses another version');
}
for (const id of HERO_ORDER) ok(!!HEROES[id], id + ' exists');

console.log(fail ? `${fail} of ${checks} checks FAILED` : `all ${checks} checks pass`);
process.exit(fail ? 1 : 0);
