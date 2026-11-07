// VESPER — the night's story as wordless anime sequences (played by scene.js on the cinematics'
// buffer): an action intro before each hour and the ending. No dialogue. Pure data; runs in Node.
// Shot kinds: card, wide, close, reveal, speed, clash, impact, moonbreak, moonwhite. d = seconds.
(function (root) {
  const VS = root.VS = root.VS || {};
  const S = VS.STORY = {};
  S.SPEAKERS = {
    vesper: { name: 'Vesper', set: 'gothic_knight_b', color: '#ff3048' },
    lys: { name: 'Lys', set: 'lyra', color: '#ff7aa0' },
    swordsman: { name: 'A swordsman', set: 'master_knight', color: '#ffffff' },
  };
  const L = (who, text, shout) => ({ who, text, shout: !!shout });

  // No dialogue: each hour opens with a short wordless action intro.
  S.BEFORE = [
    // Dusk: the first cut, the climb, the gate.
    { shots: [
      { k: 'card', top: 'SEVEN HUNDRED YEARS AGO', title: 'THE FIRST CUT', d: 2.0 },
      { k: 'moonbreak', d: 3.2 },
      { k: 'card', title: 'IT HAS BLED EVER SINCE', size: 16, d: 1.6 },
      { k: 'speed', who: 'vesper', d: 1.0 },
      { k: 'card', top: 'DUSK', title: 'THE BLACK GATE', d: 1.6 },
      { k: 'reveal', who: 'warden', stage: 0, d: 1.8 },
      { k: 'slash', d: 0.5 },
      { k: 'clash', a: 'vesper', b: 'warden', stage: 0, d: 1.8 }] },
    { shots: [
      { k: 'card', top: 'THE FIRST HOUR', title: 'CLOISTER OF FROST', d: 1.6 },
      { k: 'wide', stage: 1, cast: [{ who: 'vesper', move: [0.06, 0.4], face: 1 }], d: 1.1 },
      { k: 'reveal', who: 'twinA', also: 'twinB', stage: 1, d: 1.8 },
      { k: 'impact', cast: ['twinA', 'vesper', 'twinB'], d: 0.8 },
      { k: 'slash', angle: 0.3, d: 0.5 },
      { k: 'clash', a: 'vesper', b: 'twinB', stage: 1, d: 1.7 }] },
    { shots: [
      { k: 'card', top: 'THE SECOND HOUR', title: 'THE UMBRAL STAIR', d: 1.6 },
      { k: 'wide', stage: 2, cast: [{ who: 'vesper', move: [0.06, 0.4], face: 1 }], d: 1.1 },
      { k: 'reveal', who: 'umbral', stage: 2, d: 1.8 },
      { k: 'slash', angle: -0.2, d: 0.5 },
      { k: 'clash', a: 'vesper', b: 'umbral', stage: 2, d: 1.7 }] },
    { shots: [
      { k: 'card', top: 'THE THIRD HOUR', title: 'THE ASHEN WASTE', d: 1.6 },
      { k: 'speed', who: 'vesper', d: 1.0 },
      { k: 'reveal', who: 'hunger', stage: 3, d: 1.9 },
      { k: 'slash', angle: 0.4, d: 0.5 },
      { k: 'clash', a: 'vesper', b: 'hunger', stage: 3, d: 1.8 }] },
    { shots: [
      { k: 'card', top: 'THE FOURTH HOUR', title: "THE WIND'S THROAT", d: 1.6 },
      { k: 'speed', who: 'vesper', d: 1.0 },
      { k: 'reveal', who: 'wing', stage: 4, d: 1.9 },
      { k: 'slash', angle: -0.45, d: 0.5 },
      { k: 'clash', a: 'vesper', b: 'wing', stage: 4, d: 1.8 }] },
    { shots: [
      { k: 'card', top: 'THE LAST HOUR', title: "THE MOON'S SHADOW", d: 1.8 },
      { k: 'wide', stage: 5, cast: [{ who: 'vesper', move: [0.08, 0.32], face: 1, clip: 'Walk' }, { who: 'firstCut', x: 0.76, face: -1, clip: 'Idle4', silhouette: true }], d: 1.6 },
      { k: 'reveal', who: 'firstCut', stage: 5, d: 2.0 },
      { k: 'impact', cast: ['vesper', 'firstCut'], d: 0.8 },
      { k: 'slash', d: 0.5 },
      { k: 'clash', a: 'vesper', b: 'firstCut', stage: 5, d: 2.1 }] },
  ];

  // No lines are spoken in fights either.
  S.PHASE = {};

  S.ENDING = { shots: [
    { k: 'card', title: 'DAWN', d: 1.6 },
    { k: 'moonwhite', d: 3.6 },
    { k: 'card', top: 'THANK YOU FOR PLAYING', title: 'VESPER', d: 3.0 }] };

  S.speaker = function (key) {
    if (S.SPEAKERS[key]) return S.SPEAKERS[key];
    const f = VS.DATA && VS.DATA.FOES[key]; return f ? { name: f.name, set: f.set, color: f.color, scale: f.scale } : null;
  };
})(typeof window !== 'undefined' ? window : globalThis);
