/*
 * Tower of Wishes — The Night Creature (book chapters Eight and Nine).
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
    id: 'c10',
    // Speakers this chapter introduces: key -> { name, tone }.
    speakers: {},
    // Story nodes. h = { B, S, N, only, member, bookParty, BOOK }.
    nodes(h) {
      const { B, S, N, member, BOOK } = h;
      return {
    'c10.shadow': {
      type: 'scene', chapter: 'c10', bg: 'forest', next: 'c10.night',
      lines: [
        N('Nox never approaches. Never far enough to lose them. Bandit camps empty overnight. Beasts turn up beside the trail with cuts too clean to be accidental.'),
        B('aerys', 'You can come out, you know.'),
        B('aerys', '…Thank you.'),
        N('That night he unfolds the contract and reads Braxen’s name once. Then folds it again. Gold fades.'),
        N('And one evening, night seems to deepen faster than it should. Even Nox stops moving.'),
      ],
    },
    'c10.night': {
      type: 'scene', chapter: 'c10', bg: 'forest', next: 'c10.fight',
      lines: [
        N('Something clings to a tree trunk upside down above the camp. Its limbs curve wherever the body requires. Two faintly glowing eyes move across the sleepers — past Kael, past Braxen, past Aerys — and stop on Eloryn.'),
        N('It drops. No growl. No warning.'),
        B('eloryn', '—AHH!'),
      ],
    },
    'c10.fight': {
      type: 'battle', chapter: 'c10', scenario: 'nightcreature', hearts: true, xp: 220, allyLevel: true,
      party: (st) => BOOK(st), win: 'c10.after',
      outro: 'Both blades come down through the skull. The forest goes silent. No insects. No wind.',
    },
    'c10.after': {
      type: 'scene', chapter: 'c10', bg: 'forest', next: 'c10.clearing',
      lines: [
        B('aerys', '…You.'),
        B('nox', '…Didn’t want it to end like that.'),
        B('kael', '…He saved us.'),
        B('eiryn', 'He’s still close.'),
        B('kael', 'Seen worse.'),
        B('braxen', 'She’s probably just takin’ a leak.'),
      ],
    },
    'c10.clearing': {
      type: 'scene', chapter: 'c10', bg: 'forest', next: 'c10.learns',
      lines: [
        B('aerys', 'I don’t know if you can hear me… or if you’re still watching. But thank you. They would’ve died. I would have.'),
        B('nox', 'Didn’t mean to be seen.'),
        B('nox', 'You shouldn’t thank people like me.'),
        B('aerys', 'You saved us.'),
        B('nox', 'I removed a problem.'),
        B('aerys', 'That’s not the same thing.'),
        B('aerys', 'Cruel people enjoy it. You didn’t stay to enjoy anything.'),
        B('nox', 'This road eats people like you.'),
        B('aerys', 'Then don’t let it.'),
        B('nox', 'You too, angel.'),
      ],
    },
    'c10.learns': {
      type: 'scene', chapter: 'c10', bg: 'road', next: 'c11.frost',
      lines: [
        B('nox', 'Morning.'),
        B('braxen', 'Thought you didn’t do groups.'),
        B('nox', 'I don’t. I do… roads.'),
        B('eiryn', 'Then walk.'),
        B('nox', 'If you keep staring, I’ll cut your eyes clean out.'),
        B('kael', 'See? This is why people don’t invite you places.'),
        N('Kael begins training at dawn.'),
        B('nox', 'You swing like you’re angry at tomorrow.'),
        B('kael', 'And you fight like you don’t care.'),
        B('nox', 'That’s why I’m alive. Try again. Slower.'),
        B('nox', 'You lead with your heart. Good. Just don’t let it swing first.'),
        B('eloryn', 'You don’t heal with power. You heal by staying.'),
        N('One evening no one notices when Nox sits with them rather than beyond them. Five silhouettes, then six, lean toward the same warmth.'),
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
