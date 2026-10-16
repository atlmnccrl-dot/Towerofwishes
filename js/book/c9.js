/*
 * Tower of Wishes — A Name on a Page (book chapters Six and Seven).
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
    id: 'c9',
    // Speakers this chapter introduces: key -> { name, tone }.
    speakers: {},
    // Story nodes. h = { B, S, N, only, member, bookParty, BOOK }.
    nodes(h) {
      const { B, S, N, member, BOOK } = h;
      return {
    'c9.farms': {
      type: 'scene', chapter: 'c9', bg: 'hill', next: 'c9.fight',
      lines: [
        B('aerys', 'Here.'),
        B('eloryn', 'Thank you.'),
        B('kael', 'Don’t spoil her.'),
        B('aerys', 'You’re just upset you didn’t think to bring fruit.'),
        B('kael', 'I brought a sword.'),
        B('eloryn', 'I don’t think you can eat that.'),
        N('The farms below are black. Fences snapped, wells collapsed, a scarecrow hanging from a broken post. Then — a thud, and another. Beasts lie dismantled in a field. One figure stands among them, one arm wrong, bone ridges shifting beneath the skin.'),
        B('kael', 'Don’t move.'),
        B('braxen', '…Great. I’m not in the mood.'),
        B('kael', 'What are you?'),
        B('braxen', 'Tired.'),
        N('The grass behind him parts. Another pack, larger, drawn by blood.'),
        B('kael', '…Behind you.'),
        B('braxen', 'Fine.'),
      ],
    },
    'c9.fight': {
      type: 'battle', chapter: 'c9', scenario: 'beasts', hearts: true, xp: 180, allyLevel: true,
      party: (st) => BOOK(st), win: 'c9.after',
      outro: 'The last beast stops moving. The stranger’s altered hands are trembling now that there is nothing left to kill.',
    },
    'c9.after': {
      type: 'scene', chapter: 'c9', bg: 'hill', next: 'c9.page',
      lines: [
        B('kael', 'You could’ve run.'),
        B('braxen', 'I run enough.'),
        B('eiryn', 'You’re still choosing.'),
        B('braxen', 'If you’re here to kill me… do it now.'),
        B('kael', 'We’re heading toward the Tower. It’s not a road for someone alone.'),
        B('braxen', 'I don’t want your Tower. I just… can’t stay.'),
        B('eloryn', 'Then don’t.'),
        B('braxen', '…If I walk with you… don’t put a chain on me.'),
        B('kael', 'No chains.'),
        B('braxen', 'Braxen.'),
      ],
    },
    'c9.page': {
      type: 'scene', chapter: 'c9', bg: 'hill', next: 'c10.shadow',
      lines: [
        N('A figure drops from the sky like a falling blade. Steel at Braxen’s throat.'),
        B('nox', 'Don’t care.'),
        N('Kael drives the blunt of his sword into Nox’s ribs. Nox slides back through the dirt — smiling.'),
        B('nox', 'Heh… thought we already had this conversation, big guy.'),
        B('kael', 'Back off.'),
        B('nox', 'Name on a page. They called him a monster.'),
        B('braxen', 'Then do it. Stop talking.'),
        B('aerys', 'Please. He saved us.'),
        B('nox', 'Not my problem.'),
        B('eloryn', 'If you cut him, you cut through us.'),
        B('nox', '…Healers always talk like saints.'),
        B('kael', 'You want him? Then you go through me again.'),
        N('Nox looks at Eiryn. She has not moved at all. The air around her feels heavier than it did a moment before.'),
        B('nox', '…So that’s how it is.'),
        B('nox', '…Tch.'),
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
