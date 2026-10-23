/*
 * Tower of Wishes — The Road That Bleeds (book chapter Five).
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
  const P = (id, x, y, f, o) => Object.assign({ id, key: 'patron', x, y, f }, o);

  return {
    id: 'c8',
    speakers: { healer: { name: 'The healer', tone: 'glyph' }, merchant: { name: 'Merchant', tone: 'plain' }, aide: { name: 'Aide', tone: 'plain' } },
    nodes(h) {
      const { B, N, X } = h;
      return {
        'c8.road': {
          type: 'scene', chapter: 'c8', bg: 'road', next: 'c8.market',
          lines: [
            X('The Shadow City disappears behind them slowly. Stone gives way to dirt. The hard echoes of the lower streets fade until there is only wind moving through roadside grass and the occasional groan of an old wagon axle. Aerys looks back once. From a distance, the city seems even darker, a knot of towers and bridges built over streets that can swallow a person without anyone asking where they have gone. Kael never turns around.'),
            X('For an instant she looks almost younger. Not hunted. Not valuable. Not strange. Just a traveler being wished well by another traveler. Kael watches the merchant continue down the road. His hand tightens slightly around his sword hilt. He scans ahead. The path curves through broken carts and old walls. Too many blind turns. Too many places for someone to stand without being seen.'),
            B('kael', 'Stay close.'),
            B('aerys', 'Am I doing something wrong?'),
            B('kael', 'No.'),
            B('kael', 'That’s the problem.'),
          ],
        },
        'c8.market': {
          type: 'scene', chapter: 'c8', bg: 'market', next: 'c8.alley',
          lines: [
            X('The next city comes into view before evening. It is smaller than the Shadow City and far more alive. Its walls have been patched in layers of mismatched stone. The outer districts crowd close around the gates. Vendors shout prices from stalls. Children run between carts. The guards look tired rather than predatory. Aerys relaxes before she realizes she has.'),
            X('Inside, the market strip is bright with noise and color. She stops beside a stall hung with small pieces of glowing glass. They are not enchanted. Nothing about them matters. The glass has simply been heated and shaped so that sunlight catches inside the curves. Aerys stares anyway.'),
            X('He has already turned away. Across the market, a large man leans against a butcher’s stall. Scarred face. Missing teeth. Thick shoulders under stained leather. His eyes linger on Aerys too long. Eiryn notices him once. That is enough to remember his face.'),
            X('Kael stops a city guard several stalls ahead and asks for directions. His voice lowers beneath the market noise. Aerys steps a few paces aside so she will not crowd them. Still within sight. Still close.'),
            X('The scarred man moves.'),
          ],
        },
        'c8.alley': {
          type: 'scene', chapter: 'c8', bg: 'town', next: 'c8.run',
          lines: [
            X('A hand closes around Aerys’s wrist. She has time to turn her head. Then he yanks her sideways into the mouth of an alley. Steel flashes. A short blade. No warning. No threat. No demand. It goes into her side. Deep.'),
            X('Aerys’s mouth opens. The first sound never becomes a scream. Her lungs empty all at once, leaving only a broken gasp as the man pulls the blade free. Blood comes fast. Too fast.'),
            X('Kael hears the sound. He turns. Sees the alley. Sees red. Then he is moving. There is no restraint in the strike. His sword crosses the attacker’s chest before the man has fully turned. The body hits the ground dead. But the wound remains.'),
            X('Aerys folds. Kael catches her before her knees strike stone. Blood soaks into his arms almost immediately.'),
            B('kael', 'No. No—stay with me.'),
            X('Eiryn is already kneeling. Her hands hover over Aerys’s side without touching her. For a moment, nothing visibly happens. Then the bleeding resists. It does not stop. It slows just enough to become something other than an immediate ending. The muscles along Eiryn’s jaw tighten. Kael sees none of it.'),
          ],
        },
        'c8.run': {
          type: 'scene', chapter: 'c8', bg: 'market', next: 'c8.infirmary',
          lines: [
            X('He gathers Aerys into his arms and runs. People shout as he forces through the market. Vendors pull carts aside. Someone points down a street toward the low-city infirmary.'),
            B('aerys', '…Don’t… leave me…'),
            B('kael', 'I’m here.'),
            B('aerys', 'I stepped in. Remember?'),
          ],
        },
        'c8.infirmary': {
          type: 'scene', chapter: 'c8', bg: 'tavern', next: 'c8.heal',
          lines: [
            X('The infirmary occupies an old chapel near the edge of the district. Blood marks the steps before Kael even reaches the doors. Moans come from inside. He drives one shoulder into the entrance.'),
            B('kael', 'I NEED A HEALER!'),
            X('Chaos answers him. Cots have been packed into every open space. People lie on the floor where there are no cots. Bandages are already soaked through before volunteers can replace them. A child cries somewhere behind a curtain. A man prays in a voice that does not sound as though he expects anyone to answer.'),
            X('A woman looks up from another patient. She looks exhausted. Then she sees Aerys and moves.'),
            B('healer', 'Put her down. Now.'),
            X('Kael lowers Aerys onto the nearest table. His hands are shaking. The healer does not waste time asking his name. She cuts the fabric around the wound, presses hard, and ignores Aerys’s involuntary gasp.'),
            B('healer', 'Breathe.'),
          ],
        },
        'c8.heal': {
          type: 'scene', chapter: 'c8', bg: 'tavern', next: 'c8.talk',
          lines: [
            X('The healer places both hands over the wound. Green-white light blooms beneath her palms. Unlike Aerys’s light, this does not cut or burn. It looks warm. Alive. The bleeding slows. Then tries to surge again. The healer’s jaw tightens.'),
            B('healer', '…An angel in a city of devils.'),
            X('Behind them, someone begins convulsing. A voice shouts that another patient is gone. A body is dragged through the aisle by the ankles because there is no room to carry it properly. The healer does not look away from Aerys. She cannot afford to. Her hands glow brighter. Her fingers begin to tremble. Kael’s grip on Aerys tightens.'),
            B('kael', 'I was right there.'),
            B('kael', 'I didn’t stop it.'),
            B('healer', 'You brought her here.'),
            B('healer', 'That matters.'),
            X('The light surges once. Controlled. Focused. The wound draws tighter beneath her hands. Aerys’s breathing, which has been catching and skipping, begins to settle into a steadier rhythm. She exhales shakily, as though returning from somewhere very cold.'),
          ],
        },
        'c8.talk': {
          type: 'scene', chapter: 'c8', bg: 'tavern', next: 'c8.healer',
          lines: [
            X('The healer’s shoulders lower by the smallest degree. Then she notices the blood. For someone trained to read a wound, something about it is wrong. Or rather, unexpectedly right. It did not flow the way it should have before she started healing. Her eyes move toward the back of the room. Eiryn stands there. Still. Composed. Their gazes meet. The healer holds the look one second longer. Then she returns to Aerys. Whatever question has formed, she chooses not to ask it. Not now.'),
            B('healer', 'She’ll live.'),
            X('Kael’s knees hit the floor. There is no dramatic collapse. His body simply reaches the point where it no longer has to hold itself upright. He presses a fist against his forehead.'),
            B('kael', '…Thank you.'),
            B('healer', 'Don’t thank me yet.'),
            B('healer', 'Thank me when you don’t bring me more bleeding strangers.'),
          ],
        },
        'c8.healer': {
          type: 'scene', chapter: 'c8', bg: 'tavern', next: 'c8.join',
          lines: [
            B('healer', 'And you? What are you doing on that road?'),
            B('eiryn', 'The Tower.'),
            B('kael', 'If it’s real… you could wish to end this.'),
            B('healer', 'I can’t even end today.'),
            B('healer', 'But I can end her dying.'),
            B('kael', 'We’re not making it without one.'),
          ],
        },
        'c8.join': {
          type: 'scene', chapter: 'c8', bg: 'tavern', next: 'c8.leave',
          lines: [
            B('aerys', 'You saved me.'),
            B('healer', 'That doesn’t mean I’m done.'),
            X('She turns toward Eiryn. Their eyes meet. Something passes between them that Kael and Aerys cannot read. Recognition, perhaps. Not of identity, but of the weight carried by someone who has learned to stand still inside disaster. Eiryn gives one nod. Nothing more. The healer exhales slowly.'),
            B('healer', 'If I walk with you… I don’t walk back.'),
            B('kael', 'I’ll protect you.'),
            B('healer', 'We protect each other.'),
          ],
        },
        'c8.leave': {
          type: 'scene', chapter: 'c8', bg: 'tavern', next: 'c9.farms',
          lines: [
            X('Her name is Eloryn. She packs lightly. Bandages. Vials. A worn journal. A few instruments wrapped in cloth. Nothing that suggests she believes she is going somewhere comfortable. At her station hangs a small wooden charm. Eloryn touches it once. Then leaves it where it is.'),
            X('Before leaving, she sits at the table and writes quickly. Her handwriting is messy, made worse by exhaustion. I’m sorry. I couldn’t stay. Please forgive me. She folds the note carefully and places it where it will be found.'),
            X('The four of them step out of the infirmary together. The city noise swallows them at first, then fades as they make their way toward the gate. Outside the walls, Eloryn finally sees the Tower unobstructed. She stops.'),
            B('eloryn', 'So that’s it.'),
            B('eloryn', 'And you really think it grants a wish?'),
            B('kael', 'I don’t know.'),
            X('They continue down the road. Four now. Aerys walks close enough to Eloryn that their shoulders nearly touch. For the first time since Ashgate, the group looks balanced. Almost complete. Almost permanent. The road has a way of teaching people what that word is worth.'),
          ],
        },
      };
    },
    stages: {
      'c8.road': auto('road', [K(-7.0, 1.2, 0.1), AE(-8.4, 0.6, 0.1), E(-9.4, 1.4, 0.1), P('merchant', 6.5, -1.0, 3.14, { hidden: true })], {
        noFace: true,
        nodes: { 'c8.road': {
          0: { cam: { focus: ['kael', 'aerys', 'eiryn'], view: 9, ang: -0.9, pitch: 0.48, drift: 0.02, ease: 1.4 }, do: [{ who: 'kael', to: [-1.0, 1.4], speed: 1.0 }, { who: 'aerys', to: [-2.4, 0.8], speed: 1.0 }, { who: 'eiryn', to: [-3.4, 1.6], speed: 1.0 }] },
          1: { cam: { focus: ['aerys', 'merchant'], view: 5, ang: -0.35, pitch: 0.44, up: 0.9, ease: 1.0 }, do: [{ who: 'merchant', show: true }, { who: 'merchant', to: [0.2, -0.6], speed: 1.1, set: { gest: 'wave' } }, { at: 0.4, who: 'aerys', face: 'merchant' }, { at: 2.8, who: 'merchant', set: { gest: null }, to: [-9.0, -0.8], speed: 1.0 }, { at: 2.9, who: 'aerys', face: [-6, -0.8] }, { at: 3.4, who: 'kael', face: 'aerys' }] },
        } },
      }),
      'c8.market': auto('road', [K(-5.0, 1.4, 0.1), AE(-6.4, 0.8, 0.1), E(-7.4, 1.6, 0.1), P('guard', -1.2, 2.4, 3.0), { id: 'thug', key: 'thug', x: 5.0, y: -1.8, f: 2.8 }], {
        noFace: true,
        nodes: { 'c8.market': {
          1: { cam: { focus: ['aerys'], view: 4.4, ang: -0.35, pitch: 0.42, up: 0.9, ease: 1.2 }, do: [{ who: 'aerys', to: [-3.6, 0.2], speed: 0.6 }, { who: 'aerys', face: [-3, -3] }] },
          2: { cam: { across: ['thug', 'aerys'], focus: ['thug', 'aerys'], view: 9, ang: -0.4, pitch: 0.46, ease: 1.2 }, do: [{ who: 'thug', face: 'aerys', icon: '…' }, { who: 'eiryn', face: 'thug', icon: '?' }] },
          3: { cam: { focus: ['kael', 'guard'], view: 4.6, ang: -0.3, pitch: 0.44, up: 0.9, ease: 1.0 }, do: [{ who: 'kael', to: [-2.2, 2.0], speed: 1.0, face: 'guard' }, { at: 1.2, who: 'guard', face: 'kael' }] },
          4: { cam: { focus: ['thug', 'aerys'], view: 6, ang: -0.4, pitch: 0.44, ease: 0.8 }, do: [{ who: 'thug', to: [-3.0, 0.4], gait: 'dash', speed: 5 }] },
        } },
      }),
      'c8.alley': auto('shadowcity', [K(-6.2, 0.6, 0.1), AE(-1.0, 0.6, 0.2), E(-7.4, 1.4, 0.1), { id: 'thug', key: 'thug', x: -0.2, y: 0.0, f: 2.9 }], {
        noFace: true,
        nodes: { 'c8.alley': {
          0: { cam: { focus: ['aerys', 'thug'], view: 5, ang: -0.3, pitch: 0.42, ease: 0.4 }, do: [{ who: 'thug', attack: { wind: 0.2, active: 0.1, recover: 0.5, tele: false } }, { at: 0.2, who: 'aerys', state: 'hurt', dur: 0.5, knock: [0.5, 0] }, { at: 0.2, shake: 6 }] },
          1: { cam: { face: 'aerys', side: 0.4, view: 2.8, up: 1.1, pitch: 0.4, ease: 0.7 }, do: [{ who: 'aerys', state: 'stagger', dur: 1.2 }] },
          2: { cam: { focus: ['kael', 'thug'], view: 5.4, ang: -0.3, pitch: 0.4, ease: 0.3, cut: true }, do: [{ who: 'kael', set: { stow: false, gest: null } }, { who: 'kael', to: [-1.8, 0.4], gait: 'dash', speed: 7 }, { at: 0.5, who: 'kael', attack: { wind: 0.12, active: 0.1, recover: 0.5, tele: false } }, { at: 0.55, who: 'thug', state: 'down', knock: [1, 0], hold: true }, { at: 0.55, shake: 8 }, { at: 0.55, slow: [0.3, 0.7] }] },
          3: { cam: { focus: ['kael', 'aerys'], view: 4, ang: -0.3, pitch: 0.44, ease: 0.8 }, do: [{ who: 'aerys', state: 'down', hold: true }, { who: 'kael', set: { stow: true }, state: 'pickup', dur: 2 }, { who: 'kael', to: [-0.8, 0.6], speed: 1.5 }] },
          4: { cam: { face: 'kael', side: 0.4, view: 2.8, up: 0.8, pitch: 0.42, ease: 0.8 }, do: [{ who: 'kael', state: 'pickup', hold: true }] },
          5: { cam: { focus: ['eiryn', 'aerys', 'kael'], view: 4.2, ang: -0.3, pitch: 0.46, ease: 0.9 }, do: [{ who: 'eiryn', to: [-1.4, 0.2], speed: 2.2 }, { at: 1.0, who: 'eiryn', state: 'pickup', hold: true }] },
} },
      }),
      'c8.run': auto('road', [K(-9.0, 0.6, 0.0), AE(-9.0, 1.0, 0.0), E(-10.0, 1.2, 0.0)], {
        noFace: true,
        nodes: { 'c8.run': {
          0: { cam: { focus: ['kael', 'aerys'], view: 7, ang: -0.9, pitch: 0.42, ease: 0.6 }, do: [{ who: 'aerys', state: 'down', hold: true }, { who: 'kael', to: [6, 0.6], gait: 'sprint', speed: 4.4 }, { who: 'aerys', to: [6, 1.0], speed: 4.4 }, { who: 'eiryn', to: [4, 1.2], gait: 'run', speed: 4 }, { speed: ['h', 0.5, 1.0] }] },
} },
      }),
      'c8.infirmary': auto('tavern', [
        K(-6.6, 0.0, 0.1), AE(-6.6, 0.6, 0.1), E(-7.4, 1.2, 0.0), EL(0.6, 1.2, 3.1, { armed: false }),
        P('p1', -2.0, -3.2, 0.5), P('p2', 3.0, -3.0, 0.4), P('p3', -3.4, 3.4, 5.0), P('p4', 5.6, 2.6, 4.0),
      ], {
        alias: { healer: 'eloryn' },
        nodes: { 'c8.infirmary': {
          0: { do: [{ who: 'p1', state: 'down', hold: true }, { who: 'p2', state: 'down', hold: true }, { who: 'p3', state: 'down', hold: true }, { who: 'p4', state: 'sit' }, { who: 'aerys', state: 'down', hold: true }, { who: 'kael', to: [-2.0, 0.8], gait: 'run', speed: 4 }, { who: 'aerys', to: [-2.0, 1.4], gait: 'run', speed: 4 }] },
          2: { cam: { focus: ['kael', 'eloryn'], view: 8, ang: -0.3, pitch: 0.48, drift: 0.02, ease: 1.2 }, do: [{ who: 'eloryn', to: [-0.6, 1.4], gait: 'run', speed: 3.2 }] },
        } },
      }),
      'c8.heal': 'same',
      'c8.talk': 'same',
      'c8.healer': 'same',
      'c8.join': 'same',
      'c8.leave': 'same',
    },
    defs: {},
    scenarios: {},
    looks: {},
  };
});
