/*
 * Tower of Wishes — The Tower Draws Near (book chapters Ten and Eleven).
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
    id: 'c11',
    // Speakers this chapter introduces: key -> { name, tone }.
    speakers: {},
    // Story nodes. h = { B, S, N, only, member, bookParty, BOOK }.
    nodes(h) {
      const { B, S, N, member, BOOK } = h;
      return {
    // The first frost; the Tower draws near (book chapters Ten and Eleven). Stub.
    'c11.frost': {
      type: 'scene', chapter: 'c11', bg: 'road', next: 'c12.doors',
      lines: [
        N('The first frost appeared on the road the morning after. Ahead, the Tower no longer looked far away.'),
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
