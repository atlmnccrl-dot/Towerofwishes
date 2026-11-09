// THE BLEEDING MOON — the opening, cut like the reference edits (js/edit.js). The built shots of
// js/intro.js (the city, the god rising, the cut, the wound, the dead, the horde, her eyes, the draw, her
// name, the colossus, his gaze, the strike, I STAND, the title) are kept and re-cut around new pieces: a
// stutter of the god in ink, a montage of the risen each in its own colour world, and a real fight: she
// cuts through the dead and throws a brute into the moon.
(function () {
  const VS = window.VS, A = VS.A, I = VS.INTRO, K0 = I.kit, E = VS.EDIT;
  const { RED, W, H, clamp, fill, colossus, burningEyes } = K0, SH = K0.SH;
  const PI = Math.PI, RIGHT = 0, LEFT = PI, FRONT = PI / 2, BACK = -PI / 2, V = 'vesper', INK = '#050407';
  const sc = E.scene, cut = (d, tpl, o) => Object.assign({ d }, tpl, o || {});
  // A built shot of intro.js, played from `from` seconds for d seconds (its own timing kept), with its sounds.
  const DUR = { cold: 5.6, city: 3.2, godrise: 2.6, godcut: 4.4, scar: 1.8, rise: 3.6, horde: 3.4, eye: 1.8, draw: 1.0, name: 1.3, colossus: 4.0, gaze: 1.4, strike: 1.9, defy: 1.7, title: 6.6 };
  const built = (name, d, from, o) => {
    from = from || 0; d = d || DUR[name] - from;
    const sfx = (I.OPEN_SFX || []).filter((x) => x[0] === name && x[1] >= from && x[1] < from + d).map((x) => [x[1] - from, x[2], x[3]]);
    return Object.assign({ d, name: from ? name + '@' + from : name, sfx, draw(ctx, S, k, T) { const t = from + T; SH[name](ctx, S, clamp(t / DUR[name]), t); } }, o || {});
  };
  const brightPlane = (hz, sky, floor) => ({ kind: 'plane', sky: sky || ['#8a4a54', '#ffe8ec'], floor: floor || ['#c88a94', '#3a1018'], hz: hz == null ? 0.62 : hz });
  const brightGlow = (at, col, base) => ({ kind: 'glow', col: col || '#ffffff', base: base || '#6a2a34', at: at || [0.5, 0.45], r: 0.75 });
  const G = { grade: 'blood', keepRed: true };
  // The god in ink, a frame at a time, black on white and white on black.
  const inkGod = (white) => cut(0.045, { draw(ctx, S, k, T) { fill(ctx, white ? '#ffffff' : '#000'); colossus(ctx, S, Math.round(W() / 2), Math.round(H() * 0.4), 9, T, { flat: true, col: white ? '#000' : '#fff' }); burningEyes(ctx, Math.round(W() / 2), Math.round(H() * 0.4), 9, 1, T); } }, { bars: false, sfx: white ? [[0, 'blow_0', 0.5]] : null });
  // One of the risen, chest up, in a colour world of its own.
  const risen = (i, pal, ang) => cut(0.34, E.face({ who: 'dead:' + i, sc: 3.2, cy: 0.36, ang: ang == null ? FRONT : ang, shade: '#000', eyes: '#ff3048', eyesAt: 0.25, bg: brightGlow([0.5, 0.42], '#ffffff', '#202020') }), { grade: pal, cam: { z: [1.14, 1.0], ease: 'out' }, sfx: [[0.08, 'blow_1', 0.6], [0.25, 'blink', 0.4]] });

  // ---- the fight: she cuts through the dead ---------------------------------------------------------
  const hit1 = { d: 0.26, ...G, cam: { z: [1.2, 1.4], ease: 'out' }, sfx: [[0.1, 'slash_2', 1], [0.12, 'blow_1', 1]],
    ...sc({ bg: brightGlow([0.55, 0.5]), sil: INK, speed: { ang: 0.15, col: 'rgba(255,255,255,0.7)', n: 60, v: 1700 },
      actors: [{ who: 'dead:1', clip: 'TakeDamage', fr: [0, 8], ang: LEFT, x: 0.68, y: 0.98, sc: 3, to: [0.76, 0.98], t0: 0.4, eyes: '#ff3048' },
        { who: V, clip: 'Attack1', fr: [3, 11], ang: RIGHT, x: 0.16, y: 0.98, to: [0.42, 0.98], sc: 3, smear: 4, smearCol: '#ffffff', ease: 'snap', t1: 0.5 }],
      fx: [{ key: 'hit_slash', x: 0.58, y: 0.55, sc: 2.2, t0: 0.42 }] }) };
  const fling = { d: 0.42, ...G, cam: { x: [0, -0.08] }, sfx: [[0, 'blow_big', 0.9], [0.05, 'whoosh', 0.9]],
    ...sc({ bg: brightPlane(0.66), sil: INK, speed: { ang: 0, col: 'rgba(255,255,255,0.5)', n: 30, v: 1300 },
      actors: [{ who: V, clip: 'Attack1', fr: 11, ang: RIGHT, x: 0.22, y: 0.76, sc: 1.3 }, { who: 'dead:1', clip: 'TakeDamage', fr: [2, 12], ang: LEFT, x: 0.3, y: 0.74, to: [1.05, 0.5], arc: 0.1, sc: 1.3, rot: 7, smear: 4, smearCol: '#c86a74' }],
      trails: [{ from: [0.3, 0.68], to: [1.05, 0.44], w: 3, col: '#ffffff', t0: 0.05, t1: 0.85, fade: 0.75 }] }) };
  const spinRing = cut(0.36, E.ring({ x: 0.5, y: 0.5, r: 0.44, inside: '#5a1a24', actors: [{ who: V, clip: 'Attack6', fr: [1, 12], ang: FRONT, x: 0.5, y: 0.8, sc: 2.6, shade: '#000' }] }), { bars: false, shake: 5, sfx: [[0, 'swish_2', 1], [0.15, 'slash_1', 1], [0.2, 'blow_big', 0.8]] });
  const burst = { d: 0.62, ...G, cam: { z: [1.1, 1.0], ease: 'out' }, shake: 4, shakeOut: true, sfx: [[0, 'blow_2', 0.9], [0.05, 'blow_0', 0.9]],
    ...sc({ bg: brightPlane(0.42, ['#a04a54', '#ffe8ec'], ['#e8b0b8', '#7a2a34']), sil: INK,
      actors: [{ who: V, clip: 'Attack6', fr: 13, ang: FRONT, x: 0.5, y: 0.7, sc: 1.6 }].concat([[-1, -0.3], [1, -0.25], [-0.9, 0.35], [0.95, 0.4]].map(([dx, dy], i) => (
        { who: 'dead:' + (i + 2), clip: 'TakeDamage', fr: [0, 12], ang: dx < 0 ? RIGHT : LEFT, x: 0.5 + dx * 0.08, y: 0.7 + dy * 0.05, to: [0.5 + dx * 0.55, 0.7 + dy * 0.5], arc: 0.12, sc: 1.4, rot: dx * 6, smear: 3, smearCol: '#c86a74' }))),
      debris: [{ x: 0.5, y: 0.64, t0: 0, n: 40, col: ['#ff3048', '#3a0810'], spread: 6.2, v: 1.4 }], rings: [{ x: 0.5, y: 0.7, t0: 0, dur: 0.6, rx: 0.7, ry: 0.12, w: 2 }] }) };
  const upcut = { d: 0.28, ...G, cam: { z: [1.2, 1.35], r: [-0.1, -0.15] }, sfx: [[0.1, 'slash_2', 1], [0.12, 'blow_big', 1]],
    ...sc({ bg: brightGlow([0.5, 0.35]), sil: INK, speed: { ang: -1.25, col: 'rgba(255,255,255,0.7)', n: 50, v: 1900 },
      actors: [{ who: 'dead:6', clip: 'TakeDamage', fr: [0, 6], ang: LEFT, x: 0.62, y: 1.05, sc: 3.4, t0: 0.4, to: [0.64, 0.9] }, { who: V, clip: 'Attack3', fr: [2, 12], ang: -PI / 4, x: 0.3, y: 1.05, to: [0.42, 0.95], sc: 3, smear: 3, smearCol: '#ffffff', ease: 'snap' }],
      fx: [{ key: 'hit_crit', x: 0.55, y: 0.45, sc: 2.2, t0: 0.4 }] }) };
  const intoMoon = { d: 0.65, ...G, sfx: [[0, 'whoosh', 1]],
    ...sc({ bg: { kind: 'grad', cols: ['#3a0810', '#a03040', '#ffd0d8'] }, moon: { x: 0.62, y: 0.3, r: 0.22, col: '#ffffff', wound: 1 }, sil: INK,
      actors: [{ who: V, clip: 'Attack3', fr: 12, ang: -PI / 4, x: 0.3, y: 0.98, sc: 1.6 }, { who: 'dead:6', clip: 'TakeDamage', fr: [3, 12], ang: LEFT, x: 0.36, y: 0.88, to: [0.62, 0.32], sc: [1.4, 0.4], rot: 9, ease: 'out' }],
      trails: [{ from: [0.36, 0.84], to: [0.62, 0.3], w: 2, col: '#ffffff', t0: 0, t1: 0.9 }] }) };

  I.OPENING = E.film([
    cut(0.16, E.glitch(), { bars: false, sfx: [[0, 'swish_0', 0.6]] }),
    built('cold', null, 0, { bars: false, flat: true }),
    built('city', 2.7, 0, { line: 'Seven hundred years ago, he rose over the Spire.', lineAt: 0.4, lineDur: 2.3 }),
    E.blink(0.04),
    inkGod(true), inkGod(false), inkGod(true), inkGod(false), E.blink(0.05),
    built('godrise', 2.0, 0.6, { line: 'He wanted an army that would never die.', lineAt: 0, lineDur: 1.9 }),
    built('godcut', null, 0, { bars: false, line: 'So he cut the moon.', lineAt: 2.1, lineDur: 2.2 }),
    built('scar', 1.3, 0, { line: 'Its wound has bled ever since.', lineAt: 0.05, lineDur: 1.2 }),
    built('rise', 1.1, 0),
    risen(0, 'toxic'), E.blink(0.03), risen(5, 'ice', PI * 0.75), E.blink(0.03), risen(7, 'violet'), E.blink(0.03), risen(8, 'ember', PI * 0.25), E.blink(0.06),
    built('rise', 1.9, 1.5, { line: 'By its red light, his dead rise.', lineAt: 0.1, lineDur: 1.8 }),
    built('horde', 3.1, 0, { lines: [[0.3, 1.3, 'Tonight the wound bleeds out.'], [1.7, 1.35, 'At dawn, the moon falls and his dead take everything.']] }),
    built('eye', null, 0, { bars: false, line: 'One blade can stop him.', lineAt: 0.2, lineDur: 1.5 }),
    built('draw'),
    built('name', null, 0, { bars: false }),
    // The fight.
    cut(0.7, sc({ bg: brightPlane(0.6), sil: INK, speed: { ang: 0, col: 'rgba(255,255,255,0.3)', n: 20, v: 300 },
      actors: [{ who: V, clip: 'Idle4', fps: 8, ang: FRONT, x: 0.5, y: 0.78, sc: 1.2 }].concat([0, 1, 2, 3, 4, 5].map((i) => {
        const L = i % 2 === 0; return { who: 'dead:' + i, clip: 'Run', fps: 16, ph: i * 3, ang: L ? RIGHT : LEFT, x: L ? -0.05 - i * 0.04 : 1.05 + i * 0.04, y: 0.72 + (i % 3) * 0.05, to: [L ? 0.3 : 0.7, 0.72 + (i % 3) * 0.05], sc: 1.1, ease: 'lin', eyes: '#ff3048' }; })) }),
      { ...G, cam: { z: [1.0, 1.14], r: [0.04, 0.07] }, sfx: [[0, 'reinforce', 0.6], [0.3, 'unsheathe_01', 0.9]] }),
    cut(0.3, sc({ bg: brightPlane(0.6), sil: INK, speed: { ang: 0, col: 'rgba(255,255,255,0.7)', n: 50, v: 2100 },
      actors: [{ who: 'dead:1', clip: 'Run', fps: 16, ang: LEFT, x: 0.85, y: 0.86, to: [0.72, 0.86], sc: 2.2, ease: 'lin' }, { who: V, clip: 'Run', fps: 18, ang: RIGHT, x: 0.1, y: 0.88, to: [0.55, 0.88], sc: 2.2, smear: 5, smearCol: '#ff4a5e', ease: 'in' }] }),
      { ...G, cam: { r: [0.16, 0.12] }, sfx: [[0, 'dodge', 1]] }),
    hit1,
    cut(0.05, E.inv({ lines: 'level', actors: [{ who: V, clip: 'Attack1', fr: 10, ang: RIGHT, x: 0.45, y: 0.95, sc: 3.2 }], cy: 0.55 }), { bars: false }),
    fling, E.hold(fling, 0.4, 0.05),
    cut(0.4, sc({ bg: brightPlane(0.75, ['#a04a54', '#ffe8ec']), sil: INK, speed: { ang: -0.5, col: 'rgba(255,255,255,0.5)', n: 30, v: 1200 },
      actors: [{ who: V, clip: 'Idle4', ang: -PI / 4, x: 0.5, y: 0.98, sc: 2 },
        { who: 'dead:3', clip: 'Attack4', fr: [2, 9], ang: PI * 0.25, x: 0.05, y: 0.4, to: [0.4, 0.9], arc: 0.2, sc: [1.4, 2.2], smear: 2, smearCol: '#c86a74', eyes: '#ff3048' },
        { who: 'dead:4', clip: 'Attack4', fr: [2, 9], ang: PI * 0.75, x: 0.95, y: 0.35, to: [0.6, 0.9], arc: 0.2, sc: [1.4, 2.2], smear: 2, smearCol: '#c86a74', eyes: '#ff3048' },
        { who: 'dead:0', clip: 'Attack4', fr: [2, 9], ang: FRONT, x: 0.5, y: 0.1, to: [0.5, 0.75], sc: [1.0, 1.8], smear: 2, smearCol: '#c86a74', eyes: '#ff3048' }] }),
      { ...G, cam: { z: [1.0, 1.1], r: [-0.06, -0.02] }, sfx: [[0, 'swish_1', 0.9], [0.15, 'swish_0', 0.9]] }),
    spinRing,
    cut(0.05, E.inv({ actors: [{ who: V, clip: 'Attack6', fr: 9, ang: FRONT, x: 0.5, y: 0.95, sc: 2.8 }], cy: 0.55 }), { bars: false, sfx: [[0, 'slash_2', 1]] }),
    cut(0.05, E.inv({ bg: '#fff', fg: '#000', actors: [{ who: V, clip: 'Attack6', fr: 11, ang: FRONT, x: 0.5, y: 0.95, sc: 2.8 }], cy: 0.55, seed: 5 }), { bars: false }),
    burst,
    E.blink(0.05),
    cut(0.5, sc({ bg: brightPlane(0.45, ['#a04a54', '#ffe8ec']), sil: INK, speed: { ang: 0, col: 'rgba(255,255,255,0.6)', n: 40, v: 1500 },
      actors: [{ who: 'dead:6', clip: 'Attack1', fr: [2, 10], ang: LEFT, x: 0.62, y: 0.95, sc: 3.6, eyes: '#ff3048' }, { who: V, clip: 'Slide', fps: 12, ang: RIGHT, x: 0.1, y: 1.0, to: [0.7, 1.0], sc: 2.4, smear: 3, smearCol: '#ff4a5e', ease: 'out' }] }),
      { ...G, cam: { r: [0.06, 0.03], z: [1.0, 1.08] }, sfx: [[0, 'swish_2', 1], [0.1, 'step_1', 1]] }),
    upcut,
    cut(0.05, E.inv({ bg: RED, fg: '#000', actors: [{ who: V, clip: 'Attack3', fr: 11, ang: -PI / 4, x: 0.45, y: 0.95, sc: 3 }], cy: 0.5 }), { bars: false }),
    intoMoon, E.hold(intoMoon, 0.85, 0.06),
    cut(0.8, sc({ bg: brightPlane(0.66, ['#5a5a60', '#d8d8dc'], ['#9a9aa0', '#2a2a30']), sil: INK,
      actors: [{ who: V, clip: 'Idle4', fps: 7, ang: FRONT, x: 0.5, y: 0.84, sc: 1.8 }, ...[[0.22, 0.88, 2], [0.76, 0.9, 3], [0.36, 0.95, 4], [0.66, 0.8, 5]].map(([x, y, i]) => ({ who: 'dead:' + i, clip: 'Die', fr: 14, ang: i % 2 ? LEFT : RIGHT, x, y, sc: 1.4 }))],
      glows: [{ x: 0.5, y: 0.68, w: 0.06, h: 0.12, col: '#ff3048', a: 0.6 }] }), { grade: 'grey', keepRed: true, cam: { z: [1.08, 1.0] }, sfx: [[0, 'thud', 0.7]] }),
    built('colossus', null, 0, { line: 'He waits at the top of the Spire.', lineAt: 2.0, lineDur: 1.9 }),
    built('gaze', null, 0, { bars: false, line: 'Kneel.', lineAt: 0.4, lineDur: 1.0, lineCol: '#ffd0d8' }),
    built('strike'),
    built('defy', null, 0, { bars: false }),
    built('title'),
  ], { music: ['draw', 'act0'], amb: 'wind', titleShot: 'title' });
})();
