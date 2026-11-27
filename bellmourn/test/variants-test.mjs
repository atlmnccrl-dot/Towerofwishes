// Variants, events and quests (Node, no browser): every variant of every area applies without error and keeps the
// level sound (known foe types and elements, blocks off the start and the foes, gates that exist in the level's
// def, touches on foe spots, a short cut that drops what it says); the event deck deals and resolves every choice
// of every card in every act; the quest lines run from hint to friend.
// node bellmourn/test/variants-test.mjs
// (Reachability under each variant is a browser check: test/level-check.js <id> --variant=all [--short].)
import LEVELS from '../js/world/levels/index.js';
import { VARIANTS, CONDITIONS, ELEMENTS, SHORT, applyVariant, pickVariant, getVariant, noteVariant, mulberry } from '../js/game/variants.js';
import { EVENTS, CURSES, LORE, MEMORIES, ART_SCENES, RELIC_POOL, pickEvent, resolveEvent, dealEvent, applyChanges, noteEvent } from '../js/game/events.js';
import { QUESTS, HINTS, hintsIn, questNodes, onHint, findHint, advanceQuest } from '../js/game/quests.js';
import { FOES, BOSSES } from '../js/game/defs.js';
import { UNITS } from '../js/game/units.js';
import { AFFIXES, HEROES, RELICS } from '../js/game/heroes.js';

let fail = 0, checks = 0; const ok = (c, m) => { checks++; if (!c) { fail++; console.log('  FAIL', m); } };
const known = (t) => !!(FOES[t] || UNITS[t]);
const AREAS = ['gate', 'market', 'docks', 'nave', 'undercroft', 'foundry', 'heights', 'belfry', 'frostmarch', 'ashdunes', 'catacombs', 'abyss', 'marsh', 'spire', 'empyrean'];
const NEW_BOSSES = ['kingcrab', 'hollowmother', 'ronin', 'smiling', 'pyresaint'];

