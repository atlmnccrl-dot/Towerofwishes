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
  const auto = (arena, cast, a) => ({ arena, cast, auto: Object.assign({}, a) });
  const K = (x, y, f, o) => Object.assign({ id: 'kael', key: 'kael', x, y, f }, o);
  const E = (x, y, f, o) => Object.assign({ id: 'eiryn', key: 'eirynAsh', x, y, f }, o);
  const AE = (x, y, f, o) => Object.assign({ id: 'aerys', key: 'aerys', x, y, f }, o);
  const NX = (x, y, f, o) => Object.assign({ id: 'nox', key: 'nox', x, y, f }, o);

  return {
    id: 'c7',
    speakers: { victim: { name: 'Stranger', tone: 'plain' } },
    nodes(h) {
      const { B, N, X } = h;
      return {
        'c7.fog': {
          type: 'scene', chapter: 'c7', bg: 'forest', next: 'c7.city',
          lines: [
            X('Morning comes as fog. It rolls low across the road and through the broken grass, leaving the remains of their fire as a dark stain beneath the ruin wall.'),
            X('Kael is already awake. Half his armor is strapped into place. His sword lies across his knees, cleaned of yesterday’s blood. He runs a cloth along the edge one last time before standing. Aerys stretches carefully, favoring the side the Skyreaver opened. When she notices Kael watching the road instead of the sunrise, she stops smiling.'),
            X('The land changes as they walk. Grass gives way to more stone. Broken foundations rise beside the road. Walls appear without buildings attached to them. Footprints multiply in the dirt. Smoke shows on the horizon.'),
            B('kael', 'City’s close.'),
          ],
        },
        'c7.city': {
          type: 'scene', chapter: 'c7', bg: 'town', next: 'c7.body',
          lines: [
            X('The Shadow City appears around the next rise. It is not one city so much as several versions of one stacked across the same bones. The upper districts live. Lamps burn behind repaired windows. Bridges cross between half-restored towers.'),
            X('Aerys nods immediately. Kael’s hand settles on his sword. They enter through the lower district.'),
            X('The first thing wrong with the city is the silence. There are people everywhere, but almost no one speaks. Faces watch from doorways. Men lean against walls without pretending they are not studying the travelers. A woman on a second-story balcony follows Aerys with her eyes until the hood hides her completely. It is not curiosity. It is assessment.'),
            B('aerys', '…I don’t like this.'),
          ],
        },
        'c7.body': {
          type: 'scene', chapter: 'c7', bg: 'town', next: 'c7.duel',
          lines: [
            X('They round a corner. A body lies in the street. A man, face turned toward the stones, throat opened by a single clean cut. Kael stops. Eiryn looks once and continues scanning the street.'),
            X('Something shifts above them. Not a sound. A change in weight. Kael’s eyes snap toward the roofline. Nothing stands there. He keeps his hand on the hilt.'),
            X('A moment later, a man stumbles from an alley ahead. He is sweating hard despite the morning chill. Blood covers both sleeves. His eyes sweep the street wildly until they find Kael. Hope transforms his face.'),
            B('victim', 'Please—'),
            X('A blur crosses the alley. There is nothing theatrical about it. No flare of magic. No shouted warning. Steel flashes once. The man’s plea ends in the middle of the word. He falls dead before his knees can buckle properly.'),
            X('Someone is standing over him. Lean. Dark clothes. Twin blades already clean. Nox Kairen looks at Kael with the flat attention of a man measuring distance.'),
            B('nox', 'Don’t.'),
            B('kael', 'You murdered him.'),
            B('nox', 'He murdered first.'),
            X('Aerys looks from the corpse to the stranger. Eiryn stays still. Kael moves. No warning.'),
          ],
        },
        'c7.duel': {
          type: 'scene', chapter: 'c7', bg: 'town', next: 'c7.judge',
          lines: [
            X('His sword comes out in the same motion as the lunge. Nox steps inside the swing. Too close. One of his blades touches Kael’s throat. Not enough to cut. Enough to explain exactly how easily it could have. Kael stops breathing.'),
            B('nox', 'Again.'),
            X('For a second, the street holds perfectly still. Then Kael pulls back. His breathing returns under control.'),
            B('kael', 'He begged.'),
            B('nox', 'So did the children.'),
            X('The answer lands harder than the blade had. Nox reaches into his coat and flicks something toward Kael’s feet. A small relic shard strikes the stone and spins once. Kael crouches, suspicious, and touches it.'),
            X('The world flashes. Not around him. Inside him. A chamber lit by weak fire. Hands tied behind a child’s back. A house burning while someone screams from inside. Metal tools laid in neat rows beside a table. Blood. More blood.'),
            X('The images vanish. Kael jerks his hand away. For the first time since entering the city, he looks at the dead man rather than the man who killed him. His sword lowers.'),
            B('kael', '…I was wrong.'),
          ],
        },
        'c7.judge': {
          type: 'scene', chapter: 'c7', bg: 'town', next: 'c7.offer',
          lines: [
            X('Nox watches him closely. Kael does not raise his weapon again. He does not sheathe it either. He looks at the corpse, then at the relic shard.'),
            B('kael', 'I spent years cutting down monsters.'),
            B('kael', 'Then I learned some of them wear faces.'),
            B('kael', 'We’re walking toward the one place that scares everyone.'),
            B('kael', 'You’d fit.'),
            B('nox', 'I do contracts.'),
            B('kael', 'Fine. Then think of it as the biggest contract left.'),
          ],
        },
        'c7.offer': {
          type: 'scene', chapter: 'c7', bg: 'town', next: 'c8.road',
          lines: [
            B('kael', 'At the top of the Tower, you could wish every person like him dead.'),
            X('Nox freezes. Only for half a second. But Aerys sees it.'),
            B('nox', '…That’s a fairy tale.'),
            X('Nox takes one step back.'),
            B('nox', 'If I start wishing…'),
            B('nox', '…I stop being useful.'),
            B('nox', 'Someone like me will come for you again.'),
            B('nox', 'Next time with a name on a page.'),
            X('Then he is gone. Not vanished. There is no magic to it that any of them can see. One moment the geometry of the alley contains him. The next it does not.'),
            B('aerys', '…He’s terrifying.'),
            B('kael', 'That’s why I asked.'),
          ],
        },
      };
    },
    // Extra per-line beats, merged into the stage that plays each node (js/stages.js).
    beats: {
      'c7.fog': {
        0: { cam: { focus: ['kael', 'aerys', 'eiryn'], view: 9, ang: -0.5, pitch: 0.46, drift: 0.02, ease: 1.4 }, do: [{ pfx: [{ name: 'fog', x: -3, y: 1, z: 0.5, scale: 3, life: 4 }, { name: 'fog', x: 1, y: 0.4, z: 0.5, scale: 3, life: 4, delay: 0.4 }] }, { who: 'kael', to: [0.2, 1.0], speed: 0.8 }, { who: 'aerys', to: [-1.6, 0.4], speed: 0.8 }, { who: 'eiryn', to: [-2.4, 1.4], speed: 0.8 }] },
      },
      'c7.city': {
        0: { cam: { x: 0, y: 0, view: 12, ang: -0.3, pitch: 0.4, up: 1.4, drift: 0.02, ease: 1.6 }, do: [{ who: 'kael', to: [-3.6, 0.8], speed: 0.9 }, { who: 'aerys', to: [-4.8, 0.2], speed: 0.9 }, { who: 'eiryn', to: [-5.5, 1.2], speed: 0.9 }] },
      },
      'c7.body': {
        9: { cam: { focus: ['aerys', 'kael', 'nox'], view: 8, ang: -0.3, pitch: 0.42, ease: 0.8 }, do: [{ who: 'aerys', face: 'dead' }, { at: 0.8, who: 'aerys', face: 'nox' }, { at: 1.2, who: 'kael', set: { stow: false, gest: null } }, { at: 1.4, who: 'kael', to: [0.4, -0.6], gait: 'dash', speed: 6 }] },
      },
      'c7.duel': {
        7: { cam: { focus: ['kael', 'dead'], view: 5, ang: -0.3, pitch: 0.42, up: 0.6, ease: 0.8 }, do: [{ who: 'kael', state: 'hurt', dur: 0.3 }, { at: 0.5, who: 'kael', face: 'dead' }, { at: 1.4, who: 'kael', set: { gest: null } }] },
      },
      'c7.offer': {
        1: { cam: { focus: ['nox'], view: 3.6, ang: -0.3, pitch: 0.42, up: 0.9, ease: 0.6 }, do: [{ at: 1.0, cam: { focus: ['aerys'], view: 3.6, ang: -0.3, pitch: 0.42, up: 0.9, ease: 0.6 } }, { at: 1.2, who: 'aerys', icon: '?' }] },
        3: { cam: { focus: ['nox', 'kael'], view: 5, ang: -0.3, pitch: 0.42, up: 0.6, ease: 0.8 }, do: [{ who: 'nox', to: [2.4, 0.3], gait: 'back', speed: 0.6 }] },
        8: { cam: { focus: ['nox'], view: 5, ang: -0.3, pitch: 0.42, up: 0.6, ease: 0.6 }, do: [{ at: 0.8, who: 'nox', hide: true }, { at: 1.3, who: 'kael', icon: '?' }, { at: 1.4, cam: { focus: ['kael', 'aerys', 'eiryn'], view: 7, ang: -0.3, pitch: 0.42, ease: 1.0 } }] },
      },
    },
    stages: {
      'c7.fog': auto('grassland', [K(-3.2, 1.0, 0.2, { armed: true }), AE(-5.0, 0.4, 0.2), E(-5.8, 1.4, 0.0)], {
        noFace: true,
        nodes: { 'c7.fog': {
          1: { cam: { face: 'kael', side: 0.5, view: 3.8, up: 1.0, pitch: 0.42, ease: 1.0 }, do: [{ who: 'kael', set: { stow: false, gest: null } }, { at: 0.2, who: 'kael', state: 'recover', dur: 1.2 }] },
          2: { cam: { focus: ['kael', 'aerys', 'eiryn'], view: 8.5, ang: -0.9, pitch: 0.48, drift: 0.02, ease: 1.2 }, do: [{ who: 'kael', set: { stow: true } }, { who: 'kael', to: [3.2, 1.2], speed: 1.0 }, { who: 'aerys', to: [1.6, 0.6], speed: 1.0 }, { who: 'eiryn', to: [0.4, 1.4], speed: 1.0 }] },
          3: { cam: { face: 'kael', side: 0.35, view: 3.6, up: 1.0, pitch: 0.42, ease: 0.8 } },
        } },
      }),
      'c7.city': auto('shadowcity', [K(-7.0, 0.8, 0.1), AE(-8.2, 0.2, 0.1), E(-8.9, 1.2, 0.1)], {
        noFace: true,
        nodes: { 'c7.city': {
          0: { cam: { focus: ['kael', 'aerys', 'eiryn'], view: 11, ang: -0.25, pitch: 0.4, up: 0.8, drift: 0.02, ease: 1.6 } },
          1: { do: [{ who: 'kael', to: [-3.8, 0.8], speed: 0.9 }, { who: 'aerys', to: [-5.0, 0.4], speed: 0.9 }, { who: 'eiryn', to: [-5.6, 1.2], speed: 0.9 }] },
          2: { cam: { focus: ['aerys'], dx: 0, view: 4.6, ang: -0.3, pitch: 0.4, up: 1.0, ease: 1.4 }, do: [{ who: 'aerys', face: [-4, -7], icon: '?' }] },
          3: { cam: { face: 'aerys', side: 0.4, view: 3.4, up: 1.1, pitch: 0.42, ease: 0.7 }, do: [{ who: 'aerys', to: [-4.6, 0.8], speed: 0.4 }] },
        } },
      }),
      'c7.body': auto('shadowcity', [
        K(-3.8, 0.8, 0.1), AE(-4.9, 0.4, 0.1), E(-5.5, 1.2, 0.1),
        { id: 'dead', key: 'patron', x: 1.2, y: 0.2, f: 1.9, gest: null },
        { id: 'victim', key: 'patron', x: 4.0, y: 0.8, f: 3.1, hidden: true },
        NX(1.6, -1.2, 3.0, { hidden: true }),
      ], {
        nodes: { 'c7.body': {
          0: { cam: { focus: ['kael', 'dead'], view: 6, ang: -0.3, pitch: 0.44, ease: 1.0 }, do: [{ who: 'dead', set: { gest: null }, state: 'down', hold: true }, { who: 'kael', to: [-1.4, 0.7], speed: 0.9 }, { who: 'aerys', to: [-2.8, 0.3], speed: 0.9 }, { who: 'eiryn', to: [-3.3, 1.2], speed: 0.9 }] },
          1: { cam: { x: 1.0, y: -3.0, view: 9, ang: -0.3, pitch: 0.4, up: 1.2, ease: 1.2 }, do: [{ who: 'kael', icon: '!' }, { who: 'kael', face: [1, -6] }] },
          2: { cam: { focus: ['victim'], view: 5.2, ang: -0.5, pitch: 0.42, ease: 0.6 }, do: [{ who: 'victim', show: true }, { who: 'victim', to: [2.8, 0.7], gait: 'run', speed: 3.2, set: { stow: true, gest: 'raise' } }] },
          3: { do: [{ who: 'victim', set: { gest: 'raise' } }] },
          4: { cam: { focus: ['victim', 'nox'], view: 4.6, ang: -0.2, pitch: 0.4, ease: 0.15, cut: true }, do: [{ who: 'nox', show: true, blink: [2.7, 0.0] }, { who: 'victim', state: 'down', hold: true, knock: [-0.8, 0] }, { shake: 6 }, { fade: [0.0, 0.0] }] },
          5: { cam: { face: 'nox', side: 0.3, view: 3.2, up: 1.1, pitch: 0.42, ease: 0.9 }, do: [{ who: 'nox', face: 'kael', set: { stow: false, gest: null } }] },
        } },
      }),
      'c7.duel': {
        arena: 'shadowcity',
        cast: [K(-1.0, 0.4, 0.05, { armed: true }), AE(-3.6, 0.0, 0.1), E(-4.4, 0.9, 0.1), NX(2.0, 0.3, 3.1, { armed: true }), { id: 'dead', key: 'patron', x: 3.4, y: 1.4, f: 1.9 }, { id: 'victim', key: 'patron', x: 4.2, y: -0.4, f: 3.0 }],
        setup: [{ who: 'dead', state: 'down', hold: true }, { who: 'victim', state: 'down', hold: true }, { who: 'nox', set: { stow: false } }, { who: 'kael', set: { stow: false } }],
        cam: { focus: ['kael', 'nox'], view: 6, ang: -0.3, pitch: 0.44 },
        beats: [
          // His sword comes out in the same motion as the lunge...
          {
            cam: { focus: ['kael', 'nox'], view: 5.2, ang: -0.25, pitch: 0.42, ease: 0.4 },
            do: [
              { who: 'kael', attack: { wind: 0.25, active: 0.12, recover: 0.4, tele: false } },
              { at: 0.25, who: 'kael', to: [0.6, 0.35], gait: 'dash', speed: 6 },
              { at: 0.4, who: 'nox', to: [0.9, 0.45], gait: 'dash', speed: 6, face: 'kael' },
              { at: 0.7, shake: 5 }, { at: 0.7, slow: [0.35, 0.8] },
              { at: 0.8, who: 'kael', icon: '!' },
            ],
          },
          // Again.
          { cam: { face: 'nox', side: 0.3, view: 2.6, up: 1.2, pitch: 0.4, ease: 0.5 }, do: [{ who: 'nox', say: 'Again.' }] },
          // He begged.
          { cam: { face: 'kael', side: -0.3, view: 3.0, up: 1.1, pitch: 0.42, ease: 0.7 }, do: [{ who: 'kael', to: [-0.4, 0.4], gait: 'back', speed: 1.6 }, { at: 0.5, who: 'kael', say: 'He begged.' }] },
          // So did the children.
          { cam: { face: 'nox', side: -0.3, view: 2.8, up: 1.2, pitch: 0.4, ease: 0.7 }, do: [{ who: 'nox', say: 'So did the children.' }, { at: 0.8, who: 'kael', icon: '…' }] },
          // The shard.
          { cam: { focus: ['kael'], dx: 0.4, view: 3.2, ang: -0.3, pitch: 0.5, up: 0.4, ease: 0.8 }, do: [{ who: 'kael', state: 'pickup', dur: 1.2 }, { at: 1.0, light: ['230,220,255', 0.7, 0.3] }, { at: 1.4, fade: [0.85, 0.5, '20,10,14'] }] },
          // The images vanish.
          { cam: { face: 'kael', side: 0.3, view: 3.0, up: 1.1, pitch: 0.42, ease: 0.6 }, do: [{ fade: [0, 1.0] }, { who: 'kael', face: 'dead' }, { who: 'kael', set: { stow: true } }] },
          // ...I was wrong.
          { cam: { face: 'kael', side: -0.35, view: 2.8, up: 1.2, pitch: 0.4, ease: 0.8 }, do: [{ at: 0.4, who: 'kael', say: '…I was wrong.' }] },
        ],
      },
      'c7.judge': auto('shadowcity', [K(-1.2, 0.5, 0.1), AE(-3.6, 0.0, 0.1), E(-4.4, 0.9, 0.1), NX(1.6, 0.3, 3.1), { id: 'dead', key: 'patron', x: 3.4, y: 1.4, f: 1.9 }, { id: 'victim', key: 'patron', x: 4.2, y: -0.4, f: 3.0 }], {
        nodes: { 'c7.judge': { 0: { do: [{ who: 'dead', state: 'down', hold: true }, { who: 'victim', state: 'down', hold: true }] } } },
      }),
      'c7.offer': 'same',
    },
    defs: {},
    scenarios: {},
    looks: {},
  };
});
