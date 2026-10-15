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
 *   choice  { bg, prompt, options: [{label, hint, set, next, need}] }
 *   select  { }                                    pick the starting character
 *   battle  { scenario, party(st), mods(st), hearts, xp, win, intro }
 *   end     { }                                    the end of the written story
 * Every node but choice and battle has `next`.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TowStory = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // A line's text can be one string, or one per starter: { ren, mara, brannoc }.
  const B = (who, text) => ({ who, text, book: true });
  const S = (who, text) => ({ who, text });
  const N = (text) => ({ who: null, text });
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
    cook: { name: 'The cook', tone: 'plain' },
    guard: { name: 'Gate guard', tone: 'plain' },
    officer: { name: 'Older guard', tone: 'plain' },
    registrar: { name: 'Registrar', tone: 'plain' },
    evaluator: { name: 'Evaluator', tone: 'plain' },
    miller: { name: 'The miller', tone: 'plain' },
    climber: { name: '???', tone: 'foe' },
    companion: { name: 'Contract reader', tone: 'plain' },
    knifeman: { name: 'The man with the knife', tone: 'foe' },
  };

  // The three starting characters (all Proposals; see docs/STORY.md).
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

  // Who stands with you in Chapter Five.
  function quarryParty(st) {
    const p = [member(st, st.starter)];
    const pick = st.flags.party || 'both';
    if (pick === 'both' || pick === 'kael') p.push(member(st, 'kael'));
    if (pick === 'both' || pick === 'eiryn') p.push(member(st, 'eirynMage'));
    return p;
  }

  // ------------------------------------------------------------ chapters
  // For the campaign map. `from` is the first node of the chapter.
  // The first node of each chapter after the prologue: reaching one returns
  // the player to the campaign map, where the next chapter waits.
  // (No gate before Chapter One: character select happens in the tavern and
  // the story runs straight on into it.)
  const CHAPTER_START = { 'c2.gate': 'c2', 'c4.guild': 'c4', 'c5.mill': 'c5', end: 'c6' };

  const CHAPTERS = [
    { id: 'prologue', label: 'Prologue', title: 'The Last Ascent', from: 'p.lore' },
    { id: 'c1', label: 'Chapter One', title: 'The Clearing', from: 'c1.tavern' },
    { id: 'c2', label: 'Chapters Two & Three', title: 'A Town Grown Strange', from: 'c2.gate' },
    { id: 'c4', label: 'Chapter Four', title: 'The First Contract', from: 'c4.guild' },
    { id: 'c5', label: 'Chapter Five', title: 'The Quarry', from: 'c5.mill' },
    { id: 'c6', label: 'Chapter Six', title: 'Beyond the manuscript', from: 'end' },
  ];

  // ------------------------------------------------------------ the graph
  const NODES = {
    // ---------------------------------------------------------- prologue
    // The opening cinematic: the world before the Reset (js/render/opening.js).
    'p.lore': { type: 'cinematic', chapter: 'prologue', name: 'opening', next: 'p.tower' },
    'p.open': { type: 'card', chapter: 'prologue', bg: 'tower', title: 'TOWER OF WISHES', sub: 'Reach the summit, and you could make a wish.', next: 'p.tower' },
    'p.tower': {
      type: 'scene', chapter: 'prologue', bg: 'tower', next: 'p.ascent',
      lines: [
        N('The Tower had been there longer than any history anyone had read. Its upper reaches disappeared into the permanent cloud ceiling.'),
        N('Stories disagreed about nearly everything else — the floors, the dangers, the people who’d vanished inside — but they all arrived at the same promise.'),
        N('Far away, high inside the Tower, a climber reached the last ascent.'),
        N('Blood had dried along one side of the stranger’s face. The weapon in their hand was broken. No companion followed.'),
        N('Something was waiting on the final floor. Something no one had ever seen clearly.'),
      ],
    },
    'p.ascent': {
      type: 'battle', chapter: 'prologue', scenario: 'tutorial', hearts: false, xp: 0, tutorial: true,
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
        N('Above the final steps was a brightness too pale to see through.'),
        N('The climber reached toward it.'),
      ],
    },
    'p.reset': {
      type: 'scene', chapter: 'prologue', bg: 'reset', next: 'p.later',
      lines: [
        N('Then the clouds began to burn.'),
        N('A straight white line opened overhead, from horizon to horizon. Red gathered at its edges.'),
        N('Fire descended in sheets. Then the water came — a dark wall rising beyond the rooftops, carrying doors and whole houses.'),
        N('On a burning roof, a silver-haired mage cast the preservation spell. It could hold only its caster.'),
        N('The world remembered it as the Reset.'),
      ],
    },
    'p.later': { type: 'card', chapter: 'prologue', bg: 'dawn', title: 'TWENTY-TWO YEARS LATER', sub: 'The Tower still stands. Someone is always climbing.', next: 'p.select' },
    // Character select happens in the tavern (staged: js/stages.js 'p.select').
    'p.select': { type: 'select', chapter: 'prologue', bg: 'tavern', next: 'p.who' },
    'p.who': {
      type: 'scene', chapter: 'prologue', bg: 'tavern', next: 'c1.tavern',
      lines: [
        S('@', {
          ren: 'Twenty-two years since the sky burned. Everyone in this town has a story about it. Mine ends at the Tower.',
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
        N('At the next table, a Guild swordsman has decided the stew tastes burnt. This is, apparently, a controversial opinion.'),
        B('spear', 'It’s smoked pepper. They’ve been putting it in since spring.'),
        B('kael', 'Then they’ve been burning it since spring.'),
        B('spear', 'You know the cook can hear you.'),
        B('kael', 'Distinctive. I was telling them your stew has a very distinctive flavor.'),
        B('cook', 'Then you’ll have no trouble finishing it.'),
      ],
    },
    'c1.formation': {
      type: 'scene', chapter: 'c1', bg: 'formation', next: 'c1.run',
      lines: [
        N('Above the distant treeline, purple light gathers in the air. Fine lines curve around a bright center, ring inside ring, turning against one another.'),
        S('@', {
          ren: 'That’s not a Guild exercise.',
          mara: 'That construction is… old. Nobody draws rings like that any more.',
          brannoc: 'Whoever built that is either very good or about to be very sorry.',
        }),
        N('One of the inner rings stops. The whole formation shudders, holds — and comes apart over the trees.'),
        B('kael', 'I’m going outside.'),
        B('spear', 'You’re doing that thing with your face. The one you do before you run at a problem.'),
        B('kael', 'That’s why I’m going to see.'),
        N('He sets off before she can offer an opinion.'),
        S('@', { ren: 'Wait. I\u2019m coming with you.', mara: 'Hold on \u2014 I want to see that construction up close.', brannoc: 'Not without me, you\u2019re not.' }),
        N('You leave your stew and go after him.'),
      ],
    },
    'c1.run': {
      type: 'scene', chapter: 'c1', bg: 'forest', next: 'c1.voice',
      lines: [
        N('The road curves north past the market square. Kael follows it until the houses thin, then cuts across hard ground toward the woods.'),
        S('@', { ren: 'Keep up.', mara: 'You run like someone who\u2019s been hit before.', brannoc: 'Go. I\u2019ll be right behind you. Eventually.' }),
        N('Behind them, the ordinary noise of the town fades, replaced by wind moving through the first trees.'),
      ],
    },
    'c1.voice': {
      type: 'scene', chapter: 'c1', bg: 'forest', next: 'c1.approach',
      lines: [
        N('At the forest’s edge, a man laughs. Another answers. Then a woman, clearly enough to carry through the trees:'),
        B('eiryn', 'Keep your hands off me.'),
        N('Four men in a clearing. A broad-shouldered one by the fallen tree, one with a short knife, one moving round the right, one hanging back by the path.'),
        N('The woman they have cornered has long silver-white hair. She is exhausted.'),
        B('broad', 'Then do another trick. The big one. We all saw it.'),
        B('knife', 'She can’t. Look at her.'),
      ],
    },
    'c1.approach': {
      type: 'choice', chapter: 'c1', bg: 'forest', prompt: 'How do you go in?',
      options: [
        { label: 'Charge in first', hint: 'You hit them before they turn: the bandits start staggered. Kael arrives a beat behind you.', set: { approach: 'charge' }, next: 'c1.fight' },
        { label: 'Circle round the fallen tree', hint: 'You come in beside her. The lookout bolts and can’t distract anyone.', set: { approach: 'circle' }, next: 'c1.fight' },
        { label: 'Let Kael go first', hint: 'Kael steps out — “That’s enough.” — and starts with his heavy art part-charged.', set: { approach: 'follow', kaelBond: 1 }, next: 'c1.fight' },
      ],
    },
    'c1.fight': {
      type: 'battle', chapter: 'c1', scenario: 'clearing', hearts: true, xp: 100,
      party: (st) => [member(st, st.starter)], mods: (st) => ({ approach: st.flags.approach }), win: 'c1.after',
      outro: 'The bandits are beaten or gone. Nobody dies in the clearing.',
    },
    'c1.after': {
      type: 'scene', chapter: 'c1', bg: 'forest', next: 'c1.trust',
      lines: [
        B('kael', 'They’re gone.'),
        B('eiryn', 'Good.'),
        B('kael', 'Are you hurt?'),
        B('eiryn', 'Not by them.'),
        B('kael', 'That spell over the trees. Was it yours?'),
        B('eiryn', 'It would have been considerably more impressive if it had worked.'),
        N('Kael offers his waterskin.'),
        B('eiryn', 'That’s what somebody trying to poison me would say.'),
        B('kael', 'Then I’m apparently very committed to the plan.'),
      ],
    },
    'c1.trust': {
      type: 'choice', chapter: 'c1', bg: 'forest', prompt: 'She sits on the fallen trunk, shaking. What do you do?',
      options: [
        { label: 'Stay with her while she rests', hint: 'Eiryn will trust you more. In later fights she starts with her glyphs part-charged.', set: { trust: 1 }, next: 'c1.walk' },
        { label: 'Search what the bandits dropped', hint: 'You find a few coins. Eiryn notices you weren’t there.', set: { gold: 1 }, next: 'c1.walk' },
      ],
    },
    'c1.walk': {
      type: 'scene', chapter: 'c1', bg: 'road', next: 'c2.gate',
      lines: [
        B('kael', 'I’m Kael.'),
        B('eiryn', 'Eiryn.'),
        S('@', { ren: 'Ren. Ren Ashgrove.', mara: 'Mara Quill. Registered caster.', brannoc: 'Brannoc Vell. Pleasure.' }),
        B('eiryn', 'There should be a crossing east of here. A stone one, before the hills.'),
        B('kael', 'Not on the road I came by.'),
        B('eiryn', 'There was.'),
        N('Beyond the last branches lie the road and the first roofs of the town. Eiryn stops and looks at them as if they are in the wrong place.'),
        B('eiryn', 'I thought I knew this place.'),
      ],
    },

    // ---------------------------------------------------------- chapters two and three
    'c2.gate': {
      type: 'scene', chapter: 'c2', bg: 'town', next: 'c2.tavern',
      lines: [
        N('The town is busy in the ordinary, irritating way towns get near supper. Eiryn stares at the water wheel, the lamps, the pipes in the wall.'),
        B('eiryn', 'There was a town east of here. On the other side of the hills. A stone bridge crossed the river before the houses.'),
        B('kael', 'There isn’t much there anymore. A few foundations. One wall, maybe.'),
        B('eiryn', 'How long?'),
        B('kael', 'Since the Reset, I think. About twenty-two years.'),
        B('eiryn', 'Twenty-two.'),
        B('eiryn', 'You said there was food.'),
      ],
    },
    'c2.tavern': {
      type: 'scene', chapter: 'c2', bg: 'tavern', next: 'c3.tea',
      lines: [
        B('cook', 'You were gone long enough that I gave your stew to the dog.'),
        B('kael', 'Cruel. To the dog.'),
        B('cook', 'He liked it.'),
        B('eiryn', 'What do they say about the Tower?'),
        B('kael', 'That someone reached the top. That they made a wish, and then the world was destroyed. That’s the usual version.'),
        N('At the word wish, something in her face changes.'),
        B('kael', 'You don’t have to explain everything tonight.'),
        B('eiryn', 'That sounds like the best offer I’m going to get.'),
      ],
    },
    'c3.tea': {
      type: 'scene', chapter: 'c2', bg: 'market', next: 'c3.fine',
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
    'c3.fine': {
      type: 'choice', chapter: 'c2', bg: 'market', prompt: 'Eiryn can’t pay the fine.',
      options: [
        { label: 'Pay it yourself', hint: 'You spend what you found in the clearing. Eiryn won’t forget it.', need: 'gold', needText: 'You have no money to spare', set: { trust: 1, gold: -1 }, next: 'c3.paid' },
        { label: 'Let Kael cover it', hint: 'As in the book. Kael is broke, and starts to rely on you: he fights a level higher.', set: { kaelBond: 1 }, next: 'c3.kael' },
        { label: 'Argue with the guard', hint: 'The fine goes up and Kael pays anyway — but Eiryn liked that you stood up for her.', set: { trust: 1, argued: 1 }, next: 'c3.argue' },
      ],
    },
    'c3.paid': {
      type: 'scene', chapter: 'c2', bg: 'market', next: 'c3.guild',
      lines: [
        N('You count the coins from the clearing onto the counter before Kael can reach for his purse.'),
        B('eiryn', 'I’ll pay you back.'),
        S('@', { ren: 'I was hoping you’d say that.', mara: 'I’ll hold you to it. With interest.', brannoc: 'Buy me a drink when the Guild pays us. We’re square.' }),
      ],
    },
    'c3.kael': {
      type: 'scene', chapter: 'c2', bg: 'market', next: 'c3.guild',
      lines: [
        B('kael', 'No need.'),
        N('By the time the guard hands him the written warning, the greater part of his money is gone.'),
        B('kael', 'Great. Now I’m broke too.'),
        B('eiryn', 'You’re enjoying this.'),
        B('kael', 'Not financially.'),
      ],
    },
    'c3.argue': {
      type: 'scene', chapter: 'c2', bg: 'market', next: 'c3.guild',
      lines: [
        S('@', { ren: 'It was a cup of tea.', mara: 'That was a four-line warming glyph. I’ve seen apprentices do worse in their sleep.', brannoc: 'You’re fining her for being cold?' }),
        B('officer', 'Miss, we’ve had three injuries this season from unlicensed heating spells near food stalls.'),
        N('There is an additional processing charge. Kael pays it, looking pained.'),
        B('eiryn', 'I wasn’t trying to cause trouble.'),
        B('kael', 'I know that, too.'),
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
      type: 'scene', chapter: 'c4', bg: 'guild', next: 'c4.board',
      lines: [
        N('The Guild office smells of damp wool, sealing wax, and the lunch somebody abandoned on a windowsill.'),
        B('registrar', 'Name, place of origin, trade or training, and any previous contract registration.'),
        B('registrar', 'How long have you been practicing?'),
        B('eiryn', 'Quite a while.'),
        N('In the evaluation yard, Eiryn slides the middle block onto its mark and back. Keeping a counter floating as she walks is harder. It dips twice.'),
        B('evaluator', 'You’re accurate, and you understand how to keep an effect contained.'),
        B('evaluator', 'Your initial credential will be at F rank. It records what this office has verified, not everything you might be capable of.'),
        B('eiryn', 'Apparently I’m a beginner.'),
      ],
    },
    'c4.board': {
      type: 'scene', chapter: 'c4', bg: 'guild', next: 'c4.party',
      lines: [
        N('The contract board: road repairs, missing cargo, an escort to the coast. Then a smaller notice — goblins raiding a mill’s grain store, holed up in an abandoned quarry.'),
        B('eiryn', 'That looks straightforward.'),
        B('kael', 'It’s an early contract. Small group reported, no deaths, stolen food and tools.'),
        S('@', { ren: 'Goblins. I can be up that hill before they know we’re there.', mara: 'Goblins scatter from force bolts. This is my kind of contract.', brannoc: 'Goblins in a quarry. Narrow paths. I’ll take the front.' }),
      ],
    },
    'c4.party': {
      type: 'choice', chapter: 'c4', bg: 'guild', prompt: 'Who goes to the quarry with you?',
      options: [
        { label: 'Kael and Eiryn', hint: 'All three of you. The safest party — and how the book tells it.', set: { party: 'both' }, next: 'c5.mill' },
        { label: 'Just Kael', hint: 'Eiryn rests her mana. A sword beside you, but no one to break a big foe from range.', set: { party: 'kael' }, next: 'c5.mill' },
        { label: 'Just Eiryn', hint: 'Kael rests his shoulder. No sword beside you, just her glyphs and your fighting. The riskiest party.', need: 'trust', needText: 'Eiryn doesn’t trust you enough yet', set: { party: 'eiryn' }, next: 'c5.mill' },
      ],
    },

    // ---------------------------------------------------------- chapter five
    'c5.mill': {
      type: 'scene', chapter: 'c5', bg: 'hill', next: 'c5.fork',
      lines: [
        B('miller', 'They’ve been coming after dark. First the grain. Then a box of tools. My youngest tried to chase them and came back with a cut on his arm.'),
        KB('How many?'),
        B('miller', 'Four, maybe five. Hard to count when they’re running through the sheds.'),
        EB('You said goblins are usually manageable.'),
        KB('They are. One at a time. They get more confident in groups, which is why we don’t let them decide where the fight happens.'),
        N('Halfway up the second hill the road divides round marshy ground. The shorter path is flooded.'),
      ],
    },
    'c5.fork': {
      type: 'choice', chapter: 'c5', bg: 'hill', prompt: 'Which way up to the quarry?',
      options: [
        { label: 'The longer path', hint: 'Dry and slow. You arrive fresh and the goblins see you coming.', set: { route: 'long' }, next: 'c5.path' },
        { label: 'Wade the flooded shortcut', hint: 'You arrive soaked and tired (less health), but you catch the goblins off guard.', set: { route: 'wade' }, next: 'c5.path' },
      ],
    },
    'c5.path': {
      type: 'scene', chapter: 'c5', bg: 'hill', next: 'c5.pathfight',
      lines: [
        N('A goblin squats by a stolen sack, tearing at the stitching with its teeth. It looks up and lets out a sharp cry.'),
        N('From higher on the hill comes an answering cry.'),
        EB('And now the rest know we’re here.'),
        N('Two goblins appear above the path, one with a short spear and the other with a rough wooden bow. A third drops out of the scrub.'),
        KB('Down!'),
        only((st) => !hasKael(st), S('@', 'Get down!')),
      ],
    },
    'c5.pathfight': {
      type: 'battle', chapter: 'c5', scenario: 'path', hearts: true, xp: 120,
      party: (st) => quarryParty(st).map((m) => (st.flags.route === 'wade' ? Object.assign(m, { hpFrac: 0.85 }) : m)),
      mods: (st) => ({ approach: st.flags.route || 'long' }), win: 'c5.cave',
      outro: 'The path is clear. The archer drops its bow and runs for the quarry.',
    },
    'c5.cave': {
      type: 'scene', chapter: 'c5', bg: 'cave', next: 'c5.cavefight',
      lines: [
        N('At the cave mouth: the miller’s grain, a faded loading frame, and a set of narrow three-toed footprints. One print, half under a cart rut, is much larger.'),
        KB('We go far enough to see what they’ve taken. Then we decide whether to clear the place or come back with a bigger party.'),
        N('Rotting food, wet hides, smoke. Stolen crates against the far wall; a stone basin of dirty water. The archer has joined two goblins by a cooking fire.'),
        N('For a moment nobody moves. Then the archer points and shouts.'),
      ],
    },
    'c5.cavefight': {
      type: 'battle', chapter: 'c5', scenario: 'cave', hearts: true, xp: 100,
      party: (st) => quarryParty(st), win: 'c5.tracks',
      outro: 'The archer falls against the stone. The miller’s grain is here — most of it.',
    },
    'c5.tracks': {
      type: 'scene', chapter: 'c5', bg: 'cave', next: 'c5.leave',
      lines: [
        N('Two goblins bolt into the deeper passage. The chamber goes quiet apart from the crackle of damp wood.'),
        EB('At least we found what they came for.'),
        N('The wet earth by the deeper passage is churned by the same large tracks, and the stone around the opening is scraped well above head height.'),
        KB('Eiryn, I think we’re leaving.'),
        only((st) => !hasKael(st), S('@', 'Those tracks. Eiryn, I think we’re leaving.')),
        only((st) => !hasEiryn(st), S('@', 'Kael. Those tracks.')),
      ],
    },
    'c5.leave': {
      type: 'choice', chapter: 'c5', bg: 'cave', prompt: 'Something is moving in the passage.',
      options: [
        { label: 'Back to the entrance, slowly', hint: 'As in the book. You see it coming: everyone starts with heavy-art power banked.', set: { ogre: 'ready' }, next: 'c5.ogre' },
        { label: 'Grab the miller’s tools first', hint: 'You save the tools (more pay) — but the ogre catches the party flat-footed.', set: { ogre: 'caught', gold: 1 }, next: 'c5.ogre' },
      ],
    },
    'c5.ogre': {
      type: 'scene', chapter: 'c5', bg: 'cave', next: 'c5.ogrefight',
      lines: [
        N('A thick hand closes round the edge of the passage. Then a shoulder, and an enormous figure forces its way into the chamber.'),
        N('Its skin is the color of old, weathered stone. A heavy wooden beam rests across its shoulder — part of the loading frame outside.'),
        KB('That was not in the contract.'),
        only((st) => !hasKael(st), S('@', 'That was not in the contract.')),
        KB('Make it look at me.'),
      ],
    },
    'c5.ogrefight': {
      type: 'battle', chapter: 'c5', scenario: 'ogre', hearts: true, xp: 150,
      party: (st) => quarryParty(st), mods: (st) => ({ approach: st.flags.ogre || 'ready' }), win: 'c5.after',
      outro: 'The ogre is down. Dust drifts from the cave roof.',
    },
    'c5.after': {
      type: 'scene', chapter: 'c5', bg: 'hill', next: 'c5.home',
      lines: [
        only(hasEiryn, N('Eiryn draws the force into a narrow path. The ogre strikes the quarry wall hard enough to drive splintered stone from the rock face. It does not move again.')),
        only((st) => !hasEiryn(st), N('The ogre staggers back into the quarry wall and folds. It does not move again.')),
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
      type: 'scene', chapter: 'c5', bg: 'tavern', next: 'end',
      lines: [
        B('miller', 'I didn’t know. I swear I didn’t know there was anything that big up there.'),
        N('The Guild records the discrepancy and pays the contract with a hazard supplement.'),
        B('cook', 'What did I tell you? Don’t come back injured.'),
        EB('We should look for another contract once you’re fit.'),
        KB('Something genuinely small this time.'),
        EB('I shall ask every goblin I meet whether it has one hidden in a cupboard.'),
        N('Far to the east, the Tower still stands. The road there starts at the Guild’s contract board.'),
      ],
    },
    end: { type: 'end', chapter: 'c6', bg: 'tower' },
  };


  // ------------------------------------------------------------ side episodes
  // Optional missions on the campaign map (all Proposals except quoted lines).
  // They never cost hearts. Each runs from `from` until a node with next 'map'.
  const party3 = (st) => roster(st).slice(0, 3);
  const EPISODES = {
    yard: { title: 'The Evaluation Yard', kind: 'training', from: 'yard.intro', repeat: true },
    gauntlet: { title: 'Yard Gauntlet', kind: 'arcade', from: 'gauntlet.fight', repeat: true },
    cart: { title: 'The Missing Supply Cart', kind: 'contract', from: 'cart.board' },
    stray: { title: 'Enough Teeth for Three', kind: 'contract', from: 'stray.board' },
    crossing: { title: 'The Old Crossing', kind: 'side', from: 'cross.ask' },
    deep: { title: 'The Deep Passage', kind: 'dungeon', from: 'deep.mouth', repeat: true },
  };
  Object.assign(NODES, {
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
      type: 'battle', chapter: 'side', scenario: 'training', hearts: false, xp: 30, loot: 'yard',
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
      type: 'battle', chapter: 'side', scenario: 'arcade', hearts: false, xp: 0, arcade: true, loot: 'gauntlet',
      party: (st) => party3(st), win: 'map', lose: 'map',
      outro: 'The yard falls quiet.',
    },

    // ---- Guild contract: the missing supply cart (set up by the book's contract board)
    'cart.board': {
      type: 'scene', chapter: 'side', bg: 'guild', next: 'cart.road',
      lines: [
        B('companion', 'Missing supply cart north of town.'),
        B('kael', 'Carts end up in ditches.'),
        B('companion', 'Then find the ditch.'),
        N('The north road. A cart on its side in the ditch, its cargo gone. Fresh boot prints — and a short knife’s sheath, dropped in the mud.'),
        S('knifeman', 'You again. You don’t learn, do you?'),
        S('@', { ren: 'You’re the one with the knife. From the clearing.', mara: 'You were in the clearing. You ran.', brannoc: 'Ah. The one who ran first.' }),
      ],
    },
    'cart.road': {
      type: 'battle', chapter: 'side', scenario: 'cart', hearts: false, xp: 80, loot: 'contract',
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
      type: 'battle', chapter: 'side', scenario: 'stray', hearts: false, xp: 100, loot: 'beast',
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
      type: 'battle', chapter: 'side', scenario: 'crossing', hearts: false, xp: 140, loot: 'relic',
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
        N('The two goblins that fled went deeper. The passage behind the ogre’s chamber goes down into the hill.'),
        B('kael', 'We go far enough to see what they’ve taken. Then we decide.'),
        N('Three chambers. No way to rest between them, unless you make one.'),
      ],
    },
    'deep.1': {
      type: 'battle', chapter: 'side', scenario: 'deep1', hearts: false, xp: 60, carry: true, loot: 'deep',
      party: (st) => party3(st), win: 'deep.rest',
    },
    'deep.rest': {
      type: 'choice', chapter: 'side', bg: 'cave', prompt: 'A trickle of clean water runs down the wall.',
      options: [
        { label: 'Rest and drink', hint: 'Everyone recovers a quarter of their health.', set: { deepRest: 1 }, next: 'deep.2' },
        { label: 'Press on and search the side tunnel', hint: 'No rest — but an extra roll on the loot at the end.', set: { deepGreed: 1 }, next: 'deep.2' },
      ],
    },
    'deep.2': {
      type: 'battle', chapter: 'side', scenario: 'deep2', hearts: false, xp: 70, carry: true, loot: 'deep',
      party: (st) => party3(st), win: 'deep.3',
    },
    'deep.3': {
      type: 'battle', chapter: 'side', scenario: 'deep3', hearts: false, xp: 120, carry: true, loot: 'chief',
      party: (st) => party3(st), win: 'deep.end',
      outro: 'The chief drops the miller’s cleaver and flees into the dark.',
    },
    'deep.end': {
      type: 'scene', chapter: 'side', bg: 'cave', next: 'map',
      lines: [N('The goblins’ hoard: stolen tools, a sack of coins, and things they took from people who never reported them.')],
    },
  });

  // ------------------------------------------------------------ state
  function fresh() {
    return { v: 1, node: 'p.lore', starter: null, xp: 0, flags: {}, seen: {}, wins: {}, opened: {}, done: {}, side: null, best: {} };
  }
  function normalise(st) {
    if (!st || st.v !== 1 || !NODES[st.node]) return fresh();
    st.flags = st.flags || {}; st.seen = st.seen || {}; st.wins = st.wins || {};
    st.opened = st.opened || {}; st.done = st.done || {}; st.best = st.best || {};
    if (st.side && !NODES[st.side.node]) st.side = null;
    return st;
  }

  // The node being played: inside a side episode if one is running.
  function cur(st) { return st.side ? st.side.node : st.node; }
  function node(st) { return NODES[cur(st)]; }

  // A scene's lines for this playthrough: conditions applied, text and speaker resolved.
  function lines(st, n) {
    n = n || node(st);
    return (n.lines || []).filter((l) => !l.when || l.when(st)).map((l) => ({ who: l.who, speaker: speaker(st, l.who), text: text(st, l.text), book: !!l.book }));
  }

  function setFlags(st, set) {
    for (const k in set || {}) {
      const v = set[k];
      if (typeof v === 'number' && k !== 'party') st.flags[k] = Math.max(0, (st.flags[k] || 0) + v);
      else st.flags[k] = v;
    }
  }

  function goTo(st, id) {
    if (st.side) {
      if (id === 'map') { endSide(st); return null; }
      if (!NODES[id]) throw new Error('story: no node ' + id);
      st.side.node = id;
      return NODES[id];
    }
    if (!NODES[id]) throw new Error('story: no node ' + id);
    st.node = id;
    st.seen[NODES[id].chapter] = true;
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

  // Text for the current starter.
  function text(st, t) { return typeof t === 'string' ? t : t[st.starter] || t.ren; }
  function speaker(st, who) {
    if (!who) return null;
    if (who === '@') { const c = STARTERS[st.starter]; return { name: c ? c.name.split(' ')[0] : 'You', tone: 'you' }; }
    return SPEAKERS[who] || { name: who, tone: 'plain' };
  }

  // Scenes and cards: move on.
  function advance(st) {
    const n = node(st);
    if (n.type === 'choice' || n.type === 'battle' || n.type === 'select' || n.type === 'end') throw new Error('story: advance on ' + n.type);
    // (cinematic nodes advance like scenes once they finish or are skipped)
    // A side scene going back to the map ends the episode.
    return goTo(st, n.next);
  }

  function optionOpen(st, o) { return !o.need || (st.flags[o.need] || 0) > 0; }
  function choose(st, i) {
    const n = node(st);
    if (n.type !== 'choice') throw new Error('story: choose on ' + n.type);
    const o = n.options[i];
    if (!o || !optionOpen(st, o)) return null;
    setFlags(st, o.set);
    return goTo(st, o.next);
  }

  function pickStarter(st, key) {
    if (node(st).type !== 'select' || !STARTERS[key]) throw new Error('story: bad starter ' + key);
    st.starter = key;
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
      hearts: !!n.hearts,
      tutorial: !!n.tutorial,
      tips: n.tips || null,
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
  function roster(st) {
    if (!st.starter) return [];
    const r = [st.starter];
    if (st.seen.c1) r.push('kael');
    if (st.seen.c4) r.push('eirynMage');
    return r.map((k) => member(st, k));
  }

  function chapters(st) {
    const cur = NODES[st.node].chapter;
    const idx = CHAPTERS.findIndex((c) => c.id === cur);
    return CHAPTERS.map((c, i) => ({ id: c.id, label: c.label, title: c.title, status: i < idx ? 'done' : i === idx ? 'current' : 'locked' }));
  }

  return {
    NODES, STARTERS, SPEAKERS, CHAPTERS, CHAPTER_START, EPISODES, LEVEL_XP,
    fresh, normalise, cur, node, lines, advance, choose, optionOpen, pickStarter, battle, finishBattle,
    atGate, openChapter, startSide, endSide, leaveSide,
    text, speaker, teamLevel, levelFor, roster, chapters, member,
  };
});
