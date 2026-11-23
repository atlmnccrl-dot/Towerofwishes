// Side quests (RUN_DESIGN section 5): one quest line per warden, two or three steps across runs. Following a
// line befriends that warden (meta.friends); a friend arrives as an ally when the Wheel enters its second stage.
// Pure data and functions: no DOM.
//
// How a step works:
//  1. a HINT waits in one or two area variants (hintsIn): a small glowing prop the hero can walk into. It is
//     placed only when the variant holds an in-level 'hint' event, and only while the step is the next one.
//     How a player notices it: a faint coloured glow on the floor with a mote of light bobbing over it (a note:
//     gold, a mark: ice blue, a voice: violet rings), and a soft line when the hero comes within a few steps
//     ("A CHILD IS HUMMING SOMEWHERE IN THE FOG."). Some hints come from event outcomes instead.
//  2. found, the hint is kept for good (meta.hints) and the quest goes on the run's list (run.quest.active);
//  3. a QUEST node then appears on the route map (questNodes) from the act the step names, this run or a later one;
//  4. the node plays a short special encounter (node.encounter: a TRIAL-like fight game.js runs, optional) and the
//     step's event (events.js); its outcome advances the quest (changes.quest), and the last step writes
//     meta.friends.
// Walking into a touch calls onHint(game, id) (game.js, A). It also serves the in-level events' touches
// (ev:survivor:*, ev:cursedlamp:*). Every player-facing text here is PROPOSAL.

export const QUESTS = {
  vesper: {
    id: 'vesper', hero: 'huntress', name: "TAM'S TOY BELL", desc: 'FIND WHAT VESPER\'S BROTHER LOST, AND GIVE IT BACK.',
    steps: [
      { hint: 'q.vesper.1', node: { act: 1, label: 'THE HUMMING IN THE FOG', event: 'q_vesper_1' } },
      { hint: 'q.vesper.2', node: { act: 1, label: 'A RED RIBBON ON THE ROOFS', event: 'q_vesper_2' } },
    ],
  },
  bram: {
    id: 'bram', hero: 'bellbreaker', name: 'THE LAST MOULD', desc: 'THE BELLFOUNDER KEPT ONE MOULD OF THE SILENT BELL.',
    steps: [
      { hint: 'q.bram.1', node: { act: 1, label: 'THE MOULD-KEEPERS', event: 'q_bram_1', encounter: { foes: ['sentinel', 'bomber', 'bomber', 'hushed'], element: 'fire', elite: 'burning' } } },
      { hint: 'q.bram.2', node: { act: 2, label: 'THE FIRST PATTERN', event: 'q_bram_2' } },
    ],
  },
  kestrel: {
    id: 'kestrel', hero: 'kestrel', name: "HER FATHER'S LAST CELL", desc: 'ONE CELL IN THE GAOL WAS NEVER OPENED.',
    steps: [
      { hint: 'q.kestrel.1', node: { act: 1, label: 'NINE HUNDRED AND ONE', event: 'q_kestrel_1' } },
      { hint: 'q.kestrel.2', node: { act: 1, label: 'THE FILED KEY', event: 'q_kestrel_2', encounter: { foes: ['warden', 'crossbow', 'crossbow'], element: 'blood' } } },
    ],
  },
  carmine: {
    id: 'carmine', hero: 'warden', name: "ORRIN'S LETTER", desc: 'SAINT SILENCE WROTE TO HIS APPRENTICE. HE NEVER SENT IT.',
    steps: [
      { hint: 'q.carmine.1', node: { act: 1, label: 'A LETTER HALF-BURNED', event: 'q_carmine_1' } },
      { hint: 'q.carmine.2', node: { act: 2, label: 'THE LAST PAGE', event: 'q_carmine_2' } },
    ],
  },
  ash: {
    id: 'ash', hero: 'lamplighter', name: 'THE SEVEN LAMPS', desc: 'RELIGHT THE LAMPS OF THE LAMPLIGHTERS\' ORDER.',
    steps: [
      { hint: 'q.ash.1', node: { act: 1, label: 'THE FIRST LAMP', event: 'q_ash_1' } },
      { hint: 'q.ash.2', node: { act: 2, label: 'THE LAMP AMONG THE DEAD', event: 'q_ash_2' } },
      { hint: 'q.ash.3', node: { act: 3, label: 'THE LAMP IN THE MARSH', event: 'q_ash_3', encounter: { foes: ['wisp', 'wisp', 'marshwitch'], element: 'holy' } } },
    ],
  },
  hollis: {
    id: 'hollis', hero: 'hollis', name: 'THE HARBOUR CLAPPER', desc: 'THE HARBOUR BELL WAS ROBBED OF ITS TONGUE.',
    steps: [
      { hint: 'q.hollis.1', node: { act: 1, label: 'THE BELL UNDER THE WATER', event: 'q_hollis_1' } },
      { hint: 'q.hollis.2', node: { act: 3, label: 'THE TONGUE IN THE ICE', event: 'q_hollis_2' } },
    ],
  },
  wren: {
    id: 'wren', hero: 'wren', name: 'THE BACKWARDS HYMN', desc: 'SOMEONE SINGS MOTHER WREN\'S OLD HYMNS, BACKWARDS.',
    steps: [
      { hint: 'q.wren.1', node: { act: 1, label: 'THE SINGER IN THE DARK', event: 'q_wren_1' } },
      { hint: 'q.wren.2', node: { act: 2, label: 'THE LAST VERSE', event: 'q_wren_2', encounter: { foes: ['bonecaster', 'cryptspider', 'cryptspider', 'chanter'], element: 'void' } } },
    ],
  },
};
export const QUEST_ORDER = Object.keys(QUESTS);

