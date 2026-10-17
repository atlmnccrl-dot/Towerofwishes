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
      const { B, N } = h;
      return {
        'c14.hall': {
          type: 'scene', chapter: 'c14', bg: 'summit', next: 'c14.king',
          lines: [
            N('The door opens. No light waits behind it. Only stone. Kael steps through first. The hall beyond is cathedral-wide and ancient enough to make the ruins outside the Tower feel young. Its ceiling disappears into darkness as though whoever built the place never bothered to finish the sky above it.'),
            N('Kael’s boot strikes the floor. The sound echoes once. Then the echo dies too quickly. Aerys folds her arms around herself.'),
            B('aerys', '…I don’t like this one.'),
            N('Nox does not answer. His eyes are already searching for exits that do not exist. Far ahead stand five enormous stone wheels mounted upright into the floor. Even at a distance, the shapes attached to four of them are unmistakable. Bodies. One wheel stands empty.'),
            N('Eloryn slows without meaning to. Something about the room feels finished. Not abandoned. Finished. Her healer’s instincts react before she understands why. She touches Aerys lightly at the wrist.'),
            B('eloryn', 'Be careful where you step.'),
          ],
        },
        'c14.king': {
          type: 'scene', chapter: 'c14', bg: 'summit', next: 'c14.wheels',
          lines: [
            N('A figure stands near the wheels. No dramatic entrance. No emergence from shadow. One moment their attention is on the mechanisms, and the next they realize a man has already been there. Tall. Lean. Travel-worn armor. No weapon in his hands. He lifts one hand.'),
            B('altheryx', '…I was wondering when someone else would arrive.'),
            N('Aerys stiffens. The voice sounds relieved rather than threatening. Kael moves half a step ahead.'),
            B('kael', 'Who are you?'),
            N('The man smiles faintly. Measured.'),
            B('altheryx', 'Altheryx.'),
            N('He gestures vaguely around the hall.'),
            B('altheryx', 'Though… the Tower’s taken to calling me something else.'),
            N('A quiet breath leaves his nose.'),
            B('altheryx', '“The Crownless King.”'),
            B('braxen', 'Subtle.'),
            B('aerys', 'Why?'),
            N('Altheryx’s gaze flicks toward the wheels. Only for a beat.'),
            B('altheryx', '…Because I refused to kneel.'),
            N('Kael studies him more carefully.'),
            B('kael', 'How long have you been here?'),
            B('altheryx', 'Seven months.'),
            B('aerys', '…Alone?'),
            N('The hesitation before Altheryx answers is perfect.'),
            B('altheryx', 'Yes.'),
            N('Then he spreads his hands.'),
            B('altheryx', 'At least… now.'),
            N('Eiryn watches him. Unreadable. Nox has no patience for the shape of the conversation.'),
            B('nox', 'What was your wish?'),
            N('Altheryx answers immediately.'),
            B('altheryx', 'To rule the world.'),
            N('No shame. No performance. Then, calmly:'),
            B('altheryx', 'And end war permanently.'),
          ],
        },
        'c14.wheels': {
          type: 'scene', chapter: 'c14', bg: 'summit', next: 'c14.offering',
          lines: [
            N('The group approaches the wheels together. Up close, the bodies are worse. They are ancient. Armor styles none of the others have seen outside old illustrations cling to dried remains. The craftsmanship resembles Altheryx’s own gear closely enough to place them in the same era.'),
            B('eloryn', 'They weren’t Tower constructs…'),
            N('Altheryx approaches the empty wheel. He studies it with the expression of a man revisiting a puzzle that has defeated him for a long time.'),
            B('altheryx', 'I never understood this one.'),
            N('He taps the stone rim with two fingers.'),
            B('altheryx', 'The others… they died here before I figured anything out.'),
            N('Braxen crouches beside another wheel and examines the spikes built into its mechanism.'),
            B('braxen', 'So what, it just… kills you?'),
            B('altheryx', 'Eventually.'),
            N('Altheryx looks over the machinery.'),
            B('altheryx', 'My guess? It won’t move again until it’s… satisfied.'),
            N('Kael begins circling the wheels. Thinking.'),
            B('kael', 'So we don’t touch anything.'),
            N('Aerys leans toward a narrow groove cut through the center of one wheel.'),
            B('aerys', '…There’s channels.'),
            N('Old blood has darkened them almost black. Eloryn steps closer. Curiosity begins overcoming caution. She leans toward the mechanism of the empty wheel.'),
            B('eloryn', 'Hey guys—'),
          ],
        },
        'c14.offering': {
          type: 'scene', chapter: 'c14', bg: 'summit', next: 'end',
          lines: [
            N('Something punches through her chest.'),
            N('There is no warning. No change in the room. No shift in Altheryx’s voice for anyone to recognize too late. One moment Eloryn is speaking. The next, a fist protrudes through the front of her body. Time stops. Her eyes widen. Not pain first. Disbelief. Eloryn looks down. Blood covers her hands.'),
            N('Aerys screams her name. Altheryx stands directly behind Eloryn. His arm is buried through her to the wrist. He leans close to her ear.'),
            B('altheryx', 'I’m sorry.'),
            N('Then he pulls his hand free. Eloryn collapses. Kael lunges. Too late. She hits the stone with a breath that rattles in her chest. Her eyes find the others. Confused. Apologetic, somehow, as though she has failed them by being the one who was struck.'),
            B('eloryn', '…I didn’t—'),
            N('Her body lifts from the floor. Not violently. Gravity simply stops owning her. The empty wheel turns. Stone grinds against stone for the first time in months. Eloryn rises into it. The mechanism impales her. Blood enters the carved channels. It flows inward. One wheel activates. Then another. All of them begin to turn. Behind the group, stone moves. A hidden passage opens. The Tower accepts the offering.'),
            N('Altheryx exhales. Resolved. He turns toward the others with the same calm, rational expression he wore when introducing himself. His blood-covered hand lowers to his side.'),
            B('altheryx', 'Now…'),
            B('altheryx', '…we can continue.'),
          ],
        },
      };
    },
    stages: {
      'c14.hall': auto('offering', [K(-8.0, 0.4, 0), E(-9.4, -0.8, 0), AE(-9.0, 1.4, 0), BR(-9.8, 0.4, 0), EL(-10.6, 1.2, 0), NX(-7.6, -1.0, 0)], {
        noFace: true,
        nodes: { 'c14.hall': {
          0: { cam: { focus: ['kael', 'nox', 'aerys', 'braxen', 'eloryn', 'eiryn'], view: 13, ang: -0.1, pitch: 0.36, up: 1.2, drift: 0.01, ease: 1.8 }, do: [{ fade: [0, 1.2, '4,4,10'] }, { who: 'kael', to: [-2.4, 0.4], speed: 0.8 }, { who: 'nox', to: [-3.0, -1.0], speed: 0.8 }, { who: 'aerys', to: [-4.0, 1.4], speed: 0.8 }, { who: 'braxen', to: [-4.8, 0.4], speed: 0.8 }, { who: 'eloryn', to: [-5.6, 1.2], speed: 0.8 }, { who: 'eiryn', to: [-4.6, -0.8], speed: 0.8 }] },
          1: { cam: { face: 'kael', side: 0.35, view: 3.6, up: 1.0, pitch: 0.42, ease: 1.0 } },
          3: { cam: { x: 0, y: -3.6, view: 10, ang: -0.1, pitch: 0.4, up: 1.4, ease: 1.6 } },
        } },
      }),
      'c14.king': auto('offering', [K(-2.4, 0.4, 0), E(-4.4, -0.8, 0), AE(-4.0, 1.6, 0), BR(-4.8, 0.4, 0), EL(-5.2, 1.4, 0), NX(-3.0, -1.2, 0), AL(2.0, -0.6, 3.14, { hidden: true })], {
        nodes: { 'c14.king': {
          0: { cam: { x: 0, y: -1.0, view: 11, ang: -0.1, pitch: 0.4, ease: 1.2 }, do: [{ who: 'altheryx', show: true, put: [2.0, -0.6] }] },
          1: { cam: { face: 'altheryx', side: 0.3, view: 3.4, up: 1.1, pitch: 0.42, ease: 0.8 } },
        } },
      }),
      'c14.wheels': auto('offering', [K(-1.0, -1.0, -1.2), E(-3.2, 0.2, -1.2), AE(-1.6, 1.2, -1.2), BR(0.8, 0.0, -1.2), EL(-2.4, -1.4, -1.2), NX(1.8, 1.2, -1.2), AL(0.0, -1.8, -1.2)], {
        nodes: { 'c14.wheels': {
          0: { cam: { x: 0, y: -1.0, view: 8, ang: -0.1, pitch: 0.42, up: 0.8, ease: 1.4 }, do: [{ who: 'altheryx', set: { stow: true, gest: 'cross' } }] },
          3: { do: [{ who: 'altheryx', to: [0.2, -2.6], speed: 0.7, face: [0.2, -5] }] },
          14: { cam: { face: 'eloryn', side: 0.35, view: 3.4, up: 1.1, pitch: 0.42, ease: 1.0 }, do: [{ who: 'eloryn', to: [-0.6, -2.4], speed: 0.6 }] },
        } },
      }),
      'c14.offering': auto('offering', [K(-2.4, 0.4, -1.2), E(-3.8, -0.6, -1.2), AE(-1.6, 1.4, -1.2), BR(-3.4, 1.6, -1.2), EL(0.2, -2.6, 1.57), NX(-2.0, -1.0, -1.2), AL(0.2, -1.6, 1.57)], {
        nodes: { 'c14.offering': {
          0: { cam: { focus: ['eloryn', 'altheryx'], view: 4.4, ang: -0.1, pitch: 0.42, up: 0.8, ease: 0.2, cut: true }, do: [{ who: 'altheryx', set: { gest: 'present' } }, { at: 0.3, shake: 10 }, { at: 0.3, who: 'eloryn', state: 'hurt', dur: 1.0 }, { at: 0.3, fade: [0.8, 0.08, '200,20,30'] }, { at: 0.4, fade: [0.0, 0.8] }] },
          1: { cam: { face: 'eloryn', side: 0.3, view: 2.8, up: 1.1, pitch: 0.42, ease: 0.8 }, do: [{ who: 'eloryn', icon: '…' }] },
          2: { cam: { focus: ['aerys', 'eloryn'], view: 5, ang: -0.1, pitch: 0.42, ease: 0.4 }, do: [{ who: 'aerys', to: [-0.4, -0.4], gait: 'run', speed: 3.4 }, { who: 'aerys', say: 'ELORYN!' }] },
          3: { cam: { face: 'altheryx', side: 0.3, view: 2.8, up: 1.1, pitch: 0.4, ease: 0.8 } },
          4: { cam: { focus: ['eloryn', 'kael'], view: 5.4, ang: -0.1, pitch: 0.42, ease: 0.5 }, do: [{ who: 'kael', to: [-0.4, -1.6], gait: 'dash', speed: 7 }, { at: 0.4, who: 'eloryn', state: 'down', hold: true }] },
          6: { cam: { x: 0, y: -3.4, view: 9, ang: -0.1, pitch: 0.36, up: 1.4, ease: 1.2 }, do: [{ rumble: [6, 3] }, { shake: 8 }, { light: ['200,30,40', 0.35, 2.0] }] },
          8: { cam: { face: 'altheryx', side: -0.3, view: 3.2, up: 1.1, pitch: 0.42, ease: 1.4 } },
          10: { do: [{ fade: [0.9, 2.4, '0,0,0'] }] },
        } },
      }),
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
