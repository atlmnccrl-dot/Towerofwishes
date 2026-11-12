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
  //   1. The rite: the Moon's light on each king.  5. The cut: the grade turns from silver to red.   9. The Pale Wing.
  //   2. Each king's power, one by one.            6. The dead rise at the Black Gate.               10. Vesper, the last knight.
  //   3. A swordsman climbs the Throat.      7. The Gatewarden: a king chained inside.        11. The summit: "Kneel."
  //   4. One take: the five kings fall.      8. The Hunger.
  const CINE = { cine: true, fade: [0.9, 0.6] };
  // ---- The fight (2026-11-12, the author: "it should be like a violent badass fight"). Two shots, each choreographed
  // beat by beat: the kings come at him together and he cuts through them; then the last king and he cross blades.
  // G(sx, sy): a point on the floor by its place on screen (sx to the right, sy toward the camera).
  const G = (sx, sy) => [Math.round(0.7071 * (sx - sy)), Math.round(0.7071 * (sx + sy))];
  // holds: [[film time, real seconds, speed]]: a hit-stop or slow motion. Gives the shot's ramp and its real length.
  const holds = (film, list) => { let extra = 0; const ramp = []; for (const [f, rd, sp] of list) { ramp.push([f + extra, sp], [f + extra + rd, 1]); extra += rd * (1 - sp); } return { ramp, d: film + extra }; };
  const hit = (t, ids, o) => {   // a blow landing: flash, punch, shake, sound; sparks and blood thrown away from him; one drawn slash
    o = o || {}; const ev = [[t, { type: 'flash', a: o.flash || 0.45, col: o.col || '255,236,236' }], [t, { type: 'punch', n: o.punch || 0.07 }], [t, { type: 'shake', n: o.shake || 9 }],
      [t, { type: 'sfx', name: o.sfx || 'blow_big', v: 1 }], [t, { type: 'sfx', name: 'slash_1', v: 0.8 }]];
    for (const id of ids) {
      ev.push([t, { type: 'hurt', on: id }], [t, { type: 'blow', on: id, by: o.by || 'fc', big: !!o.big }]);
      if (o.pk) ev.push([t, { type: 'pk', name: o.pk, on: id, by: o.by || 'fc', turn: true, z: 22, scale: o.scale || 1.5 }]);
    }
    return ev;
  };
  // P(r, deg): a point r from the middle of the floor at an angle on screen (0 to the right, 90 toward the camera).
  const P = (r, deg) => G(r * Math.cos(deg * Math.PI / 180), r * Math.sin(deg * Math.PI / 180));
  const big = (t, on, o) => [[t, { type: 'impact', dur: (o && o.dur) || 0.18, on }], [t, { type: 'sfx', name: 'quake', v: 0.7 }]];
  const cb = (name, t, where, scale, z, o) => [t, Object.assign({ type: 'pk', name: 'cb:' + name, z: z || 0, scale: scale || 1 }, typeof where === 'string' ? { on: where } : { x: where[0], y: where[1] }, o || {})];
  // The pack's effects, started where the action is (from: skips a slow build-up) and cut before they linger (end).
  const THUNDER = { from: 0.66, end: 1.55 }, STOMP = { from: 0.5, end: 1.5 }, FIRE = { from: 0.72, end: 1.9 }, FROST = { from: 0.75, end: 1.9 }, CLEAVE = { from: 0.28, end: 0.95 };
  // Shot A: the armies. The five kings watch from the far side while their guards close on him from every side. He
  // turns once, and seven of them are thrown back dead; he cuts the last three down in three dashes, then points his
  // sword at the kings.
  const GUARDS = KINGS.flatMap((k) => k.guards), RING = GUARDS.map((g, i) => 18 + 36 * i), LATE = { 0: 1, 2: 1, 4: 1 };
  const FA = holds(4.4, [[1.25, 0.6, 0.05], [1.95, 0.14, 0.12], [2.28, 0.14, 0.12], [2.62, 0.45, 0.06]]);
  const dashA = [[1.75, 1.9, P(30, 18)], [2.1, 2.23, P(32, 90)], [2.42, 2.56, P(32, 162)]];
  const lateKill = { 0: [1.95, 1.4, 1.95, 48], 2: [2.28, 1.5, 2.25, 52], 4: [2.62, 1.6, 2.6, 50] };   // hit, charge from, arrive, radius
  const fightA = { k: 'film', stage: 5, area: 'last', d: FA.d, ramp: FA.ramp, grade: 'silver', say: 'The five kings met him with their armies.', sayAt: 0.3,
    cast: [{ who: 'firstCut', id: 'fc', at: [0, 0], face: 'g1', clip: 'Idle4',
        path: [[0, 0, 0], [1.75, 0, 0]].concat(dashA.flatMap(([a, b, p], i) => [[a, ...(i ? dashA[i - 1][2] : [0, 0])], [b, ...p]])),
        acts: [[0.3, 'Special1', 0.7, 12], [1.05, 'Attack6', 0.7, 16], [1.82, 'Attack2', 0.4, 18], [2.16, 'Attack3', 0.4, 18], [2.5, 'Attack2', 0.5, 18], [3.2, 'C_Command', 1.2, 8]] }]
      .concat(GUARDS.map((set, i) => {
        const a = RING[i], lk = lateKill[i];
        if (lk) return { who: 'ghoul', id: 'g' + i, set, at: P(92, a), face: 'fc', run: true, die: lk[0], linger: 2,
          path: [[0, ...P(92, a)], [lk[1], ...P(92, a)], [lk[2], ...P(lk[3], a)], [lk[0] + 0.02, ...P(lk[3], a)], [lk[0] + 0.4, ...P(lk[3] + 34, a)]], acts: [[lk[2] - 0.2, 'Attack1', 0.3, 16]] };
        return { who: 'ghoul', id: 'g' + i, set, at: P(92, a), face: 'fc', run: true, die: 1.27, linger: 2.2,
          path: [[0, ...P(92, a)], [0.7, ...P(92, a)], [1.2, ...P(24, a)], [1.27, ...P(24, a)], [1.8, ...P(112, a)]], acts: [[1.05, i % 2 ? 'Attack1' : 'Attack2', 0.3, 16]] };
      }), KINGS.map((k, i) => ({ who: 'ghoul', id: 'k' + i, set: k.set, at: P(122, 215 + i * 27.5), face: 'fc',
        path: [[0, ...P(122, 215 + i * 27.5)], [3.0, ...P(122, 215 + i * 27.5)], [4.2, ...P(100, 215 + i * 27.5)]], acts: [[0.2 + i * 0.25, 'Taunt', 0.8, 10]] }))),
    ev: [].concat([[0.35, { type: 'sfx', name: 'charge', v: 0.7 }], [0.7, { type: 'sfx', name: 'step_2', v: 0.8 }], [1.0, { type: 'sfx', name: 'swish_2', v: 1 }]],
      big(1.25), [cb('01_crimson_tide_cleave/target', 1.25, 'fc', 1.7, 8, CLEAVE), cb('10_quake_stomp/target', 1.26, 'fc', 1.0, 0, STOMP)],
      hit(1.27, RING.map((_, i) => 'g' + i).filter((_, i) => !LATE[i]), { flash: 0.8, punch: 0.1, shake: 18, big: true }),
      [[1.75, { type: 'sfx', name: 'whoosh', v: 0.9 }], [2.1, { type: 'sfx', name: 'whoosh', v: 0.9 }], [2.42, { type: 'sfx', name: 'whoosh', v: 1 }]],
      hit(1.95, ['g0'], { shake: 8, pk: 'cleave' }), hit(2.28, ['g2'], { shake: 8, pk: 'cleave' }), hit(2.62, ['g4'], { flash: 0.7, shake: 13, pk: 'cleave', scale: 1.8, big: true }), big(2.62, 'g4', { dur: 0.12 }),
      [[3.25, { type: 'sfx', name: 'unsheathe_01', v: 0.6 }], [3.3, { type: 'pk', name: 'fc_glint', on: 'fc', z: 40 }]]),
    cam: { follow: 'fc', off: G(0, -24), zoom: [2.0, 2.45], lift: 22, lag: 3 }, light: { on: [0.5, 0.5], r: 0.85, dark: 0.5 } };

  // Shot B: the kings' powers. The Frost King's ice bursts where he stood; the Storm King calls lightning down after
  // him, strike after strike, a step behind each dash; his crescent cuts through the Frost King and the King of the
  // Black Gate behind him in one stroke; the Ash King leaps in and slams the ground in fire, and he rolls clear and
  // dashes through him; the King under the Stair's ghostfire he strikes back into its caster.
  const KB = { k0: P(122, 200), k1: P(78, 200), k2: P(58, 8), k3: P(98, 140), k4: P(104, 300) };
  const D1 = P(50, 60), D2 = P(48, 118), D3 = P(42, 172), D4 = P(18, 250), D5 = P(58, 300), ASH = P(8, 222);
  const THRU = [Math.round(ASH[0] + (ASH[0] - D5[0]) * 0.9), Math.round(ASH[1] + (ASH[1] - D5[1]) * 0.9)];
  const FB = holds(5.3, [[1.22, 0.12, 0.2], [1.52, 0.12, 0.2], [1.82, 0.12, 0.2], [2.3, 0.55, 0.05], [3.25, 0.3, 0.1], [3.78, 0.4, 0.07], [4.77, 0.45, 0.06]]);
  const fightB = { k: 'film', stage: 5, area: 'last', d: FB.d, ramp: FB.ramp, grade: 'silver', say: 'Ice, storm, fire and shadow. Nothing touched him.', sayAt: 0.4,
    cast: [
      { who: 'firstCut', id: 'fc', at: [0, 0], face: 'k1', clip: 'Idle4',
        path: [[0, 0, 0], [0.45, 0, 0], [0.6, ...D1], [1.05, ...D1], [1.18, ...D2], [1.35, ...D2], [1.48, ...D3], [1.65, ...D3], [1.78, ...D4], [3.1, ...D4], [3.42, ...D5], [3.55, ...D5], [3.72, ...THRU]],
        acts: [[2.0, 'Attack5', 0.55, 16], [3.1, 'Rolling', 0.36, 40], [3.58, 'Attack3', 0.4, 18], [4.42, 'Attack1', 0.35, 18]] },
      { who: 'ghoul', id: 'k0', set: KINGS[0].set, at: KB.k0, face: 'fc', die: 2.38, linger: 2, path: [[0, ...KB.k0], [2.38, ...KB.k0], [2.8, ...P(150, 200)]] },
      { who: 'ghoul', id: 'k1', set: KINGS[1].set, at: KB.k1, face: 'fc', die: 2.3, linger: 2, path: [[0, ...KB.k1], [2.3, ...KB.k1], [2.7, ...P(108, 200)]], acts: [[0.15, 'Special1', 0.8, 12]] },
      { who: 'ghoul', id: 'k2', set: KINGS[2].set, at: KB.k2, face: 'fc', die: 4.77, linger: 2, path: [[0, ...KB.k2], [4.77, ...KB.k2], [5.1, ...P(86, 8)]], acts: [[3.95, 'Attack3', 0.5, 14]] },
      { who: 'ghoul', id: 'k3', set: KINGS[3].set, at: KB.k3, face: 'fc', die: 3.78, linger: 2, path: [[0, ...KB.k3], [2.8, ...KB.k3], [3.25, ...ASH], [3.78, ...ASH], [4.1, ...P(30, 222)]], hop: [[2.8, 3.25, 46]], acts: [[2.75, 'Attack4', 0.6, 14], [3.6, 'TakeDamage', 0.3, 16]] },
      { who: 'ghoul', id: 'k4', set: KINGS[4].set, at: KB.k4, face: 'fc', acts: [[0.95, 'Attack3', 0.9, 12]] }],
    bolts: [{ at: 2.12, from: 'fc', to: P(170, 200), dur: 0.36, fx: 'dark_slash', big: true }, { at: 4.22, from: 'k2', to: 'fc', dur: 0.3, fx: 'fireball_arcane', big: true }, { at: 4.55, from: 'fc', to: 'k2', dur: 0.22, fx: 'fireball_arcane', big: true, reflected: true }],
    ev: [].concat(
      [cb('13_water_orb/target', 0.5, [0, 0], 1.5, 0, FROST), [0.5, { type: 'pk', name: 'v_frost', x: 0, y: 0, scale: 2.2 }], [0.5, { type: 'flash', a: 0.5, col: '210,235,255' }], [0.5, { type: 'sfx', name: 'v_ice', v: 1 }], [0.5, { type: 'shake', n: 8 }], [0.45, { type: 'sfx', name: 'whoosh', v: 0.8 }]],
      [[1.22, D1], [1.52, D2], [1.82, D3]].flatMap(([t, p]) => [cb('101_skyfall_thunder/target', t, p, 1.3, 0, THUNDER), [t, { type: 'flash', a: 0.6, col: '200,220,255' }], [t, { type: 'shake', n: 11 }], [t, { type: 'sfx', name: 'bolt', v: 1 }], [t - 0.15, { type: 'sfx', name: 'whoosh', v: 0.7 }]]),
      [[2.05, { type: 'sfx', name: 'swish_2', v: 1 }]],
      hit(2.3, ['k1'], { flash: 0.7, shake: 14, big: true }), hit(2.38, ['k0'], { shake: 10, big: true }), big(2.3, 'k1'),
      [cb('10_quake_stomp/target', 3.25, ASH, 1.3, 0, STOMP), cb('54_greater_fireball/target', 3.25, ASH, 1.1, 0, FIRE),
        [3.25, { type: 'shake', n: 18 }], [3.25, { type: 'punch', n: 0.1 }], [3.25, { type: 'sfx', name: 'quake', v: 1 }], [3.25, { type: 'sfx', name: 'v_fire', v: 1 }], [3.55, { type: 'sfx', name: 'whoosh', v: 1 }]],
      hit(3.78, ['k3'], { flash: 0.6, shake: 12, big: true, pk: 'cleave', scale: 1.8 }),
      [cb('11_ghostfire_hex/caster', 3.95, 'k2', 1.1, 0, { end: 0.9 }), [4.0, { type: 'sfx', name: 'magic', v: 0.9 }], [4.55, { type: 'sfx', name: 'clang_1', v: 1 }], [4.55, { type: 'flash', a: 0.5, col: '255,250,230' }], [4.55, { type: 'shake', n: 7 }]],
      [cb('54_greater_fireball/target', 4.77, 'k2', 1.6, 0, FIRE), [4.77, { type: 'pk', name: 'spell_fire', on: 'k2', z: 24, scale: 2 }]], hit(4.77, ['k2'], { flash: 0.8, shake: 16, punch: 0.1, big: true }), big(4.77, 'k2', { dur: 0.14 })),
    cam: { follow: 'fc', off: G(-12, -12), offTo: G(34, -8), zoom: [2.3, 2.45], lift: 22, lag: 2.6 }, light: { on: [0.5, 0.5], r: 0.85, dark: 0.5 } };

  // Shot C: the last king. Lightning cracks behind them; they run at each other, cross blades in an impact frame, and
  // come to rest back to back. A beat; then the Storm King falls.
  const FC2 = holds(3.7, [[1.05, 0.6, 0.04], [2.55, 0.5, 0.35]]);
  const fightC = { k: 'film', stage: 5, area: 'last', d: FC2.d, ramp: FC2.ramp, grade: 'silver', say: 'He killed all five and took their souls.', sayAt: FC2.d - 1.9,
    cast: [
      { who: 'firstCut', id: 'fc', at: G(-75, 8), face: 'k4', clip: 'Idle4', path: [[0, ...G(-75, 8)], [0.5, ...G(-75, 8)], [1.0, ...G(-8, 2)], [1.08, ...G(-8, 2)], [1.32, ...G(58, -6)]],
        acts: [[0.85, 'Attack3', 0.5, 18]], run: true },
      { who: 'ghoul', id: 'k4', set: KINGS[4].set, at: G(75, -8), face: 'fc', path: [[0, ...G(75, -8)], [0.5, ...G(75, -8)], [1.0, ...G(8, -2)], [1.08, ...G(8, -2)], [1.32, ...G(-48, 6)]],
        acts: [[0.1, 'Attack3', 0.4, 12], [0.85, 'Attack2', 0.5, 18], [2.25, 'TakeDamage', 0.3, 16]], die: 2.55, linger: 3, run: true }],
    ev: [cb('101_skyfall_thunder/target', 0.15, G(-30, -70), 1.2, 0, THUNDER), [0.15, { type: 'sfx', name: 'bolt', v: 0.8 }], [0.15, { type: 'flash', a: 0.4, col: '200,220,255' }],
      cb('101_skyfall_thunder/target', 0.42, G(40, -80), 1.2, 0, THUNDER), [0.42, { type: 'sfx', name: 'bolt', v: 0.8 }], [0.5, { type: 'sfx', name: 'step_2', v: 0.8 }], [0.9, { type: 'sfx', name: 'swish_2', v: 1 }],
      [1.05, { type: 'impact', dur: 0.24 }], [1.05, { type: 'punch', n: 0.12 }], [1.05, { type: 'shake', n: 16 }], [1.05, { type: 'sfx', name: 'clang_1', v: 1 }], [1.06, { type: 'sfx', name: 'blow_big', v: 1 }],
      
      [2.5, { type: 'pk', name: 'cleave', on: 'k4', by: 'fc', turn: true, z: 24, scale: 1.9 }], [2.5, { type: 'blow', on: 'k4', by: 'fc', big: true }], [2.5, { type: 'hurt', on: 'k4' }], [2.5, { type: 'sfx', name: 'slash_2', v: 1 }], [2.5, { type: 'flash', a: 0.4, col: '255,220,220' }],
      [2.9, { type: 'pk', name: 'v_soul', on: 'k4', z: 10 }], [2.9, { type: 'sfx', name: 'soul', v: 0.7 }]],
    cam: { at: [0, 0], to: [0, 0], zoom: [2.6, 3.2], lift: 24, push: 0.22 }, light: { on: [0.5, 0.52], r: 0.7, dark: 0.6 } };

  // ---- The opening's first two shots (2026-11-12, the author: "the very first scene with the 5 kings just standing there
  // sucks"). The rite: the five kings in a ring around the Moon's altar, and the white Moon's light coming down on each
  // of them in turn as he raises his weapon, then on the altar. Then the kingdoms: the camera tracks along the five,
  // and each shows the power of his kingdom as it passes (the same powers he will fail with in the fight).
  const RITE = [90, 162, 234, 306, 18].map((a) => P(64, a));
  const rite = { k: 'film', stage: 5, area: 'last', d: 6.4, grade: 'silver', eyebrow: 'THE SPIRE', say: 'Long ago, a white Moon kept the dead asleep.', sayAt: 1.4,
    cast: KINGS.map((k, i) => ({ who: 'ghoul', id: 'r' + i, set: k.set, at: RITE[i], face: [0, 0], clip: 'Idle', acts: [[1.1 + i * 0.6, 'Special1', 1.3, 9]] })),
    ev: [].concat([cb('19_recall_beam/caster', 0.2, [0, 0], 2.2, 0, { from: 0.3, end: 1.45 }), cb('19_recall_beam/caster', 1.35, [0, 0], 2.2, 0, { from: 0.6, end: 1.45 }), cb('19_recall_beam/caster', 2.2, [0, 0], 2.2, 0, { from: 0.6, end: 1.45 }), cb('19_recall_beam/caster', 3.05, [0, 0], 2.2, 0, { from: 0.6, end: 1.45 })],
      KINGS.map((_, i) => cb('12_golden_blessing/caster', 1.0 + i * 0.6, 'r' + i, 1.15, 0, { from: 0.7, end: 2.3 })),
      KINGS.map((_, i) => [1.0 + i * 0.6, { type: 'sfx', name: 'soul', v: 0.45 }]),
      [cb('12_golden_blessing/caster', 4.3, [0, 0], 2.0, 0, { from: 0.7, end: 2.4 }), [4.3, { type: 'sfx', name: 'charge', v: 0.6 }], [4.4, { type: 'flash', a: 0.3, col: '220,230,255' }]]),
    cam: { at: G(30, -30), to: G(0, 14), zoom: [1.4, 1.9], lift: 26 }, light: { on: [0.5, 0.52], r: 0.8, dark: 0.55, col: '#d8e2ff', glow: 0.16 } };
  const ARC = [200, 235, 270, 305, 340].map((a) => P(70, a)), POW = (i) => 0.7 + i * 1.15;
  const kingdoms = { k: 'film', stage: 5, area: 'last', d: 6.8, grade: 'silver', say: 'Five kings kept her peace, one for each kingdom of the mountain.', sayAt: 0.6,
    cast: KINGS.map((k, i) => ({ who: 'ghoul', id: 'q' + i, set: k.set, at: ARC[i], face: 'cam', clip: 'Idle',
      acts: [[POW(i) - 0.15, ['Attack4', 'Special1', 'Attack3', 'Special1', 'Attack3'][i], 1.1, 12]] })),
    ev: [
      // The Black Gate: stone. A blow into the ground.
      cb('10_quake_stomp/target', POW(0) + 0.25, 'q0', 0.9, 0, STOMP), [POW(0) + 0.25, { type: 'sfx', name: 'quake', v: 0.6 }], [POW(0) + 0.25, { type: 'shake', n: 6 }],
      // The Frost King: ice.
      cb('13_water_orb/target', POW(1) + 0.2, 'q1', 1.1, 0, FROST), [POW(1) + 0.2, { type: 'pk', name: 'v_frost', on: 'q1', scale: 1.6 }], [POW(1) + 0.2, { type: 'sfx', name: 'v_ice', v: 0.8 }],
      // The King under the Stair: shadow.
      cb('175_violet_veil/caster', POW(2) + 0.1, 'q2', 1.2, 0, { end: 1.4 }), [POW(2) + 0.1, { type: 'sfx', name: 'magic', v: 0.7 }],
      // The Ash King: fire.
      [POW(3) + 0.2, { type: 'pk', name: 'spell_fire', on: 'q3', z: 30, scale: 1.8 }], cb('54_greater_fireball/target', POW(3) + 0.25, 'q3', 0.8, 0, FIRE), [POW(3) + 0.25, { type: 'sfx', name: 'v_fire', v: 0.8 }],
      // The Storm King: lightning down onto his raised sword.
      cb('101_skyfall_thunder/target', POW(4) + 0.3, 'q4', 1.1, 0, THUNDER), [POW(4) + 0.3, { type: 'sfx', name: 'bolt', v: 0.9 }], [POW(4) + 0.3, { type: 'flash', a: 0.5, col: '200,220,255' }], [POW(4) + 0.3, { type: 'shake', n: 7 }]],
    cam: { at: ARC[0], to: ARC[4], zoom: [2.5, 2.7], lift: 24 }, light: { on: [0.5, 0.5], r: 0.7, dark: 0.5, col: '#c8d4ff', glow: 0.1 } };

  S.OPENING = { hint: true, shots: [
    Object.assign(rite, CINE, { fade: [1.6, 0.5] }),
    Object.assign(kingdoms, CINE, { fade: [0.5, 0.6] }),
    Object.assign({ k: 'film', stage: 4, area: 0, d: 5.2, grade: 'silver', slow: 0.6, say: 'Then a swordsman climbed the mountain.',
      cast: [{ who: 'firstCut', id: 'fc', at: [170, 0], path: [[0, 170, 0], [5.0, 30, 0]] }], cam: { follow: 'fc', off: [-18, 0], zoom: [2.5, 2.9], lift: 18, lag: 1.6 }, light: { on: 'fc', r: 0.5, dark: 0.75 } }, CINE),
    Object.assign(fightA, CINE, { fade: [0.5, 0.2] }),
    Object.assign(fightB, CINE, { fade: [0.2, 0.2] }),
    Object.assign(fightC, CINE, { fade: [0.2, 0.6] }),
    Object.assign({ k: 'film', stage: 5, area: 'last', d: 6.2, grade: { from: 'silver', to: 'red', at: 3.15, dur: 0.6 }, slow: 0.55, say: 'With them he cut the Moon. Her light turned red.', sayAt: 3.4,
      cast: [{ who: 'firstCut', id: 'fc', at: [0, 0], face: 'cam', clip: 'C_Stand', acts: [[0.8, 'C_Raise', 2.2, 6], [3.0, 'C_Cut', 3.2, 9]] }],
      ev: [[1.0, { type: 'sfx', name: 'charge', v: 0.7 }], [1.2, { type: 'pk', name: 'v_soul', x: -40, y: -10, z: 20 }], [1.5, { type: 'pk', name: 'v_soul', x: 30, y: 40, z: 20 }], [1.8, { type: 'pk', name: 'v_soul', x: 40, y: -30, z: 20 }],
        [3.15, { type: 'impact', dur: 0.22 }], [3.37, { type: 'flash', a: 0.9, col: '255,255,255' }], [3.15, { type: 'shake', n: 16 }], [3.15, { type: 'punch', n: 0.1 }], [3.15, { type: 'sfx', name: 'blow_big', v: 1 }], [3.2, { type: 'sfx', name: 'quake', v: 0.8 }],
        cb('10_quake_stomp/target', 3.2, [0, 0], 1.3, 0, STOMP), cb('01_crimson_tide_cleave/target', 3.15, [0, 0], 2.3, 30, CLEAVE)],
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