// ---------------------------------------------------------------- variants
console.log('variants');
for (const id of AREAS) {
  const def = LEVELS[id]; const list = VARIANTS[id];
  ok(list && list.length >= 3, `${id}: at least 3 variants (${list && list.length})`);
  ok(def.variants === list, `${id}: def.variants is the registry's list`);
  ok(new Set(list.map((v) => v.condition)).size === list.length, `${id}: every variant has its own condition`);
  ok(SHORT[id] && SHORT[id].start, `${id}: has a short cut`);
  const marks = new Set(); // gate names the level's def mentions (its build makes them; level-check checks the build)
  for (const e of def.encounters || []) for (const g of [...(e.gates || []), ...(e.opens || [])]) marks.add(g);
  for (const g of [...(def.gatesOpen || []), ...((def.boss && def.boss.gates) || []), ...((def.boss && def.boss.opens) || [])]) marks.add(g);
  for (const v of list) {
    const tag = v.id;
    ok(CONDITIONS[v.condition], `${tag}: known condition ${v.condition}`);
    ok(v.name && v.tagline, `${tag}: a name and a tagline`);
    ok(Array.isArray(v.bossPool) && v.bossPool.length, `${tag}: a boss pool`);
    for (const b of v.bossPool) ok(BOSSES[b] || NEW_BOSSES.includes(b) || ['harbormaster', 'ossuary', 'founder', 'regent', 'frostgiant', 'sandwyrm', 'lich', 'archon', 'bogmother', 'clockmaster', 'wheel', 'gaoler', 'tallow', 'deacon', 'silence'].includes(b), `${tag}: known boss ${b}`);
    ok(v.bossPool.includes(def.boss.type) || NEW_BOSSES.some((b) => v.bossPool.includes(b)), `${tag}: the pool holds the area's boss or a new one`);
    for (const k of Object.keys(v.elements)) ok(ELEMENTS.includes(k), `${tag}: element ${k} is one of the seven`);
    for (const [a, b] of Object.entries(v.pool)) ok(known(b), `${tag}: pool ${a} -> ${b} is a known foe`);
    for (const g of v.layout.gatesOpen || []) ok(marks.has(g), `${tag}: gatesOpen ${g} is one of the level's gates`);
    for (const blk of v.layout.blocks || []) { ok(blk.length === 5 && ['rubble', 'fire', 'flood', 'ice', 'bones', 'barricade', 'roots', 'glass', 'ash'].includes(blk[4]), `${tag}: block ${blk}`); }
    for (const short of [false, true]) {
      let d; try { d = applyVariant(def, v, { short }); } catch (e) { ok(false, `${tag}${short ? ' short' : ''}: applyVariant threw ${e.message}`); continue; }
      const st = d.start; const T = tag + (short ? ' short' : '');
      ok(typeof d.build === 'function' && d.variant === v && d.ambience && d.bounds === def.bounds, `${T}: an applied def`);
      ok(d.ambience !== def.ambience && def.ambience.fog === LEVELS[id].ambience.fog, `${T}: ambience overridden, the base untouched`);
      for (const k of ['fog', 'hemiSky', 'moonColor', 'fillColor']) if (d.ambience[k] !== undefined) ok(Number.isInteger(d.ambience[k]) && d.ambience[k] >= 0 && d.ambience[k] <= 0xffffff, `${T}: ${k} is a colour`);
      ok((v.layout.blocks || []).every((b) => Math.abs(st.x - b[0]) > b[2] / 2 + 0.8 || Math.abs(st.z - b[1]) > b[3] / 2 + 0.8), `${T}: no block on the start`);
      const all = [...d.foes, ...d.encounters.flatMap((e) => e.waves.flatMap((w) => w.foes))];
      for (const f of all) {
        ok(known(f.t), `${T}: known foe ${f.t}`);
        if (f.element) ok(ELEMENTS.includes(f.element), `${T}: element ${f.element}`);
        if (f.elite) ok(AFFIXES[f.elite], `${T}: elite affix ${f.elite}`);
        ok(!(v.layout.blocks || []).some((b) => Math.abs(f.x - b[0]) < b[2] / 2 + 0.4 && Math.abs(f.z - b[1]) < b[3] / 2 + 0.4), `${T}: no foe under a block (${f.t} ${f.x},${f.z})`);
      }
      ok(all.some((f) => f.element), `${T}: the condition gives some foes an element`);
      for (const e of d.encounters) if (!e.ambush) for (const w of e.waves) for (const f of w.foes) ok(!['acolyte', 'shade', 'imp', 'marshwitch'].includes(f.t) || (def.encounters.find((x) => x.id === e.id) || { waves: [] }).waves.some((ww) => ww.foes.some((g) => g.t === f.t)), `${T}: no blinker swapped into the locked room ${e.id}`);
      for (const g of d.gatesOpen) ok(marks.has(g), `${T}: gatesOpen ${g} known`);
      if (short) {
        ok(d.layout.short && d.start.x === (v.layout.shortStart || SHORT[id].start).x, `${T}: the short start`);
        for (const e of SHORT[id].drop) ok(!d.encounters.some((x) => x.id === e), `${T}: dropped encounter ${e}`);
        const fights = d.encounters.filter((e) => !e.ambush).length; ok(fights >= 1 && fights <= 2, `${T}: one or two fights (${fights})`);
      }
      if (v.events.includes('ambush') && d.encounters.some((e) => e.ambush)) { const a = d.encounters.find((e) => e.ambush); ok(a.waves[0].foes.length >= 2 && a.gates.length === 0, `${T}: the ambush rises from the loose foes, no gate`); }
      if (v.events.includes('elite')) ok(d.foes.some((f) => f.wander && f.elite), `${T}: a wandering elite`);
      for (const t of d.touches) { ok(['note', 'mark', 'voice', 'survivor', 'cursedlamp'].includes(t.kind) && Number.isFinite(t.x) && Number.isFinite(t.z) && t.id, `${T}: touch ${t.id}`); ok(d.hints.some((h) => h.text === t.near), `${T}: a soft line near ${t.id}`); }
      for (const ev of ['survivor', 'cursedlamp']) if (v.events.includes(ev)) ok(d.touches.some((t) => t.kind === ev), `${T}: ${ev} touch placed`);
      ok(d.touches.length === new Set(d.touches.map((t) => t.id)).size, `${T}: touches are unique`);
    }
  }
  // the base def applied with no variant and no cut is the same level
  const plain = applyVariant(def, null, {}); ok(plain.foes.length === def.foes.length && plain.start === def.start, `${id}: no variant leaves the level as it is`);
}
// pickVariant: deterministic for a seed, prefers new conditions, favours an active quest's hint
{
  const a = pickVariant('docks', mulberry(5), {}), b = pickVariant('docks', mulberry(5), {}); ok(a.id === b.id, 'pickVariant: same seed, same variant');
  const counts = {}; const run = { flags: { conditions: ['fog', 'storm'] } };
  for (let i = 0; i < 600; i++) { const v = pickVariant('docks', mulberry(i + 1), run); counts[v.condition] = (counts[v.condition] || 0) + 1; }
  ok(counts.flooded > counts.fog && counts.flooded > counts.storm, 'pickVariant: prefers a condition the run has not met ' + JSON.stringify(counts));
  const q = { hero: 'warden', quest: { active: ['hollis'] }, flags: {} }; let hits = 0; for (let i = 0; i < 600; i++) if (pickVariant('docks', mulberry(i + 7), q).id === 'docks.flooded') hits++;
  ok(hits > 300, 'pickVariant: favours the variant holding an active quest\'s hint (' + hits + '/600)');
  const r = { flags: {} }; noteVariant(r, getVariant('gate', 'fog')); ok(r.flags.conditions[0] === 'fog', 'noteVariant records the condition');
  ok(getVariant('gate', 'gate.fog') && getVariant('gate', 'fog') && !getVariant('gate', 'nope'), 'getVariant by full or short id');
}

