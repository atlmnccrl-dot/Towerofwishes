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
      // a pack effect travelling from (x0, y0) to (x1, y1): n puffs, `step` seconds apart
      const along = (name, x0, y0, x1, y1, n, step, o) => Array.from({ length: n }, (_, i) => Object.assign({ name, x: x0 + (x1 - x0) * i / (n - 1), y: y0 + (y1 - y0) * i / (n - 1), delay: i * step }, o));
      const heal = (from, to) => ({ fx: { type: 'heal', unit: from, target: to, amt: 0 } });
      const S = {
        // The hall after the knights: Kael finds Eiryn; the others come in one by one; the stairs.
        'c13.enter': auto('frosthall', [K(-7.6, 1.6, 0, { armed: false }), E(0.6, -0.8, 3.0), AE(-8.6, -2.6, 0, { hidden: true }), BR(8.6, -1.6, 3.14, { hidden: true }), EL(-8.8, 0.4, 0, { hidden: true }), NX(5.4, 3.0, 3.6, { hidden: true })], {
          noFace: true,
          nodes: {
            'c13.enter': {
              0: { cam: { x: 0, y: 0, view: 13, ang: -0.3, pitch: 0.46, drift: 0.02, ease: 1.6 }, do: [{ fade: [0, 1.2, '226,238,250'] }, { pfx: [{ name: 'smoke_burst', x: -4, y: -1, scale: 2.4 }, { name: 'smoke_burst', x: 3, y: 1.6, scale: 2.4, delay: 0.3 }, { name: 'ice_shatter', x: -2, y: 2.4, scale: 2, delay: 0.5 }, { name: 'ice_shatter', x: 4.2, y: -0.6, scale: 2, delay: 0.8 }, { name: 'snow', x: 0, y: 0, z: 3, scale: 3, life: 4 }] }] },
              1: { cam: { focus: ['kael'], view: 5, ang: -0.3, pitch: 0.44, up: 0.8, ease: 1.0 }, do: [{ who: 'kael', to: [-3.2, 1.2], speed: 1.1 }, { at: 1.0, who: 'kael', state: 'hurt', dur: 0.5 }, { at: 1.8, who: 'kael', face: 'eiryn' }] },
              2: { do: [{ who: 'kael', face: 'eiryn' }] },
              3: { cam: { across: ['kael', 'eiryn'], focus: ['kael', 'eiryn'], view: 4.6, pitch: 0.44, up: 0.7, ease: 0.9 }, do: [{ who: 'kael', to: [-0.2, -0.5], speed: 1.5, face: 'eiryn' }, { at: 1.2, who: 'eiryn', face: 'kael' }] },
              6: { cam: { x: -1, y: -0.4, view: 11, ang: -0.35, pitch: 0.46, ease: 1.0 }, do: [{ who: 'aerys', show: true }, { who: 'aerys', to: [-1.4, -1.8], gait: 'run', speed: 3.6 }, { at: 1.1, who: 'aerys', state: 'stagger', dur: 0.6 }, { at: 1.1, who: 'eiryn', face: 'aerys' }, { at: 1.2, who: 'eiryn', to: [0.2, -1.2], speed: 1.4 }, { at: 1.9, who: 'braxen', show: true }, { at: 1.9, who: 'braxen', to: [3.2, -1.2], speed: 0.6 }] },
              7: { cam: { focus: ['eloryn', 'braxen'], view: 8, ang: -0.35, pitch: 0.46, ease: 1.0 }, do: [{ who: 'eloryn', show: true }, { who: 'eloryn', to: [2.5, -0.6], gait: 'run', speed: 3.0 }, { at: 2.4, who: 'eloryn', face: 'braxen' }] },
              8: { do: [{ who: 'braxen', face: 'eloryn' }] },
              9: { cam: { focus: ['eloryn', 'braxen'], view: 3.8, ang: -0.3, pitch: 0.44, up: 0.6, ease: 0.9 }, do: [{ who: 'braxen', state: 'sit', hold: true }, { at: 0.5, who: 'eloryn', state: 'pickup', hold: true }, { at: 0.9, ...heal('eloryn', 'braxen') }, { at: 0.9, light: ['150,230,200', 0.18, 0.8] }, { at: 0.9, who: 'braxen', pfx: { name: 'heal_loop', scale: 1.2, life: 2.6, follow: true } }] },
              10: { cam: { focus: ['nox'], view: 5, ang: -0.25, pitch: 0.42, up: 0.8, ease: 1.0 }, do: [{ who: 'nox', show: true }, { who: 'nox', to: [4.0, 2.0], speed: 0.5 }, { at: 1.6, who: 'nox', set: { gest: 'lean' } }, { at: 1.2, who: 'aerys', face: 'nox' }, { at: 1.3, who: 'aerys', icon: '!' }] },
              12: { cam: { across: ['kael', 'nox'], focus: ['kael', 'nox'], view: 4.4, pitch: 0.42, up: 0.8, ease: 1.0 }, do: [{ who: 'kael', to: [2.8, 1.2], speed: 0.9, face: 'nox' }, { at: 1.2, who: 'nox', pfx: { name: 'ice_shatter', scale: 1.2 } }, { at: 1.3, who: 'nox', state: 'hurt', dur: 0.4 }] },
              15: { cam: { x: 0, y: 0, view: 12, ang: -0.3, pitch: 0.46, ease: 0.8 }, do: [{ rumble: [4, 2.5] }, { shake: 4 }, { at: 0.4, who: 'kael', icon: '!' }, { at: 0.5, who: 'aerys', icon: '!' }, { at: 0.4, pfx: { name: 'dust_cloud', x: 0, y: -2.4, scale: 2.4 } }] },
            },
            'c13.stairs': {
              0: { cam: { x: 0, y: -1, view: 12, ang: -0.1, pitch: 0.36, up: 1.4, ease: 1.6 }, do: [{ rumble: [4, 2] }, { shake: 5 }, { pfx: [{ name: 'rock_burst', x: 0, y: -3.4, scale: 2.4 }, { name: 'dust_cloud', x: 0, y: -3.0, scale: 2.4, delay: 0.3 }, { name: 'smoke_earth', x: 1.2, y: -3.4, scale: 2, delay: 0.6 }, { name: 'portal', x: 0, y: -3.4, z: 2.2, scale: 1.6, life: 3.4, delay: 0.9 }] }, ...['kael', 'eiryn', 'aerys', 'nox'].map((w) => ({ at: 1.0, who: w, face: [0, -3.4] }))] },
              2: { do: [{ who: 'kael', set: { gest: null } }] },
              3: { cam: { focus: ['eloryn', 'aerys'], view: 4.4, ang: -0.3, pitch: 0.44, up: 0.7, ease: 0.9 }, do: [{ who: 'eloryn', state: 'idle', hold: true }, { at: 0.4, who: 'aerys', to: [1.8, -1.0], gait: 'run', speed: 3 }, { at: 0.9, who: 'eloryn', state: 'hurt', dur: 0.6 }, { at: 1.3, who: 'aerys', face: 'eloryn' }] },
              4: { cam: { behind: 'kael', side: 0.3, view: 8, pitch: 0.44, up: 0.7, ease: 1.0 }, do: [{ who: 'kael', face: [1.6, -0.6] }] },
              6: { cam: { face: 'kael', side: -0.4, view: 3.4, up: 1.0, pitch: 0.42, ease: 0.9 }, do: [{ who: 'kael', face: [-9, 1] }] },
              8: { cam: { focus: ['braxen'], view: 4, ang: -0.3, pitch: 0.42, up: 0.8, ease: 0.8 }, do: [{ who: 'braxen', state: 'idle', hold: true }, { at: 0.3, who: 'braxen', state: 'hurt', dur: 0.5 }, { who: 'eloryn', state: 'idle', hold: true }] },
              9: { cam: { x: 0, y: -1.8, view: 11, ang: -0.2, pitch: 0.44, ease: 1.4 }, do: [{ who: 'nox', face: 'kael' }, { at: 0.4, who: 'kael', state: 'pickup', dur: 0.9 }, { at: 1.2, who: 'kael', set: { stow: false, gest: null } }, { at: 1.6, who: 'kael', to: [0.0, -3.4], speed: 1.0 }, { at: 1.7, who: 'eiryn', to: [-1.4, -3.2], speed: 1.0 }, { at: 1.8, who: 'aerys', to: [1.4, -3.0], speed: 1.0 }, { at: 1.9, who: 'eloryn', to: [-2.8, -3.0], speed: 1.0 }, { at: 2.0, who: 'braxen', to: [2.8, -3.2], speed: 0.9 }, { at: 2.1, who: 'nox', to: [-4.0, -3.4], speed: 1.0 }, { at: 3.6, fade: [1, 1.0] }] },
            },
          },
        }),
        'c13.stairs': 'same',
        // The climb: hours of stairs; Kael beside Eloryn; the chair; heat; the door of light.
        'c13.climb': auto('frosthall', [E(-8.6, 0.6, 0), BR(-7.2, -0.2, 0), EL(-5.8, 0.7, 0), AE(-4.4, -0.3, 0), K(-3.0, 0.5, 0, { armed: true }), NX(-1.6, -0.1, 0)], {
          noFace: true,
          nodes: { 'c13.climb': {
            0: { cam: { focus: ['kael', 'nox', 'aerys', 'braxen', 'eloryn', 'eiryn'], view: 10, ang: -0.9, pitch: 0.48, drift: 0.02, ease: 1.4 }, do: [{ fade: [0, 1.0] }, ...[['eiryn', -5.6, 0.6], ['braxen', -4.2, -0.2], ['eloryn', -2.8, 0.7], ['aerys', -1.4, -0.3], ['kael', 0.0, 0.5], ['nox', 1.4, -0.1]].map(([w, x, y]) => ({ who: w, to: [x, y], speed: 0.8 })), { at: 1.4, who: 'nox', state: 'hurt', dur: 0.3 }] },
            1: { cam: { focus: ['aerys', 'eloryn'], view: 4.6, ang: -0.3, pitch: 0.44, up: 0.7, ease: 0.9 }, do: [{ who: 'aerys', face: 'eloryn' }, { at: 0.6, who: 'eloryn', state: 'hurt', dur: 0.4 }, { at: 1.4, who: 'eloryn', face: 'aerys' }] },
            2: { cam: { focus: ['kael', 'eloryn'], view: 4.6, ang: -0.35, pitch: 0.44, up: 0.7, ease: 1.0 }, do: [{ who: 'nox', to: [3.8, -0.1], speed: 0.8 }, { who: 'aerys', to: [2.4, -0.6], speed: 0.8 }, { who: 'eloryn', to: [-1.4, 1.0], speed: 0.7 }, { who: 'kael', to: [-1.2, -0.5], gait: 'back', speed: 0.7, face: 'eloryn' }, { at: 2.0, who: 'kael', to: [0.4, -0.5], speed: 0.6 }, { at: 2.0, who: 'eloryn', to: [0.6, 1.0], speed: 0.6 }] },
            5: { cam: { focus: ['kael', 'nox', 'aerys', 'braxen', 'eloryn', 'eiryn'], view: 11, ang: -0.95, pitch: 0.5, drift: 0.03, ease: 1.6 }, do: [{ fade: [1, 0.6] }, ...[['eiryn', -6.0, 0.6], ['braxen', -4.6, -0.2], ['eloryn', -3.2, 0.9], ['kael', -3.0, -0.7], ['aerys', -1.6, -0.3], ['nox', 0.0, 0.0]].map(([w, x, y]) => ({ at: 0.65, who: w, put: [x, y] })), { at: 0.8, fade: [0, 0.9] }, ...[['eiryn', -3.5, 0.6], ['braxen', -2.1, -0.2], ['eloryn', -0.7, 0.9], ['kael', -0.5, -0.7], ['aerys', 0.9, -0.3], ['nox', 2.5, 0.0]].map(([w, x, y]) => ({ at: 0.9, who: w, to: [x, y], speed: 0.7 }))] },
            9: { cam: { face: 'kael', side: 0.4, view: 3.6, up: 1.0, pitch: 0.42, ease: 0.9 }, do: [{ who: 'kael', face: 'eiryn' }, { at: 0.4, who: 'eiryn', path: [[-2.0, 1.8], [4.0, 1.8]], speed: 1.4 }] },
            10: { cam: { focus: ['kael', 'nox', 'eiryn'], view: 8, ang: -0.4, pitch: 0.44, ease: 0.8 }, do: [{ rumble: [2, 2] }, { at: 0.4, who: 'nox', icon: '!' }, { at: 0.5, who: 'kael', icon: '!' }] },
            11: { cam: { focus: ['eloryn', 'aerys'], view: 4.6, ang: -0.3, pitch: 0.44, up: 0.7, ease: 0.9 }, do: [{ light: ['255,140,60', 0.25, 2.0] }, { at: 0.6, who: 'eloryn', state: 'hurt', dur: 0.6 }, { pfx: { name: 'steam', x: 4, y: 0.4, scale: 2.4, life: 3 } }] },
            12: { cam: { x: 6.0, y: 0.4, view: 9, ang: -0.3, pitch: 0.42, up: 0.8, ease: 1.2 }, do: [...[['nox', 8.4, 0.0], ['eiryn', 7.6, 1.4], ['aerys', 7.0, -0.4], ['kael', 6.0, -0.9], ['eloryn', 5.6, 0.8], ['braxen', 4.6, -0.2]].map(([w, x, y]) => ({ who: w, to: [x, y], speed: 1.1 })), { at: 2.4, light: ['255,240,210', 0.6, 1.2] }, { at: 3.2, fade: [1, 0.8, '255,248,230'] }] },
          } },
        }),
        // The corridor between the waterfall (north, y < 0) and the lava (south, y > 0); Calamity.
        'c13.corridor': auto('calamity', [K(-8.0, 0.4, 0), E(-9.4, -0.8, 0), AE(-9.0, 1.4, 0), BR(-9.8, 0.4, 0), EL(-10.6, 1.2, 0), NX(-7.6, -1.0, 0), CAL(6.0, 0.0, 3.14, { hidden: true })], {
          noFace: true, closeAng: -0.3,
          nodes: {
            'c13.corridor': {
              0: { cam: { focus: ['kael', 'nox', 'aerys', 'braxen', 'eloryn', 'eiryn'], view: 13, ang: -0.35, pitch: 0.42, drift: 0.02, ease: 1.8 }, do: [{ fade: [0, 1.0, '255,248,230'] }, { who: 'kael', to: [-3.0, 0.4], speed: 0.8 }, { who: 'nox', to: [-3.0, -1.0], speed: 0.8 }, { who: 'aerys', to: [-4.6, 1.4], speed: 0.8 }, { who: 'braxen', to: [-5.4, 0.4], speed: 0.8 }, { who: 'eloryn', to: [-6.2, 1.2], speed: 0.8 }, { who: 'eiryn', to: [-5.0, -0.8], speed: 0.8 }] },
              1: { cam: { x: 6.0, y: 0.0, view: 6, ang: -0.2, pitch: 0.4, up: 1.4, ease: 1.6 }, do: [{ who: 'calamity', show: true }, { pfx: { name: 'heal_loop', x: 6.0, y: 0.0, z: 1.2, scale: 2.4, life: 2.5, add: true } }] },
              2: { cam: { focus: ['calamity'], ang: -0.15, view: 3.6, up: 1.8, pitch: 0.38, ease: 1.0 }, do: [{ who: 'calamity', face: 'kael' }] },
              3: { cam: { focus: ['kael', 'nox', 'aerys', 'braxen', 'eloryn', 'eiryn'], view: 7, ang: 2.9, pitch: 0.4, up: 0.9, ease: 1.2 }, do: [{ who: 'calamity', face: 'kael' }, { at: 0.8, who: 'calamity', face: 'braxen' }, { at: 1.6, who: 'calamity', face: 'eloryn' }, { at: 2.4, who: 'calamity', face: 'eiryn' }] },
            },
            'c13.taunt': {
              0: { cam: { focus: ['eiryn', 'calamity'], view: 12, ang: -0.3, pitch: 0.42, ease: 1.0 }, do: [{ who: 'eiryn', face: 'calamity' }, { at: 0.5, pfx: along('water_splash', 1.0, -4.4, -4.4, -1.2, 5, 0.06, { scale: 1.6 }) }, { at: 0.5, pfx: along('fire_burst', 0.0, 4.4, -4.6, -0.4, 5, 0.06, { scale: 1.6, add: true }) }, { at: 0.8, who: 'eiryn', to: [-4.5, -0.8], speed: 1.2 }, { at: 0.9, who: 'eiryn', set: { gest: 'raise' } }] },
              1: { do: [{ who: 'eiryn', set: { gest: 'raise' } }, { at: 0.4, pfx: [{ name: 'shockwave', x: -3.6, y: -0.8, scale: 2.6, add: true }, { name: 'water_splash', x: -3.4, y: -1.6, scale: 2.6, delay: 0.05 }, { name: 'steam', x: -3.4, y: 0.2, scale: 2.4, life: 1.4, delay: 0.1 }] }, { at: 0.45, shake: 7 }] },
              2: { cam: { focus: ['calamity'], ang: -0.15, view: 4, up: 1.6, pitch: 0.4, ease: 1.0 }, do: [{ who: 'eiryn', set: { gest: null } }, { who: 'calamity', face: 'eiryn' }] },
              3: { cam: { focus: ['calamity'], ang: -0.15, view: 2.6, up: 1.8, pitch: 0.38, ease: 0.8 } },
              5: { cam: { focus: ['kael', 'calamity'], view: 8, ang: -0.3, pitch: 0.42, ease: 1.0 }, do: [{ who: 'calamity', to: [4.4, 0.0], speed: 0.4 }, { at: 0.4, who: 'kael', set: { stow: false, gest: null } }, { at: 0.4, who: 'kael', to: [-1.8, 0.2], speed: 1.2, face: 'calamity' }] },
              7: { cam: { focus: ['nox', 'calamity'], view: 9, ang: -0.3, pitch: 0.42, ease: 0.8 }, do: [{ who: 'braxen', face: 'calamity' }, { who: 'aerys', face: 'calamity' }, { who: 'nox', set: { stow: false, gest: null } }, { at: 0.5, who: 'nox', blink: [0.2, -1.0] }, { at: 1.0, who: 'nox', blink: [1.8, -1.4] }, { at: 1.5, who: 'nox', blink: [3.0, -0.8] }, { at: 1.6, who: 'nox', face: 'calamity' }, { at: 1.7, pfx: along('water_splash', 3.4, -4.4, 3.2, -1.2, 4, 0.05, { scale: 1.6 }) }] },
              9: { do: [{ at: 0.4, who: 'nox', state: 'stagger', dur: 0.8, knock: [-1.4, 0] }, { at: 0.4, who: 'nox', pfx: { name: 'water_splash', scale: 2 } }, { at: 0.4, shake: 6 }] },
            },
          },
        }),
        'c13.taunt': 'same',
      };
      // The climax, as one take on the corridor: Calamity there, the party around her.
      S['c13.climax1'] = auto('calamity', [K(-3.0, 0.8, 0, { armed: true }), E(-4.6, -1.2, 0), AE(-5.0, 1.8, 0), BR(-5.6, 0.4, 0), EL(-6.4, 1.4, 0), NX(-2.0, -1.0, 0, { armed: true }), CAL(3.0, 0.0, 3.14)], { armed: true, noFace: true, closeAng: -0.3, nodes: {
        'c13.climax1': {
          0: { cam: { focus: ['aerys', 'calamity'], view: 9, ang: -0.3, pitch: 0.4, up: 0.8, ease: 1.0 }, do: [{ who: 'aerys', to: [-2.4, 1.2], gait: 'dash', speed: 6 }, { at: 0.2, who: 'aerys', hop: [2.4, 1.4] }, { at: 0.2, who: 'aerys', pfx: { name: 'charge_up', scale: 1.2, life: 1, follow: true, add: true } }, { at: 0.6, who: 'calamity', face: 'aerys' }, { at: 0.8, pfx: [{ name: 'fire_ring', x: -2.4, y: 1.2, z: 3, scale: 2, life: 1.2, add: true }, { name: 'explosion_fire', x: -2.4, y: 1.2, z: 2.4, scale: 2, add: true, delay: 0.3 }] }, { at: 0.9, shake: 6 }, { at: 1.4, who: 'aerys', to: [-4.0, 2.6], gait: 'dash', speed: 6 }, { at: 1.4, pfx: { name: 'burning_ground', x: -2.4, y: 1.2, ground: true, scale: 1.8, life: 2.4 } }] },
          1: { cam: { focus: ['kael', 'braxen', 'calamity'], view: 9, ang: -0.3, pitch: 0.42, ease: 0.8 }, do: [{ who: 'kael', to: [1.0, -1.6], gait: 'run', speed: 4 }, { who: 'braxen', to: [0.4, -2.2], gait: 'run', speed: 3.6 }, { at: 0.9, who: 'calamity', state: 'cast', dur: 0.6 }, { at: 1.1, pfx: [{ name: 'water_splash', x: 0.8, y: -2.0, scale: 3.4 }, { name: 'wind_gust', x: 0.6, y: -2.0, scale: 2.4, delay: 0.1 }, { name: 'water_splash', x: 1.4, y: -1.4, scale: 3, delay: 0.15 }] }, { at: 1.2, who: 'kael', state: 'down', dur: 1.2, knock: [-2, -0.4] }, { at: 1.2, who: 'braxen', state: 'down', dur: 1.2, knock: [-2, -0.4] }, { at: 1.2, shake: 8 }, { at: 2.0, who: 'eloryn', to: [-1.4, -1.8], gait: 'run', speed: 3.4 }, { at: 2.9, ...heal('eloryn', 'kael') }, { at: 3.4, who: 'eloryn', to: [-1.8, -2.6], gait: 'run', speed: 3.4 }, { at: 3.8, ...heal('eloryn', 'braxen') }] },
          2: { cam: { focus: ['nox'], view: 3.8, ang: -0.3, pitch: 0.42, up: 0.8, ease: 0.6 }, do: [{ who: 'nox', pfx: { name: 'shock_aura', scale: 1.4, life: 1.2, follow: true, add: true } }, { at: 1.2, who: 'nox', pfx: { name: 'dissipate', scale: 1.4 } }, { at: 1.3, who: 'nox', state: 'hurt', dur: 0.4 }] },
          4: { cam: { focus: ['nox', 'aerys', 'calamity'], view: 9, ang: -0.3, pitch: 0.42, ease: 0.6 }, do: [{ who: 'calamity', state: 'cast', dur: 0.4 }, { at: 0.2, pfx: along('fireball', 2.4, 0.0, -1.6, -1.0, 5, 0.05, { scale: 1.4, add: true, life: 0.25 }) }, { at: 0.5, who: 'nox', blink: [-2.8, 0.2] }, { at: 0.55, pfx: { name: 'fire_puff', x: -2.0, y: -1.0, scale: 1.8, add: true } }, { at: 0.6, who: 'nox', pfx: { name: 'ignite', scale: 1.2, follow: true, add: true } }, { at: 1.1, who: 'aerys', to: [-3.4, 0.9], gait: 'run', speed: 3.4 }, { at: 1.8, who: 'aerys', face: 'nox' }, { at: 2.0, who: 'calamity', to: [1.8, 0.2], speed: 0.5 }] },
          5: { cam: { focus: ['aerys'], ang: -0.15, view: 2.6, up: 1.1, pitch: 0.42, ease: 0.8 }, do: [{ who: 'aerys', face: 'calamity' }] },
          7: { cam: { focus: ['nox', 'aerys'], view: 3.2, ang: -0.3, pitch: 0.42, up: 0.8, ease: 0.8 }, do: [{ who: 'nox', face: 'aerys' }] },
          9: { cam: { focus: ['calamity', 'eiryn'], view: 10, ang: -0.3, pitch: 0.4, ease: 0.2, cut: true }, do: [{ who: 'eiryn', face: 'calamity' }, { who: 'eiryn', set: { gest: 'raise' } }, { at: 0.4, pfx: { name: 'shockwave', x: 1.8, y: 0.2, scale: 3, add: true } }, { at: 0.4, who: 'calamity', knock: [5, 0], state: 'down', hold: true }, { at: 0.4, shake: 14 }, { at: 0.4, fade: [0.9, 0.08, '255,255,255'] }, { at: 0.55, fade: [0, 0.6] }, { at: 0.65, pfx: [{ name: 'rock_burst', x: 7.4, y: 0.2, scale: 2.6 }, { name: 'dust_cloud', x: 7.2, y: 0.2, scale: 2.4, delay: 0.1 }] }] },
          10: { cam: { focus: ['calamity'], ang: -0.15, view: 3.2, up: 1.4, pitch: 0.4, ease: 0.6 }, do: [{ who: 'eiryn', set: { gest: null } }, { at: 0.3, who: 'calamity', state: 'idle', hold: true }, { at: 0.5, who: 'calamity', pfx: { name: 'fire_burst', scale: 2, add: true } }, { at: 0.5, rumble: [3, 1.5] }] },
          11: { cam: { focus: ['calamity', 'eiryn'], view: 11, ang: -0.3, pitch: 0.42, ease: 1.0 }, do: [{ light: ['255,120,60', 0.25, 1.2] }, { pfx: [{ name: 'water_splash', x: -1, y: -4.4, scale: 3 }, { name: 'water_splash', x: 4, y: -4.4, scale: 3, delay: 0.3 }, { name: 'flame', x: 2, y: 4.4, scale: 2.4, life: 2.4, add: true }, { name: 'flame', x: -3, y: 4.4, scale: 2.4, life: 2.4, add: true, delay: 0.2 }] }, { who: 'calamity', to: [5.0, 0.0], speed: 0.6 }, { at: 1.0, who: 'calamity', face: 'eiryn' }] },
        },
        'c13.climax2': {
          0: { cam: { focus: ['calamity', 'eiryn'], view: 12, ang: -0.3, pitch: 0.42, ease: 0.8 }, do: [{ light: ['255,120,60', 0.0, 1.0] }, { who: 'calamity', state: 'cast', dur: 1.2 }, { at: 0.3, pfx: [{ name: 'water_splash', x: 3, y: -4.4, scale: 3.4 }, { name: 'wind_gust', x: 3, y: -3.4, scale: 2.4, delay: 0.2 }] }, { at: 0.6, pfx: { name: 'flame', x: 3.6, y: 4.4, scale: 2.8, life: 1.6, add: true } }, { at: 1.0, who: 'eiryn', face: 'calamity' }, { at: 1.3, who: 'eiryn', set: { gest: 'raise' } }] },
          1: { do: [{ who: 'eiryn', set: { gest: 'raise' } }, { at: 0.3, pfx: along('water_splash', 3.4, -3.4, -3.4, -1.4, 6, 0.05, { scale: 1.8 }) }, { at: 0.3, pfx: along('fire_burst', 3.4, 3.4, -3.4, 0.2, 6, 0.05, { scale: 1.8, add: true }) }, { at: 0.65, pfx: [{ name: 'shockwave', x: -3.2, y: -0.8, scale: 3, add: true }, { name: 'steam', x: -2.8, y: -0.4, scale: 2.8, life: 1.6 }] }, { at: 0.7, who: 'calamity', knock: [2, 0], state: 'stagger', dur: 0.8 }, { at: 0.7, shake: 8 }] },
          2: { cam: { x: 0, y: 0, view: 13, ang: -0.3, pitch: 0.46, ease: 0.6 }, do: [{ who: 'eiryn', set: { gest: null } }, { shake: 10 }, { who: 'calamity', state: 'cast', dur: 1.4 }, { light: ['255,140,60', 0.3, 1.0] }, { pfx: [...along('water_splash', -6, -3.6, 6, -3.6, 5, 0.1, { scale: 3 }), ...along('flame', -6, 3.6, 6, 3.6, 5, 0.1, { scale: 2.6, life: 4, add: true }), { name: 'fire_ring', x: 0, y: 2.4, z: 3.4, scale: 3, life: 4, add: true }] },
            { at: 0.6, who: 'kael', to: [-1.0, -2.8], gait: 'run', speed: 3 }, { at: 0.6, who: 'braxen', to: [-2.0, -3.2], gait: 'run', speed: 3 }, { at: 0.6, who: 'eloryn', to: [-3.0, -2.6], gait: 'run', speed: 3 },
            { at: 0.6, who: 'nox', to: [-1.6, 2.0], gait: 'run', speed: 3 }, { at: 0.6, who: 'aerys', to: [-2.6, 2.6], gait: 'run', speed: 3 }, { at: 0.6, who: 'eiryn', to: [-3.8, 1.6], gait: 'run', speed: 3 }] },
          3: { cam: { focus: ['calamity', 'aerys'], view: 9, ang: -0.3, pitch: 0.42, ease: 0.9 }, do: [{ who: 'calamity', face: 'aerys' }] },
          5: { cam: { focus: ['aerys', 'nox'], view: 4.6, ang: -0.3, pitch: 0.42, up: 0.9, ease: 0.9 }, do: [{ pfx: { name: 'fire_ring', x: -2.6, y: 2.6, z: 3.2, scale: 2.2, life: 2.6, add: true } }, { at: 0.6, who: 'aerys', state: 'hurt', dur: 0.4 }, { at: 1.0, who: 'nox', face: 'aerys' }, { at: 1.8, who: 'aerys', state: 'hurt', dur: 0.4 }] },
          6: { cam: { focus: ['aerys', 'nox'], view: 4.0, ang: -0.3, pitch: 0.42, up: 0.9, ease: 0.3 }, do: [{ slow: [0.3, 1.4] }, { who: 'nox', pfx: { name: 'shock_aura', scale: 1.4, life: 0.8, follow: true, add: true } }, { at: 0.2, who: 'nox', blink: [-2.3, 2.4] }, { at: 0.25, who: 'aerys', state: 'down', hold: true }, { at: 0.3, who: 'nox', state: 'pickup', hold: true }, { at: 0.5, pfx: { name: 'explosion_fire', x: -2.4, y: 2.5, z: 1.8, scale: 2.4, add: true } }, { at: 0.6, who: 'nox', pfx: { name: 'flame', scale: 1.4, life: 3.4, follow: true, add: true } }, { at: 0.5, shake: 8 }, { at: 0.5, light: ['255,150,60', 0.5, 1.6] }] },
          8: { cam: { focus: ['aerys', 'nox'], view: 3.2, ang: -0.3, pitch: 0.42, up: 0.7, ease: 0.8 }, do: [{ pfx: [0, 0.4, 0.8, 1.2].map((d) => ({ name: 'fire_burst', x: -2.3, y: 2.4, z: 1.4, scale: 1.6, add: true, delay: d })) }, { shake: 3 }, { at: 0.8, who: 'nox', state: 'hurt', dur: 0.3 }, { at: 1.2, who: 'nox', state: 'pickup', hold: true }] },
          9: { cam: { focus: ['eiryn'], ang: -0.15, view: 2.6, up: 1.2, pitch: 0.4, ease: 1.2 }, do: [{ fade: [0.75, 1.0, '255,160,90'] }, { at: 2.4, fade: [0, 0.8] }, { who: 'eiryn', face: 'nox' }] },
          10: { cam: { focus: ['eiryn'], ang: -0.15, view: 2.6, up: 1.2, pitch: 0.4, ease: 0.3 }, do: [{ fade: [0, 0.3] }, { who: 'eiryn', set: { gest: 'raise' } }, { at: 0.4, light: ['210,240,255', 0.6, 0.6] }, { at: 0.4, who: 'eiryn', pfx: [{ name: 'circle_arcane', scale: 3.6, ground: true, life: 3, add: true }, { name: 'shockwave', scale: 3.6, add: true }] }] },
        },
        'c13.climax3': {
          0: { cam: { x: 0, y: 0.6, view: 12, ang: -0.3, pitch: 0.44, ease: 0.4 }, do: [{ fade: [0.8, 0.06, '235,245,255'] }, { at: 0.1, fade: [0, 0.8] }, { light: ['210,240,255', 0, 1.6] }, { pfx: [{ name: 'dissipate', x: -2.4, y: 2.5, z: 2.4, scale: 3 }, { name: 'steam', x: 0, y: -3.4, scale: 3, life: 2 }, { name: 'dissipate', x: 6.6, y: 0.2, z: 1.4, scale: 2.4, delay: 0.2 }] }, { who: 'calamity', drop: [1.4, 0.5] }, { at: 0.5, who: 'calamity', state: 'down', dur: 0.8 }, { who: 'nox', state: 'idle', hold: true }, { who: 'aerys', state: 'idle', hold: true }] },
          1: { cam: { focus: ['eiryn'], ang: -0.12, view: 2.8, up: 1.0, pitch: 0.42, ease: 0.8 }, do: [{ who: 'eiryn', set: { gest: null } }, { who: 'eiryn', state: 'hurt', dur: 0.6 }, { at: 0.8, who: 'eiryn', state: 'pickup', hold: true }, { at: 2.6, who: 'eiryn', state: 'idle', hold: true }] },
          2: { cam: { focus: ['calamity'], view: 3.6, ang: -0.3, pitch: 0.42, up: 0.7, ease: 0.8 }, do: [{ who: 'calamity', state: 'pickup', hold: true }] },
          4: { cam: { focus: ['calamity', 'eiryn'], view: 11, ang: -0.3, pitch: 0.42, ease: 0.8 }, do: [{ light: ['255,120,60', 0.3, 0.6] }, { who: 'calamity', pfx: { name: 'fire_burst', scale: 2, add: true } }, { at: 0.3, who: 'calamity', state: 'idle', hold: true }, { at: 0.4, who: 'calamity', face: 'eiryn' }, { rumble: [3, 1.2] }] },
          6: { cam: { focus: ['kael', 'braxen'], view: 4.4, ang: -0.3, pitch: 0.42, up: 0.8, ease: 0.9 }, do: [{ light: ['255,120,60', 0.1, 1.0] }, { who: 'kael', face: 'calamity' }, { at: 1.2, who: 'kael', face: 'braxen' }] },
          9: { cam: { focus: ['kael'], ang: -0.10, view: 2.8, up: 1.0, pitch: 0.42, ease: 0.8 }, do: [{ who: 'kael', set: { stow: false, gest: null } }] },
          11: { cam: { focus: ['kael', 'braxen'], view: 9, ang: -0.3, pitch: 0.42, ease: 0.3 }, do: [{ who: 'braxen', attack: { wind: 0.25, active: 0.1, recover: 0.5, tele: false } }, { at: 0.3, who: 'kael', hop: [3.0, 1.0] }, { at: 0.3, who: 'kael', to: [3.0, -1.2], gait: 'dash', speed: 9 }, { at: 0.3, speed: ['h', 0.7, 1.0] }, { at: 0.3, who: 'kael', pfx: { name: 'wind_gust', scale: 1.6, follow: true } }] },
          12: { do: [{ at: 0.6, speed: ['h', 0, 0.6] }] },
          13: { cam: { focus: ['nox', 'kael', 'calamity'], view: 9, ang: -0.3, pitch: 0.42, ease: 0.6 }, do: [{ who: 'nox', face: 'aerys' }, { at: 0.5, who: 'aerys', face: 'nox' }, { at: 1.2, who: 'nox', set: { stow: false } }, { at: 1.2, who: 'nox', blink: [3.4, -1.0] }, { at: 1.25, who: 'nox', hop: [2.4, 0.6] }, { at: 1.3, who: 'kael', attack: { wind: 0.08, active: 0.1, recover: 0.4, tele: false } }, { at: 1.4, pfx: { name: 'hit_blunt', x: 3.4, y: -1.0, z: 1.6, scale: 2 } }, { at: 1.4, shake: 6 }, { at: 1.5, who: 'nox', to: [6.0, -0.2], gait: 'dash', speed: 10 }, { at: 1.5, speed: ['h', 0.6, 0.6] }] },
          14: { cam: { focus: ['nox', 'calamity', 'aerys'], view: 11, ang: -0.3, pitch: 0.42, ease: 0.4 }, do: [{ speed: ['h', 0, 0.4] }, { who: 'calamity', face: 'nox' }, { at: 0.2, who: 'aerys', state: 'cast', dur: 0.7 }, { at: 0.3, pfx: along('holy_light', -2.4, 2.4, 6.6, 0.2, 7, 0.03, { scale: 1.4, z: 1.4, add: true }) }, { at: 0.55, who: 'calamity', state: 'hurt', dur: 0.6 }, { at: 0.9, who: 'nox', attack: { wind: 0.08, active: 0.1, recover: 0.2, tele: false } }, { at: 1.0, pfx: { name: 'hit_slash', x: 6.6, y: 0.2, z: 0.5, scale: 2 } }, { at: 1.0, who: 'calamity', state: 'pickup', hold: true }, { at: 1.4, who: 'nox', blink: [7.2, -0.6] }, { at: 1.5, who: 'nox', attack: { wind: 0.08, active: 0.1, recover: 0.2, tele: false } }, { at: 1.8, who: 'calamity', state: 'cast', dur: 0.3 }, { at: 1.85, who: 'nox', pfx: [{ name: 'water_splash', scale: 2 }, { name: 'hit_pierce', scale: 2 }] }, { at: 1.85, who: 'nox', state: 'stagger', dur: 0.8, knock: [-1.6, 0] }, { at: 1.85, shake: 8 }] },
          15: { cam: { focus: ['kael', 'calamity'], view: 5.4, ang: -0.3, pitch: 0.4, ease: 0.3, cut: true }, do: [{ who: 'calamity', state: 'idle', hold: true }, { at: 0.2, who: 'kael', to: [5.8, 0.2], gait: 'dash', speed: 8 }, { at: 0.5, who: 'kael', attack: { wind: 0.12, active: 0.1, recover: 0.4, tele: false } }, { at: 0.6, shake: 10 }, { at: 0.6, slow: [0.3, 0.7] }, { at: 0.6, pfx: { name: 'slash_arc_blood', x: 6.6, y: 0.2, z: 1.4, scale: 1.6 } }, { at: 0.7, who: 'calamity', state: 'stagger', dur: 0.8, knock: [0.6, 0] }, { at: 1.2, who: 'nox', blink: [7.8, -0.6] }, { at: 1.25, who: 'nox', hop: [1.6, 0.5] }, { at: 1.35, who: 'nox', attack: { wind: 0.1, active: 0.1, recover: 0.2, tele: false } }, { at: 1.5, who: 'calamity', state: 'down', hold: true, knock: [1.2, 0] }, { at: 1.5, fx: { type: 'dissolve', x: 8.2, y: 0.2, big: true } }, { at: 1.5, shake: 14 }, { at: 1.5, fade: [0.9, 0.1, '255,240,220'] }, { at: 1.7, fade: [0.0, 1.0] }] },
          16: { cam: { focus: ['nox', 'aerys'], view: 7, ang: -0.3, pitch: 0.42, ease: 1.2 }, do: [{ who: 'calamity', hide: true }, { who: 'nox', drop: [1.2, 0.5] }, { at: 0.5, who: 'nox', state: 'down', hold: true }, { at: 0.5, shake: 4 }] },
        },
        // The sword and the ramp, still the same take: Calamity's remains at (8.4, 0.2).
        'c13.sword': {
          0: { cam: { focus: ['nox', 'aerys', 'eloryn'], view: 7, ang: -0.3, pitch: 0.44, ease: 1.0 }, do: [{ who: 'aerys', to: [6.6, -1.4], gait: 'run', speed: 3.4 }, { at: 0.4, who: 'eloryn', to: [7.6, -1.4], gait: 'run', speed: 3.4 }, { at: 2.2, who: 'nox', state: 'sit', hold: true }, { at: 2.4, who: 'eloryn', state: 'pickup', hold: true }, { at: 2.6, ...heal('eloryn', 'nox') }, { at: 2.6, who: 'nox', pfx: { name: 'heal_loop', scale: 1.2, life: 3, follow: true } }] },
          1: { cam: { focus: ['nox'], ang: -0.12, view: 2.8, up: 0.8, pitch: 0.42, ease: 0.8 }, do: [{ who: 'nox', state: 'hurt', dur: 0.3 }, { at: 0.4, who: 'nox', state: 'sit', hold: true }, { at: 0.8, who: 'nox', face: [8.4, 0.2] }] },
          3: { cam: { x: 8.4, y: 0.2, view: 5, ang: -0.3, pitch: 0.4, up: 1.4, ease: 1.2 }, do: [{ pfx: [...along('water_splash', 8.4, -4.4, 8.4, 0.2, 5, 0.12, { scale: 1.8 }), ...along('fire_burst', 8.4, 4.4, 8.4, 0.2, 5, 0.12, { scale: 1.8, add: true }), { name: 'portal', x: 8.4, y: 0.2, z: 1.2, scale: 1.6, life: 2.4, delay: 0.7 }, { name: 'star_burst', x: 8.4, y: 0.2, z: 1.2, scale: 2, delay: 2.4 }, { name: 'item_glow', x: 8.4, y: 0.2, z: 1.2, scale: 1.6, life: 9, delay: 2.4, add: true }, { name: 'steam', x: 8.4, y: 0.2, z: 1.2, scale: 1.4, life: 9, delay: 2.4 }] }, { light: ['255,170,80', 0.35, 1.6] }, { rumble: [3, 1.5] }] },
          5: { cam: { focus: ['kael'], ang: -0.10, view: 3.2, up: 1.0, pitch: 0.42, ease: 0.9 }, do: [{ who: 'kael', face: [8.4, 0.2] }, { at: 1.4, who: 'kael', face: 'braxen' }] },
          9: { cam: { focus: ['kael'], view: 3.6, ang: -0.3, pitch: 0.42, up: 0.9, ease: 0.9 }, do: [{ who: 'kael', to: [7.8, 0.2], speed: 1.0, face: [8.4, 0.2] }, { at: 1.4, who: 'kael', state: 'pickup', dur: 0.5 }, { at: 1.5, who: 'kael', pfx: [{ name: 'steam', scale: 1.4, life: 2.4, follow: true }, { name: 'fire_puff', scale: 1.4, add: true }] }, { at: 1.6, who: 'kael', state: 'hurt', dur: 0.4 }, { at: 2.2, who: 'kael', set: { stow: false, gest: 'raise' } }, { at: 2.2, light: ['255,170,80', 0.12, 1.2] }] },
          10: { cam: { focus: ['eiryn'], ang: -0.12, view: 2.8, up: 0.9, pitch: 0.42, ease: 0.9 }, do: [{ who: 'kael', set: { gest: null } }, { who: 'eiryn', to: [5.8, 1.2], speed: 1.0 }, { at: 1.0, who: 'eiryn', state: 'pickup', hold: true }] },
          12: { cam: { x: 8, y: 0, view: 13, ang: -0.1, pitch: 0.4, up: 1.4, ease: 1.8 }, do: [{ rumble: [3, 2.5] }, { shake: 4 }, { light: ['255,170,80', 0, 2.0] }, { pfx: [{ name: 'steam', x: 2, y: -4.4, scale: 3, life: 2.4 }, { name: 'steam', x: 6, y: 4.4, scale: 3, life: 2.4, delay: 0.4 }, { name: 'dust_cloud', x: 11.4, y: 0, scale: 2.6, delay: 0.8 }] }, { at: 1.2, who: 'eiryn', state: 'idle', hold: true }] },
          14: { cam: { focus: ['eiryn'], dx: 2, ang: -0.3, view: 6, pitch: 0.42, up: 0.8, ease: 1.0 }, do: [{ who: 'eiryn', face: [13, 0] }] },
        },
        'c13.ramp': {
          0: { cam: { focus: ['nox', 'aerys', 'eloryn', 'braxen', 'kael', 'eiryn'], view: 10, ang: -0.3, pitch: 0.46, ease: 1.2 }, do: [{ who: 'nox', state: 'idle', hold: true }, { who: 'eloryn', state: 'idle', hold: true }, { who: 'nox', to: [7.0, -3.6], speed: 0.6 }, { at: 1.6, who: 'nox', set: { gest: 'lean' } }, { who: 'aerys', to: [7.6, -2.8], speed: 0.7 }, { who: 'eloryn', to: [6.2, -1.8], speed: 0.8 }, { who: 'braxen', to: [4.6, -3.4], speed: 0.7 }, { who: 'kael', to: [9.2, 0.4], speed: 0.7 }, { who: 'eiryn', to: [8.4, 1.4], speed: 0.8 }, { at: 2.6, who: 'eloryn', face: 'nox' }] },
          2: { cam: { focus: ['eloryn', 'nox'], view: 4.2, ang: -0.3, pitch: 0.44, up: 0.6, ease: 0.8 }, do: [{ who: 'braxen', state: 'sit', hold: true }, { who: 'nox', set: { gest: null } }, { who: 'nox', state: 'sit', hold: true }, { who: 'eloryn', to: [6.4, -3.2], speed: 1.0, face: 'nox' }, { at: 1.0, who: 'eloryn', state: 'pickup', hold: true }, { at: 1.2, who: 'eloryn', pfx: { name: 'heal_loop', scale: 1, life: 1.8, follow: true } }] },
          3: { cam: { focus: ['eloryn', 'nox'], view: 3.2, ang: -0.3, pitch: 0.44, up: 0.6, ease: 0.8 }, do: [{ ...heal('eloryn', 'nox') }, { light: ['150,230,200', 0.2, 1.2] }, { at: 1.2, who: 'nox', icon: '…' }] },
          6: { cam: { focus: ['eloryn'], ang: -0.12, view: 2.6, up: 0.6, pitch: 0.42, ease: 0.8 }, do: [{ light: ['150,230,200', 0.05, 0.3] }, { at: 0.5, light: ['150,230,200', 0.3, 0.3] }, { at: 0.9, light: ['150,230,200', 0.06, 0.3] }, { at: 1.0, who: 'eloryn', state: 'hurt', dur: 0.3 }, { at: 1.4, who: 'eloryn', state: 'pickup', hold: true }, { at: 1.4, light: ['150,230,200', 0.3, 0.5] }, { at: 1.4, ...heal('eloryn', 'nox') }] },
          7: { cam: { focus: ['eloryn', 'nox'], view: 2.8, ang: -0.3, pitch: 0.42, up: 0.6, ease: 0.8 }, do: [{ light: ['150,230,200', 0, 1.0] }, { at: 0.8, who: 'nox', face: 'eloryn' }] },
          8: { cam: { focus: ['eloryn'], ang: -0.12, view: 2.6, up: 0.6, pitch: 0.42, ease: 0.8 }, do: [{ who: 'eloryn', face: 'nox' }] },
          10: { cam: { focus: ['eloryn', 'aerys'], view: 4, ang: -0.3, pitch: 0.44, up: 0.8, ease: 0.8 }, do: [{ who: 'eloryn', state: 'idle', hold: true }, { at: 0.5, who: 'eloryn', state: 'hurt', dur: 0.6 }, { at: 0.4, who: 'aerys', to: [6.9, -2.6], gait: 'run', speed: 2.6 }, { at: 1.0, who: 'aerys', face: 'eloryn' }] },
          11: { cam: { focus: ['eloryn', 'braxen'], view: 5, ang: -0.3, pitch: 0.44, up: 0.7, ease: 0.9 }, do: [{ who: 'eloryn', to: [5.8, -2.8], speed: 0.8, face: 'braxen' }] },
        },
        'c13.climb2': {
          0: { cam: { focus: ['eloryn', 'braxen'], view: 4, ang: -0.3, pitch: 0.44, up: 0.6, ease: 0.9 }, do: [{ who: 'eloryn', to: [5.3, -3.0], speed: 0.9, face: 'braxen' }, { at: 1.0, who: 'eloryn', state: 'pickup', hold: true }, { at: 1.2, ...heal('eloryn', 'braxen') }, { at: 1.2, light: ['150,230,200', 0.16, 1.0] }] },
          2: { cam: { focus: ['eloryn'], ang: -0.12, view: 2.6, up: 0.6, pitch: 0.42, ease: 0.8 } },
          4: { cam: { focus: ['eloryn', 'braxen'], view: 3.4, ang: -0.3, pitch: 0.44, up: 0.6, ease: 0.9 }, do: [{ ...heal('eloryn', 'braxen') }, { light: ['150,230,200', 0.08, 1.4] }] },
          5: { cam: { focus: ['eloryn', 'kael'], view: 5.4, ang: -0.3, pitch: 0.44, up: 0.8, ease: 1.0 }, do: [{ light: ['150,230,200', 0, 0.8] }, { who: 'eloryn', state: 'idle', hold: true }, { at: 0.3, who: 'eloryn', to: [8.4, 0.0], speed: 0.9 }, { who: 'kael', pfx: { name: 'steam', scale: 1.2, life: 4, follow: true } }, { at: 2.0, who: 'kael', face: 'eloryn' }] },
          9: { cam: { focus: ['kael', 'eloryn', 'aerys'], view: 5.4, ang: -0.3, pitch: 0.44, up: 0.8, ease: 0.9 }, do: [{ who: 'kael', set: { gest: null } }, { at: 0.6, ...heal('eloryn', 'kael') }, { at: 0.6, light: ['150,230,200', 0.12, 0.5] }, { at: 1.4, light: ['150,230,200', 0, 0.4] }, { at: 1.6, who: 'eloryn', state: 'hurt', dur: 0.6 }, { at: 2.0, who: 'aerys', icon: '!' }, { at: 2.0, who: 'aerys', face: 'eloryn' }] },
          10: { cam: { focus: ['eloryn', 'eiryn'], view: 4.6, ang: -0.3, pitch: 0.44, up: 0.6, ease: 1.0 }, do: [{ who: 'eloryn', state: 'sit', hold: true }, { at: 1.2, who: 'eiryn', face: 'eloryn' }] },
          12: { cam: { focus: ['kael', 'nox', 'aerys', 'braxen', 'eloryn', 'eiryn'], view: 9, ang: -0.35, pitch: 0.46, drift: 0.02, ease: 1.4 }, do: [{ who: 'eloryn', state: 'idle', hold: true }, { who: 'nox', state: 'idle', hold: true }, { who: 'braxen', state: 'idle', hold: true }, { who: 'aerys', to: [8.0, 0.6], speed: 1.2 }, ...[['kael', 11.2, 0.4], ['eiryn', 10.8, -0.4], ['aerys', 10.4, 0.6], ['eloryn', 10.0, 0.0], ['braxen', 9.4, 0.6], ['nox', 9.8, -0.8]].map(([w, x, y], i) => ({ at: 1.2 + i * 0.15, who: w, to: [x, y], speed: 0.6 }))] },
          15: { cam: { x: 12, y: 0, view: 7, ang: -0.25, pitch: 0.42, up: 1.0, ease: 1.2 }, do: [...[['kael', 12.8, 0.4], ['eiryn', 12.6, -0.4], ['aerys', 12.2, 0.6], ['eloryn', 11.8, 0.0], ['braxen', 11.2, 0.6], ['nox', 11.6, -0.8]].map(([w, x, y]) => ({ who: w, to: [x, y], speed: 0.6 })), { at: 1.6, light: ['255,240,210', 0.25, 1.2] }] },
          16: { cam: { focus: ['eloryn'], ang: -0.12, view: 2.6, up: 0.9, pitch: 0.42, ease: 0.8 }, do: [{ who: 'eloryn', face: [6, 0] }] },
        },
      } });
      for (const id of ['c13.climax2', 'c13.climax3', 'c13.sword', 'c13.ramp', 'c13.climb2']) S[id] = 'same';
      return S;
    })(),
    defs: {},
    scenarios: {},
    looks: {},
  };
});
