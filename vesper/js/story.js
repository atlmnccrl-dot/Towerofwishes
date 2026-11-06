// VESPER — the night's story: a scene before each hour, the lines spoken in fights, the ending.
// Cards are short title cards; lines float beside their speaker. Pure data; runs in Node.
(function (root) {
  const VS = root.VS = root.VS || {};
  const S = VS.STORY = {};
  // Who can speak, with their set and colour (foes come from DATA.FOES).
  S.SPEAKERS = { vesper: { name: 'Vesper', set: 'gothic_knight_b', color: '#ff3048' }, lys: { name: 'Lys', set: 'lyra', color: '#ff7aa0' } };

  // One scene per stage index, shown before its fight. cast: who stands in the shot (left to right).
  S.BEFORE = [
    { cast: ['lys', 'vesper', 'warden'], beats: [
      { card: 'SEVEN HUNDRED YEARS AGO', sub: 'a swordsman cut the moon.' },
      { card: 'IT HAS BLED EVER SINCE.' },
      { who: 'lys', line: 'The blade chose you. Climb before the moon sets.' },
      { who: 'vesper', line: 'And if I fall?' },
      { who: 'lys', line: 'Then fall forward.' },
      { card: 'DUSK', sub: 'The Black Gate', stage: true },
      { who: 'warden', line: 'No one passes the gate under a red moon.', shout: true },
      { who: 'vesper', line: 'Then open it.' }] },
    { cast: ['vesper', 'twinA', 'twinB'], beats: [
      { card: 'THE FIRST HOUR', sub: 'Cloister of Frost', stage: true },
      { who: 'twinA', line: 'One of us is the mirror.' },
      { who: 'twinB', line: 'Guess wrong.' }] },
    { cast: ['lys', 'vesper', 'umbral'], beats: [
      { card: 'THE SECOND HOUR', sub: 'The Umbral Stair', stage: true },
      { who: 'lys', line: 'Your shadow went up the stair before you.' },
      { who: 'umbral', line: 'It waits at the top. I am only the stair.' }] },
    { cast: ['lys', 'vesper', 'hunger'], beats: [
      { card: 'THE THIRD HOUR', sub: 'The Ashen Waste', stage: true },
      { who: 'lys', line: 'Something out here is eating the light.' },
      { who: 'vesper', line: 'Stay behind me.' }] },
    { cast: ['lys', 'vesper', 'wing'], beats: [
      { card: 'THE FOURTH HOUR', sub: "The Wind's Throat", stage: true },
      { who: 'lys', line: 'Past the wind there is only him.' },
      { who: 'vesper', line: 'Then the wind first.' }] },
    { cast: ['vesper', 'firstCut'], beats: [
      { card: 'THE LAST HOUR', sub: "The Moon's Shadow", stage: true },
      { who: 'firstCut', line: 'I cut the moon to save it. It never thanked me.' },
      { who: 'vesper', line: 'I did not come to thank you.' },
      { who: 'firstCut', line: 'Then come and finish it.', shout: true }] },
  ];

  // Spoken when a boss reaches half health.
  S.PHASE = {
    warden: 'The gate holds!', twinA: 'Together, then.', twinB: 'Together, then.', umbral: 'Look behind you.',
    hunger: '…', wing: '…', firstCut: 'Show me your last ditch effort.',
  };

  S.ENDING = { cast: ['lys', 'vesper'], beats: [
    { card: 'DAWN' },
    { who: 'lys', line: 'Vesper. Look up.' },
    { card: 'THE MOON IS WHITE.' },
    { who: 'vesper', line: 'It stopped bleeding.' },
    { who: 'lys', line: 'So did you.' },
    { card: 'VESPER', sub: 'thank you for playing', end: true }] };

  S.speaker = function (key) {
    if (S.SPEAKERS[key]) return S.SPEAKERS[key];
    const f = VS.DATA && VS.DATA.FOES[key]; return f ? { name: f.name, set: f.set, color: f.color, scale: f.scale } : null;
  };
})(typeof window !== 'undefined' ? window : globalThis);
