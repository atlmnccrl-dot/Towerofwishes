/*
 * Tower of Wishes — The Road That Learns You (book chapters Ten and Eleven).
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
    id: 'c11',
    speakers: {},
    nodes(h) {
      const { B, N, X } = h;
      return {
        // ---- Chapter Ten: the road that learns you
        'c11.learn': {
          type: 'scene', chapter: 'c11', bg: 'road', next: 'c11.hands',
          lines: [
            X('Aerys returns to camp to find the others packing. Kael looks her over as she approaches, checking for blood first and explanations second.'),
            X('She offers nothing else. Braxen stops tying his pack. His attention has moved past her. Toward the treeline. A shape stands there. Not hidden. Not threatening. Simply present. Nox leans against a tree with his arms crossed. Kael’s hand tightens around his sword. Nox raises one hand slightly. Not surrender. Recognition.'),
            B('nox', 'Morning.'),
            B('braxen', 'Thought you didn’t do groups.'),
            B('nox', 'I don’t.'),
            B('nox', 'I do… roads.'),
            X('Aerys fails to hide her smile. Eiryn watches him for several seconds. No tension enters her posture. No curiosity either. Only acceptance of a decision she seems to have expected him to make eventually.'),
            B('eiryn', 'Then walk.'),
            X('Nox looks at her. For once, he has no clever answer. He pushes away from the tree and joins them. Not quite beside them. Not quite apart. That first day, he keeps several paces off to one side. Kael watches him from the corner of his eye until Nox finally speaks.'),
            B('nox', 'If you keep staring, I’ll cut your eyes clean out.'),
            B('kael', 'See? This is why people don’t invite you places.'),
          ],
        },
        'c11.hands': {
          type: 'scene', chapter: 'c11', bg: 'forest', next: 'c11.train',
          lines: [
            X('At camp that evening, Eloryn rewraps her hands. The skin across her fingers and palms has cracked from too much healing, too little rest, and too many days spent pretending both were manageable. Aerys kneels beside her.'),
            B('aerys', 'Does it hurt?'),
            B('eloryn', 'Only when I stop.'),
            X('She does it anyway. Across the fire, Nox sharpens one of his blades. The others laugh quietly about something Kael has said. Nox’s hand slows. Then stops. He listens. …Dangerous.'),
          ],
        },
        'c11.train': {
          type: 'scene', chapter: 'c11', bg: 'road', next: 'c11.stream',
          lines: [
            X('The road changes all of them in small ways. Kael begins training at dawn. He has always been strong. Strength has never been the problem. He swings as though every enemy needs to be convinced by force alone. His blade travels in heavy arcs that can break guards, armor, bone — and leave too much of him committed when they miss.'),
            X('Nox watches one morning with visible disappointment.'),
            B('nox', 'You swing like you’re angry at tomorrow.'),
            X('Kael changes his stance. The first attempt is worse. He misses, overcorrects, and stumbles. Nox enters the opening, removes the weapon from Kael’s hand, and puts a blade against his throat.'),
            B('nox', 'You lead with your heart.'),
            B('nox', 'Good.'),
            B('nox', 'Just don’t let it swing first.'),
            X('The next morning, Kael tries again. And the morning after that. Sometimes Nox corrects him with words. Usually with humiliation. Kael learns either way.'),
          ],
        },
        'c11.stream': {
          type: 'scene', chapter: 'c11', bg: 'forest', next: 'c11.lessons',
          lines: [
            X('Aerys and Nox develop habits of their own. At a stream, she crouches to refill waterskins and Nox appears beside her without warning. She does not jump anymore. She smiles instead.'),
            X('Another day, Aerys passes him bread without looking. Nox stares at it as though accepting food requires more commitment than killing someone. Eventually he takes it.'),
            B('nox', '…Thanks.'),
            X('One night, Aerys wakes and sees him standing beyond the firelight. Moonlight runs along the edge of his steel.'),
            B('aerys', 'You don’t sleep?'),
            B('nox', 'Not when I care.'),
            X('The words leave his mouth. Nox goes still. Aerys does too. He looks toward the trees as if an enemy might appear and rescue him from the conversation. None does. Aerys smiles into her cloak and lets him keep his dignity.'),
          ],
        },
        'c11.lessons': {
          type: 'scene', chapter: 'c11', bg: 'road', next: 'c11.frost',
          lines: [
            X('Eloryn teaches her different lessons. One afternoon, she sits with Aerys beside the road and shows her how to bind a wound correctly. Her hands guide Aerys’s around the cloth, tightening where pressure matters and loosening where circulation does.'),
            B('eloryn', 'You don’t heal with power.'),
            B('eloryn', 'You heal by staying.'),
            X('Later, while they walk, Eloryn watches the horizon.'),
            B('eloryn', 'I used to dream small.'),
            B('aerys', 'What changed?'),
            B('eloryn', 'People didn’t.'),
            X('Days accumulate. So does familiarity. Nox begins sitting closer to the fire. Then one evening no one notices when he sits with them rather than beyond them. Five silhouettes lean toward the same warmth. No one comments on it. That is how it becomes real.'),
          ],
        },

        // ---- Chapter Eleven: the Tower draws near
        'c11.frost': {
          type: 'scene', chapter: 'c11', bg: 'tower', next: 'c11.doors',
          lines: [
            X('The first frost appears beneath a gray afternoon sky. It should have melted. It does not. By the next day, pale ground stretches around the road in hard patches. Grass snaps beneath their boots. Their breath becomes visible even when the sun stands directly overhead.'),
            X('Then they find the bodies. Frozen climbers lie half buried in ice beside the road. The armor on some is so old that none of them recognizes the style. Metal has rusted inside the ice without the bodies ever being allowed to decay.'),
            X('The Tower fills more of the world with every mile. There is no longer any need to search the horizon for it. They walk in its shadow.'),
          ],
        },
        'c11.doors': {
          type: 'scene', chapter: 'c11', bg: 'tower', next: 'c12.doors',
          lines: [
            X('When the doors finally appear, even Kael stops. They are enormous. Carved stone rises higher than city walls, marked by scars left by weapons, weather, and people who came before them. Along the walls around the entrance, more climbers have been frozen where they died. Some are embedded upright in the ice. Faces remain twisted in the last expression they ever made.'),
            B('eloryn', '…They waited.'),
            X('No one asks what for. Nox steps forward. No shadow between him and the others now. No distance left to pretend he is only traveling the same road by coincidence. He stands with them.'),
            X('Kael approaches the doors. The others spread behind him instinctively. He places one palm against the stone. Cold burns into his skin immediately. Kael grimaces but does not pull away.'),
            X('For a moment, the Tower does nothing. Then something moves far inside it. A sound too deep to be a lock rolls through the stone. The doors open. Darkness waits beyond them.'),
            X('The road is over. The climb begins.'),
          ],
        },
      };
    },
    // Extra per-line beats, merged into the stage that plays each node (js/stages.js).
    beats: {
      'c11.learn': {
        6: { cam: { focus: ['aerys'], view: 3.4, ang: -0.3, pitch: 0.42, up: 0.8, ease: 0.8 }, do: [{ at: 1.2, cam: { focus: ['eiryn', 'nox'], view: 9, ang: -0.3, pitch: 0.42, ease: 1.0 } }, { at: 1.2, who: 'eiryn', face: 'nox' }] },
        8: { cam: { focus: ['nox', 'kael'], view: 8, ang: -0.3, pitch: 0.44, ease: 1.0 }, do: [{ who: 'nox', to: [-1.6, -0.8], speed: 0.9 }, { at: 2.4, who: 'kael', face: 'nox' }] },
      },
      'c11.train': {
        7: { cam: { focus: ['kael', 'nox'], view: 6, ang: -0.3, pitch: 0.46, ease: 1.0 }, do: [{ fade: [1, 0.4] }, { at: 0.5, fade: [0, 0.6] }, ...[1.0, 2.0, 3.0].flatMap((t, i) => [{ at: t, who: 'kael', attack: { wind: 0.25, active: 0.12, recover: 0.5, tele: false } }, { at: t + 0.2, who: 'nox', state: i === 1 ? 'dodge' : 'parry', dur: 0.4 }]), { at: 2.4, who: 'nox', attack: { wind: 0.1, active: 0.1, recover: 0.3, tele: false } }, { at: 2.5, who: 'kael', state: 'hurt', dur: 0.4 }] },
      },
      'c11.stream': {
        6: { cam: { focus: ['nox', 'aerys'], view: 4.6, ang: -0.3, pitch: 0.42, up: 0.7, ease: 0.9 }, do: [{ who: 'nox', face: [8, -4] }, { at: 1.2, who: 'aerys', face: [-6, 2] }] },
      },
      'c11.lessons': {
        7: { cam: { x: 0.6, y: 1.0, view: 7, ang: -0.3, pitch: 0.44, drift: 0.02, ease: 1.2 }, do: [{ fade: [1, 0.6] }, { at: 0.65, light: ['255,160,80', 0.14, 0.6] }, { at: 0.65, pfx: { name: 'campfire', x: 0.6, y: 1.0, z: 0.3, scale: 1.2, life: 10 } }, ...[['aerys', -0.6, 0.6], ['eloryn', -0.4, 1.8], ['kael', 1.8, 1.8], ['braxen', 0.6, 2.4], ['eiryn', 1.8, 0.4]].flatMap(([w, x, y]) => [{ at: 0.65, who: w, put: [x, y] }, { at: 0.66, who: w, state: 'sit', hold: true }, { at: 0.66, who: w, face: [0.6, 1.0] }]), { at: 0.65, who: 'nox', put: [4.0, -0.6] }, { at: 0.8, fade: [0.2, 1.0, '10,10,30'] }, { at: 2.0, who: 'nox', to: [1.0, -0.2], speed: 0.6 }, { at: 3.6, who: 'nox', state: 'sit', hold: true }, { at: 3.6, who: 'nox', face: [0.6, 1.0] }] },
      },
      'c11.frost': {
        1: { cam: { x: 5.4, y: -2.4, view: 6, ang: -0.3, pitch: 0.42, up: 0.6, ease: 1.2 }, do: [...[['kael', 3.6, -1.6], ['aerys', 2.6, -2.4], ['eloryn', 2.0, -1.0], ['braxen', 2.6, -0.2], ['eiryn', 1.4, -1.8], ['nox', 4.0, -0.4]].map(([w, x, y]) => ({ who: w, to: [x, y], speed: 0.9 })), { at: 2.2, who: 'aerys', face: [6, -2.8] }, { at: 2.4, who: 'kael', face: [6, -2.8] }] },
        2: { cam: { x: 2, y: -1, view: 12, ang: -0.3, pitch: 0.3, up: 2.0, ease: 1.6 }, do: [{ pfx: { name: 'snow', x: 2, y: -1, z: 3, scale: 3, life: 4 } }, ...['kael', 'aerys', 'eloryn', 'braxen', 'eiryn', 'nox'].map((w) => ({ who: w, face: [9, -4] }))] },
      },
      'c11.doors': {
        5: { cam: { x: 0, y: -2.4, view: 9, ang: -0.1, pitch: 0.4, up: 1.2, ease: 1.2 }, do: [...[['kael', 0.2, -4.6], ['aerys', -0.8, -4.2], ['eloryn', -1.6, -3.8], ['braxen', 0.8, -3.8], ['eiryn', -0.2, -3.6], ['nox', 1.4, -4.4]].map(([w, x, y], i) => ({ at: 0.15 * i, who: w, to: [x, y], speed: 0.9 })), { at: 2.4, fade: [1, 1.2] }] },
      },
    },
    stages: {
      'c11.learn': auto('grassland', [K(-3.0, 1.2, 0.1), AE(-4.4, 0.4, 0.1), EL(-5.2, 1.4, 0.1), BR(-4.0, 2.4, 0.1), E(-6.2, 0.6, 0.1), NX(5.4, -2.2, 3.1)], {
        nodes: { 'c11.learn': {
          0: { cam: { focus: ['kael', 'aerys', 'eloryn', 'braxen'], view: 8, ang: -0.45, pitch: 0.5, ease: 1.2 }, do: [{ who: 'braxen', set: { gest: 'cross' } }] },
          1: { cam: { focus: ['braxen', 'nox'], view: 9, ang: -0.35, pitch: 0.46, ease: 1.2 }, do: [{ who: 'braxen', face: 'nox', icon: '!' }, { who: 'kael', face: 'nox' }] },
          2: { cam: { face: 'nox', side: 0.3, view: 3.6, up: 1.05, pitch: 0.42, ease: 0.8 } },
          5: { do: [{ who: 'nox', to: [2.6, -0.8], speed: 0.8 }] },
          9: { cam: { focus: ['kael', 'nox', 'aerys'], view: 9, ang: -0.6, pitch: 0.48, ease: 1.2 }, do: [{ who: 'kael', to: [-1.0, 1.0], speed: 0.9 }, { who: 'aerys', to: [-2.4, 0.4], speed: 0.9 }, { who: 'eloryn', to: [-3.2, 1.4], speed: 0.9 }, { who: 'braxen', to: [-2.2, 2.4], speed: 0.9 }, { who: 'eiryn', to: [-4.2, 0.6], speed: 0.9 }, { who: 'nox', to: [2.0, -2.0], speed: 0.9 }] },
        } },
      }),
      'c11.hands': auto('nightcamp', [AE(-1.4, 1.6, 0.3), EL(-0.6, 2.6, 0.2), BR(-2.4, 3.2, 0.1), K(-3.6, 0.8, 0.4), E(-4.6, 2.0, 0.3), NX(4.4, -1.6, 3.1)], {
        nodes: { 'c11.hands': {
          0: { cam: { focus: ['aerys', 'eloryn'], view: 5, ang: -0.45, pitch: 0.46, ease: 1.2 }, do: [{ who: 'aerys', state: 'sit' }, { who: 'eloryn', state: 'sit' }, { who: 'braxen', state: 'sit' }, { who: 'kael', state: 'sit' }, { who: 'eloryn', set: { gest: 'notes' } }] },
          3: { cam: { face: 'nox', side: 0.3, view: 3.6, up: 1.0, pitch: 0.42, ease: 1.2 }, do: [{ who: 'nox', set: { gest: 'notes' } }, { at: 1.2, who: 'nox', icon: '…' }] },
        } },
      }),
      'c11.train': auto('grassland', [K(-1.2, 0.2, 0.0, { armed: true }), NX(1.8, 0.0, 3.14, { armed: true }), AE(-4.0, 2.4, 0.1), EL(-5.0, 1.4, 0.1), BR(-3.6, 3.4, 0.1), E(-6.0, 2.8, 0.1)], {
        armed: true, noFace: true, close: 3.4,
        nodes: { 'c11.train': {
          0: { cam: { focus: ['kael', 'nox'], view: 6.5, ang: -0.3, pitch: 0.46, ease: 1.2 }, do: [{ who: 'kael', set: { stow: false, gest: null }, face: [8, 0] }, { who: 'nox', set: { stow: false, gest: 'cross' }, face: 'kael' }, { at: 0.4, who: 'kael', attack: { wind: 0.45, active: 0.12, recover: 0.6, tele: false } }, { at: 2.0, who: 'kael', attack: { wind: 0.45, active: 0.12, recover: 0.6, tele: false } }] },
          1: { do: [{ at: 0.3, who: 'kael', attack: { wind: 0.4, active: 0.12, recover: 0.7, tele: false } }] },
          3: { cam: { focus: ['kael', 'nox'], view: 5.2, ang: -0.3, pitch: 0.44, ease: 0.6 }, do: [{ who: 'kael', face: 'nox' }, { at: 0.5, who: 'kael', attack: { wind: 0.3, active: 0.12, recover: 0.7, tele: false } }, { at: 0.8, who: 'kael', state: 'stagger', dur: 0.5 }, { at: 0.9, who: 'nox', blink: [0.2, 0.2] }, { at: 1.0, who: 'nox', face: 'kael' }, { at: 1.1, shake: 4 }] },
} },
      }),
      'c11.stream': auto('road', [AE(-3.6, 1.0, 0.0), NX(2.2, -2.0, 3.0, { hidden: true }), K(-5.0, 1.6, 0.1)], {
        nodes: { 'c11.stream': {
          0: { cam: { face: 'aerys', side: 0.4, view: 4.0, up: 1.0, pitch: 0.42, ease: 1.0 }, do: [{ who: 'aerys', state: 'pickup', dur: 2.0 }, { at: 1.4, who: 'nox', show: true, blink: [-2.6, 0.2] }, { at: 1.6, who: 'aerys', state: 'idle', face: 'nox' }] },
          1: { cam: { focus: ['aerys', 'nox'], view: 4.0, ang: -0.3, pitch: 0.44, ease: 0.8 }, do: [{ who: 'aerys', set: { gest: 'present' } }, { who: 'nox', face: 'aerys' }] },
          3: { cam: { x: -1.0, y: 0.8, view: 9, ang: -0.3, pitch: 0.4, up: 1.0, ease: 1.2 }, do: [{ fade: [0.45, 1.0, '10,12,28'] }, { who: 'aerys', state: 'sit' }, { who: 'nox', to: [3.0, -1.2], speed: 0.8 }] },
          4: { cam: { across: ['aerys', 'nox'], focus: ['aerys', 'nox'], view: 7, ang: -0.3, pitch: 0.44, ease: 1.2 } },
        } },
      }),
      'c11.lessons': auto('road', [AE(-2.4, 1.4, 0.1), EL(-3.6, 1.2, 0.1), K(2.6, 0.2, 0.1), BR(1.2, 1.2, 0.1), E(-0.2, 0.6, 0.1), NX(4.8, -1.8, 3.0)], {
        nodes: { 'c11.lessons': {
          0: { cam: { focus: ['aerys', 'eloryn'], view: 4.4, ang: -0.4, pitch: 0.46, ease: 1.2 }, do: [{ fade: [0, 0.5] }, { who: 'aerys', state: 'sit' }, { who: 'eloryn', state: 'sit' }] },
          3: { cam: { focus: ['aerys', 'eloryn'], view: 7, ang: -0.5, pitch: 0.46, ease: 1.2 }, do: [{ who: 'aerys', state: 'idle' }, { who: 'eloryn', state: 'idle' }, { who: 'eloryn', to: [4, 1.2], speed: 0.8 }, { who: 'aerys', to: [3, 0.4], speed: 0.8 }] },
          6: { cam: { x: 0.5, y: 1.4, view: 7, ang: -0.45, pitch: 0.5, ease: 1.6 }, do: [{ who: 'aerys', put: [-1.4, 1.2] }, { who: 'eloryn', put: [-2.4, 1.6] }, { who: 'kael', put: [-0.6, 0.0] }, { who: 'braxen', put: [-1.0, 2.2] }, { who: 'eiryn', put: [-3.0, 0.4] }, { who: 'nox', to: [-1.6, 0.2], speed: 0.6 }, { fade: [0.35, 1.6, '30,16,6'] }] },
        } },
      }),
      'c11.frost': auto('frosthall', [K(-4.0, 0.8, 0.1), AE(-5.2, 0.2, 0.1), EL(-6.0, 1.2, 0.1), BR(-5.0, 1.8, 0.1), E(-6.6, 0.4, 0.1), NX(-3.0, 2.0, 0.1)], {
        noFace: true,
        nodes: { 'c11.frost': {
          0: { cam: { focus: ['kael', 'aerys', 'eloryn', 'braxen', 'eiryn', 'nox'], view: 9, ang: -0.5, pitch: 0.5, drift: 0.02, ease: 1.4 }, do: [{ who: 'kael', to: [1.0, 0.8], speed: 0.8 }, { who: 'aerys', to: [-0.2, 0.2], speed: 0.8 }, { who: 'eloryn', to: [-1.0, 1.2], speed: 0.8 }, { who: 'braxen', to: [0.0, 1.8], speed: 0.8 }, { who: 'eiryn', to: [-1.6, 0.4], speed: 0.8 }, { who: 'nox', to: [0.6, 2.2], speed: 0.8 }] },
          1: { cam: { x: -5.8, y: 2.8, view: 5, ang: -0.3, pitch: 0.42, up: 0.8, ease: 1.4 } },
          2: { cam: { x: 0, y: -2, view: 10, ang: -0.3, pitch: 0.34, up: 2.5, ease: 1.8 } },
        } },
      }),
      'c11.doors': auto('frosthall', [K(1.0, 0.8, -1.6), AE(-0.2, 0.2, -1.6), EL(-1.0, 1.2, -1.6), BR(0.0, 1.8, -1.6), E(-1.6, 0.4, -1.6), NX(0.6, 2.2, -1.6)], {
        noFace: true,
        nodes: { 'c11.doors': {
          0: { cam: { x: 0, y: -4, view: 12, ang: 0.0, pitch: 0.34, up: 2.4, ease: 1.8 }, do: [{ who: 'kael', set: { stow: true } }] },
          1: { cam: { face: 'eloryn', side: 0.35, view: 3.6, up: 1.0, pitch: 0.42, ease: 0.9 } },
          2: { cam: { focus: ['nox', 'kael'], view: 7, ang: -0.1, pitch: 0.42, ease: 1.2 }, do: [{ who: 'nox', to: [0.2, 1.4], speed: 0.7 }] },
          3: { cam: { face: 'kael', side: 0.4, view: 3.2, up: 1.0, pitch: 0.4, ease: 1.2 }, do: [{ who: 'kael', to: [0.8, -1.6], speed: 0.7 }, { at: 1.6, who: 'kael', set: { gest: 'raise' } }, { at: 1.8, light: ['190,225,255', 0.4, 0.6] }] },
          4: { cam: { x: 0, y: -4, view: 9, ang: 0.0, pitch: 0.34, up: 2.0, ease: 1.4 }, do: [{ door: [1, 2.5] }, { rumble: [3, 2.5] }, { light: ['220,235,255', 0.5, 2.0] }] },
        } },
      }),
    },
    defs: {},
    scenarios: {},
    looks: {},
  };
});
