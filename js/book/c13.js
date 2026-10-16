/*
 * Tower of Wishes — Floor Two: Calamity (book chapters Thirteen to Fifteen).
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
    id: 'c13',
    // Speakers this chapter introduces: key -> { name, tone }.
    speakers: {},
    // Story nodes. h = { B, S, N, only, member, bookParty, BOOK }.
    nodes(h) {
      const { B, S, N, member, BOOK } = h;
      return {
    'c13.enter': {
      type: 'scene', chapter: 'c13', bg: 'summit', next: 'c13.fight',
      lines: [
        N('A corridor so long its end disappears. On the left, an endless waterfall. On the right, lava descending in heavy curtains.'),
        B('braxen', '…This place is built.'),
        B('calamity', 'Look at you… You crawled all this way… just to stand here.'),
        N('Water compresses into a bullet; a molten spear tears across the corridor. Eiryn takes one step.'),
        B('eiryn', 'Pressure.'),
        B('calamity', 'Oh…? That’s not supposed to happen.'),
        B('kael', 'Stay sharp. She’s stronger than every knight we just faced — combined.'),
      ],
    },
    'c13.fight': {
      type: 'battle', chapter: 'c13', scenario: 'calamity', hearts: true, xp: 300, allyLevel: true,
      party: (st) => BOOK(st), win: 'c13.after', grant: ['calamitySword'],
      outro: 'Calamity’s head tears free. No explosion follows. No victory sound. The water and the lava keep flowing.',
    },
    'c13.after': {
      type: 'scene', chapter: 'c13', bg: 'summit', next: 'c13.ramp',
      lines: [
        N('Water and lava spiral inward around the body and compress into something new. A sword. Hissing. Unstable.'),
        B('kael', '…Is anyone else gonna take it?'),
        B('braxen', 'Grab it, Kael. We know you want to.'),
        N('Kael closes his hand around the grip. The skin of his palm burns. He does not let go. The blade shudders, then stabilises. Not obeying him. Accepting him.'),
        B('eiryn', '…That was too close.'),
        B('nox', '…It wants us to walk.'),
        B('kael', 'So we don’t think we’re climbing.'),
        B('eiryn', 'It wants us calm.'),
      ],
    },
    'c13.ramp': {
      type: 'scene', chapter: 'c13', bg: 'summit', next: 'c14.hall',
      lines: [
        B('eloryn', 'Nox, sit. Kael, don’t move. Braxen — lean. Now.'),
        B('nox', '…That one’s deep.'),
        B('eloryn', 'I know.'),
        B('nox', 'Thank you.'),
        B('braxen', '…You’re gonna break yourself.'),
        B('eloryn', 'Then don’t make it pointless.'),
        B('aerys', 'You didn’t have to push like that.'),
        B('eloryn', 'Yes. I did.'),
        N('Words have been carved deep into the stone at the top of the ramp. FLOOR 3. THE HALL OF OFFERING.'),
        B('eloryn', '…Okay.'),
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
