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
      const { B, N } = h;
      return {
        // ---- Chapter Two: the road beyond Ashgate
        'c6.road': {
          type: 'scene', chapter: 'c6', bg: 'road', next: 'c6.youngling',
          lines: [
            N('The road beyond Ashgate opens into grassland and broken stone. Old markers stand half buried along the path, their faces eaten smooth by weather.'),
            N('Kael walks ahead as though the road belongs to him, one hand never far from the hilt at his side. Every so often he glances back. Eiryn is always there. She never falls behind. She never hurries, either.'),
            B('kael', 'You ever travel before?'),
            B('eiryn', 'Enough.'),
            N('That answer earns him nothing useful. He frowns, waiting for the rest of it. There is no rest of it.'),
            B('kael', 'Hm.'),
            N('Later, when the wind strengthens, they stop beside the remains of a low stone wall. Kael coaxes a small fire into life and hands Eiryn bread, dried meat and water without asking whether she wants any of it. The gesture is so ordinary that she accepts it without comment.'),
            B('kael', 'You don’t look like you’ve slept outside much.'),
            B('eiryn', 'You’d be surprised.'),
            N('Another answer that is true and useless. They continue before the light can fade too far. The Tower remains ahead, pale and distant beneath the permanent cloud. It seems less like a destination than a fact of the world.'),
            B('kael', 'You headed that way?'),
            B('eiryn', 'Eventually.'),
            B('kael', 'People who go “eventually” toward that thing usually end up dead.'),
          ],
        },
        'c6.youngling': {
          type: 'scene', chapter: 'c6', bg: 'road', next: 'c6.mother',
          lines: [
            N('A shadow crosses the road. Kael stops so abruptly that his boot scrapes stone. His hand goes to his sword. Nothing moves overhead. Ahead, however, something enormous lies broken in the grass.'),
            N('The creature was built for the sky. Even dead, that much is obvious. Its wings are shredded against the ground, the membrane torn between long black bones. Scales have split along its ribs. One foreleg rests at an angle no living joint could hold.'),
            B('kael', 'This would’ve wiped a caravan.'),
            B('kael', 'You seen things like this before?'),
            B('eiryn', 'They weren’t always this low.'),
            B('kael', 'What does that mean?'),
            B('eiryn', 'Some things fell when the world did.'),
            B('kael', 'So what killed it?'),
            B('eiryn', 'It wasn’t killed. It failed to survive.'),
            B('kael', 'That’s the same thing.'),
            B('eiryn', 'This was only a youngling.'),
            B('kael', 'Yeah? Then I’d hate to see the mother.'),
            B('eiryn', '…You will.'),
            N('His smile disappears. They find the tracks less than an hour later: deep prints punched into wet earth beside the road, the spacing wrong, too long between impressions. Fresh water still seeps into their edges. Kael’s fingers close around his hilt.'),
          ],
        },
        'c6.mother': {
          type: 'scene', chapter: 'c6', bg: 'road', next: 'c6.fight',
          lines: [
            N('Eiryn walks past them. Then the grass ahead explodes.'),
            N('A figure bursts onto the road. Running. Stumbling. Bleeding. She is young. Pale hair has come loose around her face, and blood darkens one side of her clothes. There are no wings on her back, yet something about the way she moves makes each stride seem too light, as if gravity holds her only because she permits it.'),
            N('She looks behind herself. Panic changes her face. Then she sees Kael. For half a heartbeat she freezes.'),
            B('aerys', 'MOVE!'),
            N('The sky darkens. A shadow sweeps across all three of them, and the pressure in the air drops hard enough to flatten the grass. The mother comes through the clouds.'),
            N('The youngling had been enormous. This is something else entirely. Scar tissue crosses the creature’s hide in pale ridges. Its wings spread wide enough to throw the road into shadow. The head turns with a precision far too intelligent for an animal, and its eyes never leave the fleeing girl. It has not found them. It has been hunting her.'),
            N('Kael steps forward. There is no pause in which he decides to be brave. That is what Eiryn notices. He simply moves.'),
            N('The Skyreaver folds its wings and drops. The girl tries to change direction, but her injured leg fails beneath her. Kael draws. His sword is not elegant. It is heavy, broad, and meant to make commitment matter. He plants one foot and swings upward with everything his body can put behind the blade. Steel meets the diving creature with a sound like a struck bell. The creature’s head snaps sideways. One talon carves through the road where the girl’s spine had been a moment before.'),
            B('kael', 'Get behind me.'),
            N('The girl blinks. Then, without meaning to, she obeys. The Skyreaver wheels above them. Wind strikes the road. Kael lowers his center of gravity.'),
            B('kael', 'Can you fight?'),
            N('The girl pushes herself upright. Her hands tremble. A faint light gathers across her fingers. That answers him. Eiryn stands several paces away. Watching.'),
          ],
        },
        'c6.fight': {
          type: 'battle', chapter: 'c6', scenario: 'skyreaver', hearts: true, xp: 160, allyLevel: true,
          party: (st) => h.BOOK(st), win: 'c6.after',
          outro: 'A spear of light punches through the Skyreaver’s throat. It crashes, and stops moving.',
        },
        'c6.after': {
          type: 'scene', chapter: 'c6', bg: 'road', next: 'c6.why',
          lines: [
            N('The creature tries to beat its wings once more. Nothing answers correctly. It crashes. The impact shakes the road. One wing folds under its own weight with a wet break. Then it stops moving.'),
            N('Kael remains standing where the creature fell, chest rising hard beneath blood-marked armor. He lowers his sword slowly. Behind him, the girl stares. Not at the dead Skyreaver. At him.'),
            B('kael', 'You being chased for fun?'),
            N('The warmth vanishes beneath embarrassment. She looks at the corpse. Then at the sky, as though part of her still expects another shape to come through the clouds.'),
            B('aerys', 'I wasn’t supposed to be here.'),
            B('kael', 'Then why are you?'),
            B('aerys', 'I was flying.'),
            B('aerys', 'I tried to cut around the open land.'),
            B('kael', 'And?'),
            B('aerys', 'I took the wrong path.'),
            B('aerys', 'That thing saw me. And once they see you… they don’t stop.'),
          ],
        },
        'c6.why': {
          type: 'scene', chapter: 'c6', bg: 'road', next: 'c6.join',
          lines: [
            B('kael', 'Why were you flying alone?'),
            B('aerys', 'Because I left.'),
            B('aerys', 'I didn’t want to. But I had to.'),
            B('kael', 'Left what?'),
            B('aerys', 'Home.'),
            N('There are no tears in the answer. Only the exhausted honesty of someone who has repeated the fact to herself enough times that it no longer changes by saying it aloud. She touches two fingers to her throat, just above her pulse.'),
            B('aerys', 'They hunt me for my blood.'),
            N('Kael’s expression changes immediately. Not suspicion. Disgust. But none of it is directed at her.'),
            B('kael', 'Who’s “they”?'),
            B('aerys', 'People who smile while they talk about cutting you open.'),
            B('aerys', 'You stepped in anyway.'),
            N('He seems uncomfortable with the statement, as though he could understand being thanked for winning, but not for the choice that came before it.'),
            B('aerys', 'So… where are you two going?'),
            B('kael', 'Doesn’t matter. We’ll walk you somewhere safe. Then we’ll part ways.'),
          ],
        },
        'c6.join': {
          type: 'scene', chapter: 'c6', bg: 'road', next: 'c6.walk',
          lines: [
            N('He does not look at Eiryn when he says it. The girl does. Eiryn’s eyes are on the horizon. On the Tower.'),
            B('eiryn', 'We’re heading to the Tower.'),
            N('The girl stiffens. Not in awe. Recognition.'),
            B('kael', 'I didn’t say that.'),
            B('eiryn', 'You didn’t need to.'),
            B('aerys', '…That tower.'),
            B('kael', 'What about it?'),
            B('aerys', 'People say it grants a wish.'),
            B('kael', 'People say a lot of things.'),
            B('aerys', 'I know. But I’ve got nothing else. And I’m tired of running.'),
            B('kael', 'What would you wish for?'),
            B('aerys', 'To be… left alone.'),
            B('aerys', 'Or to be normal. Just… not worth hunting. I don’t want to be special anymore.'),
            B('aerys', 'Let me travel with you. Please.'),
            B('kael', 'No.'),
            B('aerys', 'Why?'),
            B('kael', 'Because you’re hurt. And because you’ll slow us down. Because the road is worse than that thing. And you don’t belong on it.'),
            B('aerys', 'You don’t get to decide what I belong on.'),
            B('aerys', 'I’m not asking you to carry me. I helped kill it. Not because I’m strong. Because I can try.'),
            N('That seems to frustrate him even more, perhaps because it is harder to argue with than pride. He looks at Eiryn. It is obvious what he wants from her. Help. Agreement. Eiryn studies the girl instead. Not her wounds. Not the fading light in her hands. The person beneath both.'),
            B('eiryn', 'If you want to come, then come.'),
            B('kael', 'You don’t know her.'),
            B('eiryn', 'Neither do you.'),
            B('aerys', 'I won’t steal. I won’t hurt you. And if I become a burden… I’ll leave.'),
            B('aerys', 'I just want to walk beside someone who still steps in.'),
            N('Kael stares at the road. Annoyed. Silent. But the words land. He sheathes his sword. That is the closest thing to permission she is going to receive.'),
          ],
        },
        'c6.walk': {
          type: 'scene', chapter: 'c6', bg: 'road', next: 'c6.fork',
          lines: [
            N('They begin walking again. Kael returns to the front, still positioning himself like a wall between danger and everyone behind him. The girl follows a step back, quieter now, watching him when she thinks he will not notice. Eiryn walks last.'),
            B('aerys', 'I’m Aerys.'),
            B('eiryn', 'Eiryn.'),
            B('kael', 'Kael.'),
            N('Three names on a road that held only one that morning. Ahead, the Tower waits beneath the clouds. Aerys looks at it with hope tangled tightly around fear.'),
            N('Some people chase wishes. Some chase safety. And some, Eiryn thinks, only want proof that there are still people in the world who will step between them and the thing trying to tear them apart.'),
          ],
        },

        // ---- Chapter Three: the last easy laugh
        'c6.camp': {
          type: 'scene', chapter: 'c6', bg: 'forest', next: 'c6.fire',
          lines: [
            N('By dusk, the broken hills have swallowed most of the sun. Long shadows stretch across the road, filling old cracks with black. The Tower remains visible far ahead, a darker shape cutting into the cloud belt.'),
            N('Kael slows for the first time that day. Not because he is tired. Because night changes the road. He points toward the remains of a low wall a short distance from the path.'),
            B('kael', 'We stop there.'),
            N('No one argues. Aerys hovers nearby, clearly uncertain whether joining them means she is permitted to help with anything yet. Eiryn simply chooses a place beside the wall and folds her cloak onto the ground with quiet care.'),
            N('Kael gathers kindling. He strikes the flint. A spark jumps, touches the dry grass, and dies. Aerys presses her lips together. Kael strikes again. The entire little pile collapses. A sound escapes her. Not quite a laugh. Close enough.'),
            B('kael', 'Don’t start.'),
            B('aerys', 'I didn’t say anything.'),
            B('kael', '…Sky people.'),
            N('That does it. Her smile escapes completely.'),
          ],
        },
        'c6.fire': {
          type: 'scene', chapter: 'c6', bg: 'forest', next: 'c6.worth',
          lines: [
            N('She kneels beside him, careful not to crowd him, and opens one palm. A small light appears above her skin. It is nothing like the spear she threw at the Skyreaver. This glow is gentle and contained, no brighter than a candle flame. Warmth touches the dry grass.'),
            B('aerys', 'Would this… offend your pride?'),
            N('Kael stares at the light. Then at her. For the first time since she met him, the corner of his mouth betrays him. Not quite a smile. Almost.'),
            B('kael', '…Fine.'),
            N('The fire catches immediately. Aerys says nothing about that. Her expression says enough.'),
            N('They settle around the flames as darkness closes over the road. Aerys sits nearest the warmth, and gradually the tension leaves her shoulders. It is the first time since she burst from the grass that she seems to remember she is allowed to be still. Eiryn sits slightly apart, and watches the flames longer than anyone else.'),
            N('Kael tears a piece of bread in half and holds one side toward Aerys. She takes it with both hands.'),
            B('aerys', 'Thank you.'),
            N('Kael nods as though the words have passed him unheard. They have not.'),
          ],
        },
        'c6.worth': {
          type: 'scene', chapter: 'c6', bg: 'forest', next: 'c6.laugh',
          lines: [
            B('aerys', 'I wasn’t lying earlier.'),
            B('aerys', 'About wanting to be normal.'),
            B('kael', 'Normal’s overrated.'),
            B('aerys', 'Easy for you.'),
            B('kael', 'What’s that supposed to mean?'),
            B('aerys', 'You walk down roads and people don’t… stare.'),
            N('Her fingers drift unconsciously to the side of her neck.'),
            B('aerys', 'They don’t think about what you’re worth.'),
            N('Kael’s jaw tightens. Aerys does not need to explain the kind of worth she means. Blood measured in coin. A body considered by usefulness. A person translated into what could be cut out of them. The fire cracks between them.'),
            B('eiryn', 'No one should be hunted.'),
            N('She has not raised her voice or looked up. She has said it as simply as she might have said the night was cold. That seems to surprise Aerys more than comfort would have.'),
          ],
        },
        'c6.laugh': {
          type: 'scene', chapter: 'c6', bg: 'forest', next: 'c6.sleep',
          lines: [
            N('Kael stares into the flames.'),
            B('kael', 'Before all this… knights mattered.'),
            B('kael', 'Now it’s beasts and ruins and people pretending they’re fine.'),
            B('aerys', 'You still act like you matter.'),
            B('kael', 'I do.'),
            B('aerys', 'That’s what’s funny.'),
            N('He huffs. Then, despite himself, laughs. It is only once. Short and uncontrolled, as though the sound escaped before he could stop it. Aerys laughs too. Hers is softer. Brighter.'),
            N('For a few seconds, the ruined road does not feel ruined. The Tower does not feel closer. No creature hunts the clouds. No one wants Aerys’s blood. No one is waiting for them in the dark.'),
            N('Eiryn watches the two of them. Her expression remains difficult to read. But it is not cold.'),
          ],
        },
        'c6.sleep': {
          type: 'scene', chapter: 'c6', bg: 'forest', next: 'c7.city',
          lines: [
            N('Hours later, the fire has collapsed into a low bed of red. The Tower still shows faintly through the dark, too large for night to erase completely. Aerys sits with her knees drawn near her chest and stares toward it.'),
            B('aerys', 'Do you think it really grants wishes?'),
            B('kael', 'No.'),
            B('aerys', 'I hope it does.'),
            B('kael', 'Why?'),
            B('aerys', 'So I can stop running.'),
            B('aerys', 'So people can stop looking at me like I’m a prize.'),
            N('Kael looks away. His fingers tighten around the cup in his hand. Eiryn stands. No ceremony. No attempt to solve what neither of them can solve beside a fire.'),
            B('eiryn', 'Sleep.'),
            N('Kael watches her for a moment. Something about Eiryn still unsettles him. A woman who does not fear the road. Who speaks of the old world as though she had known it. Who looks at monsters without surprise and the Tower without awe. But exhaustion wins. Kael lies down with his sword within reach. Aerys settles near the last warmth of the fire.'),
            N('Eiryn does not sleep. She sits with her back near the ruined wall and looks into the darkness beyond it. Listening. Not afraid. Simply awake.'),
            N('Some nights are quiet. Until they aren’t.'),
          ],
        },
      };
    },
    // Staged scenes: node id -> stage definition (js/render/stage.js) or 'same'.
    stages: {
      'c6.road': auto('grassland', [K(-6.2, 0.9, 0), E(-7.6, 0.2, 0)], {
        nodes: { 'c6.road': {
          0: { do: [{ who: 'kael', to: [-1.6, 0.9], speed: 1.1 }, { who: 'eiryn', to: [-3.0, 0.2], speed: 1.1 }] },
          1: { cam: { focus: ['kael', 'eiryn'], view: 7.5, ang: -0.9, pitch: 0.48, drift: 0.02, ease: 1.2 }, do: [{ who: 'kael', to: [1.2, 0.9], speed: 1.0 }, { who: 'eiryn', to: [-0.4, 0.3], speed: 1.0 }] },
          6: { cam: { x: -0.2, y: 0.5, view: 8, ang: -0.5, pitch: 0.5, ease: 1.4 }, do: [{ who: 'kael', to: [-1.6, 1.3], face: [0, 1.5], speed: 0.8 }, { who: 'kael', set: { gest: 'cross' } }, { who: 'eiryn', to: [-0.2, 1.0], speed: 0.6 }] },
        } },
      }),
      'c6.youngling': auto('grassland', [K(1.0, 0.6, 0.5), E(0.0, 1.4, 0.2)], {
        nodes: { 'c6.youngling': {
          0: { cam: { x: 3.4, y: -2.6, view: 8.5, ang: -0.3, pitch: 0.46, ease: 1.4 }, do: [{ who: 'kael', icon: '!' }, { who: 'kael', face: [3.4, -2.6] }] },
          1: { cam: { x: 3.4, y: -2.6, view: 5.2, ang: 0.4, pitch: 0.42, up: 0.5, drift: -0.03, ease: 1.4 } },
        } },
      }),
      'c6.mother': auto('grassland', [K(1.4, 1.0, 0.1), E(0.0, 1.6, 0.1), AE(-9.5, -1.0, 0.3, { hidden: true })], {
        nodes: { 'c6.mother': {
          1: { cam: { focus: ['kael', 'aerys'], view: 7, ang: -0.6, pitch: 0.46, ease: 0.5 }, do: [{ who: 'aerys', show: true, put: [-9.5, -1.0] }, { who: 'aerys', to: [-1.2, -0.8], gait: 'sprint', speed: 4.6, face: null }, { who: 'kael', face: 'aerys' }] },
          3: { do: [{ who: 'aerys', to: [-0.2, -0.6], speed: 0.4 }, { at: 0.3, who: 'kael', icon: '!' }, { at: 0.5, shake: 6 }] },
          5: { cam: { x: 0.8, y: 0.2, view: 11, ang: -0.4, pitch: 0.36, up: 0.4, ease: 1.2 }, do: [{ shake: 4 }, { who: 'kael', face: [2, -5] }, { who: 'aerys', face: [2, -5] }] },
          7: { cam: { focus: ['kael', 'aerys'], view: 6, ang: -0.4, pitch: 0.4, ease: 0.3 }, do: [{ who: 'kael', set: { stow: false, gest: null }, state: 'recover', dur: 0.6 }, { at: 0.2, shake: 8 }, { at: 0.2, who: 'aerys', knock: [-0.6, 0.5], state: 'hurt' }] },
          8: { do: [{ who: 'aerys', to: [-1.6, 1.0], speed: 1.2 }, { who: 'kael', to: [0.8, 0.8], face: [3, -3] }] },
        } },
      }),
      'c6.after': auto('grassland', [K(1.2, 0.8, -0.4, { armed: true }), E(-0.6, 1.6, -0.2), AE(-1.0, -0.4, 0.4)], {
        nodes: { 'c6.after': {
          0: { cam: { x: 3.4, y: -2.6, view: 6.5, ang: -0.3, pitch: 0.42, up: 0.4, ease: 1.2 }, do: [{ shake: 3 }, { who: 'kael', state: 'recover', dur: 1.2 }] },
          1: { cam: { across: ['aerys', 'kael'], side: -0.3, focus: ['aerys', 'kael'], view: 4.4, pitch: 0.42, up: 0.4, ease: 1.0 } },
        } },
      }),
      'c6.why': 'same',
      'c6.join': 'same',
      'c6.walk': auto('grassland', [K(-6, 0.7, 0), AE(-7.4, 0.2, 0), E(-8.4, 0.9, 0)], {
        noFace: true,
        nodes: { 'c6.walk': {
          0: { cam: { focus: ['kael', 'aerys', 'eiryn'], view: 8, ang: -0.8, pitch: 0.48, drift: 0.02, ease: 1.2 }, do: [{ who: 'kael', to: [3, 0.7], speed: 1.0 }, { who: 'aerys', to: [1.6, 0.2], speed: 1.0 }, { who: 'eiryn', to: [0.4, 0.9], speed: 1.0 }] },
        } },
      }),
      'c6.camp': auto('nightcamp', [K(-1.6, 2.2, 0.3), AE(-3.0, 2.8, 0.2), E(-3.8, 1.4, 0.4)], {
        nodes: { 'c6.camp': {
          1: { do: [{ who: 'kael', to: [-0.9, 1.6], speed: 1.0 }] },
          4: { cam: { focus: ['kael', 'aerys'], view: 4.4, ang: -0.5, pitch: 0.44, up: 0.4, ease: 0.8 }, do: [{ who: 'kael', state: 'pickup', dur: 1.2 }, { at: 1.0, who: 'aerys', icon: '…' }] },
        } },
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
