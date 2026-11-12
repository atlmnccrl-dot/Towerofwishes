// VESPER — the night's story, told in clean scenes (played by tale.js): one caption line per shot, no dialogue
// but a few words. The storyline (rebuilt 2026-11-11, the author: "rebuild the opening from scratch, make it make sense
// with the gameplay, the campaign map and the regions"):
//   The Spire is one mountain with five kingdoms on it, one above another (the campaign's regions, in the map's order):
//   the Black Gate, the Cloister of Frost, the Umbral Stair, the Ashen Waste, the Wind's Throat; the Moon's Altar on top.
//   The white Moon kept their dead asleep, and the five kings kept her peace. Seven hundred years ago a swordsman climbed
//   the Spire and cut down every king; at the summit he spent their souls on one cut, the First Cut, and cut the Moon.
//   Her light turned red, and red light wakes the dead; her wound keeps him alive. He chained each king's soul inside a
//   guardian (the regions' guardians), to bar the way up. Tonight the Moon bleeds out: at dawn she dies.
//   Vesper, the Moon's last knight, climbed all night and reached him in the last hour (the tutorial, at full power);
//   his First Cut killed her. With the last of her light the Moon turned the night back to dusk and raised her at the
//   Black Gate with nothing but her blade (the campaign starts): free the five kings, one guardian at a time (each
//   freed king's soul fights beside you: the Bound Souls), and meet him with them. At dawn, with the kings beside her,
//   she strikes the wound shut; the Moon turns white again, and the dead sleep. Pure data; runs in Node.
// Shot kinds: title, moonfall, film, spire, clash, seal. d = seconds.
(function (root) {
  const VS = root.VS = root.VS || {};
  const S = VS.STORY = {};
  S.SPEAKERS = {
    vesper: { name: 'Vesper', set: 'gothic_knight_b', color: '#ff3048' },
    swordsman: { name: 'A swordsman', set: 'vh_firstcut', color: '#ffffff' },
  };

  // What each hour asks of you, shown when the fight starts and in the corner while it lasts.
  S.GOALS = [
    { reach: 'Break through the Black Gate', boss: 'Defeat the Gatewarden' },
    { reach: 'Cross the frozen cloister', boss: 'Defeat the Hollow Twins' },
    { reach: 'Climb the Umbral Stair', boss: 'Defeat the Umbral' },
    { reach: 'Cross the Ashen Waste', boss: 'Defeat the Hunger' },
    { reach: "Climb the Wind's Throat", boss: 'Defeat the Pale Wing' },
    { reach: 'Reach the top of the Spire', boss: 'Defeat the First Cut' },
  ];
  // How many hours remain before dawn, as the climb goes on.
  const LEFT = ['SIX HOURS TO DAWN', 'FIVE HOURS TO DAWN', 'FOUR HOURS TO DAWN', 'THREE HOURS TO DAWN', 'TWO HOURS TO DAWN', 'THE LAST HOUR'];

  // Shots. film: the fight camera's high three-quarter view on the hour's real arena (see tale.js).
  const climb = (i, say) => ({ k: 'spire', at: i, eyebrow: LEFT[i], say, d: 2.6 });
  const walk = (i, say, eyebrow) => ({ k: 'film', stage: i, area: 0, eyebrow, say, d: 2.6,
    cast: [{ who: 'hero', at: [-170, 10], to: [-30, 10], mdur: 2.4 }, { who: '@army0', at: [70, -30], enter: 'rift', delay: 0.5, face: [-30, 10] }, { who: '@army1', at: [115, 18], enter: 'rift', delay: 0.85, face: [-30, 10] }, { who: '@army2', at: [62, 52], enter: 'rift', delay: 1.2, face: [-30, 10] }],
    cam: { follow: 'hero', off: [40, -14], zoom: [1.6, 1.8] } });
  // The guardian drops onto the far side of its arena (the Umbral rises from a rift) and is named.
  const meet = (i, who, say, also) => {
    const big = (D().FOES[who].scale || 1) > 1.2, by = big ? -105 : -85, enter = who === 'umbral' ? 'rift' : 'drop';
    const cast = [{ who: 'hero', at: [0, 112], face: [0, by] }];
    if (also) cast.push({ who, at: [-48, by], enter, delay: 0.3, after: 'Taunt', face: [0, 112] }, { who: also, at: [48, by], enter, delay: 0.55, after: 'Taunt', face: [0, 112] });
    else cast.push({ who, at: [0, by], enter, delay: 0.3, edur: enter === 'rift' ? 1.4 : 1.3, after: 'Taunt', face: [0, 112] });
    return { k: 'film', stage: i, area: 'last', say, d: 3.6, cast, cam: { at: [0, 40], to: [0, by + 10], zoom: [1.3, big ? 1.6 : 2.1], lift: big ? 40 : 28 }, card: { who, also, at: 1.6 } };
  };
  const clash = (i, b) => ({ k: 'clash', stage: i, b, d: 1.8 });
  const D = () => VS.DATA;

  S.BEFORE = [
    // Dusk at the Black Gate: the first chained king.
    { shots: [
      climb(0, 'Five chained kings stand between you and him.'),
      meet(0, 'warden', "The Gatewarden holds the soul of the King of the Black Gate. Free him."),
      clash(0, 'warden')] },
    { shots: [
      climb(1, 'The first king is free, and he climbs with you.'),
      walk(1, 'Frost has sealed the old cloister.', 'THE FIRST HOUR'),
      meet(1, 'twinA', "The Frost King's soul, torn in two: the Hollow Twins.", 'twinB'),
      clash(1, 'twinB')] },
    { shots: [
      climb(2, 'Higher, into the mountain. The air grows dark.'),
      walk(2, 'The Umbral Stair winds through total darkness.', 'THE SECOND HOUR'),
      meet(2, 'umbral', 'The King under the Stair became the Umbral. He hides in your own shadow.'),
      clash(2, 'umbral')] },
    { shots: [
      climb(3, 'Halfway up. The Moon bleeds faster.'),
      walk(3, 'Nothing lives in the Ashen Waste.', 'THE THIRD HOUR'),
      meet(3, 'hunger', 'The Ash King burned with his kingdom. What is left is the Hunger.'),
      clash(3, 'hunger')] },
    { shots: [
      climb(4, 'Near the top, the wind turns to blades.'),
      walk(4, "The Wind's Throat: one narrow path into the storm.", 'THE FOURTH HOUR'),
      meet(4, 'wing', "The Storm King's soul rides the Pale Wing. It has never let anyone pass."),
      clash(4, 'wing')] },
    { shots: [
      climb(5, 'The summit. Five kings climb with you now.'),
      { k: 'film', stage: 5, area: 'last', eyebrow: 'THE LAST HOUR', say: 'The same swordsman. Seven hundred years old, and alive.', d: 3.6,
        cast: [{ who: 'hero', at: [-40, 80], to: [-8, 22], mdur: 2.8 }, { who: 'firstCut', at: [0, -60], aura: true, face: [0, 22] }],
        cam: { at: [0, 30], to: [0, -14], zoom: [1.2, 1.5] } },
      { k: 'film', stage: 5, area: 'last', say: 'The wound keeps him alive. He will not let you close it.', d: 3.4,
        cast: [{ who: 'hero', at: [-8, 22], face: [0, -60] }, { who: 'firstCut', at: [0, -60], aura: true, clip: 'Taunt', face: [0, 22] }],
        cam: { at: [0, -50], to: [0, -60], zoom: [2.3, 2.7] }, card: { who: 'firstCut', at: 0.5 } },
      clash(5, 'firstCut')] },
  ];

  // ---- The kings of the Spire's five kingdoms (the opening film, js/openfilm.js, names them and kills them).
  const KINGS = [
    { stage: 0, title: 'THE KING OF THE BLACK GATE', set: 'vh_paladin_003', guards: ['vh_knight_006', 'vh_knight_009'] },
    { stage: 1, title: 'THE FROST KING', set: 'vh_paladin_008', guards: ['vh_knight_012', 'vh_knight_015'] },
    { stage: 2, title: 'THE KING UNDER THE STAIR', set: 'vh_warlock_009', guards: ['vh_warlock_004', 'vh_warlock_006'] },
    { stage: 3, title: 'THE ASH KING', set: 'vh_barbarian_004', guards: ['vh_barbarian_009', 'vh_barbarian_013'] },
    { stage: 4, title: 'THE STORM KING', set: 'vh_paladin_005', guards: ['vh_knight_006', 'vh_knight_012'] },
  ];
  S.KINGS = KINGS;
  S.KING_SETS = KINGS.flatMap((k) => [k.set].concat(k.guards));

  // The campaign plays these pieces: the prologue before the first trial, each act's intro the
  // first time you climb into it, and each guardian's intro before its fight.
  const B = S.BEFORE;
  S.ACTS = [
    { intro: null, boss: { shots: B[0].shots } },
    { intro: { shots: B[1].shots.slice(0, 2) }, boss: { shots: B[1].shots.slice(2) } },
    { intro: { shots: B[2].shots.slice(0, 2) }, boss: { shots: B[2].shots.slice(2) } },
    { intro: { shots: B[3].shots.slice(0, 2) }, boss: { shots: B[3].shots.slice(2) } },
    { intro: { shots: B[4].shots.slice(0, 2) }, boss: { shots: B[4].shots.slice(2) } },
    { intro: { shots: B[5].shots.slice(0, 1) }, boss: { shots: B[5].shots.slice(1) } },
    { intro: { shots: [{ k: 'title', top: 'AFTER DAWN', title: 'ECHOES OF THE NIGHT', sub: 'The guardians are gone, but their echoes still walk the Spire.', d: 3.4 }] }, boss: null },
  ];

  // No lines are spoken in fights.
  S.PHASE = {};

  // ---- The opening (2026-11-12, the author: "the 2D angle isn't working at all"; the pick: the game's isometric view,
  // cinematic). The fight camera's own high three-quarter angle on the real arenas, filmed like a movie: close framing,
  // slow motion, slow eased camera moves that trail their subject, a colour grade (silver for the night of the white
  // Moon, red after the cut), a pool of light on the subject with the rest falling into dark, wide letterbox bars with
  // one quiet line in the lower bar, a fade between shots, no game interface. Then the title (js/openfilm.js).
  //   1. The summit under the white Moon.    5. The cut: the grade turns from silver to red.   9. The Pale Wing.
  //   2. Along the five kings.               6. The dead rise at the Black Gate.               10. Vesper, the last knight.
  //   3. A swordsman climbs the Throat.      7. The Gatewarden: a king chained inside.        11. The summit: "Kneel."
  //   4. One take: the five kings fall.      8. The Hunger.
  const KP = (i) => [(i - 2) * 36, (i - 2) * 36];   // the kings in a line across the screen, around the altar
  const kingsCast = (o) => KINGS.map((k, i) => Object.assign({ who: 'ghoul', id: 'king' + i, set: k.set, at: KP(i), face: 'cam', clip: 'Idle' }, o ? o(i) : {}));
  const CINE = { cine: true, fade: [0.9, 0.6] };
  // ---- The fight (2026-11-12, the author: "it should be like a violent badass fight"). Two shots, each choreographed
  // beat by beat: the kings come at him together and he cuts through them; then the last king and he cross blades.
  // G(sx, sy): a point on the floor by its place on screen (sx to the right, sy toward the camera).
  const G = (sx, sy) => [Math.round(0.7071 * (sx - sy)), Math.round(0.7071 * (sx + sy))];
  // holds: [[film time, real seconds, speed]]: a hit-stop or slow motion. Gives the shot's ramp and its real length.
  const holds = (film, list) => { let extra = 0; const ramp = []; for (const [f, rd, sp] of list) { ramp.push([f + extra, sp], [f + extra + rd, 1]); extra += rd * (1 - sp); } return { ramp, d: film + extra }; };
  const hit = (t, ids, o) => {   // a blow landing: flash, punch, shake, sound, a slash and blood on whoever it lands on
    o = o || {}; const ev = [[t, { type: 'flash', a: o.flash || 0.5, col: o.col || '255,236,236' }], [t, { type: 'punch', n: o.punch || 0.07 }], [t, { type: 'shake', n: o.shake || 9 }],
      [t, { type: 'sfx', name: o.sfx || 'blow_big', v: 1 }], [t, { type: 'sfx', name: 'slash_1', v: 0.8 }]];
    for (const id of ids) ev.push([t, { type: 'hurt', on: id }], [t, { type: 'pk', name: o.pk || 'v_slash', on: id, z: 24, scale: o.scale || 1.3 }], [t, { type: 'pk', name: 'v_blood', on: id, z: 22, scale: 1.4 }], [t + 0.05, { type: 'pk', name: 'v_impact', on: id, z: 20, scale: 1.1 }]);
    return ev;
  };
  // Shot A: the kings at once. The Black Gate and the Frost King charge from both sides and he cuts them down in one
  // turn; the King under the Stair casts and he rolls clear, then dashes through him; the Ash King's axe meets his
  // blade in a parry, and the counter kills him. The Storm King watches, and raises his sword.
  const A0 = G(0, 0), A = { k0: G(-80, 10), k1: G(78, 20), k2: G(10, -85), k3: G(-58, -55), k4: G(72, -62) };
  const FA = holds(4.7, [[1.25, 0.45, 0.07], [2.68, 0.35, 0.1], [3.5, 0.3, 0.15], [4.0, 0.45, 0.07]]);
  const fightA = { k: 'film', stage: 5, area: 'last', d: FA.d, ramp: FA.ramp, grade: 'silver', say: 'The five kings met him together.', sayAt: 0.2,
    cast: [
      { who: 'firstCut', id: 'fc', at: A0, face: 'k0', clip: 'Idle4',
        path: [[0, ...A0], [2.0, ...A0], [2.36, ...G(-30, 20)], [2.47, ...G(-30, 20)], [2.64, ...G(-2, -66)], [3.8, ...G(-2, -66)], [3.95, ...G(-16, -58)]],
        acts: [[1.02, 'Attack6', 0.7, 16], [2.0, 'Rolling', 0.36, 40], [2.5, 'Attack3', 0.5, 18], [3.36, 'Attack1', 0.45, 16], [3.8, 'Attack2', 0.6, 18]] },
      { who: 'ghoul', id: 'k0', set: KINGS[0].set, at: A.k0, face: 'fc', path: [[0, ...A.k0], [0.6, ...A.k0], [1.15, ...G(-22, 4)], [1.3, ...G(-22, 4)], [1.7, ...G(-64, 16)]],
        acts: [[0.1, 'Taunt', 0.5, 10], [1.0, 'Attack1', 0.3, 16]], die: 1.3, linger: 2.6, run: true },
      { who: 'ghoul', id: 'k1', set: KINGS[1].set, at: A.k1, face: 'fc', path: [[0, ...A.k1], [0.6, ...A.k1], [1.15, ...G(20, 6)], [1.3, ...G(20, 6)], [1.7, ...G(62, 22)]],
        acts: [[1.0, 'Attack2', 0.3, 16]], die: 1.3, linger: 2.6, run: true },
      { who: 'ghoul', id: 'k2', set: KINGS[2].set, at: A.k2, face: 'fc', path: [[0, ...A.k2], [2.7, ...A.k2], [3.0, ...G(16, -104)]],
        acts: [[1.66, 'Attack3', 0.6, 14]], die: 2.7, linger: 1.8 },
      { who: 'ghoul', id: 'k3', set: KINGS[3].set, at: A.k3, face: 'fc', path: [[0, ...A.k3], [3.0, ...A.k3], [3.38, ...G(-20, -64)], [3.5, ...G(-20, -64)], [3.7, ...G(-34, -60)], [4.0, ...G(-34, -60)], [4.3, ...G(-56, -56)]],
        acts: [[0.2, 'Taunt', 0.6, 10], [3.22, 'Attack4', 0.4, 16], [3.5, 'TakeDamage', 0.35, 20]], die: 4.0, linger: 2, run: true },
      { who: 'ghoul', id: 'k4', set: KINGS[4].set, at: A.k4, face: 'fc', acts: [[4.1, 'Taunt', 0.6, 10]] }],
    bolts: [{ at: 1.95, from: 'k2', to: A0, dur: 0.32, fx: 'fireball_arcane', big: true }],
    ev: [].concat(
      [[0.6, { type: 'sfx', name: 'step_2', v: 0.7 }], [0.95, { type: 'sfx', name: 'swish_1', v: 0.9 }]],
      hit(1.25, ['k0', 'k1'], { flash: 0.7, punch: 0.09, shake: 12, scale: 1.6 }),
      [[1.75, { type: 'sfx', name: 'magic', v: 0.8 }], [2.27, { type: 'pk', name: 'v_blast', x: A0[0], y: A0[1], scale: 1.3 }],
        [2.27, { type: 'sfx', name: 'bolt', v: 1 }], [2.27, { type: 'shake', n: 8 }], [2.0, { type: 'sfx', name: 'whoosh', v: 0.7 }], [2.47, { type: 'sfx', name: 'whoosh', v: 0.9 }]],
      hit(2.68, ['k2']),
      [[3.25, { type: 'sfx', name: 'swish_2', v: 0.9 }], [3.5, { type: 'flash', a: 0.8, col: '255,250,230' }], [3.5, { type: 'punch', n: 0.08 }], [3.5, { type: 'shake', n: 12 }],
        [3.5, { type: 'sfx', name: 'clang_1', v: 1 }], [3.5, { type: 'pk', name: 'v_impact', x: G(-10, -65)[0], y: G(-10, -65)[1], z: 30, scale: 1.6 }], [3.52, { type: 'pk', name: 'hit_crit', x: G(-10, -65)[0], y: G(-10, -65)[1], z: 30 }]],
      hit(4.0, ['k3'], { flash: 0.6, shake: 11 })),
    cam: { follow: 'fc', off: G(0, -14), zoom: [2.55, 2.75], lift: 22, lag: 3.2 }, light: { on: [0.5, 0.52], r: 0.8, dark: 0.55 } };
  // Shot B: the last king. They run at each other, cross blades in a white flash, and come to rest back to back. A beat;
  // then the Storm King falls.
  const FB = holds(3.7, [[1.05, 0.55, 0.05], [2.55, 0.5, 0.35]]);
  const fightB = { k: 'film', stage: 5, area: 'last', d: FB.d, ramp: FB.ramp, grade: 'silver', say: 'He killed all five and took their souls.', sayAt: FB.d - 1.9,
    cast: [
      { who: 'firstCut', id: 'fc', at: G(-75, 8), face: 'k4', clip: 'Idle4', path: [[0, ...G(-75, 8)], [0.5, ...G(-75, 8)], [1.0, ...G(-8, 2)], [1.08, ...G(-8, 2)], [1.32, ...G(58, -6)]],
        acts: [[0.85, 'Attack3', 0.5, 18]], run: true },
      { who: 'ghoul', id: 'k4', set: KINGS[4].set, at: G(75, -8), face: 'fc', path: [[0, ...G(75, -8)], [0.5, ...G(75, -8)], [1.0, ...G(8, -2)], [1.08, ...G(8, -2)], [1.32, ...G(-48, 6)]],
        acts: [[0.1, 'Taunt', 0.4, 10], [0.85, 'Attack2', 0.5, 18], [2.25, 'TakeDamage', 0.3, 16]], die: 2.55, linger: 3, run: true }],
    ev: [[0.5, { type: 'sfx', name: 'step_2', v: 0.8 }], [0.9, { type: 'sfx', name: 'swish_2', v: 1 }],
      [1.05, { type: 'flash', a: 1, col: '255,255,255' }], [1.05, { type: 'punch', n: 0.1 }], [1.05, { type: 'shake', n: 14 }], [1.05, { type: 'sfx', name: 'clang_1', v: 1 }], [1.06, { type: 'sfx', name: 'blow_big', v: 1 }],
      [1.05, { type: 'pk', name: 'v_impact', x: 0, y: 0, z: 30, scale: 2.0 }], [1.06, { type: 'pk', name: 'hit_crit', x: 0, y: 0, z: 30, scale: 1.4 }],
      [2.5, { type: 'pk', name: 'v_blood', on: 'k4', z: 24, scale: 1.8 }], [2.5, { type: 'pk', name: 'v_slash', on: 'k4', z: 26, scale: 1.5 }], [2.5, { type: 'sfx', name: 'slash_2', v: 1 }], [2.5, { type: 'flash', a: 0.4, col: '255,220,220' }],
      [2.9, { type: 'pk', name: 'v_soul', on: 'k4', z: 10 }], [2.9, { type: 'sfx', name: 'soul', v: 0.7 }]],
    cam: { at: [0, 0], to: [0, 0], zoom: [2.6, 3.2], lift: 24 }, light: { on: [0.5, 0.52], r: 0.7, dark: 0.6 } };

  S.OPENING = { hint: true, shots: [
    Object.assign({ k: 'film', stage: 5, area: 'last', d: 5.6, grade: 'silver', eyebrow: 'THE SPIRE', say: 'Long ago, a white Moon kept the dead asleep.', sayAt: 1.2,
      cast: kingsCast(), cam: { at: [40, -90], to: [0, 0], zoom: [1.25, 1.7], lift: 30 }, light: { on: [0.5, 0.52], r: 0.75, dark: 0.6 } }, CINE, { fade: [1.6, 0.6] }),
    Object.assign({ k: 'film', stage: 5, area: 'last', d: 5.8, grade: 'silver', say: 'Five kings kept her peace, one for each kingdom of the mountain.',
      cast: kingsCast((i) => ({ acts: [[0.5 + i * 0.95, 'Taunt', 1.3, 10]] })), cam: { at: KP(0), to: KP(4), zoom: [2.7, 2.9], lift: 22 }, light: { on: [0.5, 0.5], r: 0.62, dark: 0.55, col: '#b8c8ff', glow: 0.12 } }, CINE),
    Object.assign({ k: 'film', stage: 4, area: 0, d: 5.2, grade: 'silver', slow: 0.6, say: 'Then a swordsman climbed the mountain.',
      cast: [{ who: 'firstCut', id: 'fc', at: [170, 0], path: [[0, 170, 0], [5.0, 30, 0]] }], cam: { follow: 'fc', off: [-18, 0], zoom: [2.5, 2.9], lift: 18, lag: 1.6 }, light: { on: 'fc', r: 0.5, dark: 0.75 } }, CINE),
    Object.assign(fightA, CINE, { fade: [0.5, 0.25] }),
    Object.assign(fightB, CINE, { fade: [0.25, 0.6] }),
    Object.assign({ k: 'film', stage: 5, area: 'last', d: 6.2, grade: { from: 'silver', to: 'red', at: 3.15, dur: 0.6 }, slow: 0.55, say: 'With them he cut the Moon. Her light turned red.', sayAt: 3.4,
      cast: [{ who: 'firstCut', id: 'fc', at: [0, 0], face: 'cam', clip: 'C_Stand', acts: [[0.8, 'C_Raise', 2.2, 6], [3.0, 'C_Cut', 3.2, 9]] }],
      ev: [[1.0, { type: 'sfx', name: 'charge', v: 0.7 }], [1.2, { type: 'pk', name: 'v_soul', x: -40, y: -10, z: 20 }], [1.5, { type: 'pk', name: 'v_soul', x: 30, y: 40, z: 20 }], [1.8, { type: 'pk', name: 'v_soul', x: 40, y: -30, z: 20 }],
        [3.15, { type: 'flash', a: 1, col: '255,255,255' }], [3.15, { type: 'shake', n: 14 }], [3.15, { type: 'sfx', name: 'blow_big', v: 1 }], [3.2, { type: 'sfx', name: 'quake', v: 0.8 }],
        [3.25, { type: 'pk', name: 'v_shock', x: 0, y: 0, scale: 1.6 }], [3.15, { type: 'pk', name: 'v_pillar', x: 0, y: 0, scale: 1.0 }]],
      cam: { at: [0, 0], to: [0, 0], zoom: [2.4, 3.3], lift: 30 }, light: { on: 'fc', r: 0.55, dark: 0.7 } }, CINE),
    Object.assign({ k: 'film', stage: 0, area: 0, d: 5.4, grade: 'red', say: 'And red light wakes the dead.', sayAt: 1.0,
      cast: [[-30, 20, 0.2], [40, -10, 0.7], [-70, -40, 1.1], [10, 60, 1.5], [80, 40, 1.9], [-20, -80, 2.3], [-90, 50, 2.6]].map(([x, y, dl], i) => ({ who: 'ghoul', set: ['vh_townsfolk_001', 'vh_townsfolk_004', 'vh_townsfolk_007', 'vh_townsfolk_010', 'vh_townsfolk_013', 'vh_skeleton_002', 'vh_townsfolk_004'][i], at: [x, y], enter: 'rift', delay: dl, edur: 1.6, face: 'cam', clip: 'Idle' })),
      cam: { at: [0, 0], to: [-10, 10], zoom: [1.9, 2.5], lift: 20, breathe: 2 }, light: { on: [0.5, 0.52], r: 0.7, dark: 0.55 } }, CINE),
    Object.assign({ k: 'film', stage: 0, area: 'last', d: 4.4, grade: 'red', say: "He chained each king's soul inside a monster.", sayAt: 0.6,
      cast: [{ who: 'warden', id: 'g', at: [0, -85], face: 'cam', aura: true, clip: 'Idle', acts: [[1.4, 'Taunt', 1.6, 10]] }], card: { who: 'warden', at: 1.6, sub: 'THE KING OF THE BLACK GATE, CHAINED' },
      cam: { at: [0, -60], to: [0, -85], zoom: [2.2, 2.9], lift: 30 }, light: { on: 'g', r: 0.55, dark: 0.7 } }, CINE, { fade: [0.6, 0.4] }),
    Object.assign({ k: 'film', stage: 3, area: 'last', d: 3.2, grade: 'red',
      cast: [{ who: 'hunger', id: 'g', at: [0, -95], face: 'cam', aura: true, clip: 'Idle', acts: [[0.9, 'Taunt', 1.6, 10]] }], card: { who: 'hunger', at: 0.7, sub: 'THE ASH KING, CHAINED' },
      cam: { at: [-20, -80], to: [0, -95], zoom: [2.0, 2.4], lift: 40 }, light: { on: 'g', r: 0.6, dark: 0.6, col: '#ff6a3a', glow: 0.3 } }, CINE, { fade: [0.4, 0.4] }),
    Object.assign({ k: 'film', stage: 4, area: 'last', d: 3.4, grade: 'red',
      cast: [{ who: 'wing', id: 'g', at: [0, -95], face: 'cam', aura: true, clip: 'Idle', acts: [[0.9, 'Taunt', 1.6, 10]] }], card: { who: 'wing', at: 0.7, sub: 'THE STORM KING, CHAINED' },
      cam: { at: [20, -80], to: [0, -95], zoom: [1.9, 2.3], lift: 44 }, light: { on: 'g', r: 0.6, dark: 0.7 } }, CINE, { fade: [0.4, 0.8] }),
    Object.assign({ k: 'film', stage: 0, area: 0, d: 5.6, grade: 'red', slow: 0.6, eyebrow: 'THE LAST NIGHT', say: 'Seven hundred years later, one knight still stands.', sayAt: 1.0,
      cast: [{ who: 'hero', id: 'h', at: [0, 0], face: 'cam', clip: 'Idle4' }].concat([[-150, -20], [130, -110], [150, 60]].map(([x, y], i) => ({ who: 'ghoul', set: ['vh_townsfolk_007', 'vh_skeleton_002', 'vh_townsfolk_013'][i], at: [x, y], path: [[0, x, y], [5.6, x * 0.72, y * 0.72]], face: [0, 0] }))),
      card: { who: 'hero', at: 2.2 }, cam: { at: [0, 0], to: [0, 0], zoom: [2.6, 3.7], lift: 24, breathe: 1.2 }, light: { on: 'h', r: 0.5, dark: 0.72, col: '#ffd8dc', glow: 0.1 } }, CINE),
    Object.assign({ k: 'film', stage: 5, area: 'last', d: 5.2, grade: 'red', slow: 0.7, eyebrow: 'THE FIRST CUT', say: '"Kneel."', sayAt: 2.6,
      cast: [{ who: 'hero', id: 'h', at: [0, 120], path: [[0, 0, 120], [3.4, 0, 46]], face: [0, -40] }, { who: 'firstCut', id: 'fc', at: [0, -40], face: [0, 120], aura: true, clip: 'C_Stand', acts: [[2.4, 'C_Command', 2.8, 6]] }],
      cam: { at: [0, 90], to: [0, -20], zoom: [2.2, 2.8], lift: 30 }, light: { on: 'fc', r: 0.6, dark: 0.7 } }, CINE, { fade: [0.6, 1.2] }),
  ] };

  S.ENDING = { shots: [
    { k: 'seal', eyebrow: 'DAWN', say: 'With the five kings beside you, you strike the wound.', d: 4.2 },
    { k: 'film', stage: 5, area: 'last', tint: 'dawn', say: 'The wound closes. The Moon turns white again, and the dead sleep.', d: 4.8,
      cast: [{ who: 'hero', at: [0, 20], face: 'cam' }], cam: { at: [0, 22], to: [0, 10], zoom: [2.6, 1.4] } },
    { k: 'title', top: 'THANK YOU FOR PLAYING', title: 'THE BLEEDING MOON', d: 3.2 }] };

  // 'hero' is whoever is being played (set by main.js).
  S.heroKey = 'vesper';
  S.speaker = function (key) {
    if (key === 'hero') key = S.heroKey;
    const H = VS.DATA && VS.DATA.HEROES && VS.DATA.HEROES[key]; if (H) return { name: H.name, set: H.set, color: H.color };
    if (S.SPEAKERS[key]) return S.SPEAKERS[key];
    const f = VS.DATA && VS.DATA.FOES[key]; return f ? { name: f.name, set: f.set, color: f.color, scale: f.scale } : null;
  };
})(typeof window !== 'undefined' ? window : globalThis);
