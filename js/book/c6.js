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
  const PI = Math.PI;
  // A scene staged from its own dialogue (js/render/stage.js `auto`): the cast stands
  // on a real arena, the camera cuts to whoever speaks.
  const auto = (arena, cast, a) => ({ arena, cast, auto: Object.assign({}, a) });
  const K = (x, y, f, o) => Object.assign({ id: 'kael', key: 'kael', x, y, f }, o);
  const E = (x, y, f, o) => Object.assign({ id: 'eiryn', key: 'eirynAsh', x, y, f }, o);
  const AE = (x, y, f, o) => Object.assign({ id: 'aerys', key: 'aerys', x, y, f }, o);

  return {
    id: 'c6',
    speakers: {},
    nodes(h) {
      const { B, N, X } = h;
      return {
        // ---- Chapter Two: the road beyond Ashgate
        'c6.road': {
          type: 'scene', chapter: 'c6', bg: 'road', next: 'c6.youngling',
          lines: [
            X('The road beyond Ashgate opens into grassland and broken stone. Old markers stand half buried along the path, their faces eaten smooth by weather.'),
            X('Kael walks ahead as though the road belongs to him, one hand never far from the hilt at his side. Every so often he glances back. Eiryn is always there. She never falls behind. She never hurries, either.'),
            X('Later, when the wind strengthens, they stop beside the remains of a low stone wall. Kael coaxes a small fire into life and hands Eiryn bread, dried meat and water without asking whether she wants any of it. The gesture is so ordinary that she accepts it without comment.'),
            B('kael', 'You headed that way?'),
            B('eiryn', 'Eventually.'),
            B('kael', 'People who go “eventually” toward that thing usually end up dead.'),
          ],
        },
        'c6.youngling': {
          type: 'scene', chapter: 'c6', bg: 'road', next: 'c6.mother',
          lines: [
            X('A shadow crosses the road. Kael stops so abruptly that his boot scrapes stone. His hand goes to his sword. Nothing moves overhead. Ahead, however, something enormous lies broken in the grass.'),
            X('The creature was built for the sky. Even dead, that much is obvious. Its wings are shredded against the ground, the membrane torn between long black bones. Scales have split along its ribs. One foreleg rests at an angle no living joint could hold.'),
            B('kael', 'This would’ve wiped a caravan.'),
            B('eiryn', 'This was only a youngling.'),
            B('kael', 'Then I’d hate to see the mother.'),
            B('eiryn', '…You will.'),
            X('His smile disappears. They find the tracks less than an hour later: deep prints punched into wet earth beside the road, the spacing wrong, too long between impressions. Fresh water still seeps into their edges. Kael’s fingers close around his hilt.'),
          ],
        },
        'c6.mother': {
          type: 'scene', chapter: 'c6', bg: 'road', next: 'c6.fight',
          lines: [
            X('Eiryn walks past them. Then the grass ahead explodes.'),
            X('A figure bursts onto the road. Running. Stumbling. Bleeding. She is young. Pale hair has come loose around her face, and blood darkens one side of her clothes. There are no wings on her back, yet something about the way she moves makes each stride seem too light, as if gravity holds her only because she permits it.'),
            B('aerys', 'MOVE!'),
            X('The sky darkens. A shadow sweeps across all three of them, and the pressure in the air drops hard enough to flatten the grass. The mother comes through the clouds.'),
            X('The youngling had been enormous. This is something else entirely. Scar tissue crosses the creature’s hide in pale ridges. Its wings spread wide enough to throw the road into shadow. The head turns with a precision far too intelligent for an animal, and its eyes never leave the fleeing girl. It has not found them. It has been hunting her.'),
            X('The Skyreaver folds its wings and drops. The girl tries to change direction, but her injured leg fails beneath her. Kael draws. His sword is not elegant. It is heavy, broad, and meant to make commitment matter. He plants one foot and swings upward with everything his body can put behind the blade. Steel meets the diving creature with a sound like a struck bell. The creature’s head snaps sideways. One talon carves through the road where the girl’s spine had been a moment before.'),
            B('kael', 'Get behind me.'),
            B('kael', 'Can you fight?'),
            X('The girl pushes herself upright. Her hands tremble. A faint light gathers across her fingers. That answers him. Eiryn stands several paces away. Watching.'),
          ],
        },
        'c6.fight': {
          type: 'battle', chapter: 'c6', scenario: 'skyreaver', wounds: true, xp: 160, allyLevel: true,
          party: (st) => h.BOOK(st), win: 'c6.after',
          outro: 'A spear of light punches through the Skyreaver’s throat. It crashes, and stops moving.',
        },
        'c6.after': {
          type: 'scene', chapter: 'c6', bg: 'road', next: 'c6.why',
          lines: [
            X('The creature tries to beat its wings once more. Nothing answers correctly. It crashes. The impact shakes the road. One wing folds under its own weight with a wet break. Then it stops moving.'),
            X('Kael remains standing where the creature fell, chest rising hard beneath blood-marked armor. He lowers his sword slowly. Behind him, the girl stares. Not at the dead Skyreaver. At him.'),
            B('kael', 'You being chased for fun?'),
            B('aerys', 'That thing saw me. And once they see you… they don’t stop.'),
          ],
        },
        'c6.why': {
          type: 'scene', chapter: 'c6', bg: 'road', next: 'c6.join',
          lines: [
            B('kael', 'Why were you flying alone?'),
            B('aerys', 'They hunt me for my blood.'),
            B('aerys', 'People who smile while they talk about cutting you open.'),
            B('kael', 'We’ll walk you somewhere safe. Then we’ll part ways.'),
          ],
        },
        'c6.join': {
          type: 'scene', chapter: 'c6', bg: 'road', next: 'c6.walk',
          lines: [
            B('eiryn', 'We’re heading to the Tower.'),
            B('aerys', 'Let me travel with you. Please.'),
            B('kael', 'No.'),
            B('eiryn', 'If you want to come, then come.'),
            B('aerys', 'I just want to walk beside someone who still steps in.'),
            X('Kael stares at the road. Annoyed. Silent. But the words land. He sheathes his sword. That is the closest thing to permission she is going to receive.'),
          ],
        },
        'c6.walk': {
          type: 'scene', chapter: 'c6', bg: 'road', next: 'c6.fork',
          lines: [
            X('They begin walking again. Kael returns to the front, still positioning himself like a wall between danger and everyone behind him. The girl follows a step back, quieter now, watching him when she thinks he will not notice. Eiryn walks last.'),
            B('aerys', 'I’m Aerys.'),
            B('eiryn', 'Eiryn.'),
            B('kael', 'Kael.'),
            X('Three names on a road that held only one that morning. Ahead, the Tower waits beneath the clouds. Aerys looks at it with hope tangled tightly around fear.'),
          ],
        },

        // ---- Chapter Three: the last easy laugh
        'c6.camp': {
          type: 'scene', chapter: 'c6', bg: 'forest', next: 'c6.fire',
          lines: [
            X('By dusk, the broken hills have swallowed most of the sun. Long shadows stretch across the road, filling old cracks with black. The Tower remains visible far ahead, a darker shape cutting into the cloud belt.'),
            X('Kael slows for the first time that day. Not because he is tired. Because night changes the road. He points toward the remains of a low wall a short distance from the path.'),
            X('Kael gathers kindling. He strikes the flint. A spark jumps, touches the dry grass, and dies. Aerys presses her lips together. Kael strikes again. The entire little pile collapses. A sound escapes her. Not quite a laugh. Close enough.'),
            B('kael', 'Don’t start.'),
            B('aerys', 'I didn’t say anything.'),
            B('kael', '…Sky people.'),
            X('That does it. Her smile escapes completely.'),
          ],
        },
        'c6.fire': {
          type: 'scene', chapter: 'c6', bg: 'forest', next: 'c6.worth',
          lines: [
            X('She kneels beside him, careful not to crowd him, and opens one palm. A small light appears above her skin. It is nothing like the spear she threw at the Skyreaver. This glow is gentle and contained, no brighter than a candle flame. Warmth touches the dry grass.'),
            B('aerys', 'Would this… offend your pride?'),
            B('kael', '…Fine.'),
            X('The fire catches immediately. Aerys says nothing about that. Her expression says enough.'),
          ],
        },
        'c6.worth': {
          type: 'scene', chapter: 'c6', bg: 'forest', next: 'c6.laugh',
          lines: [
            B('aerys', 'I wasn’t lying earlier.'),
            B('aerys', 'About wanting to be normal.'),
            B('kael', 'Normal’s overrated.'),
            B('eiryn', 'No one should be hunted.'),
          ],
        },
        'c6.laugh': {
          type: 'scene', chapter: 'c6', bg: 'forest', next: 'c6.sleep',
          lines: [
            B('aerys', 'You still act like you matter.'),
            B('kael', 'I do.'),
            B('aerys', 'That’s what’s funny.'),
            X('He huffs. Then, despite himself, laughs. It is only once. Short and uncontrolled, as though the sound escaped before he could stop it. Aerys laughs too. Hers is softer. Brighter.'),
          ],
        },
        'c6.sleep': {
          type: 'scene', chapter: 'c6', bg: 'forest', next: 'c7.city',
          lines: [
            X('Hours later, the fire has collapsed into a low bed of red. The Tower still shows faintly through the dark, too large for night to erase completely. Aerys sits with her knees drawn near her chest and stares toward it.'),
            B('aerys', 'Do you think it really grants wishes?'),
            B('kael', 'No.'),
            B('aerys', 'I hope it does.'),
            B('eiryn', 'Sleep.'),
            X('Eiryn does not sleep. She sits with her back near the ruined wall and looks into the darkness beyond it. Listening. Not afraid. Simply awake.'),
            X('Some nights are quiet. Until they aren’t.'),
          ],
        },
      };
    },
    // Staged scenes: node id -> stage definition (js/render/stage.js) or 'same'.
    stages: {
      'c6.road': auto('grassland', [K(-6.2, 0.9, 0), E(-7.6, 0.2, 0)], {
        nodes: { 'c6.road': {
          0: { do: [{ who: 'kael', to: [-1.6, 0.9], speed: 1.1 }, { who: 'eiryn', to: [-3.0, 0.2], speed: 1.1 }] },
          1: { cam: { focus: ['kael', 'eiryn'], view: 7.5, ang: -0.9, pitch: 0.48, drift: 0.02, ease: 1.2 }, do: [{ who: 'kael', to: [1.2, 0.9], speed: 1.0 }, { who: 'eiryn', to: [-0.4, 0.3], speed: 1.0 }, { at: 1.6, who: 'kael', face: 'eiryn' }, { at: 2.4, who: 'kael', face: 0 }] },
          2: { cam: { x: -0.6, y: 1.2, view: 6, ang: -0.5, pitch: 0.46, ease: 1.4 }, do: [{ who: 'kael', to: [-1.6, 1.3], speed: 0.9 }, { who: 'eiryn', to: [-0.2, 1.0], speed: 0.6 }, { at: 1.6, who: 'kael', face: [-0.9, 2.0] }, { at: 1.8, who: 'kael', state: 'pickup', dur: 1.2 }, { at: 2.4, pfx: [{ name: 'fire_puff', x: -0.9, y: 2.0, scale: 1.2 }, { name: 'campfire', x: -0.9, y: 2.0, z: 0.3, scale: 1.2, life: 30 }] }, { at: 3.2, who: 'kael', face: 'eiryn' }, { at: 3.3, who: 'kael', set: { gest: 'present' } }, { at: 4.4, who: 'kael', set: { gest: 'cross' } }] },
        } },
      }),
      'c6.youngling': Object.assign(auto('grassland', [K(1.0, 0.6, 0.5), E(0.0, 1.4, 0.2), { id: 'young', key: 'skyreaver', x: 4.4, y: -2.8, f: 2.4 }], {
        noFace: true,
        nodes: { 'c6.youngling': {
          0: { cam: { x: 3.4, y: -1.6, view: 9, ang: -0.3, pitch: 0.46, ease: 1.4 }, do: [{ shake: 2 }, { who: 'kael', icon: '!' }, { who: 'kael', face: [4.4, -2.8] }, { at: 0.4, who: 'kael', set: { stow: false, gest: null } }] },
          1: { cam: { focus: ['young'], view: 6, ang: 0.4, pitch: 0.42, up: 0.5, drift: -0.03, ease: 1.4 }, do: [{ who: 'kael', to: [2.4, -0.8], speed: 0.8 }, { who: 'eiryn', to: [2.0, -1.8], speed: 0.8 }, { at: 1.6, who: 'eiryn', face: 'young' }] },
          6: { cam: { x: 6.6, y: -0.8, view: 6, ang: -0.3, pitch: 0.4, up: 0.4, ease: 1.2 }, do: [{ who: 'kael', to: [5.4, -0.6], speed: 1.0 }, { pfx: [[6.0, -0.9], [7.2, -0.6], [8.4, -0.3]].map(([x, y], i) => ({ name: 'dust_kick', x, y, scale: 1.4, ground: true, delay: 0.4 + i * 0.2 })) }, { at: 1.6, who: 'kael', state: 'pickup', dur: 1.2 }, { at: 3.0, who: 'kael', face: [9, -2] }] },
        } },
      }), { setup: [{ who: 'young', state: 'down', hold: true }] }),
      'c6.mother': auto('grassland', [K(1.4, 1.0, 0.1), E(0.0, 1.6, 0.1), AE(-9.5, -1.0, 0.3, { hidden: true }), { id: 'sky', key: 'skyreaver', x: 6.4, y: -3.0, f: 3.4, hidden: true }], {
        nodes: { 'c6.mother': {
          0: { cam: { focus: ['kael', 'eiryn'], dx: -2, view: 8, ang: -0.5, pitch: 0.46, ease: 1.0 }, do: [{ who: 'eiryn', to: [2.6, 1.2], speed: 0.9 }, { at: 1.4, pfx: [{ name: 'dust_cloud', x: -6, y: -1.2, scale: 2.4 }, { name: 'leaves', x: -6, y: -1.2, z: 0.6, scale: 2, life: 1.4 }] }, { at: 1.4, shake: 4 }, { at: 1.5, who: 'kael', face: [-6, -1] }, { at: 1.5, who: 'eiryn', face: [-6, -1] }] },
          1: { cam: { focus: ['kael', 'aerys'], view: 7, ang: -0.6, pitch: 0.46, ease: 0.5 }, do: [{ who: 'aerys', show: true, put: [-9.5, -1.0] }, { who: 'aerys', to: [-1.2, -0.8], gait: 'sprint', speed: 4.6, face: null }, { at: 1.0, who: 'aerys', state: 'stagger', dur: 0.4 }, { who: 'kael', face: 'aerys' }] },
          2: { do: [{ who: 'aerys', to: [-0.2, -0.6], speed: 0.4 }, { at: 0.3, who: 'kael', icon: '!' }, { at: 0.5, shake: 6 }] },
          3: { cam: { x: 2.4, y: -1.6, view: 11, ang: -0.4, pitch: 0.34, up: 0.8, ease: 1.0 }, do: [{ fade: [0.35, 1.0, '0,0,12'] }, { pfx: { name: 'wind_gust', x: 0, y: 0, z: 1, scale: 3 } }, { pfx: { name: 'leaves', x: 0, y: 0, z: 1, scale: 2.6, life: 2 } }, { shake: 3 }, { at: 1.2, who: 'sky', show: true }, { at: 1.2, who: 'sky', drop: [7, 1.2] }, { at: 2.4, shake: 7 }, { at: 2.4, pfx: { name: 'dust_cloud', x: 6.4, y: -3.0, scale: 3 } }] },
          4: { cam: { x: 3.0, y: -1.2, view: 11, ang: -0.4, pitch: 0.36, up: 0.6, ease: 1.2 }, do: [{ fade: [0.15, 1.2] }, { shake: 4 }, { who: 'sky', face: 'aerys' }, { who: 'kael', face: 'sky' }, { who: 'aerys', face: 'sky' }] },
          5: { cam: { focus: ['kael', 'aerys', 'sky'], view: 9, ang: -0.4, pitch: 0.4, ease: 0.3 }, do: [{ who: 'sky', to: [0.8, -0.8], gait: 'dash', speed: 9 }, { who: 'aerys', state: 'stagger', dur: 0.6 }, { at: 0.2, who: 'kael', set: { stow: false, gest: null } }, { at: 0.3, who: 'kael', attack: { wind: 0.2, active: 0.1, recover: 0.5, tele: false } }, { at: 0.55, pfx: { name: 'hit_crit', x: 1.0, y: -0.2, z: 1.6, scale: 2.6 } }, { at: 0.55, shake: 10 }, { at: 0.55, slow: [0.35, 0.6] }, { at: 0.6, who: 'sky', state: 'stagger', dur: 0.8, knock: [3.6, -1.6] }, { at: 0.6, who: 'aerys', knock: [-0.6, 0.5], state: 'hurt' }] },
          6: { do: [{ who: 'aerys', to: [-1.6, 1.0], speed: 1.2 }, { who: 'kael', to: [0.8, 0.8], face: 'sky' }, { who: 'sky', to: [6.0, -2.6], speed: 2.4, face: 'kael' }] },
          8: { cam: { focus: ['aerys', 'kael'], view: 5, ang: -0.4, pitch: 0.42, up: 0.6, ease: 0.8 }, do: [{ who: 'aerys', state: 'idle', hold: true }, { at: 0.6, who: 'aerys', pfx: { name: 'charge_up', z: 0.9, scale: 1, life: 1.6, follow: true, add: true } }, { at: 1.8, cam: { focus: ['eiryn'], view: 4.6, ang: -0.4, pitch: 0.42, up: 0.6, ease: 1.0 } }, { at: 1.8, who: 'eiryn', face: 'sky' }] },
        } },
      }),
      'c6.after': auto('grassland', [K(1.2, 0.8, -0.4, { armed: true }), E(-0.6, 1.6, -0.2), AE(-1.0, -0.4, 0.4), { id: 'sky', key: 'skyreaver', x: 6.8, y: -3.4, f: 2.6 }], {
        nodes: {
          'c6.after': {
            0: { cam: { x: 5.0, y: -2.4, view: 9, ang: -0.3, pitch: 0.42, up: 0.4, ease: 1.2 }, do: [{ who: 'sky', state: 'stagger', dur: 0.6 }, { at: 0.6, who: 'sky', drop: [1.6, 0.5] }, { at: 1.1, who: 'sky', state: 'down', hold: true }, { at: 1.1, shake: 9 }, { at: 1.1, pfx: { name: 'dust_cloud', x: 6.8, y: -3.4, scale: 3 } }, { who: 'kael', state: 'recover', dur: 1.2 }] },
            1: { cam: { across: ['aerys', 'kael'], side: -0.3, focus: ['aerys', 'kael'], view: 4.6, pitch: 0.42, up: 0.4, ease: 1.0 }, do: [{ who: 'kael', set: { gest: null } }, { at: 0.6, who: 'aerys', face: 'kael' }] },
          },
          'c6.join': {
            5: { cam: { focus: ['kael'], view: 3.6, ang: -0.3, pitch: 0.42, up: 0.8, ease: 1.0 }, do: [{ who: 'kael', face: [8, 0] }, { at: 1.4, who: 'kael', set: { stow: true } }, { at: 2.0, who: 'aerys', face: 'kael' }] },
          },
        },
      }),
      'c6.why': 'same',
      'c6.join': 'same',
      'c6.walk': auto('grassland', [K(-6, 0.7, 0), AE(-7.4, 0.2, 0), E(-8.4, 0.9, 0)], {
        noFace: true,
        nodes: { 'c6.walk': {
          0: { cam: { focus: ['kael', 'aerys', 'eiryn'], view: 8, ang: -0.8, pitch: 0.48, drift: 0.02, ease: 1.2 }, do: [{ who: 'kael', to: [0, 0.7], speed: 1.0 }, { who: 'aerys', to: [-1.4, 0.2], speed: 1.0 }, { who: 'eiryn', to: [-2.6, 0.9], speed: 1.0 }, { at: 2.0, who: 'aerys', face: 'kael' }, { at: 3.4, who: 'aerys', face: 0 }] },
          4: { cam: { behind: 'aerys', side: 0.25, view: 7, pitch: 0.44, up: 0.8, ease: 1.2 }, do: [{ who: 'kael', to: [3.0, 0.7], speed: 0.9 }, { who: 'aerys', to: [1.6, 0.2], speed: 0.9 }, { who: 'eiryn', to: [0.4, 0.9], speed: 0.9 }, { at: 2.6, who: 'aerys', face: [12, -6] }] },
        } },
      }),
      'c6.camp': auto('nightcamp', [K(-5.6, 2.0, 0.3), AE(-7.0, 2.6, 0.2), E(-7.8, 1.2, 0.4)], {
        nodes: {
          'c6.camp': {
            0: { cam: { x: -2.4, y: 1.6, view: 10, ang: -0.3, pitch: 0.44, drift: 0.015, ease: 1.6 }, do: [{ who: 'kael', to: [-2.6, 2.0], speed: 0.9 }, { who: 'aerys', to: [-4.0, 2.6], speed: 0.9 }, { who: 'eiryn', to: [-4.8, 1.2], speed: 0.9 }] },
            1: { cam: { focus: ['kael'], view: 5, ang: -0.4, pitch: 0.44, up: 0.6, ease: 1.0 }, do: [{ who: 'kael', set: { gest: 'point' } }, { who: 'kael', face: [-0.3, 1.4] }, { at: 1.2, who: 'kael', set: { gest: null } }, { at: 1.2, who: 'kael', to: [-0.9, 1.6], speed: 1.0 }] },
            2: { cam: { focus: ['kael', 'aerys'], view: 4.4, ang: -0.5, pitch: 0.44, up: 0.4, ease: 0.8 }, do: [{ who: 'aerys', to: [-2.2, 2.0], speed: 0.9 }, { who: 'kael', state: 'pickup', hold: true }, { at: 0.8, pfx: { name: 'small_pop', x: -0.4, y: 1.4, z: 0.2, scale: 1 } }, { at: 1.8, pfx: { name: 'smoke_puff', x: -0.4, y: 1.4, z: 0.2, scale: 1 } }, { at: 2.0, who: 'aerys', icon: '…' }] },
            6: { cam: { focus: ['aerys'], view: 3.4, ang: -0.4, pitch: 0.42, up: 0.8, ease: 0.8 } },
          },
          'c6.fire': {
            0: { cam: { focus: ['kael', 'aerys'], view: 3.8, ang: -0.5, pitch: 0.44, up: 0.4, ease: 0.9 }, do: [{ who: 'aerys', to: [-1.6, 1.1], speed: 0.8, face: [-0.4, 1.4] }, { at: 1.0, who: 'aerys', state: 'pickup', hold: true }, { at: 1.3, pfx: { name: 'item_glow', x: -1.2, y: 1.2, z: 0.7, scale: 0.8, life: 2.4, add: true } }, { at: 1.3, light: ['255,220,150', 0.1, 1.0] }] },
            3: { cam: { focus: ['kael', 'aerys'], view: 4.4, ang: -0.5, pitch: 0.44, up: 0.4, ease: 0.9 }, do: [{ pfx: [{ name: 'fire_burst', x: -0.4, y: 1.4, z: 0.2, scale: 1.2, add: true }, { name: 'campfire', x: -0.4, y: 1.4, z: 0.3, scale: 1.2, life: 90 }] }, { light: ['255,170,90', 0.16, 1.0] }, { at: 1.2, who: 'kael', face: 'aerys' }] },
          },
          'c6.laugh': {
            3: { cam: { focus: ['kael', 'aerys'], view: 4, ang: -0.5, pitch: 0.44, up: 0.5, ease: 1.0 }, do: [{ who: 'kael', face: 'aerys' }, { who: 'aerys', face: 'kael' }] },
          },
          'c6.sleep': {
            0: { cam: { x: -1.6, y: 1.4, view: 8, ang: -0.3, pitch: 0.44, ease: 1.2 }, do: [{ fade: [0.8, 0.6] }, { at: 0.7, light: ['255,120,60', 0.06, 0.4] }, { at: 0.7, who: 'aerys', state: 'sit', hold: true }, { at: 0.7, who: 'kael', state: 'sit', hold: true }, { at: 0.7, who: 'aerys', face: [9, -4] }, { at: 0.8, fade: [0, 1.0] }] },
            5: { cam: { focus: ['eiryn'], view: 4.4, ang: -0.3, pitch: 0.42, up: 0.6, ease: 1.2 }, do: [{ who: 'eiryn', to: [-5.4, 0.6], speed: 0.6 }, { at: 2.0, who: 'eiryn', face: [-9, 0] }] },
            6: { cam: { x: -6, y: 0, view: 9, ang: -0.3, pitch: 0.42, push: -0.15, ease: 1.6 }, do: [{ at: 2.4, fade: [1, 1.4] }] },
          },
        },
      }),
      'c6.fire': 'same',
      'c6.worth': 'same',
      'c6.laugh': 'same',
      'c6.sleep': 'same',
    },
    // Extra fighter definitions and scenarios merged into the sim (js/sim.js).
    defs: {},
    scenarios: {},
    // Extra looks merged into js/render/fighters.js LOOK.
    looks: {},
  };
});
