/*
 * Tower of Wishes — A Name on a Page (book chapters Six and Seven).
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
    id: 'c9',
    speakers: {},
    nodes(h) {
      const { B, N } = h;
      return {
        'c9.farms': {
          type: 'scene', chapter: 'c9', bg: 'hill', next: 'c9.thuds',
          lines: [
            N('Morning finds four travelers on the road. Mist clings to the grass, and the trade city has diminished behind them to a dirty smudge against the horizon. Eloryn walks with her satchel pulled close to her side, still learning the small inconveniences of travel that no infirmary shift prepared her for.'),
            B('aerys', 'Here.'),
            N('Aerys offers her a piece of dried fruit. Eloryn accepts it with both hands.'),
            B('eloryn', 'Thank you.'),
            N('Kael does not turn around.'),
            B('kael', 'Don’t spoil her.'),
            B('aerys', 'You’re just upset you didn’t think to bring fruit.'),
            B('kael', 'I brought a sword.'),
            N('Eloryn looks at him with complete seriousness.'),
            B('eloryn', 'I don’t think you can eat that.'),
            N('Kael stops walking. A short laugh escapes him before he can prevent it. Aerys and Eloryn exchange the same delighted look. They have gotten one.'),
            N('The humor does not survive the landscape. Fences appear snapped in half. Wells have collapsed into themselves. Fields stretch black across the lowlands as though fire passed over them and never allowed anything to grow again. A scarecrow hangs from a broken post ahead. It was not built to frighten birds.'),
            B('eloryn', 'Someone lived here.'),
            B('kael', 'Not anymore.'),
            N('Eiryn walks past the ruined farms with the stillness of someone who has seen too many versions of the same loss.'),
          ],
        },
        'c9.thuds': {
          type: 'scene', chapter: 'c9', bg: 'hill', next: 'c9.stranger',
          lines: [
            N('A thud rolls across the distance. Everyone stops. Then comes another.'),
            B('aerys', '…Do you hear that?'),
            N('Kael’s hand moves to his sword.'),
            B('kael', 'Stay behind me.'),
            N('They crest a low hill. Dead grass and broken farmland spread beneath them. Something shrieks. Eloryn goes pale. The sound is animal, but close enough to a human death cry to make instinct ignore the difference.'),
            N('They move downhill. Bodies appear first. Beasts lie scattered through the field, not cut down but dismantled. Ribs crushed inward. Limbs torn free. One creature has been driven so violently into the ground that dark earth has risen around its body like a crater.'),
            N('A single figure remains standing among them. Broad shoulders. Blood running heavily down one side. One arm looks wrong. Bone ridges shift beneath skin in shapes no human arm should hold.'),
            B('kael', 'Don’t move.'),
          ],
        },
        'c9.stranger': {
          type: 'scene', chapter: 'c9', bg: 'hill', next: 'c9.fight',
          lines: [
            N('The stranger turns slowly. His face is human. His eyes are not quite. Too sharp. Too alert despite the exhaustion dragging at the rest of him.'),
            B('braxen', '…Great.'),
            N('He raises both empty hands.'),
            B('braxen', 'I’m not in the mood.'),
            N('Aerys lifts a few inches from the ground without realizing it, light already gathering beneath her palms. Eloryn steps forward on instinct, sees the altered arm, and stops. Healer said injured. Survival said predator. Eiryn only watches.'),
            B('kael', 'What are you?'),
            B('braxen', 'Tired.'),
            B('kael', 'Answer.'),
            N('He looks away.'),
            B('braxen', 'You don’t want the answer.'),
            N('The altered arm flexes. Bone moves beneath the skin. Eloryn flinches. A rumble rolls through the field. The tall grass behind the stranger parts. Another pack emerges. These beasts are larger than the dead ones, drawn by the smell of blood and the certainty that something wounded waits at the center of it.'),
            B('kael', '…Behind you.'),
            N('The man closes his eyes. Only for a heartbeat. He looks tired of being offered choices that all end badly. Then he steps forward and places himself between the pack and the group.'),
            B('braxen', 'Fine.'),
          ],
        },
        'c9.fight': {
          type: 'battle', chapter: 'c9', scenario: 'beasts', hearts: true, xp: 180, allyLevel: true,
          party: (st) => h.BOOK(st), win: 'c9.after',
          outro: 'The last beast stops moving. The stranger’s altered hands are trembling now that there is nothing left to kill.',
        },
        'c9.after': {
          type: 'scene', chapter: 'c9', bg: 'hill', next: 'c9.name',
          lines: [
            N('When the last creature falls, Eloryn runs to him. Blood soaks his side. She presses both glowing hands against the wound.'),
            B('eloryn', 'Hold still.'),
            N('He braces himself and stares ahead as though being healed is somehow more uncomfortable than being torn open.'),
            B('braxen', '…Yeah. Sure.'),
            N('Kael stands over them, sword dripping. He looks at the stranger properly now.'),
            B('kael', 'You could’ve run.'),
            B('braxen', 'I run enough.'),
            N('Eiryn steps closer. The man’s monstrous hands are trembling now that there is nothing left to kill. She looks at them. Then at him.'),
            B('eiryn', 'You’re still choosing.'),
            N('Something in his face almost breaks. He swallows.'),
            B('braxen', 'If you’re here to kill me…'),
            B('braxen', '…do it now.'),
            N('Kael hesitates. The thing standing in front of him is altered. Dangerous. Strong enough to tear beasts apart with his hands. But it is not a beast. Kael lowers the point of his sword.'),
            B('kael', 'We’re heading toward the Tower.'),
          ],
        },
        'c9.name': {
          type: 'scene', chapter: 'c9', bg: 'hill', next: 'c9.nox',
          lines: [
            B('braxen', 'It’s not a road for someone alone.'),
            N('Aerys remains cautious, but there is kindness in her voice.'),
            B('aerys', 'You saved us.'),
            N('The man looks across the ruined farms.'),
            B('braxen', 'I don’t want your Tower.'),
            N('His gaze moves over dead grass and broken fences.'),
            B('braxen', 'I just… can’t stay.'),
            N('Eloryn finishes stabilizing his side.'),
            B('eloryn', 'Then don’t.'),
            N('He looks at her. Then slowly stands. His bare hands close into fists at his sides.'),
            B('braxen', '…If I walk with you…'),
            B('braxen', '…don’t put a chain on me.'),
            N('Kael sheathes his sword.'),
            B('kael', 'No chains.'),
            N('The stranger nods once.'),
            B('braxen', 'Braxen.'),
            N('Kael gives his own name. Aerys and Eloryn follow. Eiryn is last. Five people stand in a field of dead beasts beneath a clouded sky.'),
          ],
        },
        'c9.nox': {
          type: 'scene', chapter: 'c9', bg: 'hill', next: 'c9.steel',
          lines: [
            N('Braxen has barely finished agreeing to walk with them when the air changes. The five of them still stand among torn beasts and dead grass. Blood darkens the dirt. Wind moves through the field in long dry waves. Braxen exhales slowly, his body still carrying the tension of someone waiting for acceptance to be withdrawn.'),
            N('A thin sound comes from above. Not wings. Not wind. Cloth. A figure drops from the sky like a falling blade. Nox Kairen lands behind Braxen without a sound. Steel appears at Braxen’s throat before anyone can react.'),
            B('nox', 'Don’t care.'),
            N('Aerys gasps. Eloryn’s hands flare green-white. Braxen does not flinch. His jaw tightens, nothing more.'),
            N('Kael moves first. He crosses the distance in one violent step and drives the blunt end of his sword into Nox’s ribs. The impact forces the assassin away from Braxen. Nox slides through the dirt, boots cutting two shallow lines behind him. One hand goes to his side. Blood appears at the corner of his mouth. Then he straightens. Smiling.'),
            B('nox', 'Heh… thought we already had this conversation, big guy.'),
            N('Kael plants himself between Nox and the others.'),
            B('kael', 'Back off.'),
            B('nox', 'Or am I just having déjà vu?'),
            N('He disappears. Not moved. Disappeared. Kael’s eyes widen. A blade touches his throat from behind. Nox stands at his shoulder.'),
            B('nox', 'Last time, you helped me.'),
            N('Kael’s teeth clench.'),
            B('nox', 'Don’t get hurt getting in the way this time.'),
          ],
        },
        'c9.steel': {
          type: 'scene', chapter: 'c9', bg: 'hill', next: 'c9.page',
          lines: [
            N('The others move as one. Aerys rises into the air, light forming between her hands. There is fear in her face, but not panic. Eloryn steps forward with both palms glowing, already preparing for the wound she might have to close. Braxen raises his fists. Bone shifts beneath the altered skin of his arms with a low creak.'),
            N('Nox’s gaze moves quickly. Aerys. Eloryn. Braxen. Then Eiryn. She has not moved at all. Yet when Nox looks at her, the faint smile leaves his face. The air around Eiryn feels heavier than it did a moment before. No light. No visible magic. Just pressure that may exist only in instinct. Nox recalculates.'),
            B('nox', '…So that’s how it is.'),
            N('Kael speaks carefully with the blade still against his throat.'),
            B('kael', 'You’re here for him.'),
            N('Nox does not deny it.'),
            B('nox', 'Name on a page.'),
            N('His eyes shift toward Braxen.'),
            B('nox', 'They called him a monster.'),
            N('Braxen takes one step forward.'),
            B('braxen', 'Then do it.'),
            N('There is no anger in his voice. Almost relief.'),
            B('kael', 'Stop talking.'),
            N('Nox’s eyes narrow. Something about the answer pleases him.'),
            B('aerys', 'Please.'),
            N('Aerys’s voice cracks. The light in her hands trembles.'),
            B('aerys', 'He saved us.'),
            N('Nox glances at her.'),
            B('nox', 'Not my problem.'),
          ],
        },
        'c9.page': {
          type: 'scene', chapter: 'c9', bg: 'hill', next: 'c10.shadow',
          lines: [
            N('Eloryn steps closer despite the fear shaking through her arms.'),
            B('eloryn', 'If you cut him, you cut through us.'),
            N('Nox studies her as though the statement has offended his understanding of practical people.'),
            B('nox', '…Healers always talk like saints.'),
            N('Kael does something worse than trying to pull away from the blade. He moves toward it. Only a fraction. Enough for the edge to press into his skin.'),
            B('kael', 'You want him?'),
            N('Nox’s attention returns to him.'),
            B('kael', 'Then you go through me again.'),
            N('The memory of the Shadow City passes between them. Kael charging. Nox’s blade at his throat. A relic shard on the stones. A wrong judgment admitted without excuse. Nox exhales. Slowly. Then he removes the blade from Kael’s throat. Not surrender. Calculation.'),
            B('nox', '…Tch.'),
            N('He steps backward. One step. Then another. And the field seems to release a breath. No one lowers their guard. Especially not Braxen.'),
          ],
        },
      };
    },
    stages: {
      'c9.farms': auto('farmland', [K(-7.0, 1.0, 0.1), AE(-8.2, 0.4, 0.1), EL(-9.2, 1.2, 0.1), E(-10.0, 0.2, 0.1)], {
        noFace: true,
        nodes: { 'c9.farms': {
          0: { cam: { focus: ['kael', 'aerys', 'eloryn', 'eiryn'], view: 9, ang: -0.9, pitch: 0.48, drift: 0.02, ease: 1.4 }, do: [{ who: 'kael', to: [-2.0, 1.0], speed: 0.9 }, { who: 'aerys', to: [-3.2, 0.4], speed: 0.9 }, { who: 'eloryn', to: [-4.2, 1.2], speed: 0.9 }, { who: 'eiryn', to: [-5.0, 0.2], speed: 0.9 }] },
          10: { cam: { face: 'kael', side: 0.3, view: 3.6, up: 1.1, pitch: 0.42, ease: 0.6 }, do: [{ who: 'kael', icon: '…' }, { at: 0.5, who: 'kael', set: { gest: 'laugh' } }] },
          11: { cam: { x: 3.0, y: 1.2, view: 9, ang: -0.3, pitch: 0.42, up: 0.8, ease: 1.6 } },
          12: { cam: { x: 6.6, y: 2.2, view: 5.5, ang: 0.3, pitch: 0.4, up: 0.9, ease: 1.2 } },
        } },
      }),
      'c9.thuds': auto('farmland', [K(-6.0, 1.4, 0.2), AE(-7.0, 0.6, 0.2), EL(-7.8, 1.6, 0.2), E(-8.6, 0.8, 0.2), BR(4.8, 0.0, 3.4, { hidden: true })], {
        noFace: true,
        nodes: { 'c9.thuds': {
          0: { cam: { focus: ['kael', 'aerys', 'eloryn', 'eiryn'], view: 8, ang: -0.6, pitch: 0.46, ease: 1.0 }, do: [{ shake: 3 }, { at: 0.6, shake: 3 }] },
          2: { do: [{ who: 'kael', set: { stow: false, gest: null }, face: [8, 0] }, { who: 'kael', to: [-4.6, 1.2], speed: 0.8 }] },
          4: { cam: { focus: ['kael', 'aerys', 'eloryn'], view: 11, ang: -0.3, pitch: 0.4, up: 0.6, drift: 0.02, ease: 1.8 }, do: [{ who: 'kael', to: [-2.6, 1.0], speed: 0.8 }, { who: 'aerys', to: [-3.8, 0.4], speed: 0.8 }, { who: 'eloryn', to: [-4.6, 1.4], speed: 0.8 }, { who: 'eiryn', to: [-5.6, 0.6], speed: 0.8 }] },
          6: { cam: { focus: ['braxen'], dx: -1, view: 5.5, ang: -0.3, pitch: 0.4, up: 0.8, ease: 1.2 }, do: [{ who: 'braxen', show: true }, { who: 'braxen', set: { stow: true, gest: null } }] },
          7: { cam: { across: ['kael', 'braxen'], focus: ['kael', 'braxen'], view: 8, ang: -0.4, pitch: 0.44, ease: 1.0 }, do: [{ who: 'kael', to: [-0.6, 0.8], speed: 0.9 }] },
        } },
      }),
      'c9.stranger': auto('farmland', [K(-0.8, 1.0, 0.1, { armed: true }), AE(-2.4, 0.2, 0.1), EL(-3.2, 1.4, 0.1), E(-3.8, 0.6, 0.1), BR(4.0, 0.2, 3.1)], {
        nodes: { 'c9.stranger': {
          0: { cam: { focus: ['braxen', 'kael'], view: 6, ang: -0.4, pitch: 0.42, ease: 0.9 }, do: [{ who: 'kael', set: { stow: false, gest: null } }, { who: 'aerys', set: { stow: false } }] },
          9: { cam: { face: 'braxen', side: 0.3, view: 3.4, up: 1.1, pitch: 0.42, ease: 0.8 }, do: [{ shake: 4 }, { at: 0.6, shake: 4 }] },
          11: { cam: { focus: ['braxen', 'kael'], view: 8, ang: -0.3, pitch: 0.44, ease: 1.2 }, do: [{ who: 'braxen', to: [1.4, 0.4], speed: 0.8, face: [8, 0] }] },
        } },
      }),
      'c9.after': auto('farmland', [K(-0.2, 1.4, 0.1), AE(-2.0, 0.2, 0.1), EL(1.2, 0.2, 3.4), E(-3.0, 1.4, 0.1), BR(2.0, 0.0, 2.9)], {
        nodes: { 'c9.after': {
          0: { cam: { focus: ['eloryn', 'braxen'], view: 4.6, ang: -0.3, pitch: 0.44, up: 0.4, ease: 0.9 }, do: [{ who: 'braxen', state: 'sit', hold: true }, { who: 'eloryn', state: 'pickup', dur: 4 }, { at: 0.8, fx: { type: 'heal', unit: 'eloryn', target: 'braxen', amt: 0 } }, { at: 0.8, light: ['150,230,200', 0.2, 0.7] }] },
          5: { do: [{ who: 'kael', set: { stow: false, gest: null }, to: [0.6, 1.2], speed: 0.7 }] },
        } },
      }),
      'c9.name': 'same',
      'c9.nox': auto('farmland', [K(-1.0, 1.2, 0.1, { armed: true }), AE(-2.6, 0.4, 0.1), EL(-3.2, 1.6, 0.1), E(-4.2, 0.6, 0.1), BR(1.6, 0.4, 3.1), NX(1.0, -3.5, 3.1, { hidden: true, armed: true })], {
        nodes: { 'c9.nox': {
          1: { cam: { focus: ['braxen', 'nox'], view: 6, ang: -0.3, pitch: 0.4, up: 0.6, ease: 0.5 }, do: [{ who: 'nox', show: true, put: [1.0, -4.0] }, { who: 'nox', set: { stow: false, gest: null }, to: [2.3, 0.4], gait: 'dash', speed: 8, face: 'braxen' }, { at: 0.4, shake: 5 }, { at: 0.4, who: 'braxen', icon: '!' }] },
          2: { cam: { face: 'nox', side: 0.3, view: 3.2, up: 1.1, pitch: 0.42, ease: 0.5 } },
          3: { cam: { focus: ['kael', 'nox'], view: 6, ang: -0.3, pitch: 0.42, ease: 0.3, cut: true }, do: [{ who: 'kael', set: { stow: false }, to: [1.2, 0.8], gait: 'dash', speed: 7 }, { at: 0.3, who: 'kael', attack: { wind: 0.1, active: 0.1, recover: 0.5, tele: false } }, { at: 0.4, who: 'nox', knock: [-1.2, 0.0], state: 'stagger', dur: 0.8 }, { at: 0.4, shake: 8 }, { at: 0.4, slow: [0.3, 0.6] }] },
          5: { cam: { face: 'nox', side: -0.3, view: 3.0, up: 1.1, pitch: 0.42, ease: 0.7 } },
          8: { cam: { focus: ['kael', 'nox'], view: 4.6, ang: -0.2, pitch: 0.42, ease: 0.3, cut: true }, do: [{ who: 'nox', blink: [0.0, 1.5] }, { who: 'nox', face: 'kael' }, { shake: 4 }] },
        } },
      }),
      'c9.steel': 'same',
      'c9.page': 'same',
    },
    defs: {},
    scenarios: {},
    looks: {},
  };
});
