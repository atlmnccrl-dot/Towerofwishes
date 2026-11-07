// VESPER — the night's story as anime sequences (played by scene.js on the cinematics' buffer):
// a scene before each hour, the lines bosses shout in fights, the ending. Pure data; runs in Node.
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

  S.BEFORE = [
    // Dusk: the first cut, the oath, the gate.
    { shots: [
      { k: 'card', top: 'SEVEN HUNDRED YEARS AGO', title: 'THE FIRST CUT', d: 2.0 },
      { k: 'moonbreak', d: 3.2 },
      { k: 'card', title: 'IT HAS BLED EVER SINCE', size: 16, d: 1.8 },
      { k: 'wide', stage: 0, cast: [{ who: 'lys', x: 0.36, face: 1, clip: 'Idle' }, { who: 'vesper', x: 0.6, face: -1, clip: 'Idle4' }], d: 1.4 },
      { k: 'close', who: 'lys', side: 'left', line: L('lys', 'The blade chose you. Climb before the moon sets.') },
      { k: 'close', who: 'vesper', side: 'right', eye: true, line: L('vesper', 'And if I fall?') },
      { k: 'close', who: 'lys', side: 'left', clip: 'Idle2', line: L('lys', 'Then fall forward.') },
      { k: 'speed', who: 'vesper', d: 1.0 },
      { k: 'card', top: 'DUSK', title: 'THE BLACK GATE', d: 1.7 },
      { k: 'reveal', who: 'warden', stage: 0, d: 2.0 },
      { k: 'close', who: 'warden', side: 'right', line: L('warden', 'No one passes the gate under a red moon.', true) },
      { k: 'close', who: 'vesper', side: 'left', eye: true, bg: 'red', line: L('vesper', 'Then I open it.') },
      { k: 'clash', a: 'vesper', b: 'warden', stage: 0, d: 1.8 }] },
    // The first hour: the twins.
    { shots: [
      { k: 'card', top: 'THE FIRST HOUR', title: 'CLOISTER OF FROST', d: 1.7 },
      { k: 'wide', stage: 1, cast: [{ who: 'vesper', move: [0.08, 0.34], face: 1 }], d: 1.3 },
      { k: 'reveal', who: 'twinA', also: 'twinB', stage: 1, d: 2.0 },
      { k: 'close', who: 'twinA', side: 'right', line: L('twinA', 'One of us is the mirror.') },
      { k: 'close', who: 'twinB', side: 'left', line: L('twinB', 'Guess wrong.', true) },
      { k: 'impact', cast: ['twinA', 'vesper', 'twinB'], d: 0.9 },
      { k: 'clash', a: 'vesper', b: 'twinB', stage: 1, d: 1.7 }] },
    // The second hour: the stair and the one who walks behind.
    { shots: [
      { k: 'card', top: 'THE SECOND HOUR', title: 'THE UMBRAL STAIR', d: 1.7 },
      { k: 'wide', stage: 2, cast: [{ who: 'lys', move: [0.06, 0.26], face: 1, clip: 'Walk' }, { who: 'vesper', move: [0.16, 0.4], face: 1, clip: 'Walk' }], d: 1.6 },
      { k: 'close', who: 'lys', side: 'left', line: L('lys', 'Your shadow went up the stair before you.') },
      { k: 'reveal', who: 'umbral', stage: 2, d: 1.9 },
      { k: 'close', who: 'umbral', side: 'right', bg: 'red', line: L('umbral', 'It waits at the top. I am only the stair.') },
      { k: 'clash', a: 'vesper', b: 'umbral', stage: 2, d: 1.7 }] },
    // The third hour: the Hunger.
    { shots: [
      { k: 'card', top: 'THE THIRD HOUR', title: 'THE ASHEN WASTE', d: 1.7 },
      { k: 'wide', stage: 3, cast: [{ who: 'lys', move: [0.1, 0.24], face: 1, clip: 'Walk' }, { who: 'vesper', move: [0.2, 0.36], face: 1, clip: 'Walk' }], d: 1.5 },
      { k: 'close', who: 'lys', side: 'left', line: L('lys', 'Something out here is eating the light.') },
      { k: 'reveal', who: 'hunger', stage: 3, d: 2.0 },
      { k: 'close', who: 'vesper', side: 'left', eye: true, line: L('vesper', 'Stay behind me.') },
      { k: 'clash', a: 'vesper', b: 'hunger', stage: 3, d: 1.8 }] },
    // The fourth hour: the Pale Wing.
    { shots: [
      { k: 'card', top: 'THE FOURTH HOUR', title: "THE WIND'S THROAT", d: 1.7 },
      { k: 'speed', who: 'vesper', d: 1.1 },
      { k: 'close', who: 'lys', side: 'left', bg: 'speed', line: L('lys', 'Past the wind there is only him.') },
      { k: 'reveal', who: 'wing', stage: 4, d: 2.0 },
      { k: 'close', who: 'vesper', side: 'right', eye: true, bg: 'speed', line: L('vesper', 'Then the wind first.') },
      { k: 'clash', a: 'vesper', b: 'wing', stage: 4, d: 1.8 }] },
    // The last hour: the First Cut.
    { shots: [
      { k: 'card', top: 'THE LAST HOUR', title: "THE MOON'S SHADOW", d: 1.8 },
      { k: 'wide', stage: 5, cast: [{ who: 'vesper', move: [0.1, 0.3], face: 1, clip: 'Walk' }, { who: 'firstCut', x: 0.76, face: -1, clip: 'Idle4', silhouette: true }], d: 1.8 },
      { k: 'reveal', who: 'firstCut', stage: 5, d: 2.2 },
      { k: 'close', who: 'firstCut', side: 'right', line: L('firstCut', 'I cut the moon to save it. It never thanked me.') },
      { k: 'close', who: 'vesper', side: 'left', eye: true, line: L('vesper', 'I did not come to thank you.') },
      { k: 'close', who: 'firstCut', side: 'right', bg: 'red', line: L('firstCut', 'Then come and finish it.', true) },
      { k: 'impact', cast: ['vesper', 'firstCut'], d: 0.9 },
      { k: 'clash', a: 'vesper', b: 'firstCut', stage: 5, d: 2.0 }] },
  ];

  // Shouted when a boss reaches half health.
  S.PHASE = {
    warden: 'The gate holds!', twinA: 'Together, then.', twinB: 'Together, then.', umbral: 'Look behind you.',
    hunger: '…', wing: '…', firstCut: 'Show me your last ditch effort.',
  };

  S.ENDING = { shots: [
    { k: 'card', title: 'DAWN', d: 1.6 },
    { k: 'moonwhite', d: 3.4 },
    { k: 'close', who: 'lys', side: 'left', line: L('lys', 'Vesper. Look up.') },
    { k: 'close', who: 'vesper', side: 'right', line: L('vesper', 'It stopped bleeding.') },
    { k: 'close', who: 'lys', side: 'left', clip: 'Idle2', line: L('lys', 'So did you.') },
    { k: 'card', top: 'THANK YOU FOR PLAYING', title: 'VESPER', d: 3.0 }] };

  S.speaker = function (key) {
    if (S.SPEAKERS[key]) return S.SPEAKERS[key];
    const f = VS.DATA && VS.DATA.FOES[key]; return f ? { name: f.name, set: f.set, color: f.color, scale: f.scale } : null;
  };
})(typeof window !== 'undefined' ? window : globalThis);
