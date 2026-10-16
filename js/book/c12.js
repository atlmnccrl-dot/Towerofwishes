/*
 * Tower of Wishes — Floor One: The Hall of Frost and Mist (book chapter Twelve).
 *
 * One chapter of the campaign, loaded by js/story.js (nodes, speakers) and
 * js/stages.js (staged scenes). Lines made with B() are quoted from the
 * manuscript; S() lines and all staging are Proposals. See js/book/README.md.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.TowBook = root.TowBook || {})[api.id] = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  return {
    id: 'c12',
    // Speakers this chapter introduces: key -> { name, tone }.
    speakers: {},
    // Story nodes. h = { B, S, N, only, member, bookParty, BOOK }.
    nodes(h) {
      const { B, S, N, member, BOOK } = h;
      return {
    'c12.doors': {
      type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.hall',
      lines: [
        N('The first frost appears beneath a gray afternoon sky. It does not melt. Frozen climbers lie half buried beside the road, in armour none of them recognise.'),
        N('The doors are enormous, carved stone scarred by weapons and weather. Around them, more climbers have frozen where they died.'),
        B('eloryn', '…They waited.'),
        N('Kael places one palm against the stone. Something moves far inside it. The doors open.'),
      ],
    },
    'c12.hall': {
      type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.kael',
      lines: [
        N('The doors slam shut. There is no handle on the inside. Frozen climbers have been built into the walls like warnings.'),
        B('aerys', '…They didn’t even get to run.'),
        B('eiryn', 'It’s watching.'),
        N('Knights take shape in the mist: a swordsman, a juggernaut with brass knuckles, a spear absurdly long for the corridor, a plain one with two short blades, a thin one with a huge axe — and a horned Master Knight that turns its helmet toward Eiryn.'),
        B('eloryn', 'It lowers the temperature where it touches.'),
        B('kael', 'TOGETHER—!'),
        N('White floods the corridor. When it thins, each of them stands alone. The Tower has separated them to find the places each one breaks.'),
      ],
    },
    'c12.kael': {
      type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.d1',
      lines: [
        N('The Swordsman Knight steps through the mist toward Kael. Its stance is perfect. Every cut it lands slows him — it is not freezing him. It is lowering him, piece by piece.'),
      ],
    },
    'c12.d1': { type: 'battle', chapter: 'c12', scenario: 'duelKael', hearts: false, xp: 60, allyLevel: true, party: (st) => [member(st, 'kael')], win: 'c12.braxen',
      outro: 'His fist drives into the centre of the knight’s chest. The Swordsman Knight explodes into ice.' },
    'c12.braxen': {
      type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.d2',
      lines: [N('A Juggernaut Knight waits for Braxen, nearly as broad as he is, brass knuckles the size of stones. It does not draw a weapon. It raises its hands.'), B('braxen', 'Yeah. Figures.')],
    },
    'c12.d2': { type: 'battle', chapter: 'c12', scenario: 'duelBraxen', hearts: false, xp: 60, allyLevel: true, party: (st) => [member(st, 'braxen')], win: 'c12.aerys',
      outro: 'The helmeted head breaks free. The body takes one blind step, then shatters. …Worth it.' },
    'c12.aerys': {
      type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.d3',
      lines: [
        N('The Spear Knight punishes flight. Aerys drops — not falling. Choosing ground. And beneath the fear, a memory opens: a bright courtyard, an older hand correcting her stance.'),
        S('teacher', 'You keep reaching for light. But your body is a weapon too.'),
        S('teacher', 'Stillwing. Like you have wings — without needing them.'),
      ],
    },
    'c12.d3': { type: 'battle', chapter: 'c12', scenario: 'duelAerys', hearts: false, xp: 60, allyLevel: true, party: (st) => [member(st, 'aerys')], win: 'c12.eloryn',
      outro: 'No light. No flight. She won without leaving the ground.' },
    'c12.eloryn': {
      type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.d4',
      lines: [N('The plainest knight comes for Eloryn. Two short blades. Its first cut goes for her fingers. It wants to stop her from healing.'), B('eloryn', '…not yet…')],
    },
    'c12.d4': { type: 'battle', chapter: 'c12', scenario: 'duelEloryn', hearts: false, xp: 60, allyLevel: true, party: (st) => [member(st, 'eloryn')], win: 'c12.nox',
      outro: 'She releases everything outward. Not force. Life. The knight fails to hold its shape. Her hands have changed — older, scarred.' },
    'c12.nox': {
      type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.d5',
      lines: [N('The Axe Knight is thin enough to look fragile. That is a lie. It was made to catch speed.'), B('nox', '…Okay.'), B('nox', 'I wasn’t planning on using this yet…')],
    },
    'c12.d5': { type: 'battle', chapter: 'c12', scenario: 'duelNox', hearts: false, xp: 60, allyLevel: true, party: (st) => [member(st, 'nox')], win: 'c12.eiryn',
      outro: 'A thousand cuts appear at once. The Axe Knight simply fails to remain whole. …Can’t use that again for a little while.' },
    'c12.eiryn': {
      type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.d6',
      lines: [N('The mist clears around Eiryn. The Master Knight circles her, slow, unblinking. Two predators inside a silence the Tower has manufactured for them.'), N('At last it strikes. One clean attack. The blade stops inches from her skin.')],
    },
    'c12.d6': { type: 'battle', chapter: 'c12', scenario: 'duelEiryn', hearts: false, xp: 40, allyLevel: true, party: (st) => [Object.assign(member(st, 'eirynMage'), { key: 'eirynAsh', gear: 'eirynMage', super: 100 })], win: 'c12.between',
      outro: 'In the final fraction of its existence, it seems to understand something. It had chosen wrong.' },
    'c12.between': {
      type: 'scene', chapter: 'c12', bg: 'summit', next: 'c13.enter',
      lines: [
        B('kael', 'Eiryn.'),
        B('kael', 'You hit?'),
        B('eiryn', 'No.'),
        B('braxen', '…Tower doesn’t pull punches.'),
        B('eloryn', 'Sit. Don’t argue.'),
        B('kael', 'It learned.'),
        B('kael', 'We turn back now — this place still wins.'),
        B('braxen', 'Didn’t crawl in here to lose.'),
        N('A staircase descends. It does not end. One hour. Then another.'),
        B('braxen', 'If the wish is real, mine’s a chair.'),
        B('aerys', '…A chair?'),
        B('braxen', 'A good one.'),
        B('braxen', 'Don’t tell me it’s fire next.'),
      ],
    },

      };
    },
    // Staged scenes: node id -> stage definition (js/render/stage.js) or 'same'.
    stages: {},
    // Extra fighter definitions and scenarios merged into the sim (js/sim.js).
    defs: {},
    scenarios: {},
    // Extra looks merged into js/render/fighters.js LOOK.
    looks: {},
  };
});