// The hints: where each waits (area variants), what kind of prop it is, the line seen near it, and what the
// hero reads on touching it. x/z: a fixed spot (optional; else variants.js picks a reachable spot for it).
export const HINTS = {
  'q.vesper.1': { quest: 'vesper', step: 0, kind: 'voice', in: ['docks.fog', 'heights.fog'],
    near: 'A CHILD IS HUMMING SOMEWHERE IN THE FOG.', text: 'A TOY BELL\'S RIBBON ON A NAIL. TAM HAD ONE LIKE IT.' },
  'q.vesper.2': { quest: 'vesper', step: 1, kind: 'mark', in: ['market.frozen', 'belfry.frozen'],
    near: 'A RED RIBBON FLUTTERS WHERE NO WIND REACHES.', text: 'A BOLT IN THE BEAM, A RED RIBBON TIED ROUND IT: VESPER\'S SIGN.' },
  'q.bram.1': { quest: 'bram', step: 0, kind: 'mark', in: ['foundry.burning', 'foundry.storm'],
    near: 'A MOULD GLOWS ON ITS OWN AMONG THE COLD ONES.', text: 'A MOULD STAMPED WITH BRAM\'S OWN MARK. STILL WARM.' },
  'q.bram.2': { quest: 'bram', step: 1, kind: 'note', in: ['ashdunes.ashfall', 'ashdunes.plague'],
    near: 'SOMETHING BRONZE GLINTS UNDER THE SAND.', text: 'A FOUNDER\'S SKETCH, OLDER THAN THE CITY: THE FIRST BELL\'S PATTERN.' },
  'q.kestrel.1': { quest: 'kestrel', step: 0, kind: 'mark', in: ['gate.fog', 'undercroft.eclipse'],
    near: 'SCRATCHES ON THE STONE CATCH THE LIGHT.', text: 'TALLY MARKS, GLOWING FAINTLY. NINE HUNDRED AND ONE OF THEM.' },
  'q.kestrel.2': { quest: 'kestrel', step: 1, kind: 'note', in: ['undercroft.plague', 'heights.frozen'],
    near: 'IRON CLINKS SOFTLY AMONG THE BONES.', text: 'A RING OF THE GAOLER\'S KEYS. ONE IS FILED TO A NEW SHAPE.' },
  'q.carmine.1': { quest: 'carmine', step: 0, kind: 'note', in: ['nave.hallowed'],
    near: 'A SCRAP OF PAPER GLOWS BY THE ALTAR RAIL.', text: '"IF CARMINE COMES HOME..." THE REST IS BURNED. ORRIN\'S HAND.' },
  'q.carmine.2': { quest: 'carmine', step: 1, kind: 'voice', in: ['belfry.eclipse', 'frostmarch.storm'],
    near: 'A VOICE YOU KNOW SAYS YOUR NAME. ONCE.', text: 'AN ECHO OF ORRIN, CAUGHT IN THE STONE: "THE LAST PAGE IS WITH THE BELL."' },
  'q.ash.1': { quest: 'ash', step: 0, kind: 'mark', in: ['market.plague'], from: ['lamp_of_the_order'],
    near: 'A LAMPLIGHTER\'S SIGN IS CHALKED ON A POST.', text: 'THE SIGN OF THE LAMPLIGHTERS: A FLAME IN A CIRCLE. AN ARROW.' },
  'q.ash.2': { quest: 'ash', step: 1, kind: 'mark', in: ['catacombs.hallowed', 'abyss.plague'],
    near: 'A FLAME IN A CIRCLE, CUT INTO THE ROCK.', text: 'A LAMPLIGHTER CAME THIS WAY, LONG AGO. THE LAMP IS FURTHER IN.' },
  'q.ash.3': { quest: 'ash', step: 2, kind: 'voice', in: ['marsh.fog', 'empyrean.eclipse', 'empyrean.bloodmoon'],
    near: 'A HYMN OF THE LAMPLIGHTERS DRIFTS OVER THE WATER.', text: 'THE LAST LAMP OF THE ORDER STILL BURNS. SOMEWHERE NEAR.' },
  'q.hollis.1': { quest: 'hollis', step: 0, kind: 'voice', in: ['docks.flooded'],
    near: 'A BELL TOLLS UNDER THE WATER. ONCE.', text: 'THE HARBOUR BELL HAS NO TONGUE. SOMEONE CUT IT OUT.' },
  'q.hollis.2': { quest: 'hollis', step: 1, kind: 'mark', in: ['marsh.frozen', 'spire.eclipse', 'spire.burning'],
    near: 'BRONZE SHINES THROUGH THE ICE.', text: 'THE HARBOUR BELL\'S CLAPPER, CARRIED HERE BY THE CHOIR.' },
  'q.wren.1': { quest: 'wren', step: 0, kind: 'voice', in: ['nave.eclipse'], from: ['the_backwards_choir'],
    near: 'SOMEONE IS SINGING A HYMN BACKWARDS.', text: 'MOTHER WREN\'S OLD HYMN, SUNG BACKWARDS. IT IS A MAP.' },
  'q.wren.2': { quest: 'wren', step: 1, kind: 'voice', in: ['catacombs.flooded', 'abyss.eclipse', 'frostmarch.bloodmoon'],
    near: 'THE BACKWARDS HYMN AGAIN, CLOSER NOW.', text: 'THE LAST VERSE IS SUNG FROM BELOW. THE SINGER IS WAITING.' },
};