// ---------------------------------------------------------------- events
console.log('events');
const ids = Object.keys(EVENTS); const deck = ids.filter((i) => EVENTS[i].kind !== 'quest');
ok(deck.length >= 40, `at least 40 events in the deck (${deck.length})`);
for (const a of [1, 2, 3]) ok(deck.filter((i) => EVENTS[i].acts.includes(a)).length >= 12, `act ${a} has at least 12 events`);
const outcomeKinds = new Set();
for (const id of ids) {
  const ev = EVENTS[id];
  ok(ev.title && ev.text && ev.art && ART_SCENES.includes(ev.art.scene) && Array.isArray(ev.art.palette) && ev.art.palette.length === 4, `${id}: title, text, art`);
  ok(ev.choices.length >= 2 && ev.choices.length <= 3, `${id}: 2-3 choices`);
  ok(ev.text.length <= 140, `${id}: a short text (${ev.text.length})`);
  for (const a of ev.acts) {
    const run = { act: a, hero: 'bellbreaker', hp: 80, maxHp: 100, embers: 2000, tonics: 3, curses: [], relics: [], flags: {}, stats: {}, quest: { active: [] } };
    const dealt = dealEvent(run, id); ok(dealt && dealt.choices.length === ev.choices.length && dealt.choices.every((c, i) => c.label && c.disabled === !!(ev.choices[i].needs && ev.choices[i].needs.notHero === run.hero)), `${id} act ${a}: dealt, every choice kept in place, affordable to a rich run`);
    dealt.choices.forEach((c, i) => { if (c.disabled) return;
      for (let s = 0; s < 4; s++) {
        const meta = { hints: {}, quests: {}, friends: [], codex: { lore: {} } }; const r = JSON.parse(JSON.stringify(run));
        const res = resolveEvent(r, meta, id, i, mulberry(s * 13 + i));
        ok(Array.isArray(res.lines) && res.lines.length && res.changes, `${id}/${i}: an outcome with lines`);
        for (const k of Object.keys(res.changes)) outcomeKinds.add(k);
        if (res.changes.curse) ok(CURSES[res.changes.curse], `${id}/${i}: known curse`);
        if (res.changes.relic) ok(RELICS[res.changes.relic], `${id}/${i}: known relic ${res.changes.relic}`);
        if (res.changes.lore) ok(LORE[res.changes.lore], `${id}/${i}: known lore`);
        if (res.changes.memory) ok(MEMORIES[res.changes.memory] && HEROES[res.changes.memory], `${id}/${i}: known memory`);
        if (res.changes.hint) ok(HINTS[res.changes.hint], `${id}/${i}: known hint`);
        if (res.changes.quest) ok(QUESTS[res.changes.quest], `${id}/${i}: known quest`);
        if (res.changes.fight) ok(res.changes.fight.foes.every(known) && ELEMENTS.includes(res.changes.fight.element), `${id}/${i}: a fight of known foes`);
        if (c.cost && c.cost.embers) ok(res.changes.embers <= 0 || (res.changes.embers !== undefined), `${id}/${i}: the cost is paid`);
        const ap = applyChanges(r, meta, res.changes);
        ok(r.hp >= 1 && r.hp <= r.maxHp && r.embers >= 0 && r.tonics >= 0, `${id}/${i}: the run stays sane after applying (hp ${r.hp}/${r.maxHp}, embers ${r.embers})`);
        ok(ap && ap.pending, `${id}/${i}: applyChanges returns pending`);
      }
    });
  }
}
for (const k of ['embers', 'hp', 'hpPct', 'tonics', 'boon', 'curse', 'relic', 'hint', 'freed', 'memory', 'lore', 'quest', 'uncurse', 'maxHp', 'fight']) ok(outcomeKinds.has(k), `some event outcome gives ${k}`);
// costs scale with the act; an unaffordable choice is marked
{
  const poor = { act: 1, embers: 0, tonics: 0, hp: 50, maxHp: 100, flags: {} }; const d = dealEvent(poor, 'toll_collector'); ok(d.choices[0].disabled && !d.choices[1].disabled, 'an unaffordable choice is disabled');
  const c1 = dealEvent({ act: 1, embers: 9999 }, 'shadow_merchant').choices[0].cost.embers, c3 = dealEvent({ act: 3, embers: 9999 }, 'shadow_merchant').choices[0].cost.embers; ok(c3 > c1 * 3, `costs scale with the act (${c1} -> ${c3})`);
}
// pickEvent: act filter, never twice in a run, low health draws healing
{
  const run = { act: 2, hp: 90, maxHp: 100, embers: 50, flags: {}, quest: { active: [] } }; const seen = new Set();
  for (let i = 0; i < 30; i++) { const e = pickEvent(run, {}, mulberry(i + 3)); ok(e && EVENTS[e.id].acts.includes(2), 'pickEvent: an act II card'); ok(!seen.has(e.id) || seen.size >= deck.filter((x) => EVENTS[x].acts.includes(2)).length, 'pickEvent: never twice in a run'); seen.add(e.id); noteEvent(run, e.id); }
  let heal = 0, healLow = 0; for (let i = 0; i < 400; i++) { if (EVENTS[pickEvent({ act: 1, hp: 90, maxHp: 100, flags: {} }, {}, mulberry(i + 99)).id].tags.includes('heal')) heal++; if (EVENTS[pickEvent({ act: 1, hp: 20, maxHp: 100, flags: {} }, {}, mulberry(i + 99)).id].tags.includes('heal')) healLow++; }
  ok(healLow > heal * 1.4, `pickEvent: low health draws healing (${heal} -> ${healLow} of 400)`);
  ok(!Object.values(EVENTS).some((e) => e.kind === 'quest' && pickEvent({ act: 1, flags: { events: deck } }, {}, mulberry(1)).id === e.id), 'pickEvent never deals a quest step');
}

