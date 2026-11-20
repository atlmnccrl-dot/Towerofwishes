// The promotional videos, as cut lists for js/trailer.js (see its header for what a segment may carry). Each entry:
// the file's name, the picture's size, what to tell the trailer (how many heroes take the field, the letterbox, the
// studio's line under the title), and the cut. Lengths are `d` seconds or `b` beats of the drums (118 a minute).
//   node tools/record-trailer.js <out-dir> --cut reveal        (one of the names below; --cut all for every one)
const BRAND = 'A Bledink Studios game', SOON = 'Coming soon';
const quick = (s, z) => ({ b: 1, k: 'scene', s, z: [z, z], quick: 1 });

module.exports = {
  // 1. The reveal: the story in the opening film's drawn art, a burst of the game itself, the name.
  reveal: { file: 'bannerborn-reveal-1920x1080', w: 1920, h: 1080, opts: { team: 3, clean: true, brand: BRAND }, cut: [
    { d: 1.7, k: 'card', big: 'Bledink Studios', sub: 'presents' },
    { d: 3.8, k: 'art', a: 'ridge', speed: 2.1, fadeIn: 0.7, lineAt: 0.8, lines: [[0.5, 3.6, 'Nine banners stood between the living and the dead.']] },
    { d: 2.6, k: 'art', a: 'oath', speed: 1.15 },
    { d: 3.5, k: 'art', a: 'gate', from: 1.5, lines: [[1.5, 3.4, 'Then the Gravegates opened.']] },
    { d: 2.6, k: 'art', a: 'cantor', from: 0.7, speed: 1.15 },
    { d: 2.6, k: 'art', a: 'rising', speed: 1.27 },
    { d: 4.2, k: 'art', a: 'ninth', from: 2.0, lines: [[0.15, 2.2, 'Three hundred years on, one banner still stands.']] },
    { d: 3.4, k: 'art', a: 'raise', from: 0.2, cues: [[0, 'music/boss']] },
    quick('a', 1.55), quick('lord', 1.45), quick('b', 1.6), quick('boss', 1.6),
    { d: 4.8, k: 'title', soon: SOON },
  ] },

  // 2. The gameplay trailer: what you do, land by land, and who waits at the end of the road.
  gameplay: { file: 'bannerborn-gameplay-1920x1080', w: 1920, h: 1080, opts: { team: 3, bars: 0.07, brand: BRAND }, cut: [
    { b: 6, k: 'scene', s: 'a', z: [1.08, 1.24], hook: 'The dead are rising.\nRaise your banner.', drums: 1 },
    { b: 6, k: 'scene', s: 'b', z: [1.24, 1.08], cap: 'They fight. You call the ultimates.' },
    { b: 6, k: 'scene', s: 'c', z: [1.1, 1.28], cap: 'Break what the dead build' },
    { b: 6, k: 'scene', s: 'frost', z: [1.26, 1.1], cap: 'Take back eight lands' },
    { b: 6, k: 'scene', s: 'stand', z: [1.3, 1.46], cap: 'Hold the line against the clock' },
    { b: 6, k: 'scene', s: 'trek', z: [0.94, 1.12], cap: 'March the long road' },
    { b: 4, k: 'land', z: [0.86, 0.98], cap: 'Fifty-four stages' },
    { b: 4, k: 'black', big: 'And at the end of every road' },
    { b: 8, k: 'scene', s: 'boss', z: [1.0, 1.32], name: 'The Pale Regent', flash: 1, drums: 1, roar: 1 },
    { b: 6, k: 'scene', s: 'lord', z: [1.0, 1.24], name: 'The Hollow King', flash: 1 },
    quick('a', 1.6), quick('c', 1.5), quick('b', 1.6), quick('lord', 1.5), quick('frost', 1.5), quick('c', 1.7), quick('boss', 1.7), quick('b', 1.5),
    { b: 11, k: 'title', soon: SOON },
  ] },

  // 3. Three vertical shorts, each one thing.
  'short-bosses': { file: 'bannerborn-short-1-bosses-1080x1920', w: 1080, h: 1920, opts: { team: 3, brand: BRAND }, cut: [
    { b: 5, k: 'scene', s: 'lord', z: [0.92, 1.06], hook: 'Can your squad\nkill a king?', drums: 1, roar: 1 },
    { b: 7, k: 'scene', s: 'lord', z: [1.06, 1.3], name: 'The Hollow King' },
    { b: 6, k: 'scene', s: 'boss', z: [0.98, 1.24], name: 'The Pale Regent', flash: 1, cues: [[0, 'sfx/boss']] },
    quick('lord', 1.4), quick('boss', 1.5), quick('lord', 1.6), quick('boss', 1.35),
    { b: 8, k: 'title', soon: SOON },
  ] },
  'short-ultimates': { file: 'bannerborn-short-2-ultimates-1080x1920', w: 1080, h: 1920, opts: { team: 3, brand: BRAND }, cut: [
    { b: 5, k: 'scene', s: 'b', z: [0.98, 1.14], hook: 'They fight.\nYou unleash.', drums: 1 },
    { b: 5, k: 'scene', s: 'frost', z: [1.14, 1.0], cap: 'Call the ultimates' },
    { b: 5, k: 'scene', s: 'c', z: [1.0, 1.16], cap: 'Break their war machines' },
    quick('b', 1.4), quick('frost', 1.5), quick('c', 1.4), quick('a', 1.5),
    { b: 8, k: 'title', soon: SOON },
  ] },
  'short-abilities': { file: 'bannerborn-short-4-abilities-1080x1920', w: 1080, h: 1920, opts: { team: 3, brand: BRAND }, cut: [
    { b: 6, k: 'scene', s: 'xMeteor', z: [1.55, 1.7], hook: 'New abilities.\nAll hand-painted.', drums: 1 },
    { b: 6, k: 'scene', s: 'xMeteor', z: [1.7, 1.85], cap: 'Meteor' },
    { b: 5, k: 'scene', s: 'xStorm', z: [1.7, 1.85], cap: 'Chain lightning', flash: 1 },
    { b: 5, k: 'scene', s: 'xFlame', z: [1.6, 1.75], cap: 'Dragonbreath', flash: 1 },
    { b: 5, k: 'scene', s: 'xSmite', z: [1.7, 1.85], cap: 'Smite', flash: 1 },
    { b: 5, k: 'scene', s: 'xCry', z: [1.7, 1.85], cap: 'War cry', flash: 1 },
    { b: 5, k: 'scene', s: 'xSlam', z: [1.7, 1.85], cap: 'Ground pound', flash: 1 },
    { b: 8, k: 'title', soon: SOON },
  ] },
  'short-story': { file: 'bannerborn-short-3-last-banner-1080x1920', w: 1080, h: 1920, opts: { team: 3, clean: true, brand: BRAND }, cut: [
    { d: 3.4, k: 'art', a: 'gate', from: 1.4, hook: 'The dead\nare rising.' },
    { d: 2.4, k: 'art', a: 'rising', speed: 1.38 },
    { d: 3.3, k: 'art', a: 'ninth', from: 2.0, lines: [[0.15, 2.3, 'One banner still stands.']] },
    { d: 3.3, k: 'art', a: 'raise', from: 0.3, px: 0.69, sh: { words: [] }, hook: 'Raise\nyour banner.', hookAt: 0.13, cues: [[0, 'music/boss']] },
    quick('a', 1.5), quick('lord', 1.4), quick('b', 1.5),
    { d: 4.4, k: 'title', soon: SOON },
  ] },
};