const stepOf = (meta, qid) => (meta && meta.quests && meta.quests[qid]) || 0;
export const questDone = (meta, qid) => stepOf(meta, qid) >= QUESTS[qid].steps.length;
const heroOf = (run) => (run && run.hero) || null;

// Hint placements in a level under a variant: [{ id, kind, quest, text, near, x?, z? }]. With a save, only the
// hints of each line's next step that were not found yet; with a run, never the line of the warden being played.
export function hintsIn(levelId, variant, meta, run) {
  const vid = variant ? (typeof variant === 'string' ? variant : variant.id) : null; if (!vid) return [];
  const out = [];
  for (const [id, h] of Object.entries(HINTS)) {
    if (!h.in.includes(vid)) continue; const Q = QUESTS[h.quest];
    if (run && heroOf(run) === Q.hero) continue;
    if (meta) { if (meta.hints && meta.hints[id]) continue; if (stepOf(meta, h.quest) !== h.step) continue; }
    out.push({ id, quest: h.quest, kind: h.kind, text: h.text, near: h.near, x: h.x, z: h.z });
  }
  return out;
}

// QUEST nodes for the route map of the run's act: a line whose next step's hint was found and whose node's act
// has come. A fills in x, y and next. Never the line of the warden being played, never twice in one run.
export function questNodes(run, meta) {
  const act = (run && run.act) || 1; const out = [];
  for (const qid of QUEST_ORDER) {
    const Q = QUESTS[qid]; if (run && heroOf(run) === Q.hero) continue; if (questDone(meta, qid)) continue;
    const k = stepOf(meta, qid); const S = Q.steps[k]; if (!S || S.node.act > act) continue;
    if (!(meta && meta.hints && meta.hints[S.hint])) continue;
    if (run && run.flags && run.flags.questsPlayed && run.flags.questsPlayed.includes(qid + ':' + k)) continue;
    out.push({ id: 'quest:' + qid + ':' + k, kind: 'quest', act, label: S.node.label, icon: 'quest', quest: qid, step: k, event: S.node.event, encounter: S.node.encounter || null });
  }
  return out;
}

