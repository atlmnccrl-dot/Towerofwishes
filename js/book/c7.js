/*
 * Tower of Wishes — The Shadow City (book chapter Four).
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
    id: 'c7',
    // Speakers this chapter introduces: key -> { name, tone }.
    speakers: {},
    // Story nodes. h = { B, S, N, only, member, bookParty, BOOK }.
    nodes(h) {
      const { B, S, N, member, BOOK } = h;
      return {
    'c7.city': {
      type: 'scene', chapter: 'c7', bg: 'town', next: 'c7.nox',
      lines: [
        N('The Shadow City is not one city so much as several versions of one stacked on the same bones. Below the lit upper districts, the lower streets sink into permanent shade.'),
        B('eiryn', 'Don’t wander.'),
        N('There are people everywhere, and almost no one speaks. A woman on a balcony follows Aerys with her eyes. It is not curiosity. It is assessment.'),
        B('aerys', '…I don’t like this.'),
        N('A man stumbles from an alley, sleeves soaked in blood. A blur crosses the alley. Steel flashes once.'),
      ],
    },
    'c7.nox': {
      type: 'scene', chapter: 'c7', bg: 'town', next: 'c7.alley',
      lines: [
        B('nox', 'Don’t.'),
        B('kael', 'You murdered him.'),
        B('nox', 'He murdered first.'),
        N('Kael lunges. Nox steps inside the swing. One blade touches Kael’s throat — enough to explain exactly how easily it could have cut.'),
        B('nox', 'Again.'),
        B('kael', 'He begged.'),
        B('nox', 'So did the children.'),
        N('A relic shard spins on the stones. Kael touches it: a child’s hands tied, a house burning, metal tools laid in neat rows. Blood.'),
        B('kael', '…I was wrong.'),
        B('kael', 'I spent years cutting down monsters. Then I learned some of them wear faces.'),
        B('kael', 'We’re walking toward the one place that scares everyone. You’d fit.'),
        B('nox', 'I don’t do causes. I do contracts.'),
        B('kael', 'Then think of it as the biggest contract left.'),
        B('nox', 'If I start wishing… I stop being useful.'),
        B('nox', 'Someone like me will come for you again. Next time with a name on a page.'),
        B('aerys', '…He’s terrifying.'),
        B('kael', 'Yeah. That’s why I asked.'),
      ],
    },
    'c7.alley': {
      type: 'scene', chapter: 'c7', bg: 'town', next: 'c7.fight',
      lines: [
        N('The lower district has already decided what Aerys is worth. Three men step out of the seams between buildings, and one of them is already smiling.'),
      ],
    },
    'c7.fight': {
      type: 'battle', chapter: 'c7', scenario: 'alley', hearts: true, xp: 120, allyLevel: true,
      party: (st) => BOOK(st), win: 'c8.road',
      outro: 'The men scatter into the dark. The city has already begun pretending not to see them.',
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
