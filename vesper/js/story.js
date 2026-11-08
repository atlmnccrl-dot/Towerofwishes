// VESPER — the night's story, told in clean scenes (played by tale.js): one caption line per shot,
// no dialogue. The plot in one breath: seven hundred years ago a swordsman climbed the Spire and cut
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
    swordsman: { name: 'A swordsman', set: 'master_knight', color: '#ffffff' },
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
      { k: 'title', top: 'SEVEN HUNDRED YEARS AGO', title: 'THE MOON WAS CUT', d: 2.2 },
      { k: 'moonfall', eyebrow: 'THE FIRST CUT', say: 'A swordsman climbed the Spire and cut the moon, to raise an army that would never die.', d: 4.6 },
      { k: 'film', stage: 0, area: 0, tint: 'red', eyebrow: 'THE WOUND', say: 'The wound never healed. By its red light, his dead rise.', d: 3.8,
        cam: { at: [0, 10], to: [0, -20], zoom: [1.05, 1.35] },
        cast: [{ who: 'ghoul', at: [-110, -50], enter: 'rift', delay: 0.2 }, { who: 'ghast', at: [90, -60], enter: 'rift', delay: 0.5 }, { who: 'raider', at: [-40, 40], enter: 'rift', delay: 0.8 },
          { who: 'archer', at: [130, 30], enter: 'rift', delay: 1.1 }, { who: 'bone', at: [-150, 20], enter: 'rift', delay: 1.4 }, { who: 'ghoul', at: [40, -95], enter: 'rift', delay: 1.7 }] },
      { k: 'title', top: 'TONIGHT', title: 'THE WOUND BLEEDS OUT', sub: 'At dawn, the moon falls and his dead take everything.', d: 2.8 },
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
    { k: 'title', top: 'THANK YOU FOR PLAYING', title: 'VESPER', d: 3.2 }] };

  // 'hero' is whoever is being played (set by main.js).
  S.heroKey = 'vesper';
  S.speaker = function (key) {
    if (key === 'hero') key = S.heroKey;
    const H = VS.DATA && VS.DATA.HEROES && VS.DATA.HEROES[key]; if (H) return { name: H.name, set: H.set, color: H.color };
    if (S.SPEAKERS[key]) return S.SPEAKERS[key];
    const f = VS.DATA && VS.DATA.FOES[key]; return f ? { name: f.name, set: f.set, color: f.color, scale: f.scale } : null;
  };
})(typeof window !== 'undefined' ? window : globalThis);
