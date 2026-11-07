// VESPER — the night's story, told in clean scenes (played by tale.js): one caption line per shot,
// no dialogue. The plot in one breath: seven hundred years ago a swordsman cut the falling moon and
// stopped it; the cut never healed, and its red light raises the dead. Tonight the wound bleeds out
// and at dawn the moon falls. Your blade can close it, at the top of the Spire, past six guardians.
// The last of them is the swordsman himself: the wound keeps him alive. Pure data; runs in Node.
// Shot kinds: title, moonfall, wound, stage, spire, guardian, clash, seal, dawn. d = seconds.
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

  const climb = (i, say) => ({ k: 'spire', at: i, eyebrow: LEFT[i], say, d: 2.6 });
  const walk = (i, say, eyebrow) => ({ k: 'stage', stage: i, eyebrow, say, cast: [{ who: 'hero', move: [0.1, 0.42], face: 1 }], pan: 30, d: 2.4 });
  const meet = (i, who, say, also) => ({ k: 'guardian', stage: i, who, also, say, d: 3 });
  const clash = (i, b) => ({ k: 'clash', stage: i, b, d: 1.8 });

  S.BEFORE = [
    // Dusk: the whole premise, then the first guardian.
    { shots: [
      { k: 'title', top: 'SEVEN HUNDRED YEARS AGO', title: 'THE MOON FELL', d: 2.2 },
      { k: 'moonfall', eyebrow: 'THE FIRST CUT', say: 'A swordsman leapt from the Spire and cut the falling moon. It stopped.', d: 4.6 },
      { k: 'wound', eyebrow: 'THE WOUND', say: 'But the cut never healed. Its red light raises the dead.', d: 3.4 },
      { k: 'title', top: 'TONIGHT', title: 'THE WOUND BLEEDS OUT', sub: 'At dawn, the moon falls for good.', d: 2.8 },
      { k: 'stage', stage: 0, eyebrow: 'hero', say: 'Only your blade can close the wound, from the top of the Spire.', cast: [{ who: 'hero', x: 0.5, face: 1, clip: 'Idle4', glow: '#ff2a44', scale: 2.1 }], cam: 40, pan: 20, d: 3.2 },
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
      { k: 'stage', stage: 5, eyebrow: 'THE LAST HOUR', say: 'The same swordsman. Seven hundred years old, and alive.', cast: [{ who: 'hero', move: [0.1, 0.34], face: 1 }, { who: 'firstCut', x: 0.74, face: -1, clip: 'Idle4', glow: '#ff2a44' }], pan: 20, d: 3.4 },
      meet(5, 'firstCut', 'The wound keeps him alive. He will not let you close it.'),
      clash(5, 'firstCut')] },
  ];

  // No lines are spoken in fights.
  S.PHASE = {};

  S.ENDING = { shots: [
    { k: 'seal', eyebrow: 'DAWN', say: 'You strike the wound with everything you have.', d: 4.2 },
    { k: 'dawn', say: 'The wound closes. The moon turns white and rises. The night is over.', d: 4.6 },
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
