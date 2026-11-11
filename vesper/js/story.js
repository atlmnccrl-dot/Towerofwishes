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

  // ---- The opening (rebuilt from scratch 2026-11-11): the Spire and its five kingdoms; the white Moon and the five kings;
  // the Kingslayer kills them kingdom by kingdom, each in his own hall; at the summit he spends their souls on the First
  // Cut and cuts the Moon; she reddens, and the dead rise; he chains each king's soul inside a guardian; seven hundred
  // years on, the last night; Vesper climbs it all and reaches him at the last hour. Then the title, and the last hour
  // is played (main.js showcase): his First Cut kills her; the Moon turns the night back (S.WAKE); the campaign.
  // Everything is filmed on the game's own arenas through the fight camera, with the game's own cast.
  const FOLK = ['vh_townsfolk_001', 'vh_townsfolk_004', 'vh_townsfolk_007', 'vh_townsfolk_010', 'vh_townsfolk_013'];
  const KINGS = [
    { stage: 0, title: 'THE KING OF THE BLACK GATE', set: 'vh_paladin_003', guards: ['vh_knight_006', 'vh_knight_009'] },
    { stage: 1, title: 'THE FROST KING', set: 'vh_paladin_008', guards: ['vh_knight_012', 'vh_knight_015'] },
    { stage: 2, title: 'THE KING UNDER THE STAIR', set: 'vh_warlock_009', guards: ['vh_warlock_004', 'vh_warlock_006'] },
    { stage: 3, title: 'THE ASH KING', set: 'vh_barbarian_004', guards: ['vh_barbarian_009', 'vh_barbarian_013'] },
    { stage: 4, title: 'THE STORM KING', set: 'vh_paladin_005', guards: ['vh_knight_006', 'vh_knight_012'] },
  ];
  S.KINGS = KINGS;
  S.KING_SETS = KINGS.flatMap((k) => [k.set].concat(k.guards));
  const FC = 'firstCutFinal', K0 = [0, -30], G1 = [-46, -16], G2 = [46, -22];
  // One king's fall: the king and two guards; the First Cut comes out of the dark and kills them; the king's soul leaves him
  // and goes into the First Cut. move: how he comes and strikes; hit: when the blow lands.
  const kingShot = (k, i, move, say) => {
    const hit = move.hit, die = (who, at, dt) => Object.assign(who, { acts: [[hit + dt, 'Die', 99, 12]] });
    const cast = [die({ who: 'ghoul', set: k.set, at: K0, face: move.at, scale: 1.15 }, 0, 0.05), die({ who: 'ghoul', set: k.guards[0], at: G1, face: move.at }, 0, 0), die({ who: 'ghoul', set: k.guards[1], at: G2, face: move.at }, 0, 0.1),
      Object.assign({ who: FC, at: move.at, face: K0, enter: 'rift', delay: 0.15, edur: 0.7, acts: [[hit - move.wind, move.clip, 1.4, move.fps || 14]] }, move.to ? { to: move.to, mdur: move.mdur, moveAt: hit - move.wind - move.mdur - 0.15 } : {})];
    const ev = [[0.1, { type: 'pk', name: 'cb:01_crimson_tide_cleave/death', x: move.at[0], y: move.at[1], scale: 1.5 }], [0.1, { type: 'pk', name: 'fc_shock', x: move.at[0], y: move.at[1], scale: 1.3 }], [0.12, { type: 'sfx', name: 'whoosh', v: 0.8 }],
      [hit, { type: 'pk', name: move.fx, x: K0[0], y: K0[1], scale: move.fxScale || 1.8 }], [hit, { type: 'pk', name: 'v_blood', x: K0[0], y: K0[1], z: 20, scale: 1.6 }], [hit, { type: 'flash', a: 0.45, col: '255,60,80' }],
      [hit, { type: 'shake', n: 9 }], [hit - 0.02, { type: 'sfx', name: 'slash_2' }], [hit, { type: 'sfx', name: 'blow_big', v: 0.9 }],
      [hit + 0.55, { type: 'pk', name: 'v_soul', x: K0[0], y: K0[1], scale: 1.6 }], [hit + 1.0, { type: 'pk', name: 'v_soul', x: (move.to || move.at)[0], y: (move.to || move.at)[1], scale: 1.2 }], [hit + 0.55, { type: 'sfx', name: 'soul', v: 0.7 }]];
    return { k: 'film', stage: k.stage, area: 0, eyebrow: k.title, say, d: hit + 1.5, cast, ev, cam: { at: [0, 0], to: [0, -6], zoom: [2.1, 2.35], lift: 34 } };
  };
  // The king's soul, chained: his kingdom's guardian stands in a crimson rune at the gate; the soul falls into it; a red
  // flash, and it wakes.
  const chained = (stage, who, also, say) => {
    const big = (D().FOES[who].scale || 1) > 1.2, by = also ? -40 : big ? -95 : -75, k = KINGS[stage], wake = [[1.0, 'Taunt', 1.6, 9]];
    const cast = also ? [{ who, at: [-36, by + 4], face: 'cam', acts: wake }, { who: also, at: [36, by - 4], face: 'cam', acts: wake }] : [{ who, at: [0, by], face: 'cam', acts: wake }];
    return { k: 'film', stage, area: also ? 0 : 'last', eyebrow: k.title, say, d: 2.9, cast, card: { who, also, at: 1.1 },   // the twins on the cloister's open floor (their nave's walls hide them)
      ev: [[0, { type: 'pk', name: 'fc_summon', x: 0, y: by + 4, scale: also ? 3.4 : 2.6 }], [0.05, { type: 'pk', name: 'v_soul', x: 0, y: by - 50, scale: 1.6 }], [0.05, { type: 'sfx', name: 'soul', v: 0.7 }],
        [0.95, { type: 'pk', name: 'fc_shock', x: 0, y: by, scale: 1.4 }], [0.95, { type: 'flash', a: 0.3, col: '255,60,80' }], [0.95, { type: 'sfx', name: 'blow_big', v: 0.6 }]],
      cam: also ? { at: [0, by + 30], to: [0, by + 10], zoom: [2.0, 2.4], lift: 30 } : { at: [0, by + 30], to: [0, by + 10], zoom: [2.2, 2.6], lift: big ? 40 : 30 } };   // the twins framed as in their own fight's intro
  };
  // Vesper cutting her way up through a kingdom in the night: two of the dead fall as she runs past.
  const RUNNERS = [['ghoul', 'raider'], ['ghast', 'ghoul'], ['raider', 'ghast'], ['ghoul', 'raider'], ['ghast', 'raider']];
  const run = (stage, hour, say) => {
    const [a, b] = RUNNERS[stage];
    return { k: 'film', stage, area: 0, tint: 'red', eyebrow: hour, say, d: 1.9,
      cast: [{ who: 'hero', at: [-150, 26], to: [110, -6], mdur: 1.8, run: true, acts: [[0.5, 'Attack1', 0.35, 18], [1.05, 'Attack2', 0.35, 18]] },
        { who: a, at: [-50, 12], face: [-150, 26], acts: [[0.62, 'Die', 99, 14]] }, { who: b, at: [20, 4], face: [-150, 26], acts: [[1.17, 'Die', 99, 14]] }],
      ev: [[0.6, { type: 'pk', name: 'v_blood', x: -50, y: 12, z: 18, scale: 1.3 }], [0.58, { type: 'sfx', name: 'slash_1' }], [1.15, { type: 'pk', name: 'v_blood', x: 20, y: 4, z: 18, scale: 1.3 }], [1.13, { type: 'sfx', name: 'slash_2' }]],
      cam: { follow: 'hero', off: [30, -8], zoom: [1.9, 2.0], lift: 32 } };
  };
  const SUMMIT_DEAD = [[-110, 10], [110, 0], [-60, 70], [70, 80], [0, 110]];
  S.OPEN = { shots: [
    // The Spire: five kingdoms, one above another, up to the Moon (the campaign map's climb).
    { k: 'kingdoms', eyebrow: 'THE SPIRE', say: 'Five kingdoms on one mountain, all the way up to the Moon.', d: 3.8 },
    // Before: the white Moon, the king of the Black Gate and his people.
    { k: 'film', stage: 0, area: 0, tint: 'past', eyebrow: 'BEFORE THE MOON BLED', say: 'The white Moon kept their dead asleep, and five kings kept her peace.', d: 3.6,
      cast: [{ who: 'ghoul', set: KINGS[0].set, at: [0, -30], face: 'cam', scale: 1.15 }, { who: 'ghoul', set: KINGS[0].guards[0], at: [-46, -16], face: 'cam' }, { who: 'ghoul', set: KINGS[0].guards[1], at: [46, -22], face: 'cam' }]
        .concat(FOLK.map((set, i) => ({ who: 'ghoul', set, at: [-170 + i * 70, 70 + (i % 2) * 24], to: [-120 + i * 70, 60 + (i % 2) * 24], mdur: 3.4, face: [0, -30] }))),
      cam: { at: [0, 30], to: [0, 0], zoom: [1.35, 1.7], lift: 34 } },
    { k: 'title', top: 'SEVEN HUNDRED YEARS AGO', title: 'THE KINGSLAYER', d: 2.3 },
    kingShot(KINGS[0], 0, { at: [-70, 40], clip: 'C_Cut', wind: 0.35, hit: 1.25, fx: 'cb:01_crimson_tide_cleave/target', fps: 16 }, 'A swordsman climbed the Spire and cut down every king.'),
    kingShot(KINGS[1], 1, { at: [-150, 70], to: [-34, 6], mdur: 0.3, clip: 'Attack4', wind: 0.3, hit: 1.0, fx: 'cb:90_last_stand_strike/target', fxScale: 1.6 }),
    kingShot(KINGS[2], 2, { at: [10, -70], clip: 'Attack3', wind: 0.3, hit: 0.95, fx: 'cb:01_crimson_tide_cleave/target', fxScale: 1.6 }),
    kingShot(KINGS[3], 3, { at: [-40, 20], clip: 'Special1', wind: 0.45, hit: 1.05, fx: 'cb:10_quake_stomp/caster', fxScale: 1.6 }),
    kingShot(KINGS[4], 4, { at: [-60, 34], clip: 'Attack6', wind: 0.4, hit: 1.1, fx: 'cb:113_earthshaker_stance/target', fxScale: 2.0 }, 'Five kings. Five souls.'),
    // The summit: the five souls come to him; he raises his blade and spends them on one cut.
    { k: 'film', stage: 5, area: 'last', eyebrow: "THE MOON'S ALTAR", say: 'At the summit he spent their souls on a single cut.', d: 4.2,
      cast: [{ who: FC, at: [0, 0], face: 'cam', acts: [[1.1, 'C_Raise', 2.0, 7], [3.0, 'C_Cut', 1.2, 16]] }],
      ev: [0, 1, 2, 3, 4].map((n) => [0.15 + n * 0.16, { type: 'pk', name: 'v_soul', x: Math.cos(n / 5 * 6.283) * 60, y: Math.sin(n / 5 * 6.283) * 38, scale: 1.4 }]).concat([
        [0.2, { type: 'sfx', name: 'soul', v: 0.8 }], [1.1, { type: 'sfx', name: 'charge', v: 1 }], [1.2, { type: 'pk', name: 'fc_summon', x: 0, y: 0, scale: 4.2 }],
        [1.55, { type: 'pk', name: 'cb:54_greater_fireball/target', x: 0, y: 0, scale: 2.2 }], [1.75, { type: 'pk', name: 'v_pillar', x: 0, y: 0, scale: 3 }],
        [3.2, { type: 'pk', name: 'cb:01_crimson_tide_cleave/target', x: 0, y: -20, scale: 2.4 }], [3.2, { type: 'flash', a: 0.7, col: '255,240,240' }], [3.2, { type: 'shake', n: 12 }], [3.18, { type: 'sfx', name: 'god_blade', v: 1 }]]),
      cam: { at: [0, 20], to: [0, 0], zoom: [1.7, 2.2], lift: 40 } },
    // The First Cut: the Moon cut, reddening, bleeding light.
    { k: 'wound', eyebrow: 'THE FIRST CUT', say: 'He cut the Moon. Her light turned red, and red light wakes the dead.', d: 4.6 },
    // The dead rise all around him.
    { k: 'film', stage: 5, area: 'last', tint: 'red', say: 'The dead rose, and her wound kept him alive.', d: 3.8,
      cast: [{ who: FC, at: [0, 0], face: 'cam', clip: 'C_Command', aura: true }].concat([[-110, 30], [100, 20], [-60, 90], [70, 100], [-140, -40], [130, -50], [0, 130], [-30, -90], [40, -100], [-170, 60]].map(([x, y], i) =>
        ({ who: ['ghoul', 'raider', 'ghast', 'raider', 'ghoul', 'ghast', 'raider', 'ghoul', 'ghast', 'raider'][i], at: [x, y], face: [0, 0], enter: 'rift', delay: 0.3 + i * 0.2, edur: 1.0 }))),
      ev: [[0.3, { type: 'sfx', name: 'spawn', v: 0.7 }], [1.2, { type: 'sfx', name: 'reinforce', v: 0.7 }], [2.0, { type: 'sfx', name: 'horn', v: 0.6 }]].concat([[-110, 30], [100, 20], [-60, 90], [70, 100], [-140, -40], [130, -50], [0, 130], [-30, -90], [40, -100], [-170, 60]].map(([x, y], i) => [0.3 + i * 0.2, { type: 'pk', name: 'v_spawn', x, y, scale: 1 }])),
      cam: { at: [0, 30], to: [0, 10], zoom: [1.2, 1.4], lift: 36 } },
    // The chained kings: each king's soul bound inside his kingdom's guardian.
    chained(0, 'warden', null, "He chained each king's soul inside a guardian, to bar the way up."),
    chained(1, 'twinA', 'twinB'),
    chained(2, 'umbral'),
    chained(3, 'hunger'),
    chained(4, 'wing'),
    // Seven hundred years of red nights; tonight, the last.
    { k: 'title', top: 'SEVEN HUNDRED YEARS LATER', title: 'THE LAST NIGHT', sub: 'Tonight the Moon bleeds out. At dawn she dies, and the dead will never sleep again.', d: 3.8 },
    // Vesper at the Black Gate, the Moon's light on her blade.
    { k: 'film', stage: 0, area: 0, tint: 'red', eyebrow: 'THE MOONBLADE', say: "Vesper, the Moon's last knight, went to stop him.", d: 3.6,
      cast: [{ who: 'hero', at: [-20, 90], to: [0, 30], mdur: 1.6, face: 'cam', aura: true }], card: { who: 'hero', at: 1.4 },
      ev: [[0.2, { type: 'pk', name: 'v_embers', x: 0, y: 30, scale: 1.6 }]], cam: { at: [0, 60], to: [0, 30], zoom: [2.0, 2.5], lift: 30 } },
    // The climb, kingdom by kingdom, hour by hour.
    run(1, 'THE FIRST HOUR', 'She climbed all night, kingdom by kingdom.'),
    run(2, 'THE SECOND HOUR'),
    run(3, 'THE THIRD HOUR'),
    run(4, 'THE FOURTH HOUR'),
    // The summit, at the last hour: he waits among his dead; she comes onto the summit; he points his blade at her.
    { k: 'film', stage: 5, area: 'last', tint: 'red', eyebrow: 'THE LAST HOUR', say: 'He was waiting at the top of the Spire.', d: 3.6,
      cast: [{ who: FC, at: [0, -40], face: 'cam', clip: 'C_Stand', aura: true }].concat(SUMMIT_DEAD.map(([x, y], i) =>
        ({ who: ['ghoul', 'raider', 'ghast', 'ghoul', 'raider'][i], at: [x, y], face: [0, -40], clip: 'CrouchIdle' }))),
      ev: [[0.3, { type: 'pk', name: 'v_embers', x: 0, y: -40, scale: 2.4 }]],
      cam: { at: [0, 60], to: [0, -20], zoom: [1.3, 2.0], lift: 40 }, card: { who: 'firstCut', at: 1.4 } },
    { k: 'film', stage: 5, area: 'last', tint: 'red', eyebrow: 'THE FIRST CUT', say: 'Kneel.', d: 3.0,
      cast: [{ who: 'hero', at: [-10, 180], to: [-10, 70], mdur: 2.0, face: [0, -40] }, { who: FC, at: [0, -40], face: [-10, 70], acts: [[1.3, 'Taunt', 1.7, 9]], aura: true }],
      cam: { at: [0, 40], zoom: [1.55, 1.8], lift: 40 } },
  ] };
  // After the last hour (main.js showcase: his First Cut kills her and the Moon raises her): dusk again, at the Black Gate.
  S.WAKE = { shots: [
    { k: 'title', top: 'DUSK', title: 'THE NIGHT, AGAIN', sub: 'With the last of her light, the Moon turned the night back.', d: 3.4 },
    { k: 'film', stage: 0, area: 0, eyebrow: 'THE MOON', say: 'Free the five kings. Their souls are the one thing his blade cannot cut.', d: 4.2,
      cast: [{ who: 'hero', at: [0, 30], face: [0, -200], acts: [[0, 'Die', 1.3, 60], [1.3, 'Idle4', 3.0, 7]] }],   // she lies in the light, then stands
      ev: [[0.2, { type: 'pk', name: 'cb:12_golden_blessing/target', x: 0, y: 30, scale: 1.6 }], [0.25, { type: 'sfx', name: 'magic', v: 0.8 }], [1.3, { type: 'pk', name: 'v_soul', x: 0, y: 10, scale: 1.2 }]],
      cam: { at: [0, 40], to: [0, 30], zoom: [2.4, 2.0], lift: 30 } },
  ] };

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
