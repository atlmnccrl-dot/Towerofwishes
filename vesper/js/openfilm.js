// THE BLEEDING MOON — the opening, told in clear beats. The built shots of js/intro.js carry the story (the
// title cards; the city and the First Cut rising behind the Spire; his sword raised to the moon; the cut;
// the wound; the dead rising; the horde; her eyes; the draw; her name; him waiting at the top of the
// Spire; his gaze; the strike; I STAND; the title), each held long enough to read, with one fight in the
// middle told shot by shot in the characters' own colours: they come at her, she cuts the first down,
// throws off two more with a spin, slides under the brute and fells him, and stands among them.
(function () {
  const VS = window.VS, I = VS.INTRO, K0 = I.kit, E = VS.EDIT;
  const { clamp } = K0, SH = K0.SH;
  const PI = Math.PI, RIGHT = 0, LEFT = PI, FRONT = PI / 2, V = 'vesper';
  const sc = E.scene, cut = (d, tpl, o) => Object.assign({ d }, tpl, o || {});
  const DUR = { cold: 5.6, city: 3.2, godrise: 2.6, godcut: 4.4, scar: 1.8, rise: 3.6, horde: 3.4, eye: 1.8, draw: 1.0, name: 1.3, colossus: 4.0, gaze: 1.4, strike: 1.9, defy: 1.7, title: 6.6 };
  // A built shot of intro.js, played from `from` seconds for d seconds (its own timing kept), with its sounds.
  const built = (name, d, from, o) => {
    from = from || 0; d = d || DUR[name] - from;
    const sfx = (I.OPEN_SFX || []).filter((x) => x[0] === name && x[1] >= from && x[1] < from + d).map((x) => [x[1] - from, x[2], x[3]]);
    return Object.assign({ d, name: from ? name + '@' + from : name, sfx, draw(ctx, S, k, T) { const t = from + T; SH[name](ctx, S, clamp(t / DUR[name]), t); } }, o || {});
  };
  // The field the fight is on: a dark red plain under the wounded moon.
  const field = (hz) => ({ kind: 'plane', sky: ['#1a050c', '#7a2032'], floor: ['#5a1a28', '#160408'], hz: hz == null ? 0.6 : hz, line: '#7a2030' });
  const moon = { x: 0.8, y: 0.2, r: 0.14, col: '#ff6a7a', glow: 'rgba(255,40,70,0.45)', wound: 1 };

  I.OPENING = E.film([
    built('cold', null, 0, { bars: false, flat: true }),
    built('city', null, 0, { line: 'Seven hundred years ago, he rose over the Spire.', lineAt: 0.4, lineDur: 2.6 }),
    built('godrise', null, 0, { line: 'He wanted an army that would never die.', lineAt: 0.2, lineDur: 2.3 }),
    built('godcut', null, 0, { bars: false, line: 'So he cut the moon.', lineAt: 2.1, lineDur: 2.2 }),
    built('scar', null, 0, { line: 'Its wound has bled ever since.', lineAt: 0.2, lineDur: 1.6 }),
    built('rise', null, 0, { line: 'By its red light, his dead rise.', lineAt: 1.2, lineDur: 2.3 }),
    built('horde', null, 0, { lines: [[0.3, 1.45, 'Tonight the wound bleeds out.'], [1.85, 1.5, 'At dawn, the moon falls and his dead take everything.']] }),
    built('eye', null, 0, { bars: false, line: 'One blade can stop him.', lineAt: 0.2, lineDur: 1.5 }),
    built('draw'),
    built('name', null, 0, { bars: false }),
    // The fight, shot by shot.
    cut(1.6, sc({ bg: field(), moon, actors: [{ who: V, clip: 'Idle4', fps: 8, ang: FRONT, x: 0.5, y: 0.8, sc: 1.4 }].concat([0, 1, 2, 3, 4, 5].map((i) => {
      const L = i % 2 === 0, y = 0.72 + (i % 3) * 0.06; return { who: 'dead:' + i, grey: true, clip: 'Walk', fps: 10, ph: i * 3, ang: L ? RIGHT : LEFT, x: L ? -0.06 - i * 0.03 : 1.06 + i * 0.03, y, to: [L ? 0.28 + i * 0.01 : 0.72 - i * 0.01, y], sc: 1.2, ease: 'lin' }; })) }),
      { cam: { z: [1.0, 1.1] }, sfx: [[0.1, 'reinforce', 0.6], [1.1, 'unsheathe_01', 0.9]] }),
    cut(1.1, sc({ bg: field(0.55), moon, actors: [
      { who: 'dead:1', grey: true, clip: 'Walk', fps: 10, ang: LEFT, x: 0.74, y: 0.92, to: [0.62, 0.92], sc: 2.4, ease: 'lin', show: [0, 0.34] },
      { who: 'dead:1', grey: true, clip: 'TakeDamage', fr: [0, 12], ang: LEFT, x: 0.62, y: 0.92, to: [0.7, 0.92], sc: 2.4, t0: 0.34, t1: 0.62, show: [0.34, 0.62] },
      { who: 'dead:1', grey: true, clip: 'Die', fr: [0, 14], ang: LEFT, x: 0.7, y: 0.92, sc: 2.4, t0: 0.62, frRate: 1.6, show: [0.62, 1] },
      { who: V, clip: 'Attack1', fr: [0, 14], ang: RIGHT, x: 0.34, y: 0.92, to: [0.44, 0.92], sc: 2.4, t0: 0.12, t1: 0.6 }],
      fx: [{ key: 'katana', x: 0.6, y: 0.62, sc: 1.8, t0: 0.34 }] }),
      { cam: { z: [1.0, 1.05] }, sfx: [[0.3, 'slash_1', 1], [0.36, 'blow_1', 0.9], [0.75, 'thud', 0.6]] }),
    cut(1.3, sc({ bg: field(0.55), moon, actors: [
      { who: V, clip: 'Idle4', fps: 8, ang: FRONT, x: 0.5, y: 0.92, sc: 2.2, show: [0, 0.3] },
      { who: V, clip: 'Attack6', fr: [0, 14], ang: FRONT, x: 0.5, y: 0.92, sc: 2.2, t0: 0.3, t1: 0.75, show: [0.3, 1] },
      { who: 'dead:2', grey: true, clip: 'Attack4', fr: [0, 8], ang: RIGHT, x: 0.08, y: 0.9, to: [0.36, 0.92], arc: 0.14, sc: 2.2, t1: 0.4, show: [0, 0.42] },
      { who: 'dead:3', grey: true, clip: 'Attack4', fr: [0, 8], ang: LEFT, x: 0.92, y: 0.9, to: [0.64, 0.92], arc: 0.14, sc: 2.2, t1: 0.4, show: [0, 0.42] },
      { who: 'dead:2', grey: true, clip: 'TakeDamage', fr: [2, 14], ang: RIGHT, x: 0.36, y: 0.92, to: [0.06, 0.94], arc: 0.16, sc: 2.2, rot: -3, t0: 0.42, t1: 0.9, show: [0.42, 1] },
      { who: 'dead:3', grey: true, clip: 'TakeDamage', fr: [2, 14], ang: LEFT, x: 0.64, y: 0.92, to: [0.94, 0.94], arc: 0.16, sc: 2.2, rot: 3, t0: 0.42, t1: 0.9, show: [0.42, 1] }],
      fx: [{ key: 'spin_slash', x: 0.5, y: 0.62, sc: 1.8, t0: 0.4 }] }),
      { cam: { z: [1.05, 1.0] }, flashAt: [0.42], sfx: [[0.05, 'swish_1', 0.8], [0.38, 'slash_2', 1], [0.42, 'blow_big', 0.9], [0.9, 'thud', 0.6]] }),
    cut(1.1, sc({ bg: field(0.5), moon, actors: [
      { who: 'dead:6', grey: true, clip: 'Attack1', fr: [0, 12], ang: LEFT, x: 0.66, y: 0.94, sc: 2.8, t0: 0.05, t1: 0.6 },
      { who: V, clip: 'Run', fps: 16, ang: RIGHT, x: 0.1, y: 0.96, to: [0.3, 0.96], sc: 2.2, t1: 0.35, ease: 'lin', show: [0, 0.35] },
      { who: V, clip: 'Slide', fps: 12, ang: RIGHT, x: 0.3, y: 0.96, to: [0.86, 0.96], sc: 2.2, t0: 0.35, t1: 0.85, show: [0.35, 1] }] }),
      { cam: { z: [1.0, 1.06] }, sfx: [[0.25, 'swish_2', 1], [0.4, 'step_1', 0.9]] }),
    cut(1.2, sc({ bg: field(0.5), moon, actors: [
      { who: 'dead:6', grey: true, clip: 'TakeDamage', fr: [0, 12], ang: RIGHT, x: 0.42, y: 0.94, to: [0.36, 0.94], sc: 2.8, t0: 0.25, t1: 0.55, show: [0, 0.55] },
      { who: 'dead:6', grey: true, clip: 'Die', fr: [0, 14], ang: RIGHT, x: 0.36, y: 0.94, sc: 2.8, t0: 0.55, frRate: 1.5, show: [0.55, 1] },
      { who: V, clip: 'Attack3', fr: [0, 14], ang: LEFT, x: 0.68, y: 0.94, to: [0.58, 0.94], sc: 2.2, t0: 0.05, t1: 0.55 }],
      fx: [{ key: 'hit_crit', x: 0.44, y: 0.6, sc: 1.8, t0: 0.25 }] }),
      { cam: { z: [1.06, 1.0] }, shake: 3, shakeOut: true, sfx: [[0.22, 'slash_2', 1], [0.25, 'blow_big', 1], [0.7, 'thud', 0.9]] }),
    cut(1.6, sc({ bg: field(), moon, actors: [{ who: V, clip: 'Idle4', fps: 7, ang: FRONT, x: 0.5, y: 0.8, sc: 1.4 },
      ...[[0.26, 0.82, 2], [0.74, 0.84, 3], [0.36, 0.9, 4], [0.66, 0.76, 5], [0.18, 0.74, 0]].map(([x, y, i]) => ({ who: 'dead:' + i, grey: true, clip: 'Die', fr: 14, ang: i % 2 ? LEFT : RIGHT, x, y, sc: 1.2 }))] }),
      { cam: { z: [1.12, 1.0] }, sfx: [[0.1, 'whoosh', 0.4]] }),
    built('colossus', null, 0, { line: 'He waits at the top of the Spire.', lineAt: 2.0, lineDur: 1.9 }),
    built('gaze', null, 0, { bars: false, line: 'Kneel.', lineAt: 0.4, lineDur: 1.0, lineCol: '#ffd0d8' }),
    built('strike'),
    built('defy', null, 0, { bars: false }),
    built('title'),
  ], { music: ['draw', 'act0'], amb: 'wind', titleShot: 'title' });
})();
