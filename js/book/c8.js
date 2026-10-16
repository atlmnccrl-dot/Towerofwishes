/*
 * Tower of Wishes — The Road That Bleeds (book chapter Five).
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
    id: 'c8',
    // Speakers this chapter introduces: key -> { name, tone }.
    speakers: {},
    // Story nodes. h = { B, S, N, only, member, bookParty, BOOK }.
    nodes(h) {
      const { B, S, N, member, BOOK } = h;
      return {
    'c8.road': {
      type: 'scene', chapter: 'c8', bg: 'market', next: 'c8.infirmary',
      lines: [
        N('The trade roads beyond feel almost offensively normal. A merchant passing with a cart smiles at Aerys: “Safe travels.”'),
        B('kael', 'Stay close.'),
        B('aerys', 'Am I doing something wrong?'),
        B('kael', 'No. That’s the problem.'),
        N('The next city is smaller and far more alive. Aerys stops at a stall hung with pieces of glowing glass. Across the market, a scarred man watches her too long.'),
        N('A hand closes around her wrist. A short blade goes into her side. No warning. No demand.'),
        B('kael', 'No. No — stay with me.'),
        B('kael', 'I need a healer!'),
      ],
    },
    'c8.infirmary': {
      type: 'scene', chapter: 'c8', bg: 'tavern', next: 'c8.join',
      lines: [
        N('The infirmary is an old chapel packed with cots. A child cries behind a curtain. A tired woman looks up from another patient, sees Aerys, and moves.'),
        B('healer', 'Put her down. Now.'),
        B('healer', 'Breathe.'),
        B('healer', 'Hold her shoulders.'),
        B('healer', '…An angel in a city of devils.'),
        B('healer', 'You’re doing good. Let me do my part.'),
        B('kael', 'I was right there and I still — I didn’t stop it.'),
        B('healer', 'You brought her here. That matters.'),
        B('healer', 'She’ll live.'),
      ],
    },
    'c8.join': {
      type: 'scene', chapter: 'c8', bg: 'tavern', next: 'c9.farms',
      lines: [
        B('healer', 'This world only knows how to take.'),
        B('kael', 'If it’s real… you could wish to end this.'),
        B('healer', 'End evil? I can’t even end today. But I can end her dying.'),
        B('kael', 'We’re not making it without one.'),
        B('healer', 'A healer.'),
        B('healer', 'If I walk with you… I don’t walk back.'),
        B('kael', 'I’ll protect you.'),
        B('healer', 'That’s not how this works. We protect each other.'),
        N('Her name is Eloryn. Before leaving, she writes a note and leaves it where it will be found: I’m sorry. I couldn’t stay. Please forgive me.'),
        B('eloryn', 'If there’s even a chance… then I should be there when it matters.'),
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
