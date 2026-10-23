/*
 * Tower of Wishes — The Night Creature (book chapters Eight and Nine).
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

  return {
    id: 'c10',
    speakers: {},
    nodes(h) {
      const { B, N, X } = h;
      return {
        // ---- Chapter Eight: the shadow that stays
        'c10.shadow': {
          type: 'scene', chapter: 'c10', bg: 'hill', next: 'c10.camp',
          lines: [
            X('Nox steps backward into shadow. It is not flight. It is not surrender. Just a change of position. Kael keeps his sword raised until the assassin disappears completely among the dead trees beyond the field.'),
            X('Far above them, crouched in the bare branches of a dead tree, Nox watches Braxen walk away with the group. His hand tightens around one of his blades. Can’t take all of them. That is the truth of it. Kael is predictable but stubborn. Braxen is dangerous even injured. The healer makes every wound less final. The angel has range. And Eiryn— Nox does not yet have a useful word for Eiryn.'),
            X('Below, Aerys laughs softly at something Kael mutters. Nox’s attention shifts to her. Stays there. One beat longer than it should. He tells himself he is studying the group. That explanation lasts until night.'),
          ],
        },
        'c10.camp': {
          type: 'scene', chapter: 'c10', bg: 'forest', next: 'c10.road',
          lines: [
            X('The travelers camp near a shallow ravine and sleep beneath the remains of a stone overhang. Kael takes the first watch. Eiryn takes more of the night than anyone notices.'),
            X('After the camp goes quiet, four bandits move through the tall grass toward them. They never reach the fire. A blade flashes once in the dark. A throat opens. A second man has time to turn his head before Nox is behind him. By the time the last body falls, no one at the camp has stirred. Nox wipes his blade clean on the grass and disappears before dawn.'),
            X('Kael finds the bodies anyway. He stands in the brush looking down at work too precise to belong to beasts.'),
            B('kael', '…We weren’t alone.'),
            X('Kael does not answer. Eiryn looks toward the trees. Nothing waits where the others can see.'),
          ],
        },
        'c10.road': {
          type: 'scene', chapter: 'c10', bg: 'road', next: 'c10.spring',
          lines: [
            X('The road continues. Nox continues with it. Never close enough to join them. Never far enough to lose them. He learns their rhythms from the trees.'),
            X('One afternoon she walks several paces ahead of the others, unburdened for a rare moment. Nox tracks her through the trees. She doesn’t walk like prey. That thought bothers him.'),
          ],
        },
        'c10.spring': {
          type: 'scene', chapter: 'c10', bg: 'forest', next: 'c10.contract',
          lines: [
            X('Later, they find steam rising between dark rocks near the road. A natural hot spring has survived there, fed by water warm enough to fog the cold air. The group camps nearby.'),
            X('After night settles and the others have quieted, Aerys leaves the fire. Not sneaking. Simply wandering again. Nox follows from above. She finds the spring and kneels at its edge. Her fingers touch the water. A smile appears. A small one. Private. She sets aside her boots and cloak and steps into the warmth until the water can carry some of the road out of her muscles. Steam drifts around her in pale folds.'),
            X('From a branch above, Nox turns a dagger idly between his fingers. Then the blade stops moving. Aerys tilts her head, still looking into the forest.'),
            B('aerys', '…Thank you.'),
            X('Only silence answers. High above, Nox freezes on a branch. The corner of his mouth almost moves. She sees more than they think. No answer comes. But something about the silence changes.'),
          ],
        },
        'c10.contract': {
          type: 'scene', chapter: 'c10', bg: 'forest', next: 'c10.night',
          lines: [
            X('Later that night, Nox unfolds the contract. Braxen’s name stares back at him. He reads it once. Then folds the page again. Gold fades.'),
            X('Ahead of him, Aerys walks beside Eloryn and laughs at something too quiet for him to hear. Nox finds himself tracking the movement automatically. Not the road. Her. A thought forms before he can stop it. Don’t touch her world.'),
            X('The Tower grows larger on the horizon. And one evening, as the road darkens, night seems to deepen faster than it should. Even Nox stops moving.'),
          ],
        },

        // ---- Chapter Nine: the Night Creature
        'c10.night': {
          type: 'scene', chapter: 'c10', bg: 'forest', next: 'c10.fight',
          lines: [
            X('Night settles wrong. The campfire has burned down to embers. Wind barely disturbs the branches. Eloryn sleeps lightly beneath her cloak, fresh bandages hidden beneath older ones.'),
            X('Above the camp, something moves without sound. It clings to the trunk of a tree upside down. Its limbs do not bend at joints so much as curve wherever the body requires. Long fingers press into bark. Two faintly glowing eyes move across the camp. Kael. Past him. Braxen. Past him. Aerys. Past her. The eyes stop on Eloryn.'),
            X('The creature drops. No growl. No warning. It comes straight down through the darkness. Claws tear through the thin wall of Eloryn’s shelter. Her scream splits the night open.'),
            B('eloryn', '—AHH!'),
            X('High in the branches beyond camp, Nox’s eyes snap open. The sound reaches him a fraction after the attack. Too late.'),
          ],
        },
        'c10.fight': {
          type: 'battle', chapter: 'c10', scenario: 'nightcreature', wounds: true, xp: 220, allyLevel: true,
          party: (st) => h.BOOK(st), win: 'c10.after',
          outro: 'The Night Creature comes apart under a storm of steel. The forest goes silent.',
        },
        'c10.after': {
          type: 'scene', chapter: 'c10', bg: 'forest', next: 'c10.dawn',
          lines: [
            X('Aerys stumbles backward. Her light thins. The Night Creature looms above her. Claws rise. The last glow in her palms goes out. She braces. Shadow shatters. Nox appears between them with both blades already moving.'),
            X('The first cut opens the creature from shoulder to waist. Before its body can understand that wound, Nox moves again. Then again. Afterimages spiral around it. There is no flourish in the speed. No wasted motion. Every step exists only to put an edge somewhere fatal. Nox jumps. Turns once above it. Both blades come down through the skull. The Night Creature stops. The forest is silent. No insects. No wind.'),
            X('Nox stands over the corpse, breathing steadily. Then he looks at Aerys. Alive. She stares back. Shock changes slowly into recognition.'),
            B('aerys', '…You.'),
            X('Nox freezes. Behind them, Kael groans. Braxen coughs blood. Eloryn fights to keep her eyes open. Nox steps backward.'),
            B('nox', '…Didn’t want it to end like that.'),
            X('Then shadow takes him again. Aerys falls to her knees. Kael manages to sit against the tree and looks from the dead creature to the place Nox vanished.'),
            X('Eiryn walks toward the corpse. Her gaze moves to the trees.'),
            B('eiryn', 'He’s still close.'),
          ],
        },
        'c10.dawn': {
          type: 'scene', chapter: 'c10', bg: 'forest', next: 'c10.thanks',
          lines: [
            X('Dawn begins with blood everywhere. Morning light filters through shattered branches and finds the camp destroyed. Eloryn kneels beside Braxen despite her own injuries, both hands glowing weakly as she works to straighten what the creature twisted. Braxen remains conscious by stubbornness alone. When she finishes stabilizing him, Eloryn moves to Kael. He has gotten himself upright and is pretending that counts as recovery. Her light touches his shoulder. He winces.'),
            B('kael', 'Seen worse.'),
            X('Eventually Eloryn finishes binding Braxen’s arm. It will work. It will not be whole. She sits back on her heels.'),
            B('eloryn', 'They’ll live.'),
            X('Aerys stands. The movement has the sudden certainty of a decision.'),
            B('aerys', 'I’ll be right back.'),
            B('braxen', 'She’s probably just takin’ a leak.'),
            X('Aerys stares at him. That is enough to make Kael laugh once despite the pain. Then she walks into the trees.'),
          ],
        },
        'c10.thanks': {
          type: 'scene', chapter: 'c10', bg: 'forest', next: 'c10.angel',
          lines: [
            X('Morning light breaks between the branches in narrow shafts. Aerys keeps going until the sounds of the ruined camp soften behind her. She stops in a small clearing. Nothing moves. Only wind. She clasps her hands together, suddenly nervous.'),
            B('aerys', 'I don’t know if you can hear me… or if you’re still watching.'),
            B('aerys', 'But thank you.'),
            B('aerys', 'They would’ve died.'),
            B('aerys', 'I would have.'),
            X('Aerys turns. Shadow bends behind her. Nox steps out between two trees. No blade raised. No threat in his posture. Aerys stiffens but does not scream. For the first time, she sees him without a knife at someone’s throat or blood moving too fast around him. There is still blood drying on his blades. His eyes are still sharp. But he also looks tired.'),
            B('nox', 'Didn’t mean to be seen.'),
          ],
        },
        'c10.angel': {
          type: 'scene', chapter: 'c10', bg: 'forest', next: 'c11.learn',
          lines: [
            X('Aerys exhales. Not relief. Curiosity. Several paces remain between them. Neither crosses them.'),
            B('nox', 'You shouldn’t thank people like me.'),
            B('nox', 'You don’t know what I am.'),
            B('aerys', 'I know what you did.'),
            X('They hold each other’s eyes too long. The forest seems to recede around the silence. Nox looks away first.'),
            B('aerys', 'You followed me.'),
            B('nox', '…Yeah.'),
            B('aerys', 'You’re not cruel.'),
            B('nox', 'Wrong.'),
            B('nox', 'I don’t walk with people.'),
            B('aerys', 'But I’m glad you’re close.'),
            X('The words land harder than anything she has said before. Nox looks at her as if memorizing a detail he has no right to keep.'),
            B('aerys', '…Be careful.'),
            X('He pauses. Only one breath.'),
            B('nox', 'You too, angel.'),
            X('Then he is gone. Aerys remains alone in the clearing. Her heart is beating much too fast for someone who has just had a quiet conversation. She touches the center of her chest. Something there feels warmer.'),
          ],
        },
      };
    },
    // Extra per-line beats, merged into the stage that plays each node (js/stages.js).
    beats: {
      'c10.camp': {
        4: { cam: { focus: ['eiryn'], view: 4, ang: -0.3, pitch: 0.42, up: 0.8, ease: 0.9 }, do: [{ who: 'eiryn', face: [9, -2] }] },
      },
      'c10.spring': {
        4: { cam: { x: 5.4, y: -3, view: 5, ang: -0.3, pitch: 0.36, up: 1.6, ease: 1.0 }, do: [{ at: 0.2, who: 'nox', show: true }, { at: 1.6, cam: { focus: ['aerys'], view: 3.4, ang: -0.3, pitch: 0.42, up: 0.8, ease: 0.8 } }, { at: 2.6, who: 'nox', hide: true }] },
      },
      'c10.night': {
        1: { do: [{ who: 'creature', show: true }, { who: 'creature', face: 'kael' }, { at: 0.8, who: 'creature', face: 'braxen' }, { at: 1.6, who: 'creature', face: 'aerys' }, { at: 2.4, who: 'creature', face: 'eloryn' }] },
        2: { do: [{ who: 'creature', drop: [2.4, 0.4] }, { who: 'creature', to: [-1.6, 1.2], gait: 'dash', speed: 8 }, { at: 0.3, who: 'creature', attack: { wind: 0.05, active: 0.1, recover: 0.4, tele: false } }] },
        4: { cam: { x: 7, y: -2.8, view: 5, ang: -0.3, pitch: 0.4, up: 1.2, ease: 0.6 }, do: [{ who: 'nox', show: true }, { at: 0.3, who: 'nox', icon: '!' }, { at: 1.0, who: 'nox', to: [3.0, -0.6], gait: 'dash', speed: 8 }] },
      },
      'c10.after': {
        6: { cam: { focus: ['aerys', 'kael', 'creature'], view: 8, ang: -0.3, pitch: 0.44, ease: 0.9 }, do: [{ at: 0.6, who: 'aerys', state: 'pickup', hold: true }, { at: 1.0, who: 'kael', state: 'sit', hold: true }, { at: 1.4, who: 'kael', face: 'creature' }] },
        7: { cam: { focus: ['eiryn', 'creature'], view: 5, ang: -0.3, pitch: 0.42, up: 0.6, ease: 0.9 }, do: [{ who: 'eiryn', to: [2.0, 1.8], speed: 0.8 }, { at: 2.4, who: 'eiryn', face: [8, -3] }] },
      },
      'c10.dawn': {
        2: { cam: { focus: ['eloryn', 'braxen'], view: 4, ang: -0.3, pitch: 0.44, up: 0.5, ease: 0.9 }, do: [{ who: 'eloryn', state: 'pickup', dur: 1.6 }, { at: 1.8, who: 'eloryn', state: 'sit', hold: true }] },
        4: { cam: { focus: ['aerys'], view: 4, ang: -0.3, pitch: 0.42, up: 0.7, ease: 0.8 }, do: [{ who: 'aerys', state: 'idle', hold: true }, { at: 0.8, who: 'aerys', face: [-9, -2] }] },
        7: { cam: { focus: ['aerys', 'kael', 'braxen'], view: 7, ang: -0.3, pitch: 0.44, ease: 0.9 }, do: [{ who: 'aerys', face: 'braxen' }, { at: 1.4, who: 'aerys', to: [-9.0, -2.0], speed: 1.2 }, { at: 3.6, who: 'aerys', hide: true }] },
      },
      'c10.angel': {
        0: { cam: { focus: ['aerys', 'nox'], view: 6, ang: -0.3, pitch: 0.42, up: 0.6, ease: 1.0 }, do: [{ who: 'aerys', face: 'nox' }] },
        4: { cam: { focus: ['nox'], view: 3.4, ang: -0.3, pitch: 0.42, up: 0.9, push: -0.1, ease: 1.0 }, do: [{ at: 1.6, who: 'nox', face: [7, 2] }] },
        11: { cam: { focus: ['nox'], view: 3.2, ang: -0.2, pitch: 0.42, up: 0.9, push: -0.12, ease: 1.0 }, do: [{ who: 'nox', face: 'aerys' }] },
        13: { cam: { focus: ['nox', 'aerys'], view: 4.6, ang: -0.3, pitch: 0.42, up: 0.7, ease: 0.8 } },
        15: { cam: { focus: ['aerys'], view: 4.2, ang: -0.3, pitch: 0.42, up: 0.7, ease: 1.0 }, do: [{ who: 'nox', pfx: { name: 'smoke_dark', scale: 1.4 } }, { who: 'nox', hide: true }, { at: 1.2, who: 'aerys', set: { gest: 'present' } }, { at: 1.2, light: ['255,220,180', 0.1, 1.2] }, { at: 3.0, light: ['255,220,180', 0, 1.2] }] },
      },
    },
    stages: {
      'c10.shadow': auto('farmland', [K(-1.0, 1.2, 0.1, { armed: true }), AE(-2.6, 0.4, 0.1), EL(-3.2, 1.6, 0.1), E(-4.2, 0.6, 0.1), BR(1.6, 0.4, 3.1), NX(1.0, -0.3, 3.1, { armed: true })], {
        nodes: { 'c10.shadow': {
          0: { cam: { focus: ['kael', 'nox'], view: 7, ang: -0.3, pitch: 0.44, ease: 0.9 }, do: [{ who: 'nox', to: [3.2, -2.6], gait: 'back', speed: 1.4 }, { at: 1.8, who: 'nox', hide: true }] },
          1: { cam: { x: 3.4, y: -3.4, view: 6, ang: -0.2, pitch: 0.36, up: 1.2, ease: 1.6 }, do: [{ who: 'nox', put: [3.4, -3.4], show: true, face: [-3, 1] }] },
          2: { cam: { focus: ['aerys', 'kael'], view: 5, ang: -0.3, pitch: 0.44, ease: 1.2 }, do: [{ who: 'kael', set: { stow: true } }] },
        } },
      }),
      'c10.camp': auto('nightcamp', [
        K(-0.8, 1.8, 0.2), EL(-2.8, 3.0, 0.3), BR(-3.6, 2.0, 0.1), AE(-2.0, 2.6, 0.3), E(-4.4, 1.2, 0.2),
        { id: 'thug1', key: 'thug', x: 7.0, y: -2.0, f: 3.0, hidden: true }, { id: 'thug2', key: 'thug', x: 7.6, y: -0.6, f: 3.0, hidden: true },
        { id: 'thug3', key: 'thug', x: 8.0, y: 0.8, f: 3.0, hidden: true }, { id: 'thug4', key: 'thug', x: 7.4, y: 2.0, f: 3.0, hidden: true },
        NX(9.0, -3.0, 3.0, { hidden: true, armed: true }),
      ], {
        nodes: { 'c10.camp': {
          0: { cam: { focus: ['kael', 'eiryn', 'aerys', 'braxen'], view: 8, ang: -0.45, pitch: 0.5, ease: 1.2 }, do: [{ who: 'eloryn', state: 'down', hold: true }, { who: 'braxen', state: 'down', hold: true }, { who: 'aerys', state: 'down', hold: true }, { who: 'kael', state: 'sit' }, { who: 'eiryn', state: 'sit' }] },
          1: { cam: { x: 2.0, y: 0.5, view: 11, ang: -0.35, pitch: 0.4, up: 0.8, ease: 1.2 }, do: [{ fade: [0.55, 0.8, '8,6,16'] }, { who: 'thug1', show: true }, { who: 'thug2', show: true }, { who: 'thug3', show: true }, { who: 'thug4', show: true }, { who: 'thug1', to: [3.0, -1.4], gait: 'creep', speed: 1.2 }, { who: 'thug2', to: [3.4, -0.2], gait: 'creep', speed: 1.2 }, { who: 'thug3', to: [3.6, 1.0], gait: 'creep', speed: 1.2 }, { who: 'thug4', to: [3.2, 2.0], gait: 'creep', speed: 1.2 }, { at: 1.6, who: 'nox', show: true, blink: [4.2, -1.4] }, { at: 1.8, who: 'thug1', state: 'down', hold: true }, { at: 2.0, who: 'nox', blink: [4.4, 0.0] }, { at: 2.2, who: 'thug2', state: 'down', hold: true }, { at: 2.4, who: 'nox', blink: [4.4, 1.2] }, { at: 2.6, who: 'thug3', state: 'down', hold: true }, { at: 2.8, who: 'nox', blink: [3.8, 2.2] }, { at: 3.0, who: 'thug4', state: 'down', hold: true }, { at: 4.0, who: 'nox', hide: true }, { at: 4.2, fade: [0, 1.5] }] },
          2: { do: [{ who: 'kael', state: 'idle', set: { gest: null, stow: false } }, { who: 'kael', to: [3.0, 0.2], speed: 1.2 }] },
          3: { cam: { face: 'kael', side: 0.4, view: 3.6, up: 1.05, pitch: 0.42, ease: 0.8 } },
        } },
      }),
      'c10.road': auto('grassland', [K(-6.0, 0.8, 0.1), AE(-9.2, 0.0, 0.1), EL(-7.4, 1.4, 0.1), BR(-7.0, 0.2, 0.1), E(-8.2, 1.0, 0.1)], {
        noFace: true,
        nodes: { 'c10.road': {
          0: { cam: { focus: ['kael', 'eloryn', 'braxen', 'eiryn', 'aerys'], view: 11, ang: -0.8, pitch: 0.46, drift: 0.02, ease: 1.4 }, do: [{ who: 'kael', to: [-0.4, 0.8], speed: 0.9 }, { who: 'braxen', to: [-1.4, 0.2], speed: 0.9 }, { who: 'eloryn', to: [-1.8, 1.4], speed: 0.9 }, { who: 'eiryn', to: [-3.0, 1.0], speed: 0.9 }, { who: 'aerys', to: [-4.0, 0.0], speed: 0.9 }] },
          1: { cam: { focus: ['aerys'], view: 5, ang: -0.6, pitch: 0.42, up: 0.8, ease: 1.2 }, do: [{ who: 'aerys', to: [5, 1.0], speed: 1.0 }, { who: 'kael', to: [2, 0.8], speed: 0.9 }] },
        } },
      }),
      'c10.spring': auto('nightcamp', [AE(-0.8, 2.0, 0.2, { gest: null }), NX(5.4, -3.0, 3.1, { hidden: true, armed: true })], {
        noFace: true,
        nodes: { 'c10.spring': {
          0: { cam: { x: 0, y: 1.0, view: 10, ang: -0.5, pitch: 0.46, ease: 1.4 }, do: [{ fade: [0.25, 1.0, '8,10,24'] }] },
          1: { cam: { face: 'aerys', side: 0.5, view: 3.6, up: 1.0, pitch: 0.42, ease: 1.2 }, do: [{ who: 'aerys', state: 'pickup', dur: 3.5 }] },
          2: { cam: { x: 3, y: -2, view: 7, ang: -0.3, pitch: 0.36, up: 1.2, ease: 1.4 }, do: [{ who: 'nox', show: true, put: [4.4, -3.0] }] },
          3: { cam: { face: 'aerys', side: 0.4, view: 3.2, up: 1.1, pitch: 0.42, ease: 0.8 }, do: [{ who: 'aerys', state: 'idle', face: [5, -3], set: { gest: null } }] },
        } },
      }),
      'c10.contract': auto('nightcamp', [AE(-2.2, 1.4, 0.2), EL(-3.2, 2.2, 0.2), NX(4.8, -2.4, 3.0, { armed: false })], {
        noFace: true,
        nodes: { 'c10.contract': {
          0: { cam: { face: 'nox', side: 0.4, view: 3.4, up: 1.05, pitch: 0.42, ease: 1.0 }, do: [{ who: 'nox', set: { gest: 'notes' } }] },
          1: { cam: { across: ['nox', 'aerys'], focus: ['nox', 'aerys'], view: 8, ang: -0.3, pitch: 0.46, ease: 1.2 }, do: [{ who: 'nox', set: { gest: 'cross' }, face: 'aerys' }, { who: 'aerys', set: { gest: 'laugh' } }] },
          2: { cam: { x: 2, y: -2, view: 9, ang: -0.3, pitch: 0.38, up: 1.0, ease: 1.6 }, do: [{ fade: [0.5, 2.0, '4,4,12'] }] },
        } },
      }),
      'c10.night': auto('nightcamp', [K(-2.6, 3.0, 0.2), EL(-1.6, 1.8, 0.3), BR(-3.8, 2.0, 0.1), AE(-2.0, 3.6, 0.3), E(-4.2, 2.8, 0.2), NX(7.0, -2.8, 3.0, { hidden: true, armed: true }), { id: 'creature', key: 'nightCreature', x: -1.2, y: 0.2, f: 1.6, hidden: true }], {
        nodes: { 'c10.night': {
          0: { cam: { x: -2, y: 2.4, view: 9, ang: -0.45, pitch: 0.5, ease: 1.2 }, do: [{ fade: [0.5, 1.0, '6,6,14'] }, { who: 'kael', state: 'down', hold: true }, { who: 'braxen', state: 'down', hold: true }, { who: 'aerys', state: 'down', hold: true }, { who: 'eloryn', state: 'down', hold: true }] },
          1: { cam: { x: -1.8, y: 0.0, view: 6, ang: -0.3, pitch: 0.34, up: 2.0, ease: 1.8 } },
          2: { cam: { focus: ['eloryn'], view: 4, ang: -0.3, pitch: 0.4, up: 0.8, ease: 0.4 }, do: [{ shake: 8 }, { who: 'eloryn', state: 'hurt', dur: 0.6, knock: [0, 0.4] }, { fade: [0.0, 0.2] }] },
          3: { do: [{ who: 'eloryn', say: '—AHH!' }] },
        } },
      }),
      'c10.after': auto('nightcamp', [K(-5.0, 1.0, 0.1), AE(-1.8, 1.0, 0.3), BR(-3.6, 3.0, 0.1), EL(-2.4, 2.6, 0.2), E(-5.4, 2.4, 0.1), NX(0.8, 0.8, 3.0, { armed: true }), { id: 'creature', key: 'nightCreature', x: 3.2, y: 1.0, f: 3.1 }], {
        nodes: { 'c10.after': {
          0: { cam: { focus: ['aerys', 'creature', 'nox'], view: 7, ang: -0.3, pitch: 0.42, ease: 0.5 }, do: [{ who: 'kael', state: 'down', hold: true }, { who: 'braxen', state: 'down', hold: true }, { who: 'eloryn', state: 'down', hold: true }, { who: 'aerys', state: 'down', hold: false }, { who: 'creature', state: 'idle' }, { who: 'creature', set: { stow: true } }] },
          1: { cam: { focus: ['nox', 'creature'], view: 5.6, ang: -0.3, pitch: 0.4, ease: 0.3 }, do: [{ who: 'nox', set: { stow: false, gest: null }, to: [2.3, 1.0], gait: 'dash', speed: 9 }, { at: 0.3, who: 'nox', attack: { wind: 0.1, active: 0.1, recover: 0.2, tele: false } }, { at: 0.5, who: 'nox', blink: [3.8, 0.2] }, { at: 0.5, shake: 6 }, { at: 0.7, who: 'nox', blink: [2.6, 1.8] }, { at: 0.9, who: 'creature', state: 'down', hold: true, knock: [0.6, 0] }, { at: 0.9, shake: 10 }, { at: 0.9, slow: [0.25, 0.8] }] },
          2: { cam: { face: 'aerys', side: 0.35, view: 3.2, up: 1.1, pitch: 0.42, ease: 0.9 }, do: [{ who: 'nox', to: [0.6, 1.0], speed: 0.8, face: 'aerys' }] },
          3: { do: [{ who: 'aerys', state: 'idle', face: 'nox' }] },
          4: { cam: { face: 'nox', side: -0.35, view: 3.0, up: 1.1, pitch: 0.42, ease: 0.8 }, do: [{ who: 'nox', to: [-0.4, 1.0], gait: 'back', speed: 1.2 }] },
          5: { do: [{ at: 0.5, who: 'nox', blink: [8, -3] }, { at: 0.6, who: 'nox', hide: true }] },
        } },
      }),
      'c10.dawn': auto('nightcamp', [K(-2.4, 1.6, 0.2, { gest: 'cross' }), AE(-3.6, 3.2, 0.1), BR(0.4, 2.6, 3.0), EL(-0.6, 2.4, 0.3), E(-4.8, 0.8, 0.2)], {
        nodes: { 'c10.dawn': {
          0: { cam: { focus: ['eloryn', 'braxen', 'kael'], view: 6, ang: -0.4, pitch: 0.46, ease: 1.2 }, do: [{ fade: [0.0, 0.5] }, { who: 'braxen', state: 'sit', hold: true }, { who: 'kael', state: 'sit' }, { who: 'eloryn', state: 'pickup', dur: 4 }, { who: 'aerys', state: 'sit' }, { at: 0.8, fx: { type: 'heal', unit: 'eloryn', target: 'braxen', amt: 0 } }] },
        } },
      }),
      'c10.thanks': auto('grassland', [AE(-3.2, 1.0, 0.1, { gest: null }), NX(5.0, -2.0, 3.1, { hidden: true, armed: false })], {
        nodes: { 'c10.thanks': {
          0: { cam: { face: 'aerys', side: 0.4, view: 3.8, up: 1.0, pitch: 0.42, ease: 1.2 }, do: [{ who: 'aerys', to: [-1.4, 1.0], speed: 0.9 }] },
          5: { cam: { x: 2.0, y: -1.0, view: 8, ang: -0.3, pitch: 0.42, ease: 0.4 }, do: [{ who: 'nox', show: true, blink: [2.6, 0.0] }, { who: 'aerys', face: 'nox' }, { who: 'nox', face: 'aerys' }] },
        } },
      }),
      'c10.angel': 'same',
    },
    defs: {},
    scenarios: {},
    looks: {},
  };
});