// ---------------------------------------------------------------- quests
console.log('quests');
const heroes = Object.values(QUESTS).map((q) => q.hero);
ok(new Set(heroes).size === 7 && heroes.every((h) => HEROES[h]), 'one quest line per warden, seven in all');
for (const [qid, Q] of Object.entries(QUESTS)) {
  ok(Q.steps.length >= 2 && Q.steps.length <= 3, `${qid}: 2-3 steps`);
  Q.steps.forEach((S, k) => {
    const h = HINTS[S.hint]; ok(h && h.quest === qid && h.step === k, `${qid} step ${k}: its hint`);
    ok(EVENTS[S.node.event] && EVENTS[S.node.event].quest === qid, `${qid} step ${k}: its event ${S.node.event}`);
    ok(EVENTS[S.node.event].choices.every((c) => (c.do || c.roll[0]).changes.quest === qid), `${qid} step ${k}: every choice advances the line`);
    for (const vid of h.in) { const [lid] = vid.split('.'); const v = getVariant(lid, vid); ok(v && v.events.includes('hint'), `${S.hint}: placed in ${vid}, which holds a hint event`); }
    if (S.node.encounter) ok(S.node.encounter.foes.every(known), `${qid} step ${k}: encounter foes known`);
  });
}
// every 'hint' variant event places a quest hint
for (const id of AREAS) for (const v of VARIANTS[id]) if (v.events.includes('hint')) ok(hintsIn(id, v).length > 0, `${v.id}: its hint event has a quest hint to place`);
// a full line: hint (touch) -> quest node -> event -> next hint -> ... -> friend
{
  const meta = { hints: {}, quests: {}, friends: [], codex: { lore: {} } }; const run = { act: 1, hero: 'warden', flags: {}, quest: { active: [] }, stats: {}, embers: 100 };
  ok(hintsIn('docks', getVariant('docks', 'docks.fog'), meta, run).some((h) => h.id === 'q.vesper.1'), 'the first hint waits in docks.fog');
  ok(!hintsIn('docks', getVariant('docks', 'docks.fog'), meta, { hero: 'huntress' }).length, 'never the line of the warden being played');
  ok(questNodes(run, meta).length === 0, 'no quest node before a hint is found');
  const game = { run, meta, level: { marks: {} } }; const r1 = onHint(game, 'q.vesper.1');
  ok(meta.hints['q.vesper.1'] && run.quest.active.includes('vesper') && r1.lines.length, 'onHint finds the hint and starts the quest');
  let nodes = questNodes(run, meta); ok(nodes.length === 1 && nodes[0].kind === 'quest' && nodes[0].event === 'q_vesper_1', 'a quest node appears');
  const res = resolveEvent(run, meta, nodes[0].event, 0, mulberry(1)); applyChanges(run, meta, res.changes);
  ok(meta.quests.vesper === 1 && questNodes(run, meta).length === 0, 'the step is done; the next node waits for its hint');
  ok(!hintsIn('docks', getVariant('docks', 'docks.fog'), meta, run).length && hintsIn('market', getVariant('market', 'market.frozen'), meta, run).length === 1, 'the next hint moves to the next place');
  findHint(meta, run, 'q.vesper.2'); nodes = questNodes(run, meta); ok(nodes.length === 1 && nodes[0].step === 1, 'the second node');
  const res2 = resolveEvent(run, meta, nodes[0].event, 0, mulberry(2)); const ap = applyChanges(run, meta, res2.changes);
  ok(meta.friends.includes('huntress') && ap.pending.friend === 'huntress', 'the last step befriends Vesper (meta.friends)');
  ok(advanceQuest(meta, run, 'vesper').lines.length === 0, 'a finished line does not advance again');
  // an act-gated node waits for its act
  findHint(meta, run, 'q.bram.1'); meta.quests.bram = 1; findHint(meta, run, 'q.bram.2');
  ok(!questNodes({ ...run, act: 1 }, meta).some((n) => n.quest === 'bram') && questNodes({ ...run, act: 2, flags: {} }, meta).some((n) => n.quest === 'bram'), 'a node waits for its act');
  // the in-level events' touches
  const g2 = { run: { act: 2, embers: 0, stats: {} }, meta: {}, level: { marks: {} } }; const s = onHint(g2, 'ev:survivor:docks'); ok(g2.run.embers > 0 && g2.run.stats.freed === 1 && s.lines.length, 'a freed survivor gives embers and counts');
}

console.log(`\n${checks} checks, ${fail} failed`);
process.exit(fail ? 1 : 0);