// Marks a hint found (from a touch or an event outcome). Returns the lines to show.
export function findHint(meta, run, hintId) {
  const h = HINTS[hintId]; if (!h || !meta) return [];
  meta.hints = meta.hints || {}; const first = !meta.hints[hintId]; meta.hints[hintId] = true;
  if (run) { run.quest = run.quest || { active: [] }; run.quest.active = run.quest.active || []; if (!run.quest.active.includes(h.quest)) run.quest.active.push(h.quest); }
  const Q = QUESTS[h.quest];
  return first ? [h.text, 'QUEST: ' + Q.name + '. LOOK FOR IT ON THE ROAD.'] : [h.text];
}

// Advances a quest line by one step (the step's event outcome calls it through changes.quest). The last step
// befriends the warden. Returns { lines, friend? }.
export function advanceQuest(meta, run, qid) {
  const Q = QUESTS[qid]; if (!Q || !meta) return { lines: [] };
  meta.quests = meta.quests || {}; const k = stepOf(meta, qid); if (k >= Q.steps.length) return { lines: [] };
  meta.quests[qid] = k + 1;
  if (run) { run.flags = run.flags || {}; (run.flags.questsPlayed = run.flags.questsPlayed || []).push(qid + ':' + k); }
  if (k + 1 >= Q.steps.length) {
    meta.friends = meta.friends || []; if (!meta.friends.includes(Q.hero)) meta.friends.push(Q.hero);
    if (run && run.quest && run.quest.active) run.quest.active = run.quest.active.filter((q) => q !== qid);
    return { lines: [Q.name + ': DONE.', 'A FRIEND WILL COME WHEN THE WHEEL TURNS.'], friend: Q.hero };
  }
  return { lines: [Q.name + ': THE NEXT STEP LIES FURTHER ON.'] };
}

// The in-level events' touches (variants.js places them): what touching them does.
const EMBERS = (act) => 20 + 25 * (act || 1);
function touchEvent(run, meta, id) {
  const [, kind] = id.split(':');
  if (kind === 'survivor') {
    const n = EMBERS(run && run.act);
    if (run) { run.embers = (run.embers || 0) + n; run.stats = run.stats || {}; run.stats.freed = (run.stats.freed || 0) + 1; }
    return { lines: ['THE CHAIN BREAKS. THE HUSHED LOOKS AT YOU, AND BREATHES.', '+' + n + ' EMBERS. ONE MORE VOICE FREED.'], changes: { embers: n, freed: 1 } };
  }
  if (kind === 'cursedlamp') return { lines: ['THE VIOLET FLAME LEANS TOWARD YOU.'], event: 'cursed_lamp' };
  return { lines: [] };
}

// Walking into a touch (game.js, A, calls this). Applies what it can to game.run / game.meta, hides the prop
// (game.level.marks['touch:' + id].hide()), shows the lines as toasts if the game can, and returns
// { lines, changes?, event?, quest? }: an `event` id asks game.js to open that event card (EventScreen).
export function onHint(game, hintId) {
  const run = game && game.run, meta = game && (game.meta || game.save);
  let res;
  if (String(hintId).startsWith('ev:')) res = touchEvent(run, meta, hintId);
  else { const h = HINTS[hintId]; res = { lines: findHint(meta, run, hintId), quest: h && h.quest, hint: hintId }; }
  try {
    const m = game && game.level && game.level.marks && game.level.marks['touch:' + hintId]; if (m && m.hide) m.hide();
    if (game && game.ui && game.ui.toast) res.lines.forEach((l, i) => game.ui.toast(l, { life: 3.5 + i, color: i ? '#e8b860' : '#9cc8e8' }));
    if (res.event && game && typeof game.openEvent === 'function') game.openEvent(res.event);
    if (game && typeof game.persist === 'function') game.persist();
  } catch (e) { /* the game may lack a piece: the result still says what happened */ }
  return res;
}
