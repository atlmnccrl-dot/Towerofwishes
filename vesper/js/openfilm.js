// THE BLEEDING MOON — the opening (rebuilt again 2026-11-12, the author: "I like the idea and directions but so much of
// the cutscene feels rushed and cheap instead of epic, clean, clear, cinematic"). The same story in the same panel style,
// shot like a film: ten shots of four to six seconds, each fading in from black; slow camera moves (push-ins, tilts,
// pans); layered landscapes with mist; the cast at whole-number scales so the pixels stay crisp; one caption at a time in
// the letterbox; the kings' deaths in one continuous shot instead of a flurry of cuts. Then the title.
//   1. The Spire under the white Moon, its five kingdoms lighting up.      6. The red Moon; the dead rise across the land.
//   2. The five kings on their terrace: the Moon's peace.                   7. A slow pan along the five guardians, chained.
//   3. A swordsman climbs toward us.                                        8. Seven hundred years on: the Moon bleeds out.
//   4. One take: he cuts down every king and takes their souls.             9. Vesper, the last knight.
//   5. From behind him: the souls into his blade; the cut; the Moon reddens. 10. The summit: "Kneel."   Then the title.
(function () {
  const VS = window.VS, D = VS.DATA, A = VS.A, I = VS.INTRO, K0 = I.kit, E = VS.EDIT;
  const { RED, W, H, hash, clamp, fill } = K0, SH = K0.SH;
  const PI = Math.PI, RIGHT = 0, LEFT = PI, FRONT = PI / 2, BACK = -PI / 2;
  const V = 'vesper', FC = 'firstCutFinal', INK = '#050407';
  const sc = E.scene, cut = (d, tpl, o) => Object.assign({ d }, tpl, o || {});
  const KING = (i) => VS.STORY.KINGS[i].set;
  const FADE = { blackIn: 0.7, blackOut: 0.08 };   // every shot fades up from black and dips out
  const mix = (a, b, t) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const x = p(a), y = p(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };

  // ---- the land: sky, moon, ridges, the Spire, mist ------------------------------------------------------------------
  // o: { red 0..1, moon: [x, y, r] (fractions), wound, spire: x (fraction) or null, lights: 0..5, pan: px, ground: y fraction }
  function land(ctx, T, o) {
    const red = o.red || 0, pan = o.pan || 0;
    const g = ctx.createLinearGradient(0, 0, 0, H());
    g.addColorStop(0, mix('#02040a', '#0a0104', red)); g.addColorStop(0.6, mix('#0c1424', '#3a0610', red)); g.addColorStop(1, mix('#1c2840', '#6a1020', red));
    ctx.fillStyle = g; ctx.fillRect(-W(), -H(), W() * 3, H() * 3);
    for (let i = 0; i < 70; i++) { ctx.fillStyle = `rgba(240,240,255,${(0.2 + hash(i, 501) * 0.6) * (1 - red * 0.5)})`; ctx.fillRect(Math.round(hash(i, 502) * W() - pan * 0.05), Math.round(hash(i, 503) * H() * 0.6), 1, 1); }
    if (o.moon) {
      const [mx, my, mr] = o.moon, col = mix('#f4f2f8', '#ff3a52', red);
      A.tex(ctx, 'light_01', mx * W(), my * H(), W() * 1.1, H() * 1.2, mix('#3a4870', '#8a1430', red), 0.45, 0, true);
      moonDisc(ctx, mx * W(), my * H(), mr * H(), col, red, o.wound || 0, T);
    }
    const ridge = (y0, col, seed, amp, par) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-W(), H() * 2); for (let x = -W(); x <= W() * 2; x += 5) { const xx = x + pan * par; ctx.lineTo(x, y0 - hash(Math.floor(xx / 5), seed) * amp * 0.4 - (Math.sin(xx * 0.013 + seed) * 0.5 + 0.5) * amp); } ctx.lineTo(W() * 2, H() * 2); ctx.fill(); };
    ridge(H() * 0.72, mix('#121c30', '#2a0610', red), 11, 22, 0.15);
    if (o.spire != null) {
      const sx = Math.round(o.spire * W() - pan * 0.2), base = Math.round(H() * 0.74), top = Math.round(H() * 0.12);
      ctx.fillStyle = mix('#0a1020', '#1a040c', red); ctx.beginPath(); ctx.moveTo(sx - 12, base); ctx.lineTo(sx - 1, top + 6); ctx.lineTo(sx, top); ctx.lineTo(sx + 1, top + 6); ctx.lineTo(sx + 12, base); ctx.fill();
      for (let i = 0; i < 5; i++) { if (i >= (o.lights == null ? 5 : o.lights)) break; const f = (i + 0.5) / 5.4, y = Math.round(base - (base - top) * f * 0.92), x = Math.round(sx + (i % 2 ? 1 : -1) * 12 * (1 - f * 0.9) * 0.45);
        A.tex(ctx, 'light_01', x, y, 9, 9, red > 0.5 ? '#ff8a6a' : '#ffc070', 0.7, 0, true); ctx.fillStyle = '#ffe6b0'; ctx.fillRect(x, y, 1, 1); }
    }
    for (let i = 0; i < 4; i++) A.tex(ctx, i % 2 ? 'smoke_07' : 'smoke_04', ((hash(i, 511) * W() * 1.6 + T * (4 + i * 2) - pan * 0.5) % (W() * 1.6) + W() * 1.6) % (W() * 1.6) - W() * 0.3, H() * (0.7 + (i % 2) * 0.05), W() * 0.9, 26, mix('#2a3450', '#4a0a18', red), 0.45, 0, false);
    ridge(H() * (o.ground || 0.86), mix('#060a12', '#100206', red), 23, 8, 0.6);
  }
  // The Moon: a smooth disc (the pixel moon's banding read as cheap), soft light from the upper left, faint maria, a
  // bright limb; once cut, a thin glowing seam with drops of red light falling from it.
  function moonDisc(ctx, x, y, r, col, red, wound, T) {
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, mix(col, '#ffffff', 0.35)); g.addColorStop(0.75, col); g.addColorStop(1, mix(col, '#000000', 0.22));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, PI * 2); ctx.fill();
    ctx.fillStyle = mix(col, '#000000', 0.12); ctx.globalAlpha = 0.35;
    for (let i = 0; i < 5; i++) { const a = hash(i, 541) * PI * 2, d = (0.15 + hash(i, 542) * 0.5) * r; ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.08 + hash(i, 543) * 0.12), 0, PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
    if (wound > 0) {
      const x0 = x - r * 0.92, y0 = y + r * 0.32, x1 = x0 + r * 1.84 * wound, y1 = y0 - r * 0.64 * wound, ang = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0);
      A.tex(ctx, 'light_01', (x0 + x1) / 2, (y0 + y1) / 2, L * 1.25, r * 0.25, '#ff8a9a', 0.55, ang, true);
      ctx.save(); ctx.translate(x0, y0); ctx.rotate(ang); ctx.fillStyle = '#5a0012'; ctx.fillRect(0, -1, L, 2); ctx.fillStyle = '#ffe6ea'; ctx.fillRect(1, 0, Math.max(0, L - 2), 1); ctx.restore();
      for (let i = 0; i < 18; i++) { const u = hash(i, 551) * wound, sx = x0 + r * 1.84 * u, sy = y0 - r * 0.64 * u, f = (T * (14 + hash(i, 552) * 18) + hash(i, 553) * 60) % 60;
        ctx.fillStyle = i % 4 ? 'rgba(255,60,80,0.85)' : 'rgba(255,200,210,0.9)'; ctx.globalAlpha = 1 - f / 60; ctx.fillRect(Math.round(sx), Math.round(sy + f), 1, 2); }
      ctx.globalAlpha = 1;
    }
  }
  // A soul: a small white flame of light with a bright core.
  function soul(ctx, x, y, s, a) {
    A.tex(ctx, 'light_01', x, y, 20 * s, 20 * s, '#dfe8ff', 0.6 * (a == null ? 1 : a), 0, true);
    ctx.fillStyle = `rgba(255,255,255,${a == null ? 1 : a})`; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  const terrace = (ctx, y) => { ctx.fillStyle = '#05070c'; ctx.fillRect(-W(), Math.round(y), W() * 3, H()); ctx.fillStyle = '#1a2234'; ctx.fillRect(-W(), Math.round(y), W() * 3, 1); };

  // ---- 1. the Spire under the white Moon --------------------------------------------------------------------------------
  const s1 = cut(4.6, sc({ bg: (ctx, S, k, T) => land(ctx, T, { moon: [0.62, 0.3, 0.2], spire: 0.42, lights: Math.floor(k * 7) }) }),
    { ...FADE, blackIn: 1.2, name: 'spire', cam: { z: [1.14, 1.0], y: [0.06, 0], ease: 'out' }, line: 'Five kingdoms stood on the Spire, beneath the white Moon.', lineAt: 0.8, lineDur: 3.6, sfx: [[0.2, 'charge', 0.2]] });

  // ---- 2. the five kings ------------------------------------------------------------------------------------------------
  const KX = [0.27, 0.385, 0.5, 0.615, 0.73], KY = 0.8;
  const s2 = cut(4.0, sc({ bg: (ctx, S, k, T) => { land(ctx, T, { moon: [0.5, 0.42, 0.3], ground: 0.9 }); terrace(ctx, H() * KY); }, sil: INK,
    actors: KX.map((x, i) => ({ who: KING(i), clip: 'Idle', fps: 5, ph: i * 3, ang: FRONT, x, y: KY + 0.005, sc: 1 })) }),
    { ...FADE, cam: { z: [1.0, 1.1], at: [0.5, 0.62] }, line: 'The Moon kept the dead asleep, and five kings kept her peace.', lineAt: 0.5, lineDur: 3.4, sfx: [[0.1, 'clang_1', 0.25]] });

  // ---- 3. a swordsman climbs toward us ---------------------------------------------------------------------------------
  const s3 = cut(3.8, sc({ bg: (ctx, S, k, T) => { land(ctx, T, { moon: [0.5, 0.36, 0.24], ground: 0.9 }); }, sil: INK,
    actors: [{ who: FC, clip: 'Walk', fps: 8, ang: FRONT, x: 0.5, y: 0.78, to: [0.5, 0.98], sc: [1, 2], ease: 'lin' }] }),
    { ...FADE, cam: { z: [1.0, 1.04] }, line: 'Then a swordsman came up the mountain.', lineAt: 0.5, lineDur: 3.0, sfx: [[0.6, 'step_1', 0.5], [1.5, 'step_2', 0.55], [2.4, 'step_1', 0.6], [3.2, 'unsheathe_01', 0.7]] });

  // ---- 4. one take: every king falls ------------------------------------------------------------------------------------
  const W0 = 0.16, WS = 0.13;   // his first strike starts at W0; one king every WS of the shot
  const hitAt = (i) => W0 + i * WS + WS * 0.55;
  const fcRuns = [{ who: FC, clip: 'Run', fps: 14, ang: RIGHT, x: 0.06, y: KY, to: [KX[0] - 0.06, KY], sc: 1, t0: 0.02, t1: W0, ease: 'lin', show: [0, W0] }];
  ['Attack1', 'Attack4', 'Attack3', 'Attack2', 'Attack6'].forEach((clip, i) => {
    const a = W0 + i * WS, b = a + WS, from = i ? KX[i - 1] - 0.03 : KX[0] - 0.06;
    fcRuns.push({ who: FC, clip, fr: [0, 14], ang: RIGHT, x: from, y: KY, to: [KX[i] - 0.03, KY], sc: 1, t0: a, t1: b, show: [a, b], smear: 2, smearCol: '#ff3048' });
  });
  fcRuns.push({ who: FC, clip: 'C_Stand', fps: 7, ang: FRONT, x: KX[4] + 0.08, y: KY, sc: 1, show: [W0 + 5 * WS, 1] });
  const kings4 = KX.flatMap((x, i) => [{ who: KING(i), clip: 'Idle', fps: 5, ph: i * 3, ang: LEFT, x, y: KY, sc: 1, show: [0, hitAt(i)] },
    { who: KING(i), clip: 'Die', fr: [0, 14], ang: LEFT, x, y: KY, sc: 1, t0: hitAt(i), t1: hitAt(i) + 0.14, show: [hitAt(i), 1] }]);
  const s4 = cut(6.2, sc({ bg: (ctx, S, k, T) => { land(ctx, T, { moon: [0.5, 0.42, 0.3], ground: 0.9, red: clamp((k - 0.2) * 0.25) }); terrace(ctx, H() * KY); }, sil: INK,
    actors: kings4.concat(fcRuns),
    trails: KX.map((x, i) => ({ from: [x - 0.06, KY - 0.2], to: [x + 0.06, KY - 0.08], w: 2, col: '#ffffff', t0: hitAt(i) - 0.01, t1: hitAt(i) + 0.03, fade: 0.5 })),
    over: (ctx, S, k, T) => {   // each king's soul leaves him and drifts to the swordsman; at the end the five circle him
      const end = W0 + 5 * WS, hx = (KX[4] + 0.08) * W(), hy = (KY - 0.12) * H();
      for (let i = 0; i < 5; i++) {
        const t = k - hitAt(i) - 0.05; if (t < 0) continue;
        const sx = KX[i] * W(), sy = (KY - 0.1) * H();
        if (k < end + 0.04) { const u = clamp(t / 0.3); soul(ctx, sx + (hx - sx) * u * u, sy - Math.sin(u * PI) * H() * 0.12 + (hy - sy) * u, 1.2, 1); }
        else { const a = T * 1.4 + i / 5 * PI * 2; soul(ctx, hx + Math.cos(a) * 16, hy + Math.sin(a) * 6, 1.1, 0.95); }
      }
    } }),
    { ...FADE, cam: { z: [1.06, 1.0], at: [0.5, 0.66] }, line: 'He cut down every king, and took their souls.', lineAt: 0.4, lineDur: 5.4,
      sfx: [[0.3, 'step_1', 0.5], ...KX.flatMap((x, i) => [[hitAt(i) * 6.2 - 0.04, 'slash_2', 0.9], [hitAt(i) * 6.2, 'blow_1', 0.7], [hitAt(i) * 6.2 + 0.4, 'soul', 0.45]])] });

  // ---- 5. the First Cut: from behind him, his blade to the Moon -------------------------------------------------------------
  const CUT_K = 0.62;
  const s5 = cut(5.4, sc({ bg: (ctx, S, k, T) => {
      const red = clamp((k - CUT_K - 0.04) / 0.3);
      land(ctx, T, { moon: [0.5, 0.34, 0.28], red, wound: k > CUT_K ? Math.min(1, (k - CUT_K) / 0.06) : 0, ground: 0.95 });
      ctx.fillStyle = '#030204'; ctx.beginPath(); ctx.moveTo(W() * 0.28, H() + 8); ctx.lineTo(W() * 0.42, H() * 0.86); ctx.lineTo(W() * 0.58, H() * 0.86); ctx.lineTo(W() * 0.72, H() + 8); ctx.fill();   // the summit's peak
    },
    actors: [{ who: FC, clip: 'C_Raise', fr: [0, 14], ang: BACK, x: 0.5, y: 0.88, sc: 2, shade: INK, t1: 0.45 }],
    trails: [{ from: [0.22, 0.52], to: [0.78, 0.16], w: 3, col: '#ffffff', t0: CUT_K - 0.02, t1: CUT_K + 0.03, fade: 0.9 }],
    over: (ctx, S, k) => {
      const tipX = W() * 0.5, tipY = H() * 0.42;
      for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2 + k * 9, r = (1 - clamp(k / CUT_K)) * W() * 0.28; if (k < CUT_K) soul(ctx, tipX + Math.cos(a) * r, tipY + Math.sin(a) * r * 0.4, 1.3, 1); }
      if (k > 0.3 && k < CUT_K + 0.02) A.tex(ctx, 'light_01', tipX, tipY, 30 + 90 * (k - 0.3), 30 + 90 * (k - 0.3), '#ffffff', 0.8 * (k - 0.3) / (CUT_K - 0.3), 0, true);
    } }),
    { ...FADE, cam: { z: [1.0, 1.08], at: [0.5, 0.5] }, flashAt: [CUT_K], line: 'With their souls, he cut the Moon.', lineAt: 0.6, lineDur: 4.4,
      sfx: [[0.2, 'charge', 0.9], [0.6, 'soul', 0.5], [CUT_K * 5.4 - 0.05, 'god_blade', 1], [CUT_K * 5.4, 'blow_big', 0.8], [CUT_K * 5.4 + 0.1, 'quake', 0.8]] });

  // ---- 6. the red Moon; the dead rise ----------------------------------------------------------------------------------------
  const DEAD = Array.from({ length: 11 }, (_, i) => ({ x: 0.06 + i * 0.088 + (hash(i, 601) - 0.5) * 0.03, y: 0.86 + (i % 3) * 0.035, t: 0.1 + hash(i, 602) * 0.45 }));
  const s6 = cut(4.6, sc({ bg: (ctx, S, k, T) => land(ctx, T, { moon: [0.5, 0.32, 0.22], red: 1, wound: 1, ground: 0.84 }), sil: '#0a0204',
    actors: DEAD.map((d, i) => ({ who: 'dead:' + i, clip: 'Walk', fps: 7, ph: i * 2, ang: FRONT, x: d.x, y: d.y + 0.14, to: [d.x, d.y], sc: 1, t0: d.t, t1: d.t + 0.3, ease: 'out' })),
    over: (ctx) => { ctx.fillStyle = '#080103'; ctx.fillRect(-W(), Math.round(H() * 0.93), W() * 3, H()); } }),
    { ...FADE, cam: { z: [1.08, 1.0], x: [-0.03, 0.03] }, line: 'Her light turned red, and the dead awoke.', lineAt: 0.5, lineDur: 3.8, sfx: [[0.3, 'reinforce', 0.6], [2.2, 'horn', 0.45]] });

  // ---- 7. the guardians: a slow pan along them, each holding a king -------------------------------------------------------
  const GUARDS = [['warden', '#9a8cff'], ['twinA', '#a8d8ff', 'twinB'], ['umbral', '#c070ff'], ['hunger', '#ff6a5a'], ['wing', '#e8f0ff']];
  const GX = [0.05, 0.3, 0.55, 0.8, 1.05], GY = 0.82;
  const s7 = cut(5.4, sc({ bg: (ctx, S, k, T) => { land(ctx, T, { moon: [0.5, 0.3, 0.18], red: 1, wound: 1, pan: (k - 0.5) * W() * 0.4, ground: 0.92 }); terrace(ctx, H() * GY);
      GUARDS.forEach(([w, col], i) => { const x = GX[i] * W(); A.tex(ctx, 'light_01', x, H() * (GY - 0.12), 70, 80, col, 0.45, 0, true);
        ctx.strokeStyle = 'rgba(160,140,150,0.6)'; ctx.lineWidth = 1; for (const dx of [-14, 14]) { ctx.beginPath(); ctx.moveTo(x + dx * 2.5, 0); ctx.lineTo(x + dx * 0.5, H() * (GY - 0.16)); ctx.stroke(); } }); },
    sil: INK,
    actors: GUARDS.flatMap(([w, col, also], i) => (also ? [{ who: w, clip: 'Idle4', fps: 6, ang: FRONT, x: GX[i] - 0.035, y: GY, sc: 1 }, { who: also, clip: 'Idle4', fps: 6, ang: FRONT, x: GX[i] + 0.035, y: GY, sc: 1 }]
      : [{ who: w, clip: 'Idle4', fps: 6, ang: FRONT, x: GX[i], y: GY, sc: (D.FOES[w].scale || 1) > 1.2 ? 1 : 1 }])),
    over: (ctx, S, k, T) => GUARDS.forEach((g, i) => soul(ctx, GX[i] * W(), H() * (GY - 0.14) + Math.sin(T * 2 + i) * 2, 0.9, 0.7)) }),
    { ...FADE, cam: { x: [-0.1, 0.1], z: [1.1, 1.1], ease: 'io' }, line: 'He bound each king inside a guardian, to bar the way up.', lineAt: 0.4, lineDur: 4.6, sfx: [[0.2, 'clang_0', 0.35], [2.6, 'clang_0', 0.3]] });

  // ---- 8. seven hundred years on --------------------------------------------------------------------------------------------
  const s8 = cut(4.2, sc({ bg: (ctx, S, k, T) => land(ctx, T, { moon: [0.5, 0.48, 0.4], red: 1, wound: 1, ground: 0.98 }) }),
    { ...FADE, cam: { z: [1.0, 1.12] }, text: [{ kind: 'big', text: 'THE LAST NIGHT', y: 0.5, at: 0.6, o: { size: 30 } }],
      line: 'Seven hundred years later, the Moon is bleeding out.', lineAt: 0.8, lineDur: 3.2, sfx: [[0.3, 'heartbeat', 0.8], [1.4, 'heartbeat', 0.8], [2.5, 'heartbeat', 0.8]] });

  // ---- 9. Vesper ------------------------------------------------------------------------------------------------------------
  const s9 = cut(4.2, E.eyes({ at: 0.35, over: (ctx, S, k, T) => { if (T > 1.2) K0.say(S, 'card', 'VESPER', K0.W() - 10, K0.BAR + 16, { align: 'right', sub: "THE MOON'S LAST KNIGHT", col: '#ff9aaa', k: T - 1.2 }); } }),
    { ...FADE, bars: false, line: 'One knight still stands.', lineAt: 0.6, lineDur: 3.4, sfx: [[0.3, 'charge', 0.6], [1.2, 'clang_0', 0.5]] });

  // ---- 10. the summit -------------------------------------------------------------------------------------------------------
  const s10 = cut(3.8, sc({ bg: (ctx, S, k, T) => { land(ctx, T, { moon: [0.5, 0.36, 0.3], red: 1, wound: 1, ground: 0.98 });
      const gy = H() * 0.74; ctx.fillStyle = '#050203'; ctx.beginPath(); ctx.moveTo(W() * 0.5 - 130, H() + 8); ctx.lineTo(W() * 0.5 - 90, gy); ctx.lineTo(W() * 0.5 + 90, gy); ctx.lineTo(W() * 0.5 + 130, H() + 8); ctx.fill(); },
    actors: [{ who: FC, clip: 'C_Stand', fps: 7, ang: FRONT, x: 0.5, y: 0.745, sc: 1, shade: INK }, { who: V, clip: 'Idle4', fps: 6, ang: BACK, x: 0.5, y: 1.02, sc: 2 }] }),
    { ...FADE, cam: { z: [1.0, 1.08], at: [0.5, 0.7] }, line: 'Kneel.', lineAt: 1.4, lineDur: 2.2, lineCol: '#ffd0d8', sfx: [[0.2, 'step_2', 0.5], [1.4, 'charge', 0.5]] });

  // The title (the built shot of js/intro.js): the red moon, her on the rampart, THE BLEEDING MOON.
  const DUR = { title: 6.6 };
  const built = (name) => {
    const sfx = (I.OPEN_SFX || []).filter((x) => x[0] === name).map((x) => [x[1], x[2], x[3]]);
    return { d: DUR[name], name, sfx, draw(ctx, S, k, T) { SH[name](ctx, S, clamp(T / DUR[name]), T); } };
  };

  I.PARTS = { opening: E.film([s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, built('title')], { music: ['spire', 'title'], amb: 'wind', titleShot: 'title' }) };
  I.OPENING = I.PARTS.opening;
})();
