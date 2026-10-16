/*
 * Tower of Wishes — The Sky That Hunts (book chapters Two and Three).
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
    id: 'c6',
    // Speakers this chapter introduces: key -> { name, tone }.
    speakers: {},
    // Story nodes. h = { B, S, N, only, member, bookParty, BOOK }.
    nodes(h) {
      const { B, S, N, member, BOOK } = h;
      return {
    'c6.road': {
      type: 'scene', chapter: 'c6', bg: 'road', next: 'c6.youngling',
      lines: [
        N('The road beyond the town opens into grassland and broken stone. Old markers stand half buried along the path, their faces eaten smooth by weather.'),
        B('kael', 'You ever travel before?'),
        B('eiryn', 'Enough.'),
        B('kael', 'You don’t look like you’ve slept outside much.'),
        B('eiryn', 'You’d be surprised.'),
        B('kael', 'You headed that way?'),
        B('eiryn', 'Eventually.'),
        B('kael', 'People who go ‘eventually’ toward that thing usually end up dead.'),
      ],
    },
    'c6.youngling': {
      type: 'scene', chapter: 'c6', bg: 'road', next: 'c6.fight',
      lines: [
        N('Something enormous lies broken in the grass. Its wings are shredded against the ground, the membrane torn between long black bones.'),
        B('kael', 'This would’ve wiped a caravan.'),
        B('eiryn', 'They weren’t always this low.'),
        B('kael', 'What does that mean?'),
        B('eiryn', 'Some things fell when the world did.'),
        B('eiryn', 'This was only a youngling.'),
        B('kael', 'Yeah? Then I’d hate to see the mother.'),
        B('eiryn', '…You will.'),
        N('The grass ahead explodes. A girl bursts onto the road — running, stumbling, bleeding. There are no wings on her back, yet she moves too lightly.'),
        B('aerys', 'MOVE!'),
        N('The mother comes through the clouds. It has not found them. It has been hunting her.'),
        B('kael', 'Get behind me.'),
        B('kael', 'Can you fight?'),
      ],
    },
    'c6.fight': {
      type: 'battle', chapter: 'c6', scenario: 'skyreaver', hearts: true, xp: 160, allyLevel: true,
      party: (st) => BOOK(st), win: 'c6.after',
      outro: 'A spear of light punches through the Skyreaver’s throat. It crashes, and stops moving.',
    },
    'c6.after': {
      type: 'scene', chapter: 'c6', bg: 'road', next: 'c6.join',
      lines: [
        B('kael', 'You being chased for fun?'),
        B('aerys', 'I wasn’t supposed to be here.'),
        B('kael', 'Then why are you?'),
        B('aerys', 'I was flying.'),
        B('aerys', 'I took the wrong path.'),
        B('aerys', 'That thing saw me. And once they see you… they don’t stop.'),
        B('aerys', 'They hunt me for my blood.'),
        B('kael', 'Who’s ‘they’?'),
        B('aerys', 'People who smile while they talk about cutting you open.'),
        B('aerys', 'You stepped in anyway.'),
      ],
    },
    'c6.join': {
      type: 'scene', chapter: 'c6', bg: 'road', next: 'c6.camp',
      lines: [
        B('eiryn', 'We’re heading to the Tower.'),
        B('kael', 'I didn’t say that.'),
        B('eiryn', 'You didn’t need to.'),
        B('aerys', 'People say it grants a wish.'),
        B('kael', 'What would you wish for?'),
        B('aerys', 'To be… left alone. Or to be normal. Just… not worth hunting.'),
        B('aerys', 'Let me travel with you. Please.'),
        B('kael', 'No.'),
        B('aerys', 'You don’t get to decide what I belong on.'),
        B('aerys', 'I helped kill it. Not because I’m strong. Because I can try.'),
        B('eiryn', 'If you want to come, then come.'),
        B('aerys', 'I just want to walk beside someone who still steps in.'),
        B('aerys', 'I’m Aerys.'),
        B('eiryn', 'Eiryn.'),
        B('kael', 'Kael.'),
      ],
    },
    'c6.camp': {
      type: 'scene', chapter: 'c6', bg: 'forest', next: 'c7.city',
      lines: [
        N('By dusk the broken hills have swallowed the sun. Kael tries to start a fire. Nothing happens. He tries again. The whole little pile collapses.'),
        B('kael', 'Don’t start.'),
        B('aerys', 'I didn’t say anything.'),
        B('kael', '…Sky people.'),
        B('aerys', 'Would this… offend your pride?'),
        B('kael', '…Fine.'),
        B('kael', 'Before all this… knights mattered. Now it’s beasts and ruins and people pretending they’re fine.'),
        B('aerys', 'You still act like you matter.'),
        B('kael', 'I do.'),
        B('aerys', 'That’s what’s funny.'),
        N('He laughs once, before he can stop it. For a few seconds the ruined road does not feel ruined.'),
        B('aerys', 'Do you think it really grants wishes?'),
        B('kael', 'No.'),
        B('aerys', 'I hope it does. So I can stop running.'),
        B('eiryn', 'Sleep.'),
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
