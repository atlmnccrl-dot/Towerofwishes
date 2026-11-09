// THE BLEEDING MOON — the guardians' entrances, cut like the reference edits (js/edit.js): each one a
// short duel in its own colour world, cut fast. The title cards; the place; the guardian's face and a
// line; her eyes and her answer; then the exchange (the leap, the hit as an inverted silhouette, the ring,
// the body thrown along a trail, the stutter); the name. Played by the film player (js/intro.js) before
// the guardian's fight: in full the first time, skippable after that.
(function () {
  const VS = window.VS, D = VS.DATA, A = VS.A, PX = VS.PX;
  const K0 = VS.INTRO.kit, E = VS.EDIT, { RED, W, H, K, hash, ease, clamp, fill, grad, stars, moon, rain, kick, say, colossus, burningEyes, bigBlade } = K0;
  const F = VS.FILMS = {};
  const PI = Math.PI, RIGHT = 0, LEFT = PI, FRONT = PI / 2, BACK = -PI / 2;
  const V = 'vesper', VCOL = '#ff9aaa';
  const sc = E.scene, cut = (d, tpl, o) => Object.assign({ d }, tpl, o || {});
  const card = (d, text, paper, o) => cut(d, E.card({ text, bg: paper ? '#ebe6e3' : '#000', col: paper ? '#141012' : '#f4eef0', opts: o }), { bars: false, flat: true, sfx: [[0.02, 'thud', 0.6]] });
  const word = (d, text, col) => cut(d, E.card({ text, col: col || '#ff3048', opts: { size: 24, spacing: 0.08 } }), { bars: false, flat: true, sfx: [[0, 'blow_0', 0.6]] });
  const nameCut = (d, name, sub, tpl, o) => cut(d, tpl, Object.assign({ text: [{ kind: 'big', text: name, y: 0.22, o: { size: 30 } }, { kind: 'line', at: 0.3, text: sub, y: 0.34, o: { size: 14, col: '#f0e6ea', spacing: 3, a: 1 } }], sfx: [[0.02, 'boss', 1]] }, o));
  const EZ_IN = (k) => k * k * k;
  const fr = (T, n) => Math.floor(T * (n || 8)) % 15;
  function vesperSmall(ctx, S, x, y, s, T, ang) { A.actor(ctx, S.cast.vesper, 'Walk', fr(T, 10), ang == null ? BACK : ang, Math.round(x), Math.round(y), s || 1.2, {}); }

  // ---- the places ------------------------------------------------------------------------------------
  function blackGate(ctx, T, open) {
    const cx = W() / 2, base = Math.round(H() * 0.84), gw = 70, gh = 100;
    ctx.fillStyle = '#060204';
    ctx.fillRect(-8, base - 120, W() + 16, 130);
    for (const sx of [-1, 1]) { const x = cx + sx * (gw / 2 + 30); ctx.fillRect(Math.round(x - 26), base - 170, 52, 180); ctx.beginPath(); ctx.moveTo(x - 30, base - 170); ctx.lineTo(x, base - 205); ctx.lineTo(x + 30, base - 170); ctx.fill(); }
    for (let x = -8; x < W() + 8; x += 14) ctx.fillRect(x, base - 128, 9, 8);
    const g = ctx.createLinearGradient(0, base - gh, 0, base); g.addColorStop(0, 'rgba(255,42,68,0.15)'); g.addColorStop(1, 'rgba(255,42,68,0.9)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx - gw / 2, base); ctx.lineTo(cx - gw / 2, base - gh * 0.7); ctx.quadraticCurveTo(cx, base - gh * 1.1, cx + gw / 2, base - gh * 0.7); ctx.lineTo(cx + gw / 2, base); ctx.fill();
    A.tex(ctx, 'light_01', cx, base - 30, 200, 160, RED, 0.3 + 0.3 * open, 0, true);
    // The portcullis, rising.
    ctx.fillStyle = '#0a0406'; const lift = Math.round(open * gh * 0.8);
    for (let x = cx - gw / 2 + 4; x < cx + gw / 2; x += 8) ctx.fillRect(Math.round(x), base - gh - lift, 3, gh);
    for (let y = base - gh - lift; y < base - lift; y += 14) ctx.fillRect(Math.round(cx - gw / 2), Math.round(y), gw, 2);
    for (const sx of [-1, 1]) { ctx.fillStyle = `rgba(255,${150 + Math.round(60 * Math.sin(T * 9 + sx))},80,0.9)`; ctx.fillRect(Math.round(cx + sx * (gw / 2 + 30)) - 1, base - 110, 2, 4); }
    return base;
  }
  function cloister(ctx, T, snow) {
    grad(ctx, ['#060a14', '#14223a', '#24344c']);
    const vp = W() / 2;
    for (let i = 0; i < 5; i++) for (const sx of [-1, 1]) { const d = 1 - i / 5, x = vp + sx * (20 + d * d * W() * 0.48), w = 6 + d * 30, top = H() * (0.36 - d * 0.36); ctx.fillStyle = `rgb(${10 + i * 6},${18 + i * 8},${30 + i * 10})`; ctx.fillRect(Math.round(x - w / 2), Math.round(top), Math.round(w), H()); }
    const gy = Math.round(H() * 0.8); ctx.fillStyle = '#c8d8ea'; ctx.globalAlpha = 0.18; ctx.fillRect(-8, gy, W() + 16, H()); ctx.globalAlpha = 1; ctx.fillStyle = '#0a121c'; ctx.fillRect(-8, gy + 2, W() + 16, H());
    for (let i = 0; i < snow; i++) { const x = (hash(i, 741) * W() + Math.sin(T + i) * 6), y = ((hash(i, 742) * H() + T * (16 + hash(i, 743) * 20)) % H()); ctx.fillStyle = 'rgba(230,240,255,0.7)'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); }
    return gy;
  }
  function waste(ctx, T, lightsOut) {
    grad(ctx, ['#0c0806', '#2a1c16', '#3a2a20']);
    for (let i = 0; i < 60; i++) { const x = (hash(i, 791) * W() + T * 10) % W(), y = (hash(i, 792) * H() + T * (8 + hash(i, 793) * 10)) % H(); ctx.fillStyle = 'rgba(160,150,140,0.5)'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); }
    const gy = Math.round(H() * 0.78); ctx.fillStyle = '#0c0806'; ctx.fillRect(-8, gy, W() + 16, H());
    // Dead trees.
    for (let i = 0; i < 5; i++) { const x = Math.round(W() * (0.08 + i * 0.22)), h = 30 + hash(i, 794) * 30; ctx.fillStyle = '#060403'; ctx.fillRect(x, gy - h, 3, h); ctx.fillRect(x - 8, gy - h * 0.7, 10, 2); ctx.fillRect(x + 2, gy - h * 0.5, 9, 2); ctx.fillRect(x - 5, gy - h * 0.9, 6, 1); }
    // Far lights, going out.
    for (let i = 0; i < 6; i++) { if (i < lightsOut) continue; const x = W() * (0.1 + i * 0.16), y = gy - 4, f = 0.6 + 0.4 * Math.sin(T * 9 + i); ctx.fillStyle = '#ffb060'; ctx.fillRect(Math.round(x), y, 2, 2); A.tex(ctx, 'light_01', x, y, 30, 20, '#ff9a40', 0.5 * f, 0, true); }
    return gy;
  }
  function storm(ctx, T, gyF) {
    grad(ctx, ['#0a0c14', '#1c2232', '#2a3242']);
    const flash = (T % 1.7) < 0.08;
    if (flash) fill(ctx, '#ffffff', 0.25);
    for (let i = 0; i < 5; i++) A.tex(ctx, 'smoke_07', ((hash(i, 811) * W() * 1.6 + T * 40) % (W() * 1.6)) - W() * 0.3, H() * (0.15 + i * 0.07), W() * 0.9, 50, '#3a4252', 0.6, 0, false);
    const gy = Math.round(H() * (gyF || 0.8));
    ctx.fillStyle = '#06080c'; ctx.beginPath(); ctx.moveTo(-8, gy + 10); ctx.lineTo(W() * 0.4, gy); ctx.lineTo(W() + 8, gy - 12); ctx.lineTo(W() + 8, H() + 8); ctx.lineTo(-8, H() + 8); ctx.fill();
    K().hStreaks(ctx, 40, 'rgba(220,230,255,0.3)', 813, T, -1200);
    rain(ctx, T, 80, 0.35, -0.3);
    return gy;
  }
  function summit(ctx, T, gyF) {
    grad(ctx, ['#0c0206', '#3a0812', '#6a1020']);
    stars(ctx, 40, 0.4, 851, T);
    moon(ctx, W() / 2, H() * 0.36, H() * 0.32, '#ff3a52', 'rgba(255,40,70,0.6)', 1, T);
    for (let i = 0; i < 6; i++) A.tex(ctx, 'smoke_04', ((hash(i, 852) * W() * 1.4 + T * (8 + i * 3)) % (W() * 1.4)) - W() * 0.2, H() * (0.72 + (i % 3) * 0.05), W() * 0.8, 40, '#3a0a14', 0.7, 0, false);
    const gy = Math.round(H() * (gyF || 0.86));
    ctx.fillStyle = '#050203'; ctx.beginPath(); ctx.moveTo(W() / 2 - 110, H() + 10); ctx.lineTo(W() / 2 - 80, gy); ctx.lineTo(W() / 2 + 80, gy); ctx.lineTo(W() / 2 + 110, H() + 10); ctx.fill();
    for (let x = W() / 2 - 80; x < W() / 2 + 80; x += 14) ctx.fillRect(Math.round(x), gy - 5, 8, 5);
    return gy;
  }

  // Bright fields and black figures: the look of the reference fights. A plane under a pale sky.
  const brightPlane = (hz, sky, floor) => ({ kind: 'plane', sky: sky || ['#8a8494', '#f0ecf4'], floor: floor || ['#a8a2b0', '#3a3640'], hz: hz == null ? 0.62 : hz });
  const brightGlow = (at, col, base) => ({ kind: 'glow', col: col || '#ffffff', base: base || '#5a5664', at: at || [0.5, 0.45], r: 0.75 });
  const INK = '#050407';

  // ---- The Gatewarden: violet. "Turn back." He leaps from the gate; the ground breaks; she cuts in and is thrown.
  {
    const gate = (ctx, S, k, T) => { grad(ctx, ['#0c0a10', '#3a3440', '#5a5460']); moon(ctx, W() / 2, H() * 0.2, H() * 0.16, '#f4f0f0', 'rgba(255,255,255,0.3)', 0); blackGate(ctx, T, ease(clamp(k * 1.4))); ctx.fillStyle = '#0a0a0c'; ctx.fillRect(-W(), H() * 0.84, W() * 3, H()); };
    const EYE = '#e0d8ff', G = { grade: 'violet', keepRed: true };
    const hit = { d: 0.3, cam: { z: [1.2, 1.42], ease: 'out' }, ...G, sfx: [[0.12, 'slash_2', 1], [0.14, 'blow_1', 1]],
      ...sc({ bg: brightGlow([0.55, 0.5]), sil: INK, speed: { ang: 0.2, col: 'rgba(255,255,255,0.7)', n: 60, v: 1600 },
        actors: [{ who: 'warden', clip: 'TakeDamage', fr: [0, 8], ang: LEFT, x: 0.68, y: 0.98, sc: 3.2, to: [0.76, 0.98], t0: 0.4, eyes: EYE },
          { who: V, clip: 'Attack2', fr: [3, 11], ang: RIGHT, x: 0.16, y: 0.98, to: [0.42, 0.98], sc: 3.2, smear: 4, smearCol: '#ffffff', ease: 'snap', t1: 0.5 }],
        fx: [{ key: 'hit_big', x: 0.58, y: 0.55, sc: 2.2, t0: 0.42 }] }) };
    const thrown = { d: 0.6, cam: { z: [1.0, 1.0], x: [0.1, -0.15], ease: 'out' }, ...G, sfx: [[0, 'blow_big', 1], [0.05, 'whoosh', 1]],
      ...sc({ bg: brightPlane(0.66), sil: INK, speed: { ang: 0, col: 'rgba(255,255,255,0.5)', n: 30, v: 1200 },
        actors: [{ who: 'warden', clip: 'Special1', fr: [8, 14], ang: LEFT, x: 0.82, y: 0.72, sc: 1.6, eyes: EYE },
          { who: V, clip: 'TakeDamage', fr: [2, 12], ang: RIGHT, x: 0.72, y: 0.7, to: [0.08, 0.76], arc: 0.12, sc: 1.2, smear: 4, smearCol: '#6a5aa0', rot: -6 }],
        trails: [{ from: [0.74, 0.64], to: [0.06, 0.72], w: 3, col: '#ffffff', t0: 0.05, t1: 0.8, fade: 0.7 }] }) };
    F.warden = E.film([
      card(1.3, 'NO ONE PASSES THE BLACK GATE', true),
      E.blink(),
      cut(1.5, sc({ bg: gate, actors: [{ who: 'warden', clip: 'Idle4', ang: FRONT, x: 0.5, y: 0.18, sc: 1.1, eyes: EYE }, { who: V, clip: 'Walk', fps: 10, ang: BACK, x: 0.5, y: 1.04, to: [0.5, 0.97], sc: 1.5, ease: 'lin' }],
        over: (ctx, S, k, T) => say(S, 'card', 'THE BLACK GATE', 10, 32, { sub: 'DUSK', k: T }) }), { cam: { z: [1.0, 1.14] }, ...G, sfx: [[0.1, 'horn', 0.7], [0.6, 'quake', 0.7]] }),
      cut(0.9, E.face({ who: 'warden', sc: 3.2, cy: 0.36, shade: INK, eyes: EYE, eyesAt: 0.25, bg: brightGlow([0.5, 0.4], '#ffffff', '#4a4654') }),
        { cam: { z: [1.0, 1.16] }, ...G, sfx: [[0.2, 'charge', 0.9], [0.25, 'blink', 0.6]], line: 'Turn back, little blade.', lineDur: 1.3, lineCol: '#d8ccff' }),
      cut(0.75, E.eyes({ at: 0.4, sc: 4 }), { cam: { z: [1.0, 1.12], ease: 'out' }, bars: false, sfx: [[0.3, 'clang_0', 0.6]], line: 'Open the gate.', lineAt: 0.3, lineDur: 0.9, lineCol: VCOL }),
      E.blink(0.03),
      cut(0.55, sc({ bg: brightPlane(0.7), sil: INK, speed: { ang: -1.1, col: 'rgba(255,255,255,0.6)', n: 40, v: 1400 },
        actors: [{ who: V, clip: 'Idle4', ang: -PI / 4, x: 0.24, y: 0.92, sc: 1.4 },
          { who: 'warden', clip: 'Attack4', fr: [2, 9], ang: FRONT, x: 0.84, y: 0.1, to: [0.56, 0.9], sc: [1.2, 3.0], smear: 3, smearCol: '#8a80a0', ease: 'in', eyes: EYE }] }),
        { cam: { r: [-0.14, -0.06], z: [1.0, 1.1] }, ...G, sfx: [[0, 'whoosh', 1], [0.3, 'swish_2', 1]] }),
      cut(0.06, E.inv({ actors: [{ who: 'warden', clip: 'Special1', fr: 14, ang: FRONT, x: 0.5, y: 0.98, sc: 3 }], cy: 0.62 }), { bars: false, sfx: [[0, 'smash', 1], [0.01, 'quake', 1]] }),
      cut(0.05, E.inv({ bg: '#fff', fg: '#000', actors: [{ who: 'warden', clip: 'Special1', fr: 14, ang: FRONT, x: 0.5, y: 0.98, sc: 3 }], cy: 0.62, seed: 3 }), { bars: false }),
      cut(0.7, sc({ bg: brightPlane(0.6), sil: INK, actors: [{ who: 'warden', clip: 'Special1', fr: 14, ang: FRONT, x: 0.5, y: 0.82, sc: 2.6, eyes: EYE },
        { who: V, clip: 'TakeDamage', fr: [0, 10], ang: RIGHT, x: 0.36, y: 0.84, to: [0.1, 0.9], arc: 0.18, sc: 1.6, rot: -3, smear: 2, smearCol: '#8a80a0' }],
        rings: [{ x: 0.5, y: 0.82, t0: 0, dur: 0.7, rx: 0.8, ry: 0.1, w: 2, col: '#ffffff' }, { x: 0.5, y: 0.82, t0: 0.12, dur: 0.7, rx: 0.6, ry: 0.07, col: '#ffffff' }],
        debris: [{ x: 0.5, y: 0.82, t0: 0, n: 40, col: ['#14121a', '#3a3640'], v: 1.3, s: 3 }], glows: [{ x: 0.5, y: 0.8, w: 0.9, h: 0.3, col: '#c8b8ff', a: 0.6 }] }),
        { cam: { z: [1.15, 1.0], ease: 'out' }, shake: 7, shakeOut: true, ...G, sfx: [[0, 'blow_big', 1]] }),
      cut(0.45, sc({ bg: brightPlane(0.52, ['#6a6474', '#d8d4e0']), sil: INK, speed: { ang: 0, col: 'rgba(255,255,255,0.6)', n: 36, v: -1300 },
        actors: [{ who: V, clip: 'Slide', fps: 12, ang: LEFT, x: 0.75, y: 0.95, to: [0.35, 0.95], sc: 3.0, ease: 'out' }], debris: [{ x: 0.4, y: 0.95, t0: 0.3, n: 20, col: '#3a3640', spread: 1.2 }] }),
        { cam: { r: [0.08, 0.04] }, ...G, sfx: [[0, 'step_1', 1], [0.1, 'swish_0', 0.8]] }),
      cut(0.35, sc({ bg: brightPlane(0.6), sil: INK, speed: { ang: 0, col: 'rgba(255,255,255,0.7)', n: 50, v: 2000 },
        actors: [{ who: 'warden', clip: 'Idle4', ang: LEFT, x: 0.85, y: 0.86, sc: 2.2, eyes: EYE }, { who: V, clip: 'Run', fps: 18, ang: RIGHT, x: 0.1, y: 0.88, to: [0.6, 0.88], sc: 2.2, smear: 5, smearCol: '#ff4a5e', ease: 'in' }] }),
        { cam: { r: [0.16, 0.12] }, ...G, sfx: [[0, 'dodge', 1]] }),
      hit,
      cut(0.06, E.inv({ lines: 'level', actors: [{ who: V, clip: 'Attack2', fr: 10, ang: RIGHT, x: 0.45, y: 0.95, sc: 3.4 }], cy: 0.55 }), { bars: false, sfx: [[0, 'blow_big', 0.9]] }),
      E.hold(hit, 0.6, 0.06),
      cut(0.4, sc({ bg: brightGlow([0.5, 0.5]), sil: INK, actors: [{ who: V, clip: 'Attack2', fr: 10, ang: RIGHT, x: 0.36, y: 1.0, sc: 3.0, to: [0.33, 1.0] }, { who: 'warden', clip: 'Attack1', fr: [6, 4], ang: LEFT, x: 0.66, y: 1.0, sc: 3.0, to: [0.63, 1.0], eyes: EYE }],
        sparks: [{ x: 0.5, y: 0.5, t0: 0, n: 90, seed: 41 }], glows: [{ x: 0.5, y: 0.5, w: 0.3, col: '#ffffff', a: 0.9 }] }),
        { cam: { z: [1.3, 1.36] }, shake: 3, ...G, sfx: [[0, 'clang_1', 1], [0.02, 'parry', 0.8]], line: 'Heavy...', lineAt: 0.1, lineDur: 0.7, lineCol: VCOL }),
      thrown,
      E.hold(thrown, 0.3, 0.06),
      cut(0.6, sc({ bg: brightPlane(0.66, ['#6a6a70', '#c8c8cc'], ['#8a8a90', '#2a2a30']), sil: INK, actors: [{ who: V, clip: 'CrouchIdle', fps: 8, ang: RIGHT, x: 0.3, y: 0.86, sc: 2.0 }],
        debris: [{ x: 0.3, y: 0.86, t0: 0, n: 16, col: '#3a3a40', v: 0.4, spread: 3 }] }), { grade: 'grey', cam: { z: [1.0, 1.06] }, sfx: [[0, 'thud', 0.8]] }),
      cut(1.0, sc({ bg: brightGlow([0.5, 0.35], '#ffffff', '#8a84a0'), sil: INK, actors: [{ who: 'warden', clip: 'Taunt', fps: 10, ang: FRONT, x: 0.5, y: 1.15, sc: 3.6, eyes: EYE }] }),
        { ...G, cam: { z: [1.0, 1.1], r: [0, 0.04] }, shake: 2, sfx: [[0, 'quake', 1], [0.1, 'horn', 0.8]], text: { kind: 'knock', text: 'GATEWARDEN', at: 0.05, o: { size: 0.85, sx: 0.58, col: '#000' } } }),
      nameCut(1.2, 'THE GATEWARDEN', 'KEEPER OF THE BLACK GATE', sc({ bg: brightGlow([0.5, 0.75], '#c8c0d8', '#0a090c'), sil: INK, actors: [{ who: 'warden', clip: 'Idle4', fps: 8, ang: FRONT, x: 0.5, y: 1.25, sc: 3.4, eyes: EYE }] }),
        { ...G, cam: { z: [1.08, 1.0] }, whiteOut: 0.15 }),
    ], { music: ['c6', 'boss'] });
  }

  // Two scenes side by side (a split screen), with a white seam.
  const split = (left, right, vertical) => ({
    draw(ctx, S, k, T, c) {
      for (const [tpl, a] of [[left, 0], [right, 1]]) { ctx.save(); ctx.beginPath(); if (vertical) ctx.rect(-W(), a ? H() / 2 + 1 : -H(), W() * 3, a ? H() * 2 : H() * 1.5 - 1); else ctx.rect(a ? W() / 2 + 1 : -W(), -H(), a ? W() * 2 : W() * 1.5 - 1, H() * 3); ctx.clip(); tpl.draw(ctx, S, k, T, c); ctx.restore(); }
    },
    post(ctx, S, k, T, c) {
      for (const [tpl, a] of [[left, 0], [right, 1]]) if (tpl.post) { ctx.save(); ctx.beginPath(); if (vertical) ctx.rect(-W(), a ? H() / 2 + 1 : -H(), W() * 3, a ? H() * 2 : H() * 1.5 - 1); else ctx.rect(a ? W() / 2 + 1 : -W(), -H(), a ? W() * 2 : W() * 1.5 - 1, H() * 3); ctx.clip(); tpl.post(ctx, S, k, T, c); ctx.restore(); }
      ctx.fillStyle = '#ffffff'; if (vertical) ctx.fillRect(-W(), Math.round(H() / 2) - 1, W() * 3, 2); else ctx.fillRect(Math.round(W() / 2) - 1, -H(), 2, H() * 3);
    },
  });

  // ---- The Hollow Twins: ice. Mirrored halves; they wake as one, cross blades through where she stood. ----
  {
    const EYE = '#bff0ff', G = { grade: 'ice', keepRed: true }, TCOL = '#bfe8ff';
    const cold = (ctx, S, k, T) => { cloister(ctx, T, 60); };
    const half = (who, ang, x) => sc({ bg: brightGlow([x, 0.4], '#ffffff', '#3a5a70'), sil: INK, actors: [{ who, clip: 'Idle4', fr: 0, ang, x, y: 1.1, sc: 3.3, eyes: EYE, eyesA: 1 }] });
    const cross = { d: 0.42, ...G, cam: { z: [1.05, 1.25], ease: 'out' }, sfx: [[0, 'whoosh', 1], [0.25, 'slash_2', 1]],
      ...sc({ bg: brightPlane(0.62, ['#6a8aa0', '#f0f8ff'], ['#a8c8d8', '#2a3a48']), sil: INK, speed: { ang: 0, col: 'rgba(255,255,255,0.6)', n: 40, v: 1500 },
        actors: [{ who: 'twinA', clip: 'Attack1', fr: [2, 9], ang: RIGHT, x: 0.08, y: 0.9, to: [0.42, 0.9], sc: 2.6, smear: 4, smearCol: '#9ac8e8', ease: 'snap', eyes: EYE },
          { who: 'twinB', clip: 'Attack2', fr: [2, 9], ang: LEFT, x: 0.92, y: 0.9, to: [0.58, 0.9], sc: 2.6, smear: 4, smearCol: '#9ac8e8', ease: 'snap', eyes: EYE },
          { who: V, clip: 'Rolling', fps: 30, ang: FRONT, x: 0.5, y: 0.9, to: [0.5, 1.4], sc: 2.2, t0: 0.15, ease: 'in' }],
        fx: [{ key: 'cross_slash', x: 0.5, y: 0.55, sc: 2.4, t0: 0.55 }] }) };
    const counter = { d: 0.5, ...G, cam: { r: [0.1, 0.06], x: [0, -0.1] }, sfx: [[0.05, 'slash_1', 1], [0.08, 'blow_2', 1]],
      ...sc({ bg: brightPlane(0.58, ['#6a8aa0', '#f0f8ff'], ['#a8c8d8', '#2a3a48']), sil: INK,
        actors: [{ who: V, clip: 'Attack3', fr: [3, 12], ang: RIGHT, x: 0.32, y: 0.88, sc: 2.4 },
          { who: 'twinA', clip: 'TakeDamage', fr: [0, 12], ang: LEFT, x: 0.46, y: 0.88, to: [1.1, 0.7], arc: 0.08, sc: 2.4, rot: 5, smear: 3, smearCol: '#9ac8e8', t0: 0.15, eyes: EYE }],
        trails: [{ from: [0.46, 0.7], to: [1.1, 0.58], w: 3, col: '#ffffff', t0: 0.15, t1: 0.9 }], fx: [{ key: 'ice_shatter', x: 0.46, y: 0.68, sc: 1.6, t0: 0.12 }] }) };
    F.twins = E.film([
      card(1.0, 'THEY DIED TOGETHER', false), card(1.0, 'THEY WAKE TOGETHER', true),
      cut(1.3, sc({ bg: cold, actors: [{ who: 'twinA', clip: 'CrouchIdle', fr: 0, ang: RIGHT, x: 0.36, y: 0.79, sc: 1.4 }, { who: 'twinB', clip: 'CrouchIdle', fr: 0, ang: LEFT, x: 0.64, y: 0.79, sc: 1.4 },
        { who: V, clip: 'Walk', fps: 10, ang: BACK, x: 0.5, y: 1.06, to: [0.5, 0.96], sc: 1.7, ease: 'lin' }], over: (ctx, S, k, T) => say(S, 'card', 'THE FROZEN CLOISTER', 10, 32, { sub: 'THE FIRST HOUR', k: T }) }),
        { ...G, cam: { z: [1.0, 1.12] }, sfx: [[0.2, 'magic', 0.5]] }),
      cut(0.08, E.flash('#ffffff'), { bars: false, sfx: [[0, 'break', 1]] }),
      cut(1.0, split(half('twinA', PI * 0.25, 0.3), half('twinB', PI * 0.75, 0.7)), { ...G, cam: { z: [1.12, 1.0], ease: 'out' }, sfx: [[0.15, 'blink', 0.7], [0.3, 'charge', 0.8]], line: 'We are two blades.', lineDur: 1.1, lineCol: TCOL,
        over: (ctx, S, k, T) => { if (T > 0.3) { say(S, 'track', null, W() * 0.3, H() * 0.42, { w: 34, h: 20, k: T - 0.3, col: '#ffffff', sub: 'LEFT HAND' }); say(S, 'track', null, W() * 0.7, H() * 0.42, { w: 34, h: 20, k: T - 0.42, col: '#ffffff', sub: 'RIGHT HAND' }); } } }),
      cut(0.7, E.eyes({ at: 0.35, sc: 4 }), { bars: false, cam: { z: [1.0, 1.1] }, sfx: [[0.3, 'clang_0', 0.6]], line: 'I only need one.', lineAt: 0.25, lineDur: 0.9, lineCol: VCOL }),
      E.blink(0.03),
      cut(0.45, sc({ bg: brightPlane(0.6, ['#6a8aa0', '#f0f8ff'], ['#a8c8d8', '#2a3a48']), sil: INK, speed: { ang: 0, col: 'rgba(255,255,255,0.6)', n: 50, v: 1800 },
        actors: [{ who: 'twinA', clip: 'Run', fps: 18, ang: RIGHT, x: -0.05, y: 0.82, to: [0.3, 0.82], sc: 1.5, smear: 4, smearCol: '#9ac8e8' }, { who: 'twinB', clip: 'Run', fps: 18, ang: LEFT, x: 1.05, y: 0.82, to: [0.7, 0.82], sc: 1.5, smear: 4, smearCol: '#9ac8e8' },
          { who: V, clip: 'Idle4', ang: FRONT, x: 0.5, y: 0.84, sc: 1.5 }] }), { ...G, cam: { r: [-0.1, -0.04], z: [1.0, 1.15] }, sfx: [[0, 'dodge', 1], [0.1, 'dodge', 1]] }),
      cross,
      cut(0.06, E.inv({ actors: [{ who: 'twinA', clip: 'Attack1', fr: 9, ang: RIGHT, x: 0.4, y: 0.98, sc: 2.8 }, { who: 'twinB', clip: 'Attack2', fr: 9, ang: LEFT, x: 0.6, y: 0.98, sc: 2.8 }], cy: 0.55 }), { bars: false, sfx: [[0, 'clang_1', 1], [0.01, 'blow_big', 1]] }),
      E.hold(cross, 0.75, 0.05),
      cut(0.6, sc({ bg: brightGlow([0.5, 0.5], '#ffffff', '#4a6a80'), sil: INK, actors: [{ who: V, clip: 'Rolling', fps: 30, ang: LEFT, x: 0.62, y: 0.92, to: [0.3, 0.92], sc: 2.0, smear: 3, smearCol: '#ff4a5e' }],
        debris: [{ x: 0.5, y: 0.5, t0: 0, n: 50, col: ['#ffffff', '#bfe8ff'], spread: 6.2, v: 1.4 }], rings: [{ x: 0.5, y: 0.5, t0: 0, dur: 0.6, rx: 0.5, ry: 0.5, w: 2 }], fx: [{ key: 'ice_shatter', x: 0.5, y: 0.5, sc: 3, t0: 0 }] }),
        { ...G, cam: { z: [1.2, 1.05], ease: 'out' }, shake: 5, shakeOut: true, sfx: [[0, 'break', 1], [0.02, 'quake', 0.8]] }),
      counter,
      E.hold(counter, 0.5, 0.05),
      cut(0.6, sc({ bg: cold, sil: INK, actors: [{ who: 'twinB', clip: 'Special1', fr: [4, 14], ang: FRONT, x: 0.5, y: 0.8, sc: 1.6, eyes: EYE }, { who: V, clip: 'Rolling', fps: 30, ang: RIGHT, x: 0.15, y: 0.88, to: [0.85, 0.88], sc: 1.6, smear: 4, smearCol: '#ff4a5e' }],
        under: (ctx, S, k, T) => { for (let i = 0; i < 6; i++) { const x = W() * (0.18 + i * 0.13), t = k * 1.6 - i * 0.12; if (t < 0) continue; const ly = Math.min(H() * 0.88, -20 + t * H() * 2.2); ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x) - 1, Math.round(ly - 24), 3, 24); if (ly >= H() * 0.88) A.fx(ctx, 'ice_shatter', t - 0.45, x, H() * 0.87, 1.2, 1); } } }),
        { ...G, cam: { r: [0.05, -0.05] }, sfx: [[0.1, 'smash', 0.7], [0.25, 'smash', 0.7], [0.4, 'smash', 0.7]] }),
      cut(0.06, E.inv({ lines: 'level', actors: [{ who: V, clip: 'Attack6', fr: 8, ang: RIGHT, x: 0.5, y: 0.95, sc: 3.2 }], cy: 0.55 }), { bars: false, sfx: [[0, 'slash_2', 1]] }),
      nameCut(1.3, 'THE HOLLOW TWINS', 'THE LEFT HAND · THE RIGHT HAND', split(half('twinA', 0, 0.26), half('twinB', PI, 0.74)), { ...G, cam: { z: [1.0, 1.06] }, whiteOut: 0.15 }),
    ], { amb: 'night', music: ['c8', 'boss'] });
  }

  // ---- The Umbral: ink, nothing but black and white. "Behind you." The court of shadows closes on her. ----
  {
    const EYE = '#d8a0ff', G = { grade: 'ink' }, UCOL = '#d8b0ff';
    const pool = { kind: 'glow', col: '#ffffff', base: '#000000', at: [0.5, 0.8], r: 0.35 };
    const flick = (white, d) => cut(d || 0.05, sc({ bg: { kind: 'flat', col: white ? '#ffffff' : '#000000' }, actors: [{ who: 'umbral', clip: 'Idle4', fr: 0, ang: PI * 0.75, x: 0.6, y: 0.96, sc: 2.6, shade: white ? '#000' : '#fff' }, { who: V, clip: 'Idle4', fr: 0, ang: FRONT, x: 0.42, y: 0.96, sc: 1.8, shade: white ? '#000' : '#fff' }] }), { bars: false });
    const strike = { d: 0.35, ...G, cam: { z: [1.1, 1.3], r: [0, -0.08], ease: 'out' }, sfx: [[0, 'whoosh', 1], [0.18, 'slash_2', 1], [0.2, 'blow_1', 1]],
      ...sc({ bg: { kind: 'glow', col: '#ffffff', base: '#202020', at: [0.4, 0.5] }, sil: INK, speed: { ang: PI, col: 'rgba(255,255,255,0.8)', n: 60, v: 1800 },
        actors: [{ who: 'umbral', clip: 'Attack1', fr: [2, 10], ang: LEFT, x: 0.95, y: 0.98, to: [0.55, 0.98], sc: 3, smear: 5, smearCol: '#808080', ease: 'snap', eyes: EYE },
          { who: V, clip: 'TakeDamage', fr: [0, 10], ang: RIGHT, x: 0.35, y: 0.98, to: [0.1, 0.98], sc: 3, t0: 0.5 }] }) };
    F.umbral = E.film([
      card(1.4, 'DO NOT LOOK BEHIND YOU', false, { size: 14 }),
      cut(1.2, sc({ bg: pool, sil: INK, actors: [{ who: V, clip: 'Idle4', fps: 7, ang: FRONT, x: 0.5, y: 0.82, sc: 1.8 }],
        over: (ctx, S, k, T) => say(S, 'card', 'THE UMBRAL STAIR', 10, 32, { sub: 'THE SECOND HOUR', k: T }) }), { ...G, cam: { z: [1.0, 1.1] }, sfx: [[0.3, 'magic', 0.4]] }),
      flick(true), flick(false), flick(true), flick(false, 0.08), flick(true), E.blink(0.06),
      cut(0.7, E.face({ who: V, sc: 3.2, cy: 0.36, eyes: '#ff3048', eyesAt: 0.15, ang: FRONT, shade: '#ffffff', bg: { kind: 'flat', col: '#000' } }), { ...G, cam: { z: [1.0, 1.2] }, sfx: [[0.05, 'blink', 0.6]], line: 'Behind you.', lineDur: 0.9, lineCol: UCOL }),
      cut(0.45, sc({ bg: { kind: 'glow', col: '#ffffff', base: '#101010' }, sil: INK, actors: [{ who: V, clip: 'Attack6', fr: [2, 12], ang: LEFT, x: 0.5, y: 0.95, sc: 2.8, smear: 3, smearCol: '#808080' }],
        fx: [{ key: 'spin_slash', x: 0.5, y: 0.6, sc: 2, t0: 0.2 }, { key: 'smoke_dark', x: 0.25, y: 0.6, sc: 2.4, t0: 0.4 }] }),
        { ...G, cam: { r: [-0.2, 0.08], z: [1.2, 1.3] }, sfx: [[0, 'swish_2', 1], [0.2, 'slash_0', 1]] }),
      cut(0.06, E.inv({ lines: 'level', actors: [{ who: V, clip: 'Attack6', fr: 9, ang: LEFT, x: 0.5, y: 0.95, sc: 3 }], cy: 0.55 }), { bars: false }),
      cut(0.8, E.face({ who: 'umbral', sc: 3.2, cx: 0.62, cy: 0.36, ang: PI * 0.75, shade: '#000', eyes: EYE, eyesAt: 0.2, bg: { kind: 'glow', col: '#ffffff', base: '#000', at: [0.62, 0.4], r: 0.5 },
        under: (ctx, S, k, T) => A.actor(ctx, S.cast.vesper, 'Idle4', 0, BACK, Math.round(W() * 0.24), Math.round(H() * 1.35), 5, { shade: '#000' }) }),
        { ...G, cam: { z: [1.0, 1.12] }, sfx: [[0.2, 'charge', 0.9]], line: 'Too slow.', lineAt: 0.25, lineDur: 0.8, lineCol: UCOL }),
      strike,
      cut(0.32, E.ring({ x: 0.5, y: 0.5, r: 0.42, inside: '#303030', actors: [{ who: V, clip: 'TakeDamage', fr: [3, 12], ang: RIGHT, x: 0.5, y: 0.78, sc: 2.6, shade: '#ffffff', rot: -1 }] }), { bars: false, shake: 6, sfx: [[0, 'blow_big', 1]] }),
      cut(0.9, sc({ bg: pool, sil: INK, actors: [{ who: V, clip: 'CrouchIdle', fps: 8, ang: FRONT, x: 0.5, y: 0.82, sc: 1.7 }].concat([0, 1, 2, 3, 4, 5].map((i) => {
        const a = i / 6 * PI * 2 + 0.3; return { who: 'umbral', clip: 'Idle4', fps: 8, ph: i * 2, ang: Math.atan2(-Math.sin(a), -Math.cos(a)), x: 0.5 + Math.cos(a) * 0.36, y: 0.82 + Math.sin(a) * 0.12, sc: 1.8, eyes: EYE, alpha: 1 }; })) }),
        { ...G, cam: { z: [1.15, 1.0], ease: 'out' }, sfx: [[0.1, 'spawn', 0.8], [0.4, 'spawn', 0.8], [0.6, 'unsheathe_01', 1]] }),
      cut(0.06, E.inv({ actors: [0, 1, 2, 3, 4, 5].map((i) => { const a = i / 6 * PI * 2 + 0.3; return { who: 'umbral', clip: 'Attack1', fr: 9, ang: Math.atan2(-Math.sin(a), -Math.cos(a)), x: 0.5 + Math.cos(a) * 0.16, y: 0.8 + Math.sin(a) * 0.06, sc: 1.9 }; }), cy: 0.6 }), { bars: false, sfx: [[0, 'slash_2', 1], [0.01, 'blow_big', 1]] }),
      cut(0.05, E.flash('#000'), { bars: false }),
      cut(0.45, sc({ bg: { kind: 'glow', col: '#ffffff', base: '#202020' }, sil: INK, speed: { ang: 0.4, col: 'rgba(0,0,0,0.6)', n: 50, v: 1600 },
        actors: [{ who: V, clip: 'Rolling', fps: 30, ang: PI * 0.25, x: 0.3, y: 0.7, to: [0.8, 0.95], sc: 2.2, smear: 5, smearCol: '#808080' }] }), { ...G, cam: { r: [0.15, 0.1] }, sfx: [[0, 'dodge', 1]] }),
      nameCut(1.3, 'THE UMBRAL', 'WHO WALKS BEHIND', sc({ bg: { kind: 'glow', col: '#ffffff', base: '#000', at: [0.5, 0.8] }, sil: INK, actors: [{ who: 'umbral', clip: 'Taunt', fps: 10, ang: FRONT, x: 0.5, y: 1.15, sc: 3.4, eyes: EYE }] }), { ...G, cam: { z: [1.06, 1.0] }, whiteOut: 0.15 }),
    ], { amb: 'night', music: ['c8', 'boss'] });
  }

  // ---- The Hunger: ember. The lights go out one by one; it lunges out of the dark; HUNGER. ---------------
  {
    const EYE = '#ffb060', G = { grade: 'ember', keepRed: true };
    const lights = (n) => cut(0.42, sc({ bg: (ctx, S, k, T) => { waste(ctx, T, n); }, actors: [{ who: V, clip: 'Idle4', fps: 7, ang: BACK, x: 0.5, y: 0.86, sc: 1.4 }],
      over: n === 1 ? (ctx, S, k, T) => say(S, 'card', 'THE ASHEN WASTE', 10, 32, { sub: 'THE THIRD HOUR', k: T + 1 }) : null }), { ...G, lift: 1.7, sfx: [[0.02, 'thud', 0.5 + n * 0.08]] });
    const lunge = { d: 0.45, ...G, sfx: [[0, 'horn', 1], [0.05, 'whoosh', 1]], cam: { z: [1, 1.1] },
      ...sc({ bg: brightGlow([0.5, 0.45], '#fff0c0', '#4a1a08'), sil: INK, speed: { ang: 0, col: 'rgba(255,240,200,0.5)', n: 0 },
        actors: [{ who: 'hunger', clip: 'Attack4', fr: [0, 12], ang: FRONT, x: 0.5, y: 0.9, to: [0.5, 2.2], sc: [2, 10], ease: 'in', eyes: EYE }],
        under: (ctx, S, k, T) => K().speedLines(ctx, W() / 2, H() * 0.45, 90, 'rgba(60,20,5,0.6)', 1401, T, 20) }) };
    F.hunger = E.film([
      card(1.1, 'FIRST THE LIGHTS GO OUT', true), card(1.0, 'THEN IT COMES', false),
      lights(1), E.blink(0.05), lights(3), E.blink(0.05), lights(5), E.blink(0.12),
      word(0.07, 'HUNGRY'), E.blink(0.1), word(0.06, 'HUNGRY'),
      cut(0.8, sc({ bg: { kind: 'flat', col: '#000' }, actors: [{ who: 'hunger', clip: 'Idle4', fps: 6, ang: FRONT, x: 0.5, y: 1.6, sc: 6, shade: '#0a0503', eyes: EYE }] }), { ...G, cam: { z: [1.0, 1.25] }, sfx: [[0.1, 'quake', 0.9], [0.4, 'magic', 0.6]] }),
      cut(0.7, E.face({ who: V, sc: 3.2, cy: 0.36, eyes: '#ff3048', eyesAt: 0.15, ang: PI * 0.25, shade: INK, bg: brightGlow([0.4, 0.4], '#ffd890', '#2a0a04') }), { ...G, cam: { z: [1.0, 1.1] }, line: 'Come on, then.', lineDur: 0.9, lineCol: VCOL, sfx: [[0.1, 'unsheathe_01', 1]] }),
      lunge,
      cut(0.06, E.inv({ bg: '#ff8a3a', fg: '#000', actors: [{ who: 'hunger', clip: 'Attack4', fr: 10, ang: FRONT, x: 0.5, y: 1.6, sc: 6 }], cy: 0.5 }), { bars: false, sfx: [[0, 'smash', 1]] }),
      cut(0.42, sc({ bg: brightPlane(0.5, ['#a04a18', '#ffd890'], ['#c86a28', '#2a0a04']), sil: INK, speed: { ang: 0, col: 'rgba(255,240,200,0.5)', n: 40, v: -1500 },
        actors: [{ who: 'hunger', clip: 'Attack4', fr: 12, ang: RIGHT, x: 1.2, y: 0.55, to: [-0.4, 0.55], sc: 7, ease: 'lin' }, { who: V, clip: 'Rolling', fps: 30, ang: LEFT, x: 0.75, y: 0.98, to: [0.3, 0.98], sc: 2.6, smear: 3, smearCol: '#ff4a5e' }] }),
        { ...G, cam: { r: [0.06, 0.02] }, sfx: [[0, 'dodge', 1]] }),
      cut(0.6, sc({ bg: brightPlane(0.6, ['#a04a18', '#ffd890'], ['#c86a28', '#2a0a04']), sil: INK, actors: [{ who: 'hunger', clip: 'Special1', fr: [6, 14], ang: FRONT, x: 0.55, y: 0.86, sc: 2.8, eyes: EYE }, { who: V, clip: 'TakeDamage', fr: [0, 10], ang: RIGHT, x: 0.3, y: 0.88, to: [0.12, 0.9], arc: 0.12, sc: 1.6, smear: 2, smearCol: '#ff4a5e' }],
        rings: [{ x: 0.55, y: 0.86, t0: 0.1, dur: 0.6, rx: 0.8, ry: 0.1, w: 2 }], debris: [{ x: 0.55, y: 0.86, t0: 0.1, n: 40, col: ['#1a0804', '#ffb060'], v: 1.3, s: 3 }], fx: [{ key: 'explosion_fire', x: 0.55, y: 0.8, sc: 2.4, t0: 0.1 }] }),
        { ...G, shake: 7, shakeOut: true, cam: { z: [1.15, 1.0], ease: 'out' }, sfx: [[0.1, 'blow_big', 1], [0.12, 'quake', 1]] }),
      cut(0.3, sc({ bg: brightGlow([0.5, 0.4], '#ffffff', '#6a2a08'), sil: INK, speed: { ang: -1.2, col: 'rgba(255,255,255,0.7)', n: 50, v: 1800 },
        actors: [{ who: V, clip: 'Attack3', fr: [2, 12], ang: -PI / 4, x: 0.35, y: 1.0, to: [0.45, 0.9], sc: 3, smear: 3, smearCol: '#ffffff', ease: 'snap' }], fx: [{ key: 'hit_crit', x: 0.55, y: 0.45, sc: 2.2, t0: 0.4 }] }),
        { ...G, cam: { z: [1.2, 1.35], r: [-0.1, -0.14] }, sfx: [[0.1, 'slash_2', 1], [0.12, 'blow_2', 1]] }),
      cut(0.05, E.flash('#ffffff'), { bars: false }),
      cut(1.0, sc({ bg: brightGlow([0.5, 0.45], '#fff0c0', '#7a2a08'), sil: INK, actors: [{ who: 'hunger', clip: 'Taunt', fr: [4, 14], ang: FRONT, x: 0.5, y: 1.1, sc: 3.6, eyes: EYE }],
        under: (ctx, S, k, T) => K().speedLines(ctx, W() / 2, H() * 0.45, 70, 'rgba(255,255,255,0.4)', 1403, T, 30) }),
        { ...G, shake: 5, sfx: [[0, 'horn', 1], [0.02, 'quake', 1], [0.05, 'blow_big', 0.8]], text: { kind: 'knock', text: 'HUNGER', at: 0.1, o: { size: 0.9, sx: 0.62, col: '#050202' } } }),
      nameCut(1.2, 'THE HUNGER', 'IT EATS THE LIGHT', sc({ bg: brightGlow([0.5, 0.8], '#ffb060', '#000'), sil: INK, actors: [{ who: 'hunger', clip: 'Idle4', fps: 6, ang: FRONT, x: 0.5, y: 1.2, sc: 3.2, eyes: EYE }],
        mid: (ctx, S, k) => { const g = ctx.createRadialGradient(W() / 2, H() / 2, H() * (0.7 - 0.5 * k), W() / 2, H() / 2, H() * (1.1 - 0.45 * k)); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)'); ctx.fillStyle = g; ctx.fillRect(-W(), -H(), W() * 3, H() * 3); } }),
        { ...G, blackOut: 0.12 }),
    ], { music: ['c12', 'boss'] });
  }

  // ---- The Pale Wing: storm. A vast pale sky and two tiny figures; it dives; she leaps at it. ------------
  {
    const EYE = '#ffffff', G = { grade: 'storm', keepRed: true }, WCOL = '#e0e8ff';
    const sky = brightPlane(0.85, ['#5a6474', '#f4f6fa'], ['#8a94a4', '#2a3038']);
    const leap = { d: 0.6, ...G, cam: { x: [-0.05, 0.08], r: [0.06, 0.12] }, sfx: [[0, 'whoosh', 1], [0.1, 'swish_2', 1]],
      ...sc({ bg: sky, sil: INK, speed: { ang: -0.9, col: 'rgba(255,255,255,0.6)', n: 40, v: 1600 },
        actors: [{ who: 'wing', clip: 'Idle4', fps: 10, ang: LEFT, x: 0.78, y: 0.3, sc: 1.6, eyes: EYE }, { who: V, clip: 'Attack2', fr: [1, 9], ang: -PI / 4, x: 0.15, y: 0.95, to: [0.66, 0.36], sc: 1.2, smear: 5, smearCol: '#ff4a5e' }],
        trails: [{ from: [0.15, 0.9], to: [0.66, 0.32], w: 2, col: '#ff4a5e', t0: 0, t1: 0.9 }] }) };
    F.wing = E.film([
      card(1.0, 'LISTEN TO THE WIND', true), card(1.0, 'IT IS NOT THE WIND', false),
      cut(1.2, sc({ bg: (ctx, S, k, T) => storm(ctx, T), actors: [{ who: V, clip: 'Walk', fps: 9, ang: RIGHT, x: 0.2, y: 0.84, to: [0.34, 0.84], sc: 1.5, ease: 'lin' }],
        over: (ctx, S, k, T) => say(S, 'card', "THE WIND'S THROAT", 10, 32, { sub: 'THE FOURTH HOUR', k: T }) }), { ...G, sfx: [[0.3, 'bolt', 0.6]] }),
      cut(0.9, sc({ bg: sky, sil: INK, actors: [{ who: 'wing', clip: 'Special1', fps: 10, ang: LEFT, x: 1.1, y: 0.25, to: [-0.1, 0.32], sc: 0.9, ease: 'lin' }],
        under: (ctx, S, k, T) => { for (let i = 0; i < 5; i++) A.tex(ctx, 'smoke_07', ((hash(i, 1411) * W() * 1.6 - T * 30) % (W() * 1.6)) - W() * 0.3, H() * (0.45 + i * 0.08), W(), 40, '#ffffff', 0.7, 0, false); } }),
        { ...G, cam: { x: [0.05, -0.05] }, sfx: [[0.1, 'whoosh', 0.8]], line: 'The wind takes everything.', lineDur: 1.4, lineCol: WCOL }),
      cut(0.6, E.face({ who: V, sc: 3.2, cy: 0.36, eyes: '#ff3048', eyesAt: 0.15, ang: PI * 0.25, shade: INK, bg: brightGlow([0.45, 0.35], '#ffffff', '#3a4250'),
        under: (ctx, S, k, T) => rain(ctx, T, 80, 0.5, -0.3) }), { ...G, cam: { z: [1.05, 1.15] }, line: 'Not me.', lineAt: 0.15, lineDur: 0.8, lineCol: VCOL }),
      cut(0.5, sc({ bg: { kind: 'glow', col: '#ffffff', base: '#4a5262' }, sil: INK, actors: [{ who: 'wing', clip: 'Special1', fr: [2, 14], ang: PI * 0.75, x: 0.82, y: 0.15, to: [0.42, 1.0], sc: [0.8, 3.4], smear: 4, smearCol: '#a8b4c8', ease: 'in', eyes: EYE }],
        under: (ctx, S, k, T) => K().speedLines(ctx, W() / 2, H() / 2, 90, 'rgba(255,255,255,0.7)', 1413, T, 20) }), { ...G, sfx: [[0, 'horn', 0.9], [0.2, 'whoosh', 1]] }),
      cut(0.04, E.flash('#ffffff'), { bars: false, sfx: [[0, 'bolt', 1]] }),
      cut(0.06, E.inv({ bg: '#fff', fg: '#000', actors: [{ who: 'wing', clip: 'Special1', fr: 14, ang: FRONT, x: 0.5, y: 1.0, sc: 2.6 }], cy: 0.6 }), { bars: false, sfx: [[0, 'smash', 1], [0.01, 'quake', 1]] }),
      cut(0.6, sc({ bg: brightPlane(0.62, ['#6a7484', '#f4f6fa'], ['#a0a8b4', '#2a3038']), sil: INK, actors: [{ who: 'wing', clip: 'Taunt', fps: 10, ang: FRONT, x: 0.5, y: 0.84, sc: 2.4, eyes: EYE }, { who: V, clip: 'TakeDamage', fr: [0, 12], ang: RIGHT, x: 0.36, y: 0.86, to: [0.06, 0.9], arc: 0.2, sc: 1.4, rot: -4, smear: 3, smearCol: '#ff4a5e' }],
        rings: [{ x: 0.5, y: 0.84, t0: 0, dur: 0.6, rx: 0.8, ry: 0.12, w: 2 }], debris: [{ x: 0.5, y: 0.84, t0: 0, n: 50, col: ['#ffffff', '#c8d0dc'], v: 1.4, s: 2 }] }),
        { ...G, shake: 7, shakeOut: true, sfx: [[0, 'blow_big', 1]] }),
      cut(0.55, sc({ bg: brightPlane(0.66, ['#6a6a70', '#d0d0d4'], ['#9a9aa0', '#2a2a30']), sil: INK, actors: [{ who: V, clip: 'CrouchIdle', fps: 8, ang: RIGHT, x: 0.2, y: 0.88, sc: 1.6 }, { who: 'wing', clip: 'Idle4', fps: 8, ang: LEFT, x: 0.7, y: 0.84, sc: 2.2, eyes: EYE }] }),
        { grade: 'grey', cam: { z: [1.0, 1.06] }, sfx: [[0, 'thud', 0.7]] }),
      leap,
      cut(0.3, E.ring({ x: 0.5, y: 0.5, r: 0.42, inside: '#5a6474', actors: [{ who: 'wing', clip: 'TakeDamage', fr: [2, 12], ang: LEFT, x: 0.5, y: 0.8, sc: 2.4, shade: '#000' }] }), { bars: false, shake: 6, sfx: [[0, 'blow_big', 1], [0.02, 'slash_2', 1]] }),
      E.hold(leap, 0.92, 0.05),
      cut(0.5, sc({ bg: sky, sil: INK, speed: { ang: 0.3, col: 'rgba(255,255,255,0.6)', n: 40, v: 1400 },
        actors: [{ who: 'wing', clip: 'TakeDamage', fr: [4, 12], ang: LEFT, x: 0.6, y: 0.32, to: [0.95, 0.15], sc: 1.6, rot: 2, eyes: EYE }, { who: V, clip: 'Rolling', fps: 30, ang: LEFT, x: 0.5, y: 0.36, to: [0.2, 0.9], sc: 1.2, smear: 3, smearCol: '#ff4a5e' }] }),
        { ...G, cam: { r: [-0.08, -0.04] }, sfx: [[0, 'whoosh', 0.9]] }),
      cut(1.4, sc({ bg: (ctx, S, k, T) => storm(ctx, T, 0.86), sil: INK, actors: [{ who: 'wing', clip: 'Idle4', fps: 8, ang: FRONT, x: 0.5, y: 0.86, sc: 2.4, eyes: EYE }] }),
        { ...G, cam: { z: [1.0, 1.08] }, whiteOut: 0.12, sfx: [[0.05, 'boss', 1]],
          text: [{ kind: 'spaced', text: 'THE PALE WING', y: 0.22, o: { size: 26, col: '#ffffff', glow: '#a8c8ff', dur: 1.2, from: 1.4, to: 0.18 } }, { kind: 'line', at: 0.9, text: 'THROAT OF THE WIND', y: 0.34, o: { size: 14, col: '#e8eeff', spacing: 3 } }] }),
    ], { music: ['c6', 'boss'] });
  }

  // ---- The First Cut: blood and gold. The fallen, one frame each; he rises; "one blade"; the blade falls. --
  {
    const G = { grade: 'blood', keepRed: true };
    const echo = (who, pal, ang) => cut(0.26, E.face({ who, sc: 3.2, cy: 0.36, ang: ang == null ? FRONT : ang, shade: '#000', eyes: '#ffffff', bg: brightGlow([0.5, 0.42], '#ffffff', '#202020') }), { grade: pal, cam: { z: [1.12, 1.0], ease: 'out' }, sfx: [[0, 'blow_1', 0.7]] });
    const gx = 0.46, gy = 0.86;
    F.firstCut = E.film([
      card(0.9, 'SEVEN HUNDRED YEARS', true), card(0.9, 'SIX GUARDIANS', false), card(0.9, 'ONE NIGHT', true), cut(1.1, E.card({ text: 'THE TOP OF THE SPIRE', opts: { size: 19 } }), { bars: false, flat: true, sfx: [[0, 'thud', 0.8], [0.2, 'charge', 0.8]] }),
      cut(1.2, sc({ bg: (ctx, S, k, T) => summit(ctx, T), actors: [{ who: V, clip: 'Walk', fps: 10, ang: BACK, x: 0.5, y: 1.0, to: [0.5, 0.88], sc: 1.6, ease: 'lin' }] }), { ...G, cam: { z: [1.0, 1.1] }, sfx: [[0.2, 'horn', 0.6]] }),
      echo('warden', 'violet'), E.blink(0.03), echo('twinA', 'ice', PI * 0.25), E.blink(0.03), echo('umbral', 'ink'), E.blink(0.03), echo('hunger', 'ember'), E.blink(0.03), echo('wing', 'storm'), E.blink(0.06),
      cut(2.2, { draw(ctx, S, k, T) {
        const g = ctx.createLinearGradient(0, 0, 0, H()); g.addColorStop(0, '#2a2a2a'); g.addColorStop(1, '#f0f0f0'); ctx.fillStyle = g; ctx.fillRect(-W(), -H(), W() * 3, H() * 3);
        const rise = ease(clamp((T - 0.1) / 1.4)), ey = Math.round(H() * (1.3 - 0.95 * rise));
        A.tex(ctx, 'light_01', W() / 2, ey + 30, W() * 1.4, H() * 1.4, '#ffffff', 0.6 * rise, 0, true);
        colossus(ctx, S, Math.round(W() / 2), ey, 6, T, { flat: true, col: '#000' });
        A.actor(ctx, S.cast.vesper, 'Idle4', Math.floor(T * 7) % 15, BACK, Math.round(W() / 2), Math.round(H() * 0.98), 1.6, { shade: '#000' });
      }, post(ctx, S, k, T) {
        const rise = ease(clamp((T - 0.1) / 1.4)), ey = Math.round(H() * (1.3 - 0.95 * rise));
        burningEyes(ctx, Math.round(W() / 2), ey, 6, ease(clamp((T - 1.3) / 0.25)), T);
        if (T > 0.3) say(S, 'track', null, W() / 2, H() * 0.98 - 14, { w: 12, h: 24, k: T - 0.3, col: '#ffe0e6' });
        if (T > 1.35) { say(S, 'track', null, W() / 2, ey, { w: 34, h: 12, k: T - 1.35, col: '#ffffff', sub: 'TARGET' }); say(S, 'link', null, W() / 2, H() * 0.98 - 26, { x2: W() / 2, y2: ey + 9, k: (T - 1.45) * 4, col: 'rgba(255,224,230,0.8)', label: 'ALT ' + Math.round(430 * rise) }); }
      } }, { ...G, cam: { z: [1.0, 1.06] }, shake: 1.5, sfx: [[0.1, 'quake', 0.9], [0.8, 'quake', 1], [1.3, 'boss', 1], [1.32, 'blow_big', 1]], line: 'Seven hundred years... and they send one blade.', lineAt: 0.4, lineDur: 2.2, lineCol: '#ffd0d8' }),
      cut(0.8, E.eyes({ at: 0.35, sc: 4.2 }), { bars: false, cam: { z: [1.0, 1.14] }, sfx: [[0.3, 'clang_0', 0.6]], line: 'One is enough.', lineAt: 0.25, lineDur: 1.0, lineCol: VCOL }),
      cut(0.5, { draw(ctx, S, k, T) {
        const g = ctx.createLinearGradient(0, 0, 0, H()); g.addColorStop(0, '#3a3a3a'); g.addColorStop(1, '#e8e8e8'); ctx.fillStyle = g; ctx.fillRect(-W(), -H(), W() * 3, H() * 3);
        const f = EZ_IN(k), X = gx * W(), Y = gy * H(), fx = W() * 1.25, fy = -H() * 0.6;
        ctx.fillStyle = '#000'; ctx.fillRect(-W(), Y, W() * 3, H());
        bigBlade(ctx, fx, fy, fx + (X + 4 - fx) * f, fy + (Y - 30 - fy) * f, 26, '#000');
        A.actor(ctx, S.cast.vesper, 'Idle4', Math.floor(T * 10) % 15, -PI * 0.25, Math.round(X), Math.round(Y), 1.7, { shade: '#000' });
        K().speedLines(ctx, X, Y - 30, 60, 'rgba(255,255,255,0.6)', 1421, T, 30);
      } }, { ...G, sfx: [[0, 'whoosh', 1]] }),
      cut(0.04, E.flash('#ffffff'), { bars: false, sfx: [[0, 'clang_1', 1], [0.01, 'blow_big', 1], [0.02, 'smash', 1]] }),
      cut(0.06, { draw(ctx, S) { fill(ctx, '#000'); K0.burst(ctx, gx * W() + 4, gy * H() - 30, '#fff', 100, 1423, 10); bigBlade(ctx, W() * 1.25, -H() * 0.6, gx * W() + 4, gy * H() - 30, 26, '#fff'); A.actor(ctx, S.cast.vesper, 'Special1', 8, -PI * 0.25, Math.round(gx * W()), Math.round(gy * H()), 1.7, { shade: '#fff' }); } }, { bars: false }),
      cut(0.04, E.flash(RED), { bars: false }),
      cut(1.4, { draw(ctx, S, k, T) {
        fill(ctx, RED); ctx.fillStyle = '#000'; ctx.fillRect(-W(), gy * H(), W() * 3, H());
        const push = Math.round(Math.sin(T * 50) * 1.5);
        bigBlade(ctx, W() * 1.25, -H() * 0.6, gx * W() + 4 + push, gy * H() - 30, 26, '#000');
        A.actor(ctx, S.cast.vesper, 'Special1', 8, -PI * 0.25, Math.round(gx * W()) + push, Math.round(gy * H()), 1.7, { shade: '#000' });
        K0.sparks(ctx, gx * W() + 4, gy * H() - 30, T, 90, 1425, 5.5);
      } }, { bars: false, shake: 2, whiteOut: 0.2, sfx: [[0.1, 'quake', 1]], text: { kind: 'punch', text: 'THIS ENDS TONIGHT', at: 0.15, y: 0.24, o: { size: 30 } } }),
    ], { music: ['c4', 'boss', 0.5] });
  }

  // Which film opens which guardian's fight.
  VS.FILM_FOR = { 'a0-b': 'warden', 'a1-b': 'twins', 'a2-b': 'umbral', 'a3-b': 'hunger', 'a4-b': 'wing', 'a5-b': 'firstCut' };
})();
