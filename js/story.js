/*
 * Tower of Wishes — story campaign: the chapter graph, choices and team growth.
 *
 * Pure data and functions (no DOM), so the whole campaign can be walked in
 * Node (test/story-test.js). main.js shows the nodes and runs the battles.
 *
 * Source: the author's manuscript (Prologue to Chapter Five) with the author's
 * game decisions in docs/STORY.md. Lines made with B() are quoted from the
 * manuscript (adjusted only for the 22-year timeline); S() lines are new and
 * are Proposals until the author approves them; N() is narration.
 *
 * Node types:
 *   card    { title, sub }                         a full-screen title card
 *   scene   { bg, lines: [{who, text}] }           dialogue and narration
 *   fork    { bg, lines, options: [{label, next}] }  a fork in the road: lines preview each path, then the player picks one
 *   select  { }                                    pick the starting character
 *   battle  { scenario, party(st), mods(st), wounds, xp, win, intro }
 *   end     { }                                    the end of the written story
 * Every node but fork and battle has `next`.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TowStory = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // A line's text can be one string, or one per starter: { ren, mara, brannoc }.
  // tone: 'shout' | 'soft' (how the floating line looks; '!' and a trailing '…' imply them)
  const B = (who, text, tone) => ({ who, text, book: true, tone });
  const S = (who, text, tone) => ({ who, text, tone });
  const N = (text) => ({ who: null, text });
  // A silent beat: no words, the shot shows it (the author, 2026-10-23: no narrator). `note` keeps
  // what the book said happens here, for whoever stages it; `hold` is its least time on screen.
  const X = (note, hold) => ({ who: null, text: '', silent: true, note, hold });
  // (for painted shots timed by the old narration: as long as the line used to take to read)
  const Xr = (note) => X(note, 1.2 + note.length * 0.05);
  // A line drafted for the game (not the book's words), waiting for the author's approval.
  const P = (who, text, tone) => ({ who, text, tone, proposal: true });
  // Chapter Five lines that need Kael or Eiryn in the party (Chapter Four choice).
  const hasKael = (st) => (st.flags.party || 'both') !== 'eiryn';
  const hasEiryn = (st) => (st.flags.party || 'both') !== 'kael';
  const both = (st) => hasKael(st) && hasEiryn(st);
  const KB = (text) => Object.assign(B('kael', text), { when: hasKael });
  const EB = (text) => Object.assign(B('eiryn', text), { when: hasEiryn });
  const only = (when, line) => Object.assign(line, { when });

  // ------------------------------------------------------------ characters
  // Speakers and how they are named on screen. '@' is the player's starter.
  const SPEAKERS = {
    kael: { name: 'Kael', tone: 'hero' },
    eiryn: { name: 'Eiryn', tone: 'glyph' },
    broad: { name: 'Broad-shouldered man', tone: 'foe' },
    knife: { name: 'Man with the knife', tone: 'foe' },
    spear: { name: 'Spearwoman', tone: 'plain' },
    guard: { name: 'Gate guard', tone: 'plain' },
    officer: { name: 'Older guard', tone: 'plain' },
    registrar: { name: 'Registrar', tone: 'plain' },
    evaluator: { name: 'Evaluator', tone: 'plain' },
    miller: { name: 'The miller', tone: 'plain' },
    climber: { name: '???', tone: 'foe' },
    companion: { name: 'Contract reader', tone: 'plain' },
    knifeman: { name: 'The man with the knife', tone: 'foe' },
    aerys: { name: 'Aerys', tone: 'glyph' },
    nox: { name: 'Nox', tone: 'foe' },
    eloryn: { name: 'Eloryn', tone: 'glyph' },
    braxen: { name: 'Braxen', tone: 'hero' },
    altheryx: { name: 'Altheryx', tone: 'plain' },
    calamity: { name: 'Calamity', tone: 'foe' },
    healer: { name: 'The healer', tone: 'plain' },
    teacher: { name: 'Aerys’s teacher', tone: 'plain' },
    keeper: { name: 'The innkeeper', tone: 'plain' },
    vendor: { name: 'Fruit seller', tone: 'plain' },
    child: { name: 'Child', tone: 'plain' },
    storyteller: { name: 'Storyteller', tone: 'plain' },
    alric: { name: 'Alric', tone: 'hero' },
    grabber: { name: 'Man by the trunk', tone: 'foe' },
  };

  // Ren, Mara and Brannoc: once the starting characters, now companions for
  // hire at the tavern (all Proposals; see docs/STORY.md).
  const STARTERS = {
    ren: {
      key: 'ren', name: 'Ren Ashgrove', role: 'Vampire-blooded runner',
      blurb: 'Born the winter after the Reset. His strength and speed come from his body, like the vampires of the old cities. He wants the wish to undo what the Reset took from his family.',
      style: 'Fast and aggressive: dashes in, chains strikes, dodges on instinct. Weak to heavy blows.',
      heavy: 'Hundredfold Step', stats: { health: 2, power: 3, speed: 5, range: 1 },
    },
    mara: {
      key: 'mara', name: 'Mara Quill', role: 'Licensed glyph-caster',
      blurb: 'Registered with the Guild’s mage office at sixteen. Her teacher went to climb the Tower and never came back.',
      style: 'Keeps her distance: force bolts at range, a shove to break a rush. Fragile up close.',
      heavy: 'Lattice Lance', stats: { health: 1, power: 4, speed: 3, range: 5 },
    },
    brannoc: {
      key: 'brannoc', name: 'Brannoc Vell', role: 'Dwarven shield-bearer',
      blurb: 'Guards caravans on the western roads and owes a debt that only the Tower’s bounties could clear.',
      style: 'Holds the line: huge health, parries and shield-bash counters, draws enemies onto himself. Slow.',
      heavy: 'Anvilfall', stats: { health: 5, power: 3, speed: 1, range: 1 },
    },
  };

  // ------------------------------------------------------------ growth
  // The team shares experience; recruits join at the team's level.
  const LEVEL_XP = [0, 100, 220, 380, 600, 900];
  function levelFor(xp) {
    let lv = 1;
    while (lv < LEVEL_XP.length && xp >= LEVEL_XP[lv]) lv++;
    return lv;
  }
  function teamLevel(st) { return levelFor(st.xp); }

  function member(st, key) {
    let level = teamLevel(st);
    let sup = 0;
    if (key === 'kael' && st.flags.kaelBond > 0) level += 1; // he trusts you to cover him
    if (key === 'eirynMage') sup = 30 * Math.max(0, st.flags.trust || 0); // she opens with her glyphs ready
    return { key, level, super: sup };
  }

  // The book's party after the quarry: whoever has joined by this chapter.
  // Eiryn fights with her book kit (Pressure) but wears her glyph gear.
  const BOOK_ORDER = ['c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12', 'c13', 'c14', 'c15'];
  function bookAt(st, ch) { const i = BOOK_ORDER.indexOf(NODES[st.node].chapter); return i >= BOOK_ORDER.indexOf(ch); }
  function bookParty(st) {
    const eiryn = Object.assign(member(st, 'eirynMage'), { key: 'eirynAsh', gear: 'eirynMage' });
    const p = [member(st, 'kael'), eiryn];
    if (bookAt(st, 'c7')) p.push(member(st, 'aerys'));   // joined after the Skyreaver
    if (bookAt(st, 'c9')) p.push(member(st, 'eloryn'));  // the healer from the bleeding road
    if (bookAt(st, 'c10')) p.push(member(st, 'braxen')); // the field of beasts
    if (bookAt(st, 'c11')) p.push(member(st, 'nox'));    // after the Night Creature
    return p;
  }

  // Kael and Eiryn take the quarry contract (Chapter Five).
  function quarryParty(st) { return [member(st, 'kael'), member(st, 'eirynMage')]; }

  // ------------------------------------------------------------ chapters
  // For the campaign map. `from` is the first node of the chapter.
  // The first node of each chapter after the prologue: reaching one returns
  // the player to the campaign map, where the next chapter waits.
  // (No gate before Chapter One: character select happens in the tavern and
  // the story runs straight on into it.)
  const CHAPTER_START = {
    'c2.gate': 'c2', 'c4.guild': 'c4', 'c5.mill': 'c5', 'c6.road': 'c6', 'c7.city': 'c7', 'c8.road': 'c8',
    'c9.farms': 'c9', 'c10.shadow': 'c10', 'c11.learn': 'c11', 'c12.doors': 'c12', 'c13.enter': 'c13', 'c14.hall': 'c14', end: 'c15',
  };

  const CHAPTERS = [
    { id: 'prologue', label: 'Prologue', title: 'The Last Ascent', from: 'p.lore' },
    { id: 'c1', label: 'Chapter One', title: 'The Clearing', from: 'c1.tavern' },
    { id: 'c2', label: 'Chapters Two & Three', title: 'A Town Grown Strange', from: 'c2.gate' },
    { id: 'c4', label: 'Chapter Four', title: 'The First Contract', from: 'c4.guild' },
    { id: 'c5', label: 'Chapter Five', title: 'The Quarry', from: 'c5.mill' },
    { id: 'c6', label: 'Chapter Six', title: 'The Sky That Hunts', from: 'c6.road' },
    { id: 'c7', label: 'Chapter Seven', title: 'The Shadow City', from: 'c7.city' },
    { id: 'c8', label: 'Chapter Eight', title: 'The Road That Bleeds', from: 'c8.road' },
    { id: 'c9', label: 'Chapter Nine', title: 'A Name on a Page', from: 'c9.farms' },
    { id: 'c10', label: 'Chapter Ten', title: 'The Night Creature', from: 'c10.shadow' },
    { id: 'c11', label: 'Chapters Ten & Eleven', title: 'The Road That Learns You', from: 'c11.learn' },
    { id: 'c12', label: 'Floor One', title: 'The Hall of Frost and Mist', from: 'c12.doors' },
    { id: 'c13', label: 'Floor Two', title: 'Calamity', from: 'c13.enter' },
    { id: 'c14', label: 'Floor Three', title: 'The Hall of Offering', from: 'c14.hall' },
    { id: 'c15', label: 'To be continued', title: 'Beyond the manuscript', from: 'end' },
  ];

  // ------------------------------------------------------------ the graph
  const NODES = {
    // ---------------------------------------------------------- prologue
    // The opening, filmed (the author, 2026-10-23: "the world before"): the market at dusk under the
    // Tower, the lamps lit up the street toward it, climbers at its gate, then over the roofs to Eiryn.
    // The Tower's lines and the promise are the manuscript's (they used to open p.tower).
    'p.lore': {
      type: 'scene', chapter: 'prologue', bg: 'tower', next: 'p.roof',
      lines: [
        X('Down out of the cloud ceiling, the Tower far off, into the market at dusk.'),
        P('child', 'What’s at the top?'), // PROPOSAL (a child at the fruit stall points at the Tower)
        P('vendor', 'Reach the summit, and you can make a wish.'), // PROPOSAL: the book's promise, spoken
        X('The lamps are lit up the street toward the Tower; climbers walk up to its gate.'),
        X('Two climbers step into the light; up the Tower into the clouds; over the roofs, the title.'),
      ],
    },
    'p.roof': {
      type: 'scene', chapter: 'prologue', bg: 'tower', next: 'p.tower',
      lines: [
        B('alric', 'You’re slowing down.'), // PROPOSAL (TW-003)
        B('eiryn', 'I’m letting you think you can catch me.'), // PROPOSAL (TW-003)
        B('alric', 'Then stop letting me.'), // PROPOSAL (TW-003)
        X('The take (TW-004-007): the gap wider than she judged; a violet glyph throws her on; Alric leaps by strength alone, catches her midair, takes the landing; half the roof comes with them.'),
        B('alric', 'Too slow.'), // PROPOSAL (TW-008)
        B('eiryn', 'I let you catch me.'), // PROPOSAL (TW-008)
        B('alric', 'Did you.'), // PROPOSAL (TW-008)
        B('eiryn', 'I wanted the hug.'), // PROPOSAL (TW-008)
        B('eiryn', 'We were almost home.'), // PROPOSAL (TW-009)
        B('alric', 'We walk the rest. Before the neighbours start counting their tiles.'), // PROPOSAL (TW-010)
        X('Somewhere below, one more tile slid off the edge and broke in the street.'), // PROPOSAL (TW-010)
      ],
    },
    // Left out of the road (the author, 2026-10-23: no street walk); kept for old saves.
    'p.evening': {
      type: 'scene', chapter: 'prologue', bg: 'town', next: 'p.overlook',
      lines: [
        N('The world used to breathe. Eiryn Ashvale remembered that most of all.'),
        N('Lanterns burning against the evening. Children cutting through crowded streets. Merchants arguing prices they had already decided upon. A musician beside a fountain, playing for no audience in particular.'),
        N('And farther still, so familiar that most people no longer thought to stare at it, stood the Tower of Wishes. It simply existed. Like the mountains. Like the rivers. Like the sky.'),
        N('Eiryn moved through the evening crowd unnoticed. She crossed the square toward the man waiting at its edge. Alric Noct saw her coming, and something in him changed.'),
        N('He took her hand and raised her knuckles to his lips.'),
        B('alric', 'Late.'),
        B('eiryn', 'You’ll survive.'),
        N('He lowered her hand but did not release it. They walked. The city slowly fell behind them.'),
        B('alric', 'They say someone climbed another floor today.'),
        B('eiryn', 'They always say that.'),
      ],
    },
    // After the horn: on the roof, the two of them look at the Tower (TW-014 reaction, TW-015-018).
    'p.overlook': {
      type: 'scene', chapter: 'prologue', bg: 'tower', next: 'p.light',
      lines: [
        X('On a roof at the edge of the city, Eiryn and Alric turned toward the sound with everyone else.'), // PROPOSAL (TW-014)
        B('alric', 'They say someone climbed another floor today.'),
        B('eiryn', 'They always say that.'),
        B('alric', 'Do you think anyone’s ever made it to the top?'),
        X('Eiryn finally looked. The Tower gave her nothing back.'),
        B('eiryn', 'You’d have to be powerful.'),
        B('eiryn', 'You could do it.'), // PROPOSAL (TW-016)
        B('alric', 'Me? I’d be bored by the third floor. You’d end up carrying me.'), // PROPOSAL (TW-016)
        B('alric', 'And if someone did?'),
        B('eiryn', 'What would they wish for?'),
        B('alric', 'I don’t know.'),
        X('He stepped closer. His arm slid around her waist until the Tower disappeared from the center of her world. Their foreheads touched.'),
        B('eiryn', 'I already have everything I could ever wish for.'), // TW-017: Eiryn says it (the older text gave it to Alric)
        X('For a moment, the world was enough.'), // TW-018
        X('Far above them, something was dying.'),
      ],
    },
    'p.open': { type: 'card', chapter: 'prologue', bg: 'tower', title: 'TOWER OF WISHES', sub: 'Reach the summit, and you could make a wish.', next: 'p.tower' },
    'p.tower': {
      type: 'scene', chapter: 'prologue', bg: 'tower', next: 'p.climb',
      lines: [
        X('Far away, high inside the Tower, a climber reached the last ascent.'),
        X('Blood had dried along one side of the stranger’s face. The weapon in their hand was broken. No companion followed.'),
        X('Something was waiting on the final floor. Something no one had ever seen clearly.'),
      ],
    },
    // The climber's fight, filmed (the author, 2026-10-23: a cutscene, not an auto-battle). No names
    // for the climber, the boss or the final move. Ends with the Tower's horn (TW-014).
    'p.climb': {
      type: 'scene', chapter: 'prologue', bg: 'summit', next: 'p.overlook',
      lines: [
        X('Two shapes dropped from the dark to bar the way.'), // PROPOSAL
        X('The climber cut through both of them in a single stroke.'), // PROPOSAL
        X('The thing behind them answered.'), // PROPOSAL
        X('The climber got up.'), // PROPOSAL
        X('Steel and shadow, again and again.'), // PROPOSAL
        X('It was not enough.'), // PROPOSAL
        X('So the climber reached for something older.'), // PROPOSAL
        X('The last floor fell silent.'), // PROPOSAL
        X('Then the Tower sounded: one vast note, and every soul in Erdra heard it.'), // PROPOSAL (TW-014)
      ],
    },
    // The playable climber fight, now off the road (its lessons moved to Kael's first fight); kept for old saves.
    'p.ascent': {
      type: 'battle', chapter: 'prologue', scenario: 'tutorial', wounds: false, xp: 0, tutorial: true,
      party: () => [], win: 'p.light', lose: 'p.light',
      tips: [
        'Watch: every fighter thinks for themselves.',
        'ALL OUT burns every hero’s stamina and power into a flurry. Afterwards they can’t dodge or block until stamina returns.',
        'A full heavy-art meter plays out as a cutscene. Tap a fighter to follow them.',
      ],
    },
    'p.light': {
      type: 'scene', chapter: 'prologue', bg: 'summit', next: 'p.reset',
      lines: [
        X('Above the final steps was a brightness too pale to see through.'),
        X('The climber reached toward it.'),
      ],
    },
    'p.reset': {
      type: 'scene', chapter: 'prologue', bg: 'reset', next: 'p.resetcard',
      lines: [
        Xr('Then the clouds began to burn.'),
        Xr('A straight white line opened overhead, from horizon to horizon. Red gathered at its edges.'),
        Xr('Fire rained down. Oceans surged inland. Cities drowned beneath walls of black water. The world that had breathed so easily only moments before began to choke.'),
        Xr('Eiryn ran. Alric’s hand was locked around hers. There was nowhere to go. They ran anyway.'),
        Xr('Then the light changed. A wall of flame was descending from the sky. Not somewhere beyond the city. Not across another street. Here.'),
        Xr('Alric turned and shoved Eiryn backward. He stepped between her and the sky. He covered her with his body. And the fire came down.'),
        Xr('Eiryn screamed. No sound came out. Ash fell. The fire passed. Alric was gone.'),
      ],
    },
    'p.resetcard': { type: 'card', chapter: 'prologue', bg: 'reset', title: 'THE RESET', sub: '', next: 'p.legend' },
    // Years later: the legend told by a fire, with its memories filmed (the author, 2026-10-23).
    // The storyteller's words are drafted from the book's narration (PROPOSAL, for the author).
    'p.legend': {
      type: 'scene', chapter: 'prologue', bg: 'tower', next: 'p.later',
      lines: [
        X('A fire in a settlement built from older ruins; children round an old storyteller; Eiryn at the edge of the light.'),
        P('storyteller', 'Long ago, a man climbed to the top of the Tower of Wishes. No one knows his name.'),
        P('storyteller', 'What came after was fire, water and storm. The end of a world.'),
        P('storyteller', 'We built again. It broke again. Only the Tower never changed.'),
        X('Back at the fire: Eiryn, the same face, the same posture, in a different world.'),
      ],
    },
    'p.story': {
      type: 'scene', chapter: 'prologue', bg: 'dawn', next: 'p.later',
      lines: [
        N('Years later, people began telling a story. They gathered around fires in settlements built from the remains of settlements that had come before.'),
        N('A man had climbed to the top of the Tower of Wishes. No one knew his name. No one knew why. They knew only what came afterward: fire, water, storm. The end of a world.'),
        N('Civilizations rebuilt and failed. Stone broke. Stone was rebuilt. Stone broke again. The Tower never changed.'),
        N('Neither did Eiryn. Same face. Same posture. Different world.'),
      ],
    },
    'p.later': { type: 'card', chapter: 'prologue', bg: 'dawn', title: 'ONE HUNDRED AND FIFTY YEARS LATER', sub: 'She was still waiting.', next: 'c1.tavern' },
    // Retired from the main road (the book's heroes are the party now); the
    // tavern pick lives on as the 'hire' episode. Kept for old saves.
    'p.select': { type: 'select', chapter: 'prologue', bg: 'tavern', next: 'p.who' },
    'p.who': {
      type: 'scene', chapter: 'prologue', bg: 'tavern', next: 'c1.tavern',
      lines: [
        S('@', {
          ren: 'A hundred and fifty years since the sky burned. Everyone in this town has a story about it. Mine ends at the Tower.',
          mara: 'My teacher said the summit was a matter of geometry. Then she climbed it and never came back. I intend to check her working.',
          brannoc: 'A caravan contract, a debt, and a Tower full of bounties. One of those I can pay off this year.',
        }),
        N('You need Guild work, a team, and a road east. For tonight you have a seat in the tavern by the Guild office, and a bowl of stew going cold.'),
      ],
    },

    // ---------------------------------------------------------- chapter one
    'c1.tavern': {
      type: 'scene', chapter: 'c1', bg: 'tavern', next: 'c1.formation',
      lines: [
        X('At the next table, a Guild swordsman has decided the stew tastes burnt. This is, apparently, a controversial opinion.'),
        B('spear', 'It’s smoked pepper. They’ve been putting it in since spring.'),
        B('kael', 'Then they’ve been burning it since spring.'),
        X('Around them the regulars murmur over their cups.'),
      ],
    },
    // The tavern goes to the window; then the painted clip of the formation charging and
    // failing; then back in the room as Kael decides.
    'c1.formation': {
      type: 'scene', chapter: 'c1', bg: 'tavern', next: 'c1.go',
      lines: [
        X('A murmur runs through the tavern. One by one, the regulars drift to the window, and the stew is forgotten. Far to the north, the light over the trees has turned purple.'),
      ],
    },
    'c1.clip': {
      type: 'scene', chapter: 'c1', bg: 'formation', next: 'c1.look',
      lines: [
        X('Above the distant treeline, purple light gathers in the air. Fine lines curve around a bright center, ring inside ring, turning against one another.'),
        X('One of the inner rings stops. The whole formation shudders, holds — and comes apart over the trees.'),
      ],
    },
    'c1.go': {
      type: 'scene', chapter: 'c1', bg: 'tavern', next: 'c1.street',
      lines: [
        B('kael', 'I’m going outside.'),
        B('spear', 'You’re doing that thing with your face. The one you do before you run at a problem.'),
        B('kael', 'That’s why I’m going to see.'),
        X('He sets off before she can offer an opinion.'),
      ],
    },
    // Out in the street (TW-041): Kael watches the formation fail from outside.
    'c1.street': {
      type: 'scene', chapter: 'c1', bg: 'tavern', next: 'c1.clip',
      lines: [
        X('Outside, the street has gone quiet. Every face is turned north.'),
      ],
    },
    // TW-043: nobody knows who cast it. (Kael's line is a placeholder until the author writes it.)
    'c1.look': {
      type: 'scene', chapter: 'c1', bg: 'tavern', next: 'c1.run',
      lines: [
        B('kael', 'Nobody draws something that big for fun.'),
        X('He starts north, toward the trees.'),
      ],
    },
    'c1.run': {
      type: 'scene', chapter: 'c1', bg: 'forest', next: 'c1.voice',
      lines: [
        X('The road curves north past the market square. Kael follows it until the houses thin, then cuts across hard ground toward the woods.'),
        S('@', { ren: 'Keep up.', mara: 'You run like someone who\u2019s been hit before.', brannoc: 'Go. I\u2019ll be right behind you. Eventually.' }),
        X('Behind them, the ordinary noise of the town fades, replaced by wind moving through the first trees.'),
      ],
    },
    'c1.voice': {
      type: 'scene', chapter: 'c1', bg: 'forest', next: 'c1.drop',
      lines: [
        X('At the forest’s edge, a man laughs. Another answers. Then a woman, clearly enough to carry through the trees:'),
        B('eiryn', 'Keep your hands off me.'),
        X('Four men in a clearing. A broad-shouldered one by the fallen tree, one with a short knife, one moving round the right, one hanging back by the path.'),
        X('The woman they have cornered has long silver-white hair. She is exhausted.'),
        B('broad', 'Then do another trick. The big one. We all saw it.'),
        B('knife', 'She can’t. Look at her.'),
        B('knife', 'Pretty thing, walking alone?'),
        B('grabber', 'Bet you scream nice.'),
        B('broad', 'Or maybe she don’t scream at all.'),
      ],
    },
    // Playtest item 11: Kael drops into the circle, plants his sword, draws it. No line: the action is the line.
    'c1.drop': {
      type: 'scene', chapter: 'c1', bg: 'forest', next: 'c1.fight',
      lines: [
        X('Something drops from the bank above and lands between them.'),
        X('Kael drives his sword into the earth. Then he pulls it free.'),
      ],
    },
    'c1.fight': {
      type: 'battle', chapter: 'c1', wounds: true, xp: 100, tutorial: true, // the first playable fight: the coach teaches here
      scenario: 'clearingKael', party: (st) => [member(st, 'kael')], win: 'c1.after',
      outro: 'The bandits are beaten or gone. Nobody dies in the clearing.',
    },
    'c1.after': {
      type: 'scene', chapter: 'c1', bg: 'forest', next: 'c1.walk',
      lines: [
        B('kael', 'They’re gone.'),
        B('eiryn', 'Good.'),
        B('kael', 'Are you hurt?'),
        B('eiryn', 'Not by them.'),
        B('kael', 'That spell over the trees. Was it yours?'),
        B('eiryn', 'It would have been considerably more impressive if it had worked.'),
        X('Kael offers his waterskin.'),
        B('eiryn', 'That’s what somebody trying to poison me would say.'),
        B('kael', 'Then I’m apparently very committed to the plan.'),
        X('He studies her. He is waiting for something: shaking, perhaps. The delayed panic of someone whose mind has only just caught up with what nearly happened. Eiryn stands exactly as she did before.'),
        B('kael', '…You’re not scared?'),
        B('eiryn', 'And why should I be?'),
        B('kael', 'That road kills people. Especially women who think walking alone means something.'),
        B('kael', 'Look. I don’t know what you’re trying to prove. But you’re not doing it alone.'),
      ],
    },
    'c1.walk': {
      type: 'scene', chapter: 'c1', bg: 'road', next: 'c2.gate', set: { trust: 1 },
      lines: [
        B('kael', 'I’m Kael.'),
        B('eiryn', 'Eiryn.'),
        S('@', { ren: 'Ren. Ren Ashgrove.', mara: 'Mara Quill. Registered caster.', brannoc: 'Brannoc Vell. Pleasure.' }),
        B('eiryn', 'There should be a crossing east of here. A stone one, before the hills.'),
        B('kael', 'Not on the road I came by.'),
        B('eiryn', 'There was.'),
        X('Beyond the last branches lie the road and the first roofs of the town. Eiryn stops and looks at them as if they are in the wrong place.'),
        B('eiryn', 'I thought I knew this place.'),
        X('He walks on through Ashgate as though the matter had been settled, half a step ahead of her, scanning the road with the vigilance of a man who has already decided she needs protecting.'),
        B('kael', 'Stay close.'),
        X('Her expression does not change. Beyond the city walls, the Tower looms beneath the clouds.'),
      ],
    },

    // ---------------------------------------------------------- chapters two and three
    'c2.gate': {
      type: 'scene', chapter: 'c2', bg: 'town', next: 'c2.tavern',
      lines: [
        N('Ashgate is busy in the ordinary, irritating way towns get near supper. Eiryn stares at the water wheel, the lamps, the pipes in the wall.'),
        B('eiryn', 'There was a town east of here. On the other side of the hills. A stone bridge crossed the river before the houses.'),
        B('kael', 'There isn’t much there anymore. A few foundations. One wall, maybe.'),
        B('eiryn', 'How long?'),
        B('kael', 'Since the Reset, I think. About a hundred and fifty years.'),
        B('eiryn', 'A hundred and fifty.'),
        B('eiryn', 'You said there was food.'),
      ],
    },
    'c2.tavern': {
      type: 'scene', chapter: 'c2', bg: 'tavern', next: 'c3.tea',
      lines: [
        B('eiryn', 'What do they say about the Tower?'),
        B('kael', 'That someone reached the top. That they made a wish, and then the world was destroyed. That’s the usual version.'),
        N('At the word wish, something in her face changes.'),
        B('kael', 'You don’t have to explain everything tonight.'),
        B('eiryn', 'That sounds like the best offer I’m going to get.'),
      ],
    },
    'c3.tea': {
      type: 'scene', chapter: 'c2', bg: 'market', next: 'c3.kael',
      lines: [
        N('Morning. A tea stall under a canvas canopy. Eiryn’s tea has gone cold; she draws a small circle with her thumb and it steams again.'),
        B('kael', 'I think we’re about to have a problem.'),
        B('officer', 'Was that a spell? Do you have a public casting permit?'),
        B('eiryn', 'For warming tea?'),
        B('officer', 'For casting. The rules don’t change according to whether you think a spell is harmless.'),
        B('officer', 'First offense. Issue the standard fine and record the warning.'),
        N('Eiryn reaches into her cloak. There is no purse. She had left home expecting to be back before supper.'),
      ],
    },
    'c3.kael': {
      type: 'scene', chapter: 'c2', bg: 'market', next: 'c3.guild', set: { kaelBond: 1 },
      lines: [
        B('kael', 'No need.'),
        N('By the time the guard hands him the written warning, the greater part of his money is gone.'),
        B('kael', 'Great. Now I’m broke too.'),
        B('eiryn', 'You’re enjoying this.'),
        B('kael', 'Not financially.'),
      ],
    },
    'c3.guild': {
      type: 'scene', chapter: 'c2', bg: 'market', next: 'c4.guild',
      lines: [
        B('eiryn', 'There must be an easy way to make some money.'),
        B('kael', 'The Adventurer’s Guild. Quick contracts, decent pay if you choose carefully.'),
        B('eiryn', 'And you think they’ll accept me?'),
        B('kael', 'I watched you put a spell above the trees yesterday. Even if it didn’t work, I’d say you have a reasonable chance.'),
      ],
    },

    // ---------------------------------------------------------- chapter four
    'c4.guild': {
      type: 'scene', chapter: 'c4', bg: 'guild', next: 'c4.eval',
      lines: [
        N('The Guild office smells of damp wool, sealing wax, and the lunch somebody abandoned on a windowsill.'),
        B('registrar', 'Name, place of origin, trade or training, and any previous contract registration.'),
        B('registrar', 'How long have you been practicing?'),
        B('eiryn', 'Quite a while.'),
      ],
    },
    'c4.eval': {
      type: 'scene', chapter: 'c4', bg: 'guild', next: 'c4.board',
      lines: [
        N('In the evaluation yard, Eiryn slides the middle block onto its mark and back. Keeping a counter floating as she walks is harder. It dips twice.'),
        B('evaluator', 'You’re accurate, and you understand how to keep an effect contained.'),
        B('evaluator', 'Your initial credential will be at F rank. It records what this office has verified, not everything you might be capable of.'),
        B('eiryn', 'Apparently I’m a beginner.'),
      ],
    },
    'c4.board': {
      type: 'scene', chapter: 'c4', bg: 'guild', next: 'c5.mill',
      lines: [
        N('The contract board: road repairs, missing cargo, an escort to the coast. Then a smaller notice — skeletons raiding a mill’s grain store, holed up in an abandoned quarry.'),
        B('eiryn', 'That looks straightforward.'),
        B('kael', 'It’s an early contract. Small group reported, no deaths, stolen food and tools.'),
        S('@', { ren: 'Skeletons. I can be up that hill before they know we’re there.', mara: 'Skeletons scatter from force bolts. This is my kind of contract.', brannoc: 'Skeletons in a quarry. Narrow paths. I’ll take the front.' }),
      ],
    },
    // ---------------------------------------------------------- chapter five
    'c5.mill': {
      type: 'scene', chapter: 'c5', bg: 'hill', next: 'c5.path',
      lines: [
        B('miller', 'They’ve been coming after dark. First the grain. Then a box of tools. My youngest tried to chase them and came back with a cut on his arm.'),
        KB('How many?'),
        B('miller', 'Four, maybe five. Hard to count when they’re running through the sheds.'),
        EB('You said skeletons are usually manageable.'),
        KB('They are. One at a time. They get more confident in groups, which is why we don’t let them decide where the fight happens.'),
      ],
    },
    'c5.path': {
      type: 'scene', chapter: 'c5', bg: 'hill', next: 'c5.pathfight',
      lines: [
        N('A skeleton squats by a stolen sack, tearing at the stitching with its teeth. It looks up and lets out a sharp cry.'),
        N('From higher on the hill comes an answering cry.'),
        EB('And now the rest know we’re here.'),
        N('Two skeletons appear above the path, one with a short spear and the other with a rough wooden bow. A third drops out of the scrub.'),
        KB('Down!'),
        only((st) => !hasKael(st), S('@', 'Get down!')),
      ],
    },
    'c5.pathfight': {
      type: 'battle', chapter: 'c5', scenario: 'path', wounds: true, xp: 120,
      party: (st) => quarryParty(st),
      mods: () => ({ approach: 'long' }), win: 'c5.cave',
      outro: 'The path is clear. The archer drops its bow and runs for the quarry.',
    },
    'c5.cave': {
      type: 'scene', chapter: 'c5', bg: 'cave', next: 'c5.cavefight',
      lines: [
        N('At the cave mouth: the miller’s grain, a faded loading frame, and a set of narrow three-toed footprints. One print, half under a cart rut, is much larger.'),
        KB('We go far enough to see what they’ve taken. Then we decide whether to clear the place or come back with a bigger party.'),
        N('Rotting food, wet hides, smoke. Stolen crates against the far wall; a stone basin of dirty water. The archer has joined two skeletons by a cooking fire.'),
        N('For a moment nobody moves. Then the archer points and shouts.'),
      ],
    },
    'c5.cavefight': {
      type: 'battle', chapter: 'c5', scenario: 'cave', wounds: true, xp: 100,
      party: (st) => quarryParty(st), win: 'c5.tracks',
      outro: 'The archer falls against the stone. The miller’s grain is here — most of it.',
    },
    'c5.tracks': {
      type: 'scene', chapter: 'c5', bg: 'cave', next: 'c5.ogre',
      lines: [
        N('Two skeletons bolt into the deeper passage. The chamber goes quiet apart from the crackle of damp wood.'),
        EB('At least we found what they came for.'),
        N('The wet earth by the deeper passage is churned by the same large tracks, and the stone around the opening is scraped well above head height.'),
        KB('Eiryn, I think we’re leaving.'),
        only((st) => !hasKael(st), S('@', 'Those tracks. Eiryn, I think we’re leaving.')),
        only((st) => !hasEiryn(st), S('@', 'Kael. Those tracks.')),
      ],
    },
    'c5.ogre': {
      type: 'scene', chapter: 'c5', bg: 'cave', next: 'c5.ogrefight',
      lines: [
        N('A bony hand closes round the edge of the passage. Then a shoulder, and an enormous figure forces its way into the chamber.'),
        N('Old bone shows between plates of iron and fur, the color of weathered stone. A horned helm. A heavy war maul rests across its shoulder.'),
        KB('That was not in the contract.'),
        only((st) => !hasKael(st), S('@', 'That was not in the contract.')),
        KB('Make it look at me.'),
      ],
    },
    'c5.ogrefight': {
      type: 'battle', chapter: 'c5', scenario: 'ogre', wounds: true, xp: 150,
      party: (st) => quarryParty(st), mods: () => ({ approach: 'ready' }), win: 'c5.after',
      outro: 'The warlord is down. Dust drifts from the cave roof.',
    },
    'c5.after': {
      type: 'scene', chapter: 'c5', bg: 'hill', next: 'c5.home',
      lines: [
        only(hasEiryn, N('Eiryn draws the force into a narrow path. The warlord strikes the quarry wall hard enough to drive splintered stone from the rock face. It does not move again.')),
        only((st) => !hasEiryn(st), N('The warlord staggers back into the quarry wall and folds. It does not move again.')),
        only(both, B('kael', 'You could have told me you were capable of that.')),
        only(both, B('eiryn', 'I did.')),
        only(both, B('kael', 'You said you could stop it.')),
        only(both, B('eiryn', 'I stopped it.')),
        only(both, B('kael', 'You put it through a wall.')),
        only(both, B('eiryn', 'The wall was convenient.')),
        only((st) => !hasEiryn(st), S('kael', 'Remind me never to owe you money.')),
        only((st) => !hasKael(st), S('@', 'You could have told me you were capable of that.')),
        only((st) => !hasKael(st), B('eiryn', 'I stopped it. The wall was convenient.')),
      ],
    },
    'c5.home': {
      type: 'scene', chapter: 'c5', bg: 'tavern', next: 'c6.road',
      lines: [
        B('miller', 'I didn’t know. I swear I didn’t know there was anything that big up there.'),
        N('The Guild records the discrepancy and pays the contract with a hazard supplement.'),
        EB('We should look for another contract once you’re fit.'),
        KB('Something genuinely small this time.'),
        EB('I shall ask every skeleton I meet whether it has one hidden in a cupboard.'),
        N('Far to the east, the Tower still stands. The road there starts at the Guild’s contract board.'),
      ],
    },
    end: { type: 'end', chapter: 'c15', bg: 'tower' },
  };




  // ------------------------------------------------------------ the book's road
  // Chapters after the quarry live one per file in js/book/ (see its README).
  // Each gives nodes, speakers, staged scenes, and sim extras. In the browser
  // they load before this file as root.TowBook[id]; in Node we require them.
  const BOOK_FILES = ['pro', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12', 'c13', 'c14'];
  const BOOK = (st) => bookParty(st);
  const bookMods = BOOK_FILES.map((id) => {
    if (typeof module === 'object' && module.exports) return require('./book/' + id + '.js');
    const g = typeof self !== 'undefined' ? self : this;
    return g.TowBook && g.TowBook[id];
  }).filter(Boolean);
  const H = { B, S, N, only, member, bookParty, BOOK };
  for (const m of bookMods) {
    Object.assign(SPEAKERS, m.speakers || {});
    Object.assign(NODES, m.nodes ? m.nodes(H) : {});
  }
  // Sim extras (fighter definitions, scenarios) from the chapters.
  (function registerSim() {
    let Sim = null;
    try { Sim = typeof module === 'object' && module.exports ? require('./sim.js') : (typeof self !== 'undefined' ? self : this).TowSim; } catch (e) { Sim = null; }
    if (!Sim) return;
    for (const m of bookMods) { Object.assign(Sim.DEFS, m.defs || {}); Object.assign(Sim.SCENARIOS, m.scenarios || {}); }
  })();

  // ------------------------------------------------------------ side episodes
  // Optional missions on the campaign map (all Proposals except quoted lines).
  // They never leave injuries. Each runs from `from` until a node with next 'map'.
  const party3 = (st) => roster(st).slice(0, 3);
  const EPISODES = {
    yard: { title: 'The Evaluation Yard', kind: 'training', from: 'yard.intro', repeat: true },
    gauntlet: { title: 'Yard Gauntlet', kind: 'arcade', from: 'gauntlet.fight', repeat: true },
    cart: { title: 'The Missing Supply Cart', kind: 'contract', from: 'cart.board' },
    stray: { title: 'Enough Teeth for Three', kind: 'contract', from: 'stray.board' },
    crossing: { title: 'The Old Crossing', kind: 'side', from: 'cross.ask' },
    deep: { title: 'The Deep Passage', kind: 'dungeon', from: 'deep.mouth', repeat: true },
    hire: { title: 'Three for Hire', kind: 'side', from: 'hire.intro', repeat: true },
    toll: { title: 'The Toll Bridge', kind: 'contract', from: 'toll.board' },
    orchard: { title: 'Wolves in the Orchard', kind: 'contract', from: 'orchard.board' },
    warren: { title: 'The Skeleton Warren', kind: 'contract', from: 'warren.board' },
  };
  Object.assign(NODES, {
    // ---- the tavern by the Guild: Ren, Mara and Brannoc take contracts with you
    'hire.intro': {
      type: 'scene', chapter: 'side', bg: 'tavern', next: 'hire.pick',
      lines: [
        N('The tavern by the Guild office, after the supper rush. Three regulars have been watching the contract board as closely as Kael has.'),
        N('Word at the bar is they want work with people who come back.'),
      ],
    },
    // Staged like the old character select (js/stages.js 'p.select').
    'hire.pick': { type: 'select', chapter: 'side', bg: 'tavern', field: 'companion', next: 'hire.done' },
    'hire.done': {
      type: 'scene', chapter: 'side', bg: 'tavern', next: 'map',
      lines: [
        S('@', {
          ren: 'A hundred and fifty years since the sky burned. Everyone in this town has a story about it. Mine ends at the Tower.',
          mara: 'My teacher said the summit was a matter of geometry. Then she climbed it and never came back. I intend to check her working.',
          brannoc: 'A caravan contract, a debt, and a Tower full of bounties. One of those I can pay off this year.',
        }),
        N('Your new companion takes the Guild’s side contracts with Kael and Eiryn. Come back to the tavern any time to change who rides with you.'),
      ],
    },

    // ---- more Guild contracts (Proposals: the book's contract board lists "road repairs,
    // missing cargo, an escort to the coast"; these are in that spirit)
    'toll.board': {
      type: 'scene', chapter: 'side', bg: 'guild', next: 'toll.bridge',
      lines: [
        N('The contract board: road repairs, missing cargo, an escort to the coast. A new notice has been pinned over the old ones. Someone has taken the old stone bridge east of town and started charging a toll.'),
        B('companion', 'Four of them, the notice says. Armed. Polite about it, apparently.'),
        B('kael', 'Polite is worse.'),
      ],
    },
    'toll.bridge': {
      type: 'scene', chapter: 'side', bg: 'ruins', next: 'toll.fight',
      lines: [
        N('At the bridge, a broad man is sitting on the parapet with a ledger, as though he has always been there.'),
        S('toll', 'Toll’s two coppers a head. Three coppers if you’re carrying a sword. You’re carrying a sword.'),
        B('kael', 'The Guild would like a word about the bridge.'),
      ],
    },
    'toll.fight': {
      type: 'battle', chapter: 'side', scenario: 'toll', wounds: false, xp: 90, loot: 'storm',
      party: (st) => party3(st), win: 'toll.after',
      outro: 'The bandits break and run. The ledger is left on the parapet, open to a very short page.',
    },
    'toll.after': {
      type: 'scene', chapter: 'side', bg: 'ruins', next: 'map',
      lines: [
        N('The toll-taker’s ledger records eleven payments. Eiryn reads it twice.'),
        B('eiryn', 'He was honest about the numbers, at least.'),
        N('The Guild pays for the bridge, and promises to send someone to count what was taken.'),
      ],
    },
    'orchard.board': {
      type: 'scene', chapter: 'side', bg: 'guild', next: 'orchard.rows',
      lines: [
        N('A grower from the farms past the clearing has pinned a notice of her own, in careful handwriting: something is in the orchard at night, and it is not deer.'),
        B('companion', 'Two of them. They come at dusk and leave the fruit alone.'),
        B('kael', 'Then it’s not the fruit they want.'),
      ],
    },
    'orchard.rows': {
      type: 'scene', chapter: 'side', bg: 'forest', next: 'orchard.fight',
      lines: [
        N('The orchard is quiet in the failing light. Windfalls lie untouched between the rows. Something moves in the next row over — and then something else, from the other side.'),
      ],
    },
    'orchard.fight': {
      type: 'battle', chapter: 'side', scenario: 'orchard', wounds: false, xp: 100, loot: 'beast',
      party: (st) => party3(st), win: 'orchard.after',
      outro: 'The second beast follows the first into the dark. The orchard is quiet again.',
    },
    'orchard.after': {
      type: 'scene', chapter: 'side', bg: 'forest', next: 'map',
      lines: [
        N('The grower brings out a basket of fruit as payment, and apologises that it is only fruit.'),
        B('kael', 'Fruit is fine.'),
        B('eiryn', 'It smells like something I used to know.'),
      ],
    },
    'warren.board': {
      type: 'scene', chapter: 'side', bg: 'guild', next: 'warren.fight',
      lines: [
        B('kael', 'We said something genuinely small this time.'),
        B('companion', 'It was small. Then it was a warren.'),
        N('The skeletons from the quarry did not all die in the cave. The Guild has found where the rest went: a hollow under the old quarry road, dug deeper than any skeleton should dig. A chief has been seen, wearing a grain sack as a cloak.'),
        B('eiryn', 'I shall ask every skeleton whether it has one hidden in a cupboard.'),
      ],
    },
    'warren.fight': {
      type: 'battle', chapter: 'side', scenario: 'warren', wounds: false, xp: 130, loot: 'chief',
      party: (st) => party3(st), win: 'warren.after',
      outro: 'The chief goes down in a heap of grain sacks. The warren empties out into the dark.',
    },
    'warren.after': {
      type: 'scene', chapter: 'side', bg: 'cave', next: 'map',
      lines: [
        N('The warren is cleared. The miller’s tools are found, stacked neatly beside a very small bed.'),
        B('kael', 'We are not telling the miller about the bed.'),
      ],
    },

    // ---- the Guild's evaluation yard: practice against glyph-driven blocks
    'yard.intro': {
      type: 'scene', chapter: 'side', bg: 'guild', next: 'yard.fight',
      lines: [
        N('Behind the Guild office: a low stone wall, marked lines, three stone blocks and a wooden target.'),
        B('evaluator', 'Now show me something you can sustain while moving.'),
        S('evaluator', 'The blocks will push back. Glyph-driven. They hit about as hard as a shove — don’t make me fill in an injury form.'),
      ],
    },
    'yard.fight': {
      type: 'battle', chapter: 'side', scenario: 'training', wounds: false, xp: 30, loot: 'yard',
      party: (st) => party3(st), win: 'yard.after',
      tips: [
        'Your fighters choose their own moves. Watch the glowing ground: that’s a wind-up.',
        'When ALL OUT is lit, tap it: everyone attacks flat out, then is drained for a few seconds.',
        'Tap one of your fighters to follow them. Hold the flag to withdraw.',
      ],
      outro: 'The blocks settle back onto their marks.',
    },
    'yard.after': {
      type: 'scene', chapter: 'side', bg: 'guild', next: 'map',
      lines: [S('evaluator', 'Adequate. Come back when you want to be better than adequate.')],
    },
    // ---- arcade: endless waves; the score is how many you clear
    'gauntlet.fight': {
      type: 'battle', chapter: 'side', scenario: 'arcade', wounds: false, xp: 0, arcade: true, loot: 'gauntlet',
      party: (st) => party3(st), win: 'map', lose: 'map',
      outro: 'The yard falls quiet.',
    },

    // ---- Guild contract: the missing supply cart (set up by the book's contract board)
    'cart.board': {
      type: 'scene', chapter: 'side', bg: 'guild', next: 'cart.ditch',
      lines: [
        B('companion', 'Missing supply cart north of town.'),
        B('kael', 'Carts end up in ditches.'),
        B('companion', 'Then find the ditch.'),
      ],
    },
    'cart.ditch': {
      type: 'scene', chapter: 'side', bg: 'road', next: 'cart.road',
      lines: [
        N('The north road. A cart on its side in the ditch, its cargo gone. Fresh boot prints — and a short knife’s sheath, dropped in the mud.'),
        S('knifeman', 'You again. You don’t learn, do you?'),
        S('@', { ren: 'You’re the one with the knife. From the clearing.', mara: 'You were in the clearing. You ran.', brannoc: 'Ah. The one who ran first.' }),
      ],
    },
    'cart.road': {
      type: 'battle', chapter: 'side', scenario: 'cart', wounds: false, xp: 80, loot: 'tremor',
      party: (st) => party3(st), win: 'cart.after',
      outro: 'The thugs scatter. The miller’s neighbour will get his flour after all.',
    },
    'cart.after': {
      type: 'scene', chapter: 'side', bg: 'road', next: 'map',
      lines: [
        S('knifeman', 'She’s trouble. All of you are trouble.'),
        B('kael', 'Then you should have left the cart alone.'),
        N('You right the cart. The Guild pays on delivery.'),
      ],
    },

    // ---- Guild contract: the stray (the book's "enough teeth for three animals")
    'stray.board': {
      type: 'scene', chapter: 'side', bg: 'guild', next: 'stray.fight',
      lines: [
        B('kael', 'The last “easy” contract someone recommended involved a stray animal with enough teeth for three animals.'),
        B('companion', 'You got paid.'),
        B('kael', 'I also got bitten.'),
        B('companion', 'Only once.'),
        N('The new notice describes something worse. It has been taking sheep from the farms past the clearing.'),
      ],
    },
    'stray.fight': {
      type: 'battle', chapter: 'side', scenario: 'stray', wounds: false, xp: 100, loot: 'beast',
      party: (st) => party3(st), win: 'stray.after',
      outro: 'The stray limps into the trees and does not come back.',
    },
    'stray.after': {
      type: 'scene', chapter: 'side', bg: 'forest', next: 'map',
      lines: [
        B('kael', 'I wasn’t aware there was an acceptable number of bites.'),
        S('@', { ren: 'Zero. The number is zero.', mara: 'Statistically, you’re doing well.', brannoc: 'Shield. Get a shield.' }),
      ],
    },

    // ---- side story: the old crossing (Eiryn's bridge). Needs her trust.
    'cross.ask': {
      type: 'scene', chapter: 'side', bg: 'market', next: 'cross.bridge',
      lines: [
        B('eiryn', 'There was a town east of here. On the other side of the hills. A stone bridge crossed the river before the houses.'),
        N('The mapmaker said the bridge is still standing. Eiryn asks you, not Kael, whether you would walk there with her.'),
        N('The river changed course long ago. The bridge stands over a stretch of dry stones.'),
        S('eiryn', 'There was a cart here once. On a rainy morning. I thought the wheel would come off before he made it across.'),
        N('Something moves between the broken walls. Shapes of people that are not people, and a sound like a bell under water.'),
      ],
    },
    'cross.bridge': {
      type: 'battle', chapter: 'side', scenario: 'crossing', wounds: false, xp: 140, loot: 'relic',
      party: (st) => party3(st), win: 'cross.after',
      outro: 'The echoes come apart like smoke. The bell stops ringing.',
    },
    'cross.after': {
      type: 'scene', chapter: 'side', bg: 'road', next: 'map',
      lines: [
        S('eiryn', 'Those were people. Once. Or what was left of where people stood.'),
        N('She touches the green ornament at her collar and does not explain. You do not ask. That seems to matter to her.'),
      ],
    },

    // ---- dungeon: the deep passage behind the quarry (after Chapter Five)
    'deep.mouth': {
      type: 'scene', chapter: 'side', bg: 'cave', next: 'deep.1',
      lines: [
        N('The two skeletons that fled went deeper. The passage behind the warlord’s chamber goes down into the hill.'),
        B('kael', 'We go far enough to see what they’ve taken. Then we decide.'),
        N('Three chambers. No way to rest between them, unless you make one.'),
      ],
    },
    'deep.1': {
      type: 'battle', chapter: 'side', scenario: 'deep1', wounds: false, xp: 60, carry: true, loot: 'deep',
      party: (st) => party3(st), win: 'deep.rest',
    },
    'deep.rest': {
      type: 'scene', chapter: 'side', bg: 'cave', next: 'deep.2', set: { deepRest: 1 },
      lines: [N('A trickle of clean water runs down the wall. There is no better place to stop. You rest and drink, and everyone recovers a little.')],
    },
    'deep.2': {
      type: 'battle', chapter: 'side', scenario: 'deep2', wounds: false, xp: 70, carry: true, loot: 'deep',
      party: (st) => party3(st), win: 'deep.3',
    },
    'deep.3': {
      type: 'battle', chapter: 'side', scenario: 'deep3', wounds: false, xp: 120, carry: true, loot: 'chief',
      party: (st) => party3(st), win: 'deep.end',
      outro: 'The chief drops the miller’s cleaver and flees into the dark.',
    },
    'deep.end': {
      type: 'scene', chapter: 'side', bg: 'cave', next: 'map',
      lines: [N('The skeletons’ hoard: stolen tools, a sack of coins, and things they took from people who never reported them.')],
    },
  });

  // ------------------------------------------------------------ state
  function fresh() {
    return { v: 1, node: 'p.lore', starter: null, companion: null, xp: 0, flags: {}, seen: {}, wins: {}, opened: {}, done: {}, side: null, best: {}, grades: {} };
  }
  function normalise(st) {
    if (!st || st.v !== 1 || !NODES[st.node]) return fresh();
    st.flags = st.flags || {}; st.seen = st.seen || {}; st.wins = st.wins || {};
    st.opened = st.opened || {}; st.done = st.done || {}; st.best = st.best || {}; st.grades = st.grades || {};
    if (st.side && !NODES[st.side.node]) st.side = null;
    // Saves from before the book's party: the old starter becomes a companion,
    // and a save parked at the retired select or party choice moves on.
    // (the hired companions are gone: the author removed Ren, Mara and Brannoc, 2026-10-22)
    st.starter = null; st.companion = null;
    if (st.node === 'p.select' || st.node === 'p.who') st.node = 'c1.tavern';
    if (st.node === 'c4.party') st.node = 'c5.mill';
    // choice screens are gone: a save parked on one moves to where it led
    const gone = { 'c1.trust': 'c1.walk', 'c3.fine': 'c3.kael', 'c3.paid': 'c3.guild', 'c3.argue': 'c3.guild' };
    if (gone[st.node]) st.node = gone[st.node];
    return st;
  }

  // The node being played: inside a side episode if one is running.
  function cur(st) { return st.side ? st.side.node : st.node; }
  function node(st) { return NODES[cur(st)]; }

  // A scene's lines for this playthrough: conditions applied, text and speaker resolved.
  function lines(st, n) {
    n = n || node(st);
    return (n.lines || []).map((l, src) => ({ l, src })).filter(({ l }) => (!l.when || l.when(st)) && (l.who !== '@' || you(st)))
      .map(({ l, src }) => ({ who: l.who, speaker: speaker(st, l.who), text: text(st, l.text), book: !!l.book, src, tone: l.tone, silent: !!l.silent, hold: l.hold }));
  }

  function setFlags(st, set) {
    for (const k in set || {}) {
      const v = set[k];
      if (typeof v === 'number' && k !== 'party') st.flags[k] = Math.max(0, (st.flags[k] || 0) + v);
      else st.flags[k] = v;
    }
  }

  // What a node gives on arrival: flags and experience (a scene on a path can pay out).
  function entered(st, n) {
    if (n.set) setFlags(st, n.set);
    if (n.xp && n.type !== 'battle') st.xp += n.xp;
  }

  function goTo(st, id) {
    if (st.side) {
      if (id === 'map') { endSide(st); return null; }
      if (!NODES[id]) throw new Error('story: no node ' + id);
      st.side.node = id;
      entered(st, NODES[id]);
      return NODES[id];
    }
    if (!NODES[id]) throw new Error('story: no node ' + id);
    st.node = id;
    st.seen[NODES[id].chapter] = true;
    entered(st, NODES[id]);
    return NODES[id];
  }

  // ---- the campaign map between chapters
  // True when the main story waits at the start of a chapter not yet opened
  // from the map.
  function atGate(st) { return !st.side && CHAPTER_START[st.node] && !st.opened[CHAPTER_START[st.node]]; }
  function openChapter(st) { if (CHAPTER_START[st.node]) st.opened[CHAPTER_START[st.node]] = true; }

  // ---- side episodes
  function startSide(st, ep) {
    const e = EPISODES[ep];
    if (!e) throw new Error('story: no episode ' + ep);
    st.side = { ep, node: e.from, hp: {} };
    if (ep === 'deep') { delete st.flags.deepRest; delete st.flags.deepGreed; }
    return NODES[e.from];
  }
  function endSide(st) {
    if (!st.side) return;
    st.done[st.side.ep] = (st.done[st.side.ep] || 0) + 1;
    st.side = null;
  }
  function leaveSide(st) { st.side = null; }

  // Who speaks '@' lines: a hired companion, inside side episodes.
  function you(st) { return st.side ? st.companion : null; }
  // Text for the current companion.
  function text(st, t) { return typeof t === 'string' ? t : t[you(st) || st.companion] || t.ren; }
  function speaker(st, who) {
    if (!who) return null;
    if (who === '@') { const c = STARTERS[you(st) || st.companion]; return { name: c ? c.name.split(' ')[0] : 'You', tone: 'you' }; }
    return SPEAKERS[who] || { name: who, tone: 'plain' };
  }

  // Scenes and cards: move on.
  function advance(st) {
    const n = node(st);
    if (n.type === 'fork' || n.type === 'battle' || n.type === 'select' || n.type === 'end') throw new Error('story: advance on ' + n.type);
    // (cinematic nodes advance like scenes once they finish or are skipped)
    // A side scene going back to the map ends the episode.
    return goTo(st, n.next);
  }

  function optionOpen(st, o) { return !o.need || (st.flags[o.need] || 0) > 0; }
  function choose(st, i) {
    const n = node(st);
    if (n.type !== 'fork') throw new Error('story: choose on ' + n.type);
    const o = n.options[i];
    if (!o || !optionOpen(st, o)) return null;
    setFlags(st, o.set);
    return goTo(st, o.next);
  }

  function pickStarter(st, key) {
    if (node(st).type !== 'select' || !STARTERS[key]) throw new Error('story: bad starter ' + key);
    st[node(st).field || 'starter'] = key;
    return goTo(st, node(st).next);
  }

  // What main.js passes to Sim.createMatch for a battle node.
  function battle(st) {
    const n = node(st);
    if (n.type !== 'battle') return null;
    let party = n.party(st);
    // Dungeon rooms carry health over from the last room.
    if (n.carry && st.side) {
      const heal = st.flags.deepRest && cur(st) === 'deep.2' ? 0.25 : 0;
      party = party.map((m) => Object.assign(m, { hpFrac: Math.max(0.15, Math.min(1, (st.side.hp[m.key] == null ? 1 : st.side.hp[m.key]) + heal)) }));
    }
    return {
      scenario: n.scenario,
      party,
      side: !!st.side, carry: !!n.carry, arcade: !!n.arcade, loot: n.loot || null,
      greed: !!st.flags.deepGreed,
      mods: n.mods ? n.mods(st) : undefined,
      wounds: !!n.wounds,
      allyLevel: n.allyLevel ? teamLevel(st) : undefined, // the book's heroes fixed in a scenario
      tutorial: !!n.tutorial,
      tips: n.tips || null,
      grant: n.grant || null, // story gear handed over on the first win
      outro: n.outro || null,
    };
  }

  // After a battle. Win: experience and move on. Loss: the prologue moves on
  // anyway (it is the past); story fights stay put to be tried again.
  // hpFracs (optional): each fighter's health at the end, for dungeon rooms.
  // score (optional): arcade waves cleared.
  function finishBattle(st, outcome, hpFracs, score) {
    const n = node(st);
    if (n.type !== 'battle') throw new Error('story: finishBattle on ' + n.type);
    const before = teamLevel(st);
    const id = cur(st);
    if (n.arcade) {
      st.best[id] = Math.max(st.best[id] || 0, score || 0);
      st.xp += 15 * (score || 0);
      goTo(st, n.win);
      return { xp: 15 * (score || 0), levelUp: teamLevel(st) > before, level: teamLevel(st), score: score || 0 };
    }
    if (outcome === 'win') {
      st.xp += n.xp || 0;
      st.wins[id] = (st.wins[id] || 0) + 1;
      if (n.carry && st.side && hpFracs) st.side.hp = Object.assign({}, hpFracs);
      goTo(st, n.win);
    } else if (outcome === 'loss' && n.lose) goTo(st, n.lose);
    else if (outcome !== 'win' && st.side && n.carry) leaveSide(st); // a dungeon run ends on a wipe or withdrawal
    return { xp: outcome === 'win' ? n.xp || 0 : 0, levelUp: teamLevel(st) > before, level: teamLevel(st) };
  }

  // Everyone who has joined so far, for the team panel.
  // Side missions take Kael, Eiryn and the hired companion (or the next
  // book hero to have joined when there is none).
  function roster(st) {
    if (!st.seen.c1) return [];
    const r = ['kael'];
    if (st.seen.c2) r.push('eirynMage');
    if (st.companion) r.push(st.companion);
    for (const m of bookParty(st).slice(2)) r.push(m.key);
    return r.map((k) => member(st, k));
  }
  // Everyone you could put on the team screen (joined book heroes and companion).
  function team(st) { return roster(st); }

  function chapters(st) {
    const cur = NODES[st.node].chapter;
    const idx = CHAPTERS.findIndex((c) => c.id === cur);
    return CHAPTERS.map((c, i) => ({ id: c.id, label: c.label, title: c.title, status: i < idx ? 'done' : i === idx ? 'current' : 'locked' }));
  }

  return {
    NODES, STARTERS, SPEAKERS, CHAPTERS, CHAPTER_START, EPISODES, LEVEL_XP, BOOK_FILES,
    fresh, normalise, cur, node, lines, advance, choose, optionOpen, pickStarter, battle, finishBattle,
    atGate, openChapter, startSide, endSide, leaveSide,
    text, speaker, teamLevel, levelFor, roster, team, chapters, member, bookParty,
  };
});
