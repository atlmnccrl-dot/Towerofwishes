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
  const auto = (arena, cast, a) => ({ arena, cast, auto: Object.assign({}, a) });
  const K = (x, y, f, o) => Object.assign({ id: 'kael', key: 'kael', x, y, f }, o);
  const E = (x, y, f, o) => Object.assign({ id: 'eiryn', key: 'eirynAsh', x, y, f }, o);
  const AE = (x, y, f, o) => Object.assign({ id: 'aerys', key: 'aerys', x, y, f }, o);
  const EL = (x, y, f, o) => Object.assign({ id: 'eloryn', key: 'eloryn', x, y, f }, o);
  const BR = (x, y, f, o) => Object.assign({ id: 'braxen', key: 'braxen', x, y, f }, o);
  const NX = (x, y, f, o) => Object.assign({ id: 'nox', key: 'nox', x, y, f }, o);
  const AL = (x, y, f, o) => Object.assign({ id: 'altheryx', key: 'altheryx', x, y, f }, o);

  return {
    id: 'c14',
    speakers: {},
    nodes(h) {
      const { B, N, X } = h;
      return {
        'c14.hall': {
          type: 'scene', chapter: 'c14', bg: 'summit', next: 'c14.king',
          lines: [
            X('The door opens. No light waits behind it. Only stone. Kael steps through first. The hall beyond is cathedral-wide and ancient enough to make the ruins outside the Tower feel young. Its ceiling disappears into darkness as though whoever built the place never bothered to finish the sky above it.'),
            X('Kael’s boot strikes the floor. The sound echoes once. Then the echo dies too quickly. Aerys folds her arms around herself.'),
            X('Nox does not answer. His eyes are already searching for exits that do not exist. Far ahead stand five enormous stone wheels mounted upright into the floor. Even at a distance, the shapes attached to four of them are unmistakable. Bodies. One wheel stands empty.'),
            X('Eloryn slows without meaning to. Something about the room feels finished. Not abandoned. Finished. Her healer’s instincts react before she understands why. She touches Aerys lightly at the wrist.'),
            B('eloryn', 'Be careful where you step.'),
          ],
        },
        'c14.king': {
          type: 'scene', chapter: 'c14', bg: 'summit', next: 'c14.wheels',
          lines: [
            X('A figure stands near the wheels. No dramatic entrance. No emergence from shadow. One moment their attention is on the mechanisms, and the next they realize a man has already been there. Tall. Lean. Travel-worn armor. No weapon in his hands. He lifts one hand.'),
            B('altheryx', '…I was wondering when someone else would arrive.'),
            B('kael', 'Who are you?'),
            B('altheryx', 'Altheryx.'),
            B('altheryx', 'Though… the Tower’s taken to calling me “the Crownless King.”'),
            B('aerys', 'Why?'),
            X('Altheryx’s gaze flicks toward the wheels. Only for a beat.'),
            B('altheryx', '…Because I refused to kneel.'),
            B('kael', 'How long have you been here?'),
            B('altheryx', 'Seven months.'),
            B('aerys', '…Alone?'),
            X('The hesitation before Altheryx answers is perfect.'),
            B('altheryx', 'Yes.'),
            X('Eiryn watches him. Unreadable. Nox has no patience for the shape of the conversation.'),
            B('nox', 'What was your wish?'),
            B('altheryx', 'To rule the world.'),
            B('altheryx', 'And end war permanently.'),
          ],
        },
        'c14.wheels': {
          type: 'scene', chapter: 'c14', bg: 'summit', next: 'c14.offering',
          lines: [
            X('The group approaches the wheels together. Up close, the bodies are worse. They are ancient. Armor styles none of the others have seen outside old illustrations cling to dried remains. The craftsmanship resembles Altheryx’s own gear closely enough to place them in the same era.'),
            B('eloryn', 'They weren’t Tower constructs…'),
            X('Altheryx approaches the empty wheel. He studies it with the expression of a man revisiting a puzzle that has defeated him for a long time.'),
            B('altheryx', 'I never understood this one.'),
            X('Braxen crouches beside another wheel and examines the spikes built into its mechanism.'),
            B('braxen', 'So what, it just… kills you?'),
            B('altheryx', 'Eventually.'),
            B('altheryx', 'My guess? It won’t move again until it’s… satisfied.'),
            X('Aerys leans toward a narrow groove cut through the center of one wheel.'),
            B('aerys', '…There’s channels.'),
            X('Old blood has darkened them almost black. Eloryn steps closer. Curiosity begins overcoming caution. She leans toward the mechanism of the empty wheel.'),
            B('eloryn', 'Hey guys—'),
          ],
        },
        'c14.offering': {
          type: 'scene', chapter: 'c14', bg: 'summit', next: 'end',
          lines: [
            X('Something punches through her chest.'),
            X('There is no warning. No change in the room. No shift in Altheryx’s voice for anyone to recognize too late. One moment Eloryn is speaking. The next, a fist protrudes through the front of her body. Time stops. Her eyes widen. Not pain first. Disbelief. Eloryn looks down. Blood covers her hands.'),
            X('Aerys screams her name. Altheryx stands directly behind Eloryn. His arm is buried through her to the wrist. He leans close to her ear.'),
            B('altheryx', 'I’m sorry.'),
            X('Then he pulls his hand free. Eloryn collapses. Kael lunges. Too late. She hits the stone with a breath that rattles in her chest. Her eyes find the others. Confused. Apologetic, somehow, as though she has failed them by being the one who was struck.'),
            B('eloryn', '…I didn’t—'),
            X('Her body lifts from the floor. Not violently. Gravity simply stops owning her. The empty wheel turns. Stone grinds against stone for the first time in months. Eloryn rises into it. The mechanism impales her. Blood enters the carved channels. It flows inward. One wheel activates. Then another. All of them begin to turn. Behind the group, stone moves. A hidden passage opens. The Tower accepts the offering.'),
            X('Altheryx exhales. Resolved. He turns toward the others with the same calm, rational expression he wore when introducing himself. His blood-covered hand lowers to his side.'),
            B('altheryx', 'Now…'),
            B('altheryx', '…we can continue.'),
          ],
        },
      };
    },
    // One take from the door to the offering. The five wheels stand along the north wall (y ≈ -3.4 to -4);
    // the middle one, at (0, -4), is the empty wheel.
    stages: {
      'c14.hall': auto('offering', [K(-8.0, 0.4, 0), E(-9.4, -0.8, 0), AE(-9.0, 1.4, 0), BR(-9.8, 0.4, 0), EL(-10.6, 1.2, 0), NX(-7.6, -1.0, 0), AL(1.6, -1.6, 3.14, { hidden: true })], {
        noFace: true,
        nodes: {
          'c14.hall': {
            0: { cam: { focus: ['kael', 'nox', 'aerys', 'braxen', 'eloryn', 'eiryn'], view: 13, ang: -0.1, pitch: 0.36, up: 1.2, drift: 0.01, ease: 1.8 }, do: [{ fade: [0, 1.2, '4,4,10'] }, ...[['kael', -2.4, 0.4], ['nox', -3.0, -1.2], ['aerys', -4.2, 1.4], ['braxen', -5.2, 0.2], ['eloryn', -6.0, 1.4], ['eiryn', -4.4, -0.9]].map(([w, x, y]) => ({ who: w, to: [x, y], speed: 0.9 }))] },
            1: { cam: { focus: ['kael', 'aerys'], view: 6, ang: -0.2, pitch: 0.42, up: 0.8, ease: 1.0 }, do: [{ who: 'kael', face: [0, -4] }, { at: 0.8, who: 'aerys', set: { gest: 'cross' } }] },
            2: { cam: { x: 0, y: -3.6, view: 10, ang: -0.1, pitch: 0.4, up: 1.4, ease: 1.6 }, do: [{ who: 'nox', face: [6, -2] }, { at: 1.4, who: 'nox', face: [-6, -2] }] },
            3: { cam: { focus: ['eloryn', 'aerys'], view: 4.2, ang: -0.2, pitch: 0.42, up: 0.8, ease: 1.0 }, do: [{ who: 'eloryn', to: [-4.7, 1.6], speed: 0.6, face: 'aerys' }, { at: 1.6, who: 'aerys', face: 'eloryn' }] },
          },
          'c14.king': {
            0: { cam: { x: -0.6, y: -0.6, view: 11, ang: -0.1, pitch: 0.4, ease: 1.2 }, do: [{ who: 'altheryx', show: true }, { who: 'altheryx', set: { stow: true, gest: null } }, ...['kael', 'nox', 'aerys', 'braxen', 'eloryn', 'eiryn'].map((w, i) => ({ at: 0.3 + i * 0.12, who: w, face: 'altheryx' })), { at: 0.5, who: 'kael', icon: '!' }, { at: 1.2, who: 'altheryx', set: { gest: 'wave' } }, { at: 2.6, who: 'altheryx', set: { gest: null } }] },
            6: { cam: { focus: ['altheryx'], view: 3.6, ang: -0.2, pitch: 0.42, up: 0.9, ease: 0.8 }, do: [{ who: 'altheryx', face: [0, -4] }, { at: 1.2, who: 'altheryx', face: 'aerys' }] },
            11: { cam: { focus: ['altheryx'], view: 3.2, ang: -0.1, pitch: 0.42, up: 1.0, push: -0.15, ease: 1.2 } },
            13: { cam: { focus: ['eiryn'], view: 3.6, ang: -0.2, pitch: 0.42, up: 0.9, ease: 0.8 }, do: [{ at: 1.4, cam: { focus: ['nox', 'altheryx'], view: 5, ang: -0.2, pitch: 0.42, up: 0.8, ease: 0.8 } }, { at: 1.4, who: 'nox', to: [-1.8, -1.2], speed: 1.0, face: 'altheryx' }] },
          },
          'c14.wheels': {
            0: { cam: { x: 0, y: -2.4, view: 10, ang: -0.1, pitch: 0.42, up: 0.8, ease: 1.4 }, do: [...[['kael', -1.0, -2.0], ['eiryn', -3.6, -1.2], ['aerys', -2.2, -0.9], ['braxen', 1.6, -1.8], ['eloryn', -2.8, -2.4], ['nox', 3.0, -1.0], ['altheryx', 0.8, -2.0]].map(([w, x, y]) => ({ who: w, to: [x, y], speed: 0.8 })), { at: 3.0, who: 'eloryn', face: [-2, -3.8] }, { at: 3.0, who: 'kael', face: [0, -4] }] },
            2: { cam: { focus: ['altheryx'], view: 4.4, ang: -0.1, pitch: 0.42, up: 0.9, ease: 1.0 }, do: [{ who: 'altheryx', to: [0.4, -3.0], speed: 0.7, face: [0, -4] }] },
            4: { cam: { focus: ['braxen'], view: 4, ang: -0.1, pitch: 0.42, up: 0.6, ease: 1.0 }, do: [{ who: 'braxen', to: [2.0, -2.8], speed: 0.8, face: [2, -3.8] }, { at: 1.4, who: 'braxen', state: 'pickup', hold: true }] },
            5: { do: [{ who: 'braxen', state: 'idle', hold: true }] },
            8: { cam: { focus: ['aerys'], view: 4, ang: -0.1, pitch: 0.42, up: 0.7, ease: 1.0 }, do: [{ who: 'aerys', set: { gest: null } }, { who: 'aerys', to: [-2.0, -2.8], speed: 0.8, face: [-2, -3.8] }, { at: 1.4, who: 'aerys', state: 'pickup', dur: 1.4 }] },
            10: { cam: { focus: ['eloryn', 'altheryx'], view: 4.6, ang: -0.1, pitch: 0.42, up: 0.8, ease: 1.0 }, do: [{ who: 'eloryn', to: [-0.3, -3.0], speed: 0.7, face: [0, -4] }, { at: 1.0, who: 'altheryx', to: [-0.3, -2.1], speed: 0.6 }, { at: 1.8, who: 'eloryn', state: 'pickup', dur: 1.2 }] },
            11: { do: [{ who: 'eloryn', face: [-2, 0] }] },
          },
          'c14.offering': {
            0: { cam: { focus: ['eloryn', 'altheryx'], view: 4.4, ang: -0.1, pitch: 0.42, up: 0.8, ease: 0.2, cut: true }, do: [{ who: 'altheryx', face: 'eloryn' }, { who: 'altheryx', attack: { wind: 0.05, active: 0.1, recover: 0.6, tele: false } }, { at: 0.15, shake: 10 }, { at: 0.15, slow: [0.2, 1.0] }, { at: 0.15, who: 'eloryn', state: 'hurt', dur: 1.2 }, { at: 0.15, who: 'eloryn', pfx: { name: 'hit_crit', z: 1.2, scale: 2 } }, { at: 0.15, fade: [0.8, 0.08, '200,20,30'] }, { at: 0.25, fade: [0.0, 0.8] }] },
            1: { cam: { focus: ['eloryn'], view: 3.0, ang: -0.1, pitch: 0.42, up: 0.9, ease: 0.8 }, do: [{ who: 'eloryn', icon: '…' }, { at: 1.0, who: 'eloryn', face: [-0.3, -2.0] }] },
            2: { cam: { focus: ['aerys', 'eloryn', 'altheryx'], view: 5.4, ang: -0.1, pitch: 0.42, ease: 0.4 }, do: [{ who: 'aerys', icon: '!' }, { who: 'aerys', to: [-1.4, -2.2], gait: 'run', speed: 3.4 }, { at: 0.8, who: 'aerys', state: 'stagger', dur: 0.5 }] },
            4: { cam: { focus: ['eloryn', 'kael'], view: 5.4, ang: -0.1, pitch: 0.42, ease: 0.5 }, do: [{ at: 0.2, who: 'eloryn', state: 'down', hold: true }, { at: 0.2, who: 'altheryx', to: [0.6, -1.6], gait: 'back', speed: 1.0 }, { at: 0.4, who: 'kael', to: [-1.0, -2.4], gait: 'dash', speed: 7 }, { at: 1.0, who: 'kael', state: 'pickup', hold: true }] },
            6: { cam: { x: 0, y: -3.0, view: 10, ang: -0.1, pitch: 0.38, up: 1.2, ease: 1.2 }, do: [{ who: 'eloryn', hop: [1.8, 1.8] }, { who: 'eloryn', to: [0, -3.7], speed: 0.6 }, { at: 1.2, who: 'eloryn', hide: true }, { at: 1.2, pfx: [{ name: 'dark_curse', x: 0, y: -4.0, z: 1.6, scale: 2, life: 3.4 }, { name: 'hit_pierce', x: 0, y: -4.0, z: 1.8, scale: 2 }] }, { at: 1.2, shake: 8 }, { at: 1.2, rumble: [6, 3] }, { at: 1.2, light: ['200,30,40', 0.35, 2.0] }, ...[[-2, -3.8], [2, -3.8], [-4, -3.4], [4, -3.4]].map(([x, y], i) => ({ at: 1.8 + i * 0.4, pfx: { name: 'dark_curse', x, y, z: 1.4, scale: 1.6, life: 2.6 } })), { at: 3.6, pfx: [{ name: 'rock_burst', x: -9, y: 0, z: 1, scale: 2.4 }, { name: 'dust_cloud', x: -8.6, y: 0, scale: 2.4 }] }, { at: 3.6, shake: 6 }, { at: 1.6, who: 'kael', state: 'idle', hold: true }, { at: 1.8, who: 'kael', face: [0, -4] }, ...['aerys', 'nox', 'braxen', 'eiryn'].map((w) => ({ at: 3.8, who: w, face: [-9, 0] }))] },
            7: { cam: { focus: ['altheryx'], view: 3.4, ang: -0.1, pitch: 0.42, up: 1.0, ease: 1.2 }, do: [{ light: ['200,30,40', 0.12, 1.4] }, { at: 0.8, who: 'altheryx', face: 'kael' }] },
          },
        },
      }),
      'c14.king': 'same',
      'c14.wheels': 'same',
      'c14.offering': 'same',
    },
    defs: {
      // Altheryx, the Crownless King (book chapter Sixteen): never fights on stage.
      altheryx: {
        name: 'Altheryx', team: 'hero', r: 0.38, hp: 100, sta: 100, speed: 3.8, guest: true,
        react: 0.3, read: 0.3, parry: 0, dodge: 0, feint: 0, noncombat: true, attack: null,
        barks: {}, intro: { epithet: 'The Crownless King', line: null },
      },
    },
    scenarios: {},
    looks: {
      altheryx: {
        h: 1.05, w: 0.95, build: 0.95, weapon: 'none', hair: 'short',
        skin: ['#e0bfa6', '#9a766a'], hairC: ['#6a5a4a', '#352c22'],
        body: ['#4a4538', '#25221b'], legs: ['#3a352c', '#1c1a15'], boots: ['#3a2d26', '#1c1410'],
        armor: ['#7a7060', '#3d382f'], pauldron: 'L', coat: ['#58503e', '#2a251c'], coatLen: 0.4,
        accent: '#c9a45a', eye: '#8a7a5a', belt: '#2a2018', strap: '#2a2018', chestV: true,
      },
    },
  };
});
