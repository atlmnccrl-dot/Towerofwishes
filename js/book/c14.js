/*
 * Tower of Wishes — Floor Three: The Hall of Offering (book chapter Sixteen).
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
    id: 'c14',
    // Speakers this chapter introduces: key -> { name, tone }.
    speakers: {},
    // Story nodes. h = { B, S, N, only, member, bookParty, BOOK }.
    nodes(h) {
      const { B, S, N, member, BOOK } = h;
      return {
    'c14.hall': {
      type: 'scene', chapter: 'c14', bg: 'summit', next: 'c14.offering',
      lines: [
        B('aerys', '…I don’t like this one.'),
        N('Five enormous stone wheels stand upright in the floor. Four hold bodies. One stands empty. A man is already there — travel-worn armour, no weapon in his hands.'),
        B('altheryx', '…I was wondering when someone else would arrive.'),
        B('altheryx', 'Altheryx. Though… the Tower’s taken to calling me something else. ‘The Crownless King.’'),
        B('braxen', 'Subtle.'),
        B('altheryx', '…Because I refused to kneel.'),
        B('aerys', '…Alone?'),
        B('altheryx', 'Yes. At least… now.'),
        B('nox', 'What was your wish?'),
        B('altheryx', 'To rule the world. And end war permanently.'),
        B('altheryx', 'My guess? It won’t move again until it’s… satisfied.'),
      ],
    },
    'c14.offering': {
      type: 'scene', chapter: 'c14', bg: 'summit', next: 'end',
      lines: [
        B('eloryn', 'They weren’t Tower constructs…'),
        B('eloryn', 'Hey guys—'),
        N('Something punches through her chest. No warning. One moment Eloryn is speaking; the next, a fist protrudes through the front of her body.'),
        B('altheryx', 'I’m sorry.'),
        B('eloryn', '…I didn’t—'),
        N('Her body lifts from the floor. The empty wheel turns. Blood enters the carved channels. All of the wheels begin to turn. Behind them, a hidden passage opens.'),
        B('altheryx', 'Now… we can continue.'),
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
