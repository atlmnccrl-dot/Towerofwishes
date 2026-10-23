/*
 * Tower of Wishes — Floor Two: Calamity (book chapters Thirteen, Fourteen and Fifteen).
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
  const CAL = (x, y, f, o) => Object.assign({ id: 'calamity', key: 'calamity', x, y, f }, o);

  return {
    id: 'c13',
    speakers: {},
    nodes(h) {
      const { B, N, X } = h;
      return {
        // ---- Chapter Thirteen: between floors
        'c13.enter': {
          type: 'scene', chapter: 'c13', bg: 'summit', next: 'c13.stairs',
          lines: [
            X('The shockwave finishes rolling through the hall. Then there is silence. Real silence this time. The mist is gone. Ice fragments and fractured stone mark the places where the knights stood. The corridors that separated them seem to reconnect as though they never moved at all.'),
            X('Kael stumbles into the open space. His eyes search first for the others.'),
            B('kael', 'Eiryn.'),
            X('He does not shout the name. There is no panic in it. Only concern stripped down to something more honest. She stands where her corridor meets the hall. Unmarked. Still. Kael crosses the distance and catches her by both shoulders, checking her almost reflexively.'),
            B('kael', 'You hit?'),
            B('eiryn', 'No.'),
            X('Flat. Honest. No reassurance attached. Aerys comes running from another passage. One sleeve is frozen stiff. Her breath catches as she nearly loses her footing. Eiryn catches her wrist without looking. Braxen limps in from the opposite side. Frostbite traces his chest and neck in pale angry patterns. One arm barely responds.'),
            X('Eloryn arrives last. Blood has dried dark along her side. Her altered hands shake now that there is no enemy left to ignore them for. She does not scan the room. She goes directly to Braxen.'),
            B('eloryn', 'Sit. Don’t argue.'),
            X('Braxen winces but sits. Green-white light forms weakly beneath Eloryn’s hands as she works over his arm. It flickers against the residue of the Tower’s cold.'),
            X('Eloryn does not answer. Her jaw tightens and the light strengthens by force. A shadow shifts beside a pillar. Nox steps into view. He is upright. Barely. One hand remains against the stone for support. Aerys notices immediately.'),
            B('nox', 'Later.'),
            X('There is no pride in the statement. Just confirmation. Kael looks at him more closely. Frost has begun creeping along Nox’s shoulder. A tremor moves through the arm he is trying to keep still.'),
            B('kael', 'You look like hell.'),
            B('nox', 'Yeah.'),
            X('Eloryn waits for more. None comes. It almost never does. The floor trembles beneath them. Everyone goes still.'),
          ],
        },
        'c13.stairs': {
          type: 'scene', chapter: 'c13', bg: 'summit', next: 'c13.climb',
          lines: [
            X('A deep grinding sound moves through the hall. Stone splits open at the center. A staircase descends from above. Spiraling stone. Clean. No frost. No mist. It stops just above the floor and waits.'),
            B('braxen', 'Good. I’m not doing that again.'),
            B('kael', 'It learned.'),
            X('The words change the mood immediately. Not survived. Learned. Eloryn finishes stabilizing Braxen. The glow vanishes from her hands the moment she stops. She sways. Aerys catches her.'),
            X('Kael looks at all of them. Injured. Shaken. Standing.'),
            B('kael', 'We turn back now—'),
            X('His eyes move to the sealed entrance behind them.'),
            B('kael', '—this place still wins.'),
            X('Braxen forces himself upright.'),
            X('Nox nods once. That is all. Kael bends and picks up the broken handle and stub of his sword. It is barely a weapon anymore. He carries it anyway. They step onto the staircase together. Stone hums beneath their boots. When the last of them leaves the hall, the floor below seals shut.'),
          ],
        },
        'c13.climb': {
          type: 'scene', chapter: 'c13', bg: 'summit', next: 'c13.corridor',
          lines: [
            X('The stairs climb into darkness. No railing. No windows. Only stone spiraling upward and a faint vibration underfoot. Kael tests his grip on the broken sword. His fingers still tremble from cold damage. Nox walks slightly ahead, outwardly controlled, but his shoulder twitches each time the lingering frost bites deeper. They round one spiral. Then another. Then another. The stairs do not end.'),
            X('Aerys makes a sound that almost becomes laughter. Eloryn climbs with one hand pressed against her side. The blood there has dried. The pain has not. Her fingers shake when she flexes them. She looks at Aerys.'),
            X('Kael slows until he is walking beside Eloryn. He does not announce the decision.'),
            B('kael', '…You should’ve told me you were hit.'),
            B('eloryn', 'You were busy not dying.'),
            X('She has not said anything yet. Hours pass. Their breathing echoes around the staircase until it sounds as though they are climbing through the inside of something alive. One hour. Then another.'),
            B('braxen', 'If the wish is real, mine’s a chair.'),
            B('aerys', '…A chair?'),
            B('braxen', 'A good one.'),
            X('Even Nox’s mouth twitches at that. Eiryn climbs without visible fatigue. Eyes forward. Always forward. Kael watches her for several turns of the staircase as though a question is collecting behind his teeth. He never asks it.'),
            X('Then the hum beneath their feet changes.'),
            X('The first sign of heat does not touch their skin. It enters their lungs. Eloryn coughs. The air tastes of mineral and ash.'),
            X('They round one final spiral. A doorway opens without sound. Blinding light pours through it.'),
          ],
        },

        // ---- Chapter Fourteen: Calamity
        'c13.corridor': {
          type: 'scene', chapter: 'c13', bg: 'summit', next: 'c13.taunt',
          lines: [
            X('The light beyond the doorway belongs to two different worlds. They step into a corridor so long its far end disappears. On the left, an endless waterfall thunders down the wall. White water strikes stone with constant pressure, throwing mist across the floor. On the right, lava moves in heavy orange-red sheets. It descends more slowly than the water, thick enough to resemble curtains of molten metal. The floor between them has been carved with shallow channels. Some are wet. Others are blackened by heat so many times that the stone has become glassy.'),
            X('A silhouette hovers at the center of the corridor. It resolves slowly as they approach. Angelic in shape. Wrong in every detail. Wing-like structures surround her, not feathers but distortions made from pressure and heat. Her face might once have belonged in a holy painting if not for the smile. The smile ruins everything.'),
            X('She tilts her head at the battered climbers as though someone has finally delivered pets she had been promised.'),
            X('Her eyes travel across them one by one. Not counting. Measuring. The smile widens when she sees their injuries.'),
            B('calamity', 'You crawled all this way… just to stand here.'),
          ],
        },
        'c13.taunt': {
          type: 'scene', chapter: 'c13', bg: 'summit', next: 'c13.fight',
          lines: [
            X('Eiryn watches her. No answer. No step forward. The waterfall kicks. A mass of water compresses into something smaller than a fist and launches with the violence of a gunshot. The lava wall answers at the same instant. A molten spear tears across the corridor. Both attacks cross the space too quickly for anyone else to move. Eiryn takes one step. Her hand lifts. No chant. No flare.'),
            B('eiryn', 'Pressure.'),
            X('The water bullet collapses inward as though struck by an invisible fist. It detonates sideways, carving the floor with a violent spray. The lava spear buckles in midair, folds into itself, and bursts into burning steam that dies before touching them. Calamity blinks. Then she laughs softly. Delighted.'),
            X('Her eyes sharpen.'),
            B('calamity', 'That’s not supposed to happen.'),
            X('She floats closer by inches. Kael steps in front of the others with the broken stump of his sword raised as though the missing blade does not matter.'),
            B('kael', 'She’s stronger than every knight we just faced—combined.'),
            X('Braxen spits blood-tinted saliva onto the stone and nods. Aerys locks her eyes on Calamity and tries not to show fear. Nox moves first. His body lowers. Shadow folds. He vanishes and reappears closer. Again. Closer. Again. He chains distance like a predator crossing stepping stones only he can see. Calamity watches as though she is allowing him to demonstrate something. The waterfall fires. Not at where Nox is. Where he will be.'),
            B('calamity', 'Fast.'),
            B('calamity', 'Not fast enough.'),
          ],
        },
        'c13.fight': {
          type: 'battle', chapter: 'c13', scenario: 'calamity', wounds: true, xp: 300, allyLevel: true,
          party: (st) => h.BOOK(st), win: 'c13.climax1', grant: ['calamitySword'],
          outro: 'Calamity falls. Water and lava pull inward over what is left of her.',
        },
        'c13.climax1': {
          type: 'scene', chapter: 'c13', bg: 'summit', next: 'c13.climax2',
          lines: [
            X('Aerys launches into the air. Light gathers in her palm. Calamity’s eyes flick upward. The air above Aerys ignites. Molten rain begins to build in vertical sheets. Aerys sees it and dives with none of her usual grace, choosing ugly survival over burning alive in the air.'),
            X('Kael and Braxen charge from the water side while Calamity’s attention seems divided. She does not look at them. Two fingers lift. A slab of moving ocean erupts from the waterfall. Kael and Braxen disappear beneath it. Eloryn moves immediately. She touches Kael’s ribs as he surfaces — just enough healing to keep impact damage from stealing his breath. Then Braxen’s stiff arm. She never stops moving. Never gives Calamity a still target.'),
            X('Nox inhales. Blue-violet pressure flickers around him. One Step — A Thousand Wounds. The aura cracks. Died. Time does not change. Nothing happens. Disgust at himself crosses his face.'),
            B('nox', '…Not now.'),
            X('Calamity sees it. Her grin becomes sharper. She flicks one hand lazily. A burst of flame snaps toward Nox with almost insulting casualness. He shadow-steps aside too late for perfection. The edge of his cloak catches fire. Aerys reaches him as he lands. Her hands hover, shaking, trying to help without crowding him. Calamity floats closer. Her expression becomes sweet.'),
            X('Aerys looks up.'),
            B('calamity', 'I can’t imagine watching the love of your life burn like that.'),
            X('Nox goes still. Aerys’s face flushes and tightens at once. Calamity smiles wider.'),
            B('calamity', 'Don’t worry. I’ll burn you too.'),
            X('Eiryn’s pupils tighten. The corridor disappears from her face. Not anger. Memory. Her hand lifts. Calamity hits the wall. The air itself seems to compress around her and throw her sideways like a meteor. Stone fractures in a spiderweb around the impact. Blood leaves Calamity’s mouth. Real blood. Dark against pale skin. For half a second she stares forward in confusion. She can bleed.'),
            X('Then rage arrives.'),
            X('The waterfall roars louder. The lava brightens. Calamity wipes blood from her mouth with the back of one hand and looks only at Eiryn.'),
            B('calamity', '…You.'),
          ],
        },
        'c13.climax2': {
          type: 'scene', chapter: 'c13', bg: 'summit', next: 'c13.climax3',
          lines: [
            X('The game ends in her expression. She raises both hands. The waterfall compresses into a spiraling lance denser than the first attack. The lava wall forms a wide molten cleaver-wave aligned directly with Eiryn’s chest. Eiryn does not flinch. Her hand rises.'),
            B('eiryn', 'Pressure.'),
            X('The water lance collapses and detonates into the floor. The molten wave folds, compresses, and shears apart into dead steam. The recoil snaps Calamity backward. Humiliated twice. She screams. Not words. A raw animal sound. Her power surges out of control. Water floods the corridor. At the same time, skyfire forms overhead. The battlefield splits into two violent lanes. Kael, Braxen, and Eloryn are shoved toward the water side, half-submerged and fighting to remain upright. Nox, Aerys, and Eiryn are driven into heat distortion where the air itself seems to roar.'),
            X('On the fire side, Calamity looks at Aerys. A cruel smile returns.'),
            B('calamity', 'Let’s see if you burn pretty.'),
            X('Skyfire thickens overhead. A guillotine forming. Aerys tries to raise her light. Her hands tremble. Heat and fear pin her more effectively than any chain. Nox calculates the fall. He is tired. Burned. His strongest technique has already failed once. And he knows exactly what will happen if he does nothing. The skyfire falls. Aerys cannot move fast enough.'),
            X('Nox forces the impossible. One Step — A Thousand Wounds. Time snaps wrong. Mist hangs in the air like frozen cloth. Nox crosses the distance in a blink, every movement looking like something inside him is tearing to make it possible. He arrives above Aerys as the fire strikes. His body becomes a roof over hers. Blades cross — not because steel can truly stop the flames, but because commitment needs somewhere to go. Skyfire engulfs him. His cloak ignites. Skin scorches. Nox clenches his teeth and holds.'),
            B('calamity', 'Aww. A hero.'),
            X('She presses harder. Flame thickens until Nox’s arms begin to shake. Aerys stares up at him. Her mouth opens. No words come.'),
            X('Eiryn watches him burn. The sound changes. For her alone, the roar of skyfire becomes another fire. Another street. One hundred and fifty years ago. Alric turning toward a falling wall of flame. Alric stepping in front of her. Alric covering her with his body. The present returns. Nox’s arms are failing. Aerys is still trapped beneath him. Eiryn raises her hand.'),
            B('eiryn', 'Negation.'),
          ],
        },
        'c13.climax3': {
          type: 'scene', chapter: 'c13', bg: 'summit', next: 'c13.sword',
          lines: [
            X('Magic dies. For roughly three seconds, everything within the radius becomes ordinary. The skyfire collapses in mid-fall. Water loses its supernatural force and recedes. The air goes dead still. Aerys’s light vanishes too. Eloryn’s healing extinguishes. Calamity’s wing-like pressure fails. She drops from the air like someone has cut strings above her.'),
            X('The cost strikes Eiryn immediately. Her raised fingers begin to shake. The skin across her hand and wrist changes — scarred, aged, veined as though time has bitten into it. Pain explodes behind her eyes. Her knees soften. She catches herself against the wall. She turns her head aside and vomits dark fluid onto the stone. Then she wipes her mouth with the back of the aged hand and stands again.'),
            X('Calamity hits the floor hard. She stares at her own hands as though they have betrayed her.'),
            B('calamity', 'What did you just do to me?'),
            X('The three seconds end. Power returns like a headache. Calamity’s eyes find Eiryn and nothing else.'),
            B('calamity', 'You stupid— I’m gonna kill you.'),
            X('That is the mistake. She stops watching everyone. Kael sees it from the reconnecting water lane. He looks at Braxen.'),
            B('kael', 'How far can you throw me?'),
            B('braxen', 'How far you want to go?'),
            X('Kael tightens his grip around the broken sword stump.'),
            B('kael', 'Do it.'),
            X('Braxen throws him. Kael leaves the ground like a spear. He spins through mist and corridor wind and immediately sees the problem. His angle is wrong.'),
            B('kael', 'NOX!'),
            X('Below, Nox kneels burned and breathing shallowly. Aerys hovers beside him, terrified to touch anything that might hurt more. Nox looks at her. You know I have to. Her eyes answer. Please don’t. His jaw tightens. Shadow folds. He vanishes. Nox appears in midair directly ahead of Kael. Kael twists with the momentum of Braxen’s throw and swings the broken sword — not at Nox’s body. At his feet. The blunt stump strikes both soles. Nox kicks off the contact at the same instant. The collision turns him into a projectile. He launches toward Calamity.'),
            X('She senses the movement and turns. Her hand comes up. Aerys fires. A concentrated beam of light strikes Calamity directly across the eyes. She flinches blind. Her attack goes wide. Nox enters her space. One blade opens both ankles. Calamity drops to her knees. Nox micro-steps around her line and cuts for the throat. Calamity snarls. A compressed water bullet fires point-blank. It punches through Nox’s shoulder. Blood sprays.'),
            X('Calamity rises. Rage has stripped the last beauty from her face. Kael drops into her line. The broken sword stump swings with everything he has. It cuts across her throat. Not through. Deep enough. Blood erupts. Calamity staggers backward with one hand clamped to her neck. She tries to speak. Only wet choking emerges. Then she screams anyway. Ragged. Inhuman. Nox, burned and bleeding through the hole in his shoulder, sees the opening. Shadow folds one final time. He appears beside Calamity in the air with his hips already turning. His kick lands against her head with everything left in him. Her head tears free. Her body remains standing for half a heartbeat. Then collapses.'),
            X('Nox hits the ground hard beside it. No explosion follows. No victory sound. The water and lava keep flowing. For several seconds, that is all anyone hears.'),
          ],
        },
        'c13.sword': {
          type: 'scene', chapter: 'c13', bg: 'summit', next: 'c13.ramp',
          lines: [
            X('Aerys runs to Nox. Eloryn breaks from the water lane and reaches him almost as quickly. She goes to Nox first. Not Kael. Not Braxen. Nox. Her glowing hands press over the wound in his shoulder.'),
            X('Nox hisses through his teeth. His eyes move past her toward Calamity’s remains.'),
            B('nox', '…Is that—'),
            X('Water and lava have begun pulling inward. They spiral around the headless corpse. Flesh and armor collapse into a molten slurry and compress violently until something new forms in the air. A sword. Hissing. Unstable.'),
            B('nox', '…a sword?'),
            X('Kael looks from the weapon to the rest of the group. Everyone is injured. Everyone looks exhausted enough to hate the question.'),
            B('kael', '…Is anyone else gonna take it?'),
            B('braxen', 'Grab it, Kael.'),
            B('braxen', 'We know you want to.'),
            X('Kael does not argue. He closes one hand around the grip. Steam erupts. The skin of his palm burns instantly. Kael clenches his jaw and does not let go. The blade shudders. Then stabilizes. Not obeying him. Accepting him.'),
            X('Behind him, Eiryn finally exhales. Her aged hands are still trembling. She takes one step and loses it. Eiryn drops to a knee and vomits violently onto the stone. No one comments. They have all seen enough of each other’s limits for dignity to become less important. Blood seeps from the cracked lines in Eiryn’s palms. She wipes her mouth.'),
            B('eiryn', '…That was too close.'),
            X('The corridor trembles. Measured. The waterfall slows. The lava dims. Both walls recede into stone. The arena is being dismantled around them. A long ramp extends from above with a deep resonant thrum. No stairs this time. No railings.'),
            B('nox', '…It wants us to walk.'),
            X('Eiryn looks into the dark beyond it.'),
            B('eiryn', 'It wants us calm.'),
          ],
        },

        // ---- Chapter Fifteen: the ascent ramp
        'c13.ramp': {
          type: 'scene', chapter: 'c13', bg: 'summit', next: 'c13.climb2',
          lines: [
            X('No one moves toward the ramp immediately. The heat is dying. Mist thins from the corridor. What remains after Calamity feels almost worse than the fight: a quiet large enough for everyone to notice what has happened to their bodies. Nox leans against the wall, blood dark across his shoulder. Aerys stands close to him with her hands hovering uselessly, still uncertain where she is allowed to touch. Eloryn looks at all of them once. Then exhales.'),
            B('eloryn', 'Nox, sit. Kael, don’t move. Braxen—lean. Now.'),
            X('No one argues. Not even Braxen. Nox lowers himself to the floor with less control than he wants anyone to see. Eloryn kneels in front of him. Faint green-white light is already gathering in her hands.'),
            X('Nox meets her eyes. For once, he does not make a joke. Eloryn presses both palms over the hole through his shoulder. Light pushes against torn muscle, blood loss, and the cold residue the Tower drove into him on the floor below. Nox’s jaw clenches.'),
            B('nox', '…That one’s deep.'),
            B('eloryn', 'I know.'),
            X('No apology. No false comfort. The light flickers. Eloryn’s hands shake. She forces it stronger.'),
            X('Her side trembles while she finishes sealing the worst of Nox’s wound. Nox reaches out and catches her wrist lightly.'),
            X('Eloryn looks at him. He lets her go.'),
            B('nox', 'Thank you.'),
            X('No sarcasm. No edge. Eloryn blinks. The words seem to surprise her more than the injury had. Then she stands too quickly. Her balance goes. Aerys catches her elbow.'),
            X('Eloryn gently pulls free.'),
            B('eloryn', 'One more.'),
          ],
        },
        'c13.climb2': {
          type: 'scene', chapter: 'c13', bg: 'summit', next: 'c14.hall',
          lines: [
            X('Braxen is seated against the wall with one arm rigid at his side. Eloryn kneels before him and touches the frost-webbed damage across his chest. Braxen watches her hands.'),
            B('braxen', '…You’re gonna break yourself.'),
            X('A faint smile appears on Eloryn’s face.'),
            B('eloryn', 'Then don’t make it pointless.'),
            X('Her healing moves more slowly now. Weaker. Braxen’s stiffness eases by degrees. He exhales.'),
            X('Eloryn stands again. Kael waits apart from them with the Sword of Calamity in his burned hand. Steam still rises faintly from his palm. When Eloryn approaches, he shakes his head.'),
            B('kael', 'Save it.'),
            B('eloryn', 'You’re bleeding.'),
            B('kael', 'So are you.'),
            X('For once, neither of them has an answer that wins. Kael lowers the sword enough to let her touch his ribs. Eloryn gives him the smallest amount of healing she can justify. Her light sputters. Dies. Pain finally reaches her face. She presses one hand against her own side. Blood pushes between her fingers. Aerys’s eyes widen.'),
            X('But she does not. Eloryn sits against the wall. Her breathing has become shallow. Her eyes close for half a second. The ramp hums. Waiting. Eiryn watches Eloryn.'),
            B('eiryn', 'We can’t stay.'),
            X('She pushes herself up again. This time Aerys stays close enough to catch her without asking. They begin climbing. Slowly. Unevenly. Their footsteps echo strangely along the ramp, as though the Tower has resumed listening. Eloryn walks in the middle of them. Not protected like something fragile. Not abandoned to prove she is strong. Simply with them.'),
            B('aerys', 'You didn’t have to push like that.'),
            B('eloryn', 'Yes. I did.'),
            X('Aerys does not argue. Ahead, another door waits at the top of the incline. Eloryn’s hand brushes her wounded side unconsciously. Just a little longer. They reach the top. Words have been carved deep into the stone. FLOOR 3. THE HALL OF OFFERING.'),
            X('Eloryn exhales. Relief and fear share the same breath. She looks back at the others.'),
            B('eloryn', '…Okay.'),
          ],
        },
      };
    },
    stages: (() => {
      const S = {
        'c13.enter': auto('frosthall', [K(1.0, 1.4, 0, { armed: false }), E(0.0, -0.4, 0), AE(-3.0, 3.0, 0), BR(-3.4, 0.6, 0), EL(-4.6, 1.8, 0), NX(3.6, 2.2, 0)], {
          nodes: { 'c13.enter': {
            0: { cam: { x: 0, y: 0.6, view: 12, ang: -0.3, pitch: 0.46, ease: 1.4 }, do: [{ fade: [0, 1.0, '226,238,250'] }, { who: 'braxen', state: 'sit', hold: true }, { who: 'nox', set: { gest: 'lean' } }] },
            2: { do: [{ who: 'kael', to: [0.8, 0.2], speed: 1.6 }, { who: 'kael', face: 'eiryn' }] },
            8: { do: [{ who: 'eloryn', to: [-2.4, 1.4], speed: 1.0 }] },
          } },
        }),
        'c13.stairs': auto('frosthall', [K(1.0, 1.4, 0), E(0.0, -0.4, 0), AE(-1.4, 2.2, 0), BR(-2.4, 0.6, 0), EL(-2.0, 1.4, 0), NX(2.4, 2.2, 0)], {
          nodes: { 'c13.stairs': {
            0: { cam: { x: 0, y: -2, view: 12, ang: -0.1, pitch: 0.36, up: 1.4, ease: 1.6 }, do: [{ rumble: [4, 2.0] }, { shake: 5 }] },
            2: { do: [{ who: 'kael', set: { gest: null } }] },
          } },
        }),
        'c13.climb': auto('frosthall', [K(-3.0, 0.8, 0), E(-5.0, 1.4, 0), AE(-4.0, 2.0, 0), BR(-5.6, 0.4, 0), EL(-4.4, 0.0, 0), NX(-1.6, 1.6, 0)], {
          noFace: true,
          nodes: { 'c13.climb': {
            0: { cam: { focus: ['kael', 'nox', 'aerys', 'braxen', 'eloryn', 'eiryn'], view: 10, ang: -0.9, pitch: 0.48, drift: 0.02, ease: 1.4 }, do: [{ who: 'kael', to: [4.0, 0.8], speed: 0.8 }, { who: 'nox', to: [5.4, 1.6], speed: 0.8 }, { who: 'aerys', to: [3.0, 2.0], speed: 0.8 }, { who: 'braxen', to: [2.4, 0.4], speed: 0.7 }, { who: 'eloryn', to: [3.4, 0.0], speed: 0.8 }, { who: 'eiryn', to: [3.0, 1.2], speed: 0.9 }] },
          } },
        }),
        'c13.corridor': auto('calamity', [K(-8.0, 0.4, 0), E(-9.4, -0.8, 0), AE(-9.0, 1.4, 0), BR(-9.8, 0.4, 0), EL(-10.6, 1.2, 0), NX(-7.6, -1.0, 0), CAL(6.0, 0.0, 3.14, { hidden: true })], {
          noFace: true,
          nodes: { 'c13.corridor': {
            0: { cam: { focus: ['kael', 'nox', 'aerys', 'braxen', 'eloryn', 'eiryn'], view: 13, ang: -0.35, pitch: 0.42, drift: 0.02, ease: 1.8 }, do: [{ fade: [0, 1.0, '255,248,230'] }, { who: 'kael', to: [-3.0, 0.4], speed: 0.8 }, { who: 'nox', to: [-3.0, -1.0], speed: 0.8 }, { who: 'aerys', to: [-4.6, 1.4], speed: 0.8 }, { who: 'braxen', to: [-5.4, 0.4], speed: 0.8 }, { who: 'eloryn', to: [-6.2, 1.2], speed: 0.8 }, { who: 'eiryn', to: [-5.0, -0.8], speed: 0.8 }] },
            1: { cam: { x: 6.0, y: 0.0, view: 6, ang: -0.2, pitch: 0.4, up: 1.4, ease: 1.6 }, do: [{ who: 'calamity', show: true }] },
            2: { cam: { face: 'calamity', side: 0.3, view: 3.6, up: 1.8, pitch: 0.38, ease: 1.0 } },
          } },
        }),
        'c13.taunt': 'same',
      };
      // the climax scenes replay on the corridor: Calamity there, the party around her
      const cor = (extra) => auto('calamity', [K(-3.0, 0.8, 0, { armed: true }), E(-4.6, -1.2, 0), AE(-5.0, 1.8, 0), BR(-5.6, 0.4, 0), EL(-6.4, 1.4, 0), NX(-2.0, -1.0, 0, { armed: true }), CAL(3.0, 0.0, 3.14)], Object.assign({ armed: true, noFace: true }, extra));
      S['c13.climax1'] = cor({ nodes: { 'c13.climax1': {
        0: { cam: { focus: ['aerys', 'calamity'], view: 9, ang: -0.3, pitch: 0.4, up: 0.6, ease: 1.0 }, do: [{ who: 'aerys', to: [-2.0, 1.0], gait: 'dash', speed: 6 }, { at: 0.8, shake: 8 }] },
        2: { cam: { focus: ['nox'], view: 4.4, ang: -0.3, pitch: 0.42, up: 0.8, ease: 0.6 }, do: [{ who: 'nox', icon: '!' }, { at: 0.4, who: 'nox', icon: '…' }] },
        8: { cam: { focus: ['calamity', 'eiryn'], view: 9, ang: -0.3, pitch: 0.4, ease: 0.2, cut: true }, do: [{ shake: 14 }, { who: 'calamity', knock: [4, 0], state: 'down', hold: true }, { fade: [0.9, 0.08, '255,255,255'] }, { at: 0.12, fade: [0, 0.6] }] },
      } } });
      S['c13.climax2'] = cor({ nodes: { 'c13.climax2': {
        0: { cam: { face: 'eiryn', side: 0.3, view: 3.2, up: 1.1, pitch: 0.4, ease: 0.8 }, do: [{ who: 'calamity', state: 'idle', put: [2.0, 0.0] }, { who: 'eiryn', set: { gest: 'raise' } }] },
        3: { cam: { focus: ['aerys', 'nox'], view: 5, ang: -0.3, pitch: 0.4, up: 0.8, ease: 0.8 }, do: [{ who: 'nox', put: [-4.0, 0.6] }, { who: 'aerys', put: [-4.6, 0.8] }, { who: 'aerys', state: 'down', hold: true }, { who: 'nox', set: { gest: 'cross' }, state: 'pickup', dur: 4 }, { light: ['255,150,60', 0.5, 2.0] }, { rumble: [6, 3] }] },
        6: { cam: { face: 'eiryn', side: 0.3, view: 2.6, up: 1.2, pitch: 0.4, ease: 1.2 }, do: [{ fade: [0.8, 1.0, '255,160,90'] }, { who: 'eiryn', icon: '…' }] },
        7: { cam: { face: 'eiryn', side: 0.3, view: 2.6, up: 1.2, pitch: 0.4, ease: 0.3 }, do: [{ fade: [0.0, 0.8] }, { who: 'eiryn', set: { gest: 'raise' } }, { light: ['210,240,255', 0.6, 0.6] }] },
      } } });
      S['c13.climax3'] = cor({ nodes: { 'c13.climax3': {
        0: { cam: { x: -2, y: 0, view: 11, ang: -0.3, pitch: 0.4, ease: 0.4 }, do: [{ who: 'calamity', state: 'down', hold: true }, { who: 'nox', state: 'idle' }, { who: 'aerys', state: 'idle' }, { who: 'eiryn', state: 'pickup', dur: 3 }, { shake: 6 }] },
        4: { cam: { focus: ['kael', 'braxen'], view: 6.5, ang: -0.3, pitch: 0.4, ease: 0.7 }, do: [{ who: 'kael', to: [-4.8, 0.4], speed: 1.4 }, { who: 'kael', set: { stow: false, gest: null } }] },
        9: { cam: { focus: ['kael', 'braxen', 'nox'], view: 9, ang: -0.3, pitch: 0.4, ease: 0.3, cut: true }, do: [{ who: 'kael', put: [-5.6, 0.2] }, { who: 'kael', to: [-0.4, 0.2], gait: 'dash', speed: 9 }, { speed: ['h', 0.7, 1.0] }, { at: 0.5, who: 'nox', blink: [-1.2, 0.2] }, { at: 0.7, who: 'nox', blink: [1.6, 0.2] }, { at: 0.7, shake: 8 }] },
        11: { cam: { focus: ['nox', 'calamity'], view: 6.5, ang: -0.3, pitch: 0.4, ease: 0.3 }, do: [{ who: 'nox', attack: { wind: 0.1, active: 0.1, recover: 0.2, tele: false } }, { at: 0.3, who: 'calamity', state: 'stagger', dur: 0.8, knock: [0.5, 0] }, { at: 0.4, shake: 6 }] },
        12: { cam: { focus: ['kael', 'calamity'], view: 5.4, ang: -0.3, pitch: 0.4, ease: 0.3, cut: true }, do: [{ who: 'kael', to: [1.4, 0.2], gait: 'dash', speed: 8 }, { at: 0.35, who: 'kael', attack: { wind: 0.12, active: 0.1, recover: 0.4, tele: false } }, { at: 0.45, shake: 10 }, { at: 0.45, slow: [0.3, 0.7] }, { at: 0.9, who: 'nox', blink: [2.0, -0.6] }, { at: 1.1, who: 'nox', attack: { wind: 0.1, active: 0.1, recover: 0.2, tele: false } }, { at: 1.3, who: 'calamity', state: 'down', hold: true, knock: [1.5, 0] }, { at: 1.3, fx: { type: 'dissolve', x: 3.0, y: 0.0, big: true } }, { at: 1.3, shake: 14 }, { at: 1.3, fade: [0.9, 0.1, '255,240,220'] }, { at: 1.5, fade: [0.0, 1.0] }] },
        13: { cam: { focus: ['nox', 'aerys'], view: 6, ang: -0.3, pitch: 0.42, ease: 1.2 }, do: [{ who: 'calamity', hide: true }, { who: 'nox', state: 'down', hold: true }] },
      } } });
      S['c13.sword'] = auto('calamity', [K(-2.0, 1.2, 0), E(-5.0, -0.8, 0), AE(-4.0, -0.2, 0), BR(-3.0, 2.4, 0), EL(-4.4, 0.4, 0), NX(-3.6, -0.6, 0)], {
        nodes: { 'c13.sword': {
          0: { cam: { focus: ['eloryn', 'nox', 'aerys'], view: 5.4, ang: -0.3, pitch: 0.44, ease: 1.0 }, do: [{ who: 'nox', state: 'sit', hold: true }, { who: 'eloryn', state: 'pickup', dur: 3 }, { at: 0.6, fx: { type: 'heal', unit: 'eloryn', target: 'nox', amt: 0 } }] },
          2: { cam: { x: 1.0, y: 0.0, view: 5, ang: -0.3, pitch: 0.4, up: 1.4, ease: 1.2 }, do: [{ light: ['255,170,80', 0.45, 1.6] }, { rumble: [3, 1.5] }] },
          6: { cam: { face: 'kael', side: 0.4, view: 3.2, up: 1.0, pitch: 0.4, ease: 0.9 }, do: [{ who: 'kael', to: [0.0, 0.8], speed: 0.8 }] },
          9: { cam: { face: 'eiryn', side: 0.3, view: 3.0, up: 1.0, pitch: 0.42, ease: 0.9 }, do: [{ who: 'eiryn', state: 'pickup', dur: 3 }] },
          11: { cam: { x: 8, y: 0, view: 12, ang: -0.1, pitch: 0.4, up: 1.4, ease: 1.8 }, do: [{ rumble: [3, 2] }] },
        } },
      });
      S['c13.ramp'] = auto('calamity', [K(-4.0, 1.6, 0), E(-6.4, -0.6, 0), AE(-3.0, -0.2, 0), BR(-5.0, 2.6, 0), EL(-3.4, 0.8, 0), NX(-2.2, -0.2, 0)], {
        nodes: { 'c13.ramp': {
          0: { cam: { focus: ['eloryn', 'nox', 'aerys'], view: 7, ang: -0.3, pitch: 0.46, ease: 1.2 }, do: [{ who: 'nox', set: { gest: 'lean' } }, { who: 'braxen', state: 'sit', hold: true }] },
          2: { cam: { focus: ['eloryn', 'nox'], view: 4.2, ang: -0.3, pitch: 0.44, ease: 0.8 }, do: [{ who: 'nox', state: 'sit', hold: true }, { who: 'eloryn', state: 'pickup', dur: 5 }, { at: 0.8, fx: { type: 'heal', unit: 'eloryn', target: 'nox', amt: 0 } }, { at: 0.8, light: ['150,230,200', 0.2, 1.2] }] },
        } },
      });
      S['c13.climb2'] = auto('calamity', [K(-3.0, 1.6, 0), E(-5.4, -0.6, 0), AE(-2.4, -0.2, 0), BR(-3.0, 2.8, 0, { gest: null }), EL(-2.2, 2.0, 0), NX(-4.6, 0.2, 0)], {
        nodes: { 'c13.climb2': {
          0: { do: [{ who: 'braxen', state: 'sit', hold: true }, { who: 'eloryn', state: 'pickup', dur: 3 }] },
} },
      });
      return S;
    })(),
    defs: {},
    scenarios: {},
    looks: {},
  };
});
