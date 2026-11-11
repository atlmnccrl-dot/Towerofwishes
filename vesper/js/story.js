// VESPER — the night's story, told in clean scenes (played by tale.js): one caption line per shot,
// no dialogue. The plot in one breath: seven hundred years ago the First Cut rose over the Spire and cut
// the moon, to raise an army that would never die; the wound never healed, and by its red light his
// dead rise. Tonight the wound bleeds out and at dawn the moon falls. Your blade can stop him, at the
// top of the Spire, past six guardians. The last of them is the swordsman himself: the wound keeps him
// alive. Pure data; runs in Node.
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
    // Dusk: the whole premise, then the first guardian.
    { shots: [
      { k: 'title', top: 'SEVEN HUNDRED YEARS AGO', title: 'FIVE KINGS FELL', d: 2.2 },
      { k: 'title', top: 'THE FIRST CUT', title: 'THE KINGSLAYER', sub: 'With five kings\' souls he cast the spell that wakes every grave.', d: 3.4 },
      { k: 'film', stage: 0, area: 0, tint: 'red', eyebrow: 'THE RED MOON', say: 'From that night the moon bled red. By its light, his dead rise.', d: 3.8,
        cam: { at: [0, 10], to: [0, -20], zoom: [1.05, 1.35] },
        cast: [{ who: 'ghoul', at: [-110, -50], enter: 'rift', delay: 0.2 }, { who: 'ghast', at: [90, -60], enter: 'rift', delay: 0.5 }, { who: 'raider', at: [-40, 40], enter: 'rift', delay: 0.8 },
          { who: 'archer', at: [130, 30], enter: 'rift', delay: 1.1 }, { who: 'bone', at: [-150, 20], enter: 'rift', delay: 1.4 }, { who: 'ghoul', at: [40, -95], enter: 'rift', delay: 1.7 }] },
      { k: 'title', top: 'TONIGHT', title: 'THE MOON BLEEDS OUT', sub: 'At dawn, his dead take everything.', d: 2.8 },
      { k: 'film', stage: 0, area: 'last', eyebrow: 'hero', say: 'Only your blade can stop him, at the top of the Spire.', d: 3.4,
        cast: [{ who: 'hero', at: [0, 20], aura: true, face: 'cam' }], cam: { at: [0, 22], zoom: [2.5, 3.0] } },
      climb(0, 'Six guardians stand between you and the top.'),
      meet(0, 'warden', 'The Gatewarden holds the Black Gate. Get past him.'),
      clash(0, 'warden')] },
    { shots: [
      climb(1, 'The gate is open. The climb begins.'),
      walk(1, 'Frost has sealed the old cloister.', 'THE FIRST HOUR'),
      meet(1, 'twinA', 'The Hollow Twins guard it. Two blades, one will.', 'twinB'),
      clash(1, 'twinB')] },
    { shots: [
      climb(2, 'Higher. The air grows dark.'),
      walk(2, 'The Umbral Stair winds through total darkness.', 'THE SECOND HOUR'),
      meet(2, 'umbral', 'The Umbral hides in your own shadow. Watch your back.'),
      clash(2, 'umbral')] },
    { shots: [
      climb(3, 'Halfway up. The moon bleeds faster.'),
      walk(3, 'Nothing lives in the Ashen Waste.', 'THE THIRD HOUR'),
      meet(3, 'hunger', 'Only the Hunger, which eats the light itself.'),
      clash(3, 'hunger')] },
    { shots: [
      climb(4, 'Near the top, the wind turns to blades.'),
      walk(4, "The Wind's Throat: one narrow path into the storm.", 'THE FOURTH HOUR'),
      meet(4, 'wing', 'The Pale Wing rules the storm. It has never let anyone pass.'),
      clash(4, 'wing')] },
    { shots: [
      climb(5, 'The top of the Spire. Someone is waiting.'),
      { k: 'film', stage: 5, area: 'last', eyebrow: 'THE LAST HOUR', say: 'The same swordsman. Seven hundred years old, and alive.', d: 3.6,
        cast: [{ who: 'hero', at: [-40, 80], to: [-8, 22], mdur: 2.8 }, { who: 'firstCut', at: [0, -60], aura: true, face: [0, 22] }],
        cam: { at: [0, 30], to: [0, -14], zoom: [1.2, 1.5] } },
      { k: 'film', stage: 5, area: 'last', say: 'The wound keeps him alive. He will not let you close it.', d: 3.4,
        cast: [{ who: 'hero', at: [-8, 22], face: [0, -60] }, { who: 'firstCut', at: [0, -60], aura: true, clip: 'Taunt', face: [0, 22] }],
        cam: { at: [0, -50], to: [0, -60], zoom: [2.3, 2.7] }, card: { who: 'firstCut', at: 0.5 } },
      clash(5, 'firstCut')] },
  ];

  // ---- The First Cut in the opening (2026-11-11, the author: "those character models just don't stand right in the
  // cutscenes for the boss... build different cutscenes from scratch"). He is filmed as the game shows him: on the real
  // summit, through the fight camera, at a man's scale with his own clips and effects; the moon and the city are shot on
  // their own (js/openfilm.js). The opening plays: the cold open, FC_DEED, the moon, the dead and her, FC_WAIT, the strike.
  const FOLK = ['vh_townsfolk_001', 'vh_townsfolk_004', 'vh_townsfolk_007', 'vh_townsfolk_010', 'vh_townsfolk_013'];
  const UP = [0, -400];   // toward the moon, over the summit's far edge
  // The deed (2026-11-11, the author: "the moon kinda feels irrelevant... have the boss use an op spell and epic animation
  // and effects to raise the dead, maybe he slays 5 kings to do it, one king per region"): he cuts down the king of each of
  // the five kingdoms the climb passes through, each in his own hall, each a different blow; their souls go into him; on
  // the summit he spends them on the spell that wakes every grave, and the moon bleeds red from that night on.
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
    const ev = [[0.1, { type: 'pk', name: 'cb:01_crimson_tide_cleave/death', x: move.at[0], y: move.at[1], scale: 1.5 }], [0.1, { type: 'pk', name: 'v_shadow', x: move.at[0], y: move.at[1], scale: 1.6 }], [0.12, { type: 'sfx', name: 'whoosh', v: 0.8 }],
      [hit, { type: 'pk', name: move.fx, x: K0[0], y: K0[1], scale: move.fxScale || 1.8 }], [hit, { type: 'pk', name: 'v_blood', x: K0[0], y: K0[1], z: 20, scale: 1.6 }], [hit, { type: 'flash', a: 0.45, col: '255,60,80' }],
      [hit, { type: 'shake', n: 9 }], [hit - 0.02, { type: 'sfx', name: 'slash_2' }], [hit, { type: 'sfx', name: 'blow_big', v: 0.9 }],
      [hit + 0.55, { type: 'pk', name: 'v_soul', x: K0[0], y: K0[1], scale: 1.6 }], [hit + 1.0, { type: 'pk', name: 'v_soul', x: (move.to || move.at)[0], y: (move.to || move.at)[1], scale: 1.2 }], [hit + 0.55, { type: 'sfx', name: 'soul', v: 0.7 }]];
    return { k: 'film', stage: k.stage, area: 0, eyebrow: k.title, say, d: hit + 1.5, cast, ev, cam: { at: [0, 0], to: [0, -6], zoom: [2.1, 2.35], lift: 34 } };
  };
  S.FC_DEED = { shots: [
    { k: 'title', top: 'SEVEN HUNDRED YEARS AGO', title: 'FIVE KINGDOMS', d: 2.4 },
    kingShot(KINGS[0], 0, { at: [-70, 40], clip: 'C_Cut', wind: 0.35, hit: 1.25, fx: 'cb:01_crimson_tide_cleave/target', fps: 16 }, 'A swordsman went from kingdom to kingdom, and cut down every king.'),
    kingShot(KINGS[1], 1, { at: [-150, 70], to: [-34, 6], mdur: 0.3, clip: 'Attack4', wind: 0.3, hit: 1.0, fx: 'cb:90_last_stand_strike/target', fxScale: 1.6 }),
    kingShot(KINGS[2], 2, { at: [10, -70], clip: 'Attack3', wind: 0.3, hit: 0.95, fx: 'cb:01_crimson_tide_cleave/target', fxScale: 1.6 }),
    kingShot(KINGS[3], 3, { at: [-40, 20], clip: 'Special1', wind: 0.45, hit: 1.05, fx: 'cb:10_quake_stomp/caster', fxScale: 1.6 }),
    kingShot(KINGS[4], 4, { at: [-60, 34], clip: 'Attack6', wind: 0.4, hit: 1.1, fx: 'cb:113_earthshaker_stance/target', fxScale: 2.0 }, 'Five kings. Five souls.'),
    // The summit: the five souls come to him; he raises his blade and spends them on the spell.
    { k: 'film', stage: 5, area: 'last', eyebrow: 'THE TOP OF THE SPIRE', say: 'With their souls he cast the spell that wakes every grave.', d: 4.6,
      cast: [{ who: FC, at: [0, 0], face: 'cam', acts: [[1.1, 'C_Raise', 3.5, 7]] }],
      ev: [0, 1, 2, 3, 4].map((n) => [0.15 + n * 0.16, { type: 'pk', name: 'v_soul', x: Math.cos(n / 5 * 6.283) * 60, y: Math.sin(n / 5 * 6.283) * 38, scale: 1.4 }]).concat([
        [0.2, { type: 'sfx', name: 'soul', v: 0.8 }], [1.1, { type: 'sfx', name: 'charge', v: 1 }], [1.2, { type: 'pk', name: 'fc_summon', x: 0, y: 0, scale: 4.2 }],
        [1.55, { type: 'pk', name: 'cb:54_greater_fireball/target', x: 0, y: 0, scale: 2.2 }], [1.75, { type: 'pk', name: 'v_pillar', x: 0, y: 0, scale: 3 }], [1.8, { type: 'pk', name: 'cb:10_quake_stomp/caster', x: 0, y: 0, scale: 2.2 }],
        [1.8, { type: 'pk', name: 'fc_shock', x: 0, y: 0, scale: 3.4 }], [1.8, { type: 'flash', a: 0.8, col: '255,40,60' }], [1.8, { type: 'shake', n: 16 }], [1.8, { type: 'sfx', name: 'blow_big' }], [1.82, { type: 'sfx', name: 'quake' }],
        [2.4, { type: 'pk', name: 'cb:01_crimson_tide_cleave/caster', x: -60, y: 24, scale: 1.4 }], [2.55, { type: 'pk', name: 'cb:01_crimson_tide_cleave/caster', x: 64, y: 8, scale: 1.4 }], [2.9, { type: 'pk', name: 'fc_shock', x: 0, y: 0, scale: 4 }], [3.0, { type: 'pk', name: 'v_embers', x: 0, y: 0, scale: 2.4 }]]),
      cam: { at: [0, 20], to: [0, 0], zoom: [1.7, 2.2], lift: 40 } },
    // And the dead rose all around him; the moon has bled red since that night.
    { k: 'film', stage: 5, area: 'last', tint: 'red', say: 'The dead rose. And from that night, the moon bled red.', d: 4.0,
      cast: [{ who: FC, at: [0, 0], face: 'cam', clip: 'C_Command', aura: true }].concat([[-110, 30], [100, 20], [-60, 90], [70, 100], [-140, -40], [130, -50], [0, 130], [-30, -90], [40, -100], [-170, 60]].map(([x, y], i) =>
        ({ who: ['ghoul', 'raider', 'ghast', 'raider', 'ghoul', 'ghast', 'raider', 'ghoul', 'ghast', 'raider'][i], at: [x, y], face: [0, 0], enter: 'rift', delay: 0.3 + i * 0.22, edur: 1.0 }))),
      ev: [[0.3, { type: 'sfx', name: 'spawn', v: 0.7 }], [1.2, { type: 'sfx', name: 'reinforce', v: 0.7 }], [2.0, { type: 'sfx', name: 'horn', v: 0.6 }]].concat([[-110, 30], [100, 20], [-60, 90], [70, 100], [-140, -40], [130, -50], [0, 130], [-30, -90], [40, -100], [-170, 60]].map(([x, y], i) => [0.3 + i * 0.22, { type: 'pk', name: 'v_spawn', x, y, scale: 1.2 }])),
      cam: { at: [0, 30], to: [0, 10], zoom: [1.2, 1.4], lift: 36 } },
  ] };
  S.FC_WAIT = { shots: [
    // The summit now: red, the dead kneeling round him, the wind in his cape.
    { k: 'film', stage: 5, area: 'last', tint: 'red', eyebrow: 'THE LAST HOUR', say: 'He waits at the top of the Spire.', d: 4.0,
      cast: [{ who: 'firstCutFinal', at: [0, -40], face: 'cam', clip: 'C_Stand', aura: true }].concat([[-110, 10], [110, 0], [-60, 70], [70, 80], [0, 110]].map(([x, y], i) =>
        ({ who: ['ghoul', 'raider', 'ghast', 'ghoul', 'raider'][i], at: [x, y], face: [0, -40], clip: 'CrouchIdle' }))),
      ev: [[0.3, { type: 'pk', name: 'v_embers', x: 0, y: -40, scale: 2.4 }]],
      cam: { at: [0, 60], to: [0, -20], zoom: [1.3, 2.0], lift: 40 }, card: { who: 'firstCut', at: 1.6 } },
    // She comes onto the summit; he points his blade at her.
    { k: 'film', stage: 5, area: 'last', tint: 'red', eyebrow: 'THE FIRST CUT', say: 'Kneel.', d: 3.0,
      cast: [{ who: 'hero', at: [-10, 180], to: [-10, 70], mdur: 2.0, face: [0, -40] }, { who: 'firstCutFinal', at: [0, -40], face: [-10, 70], acts: [[1.3, 'Taunt', 1.7, 9]], aura: true }],
      cam: { at: [0, 40], zoom: [1.55, 1.8], lift: 40 } },
  ] };

  // The campaign plays these pieces: the prologue before the first trial, each act's intro the
  // first time you climb into it, and each guardian's intro before its fight.
  const B = S.BEFORE;
  // The prologue is the anime opening (opening.js), the whole premise in about 23 seconds.
  S.PROLOGUE = { shots: [{ k: 'anime', seq: 'opening' }] };
  S.ACTS = [
    { intro: null, boss: { shots: B[0].shots.slice(6) } },
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
    { k: 'seal', eyebrow: 'DAWN', say: 'You strike the wound with everything you have.', d: 4.2 },
    { k: 'film', stage: 5, area: 'last', tint: 'dawn', say: 'The wound closes. The moon turns white and rises. The night is over.', d: 4.8,
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
