/*
 * Tower of Wishes — Floor One: The Hall of Frost and Mist (book chapter Twelve).
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
  const KN = (id, key, x, y, f, o) => Object.assign({ id, key, x, y, f, armed: true }, o);
  const WHITE = '226,238,250';
  const mist = (a) => ({ fade: [a, 0.6, WHITE] });

  return {
    id: 'c12',
    speakers: { knight: { name: 'Knight', tone: 'foe' } },
    nodes(h) {
      const { B, N, member } = h;
      const duel = (id, scenario, key, next, xp) => ({
        type: 'battle', chapter: 'c12', scenario, hearts: false, xp, allyLevel: true,
        party: (st) => [key === 'eirynAsh' ? Object.assign(member(st, 'eirynMage'), { key: 'eirynAsh', gear: 'eirynMage', super: 100 }) : member(st, key)], win: next,
      });
      return {
        'c12.doors': {
          type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.hall',
          lines: [
            N('The doors slam shut behind them. The echo does not fade. It travels into the Tower and keeps traveling, deeper and deeper, until the sound seems less like a door closing and more like something enormous swallowing.'),
            N('Kael turns immediately. There is no handle on the inside. No seam. No keyhole. Only carved stone buried beneath a skin of frost. Their breath fogs. The cold reaches through armor, cloth, and skin before anyone takes a second step.'),
            N('Aerys looks along the walls. Frozen climbers have been built into them like warnings. Some stand upright. Others died crawling. One reaches toward the corridor with fingers forever spread. A sword remains half drawn from another climber’s scabbard, frozen in the instant its owner tried to defend himself.'),
            B('aerys', '…They didn’t even get to run.'),
            N('Ahead stretches a long corridor. Its far end disappears into pale mist. Thin ice glazes the stone floor, slick and uneven. Frost crawls along the edges in delicate branching patterns that look uncomfortably alive.'),
            N('Eiryn looks upward into the haze near the ceiling.'),
            B('eiryn', 'It’s watching.'),
            N('No one asks how she knows.'),
          ],
        },
        'c12.hall': {
          type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.mist',
          lines: [
            N('A shape forms ahead. Tall. Armored. Still. Mist wraps itself around the figure like a cloak. A blade of frost manifests in one gauntleted hand. Kael moves to the front.'),
            B('kael', 'Stay behind me.'),
            N('The knight lunges. Too fast. Shadow folds beside Kael. Nox appears mid-stride with a blade already aimed at the knight’s throat. He should have cut it. Instead, the knight ceases to exist. Not dodged. Vanished. It reforms ten paces away, watching them.'),
            B('nox', '…Figures.'),
            N('Kael looks down at his forearm. Where the knight’s movement brushed the air around him, frost rimes the metal for a heartbeat. It recedes slowly, but numbness remains beneath it. Eloryn sees the change.'),
            B('eloryn', 'It lowers the temperature where it touches.'),
            N('Mist thickens beyond the first knight. Five more silhouettes appear. They do not walk toward the group. They seem to choose them.'),
            N('The first is massive, built like a moving wall, brass knuckles covering both fists. A lean female figure carries a spear almost absurdly long for the corridor. Another knight is narrow and quiet, holding a huge axe whose reach seems designed to punish anything quick enough to think distance is safety. A fourth carries two short blades. Plain. Efficient. Predatory. And behind them stands a horned Master Knight. It holds itself with the effortless stillness of something that does not need to prove it is dangerous.'),
            N('Kael feels the Swordsman Knight angle toward him. Aerys sees the Spear Knight shift its stance in a way that makes the open air above her suddenly feel like a trap. Nox looks at the axe. …They gave it reach. The Master Knight turns its helmet. Past Kael. Past Nox. Toward Eiryn. She does not blink. For one second, the mist around her seems heavier. Then the walls breathe. White floods the corridor.'),
          ],
        },
        'c12.mist': {
          type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.kael',
          lines: [
            N('Mist pours from the stone with enough force to become a moving wall. Visibility collapses to silhouettes. Sound dulls as though cloth has been packed over their ears.'),
            B('kael', 'TOGETHER—!'),
            N('Braxen steps backward. His boot finds a slick patch. His weight shifts too late. He hits the floor shoulder-first. Eloryn reaches toward him.'),
            B('eloryn', 'BRAX—!'),
            N('Mist erupts between them. Kael lunges toward the sound. The corridor changes. Stone moves beneath the fog. Distance bends. Sound lies. When the white thins, Kael stands alone. The passage behind him no longer exists.'),
            N('Elsewhere, Braxen pushes himself up from ice-slick stone and finds no one around him. Aerys stands with mist coiling around her ankles. Eloryn’s hands glow weakly in panic. Nox listens to footsteps he cannot see. And Eiryn stands alone while the mist seems unwilling to touch her completely.'),
            N('The Tower has not brought them inside to test a group. It has separated the group to find the places each person breaks.'),
          ],
        },

        // ---- Kael and the Swordsman Knight
        'c12.kael': {
          type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.d1',
          lines: [
            N('The Swordsman Knight steps through the mist toward Kael. Its stance is perfect. Kael raises his sword. His hands are steady. His jaw is not.'),
            N('They collide. Steel strikes frost with a violent crack. Sparks jump from the blades and die in the cold before they can fall. The knight moves inside Kael’s guard with precision that feels insulting. Its edge crosses his forearm. The cut is shallow. The cold is not. Frost crawls outward from the wound in branching veins.'),
            N('It’s not freezing me. The realization comes as he blocks another strike. It’s lowering me. Piece by piece.'),
            N('Nox’s training surfaces in his mind with irritating clarity. You lead with your heart. Good. Just don’t let it swing first. Kael changes his rhythm. The knight changes with him.'),
          ],
        },
        'c12.d1': duel('c12.d1', 'duelKael', 'kael', 'c12.kael2', 60),
        'c12.kael2': {
          type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.braxen',
          lines: [
            N('Kael commits everything. His sword comes down with enough force to split armor. The Swordsman Knight meets it at exactly the right angle. CRACK. Kael’s blade shatters. For an instant, fragments hang between them. Then a fracture races through the knight’s frost sword. Its weapon breaks too. Both stand in the corridor unarmed. Breath fogging. Kael almost smiles.'),
            N('The knight punches him in the ribs. He flies backward and strikes stone hard enough to empty his lungs. A boot drives into his chest. Something cracks. Blood comes up his throat. It hits the floor and steams faintly. Not yet. Kael pushes himself up. He swings a fist. Misses. The knight counters across his jaw. He falls again. Then stands again. Worse posture. Same will.'),
            N('Another punch buries itself in his stomach. Kael folds around it — and grabs the knight’s arm. Instead of retreating from the hit, he pulls himself closer.'),
            B('kael', '…You’re not putting me down.'),
            N('The knight strikes his face. Kael does not flinch. Something in him goes quiet. His fist drives into the center of the knight’s chest. Frost fractures outward in a perfect spiderweb. The Swordsman Knight explodes into ice.'),
            N('Kael drops to one knee among the shards. His body shakes uncontrollably. Frost covers his wounds. Every breath feels stolen. But he is alive.'),
          ],
        },

        // ---- Braxen and the Juggernaut Knight
        'c12.braxen': {
          type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.d2',
          lines: [
            N('Braxen finds his opponent waiting through the mist. A Juggernaut Knight. It is nearly as broad as he is, and both armored fists end in brass knuckles the size of stones. Braxen pushes himself upright from the fall. The Juggernaut does not draw a weapon. It raises its hands.'),
            B('braxen', 'Yeah. Figures.'),
            N('The first punch lifts him off the ground. He hits a pillar hard enough to crack stone. Pain spreads through his ribs. Braxen spits blood onto the ice and grins.'),
            B('braxen', 'Good.'),
          ],
        },
        'c12.d2': duel('c12.d2', 'duelBraxen', 'braxen', 'c12.braxen2', 60),
        'c12.braxen2': {
          type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.aerys',
          lines: [
            N('He charges. The Juggernaut meets him with full bodyweight. Brass knuckles crush into Braxen’s side. Cold follows the impact, stiffening muscle beneath the skin. Braxen answers with a hook to the helmet. Metal rings through the corridor like a bell. They collide chest-to-chest. Braxen catches the knight’s wrists. The Juggernaut grips his shoulders. Neither moves. They squeeze.'),
            N('The knight headbutts him. Once. Again. Frost blooms across Braxen’s cheek and neck. His breath shortens. Something animal opens its eyes inside him. Braxen bites the knight. His teeth sink into the frozen plating around its neck. Ice breaks away in chunks. The Juggernaut hammers brass fists into his back. Braxen stays attached. Another bite. Deeper. A crack appears at the base of the helmet.'),
            N('Braxen pulls away with blood and frost on his mouth. Then drives his forehead into the weakened seam with everything he has left. The helmeted head breaks free. The body takes one blind step. Then shatters. Braxen leans against the pillar and spits broken frost onto the floor.'),
            B('braxen', '…Worth it.'),
          ],
        },

        // ---- Aerys and the Spear Knight
        'c12.aerys': {
          type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.aerys2',
          lines: [
            N('Aerys’s heart beats too loudly in the mist. The Spear Knight steps into view. Thin. Female in silhouette. A weapon so long that it seems impossible to fight around. The spear tip touches stone. Frost draws a line across the floor toward Aerys’s feet.'),
            N('Aerys fires first. Light leaves both hands in rapid bursts. Too fast. Too frightened. The knight rotates the spear with minimal movement. One beam deflects into mist. Another passes wide. A third scatters off the shaft. Nothing lands cleanly. Aerys rises into the air. Distance has always made her safer.'),
            N('The Spear Knight vanishes. It appears beside her in the air. The spear is already moving. Its blade crosses Aerys’s upper arm. Cold erupts through the wound. Her arm becomes heavy. Fear sharpens. It’s punishing flight. Aerys drops. Not falling. Choosing ground. She lowers herself until bare feet touch stone. The spear waits.'),
          ],
        },
        'c12.aerys2': {
          type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.d3',
          lines: [
            N('And somewhere beneath fear, memory opens. A bright courtyard. A younger version of herself reaching for light again and again. An older hand correcting her stance.'),
            B('teacher', 'You keep reaching for light.'),
            N('A tap against her sternum.'),
            B('teacher', 'But your body is a weapon too.'),
            N('Other angels watch from the edge of the training circle.'),
            B('teacher', 'Because you glow, they will come.'),
            N('The voice remains calm.'),
            B('teacher', 'So you learn to win with nothing.'),
            N('Her feet are moved into a crescent angle. Hands open. Palms offset. Shoulders relaxed. Weight light without becoming unstable.'),
            B('teacher', 'Stillwing.'),
            N('The name had sounded almost gentle.'),
            B('teacher', 'Like you have wings — without needing them.'),
            N('Aerys opens her eyes in the present. One breath. Steady.'),
          ],
        },
        'c12.d3': duel('c12.d3', 'duelAerys', 'aerys', 'c12.aerys3', 60),
        'c12.aerys3': {
          type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.eloryn',
          lines: [
            N('The Spear Knight thrusts. Aerys pivots. The blade passes inches from her cheek. She steps inside the reach and strikes the shaft with her palm, redirecting the line of attack. The knight vanishes. Aerys moves with the absence. When it reforms, she is already turning around its back. Hip control. Balance taken. No light. No flight. Aerys snaps the knight’s neck. The body shatters silently.'),
            N('She stands alone in the settling frost. Her whole body trembles now. Not fear. Release. She looks at the wound on her arm. She has won without leaving the ground.'),
          ],
        },

        // ---- Eloryn and the Twin-Blade Knight
        'c12.eloryn': {
          type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.d4',
          lines: [
            N('Eloryn backs away from the plainest knight. That makes it worse. No horned armor. No massive weapon. No visible trick. Two short blades. A posture designed for killing quickly. Her hands rise. Healing light pushes outward like a shove. The knight slows only slightly.'),
            N('Its first cut targets her fingers. Eloryn jerks them away in time, but cold bites through the air around her hands. It wants to stop me from healing. The second blade enters her side. Pain erases thought. Temperature drops around the wound. Cloth crusts with ice. Eloryn hits the floor gasping.'),
            N('The knight follows at walking pace. She crawls. Her fingers scrape stone. Both hands press against the wound. Green-white light fights against the cold trying to lock the injury open.'),
            B('eloryn', '…not yet…'),
          ],
        },
        'c12.d4': duel('c12.d4', 'duelEloryn', 'eloryn', 'c12.eloryn2', 60),
        'c12.eloryn2': {
          type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.nox',
          lines: [
            N('The knight raises both blades. Eloryn’s light flickers. The weapons descend. She releases everything outward. Not force. Life. Healing energy floods the space around her in a violent pulse. The knight staggers as though choking on something it has never been built to contain. Cracks form along its arms and torso. It tries to take another step. Its body fails to hold shape. The knight shatters.'),
            N('Eloryn remains on the ground. Blood darkens the stone beneath her. Her hands have changed. Veins stand dark beneath skin that looks suddenly older, scarred and wrinkled as though years have passed through it in seconds. She tries to rise. Her stomach revolts. Eloryn turns and vomits onto the ice. Then she presses one shaking hand back to her side. One breath. Another. Alive. Barely.'),
          ],
        },

        // ---- Nox and the Axe Knight
        'c12.nox': {
          type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.d5',
          lines: [
            N('Nox studies the axe. The Assassin Knight carrying it is thin enough to look almost fragile. That is a lie. The weapon gives it reach. Its stance gives it timing. It has been made to catch speed.'),
            N('Nox vanishes. He reappears at the neck with a perfect killing angle. The knight pivots and blocks with the broad head of the axe. One movement. No panic. Nox’s eyes narrow. It’s fast. He accelerates. Afterimages fill the mist. Blades come from angles that have ended other fights before the opponent understood where he was. The knight ghost-steps between them. Not faster than Nox. Always correct. Steel misses by microscopic distances.'),
            N('Nox drops from above with both blades pointed down. The axe swings upward. He kicks off the weapon in midair and ricochets away. Another multi-angle chain. The knight vanishes before each cut lands. Then the axe clips Nox’s shoulder. The wound steams. Frost spreads around it. His arm grows heavier. Nox looks at the injury.'),
            B('nox', '…Okay.'),
            N('He wipes blood from his lip.'),
            B('nox', 'I wasn’t planning on using this yet…'),
          ],
        },
        'c12.d5': duel('c12.d5', 'duelNox', 'nox', 'c12.nox2', 60),
        'c12.nox2': {
          type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.eiryn',
          lines: [
            N('The knight huffs through its helmet, almost laughter. Nox’s eyes sharpen.'),
            B('nox', '…I hate this move. It drains the shit out of me.'),
            N('The Axe Knight charges. Urgent now. Afraid. Nox inhales. Violent blue-purple pressure flickers around his body. The mist slows. Individual droplets seem to hang in the air like frozen smoke. Nox steps forward. For one impossible instant, everything goes still. Then a thousand cuts appear at once.'),
            N('The Axe Knight does not fall. It simply fails to remain whole. Fragments scatter across the stone. Nox sways. His knees nearly buckle.'),
            B('nox', '…Can’t use that again for a little while.'),
            N('No one is there to hear him.'),
          ],
        },

        // ---- Eiryn and the Master Knight
        'c12.eiryn': {
          type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.d6',
          lines: [
            N('The mist clears around Eiryn. The Master Knight approaches. Horned helmet. Devilish shape. Perfect posture. It does not rush. It measures her. Eiryn measures nothing. She simply waits.'),
            N('The knight circles. Slow. Unblinking. Two predators stand inside a silence the Tower has manufactured for them. The mist refuses to drift between them. At last, the Master Knight strikes. One clean attack. Perfectly placed. The blade stops inches from Eiryn’s skin. Sound vanishes. Eiryn’s lips move. No one hears the word.'),
          ],
        },
        'c12.d6': duel('c12.d6', 'duelEiryn', 'eirynAsh', 'c12.end', 40),
        'c12.end': {
          type: 'scene', chapter: 'c12', bg: 'summit', next: 'c13.enter',
          lines: [
            N('The Master Knight’s helmet tilts. Confused. Then, in the final fraction of its existence, it seems to understand something. It has chosen wrong.'),
            N('The horned knight is annihilated. Not broken. Not shattered. Erased. A shockwave tears through the corridor. Mist blasts outward like smoke before a cannon. For the first time, the hall becomes visible far beyond any distance the group has been allowed to see. Empty. Clear. And then sound comes back.'),
          ],
        },
      };
    },
    stages: (() => { const S = {
      'c12.doors': auto('frosthall', [K(-1.0, 2.6, -1.6), AE(-2.4, 2.8, -1.6), EL(-3.2, 3.4, -1.6), BR(-1.8, 3.6, -1.6), E(-4.0, 2.8, -1.6), NX(-0.2, 3.4, -1.6)], {
        noFace: true,
        nodes: { 'c12.doors': {
          0: { cam: { x: -2, y: 3.0, view: 9, ang: 0.0, pitch: 0.4, up: 1.4, ease: 1.2 }, do: [{ door: [0, 0.2] }, { rumble: [5, 1.2] }, { shake: 8 }] },
          1: { cam: { face: 'kael', side: 0.5, view: 3.6, up: 1.0, pitch: 0.42, ease: 1.0 }, do: [{ who: 'kael', face: [-2, 7], icon: '!' }] },
          2: { cam: { x: -5.8, y: 2.8, view: 5, ang: -0.3, pitch: 0.42, up: 0.8, ease: 1.2 } },
          3: { cam: { face: 'aerys', side: 0.4, view: 3.6, up: 1.0, pitch: 0.42, ease: 0.8 } },
          4: { cam: { x: 0, y: -2, view: 11, ang: -0.1, pitch: 0.4, up: 1.6, ease: 1.6 }, do: [mist(0.18)] },
          5: { cam: { face: 'eiryn', side: 0.3, view: 3.4, up: 1.1, pitch: 0.42, ease: 1.0 }, do: [{ who: 'eiryn', face: [0, -6] }] },
        } },
      }),
      'c12.hall': auto('frosthall', [K(-2.4, 1.4, 0, { armed: true }), AE(-4.0, 0.8, 0, { armed: true }), EL(-4.8, 1.8, 0, { armed: true }), BR(-3.4, 2.4, 0), E(-5.4, 1.0, 0), NX(-1.8, 0.4, 0, { armed: true }),
        KN('kn1', 'knightSword', 4.0, 1.0, 3.14, { hidden: true }), KN('kn2', 'knightFist', 5.4, 2.0, 3.14, { hidden: true }), KN('kn3', 'knightSpear', 5.6, -0.6, 3.14, { hidden: true }),
        KN('kn4', 'knightAxe', 6.4, 0.8, 3.14, { hidden: true }), KN('kn5', 'knightTwin', 6.2, -1.8, 3.14, { hidden: true }), KN('kn6', 'knightMaster', 7.4, 0.2, 3.14, { hidden: true })], {
        noFace: true, armed: true,
        nodes: { 'c12.hall': {
          0: { cam: { focus: ['kael', 'kn1'], view: 8, ang: -0.3, pitch: 0.44, ease: 1.2 }, do: [{ who: 'kn1', show: true, blink: [4.0, 1.0] }, { who: 'kael', set: { stow: false, gest: null } }, { who: 'nox', set: { stow: false, gest: null } }, { who: 'aerys', set: { stow: false } }] },
          1: { cam: { face: 'kael', side: -0.35, view: 3.4, up: 1.1, pitch: 0.42, ease: 0.8 } },
          2: { cam: { focus: ['kael', 'nox', 'kn1'], view: 7, ang: -0.3, pitch: 0.42, ease: 0.3 }, do: [{ who: 'kn1', to: [-0.4, 1.4], gait: 'dash', speed: 8 }, { at: 0.3, who: 'nox', blink: [0.4, 0.8] }, { at: 0.4, who: 'nox', attack: { wind: 0.1, active: 0.1, recover: 0.3, tele: false } }, { at: 0.5, who: 'kn1', blink: [4.4, 1.0] }, { at: 0.5, shake: 5 }] },
          3: { cam: { face: 'nox', side: 0.3, view: 3.2, up: 1.1, pitch: 0.42, ease: 0.7 } },
          4: { cam: { face: 'eloryn', side: 0.3, view: 3.6, up: 1.1, pitch: 0.42, ease: 0.8 } },
          5: { cam: { focus: ['kn1', 'kn2', 'kn3', 'kn4', 'kn5', 'kn6'], view: 11, ang: -0.25, pitch: 0.4, up: 0.8, ease: 1.4 }, do: [mist(0.15), { who: 'kn2', show: true }, { who: 'kn3', show: true }, { who: 'kn4', show: true }, { who: 'kn5', show: true }, { who: 'kn6', show: true }, { who: 'kn6', face: 'eiryn' }] },
          6: { cam: { face: 'kn6', side: 0.35, view: 3.4, up: 1.3, pitch: 0.4, ease: 1.4 }, do: [{ who: 'eiryn', face: 'kn6' }, { at: 1.6, fade: [0.95, 0.7, WHITE] }] },
        } },
      }),
      'c12.mist': auto('frosthall', [K(-3.0, 0.8, 0), AE(-4.0, 0.4, 0), EL(-4.8, 1.8, 0), BR(-3.6, 2.2, 0), E(-5.4, 0.8, 0), NX(-2.2, 1.8, 0)], {
        noFace: true,
        nodes: { 'c12.mist': {
          0: { cam: { focus: ['kael', 'aerys', 'eloryn', 'braxen', 'eiryn', 'nox'], view: 9, ang: -0.3, pitch: 0.46, ease: 0.6 }, do: [{ fade: [0.9, 0.8, WHITE] }] },
          1: { do: [{ who: 'kael', say: 'TOGETHER—!' }, { who: 'kael', icon: '!' }] },
          2: { cam: { focus: ['braxen', 'eloryn'], view: 5, ang: -0.3, pitch: 0.46, ease: 0.5 }, do: [{ who: 'braxen', state: 'down', knock: [-0.4, 0], hold: true }, { who: 'eloryn', to: [-3.9, 2.0], speed: 2 }] },
          3: { do: [{ who: 'eloryn', say: 'BRAX—!' }, { shake: 6 }, { fade: [1.0, 0.3, WHITE] }] },
          4: { cam: { face: 'kael', side: 0.35, view: 3.6, up: 1.0, pitch: 0.42, ease: 0.8, cut: true }, do: [{ fade: [0.0, 1.2] }, { who: 'aerys', hide: true }, { who: 'eloryn', hide: true }, { who: 'braxen', hide: true }, { who: 'nox', hide: true }, { who: 'eiryn', hide: true }, { who: 'kael', put: [-2.0, 0.4] }] },
          5: { cam: { focus: ['kael'], view: 12, ang: -0.3, pitch: 0.34, up: 1.2, ease: 1.8 }, do: [{ fade: [0.35, 1.0, WHITE] }] },
          6: { cam: { face: 'kael', side: 0.4, view: 3.4, up: 1.0, pitch: 0.42, ease: 1.4 }, do: [{ fade: [0.0, 1.2] }] },
        } },
      }),
    };
    // Each fighter alone with their knight (the Tower separated them): one stage per
    // fight, shared by the scenes before and after it.
    const solo = (hero, knightKey, knightId, ids, o) => {
      const cast = [Object.assign({}, hero, { armed: true }), KN('knight', knightKey, 1.8, hero.y, 3.14)];
      const def = auto('frosthall', cast, { armed: true, noFace: true, close: 3.4, wide: { view: 5.4 } });
      return def;
    };
    const dissolve = [{ who: 'knight', hide: true }, { fx: { type: 'dissolve', x: 1.8, y: 0.4, big: true } }, { shake: 6 }];
    const pairs = [
      ['kael', K(-1.8, 0.4, 0), 'knightSword', ['c12.kael', 'c12.kael2']],
      ['braxen', BR(-1.8, 0.4, 0), 'knightFist', ['c12.braxen', 'c12.braxen2']],
      ['aerys', AE(-1.8, 0.4, 0), 'knightSpear', ['c12.aerys', 'c12.aerys2', 'c12.aerys3']],
      ['eloryn', EL(-1.8, 0.4, 0), 'knightTwin', ['c12.eloryn', 'c12.eloryn2']],
      ['nox', NX(-1.8, 0.4, 0), 'knightAxe', ['c12.nox', 'c12.nox2']],
      ['eiryn', E(-1.8, 0.4, 0), 'knightMaster', ['c12.eiryn']],
    ];
    for (const [, hero, kk, ids] of pairs) {
      ids.forEach((id, i) => {
        const def = solo(hero, kk);
        const last = i === ids.length - 1;
        def.auto.nodes = { [id]: { 0: { cam: { focus: ['knight', hero.id], view: 5.2, ang: -0.3, pitch: 0.46, ease: 1.0 }, do: [mist(0), { who: hero.id, set: { stow: false, gest: null } }].concat(i > 0 && last && ids.length > 1 ? dissolve : []) } } };
        S[id] = i === 0 ? def : (ids.length > 2 && i === 1 ? def : def);
      });
    }
    // the closing blast: the hall opens up
    S['c12.end'] = auto('frosthall', [E(-1.8, 0.4, 0, { armed: true }), KN('knight', 'knightMaster', 1.8, 0.4, 3.14)], {
      noFace: true,
      nodes: { 'c12.end': {
        0: { cam: { face: 'knight', side: 0.35, view: 3.2, up: 1.3, pitch: 0.4, ease: 0.8 }, do: [{ who: 'knight', icon: '?' }] },
        1: { cam: { focus: ['eiryn'], view: 14, ang: -0.1, pitch: 0.4, up: 0.8, ease: 0.4 }, do: [{ who: 'knight', hide: true }, { fx: { type: 'dissolve', x: 1.8, y: 0.4, big: true } }, { shake: 14 }, { fade: [1.0, 0.15, WHITE] }, { at: 0.2, fade: [0.0, 1.4] }] },
      } },
    });
    // The post-fight scenes: the knight is gone.
    for (const id of ['c12.kael2', 'c12.braxen2', 'c12.aerys3', 'c12.eloryn2', 'c12.nox2']) {
      const d = S[id]; d.auto.nodes[id][0].do = [{ who: 'knight', hide: true }, { fx: { type: 'dissolve', x: 1.8, y: 0.4, big: false } }].concat(d.auto.nodes[id][0].do.slice(0, 2));
    }
    return S; })(),
    defs: {},
    scenarios: {},
    looks: {},
  };
});
