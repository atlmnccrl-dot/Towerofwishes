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
      const { B, N, X, member } = h;
      const duel = (id, scenario, key, next, xp) => ({
        type: 'battle', chapter: 'c12', scenario, wounds: false, xp, allyLevel: true,
        party: (st) => [key === 'eirynAsh' ? Object.assign(member(st, 'eirynMage'), { key: 'eirynAsh', gear: 'eirynMage', super: 100 }) : member(st, key)], win: next,
      });
      return {
        'c12.doors': {
          type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.hall',
          lines: [
            X('The doors slam shut behind them. The echo does not fade. It travels into the Tower and keeps traveling, deeper and deeper, until the sound seems less like a door closing and more like something enormous swallowing.'),
            X('Aerys looks along the walls. Frozen climbers have been built into them like warnings. Some stand upright. Others died crawling. One reaches toward the corridor with fingers forever spread. A sword remains half drawn from another climber’s scabbard, frozen in the instant its owner tried to defend himself.'),
            B('aerys', '…They didn’t even get to run.'),
            X('Ahead stretches a long corridor. Its far end disappears into pale mist. Thin ice glazes the stone floor, slick and uneven. Frost crawls along the edges in delicate branching patterns that look uncomfortably alive.'),
            B('eiryn', 'It’s watching.'),
          ],
        },
        'c12.hall': {
          type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.mist',
          lines: [
            X('A shape forms ahead. Tall. Armored. Still. Mist wraps itself around the figure like a cloak. A blade of frost manifests in one gauntleted hand. Kael moves to the front.'),
            X('The knight lunges. Too fast. Shadow folds beside Kael. Nox appears mid-stride with a blade already aimed at the knight’s throat. He should have cut it. Instead, the knight ceases to exist. Not dodged. Vanished. It reforms ten paces away, watching them.'),
            B('nox', '…Figures.'),
            X('Kael looks down at his forearm. Where the knight’s movement brushed the air around him, frost rimes the metal for a heartbeat. It recedes slowly, but numbness remains beneath it. Eloryn sees the change.'),
            B('eloryn', 'It lowers the temperature where it touches.'),
            X('Mist thickens beyond the first knight. Five more silhouettes appear. They do not walk toward the group. They seem to choose them.'),
            X('The first is massive, built like a moving wall, brass knuckles covering both fists. A lean female figure carries a spear almost absurdly long for the corridor. Another knight is narrow and quiet, holding a huge axe whose reach seems designed to punish anything quick enough to think distance is safety. A fourth carries two short blades. Plain. Efficient. Predatory. And behind them stands a horned Master Knight. It holds itself with the effortless stillness of something that does not need to prove it is dangerous.'),
            X('Kael feels the Swordsman Knight angle toward him. Aerys sees the Spear Knight shift its stance in a way that makes the open air above her suddenly feel like a trap. Nox looks at the axe. …They gave it reach. The Master Knight turns its helmet. Past Kael. Past Nox. Toward Eiryn. She does not blink. For one second, the mist around her seems heavier. Then the walls breathe. White floods the corridor.'),
          ],
        },
        'c12.mist': {
          type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.kael',
          lines: [
            X('Mist pours from the stone with enough force to become a moving wall. Visibility collapses to silhouettes. Sound dulls as though cloth has been packed over their ears.'),
            B('kael', 'TOGETHER—!'),
            X('Braxen steps backward. His boot finds a slick patch. His weight shifts too late. He hits the floor shoulder-first. Eloryn reaches toward him.'),
            B('eloryn', 'BRAX—!'),
            X('Mist erupts between them. Kael lunges toward the sound. The corridor changes. Stone moves beneath the fog. Distance bends. Sound lies. When the white thins, Kael stands alone. The passage behind him no longer exists.'),
            X('Elsewhere, Braxen pushes himself up from ice-slick stone and finds no one around him. Aerys stands with mist coiling around her ankles. Eloryn’s hands glow weakly in panic. Nox listens to footsteps he cannot see. And Eiryn stands alone while the mist seems unwilling to touch her completely.'),
          ],
        },

        // ---- Kael and the Swordsman Knight
        'c12.kael': {
          type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.d1',
          lines: [
            X('The Swordsman Knight steps through the mist toward Kael. Its stance is perfect. Kael raises his sword. His hands are steady. His jaw is not.'),
            X('They collide. Steel strikes frost with a violent crack. Sparks jump from the blades and die in the cold before they can fall. The knight moves inside Kael’s guard with precision that feels insulting. Its edge crosses his forearm. The cut is shallow. The cold is not. Frost crawls outward from the wound in branching veins.'),
            X('Nox’s training surfaces in his mind with irritating clarity. You lead with your heart. Good. Just don’t let it swing first. Kael changes his rhythm. The knight changes with him.'),
          ],
        },
        'c12.d1': duel('c12.d1', 'duelKael', 'kael', 'c12.kael2', 60),
        'c12.kael2': {
          type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.braxen',
          lines: [
            X('Kael commits everything. His sword comes down with enough force to split armor. The Swordsman Knight meets it at exactly the right angle. CRACK. Kael’s blade shatters. For an instant, fragments hang between them. Then a fracture races through the knight’s frost sword. Its weapon breaks too. Both stand in the corridor unarmed. Breath fogging. Kael almost smiles.'),
            X('The knight punches him in the ribs. He flies backward and strikes stone hard enough to empty his lungs. A boot drives into his chest. Something cracks. Blood comes up his throat. It hits the floor and steams faintly. Not yet. Kael pushes himself up. He swings a fist. Misses. The knight counters across his jaw. He falls again. Then stands again. Worse posture. Same will.'),
            X('Another punch buries itself in his stomach. Kael folds around it — and grabs the knight’s arm. Instead of retreating from the hit, he pulls himself closer.'),
            B('kael', '…You’re not putting me down.'),
            X('The knight strikes his face. Kael does not flinch. Something in him goes quiet. His fist drives into the center of the knight’s chest. Frost fractures outward in a perfect spiderweb. The Swordsman Knight explodes into ice.'),
            X('Kael drops to one knee among the shards. His body shakes uncontrollably. Frost covers his wounds. Every breath feels stolen. But he is alive.'),
          ],
        },

        // ---- Braxen and the Juggernaut Knight
        'c12.braxen': {
          type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.d2',
          lines: [
            X('Braxen finds his opponent waiting through the mist. A Juggernaut Knight. It is nearly as broad as he is, and both armored fists end in brass knuckles the size of stones. Braxen pushes himself upright from the fall. The Juggernaut does not draw a weapon. It raises its hands.'),
            B('braxen', 'Yeah. Figures.'),
            X('The first punch lifts him off the ground. He hits a pillar hard enough to crack stone. Pain spreads through his ribs. Braxen spits blood onto the ice and grins.'),
            B('braxen', 'Good.'),
          ],
        },
        'c12.d2': duel('c12.d2', 'duelBraxen', 'braxen', 'c12.braxen2', 60),
        'c12.braxen2': {
          type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.aerys',
          lines: [
            X('He charges. The Juggernaut meets him with full bodyweight. Brass knuckles crush into Braxen’s side. Cold follows the impact, stiffening muscle beneath the skin. Braxen answers with a hook to the helmet. Metal rings through the corridor like a bell. They collide chest-to-chest. Braxen catches the knight’s wrists. The Juggernaut grips his shoulders. Neither moves. They squeeze.'),
            X('The knight headbutts him. Once. Again. Frost blooms across Braxen’s cheek and neck. His breath shortens. Something animal opens its eyes inside him. Braxen bites the knight. His teeth sink into the frozen plating around its neck. Ice breaks away in chunks. The Juggernaut hammers brass fists into his back. Braxen stays attached. Another bite. Deeper. A crack appears at the base of the helmet.'),
            X('Braxen pulls away with blood and frost on his mouth. Then drives his forehead into the weakened seam with everything he has left. The helmeted head breaks free. The body takes one blind step. Then shatters. Braxen leans against the pillar and spits broken frost onto the floor.'),
            B('braxen', '…Worth it.'),
          ],
        },

        // ---- Aerys and the Spear Knight
        'c12.aerys': {
          type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.aerys2',
          lines: [
            X('Aerys’s heart beats too loudly in the mist. The Spear Knight steps into view. Thin. Female in silhouette. A weapon so long that it seems impossible to fight around. The spear tip touches stone. Frost draws a line across the floor toward Aerys’s feet.'),
            X('Aerys fires first. Light leaves both hands in rapid bursts. Too fast. Too frightened. The knight rotates the spear with minimal movement. One beam deflects into mist. Another passes wide. A third scatters off the shaft. Nothing lands cleanly. Aerys rises into the air. Distance has always made her safer.'),
            X('The Spear Knight vanishes. It appears beside her in the air. The spear is already moving. Its blade crosses Aerys’s upper arm. Cold erupts through the wound. Her arm becomes heavy. Fear sharpens. It’s punishing flight. Aerys drops. Not falling. Choosing ground. She lowers herself until bare feet touch stone. The spear waits.'),
          ],
        },
        'c12.aerys2': {
          type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.d3',
          lines: [
            X('And somewhere beneath fear, memory opens. A bright courtyard. A younger version of herself reaching for light again and again. An older hand correcting her stance.'),
            B('teacher', 'You keep reaching for light.'),
            B('teacher', 'But your body is a weapon too.'),
            B('teacher', 'So you learn to win with nothing.'),
            X('Her feet are moved into a crescent angle. Hands open. Palms offset. Shoulders relaxed. Weight light without becoming unstable.'),
            B('teacher', 'Stillwing.'),
            X('Aerys opens her eyes in the present. One breath. Steady.'),
          ],
        },
        'c12.d3': duel('c12.d3', 'duelAerys', 'aerys', 'c12.aerys3', 60),
        'c12.aerys3': {
          type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.eloryn',
          lines: [
            X('The Spear Knight thrusts. Aerys pivots. The blade passes inches from her cheek. She steps inside the reach and strikes the shaft with her palm, redirecting the line of attack. The knight vanishes. Aerys moves with the absence. When it reforms, she is already turning around its back. Hip control. Balance taken. No light. No flight. Aerys snaps the knight’s neck. The body shatters silently.'),
            X('She stands alone in the settling frost. Her whole body trembles now. Not fear. Release. She looks at the wound on her arm. She has won without leaving the ground.'),
          ],
        },

        // ---- Eloryn and the Twin-Blade Knight
        'c12.eloryn': {
          type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.d4',
          lines: [
            X('Eloryn backs away from the plainest knight. That makes it worse. No horned armor. No massive weapon. No visible trick. Two short blades. A posture designed for killing quickly. Her hands rise. Healing light pushes outward like a shove. The knight slows only slightly.'),
            X('Its first cut targets her fingers. Eloryn jerks them away in time, but cold bites through the air around her hands. It wants to stop me from healing. The second blade enters her side. Pain erases thought. Temperature drops around the wound. Cloth crusts with ice. Eloryn hits the floor gasping.'),
            X('The knight follows at walking pace. She crawls. Her fingers scrape stone. Both hands press against the wound. Green-white light fights against the cold trying to lock the injury open.'),
            B('eloryn', '…not yet…'),
          ],
        },
        'c12.d4': duel('c12.d4', 'duelEloryn', 'eloryn', 'c12.eloryn2', 60),
        'c12.eloryn2': {
          type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.nox',
          lines: [
            X('The knight raises both blades. Eloryn’s light flickers. The weapons descend. She releases everything outward. Not force. Life. Healing energy floods the space around her in a violent pulse. The knight staggers as though choking on something it has never been built to contain. Cracks form along its arms and torso. It tries to take another step. Its body fails to hold shape. The knight shatters.'),
            X('Eloryn remains on the ground. Blood darkens the stone beneath her. Her hands have changed. Veins stand dark beneath skin that looks suddenly older, scarred and wrinkled as though years have passed through it in seconds. She tries to rise. Her stomach revolts. Eloryn turns and vomits onto the ice. Then she presses one shaking hand back to her side. One breath. Another. Alive. Barely.'),
          ],
        },

        // ---- Nox and the Axe Knight
        'c12.nox': {
          type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.d5',
          lines: [
            X('Nox studies the axe. The Assassin Knight carrying it is thin enough to look almost fragile. That is a lie. The weapon gives it reach. Its stance gives it timing. It has been made to catch speed.'),
            X('Nox vanishes. He reappears at the neck with a perfect killing angle. The knight pivots and blocks with the broad head of the axe. One movement. No panic. Nox’s eyes narrow. It’s fast. He accelerates. Afterimages fill the mist. Blades come from angles that have ended other fights before the opponent understood where he was. The knight ghost-steps between them. Not faster than Nox. Always correct. Steel misses by microscopic distances.'),
            X('Nox drops from above with both blades pointed down. The axe swings upward. He kicks off the weapon in midair and ricochets away. Another multi-angle chain. The knight vanishes before each cut lands. Then the axe clips Nox’s shoulder. The wound steams. Frost spreads around it. His arm grows heavier. Nox looks at the injury.'),
            B('nox', '…Okay.'),
            B('nox', 'I wasn’t planning on using this yet…'),
          ],
        },
        'c12.d5': duel('c12.d5', 'duelNox', 'nox', 'c12.nox2', 60),
        'c12.nox2': {
          type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.eiryn',
          lines: [
            X('The knight huffs through its helmet, almost laughter. Nox’s eyes sharpen.'),
            B('nox', '…I hate this move. It drains the shit out of me.'),
            X('The Axe Knight charges. Urgent now. Afraid. Nox inhales. Violent blue-purple pressure flickers around his body. The mist slows. Individual droplets seem to hang in the air like frozen smoke. Nox steps forward. For one impossible instant, everything goes still. Then a thousand cuts appear at once.'),
            X('The Axe Knight does not fall. It simply fails to remain whole. Fragments scatter across the stone. Nox sways. His knees nearly buckle.'),
          ],
        },

        // ---- Eiryn and the Master Knight
        'c12.eiryn': {
          type: 'scene', chapter: 'c12', bg: 'summit', next: 'c12.d6',
          lines: [
            X('The mist clears around Eiryn. The Master Knight approaches. Horned helmet. Devilish shape. Perfect posture. It does not rush. It measures her. Eiryn measures nothing. She simply waits.'),
            X('The knight circles. Slow. Unblinking. Two predators stand inside a silence the Tower has manufactured for them. The mist refuses to drift between them. At last, the Master Knight strikes. One clean attack. Perfectly placed. The blade stops inches from Eiryn’s skin. Sound vanishes. Eiryn’s lips move. No one hears the word.'),
          ],
        },
        'c12.d6': duel('c12.d6', 'duelEiryn', 'eirynAsh', 'c12.end', 40),
        'c12.end': {
          type: 'scene', chapter: 'c12', bg: 'summit', next: 'c13.enter',
          lines: [
            X('The Master Knight’s helmet tilts. Confused. Then, in the final fraction of its existence, it seems to understand something. It has chosen wrong.'),
            X('The horned knight is annihilated. Not broken. Not shattered. Erased. A shockwave tears through the corridor. Mist blasts outward like smoke before a cannon. For the first time, the hall becomes visible far beyond any distance the group has been allowed to see. Empty. Clear. And then sound comes back.'),
          ],
        },
      };
    },
    stages: (() => {
      const along = (name, x0, y0, x1, y1, n, step, o) => Array.from({ length: n }, (_, i) => Object.assign({ name, x: x0 + (x1 - x0) * i / (n - 1), y: y0 + (y1 - y0) * i / (n - 1), delay: i * step }, o));
      const hit = (who, name, at, o) => Object.assign({ at, who, pfx: Object.assign({ name, z: 1.3, scale: 1.8 }, o && o.pfx) }, o && o.extra);
      const shatter = (at, x, y) => [{ at, who: 'knight', hide: true }, { at, pfx: [{ name: 'ice_shatter', x, y, z: 1.0, scale: 2.6 }, { name: 'explosion_frost', x, y, z: 0.8, scale: 2.2, delay: 0.05 }, { name: 'snow', x, y, z: 2, scale: 2, life: 2.4 }] }, { at, shake: 10 }];
      const S = {
        'c12.doors': auto('frosthall', [K(-1.0, 2.6, -1.6), AE(-2.4, 2.8, -1.6), EL(-3.2, 3.4, -1.6), BR(-1.8, 3.6, -1.6), E(-4.0, 2.8, -1.6), NX(-0.2, 3.4, -1.6)], {
          noFace: true,
          nodes: { 'c12.doors': {
            0: { cam: { x: -2, y: 3.0, view: 9, ang: 0.0, pitch: 0.4, up: 1.4, ease: 1.2 }, do: [{ door: [0, 0.2] }, { rumble: [5, 1.2] }, { shake: 8 }, { who: 'kael', at: 0.6, face: [-1, 6] }] },
            1: { cam: { x: -4.8, y: 2.8, view: 4.8, ang: -0.3, pitch: 0.42, up: 0.8, ease: 1.2 }, do: [{ who: 'kael', face: -1.6 }, { who: 'aerys', to: [-3.8, 2.5], speed: 0.6, face: [-5.8, 2.8] }] },
            3: { cam: { x: 0, y: -2, view: 11, ang: -0.1, pitch: 0.4, up: 1.6, ease: 1.6 }, do: [mist(0.18), ...[['kael', -1.0, 1.0], ['aerys', -2.4, 1.2], ['eloryn', -3.2, 1.8], ['braxen', -1.8, 2.0], ['eiryn', -4.0, 1.2], ['nox', -0.2, 1.8]].map(([w, x, y]) => ({ who: w, to: [x, y], speed: 0.7 }))] },
            4: { do: [{ who: 'eiryn', face: [-4.0, -6] }] },
          } },
        }),
        'c12.hall': auto('frosthall', [K(-2.4, 1.4, 0, { armed: true }), AE(-4.0, 0.8, 0, { armed: true }), EL(-4.8, 1.8, 0, { armed: true }), BR(-3.4, 2.4, 0), E(-5.4, 1.0, 0), NX(-1.8, 0.4, 0, { armed: true }),
          KN('kn1', 'knightSword', 4.0, 1.0, 3.14, { hidden: true }), KN('kn2', 'knightFist', 5.4, 2.0, 3.14, { hidden: true }), KN('kn3', 'knightSpear', 5.6, -0.6, 3.14, { hidden: true }),
          KN('kn4', 'knightAxe', 6.4, 0.8, 3.14, { hidden: true }), KN('kn5', 'knightTwin', 6.2, -1.8, 3.14, { hidden: true }), KN('kn6', 'knightMaster', 7.4, 0.2, 3.14, { hidden: true })], {
          noFace: true, armed: true,
          nodes: { 'c12.hall': {
            0: { cam: { focus: ['kael', 'kn1'], view: 8, ang: -0.3, pitch: 0.44, ease: 1.2 }, do: [{ pfx: { name: 'fog', x: 4.0, y: 1.0, z: 0.6, scale: 2.4, life: 2.6 } }, { at: 0.6, who: 'kn1', show: true }, { at: 0.6, who: 'kn1', pfx: { name: 'spell_ice', scale: 1.6 } }, { who: 'kael', set: { stow: false, gest: null } }, { at: 0.8, who: 'kael', to: [-1.4, 1.2], speed: 1.0 }, { who: 'nox', set: { stow: false, gest: null } }, { who: 'aerys', set: { stow: false } }] },
            1: { cam: { focus: ['kael', 'nox', 'kn1'], view: 7, ang: -0.3, pitch: 0.42, ease: 0.3 }, do: [{ who: 'kn1', to: [-0.4, 1.2], gait: 'dash', speed: 8 }, { at: 0.3, who: 'nox', blink: [0.4, 0.6] }, { at: 0.4, who: 'nox', attack: { wind: 0.1, active: 0.1, recover: 0.3, tele: false } }, { at: 0.5, who: 'kn1', blink: [4.4, 1.0] }, { at: 0.5, pfx: { name: 'smoke_puff', x: -0.2, y: 1.2, scale: 1.6 } }, { at: 0.5, shake: 5 }, { at: 1.2, who: 'nox', face: 'kn1' }] },
            3: { cam: { focus: ['kael', 'eloryn'], view: 4.6, ang: -0.3, pitch: 0.42, up: 0.8, ease: 0.8 }, do: [{ who: 'kael', pfx: { name: 'ice_shatter', z: 1.0, scale: 1.0 } }, { at: 0.2, who: 'kael', state: 'hurt', dur: 0.3 }, { at: 0.8, who: 'eloryn', to: [-2.6, 1.6], speed: 1.2, face: 'kael' }] },
            5: { cam: { focus: ['kn1', 'kn2', 'kn3', 'kn4', 'kn5', 'kn6'], view: 11, ang: -0.25, pitch: 0.4, up: 0.8, ease: 1.4 }, do: [mist(0.15), ...['kn2', 'kn3', 'kn4', 'kn5', 'kn6'].flatMap((k, i) => [{ at: 0.3 + i * 0.3, who: k, show: true }, { at: 0.3 + i * 0.3, who: k, pfx: { name: 'spell_ice', scale: 1.4 } }])] },
            6: { cam: { focus: ['kn2'], view: 4.6, ang: -0.3, pitch: 0.42, up: 0.9, ease: 0.8 }, do: [{ at: 1.5, cam: { focus: ['kn3'], view: 4.6, ang: -0.3, pitch: 0.42, up: 0.9, ease: 0.8 } }, { at: 3.0, cam: { focus: ['kn4'], view: 4.6, ang: -0.3, pitch: 0.42, up: 0.9, ease: 0.8 } }, { at: 4.5, cam: { focus: ['kn5'], view: 4.6, ang: -0.3, pitch: 0.42, up: 0.9, ease: 0.8 } }, { at: 6.0, cam: { focus: ['kn6'], view: 4.6, ang: -0.3, pitch: 0.42, up: 1.1, ease: 1.2 } }] },
            7: { cam: { focus: ['kn6', 'eiryn'], view: 11, ang: -0.3, pitch: 0.42, ease: 1.0 }, do: [{ who: 'kn1', face: 'kael' }, { who: 'kn3', face: 'aerys' }, { who: 'nox', face: 'kn4' }, { at: 0.8, who: 'kn6', face: 'eiryn' }, { at: 1.4, cam: { focus: ['eiryn'], view: 4, ang: -0.3, pitch: 0.42, up: 0.9, ease: 0.8 } }, { at: 2.8, fade: [0.95, 0.7, WHITE] }] },
          } },
        }),
        'c12.mist': auto('frosthall', [K(-3.0, 0.8, 0), AE(-4.0, -0.4, 0), EL(-5.2, 1.8, 0), BR(-3.6, 2.6, 0), E(-6.0, 0.6, 0), NX(-1.8, 1.8, 0)], {
          noFace: true,
          nodes: { 'c12.mist': {
            0: { cam: { focus: ['kael', 'aerys', 'eloryn', 'braxen', 'eiryn', 'nox'], view: 9, ang: -0.3, pitch: 0.46, ease: 0.6 }, do: [{ fade: [0.75, 0.8, WHITE] }, { pfx: [{ name: 'fog', x: -3, y: 1, z: 0.6, scale: 3, life: 3 }] }] },
            1: { do: [{ who: 'kael', icon: '!' }] },
            2: { cam: { focus: ['braxen', 'eloryn'], view: 5, ang: -0.3, pitch: 0.46, ease: 0.5 }, do: [{ who: 'braxen', to: [-4.2, 2.8], gait: 'back', speed: 1.0 }, { at: 0.8, who: 'braxen', state: 'down', knock: [-0.4, 0], hold: true }, { at: 0.8, shake: 4 }, { at: 1.0, who: 'eloryn', to: [-4.6, 2.2], speed: 2 }] },
            3: { do: [{ shake: 6 }, { fade: [1.0, 0.3, WHITE] }] },
            4: { cam: { focus: ['kael'], view: 5, ang: -0.3, pitch: 0.42, up: 0.8, ease: 0.8, cut: true }, do: [{ fade: [0.0, 1.2] }, ...['aerys', 'eloryn', 'braxen', 'nox', 'eiryn'].map((w) => ({ who: w, hide: true })), { who: 'kael', put: [-2.0, 0.4] }, { at: 0.3, who: 'kael', to: [0.0, 0.4], gait: 'run', speed: 3 }, { at: 1.6, who: 'kael', face: Math.PI }] },
            5: { cam: { focus: ['eiryn'], view: 6, ang: -0.3, pitch: 0.42, up: 0.8, ease: 0.2, cut: true }, do: [{ fade: [0.5, 0.2, WHITE] }, { at: 0.3, fade: [0.2, 1.0, WHITE] }, { who: 'kael', hide: true }, { who: 'eiryn', show: true }, { who: 'eiryn', put: [-1.0, 0.4] }, { who: 'eiryn', face: 0 }] },
          } },
        }),
      };
      // Each fighter alone with their knight (the Tower separated them): one stage per scene.
      const solo = (hero, knightKey, nodes) => auto('frosthall', [Object.assign({}, hero, { armed: true }), KN('knight', knightKey, 1.8, hero.y, 3.14)], { armed: true, noFace: true, close: 3.6, wide: { view: 5.4 }, nodes });
      const open = (id, o) => ({ cam: { focus: ['knight', id], view: 5.4, ang: -0.3, pitch: 0.46, ease: 1.0 }, do: [mist(0), { who: id, set: { stow: false, gest: null } }].concat(o || []) });
      // Kael and the Swordsman Knight
      S['c12.kael'] = solo(K(-1.8, 0.4, 0), 'knightSword', { 'c12.kael': {
        0: open('kael', [{ who: 'knight', put: [4.6, 0.4] }, { who: 'knight', to: [1.8, 0.4], speed: 1.0 }, { at: 1.4, who: 'kael', face: 'knight' }]),
        1: { cam: { focus: ['knight', 'kael'], view: 4.4, ang: -0.3, pitch: 0.44, ease: 0.4 }, do: [{ who: 'kael', to: [-0.2, 0.4], gait: 'dash', speed: 6 }, { at: 0.2, who: 'kael', attack: { wind: 0.12, active: 0.1, recover: 0.4, tele: false } }, { at: 0.25, who: 'knight', state: 'parry', dur: 0.4 }, { at: 0.35, pfx: { name: 'hit_ice', x: 0.8, y: 0.4, z: 1.2, scale: 2 } }, { at: 0.35, shake: 6 }, { at: 0.9, who: 'knight', to: [0.3, 0.4], gait: 'dash', speed: 6 }, { at: 1.0, who: 'knight', attack: { wind: 0.1, active: 0.1, recover: 0.4, tele: false } }, { at: 1.15, who: 'kael', state: 'hurt', dur: 0.5 }, hit('kael', 'ice_slash', 1.15), { at: 1.2, who: 'kael', pfx: { name: 'ice_shatter', z: 1.0, scale: 1.2 } }] },
        2: { cam: { focus: ['knight', 'kael'], view: 4.8, ang: -0.3, pitch: 0.44, ease: 0.6 }, do: [{ who: 'kael', to: [-1.0, 0.4], gait: 'back', speed: 1.2 }, { at: 0.9, who: 'kael', attack: { wind: 0.2, active: 0.1, recover: 0.4, tele: false } }, { at: 1.0, who: 'knight', state: 'parry', dur: 0.3 }, { at: 1.05, pfx: { name: 'parry', x: 0.0, y: 0.4, z: 1.2, scale: 1.8 } }, { at: 1.6, who: 'kael', attack: { wind: 0.3, active: 0.1, recover: 0.4, tele: false } }, { at: 1.75, who: 'knight', state: 'parry', dur: 0.3 }, { at: 1.8, pfx: { name: 'parry', x: 0.0, y: 0.4, z: 1.2, scale: 1.8 } }] },
      } });
      S['c12.kael2'] = solo(K(-1.8, 0.4, 0), 'knightSword', { 'c12.kael2': {
        0: open('kael', [{ at: 0.4, who: 'kael', to: [0.4, 0.4], gait: 'dash', speed: 6 }, { at: 0.6, who: 'kael', attack: { wind: 0.2, active: 0.1, recover: 0.5, tele: false } }, { at: 0.8, pfx: [{ name: 'hit_crit', x: 1.1, y: 0.4, z: 1.3, scale: 2.2 }, { name: 'ice_shatter', x: 1.1, y: 0.4, z: 1.2, scale: 2.4, delay: 0.1 }] }, { at: 0.8, shake: 10 }, { at: 0.8, slow: [0.3, 0.8] }, { at: 0.9, who: 'kael', set: { stow: true } }, { at: 1.4, pfx: { name: 'ice_shatter', x: 1.6, y: 0.4, z: 1.2, scale: 2 } }, { at: 1.4, who: 'knight', set: { stow: true } }]),
        1: { cam: { focus: ['knight', 'kael'], view: 5.6, ang: -0.3, pitch: 0.44, ease: 0.5 }, do: [{ who: 'knight', attack: { wind: 0.12, active: 0.1, recover: 0.4, tele: false } }, hit('kael', 'hit_punch', 0.25), { at: 0.25, who: 'kael', state: 'down', dur: 1.1, knock: [-2.4, 0] }, { at: 0.25, shake: 8 }, { at: 0.9, who: 'knight', to: [-0.8, 0.4], speed: 2 }, { at: 1.6, who: 'knight', attack: { wind: 0.12, active: 0.1, recover: 0.4, tele: false } }, hit('kael', 'hit_blunt', 1.75, { pfx: { z: 0.6 } }), { at: 1.75, shake: 6 }, { at: 2.6, who: 'kael', state: 'idle', hold: true }, { at: 3.0, who: 'kael', attack: { wind: 0.2, active: 0.1, recover: 0.5, tele: false } }, { at: 3.1, who: 'knight', state: 'dodge', dur: 0.4 }, { at: 3.6, who: 'knight', attack: { wind: 0.1, active: 0.1, recover: 0.4, tele: false } }, hit('kael', 'hit_punch', 3.75, { pfx: { z: 1.6 } }), { at: 3.75, who: 'kael', state: 'down', dur: 0.9, knock: [-0.6, 0] }, { at: 4.9, who: 'kael', state: 'idle', hold: true }] },
        2: { cam: { focus: ['knight', 'kael'], view: 4.2, ang: -0.3, pitch: 0.44, up: 0.6, ease: 0.6 }, do: [{ who: 'knight', attack: { wind: 0.12, active: 0.1, recover: 0.4, tele: false } }, hit('kael', 'hit_punch', 0.25), { at: 0.25, who: 'kael', state: 'hurt', dur: 0.6 }, { at: 0.8, who: 'kael', to: [-1.5, 0.4], speed: 2 }, { at: 1.1, who: 'kael', state: 'pickup', dur: 0.8 }] },
        4: { cam: { focus: ['knight', 'kael'], view: 4.0, ang: -0.3, pitch: 0.44, up: 0.6, ease: 0.5 }, do: [{ who: 'knight', attack: { wind: 0.12, active: 0.1, recover: 0.4, tele: false } }, hit('kael', 'hit_punch', 0.25, { pfx: { z: 1.6 } }), { at: 1.0, who: 'kael', attack: { wind: 0.3, active: 0.1, recover: 0.5, tele: false } }, { at: 1.3, slow: [0.3, 0.7] }, { at: 1.3, pfx: { name: 'hit_crit', x: -0.8, y: 0.4, z: 1.2, scale: 2.4 } }, { at: 1.3, fade: [0.7, 0.08, WHITE] }, { at: 1.4, fade: [0, 0.5] }, ...shatter(1.3, -0.8, 0.4)] },
        5: { cam: { focus: ['kael'], view: 3.6, ang: -0.3, pitch: 0.42, up: 0.6, ease: 1.0 }, do: [{ who: 'kael', state: 'pickup', hold: true }, { who: 'kael', pfx: { name: 'frost_nova', scale: 1.4, ground: true } }, { at: 1.2, who: 'kael', state: 'hurt', dur: 0.3 }, { at: 1.6, who: 'kael', state: 'pickup', hold: true }] },
      } });
      // Braxen and the Juggernaut
      S['c12.braxen'] = solo(BR(-1.8, 0.4, 0), 'knightFist', { 'c12.braxen': {
        0: open('braxen', [{ who: 'braxen', state: 'down', hold: true }, { at: 1.0, who: 'braxen', state: 'idle', hold: true }, { at: 1.6, who: 'knight', face: 'braxen' }]),
        2: { cam: { focus: ['knight', 'braxen'], view: 7, ang: -0.3, pitch: 0.44, ease: 0.5 }, do: [{ who: 'knight', to: [-0.6, 0.4], gait: 'dash', speed: 7 }, { at: 0.25, who: 'knight', attack: { wind: 0.1, active: 0.1, recover: 0.5, tele: false } }, hit('braxen', 'hit_punch', 0.4), { at: 0.4, who: 'braxen', hop: [1.0, 0.5] }, { at: 0.4, who: 'braxen', state: 'down', dur: 1.2, knock: [-2.6, -2.4] }, { at: 0.75, pfx: [{ name: 'rock_burst', x: -4.6, y: -2.4, z: 1.2, scale: 2 }, { name: 'dust_cloud', x: -4.4, y: -2.1, scale: 1.8 }] }, { at: 0.75, shake: 10 }, { at: 2.0, who: 'braxen', state: 'idle', hold: true }, { at: 2.2, who: 'braxen', face: 'knight' }] },
      } });
      S['c12.braxen2'] = solo(BR(-1.8, 0.4, 0), 'knightFist', { 'c12.braxen2': {
        0: open('braxen', [{ at: 0.3, who: 'braxen', to: [0.4, 0.4], gait: 'run', speed: 4 }, { at: 0.3, who: 'knight', to: [1.2, 0.4], gait: 'run', speed: 3 }, { at: 0.7, who: 'knight', attack: { wind: 0.1, active: 0.1, recover: 0.4, tele: false } }, hit('braxen', 'hit_punch', 0.85), { at: 0.85, who: 'braxen', state: 'hurt', dur: 0.3 }, { at: 1.4, who: 'braxen', attack: { wind: 0.15, active: 0.1, recover: 0.4, tele: false } }, hit('knight', 'hit_blunt', 1.6, { pfx: { z: 1.8 } }), { at: 1.6, shake: 7 }]),
        1: { cam: { focus: ['knight', 'braxen'], view: 3.8, ang: -0.3, pitch: 0.44, up: 0.7, ease: 0.5 }, do: [{ who: 'knight', attack: { wind: 0.1, active: 0.1, recover: 0.3, tele: false } }, hit('braxen', 'hit_blunt', 0.2, { pfx: { z: 1.7 } }), { at: 0.7, who: 'knight', attack: { wind: 0.1, active: 0.1, recover: 0.3, tele: false } }, hit('braxen', 'hit_blunt', 0.8, { pfx: { z: 1.7 } }), { at: 0.8, who: 'braxen', pfx: { name: 'ice_shatter', z: 1.5, scale: 1.2 } }, { at: 1.5, who: 'braxen', attack: { wind: 0.15, active: 0.1, recover: 0.4, tele: false } }, hit('knight', 'hit_pierce', 1.7, { pfx: { z: 1.6 } }), { at: 2.0, who: 'knight', attack: { wind: 0.1, active: 0.1, recover: 0.3, tele: false } }, hit('braxen', 'hit_blunt', 2.1), { at: 2.6, who: 'braxen', attack: { wind: 0.15, active: 0.1, recover: 0.4, tele: false } }, hit('knight', 'ice_shatter', 2.8, { pfx: { z: 1.7 } }), { at: 2.8, shake: 6 }] },
        2: { cam: { focus: ['knight', 'braxen'], view: 5, ang: -0.3, pitch: 0.44, ease: 0.5 }, do: [{ who: 'braxen', to: [-0.4, 0.4], gait: 'back', speed: 1.4 }, { at: 0.7, who: 'braxen', to: [0.6, 0.4], gait: 'dash', speed: 7 }, { at: 0.8, who: 'braxen', attack: { wind: 0.1, active: 0.1, recover: 0.5, tele: false } }, { at: 0.95, pfx: { name: 'hit_crit', x: 1.2, y: 0.4, z: 1.8, scale: 2.2 } }, { at: 0.95, slow: [0.35, 0.6] }, ...shatter(1.4, 1.2, 0.4), { at: 2.2, who: 'braxen', to: [-3.9, -1.9], speed: 1.0 }] },
      } });
      // Aerys and the Spear Knight; the courtyard memory (her teacher's voice)
      S['c12.aerys'] = solo(AE(-1.8, 0.4, 0), 'knightSpear', { 'c12.aerys': {
        0: open('aerys', [{ who: 'knight', put: [4.6, 0.4] }, { who: 'knight', to: [1.8, 0.4], speed: 0.8 }, { at: 1.8, pfx: along('frost_nova', 1.4, 0.4, -1.2, 0.4, 5, 0.12, { scale: 0.8, ground: true }) }]),
        1: { cam: { focus: ['knight', 'aerys'], view: 6, ang: -0.3, pitch: 0.44, ease: 0.6 }, do: [0, 0.6, 1.2].flatMap((t) => [{ at: t, who: 'aerys', state: 'cast', dur: 0.4 }, { at: t + 0.1, pfx: along('holy_light', -1.4, 0.4, 1.4, 0.4, 4, 0.04, { z: 1.3, scale: 1.2, add: true }) }, { at: t + 0.3, who: 'knight', state: 'parry', dur: 0.3 }, { at: t + 0.3, pfx: { name: 'parry', x: 1.5, y: 0.4, z: 1.3, scale: 1.6 } }]).concat([{ at: 2.0, who: 'aerys', hop: [1.8, 2.6] }]) },
        2: { cam: { focus: ['knight', 'aerys'], view: 5, ang: -0.3, pitch: 0.44, up: 0.6, ease: 0.5 }, do: [{ who: 'knight', blink: [-1.0, 0.4] }, { at: 0.05, who: 'knight', hop: [1.6, 0.6] }, { at: 0.2, who: 'knight', attack: { wind: 0.08, active: 0.1, recover: 0.4, tele: false } }, hit('aerys', 'hit_ice', 0.35, { pfx: { z: 1.8 } }), { at: 0.35, who: 'aerys', state: 'hurt', dur: 0.5 }, { at: 0.35, shake: 5 }, { at: 1.4, who: 'aerys', to: [-2.4, 0.4], gait: 'back', speed: 1.2 }, { at: 1.6, who: 'knight', to: [0.8, 0.4], speed: 1.2 }] },
      } });
      const MEM = '255,236,200';
      S['c12.aerys2'] = solo(AE(-2.4, 0.4, 0), 'knightSpear', { 'c12.aerys2': {
        0: { cam: { focus: ['aerys'], view: 3.4, ang: -0.3, pitch: 0.42, up: 0.8, ease: 1.2 }, do: [{ who: 'knight', put: [0.8, 0.4] }, { fade: [0.45, 1.0, MEM] }, { light: [MEM, 0.3, 1.0] }, { who: 'aerys', set: { stow: false, gest: null } }] },
        1: { cam: { focus: ['aerys'], view: 3.0, ang: -0.1, pitch: 0.42, up: 0.9, ease: 1.0 } },
        2: { cam: { focus: ['aerys'], view: 3.0, ang: -0.5, pitch: 0.42, up: 0.9, ease: 1.0 } },
        3: { cam: { focus: ['aerys'], view: 3.4, ang: -0.3, pitch: 0.42, up: 0.8, ease: 1.0 } },
        4: { cam: { focus: ['aerys'], view: 3.6, ang: -0.3, pitch: 0.42, up: 0.6, ease: 1.0 }, do: [{ who: 'aerys', face: 'knight' }, { at: 0.6, who: 'aerys', set: { gest: 'raise' } }] },
        6: { cam: { focus: ['knight', 'aerys'], view: 5, ang: -0.3, pitch: 0.44, ease: 0.8 }, do: [{ fade: [0, 0.8] }, { light: [MEM, 0, 0.8] }, { who: 'aerys', set: { gest: null } }] },
      } });
      S['c12.aerys3'] = solo(AE(-1.8, 0.4, 0), 'knightSpear', { 'c12.aerys3': {
        0: open('aerys', [{ at: 0.3, who: 'knight', to: [0.2, 0.4], gait: 'dash', speed: 6 }, { at: 0.4, who: 'knight', attack: { wind: 0.08, active: 0.1, recover: 0.4, tele: false } }, { at: 0.5, who: 'aerys', state: 'dodge', dur: 0.4 }, { at: 0.9, who: 'aerys', attack: { wind: 0.08, active: 0.1, recover: 0.3, tele: false } }, { at: 1.0, pfx: { name: 'parry', x: -0.6, y: 0.4, z: 1.2, scale: 1.8 } }, { at: 1.4, who: 'knight', blink: [-3.0, 0.4] }, { at: 1.6, who: 'aerys', face: 'knight' }, { at: 1.8, who: 'aerys', to: [-2.5, 0.4], gait: 'dash', speed: 5 }, { at: 2.0, who: 'aerys', attack: { wind: 0.1, active: 0.1, recover: 0.4, tele: false } }, { at: 2.15, pfx: { name: 'hit_crit', x: -3.0, y: 0.4, z: 1.6, scale: 2 } }, { at: 2.15, slow: [0.35, 0.5] }, ...shatter(2.4, -3.0, 0.4)]),
        1: { cam: { focus: ['aerys'], view: 3.4, ang: -0.3, pitch: 0.42, up: 0.7, ease: 1.0 }, do: [{ who: 'aerys', state: 'hurt', dur: 0.4 }, { at: 1.0, who: 'aerys', state: 'hurt', dur: 0.4 }, { at: 1.8, who: 'aerys', face: [0, 4] }] },
      } });
      // Eloryn and the twin-bladed knight
      S['c12.eloryn'] = solo(EL(-1.8, 0.4, 0), 'knightTwin', { 'c12.eloryn': {
        0: open('eloryn', [{ who: 'eloryn', to: [-3.0, 0.4], gait: 'back', speed: 0.8 }, { who: 'knight', to: [0.6, 0.4], speed: 0.8 }, { at: 1.4, who: 'eloryn', state: 'cast', dur: 0.8 }, { at: 1.5, who: 'eloryn', pfx: [{ name: 'spell_heal', scale: 2.2 }, { name: 'wind_gust', scale: 1.6 }] }, { at: 1.7, who: 'knight', state: 'hurt', dur: 0.3 }]),
        1: { cam: { focus: ['knight', 'eloryn'], view: 4.6, ang: -0.3, pitch: 0.44, ease: 0.4 }, do: [{ who: 'knight', to: [-2.2, 0.4], gait: 'dash', speed: 6 }, { at: 0.3, who: 'knight', attack: { wind: 0.08, active: 0.1, recover: 0.3, tele: false } }, hit('eloryn', 'ice_slash', 0.45, { pfx: { z: 1.0 } }), { at: 0.45, who: 'eloryn', state: 'hurt', dur: 0.4 }, { at: 1.0, who: 'knight', attack: { wind: 0.08, active: 0.1, recover: 0.4, tele: false } }, hit('eloryn', 'hit_pierce', 1.15, { pfx: { z: 1.0 } }), { at: 1.15, who: 'eloryn', state: 'down', hold: true, knock: [-0.8, 0] }, { at: 1.15, shake: 6 }, { at: 1.3, who: 'eloryn', pfx: { name: 'frost_nova', scale: 1.2, ground: true } }] },
        2: { cam: { focus: ['knight', 'eloryn'], view: 4.4, ang: -0.3, pitch: 0.42, up: 0.5, ease: 0.8 }, do: [{ who: 'knight', to: [-2.6, 0.4], speed: 0.6 }, { at: 0.6, who: 'eloryn', pfx: { name: 'heal_loop', scale: 1, life: 3, follow: true } }] },
      } });
      S['c12.eloryn2'] = solo(EL(-1.8, 0.4, 0), 'knightTwin', { 'c12.eloryn2': {
        0: { cam: { focus: ['knight', 'eloryn'], view: 4.6, ang: -0.3, pitch: 0.44, up: 0.4, ease: 0.8 }, do: [mist(0), { who: 'eloryn', state: 'down', hold: true }, { who: 'knight', put: [-0.8, 0.4] }, { at: 0.4, who: 'knight', attack: { wind: 0.4, hold: true, tele: false } }, { at: 1.2, light: ['150,230,200', 0.55, 0.3] }, { at: 1.2, who: 'eloryn', pfx: [{ name: 'spell_heal', scale: 3 }, { name: 'shockwave', scale: 3, add: true }, { name: 'holy_light', scale: 2.4, add: true }] }, { at: 1.2, shake: 8 }, { at: 1.3, who: 'knight', release: true }, { at: 1.3, who: 'knight', state: 'stagger', dur: 1.0 }, { at: 1.8, who: 'knight', pfx: { name: 'ice_shatter', z: 1.2, scale: 1.4 } }, ...shatter(2.4, -0.8, 0.4), { at: 2.6, light: ['150,230,200', 0, 1.0] }] },
        1: { cam: { focus: ['eloryn'], view: 3.4, ang: -0.3, pitch: 0.42, up: 0.5, ease: 1.0 }, do: [{ at: 1.0, who: 'eloryn', state: 'pickup', hold: true }, { at: 1.8, who: 'eloryn', state: 'hurt', dur: 0.4 }, { at: 2.4, who: 'eloryn', state: 'pickup', hold: true }, { at: 2.6, who: 'eloryn', pfx: { name: 'heal_loop', scale: 0.9, life: 2.4, follow: true } }] },
      } });
      // Nox and the Axe Knight
      S['c12.nox'] = solo(NX(-1.8, 0.4, 0), 'knightAxe', { 'c12.nox': {
        0: open('nox', [{ at: 0.6, cam: { focus: ['knight'], view: 4.4, ang: -0.3, pitch: 0.42, up: 0.8, ease: 1.2 } }]),
        1: { cam: { focus: ['knight', 'nox'], view: 5.4, ang: -0.3, pitch: 0.44, ease: 0.4 }, do: [{ who: 'nox', blink: [2.6, 0.0] }, { at: 0.1, who: 'nox', attack: { wind: 0.06, active: 0.08, recover: 0.2, tele: false } }, { at: 0.15, who: 'knight', state: 'parry', dur: 0.3 }, { at: 0.2, pfx: { name: 'parry', x: 2.2, y: 0.2, z: 1.6, scale: 1.8 } }, { at: 0.8, who: 'nox', blink: [1.0, -0.4] }, { at: 0.85, who: 'nox', attack: { wind: 0.06, active: 0.08, recover: 0.2, tele: false } }, { at: 0.9, who: 'knight', blink: [2.4, 0.9] }, { at: 1.4, who: 'nox', blink: [3.2, 1.0] }, { at: 1.45, who: 'nox', attack: { wind: 0.06, active: 0.08, recover: 0.2, tele: false } }, { at: 1.5, who: 'knight', blink: [1.6, 0.2] }, { at: 2.0, who: 'nox', blink: [0.8, 0.6] }, { at: 2.05, who: 'nox', attack: { wind: 0.06, active: 0.08, recover: 0.2, tele: false } }, { at: 2.1, who: 'knight', state: 'parry', dur: 0.3 }, { at: 2.15, pfx: { name: 'parry', x: 1.2, y: 0.4, z: 1.4, scale: 1.8 } }] },
        2: { cam: { focus: ['knight', 'nox'], view: 6, ang: -0.3, pitch: 0.44, ease: 0.5 }, do: [{ who: 'nox', put: [1.4, 0.4] }, { who: 'nox', drop: [2.6, 0.5] }, { at: 0.3, who: 'knight', attack: { wind: 0.1, active: 0.1, recover: 0.4, tele: false } }, { at: 0.45, pfx: { name: 'parry', x: 1.5, y: 0.4, z: 1.8, scale: 1.8 } }, { at: 0.5, who: 'nox', hop: [1.4, 0.5] }, { at: 0.5, who: 'nox', to: [-1.6, 0.4], gait: 'dash', speed: 8 }, { at: 1.2, who: 'nox', blink: [0.8, -0.6] }, { at: 1.3, who: 'knight', blink: [2.2, 0.8] }, { at: 1.7, who: 'knight', attack: { wind: 0.1, active: 0.1, recover: 0.4, tele: false } }, hit('nox', 'hit_ice', 1.85, { pfx: { z: 1.5 } }), { at: 1.85, who: 'nox', state: 'hurt', dur: 0.5 }, { at: 1.9, who: 'nox', pfx: { name: 'steam', scale: 1.2, life: 2.4, follow: true } }, { at: 2.6, who: 'nox', face: [0.8, 3] }] },
      } });
      S['c12.nox2'] = solo(NX(-1.8, 0.4, 0), 'knightAxe', { 'c12.nox2': {
        0: open('nox', [{ at: 0.4, cam: { focus: ['knight'], view: 4.2, ang: -0.3, pitch: 0.42, up: 0.8, ease: 0.8 } }, { at: 0.6, who: 'knight', state: 'hurt', dur: 0.2 }]),
        2: { cam: { focus: ['knight', 'nox'], view: 6, ang: -0.3, pitch: 0.44, ease: 0.5 }, do: [{ who: 'knight', to: [-0.4, 0.4], gait: 'run', speed: 3.5 }, { at: 0.3, who: 'nox', pfx: { name: 'shock_aura', scale: 1.4, life: 1.4, follow: true, add: true } }, { at: 0.5, light: ['170,140,255', 0.3, 0.5] }, { at: 0.6, slow: [0.15, 1.2] }, { at: 0.9, who: 'nox', blink: [2.8, 0.4] }, { at: 0.95, pfx: [{ name: 'multi_hit', x: -0.2, y: 0.4, z: 1.2, scale: 3 }, { name: 'cross_slash', x: -0.2, y: 0.4, z: 1.2, scale: 2.4, delay: 0.1 }, { name: 'dark_slash', x: -0.2, y: 0.4, z: 1.4, scale: 2.4, delay: 0.2 }] }, { at: 0.95, shake: 12 }, { at: 1.6, light: ['170,140,255', 0, 0.6] }] },
        3: { cam: { focus: ['knight', 'nox'], view: 5.4, ang: -0.3, pitch: 0.44, ease: 0.6 }, do: [...shatter(0.1, -0.2, 0.4), { at: 1.0, who: 'nox', state: 'hurt', dur: 0.6 }, { at: 1.7, who: 'nox', state: 'pickup', dur: 1.2 }] },
      } });
      // Eiryn and the Master Knight
      S['c12.eiryn'] = solo(E(-1.8, 0.4, 0), 'knightMaster', { 'c12.eiryn': {
        0: open('eiryn', [{ who: 'knight', put: [4.8, 0.4] }, { who: 'knight', to: [1.8, 0.4], speed: 0.6 }]),
        1: { cam: { focus: ['knight', 'eiryn'], view: 6, ang: -0.3, pitch: 0.44, ease: 1.0 }, do: [{ who: 'knight', path: [[0.4, -1.2], [-1.2, -1.8], [-2.8, -1.2], [-3.4, 0.0]], speed: 1.2, face: 'eiryn' }, { at: 3.6, who: 'knight', face: 'eiryn' }, { at: 3.8, who: 'knight', attack: { wind: 0.3, active: 0.1, recover: 0.5, tele: false } }, { at: 4.1, slow: [0.1, 0.8] }, { at: 4.1, cam: { focus: ['knight', 'eiryn'], view: 3.4, ang: -0.3, pitch: 0.42, up: 0.6, ease: 0.3 } }] },
      } });
      // the closing blast: the hall opens up
      S['c12.end'] = auto('frosthall', [E(-1.8, 0.4, 0, { armed: true }), KN('knight', 'knightMaster', -3.0, 0.4, 0)], {
        noFace: true,
        nodes: { 'c12.end': {
          0: { cam: { focus: ['knight', 'eiryn'], view: 4.2, ang: -0.3, pitch: 0.42, up: 0.7, ease: 0.8 }, do: [{ who: 'knight', icon: '?' }] },
          1: { cam: { focus: ['eiryn'], view: 14, ang: -0.1, pitch: 0.4, up: 0.8, ease: 0.4 }, do: [{ who: 'knight', hide: true }, { fx: { type: 'dissolve', x: -3.0, y: 0.4, big: true } }, { pfx: { name: 'shockwave', x: -1.8, y: 0.4, scale: 5, add: true } }, { shake: 14 }, { fade: [1.0, 0.15, WHITE] }, { at: 0.2, fade: [0.0, 1.4] }] },
        } },
      });
      return S;
    })(),
    defs: {},
    scenarios: {},
    looks: {},
  };
});
