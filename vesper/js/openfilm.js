// THE BLEEDING MOON — the opening (rebuilt 2026-11-11, the author: "the cutscenes [are] shit": they looked like gameplay,
// ran long, the story did not land and the effects looked cheap; the author picked anime-style panels). One film cut like
// the guardians' entrances (js/edit.js): full-frame drawn panels, ink silhouettes on bright fields, impact frames, speed
// lines, colour worlds, a few words at a time. About half a minute, in five beats, then the title:
//   1. The white Moon kept the dead asleep; five kings kept her peace.
//   2. A swordsman climbed the Spire and cut them down, one by one: THE KINGSLAYER, five kings, five souls.
//   3. He spent their souls on one cut and cut the Moon: her light turned red, and the dead woke.
//   4. He chained the kings' souls inside five guardians (the regions' guardians, in the map's order).
//   5. Tonight she bleeds out. Vesper, the Moon's last knight: free the kings. The summit: "Kneel." The title.
// Then the last hour is played (main.js showcase); his First Cut kills her and the Moon raises her (js/bossfilms.js).
(function () {
  const VS = window.VS, D = VS.DATA, A = VS.A, I = VS.INTRO, K0 = I.kit, E = VS.EDIT;
  const { RED, W, H, hash, clamp, fill, say } = K0, SH = K0.SH;
  const PI = Math.PI, RIGHT = 0, LEFT = PI, FRONT = PI / 2, BACK = -PI / 2;
  const V = 'vesper', FC = 'firstCutFinal', INK = '#050407';
  const sc = E.scene, cut = (d, tpl, o) => Object.assign({ d }, tpl, o || {});
  const KING = (i) => VS.STORY.KINGS[i].set;
  const WHITE_MOON = { col: '#f4f2f8', glow: 'rgba(220,230,255,0.35)' };
  const glowBg = (col, base, at) => ({ kind: 'glow', col, base: base || '#000', at: at || [0.5, 0.45], r: 0.8 });
  const BLOOD = { grade: 'blood', keepRed: true };

  // ---- drawn pieces ---------------------------------------------------------------------------------------------
  // A soul: a small white flame of light with a bright core.
  function soul(ctx, x, y, s, a) {
    A.tex(ctx, 'light_01', x, y, 22 * s, 22 * s, '#dfe8ff', 0.55 * (a == null ? 1 : a), 0, true);
    ctx.fillStyle = `rgba(255,255,255,${a == null ? 1 : a})`; ctx.fillRect(Math.round(x - s), Math.round(y - s), Math.max(1, Math.round(2 * s)), Math.max(1, Math.round(2 * s)));
  }
  // n souls circling (cx, cy).
  function orbit(ctx, cx, cy, n, T, rx, ry) { for (let i = 0; i < n; i++) { const a = T * 1.6 + i / n * PI * 2; soul(ctx, cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 1.2, 0.9); } }
  // Chains: two lines of links from the frame's upper corners to (x, y).
  function chains(ctx, x, y, k) {
    ctx.fillStyle = '#8a7a80';
    for (const [sx, sy] of [[-W() * 0.05, -H() * 0.05], [W() * 1.05, -H() * 0.05]]) {
      const n = 22, m = Math.min(1, k * 2.5);
      for (let i = 0; i < n * m; i++) { const u = i / n, px = sx + (x - sx) * u, py = sy + (y - sy) * u + Math.sin(u * PI) * H() * 0.06; ctx.fillRect(Math.round(px) - 1, Math.round(py) - 1, i % 2 ? 2 : 3, i % 2 ? 3 : 2); }
    }
  }
  const stars = (ctx, n, seed) => { for (let i = 0; i < n; i++) { ctx.fillStyle = `rgba(240,240,255,${0.25 + hash(i, seed + 1) * 0.6})`; ctx.fillRect(Math.round(hash(i, seed) * W()), Math.round(hash(i, seed + 2) * H() * 0.7), 1, 1); } };
  const ridge = (ctx, y0, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-8, H() + 8); for (let x = -8; x <= W() + 8; x += 10) ctx.lineTo(x, y0 - hash(x, 401) * 6); ctx.lineTo(W() + 8, H() + 8); ctx.fill(); };

  // ---- 1. the white Moon and the five kings ---------------------------------------------------------------------
  const moonCut = cut(2.4, sc({ bg: { kind: 'grad', cols: ['#020308', '#0a1020', '#1c2638'] }, moon: Object.assign({ x: 0.5, y: 0.42, r: 0.3 }, WHITE_MOON),
    under: (ctx) => stars(ctx, 50, 11), over: (ctx) => ridge(ctx, H() * 0.94, '#03040a') }),
    { name: 'moon', cam: { z: [1.0, 1.08] }, text: [{ kind: 'spaced', text: 'THE MOON KEPT THE DEAD ASLEEP', y: 0.84, at: 0.3, o: { size: 12, col: '#e8eeff' } }], sfx: [[0.1, 'charge', 0.25]] });
  const kingsCut = cut(2.3, sc({ bg: glowBg('#dfe6ff', '#141a28', [0.5, 0.4]), moon: Object.assign({ x: 0.5, y: 0.34, r: 0.24 }, WHITE_MOON), sil: INK,
    actors: [0, 1, 2, 3, 4].map((i) => ({ who: KING(i), clip: 'Idle4', fps: 6, ang: FRONT, x: 0.16 + i * 0.17, y: 0.94, sc: i === 2 ? 1.7 : 1.45 })), over: (ctx) => ridge(ctx, H() * 0.95, INK) }),
    { cam: { z: [1.08, 1.0] }, text: [{ kind: 'spaced', text: 'FIVE KINGS KEPT HER PEACE', y: 0.14, at: 0.2, o: { size: 12, col: '#ffffff' } }], sfx: [[0.05, 'clang_1', 0.3]] });

  // ---- 2. the Kingslayer --------------------------------------------------------------------------------------------
  const cameCut = cut(1.5, sc({ bg: glowBg('#ff6a7a', '#1a0206', [0.55, 0.6]), moon: Object.assign({ x: 0.8, y: 0.2, r: 0.1 }, WHITE_MOON), sil: INK,
    actors: [{ who: FC, clip: 'Walk', fps: 9, ang: RIGHT, x: 0.08, y: 0.95, to: [0.4, 0.95], sc: 2.7, ease: 'lin' }], over: (ctx) => ridge(ctx, H() * 0.97, INK) }),
    { cam: { z: [1.0, 1.05] }, line: 'Then a swordsman climbed the Spire.', lineAt: 0.1, lineDur: 1.4, sfx: [[0.2, 'step_1', 0.7], [0.75, 'step_2', 0.7], [1.2, 'unsheathe_01', 0.8]] });
  // One king's death in three cuts: the strike (his blade through, the king struck), the impact frame, the fall with the
  // soul rising out of the body.
  const kill = (i, atk, num, fxKey) => [
    cut(0.38, sc({ bg: glowBg('#ffffff', '#7a7480', [0.55, 0.5]), sil: INK, speed: { ang: 0.15, col: 'rgba(255,255,255,0.7)', n: 50, v: 1500 },
      actors: [{ who: FC, clip: atk, fr: [2, 12], ang: RIGHT, x: 0.12, y: 0.99, to: [0.44, 0.99], sc: 3, smear: 4, smearCol: '#ff3048', ease: 'snap', t1: 0.5 },
        { who: KING(i), clip: 'TakeDamage', fr: [0, 6], ang: LEFT, x: 0.68, y: 0.99, sc: 3, t0: 0.45 }],
      fx: [{ key: fxKey || 'katana', x: 0.6, y: 0.56, sc: 2.2, t0: 0.45 }] }),
      { cam: { z: [1.15, 1.32], ease: 'out' }, text: [{ kind: 'big', text: num, x: 0.88, y: 0.2, o: { size: 20, col: RED } }], sfx: [[0.12, 'slash_2', 1], [0.15, 'blow_1', 1]] }),
    cut(0.07, E.inv({ bg: RED, fg: '#000', actors: [{ who: KING(i), clip: 'TakeDamage', fr: 6, ang: LEFT, x: 0.5, y: 0.97, sc: 3.4 }] }), { bars: false, flat: true, sfx: [[0, 'blow_big', 0.9]] }),
    cut(0.55, sc({ bg: glowBg('#ff4a62', '#2a040c', [0.5, 0.5]), sil: INK,
      actors: [{ who: KING(i), clip: 'Die', fr: [0, 14], ang: LEFT, x: 0.5, y: 0.92, to: [0.56, 0.92], sc: 2.4, t1: 0.7 }],
      debris: [[0.5, 0.6, 0, 22, '#ff2a44', 1.2]], over: (ctx, S, k) => { if (k > 0.35) soul(ctx, W() * 0.52, H() * (0.62 - (k - 0.35) * 0.6), 1.6, 1); } }),
      { shake: 3, shakeOut: true, sfx: [[0.3, 'soul', 0.6]] }),
  ];
  const twoMore = cut(0.9, sc({ bg: glowBg('#ff3a52', '#0a0204', [0.5, 0.55]), sil: INK,
    actors: [{ who: KING(3), clip: 'Die', fr: [0, 14], ang: RIGHT, x: 0.24, y: 0.95, sc: 2.2, t1: 0.7 }, { who: KING(4), clip: 'Die', fr: [0, 14], ang: LEFT, x: 0.76, y: 0.95, sc: 2.2, t1: 0.7 },
      { who: FC, clip: 'C_Cut', fr: [0, 14], ang: BACK, x: 0.5, y: 1.0, sc: 2.8, t1: 0.5 }],
    trails: [{ from: [0.1, 0.7], to: [0.9, 0.4], w: 3, col: '#ffffff', t0: 0.12, t1: 0.35, fade: 0.8 }, { from: [0.1, 0.4], to: [0.9, 0.72], w: 3, col: '#ffffff', t0: 0.16, t1: 0.4, fade: 0.8 }], over: (ctx, S, k) => { if (k > 0.5) { soul(ctx, W() * 0.24, H() * (0.6 - (k - 0.5) * 0.5), 1.4, 1); soul(ctx, W() * 0.76, H() * (0.6 - (k - 0.5) * 0.5), 1.4, 1); } } }),
    { cam: { z: [1.12, 1.0] }, flashAt: [0.18], text: [{ kind: 'big', text: 'IV  V', x: 0.88, y: 0.2, o: { size: 20, col: RED } }], sfx: [[0.12, 'whoosh', 1], [0.18, 'slash_2', 1], [0.2, 'blow_big', 1]] });
  const nameCut = cut(1.7, sc({ bg: glowBg('#ff3a52', '#0a0204', [0.5, 0.42]), actors: [{ who: FC, clip: 'C_Stand', fps: 8, ang: FRONT, x: 0.5, y: 1.04, sc: 3.4, shade: INK }],
    over: (ctx, S, k, T) => orbit(ctx, W() * 0.5, H() * 0.5, 5, T, W() * 0.2, H() * 0.12) }),
    { cam: { z: [1.12, 1.0], ease: 'out' }, text: [{ kind: 'big', text: 'THE KINGSLAYER', y: 0.2, o: { size: 30 } }, { kind: 'line', at: 0.35, text: 'Five kings. Five souls.', y: 0.33, o: { size: 14, col: '#f0e6ea', spacing: 3, a: 1 } }],
      sfx: [[0, 'horn', 0.7], [0.3, 'soul', 0.6]] });

  // ---- 3. the First Cut --------------------------------------------------------------------------------------------
  const raiseCut = cut(1.6, sc({ bg: { kind: 'grad', cols: ['#020308', '#0c1222', '#1c2436'] }, moon: Object.assign({ x: 0.5, y: 0.3, r: 0.28 }, WHITE_MOON),
    under: (ctx) => stars(ctx, 40, 21), actors: [{ who: FC, clip: 'C_Raise', fr: [0, 14], ang: BACK, x: 0.5, y: 1.06, sc: 3.6, shade: INK, t1: 0.6 }],
    over: (ctx, S, k) => {   // the five souls rising into the blade; the blade filling with light
      const tipX = W() * 0.5, tipY = H() * 0.38;
      for (let i = 0; i < 5; i++) { const u = clamp(k * 1.4 - i * 0.12), sx = W() * (0.15 + i * 0.175), sy = H() * 0.9; if (u > 0 && u < 1) soul(ctx, sx + (tipX - sx) * u, sy + (tipY - sy) * u, 1.3, 1); }
      if (k > 0.6) A.tex(ctx, 'light_01', tipX, tipY, 40 + 80 * (k - 0.6), 40 + 80 * (k - 0.6), '#ffffff', 0.9 * (k - 0.6) / 0.4, 0, true);
    } }),
    { cam: { z: [1.0, 1.12] }, line: 'He spent their souls on one cut.', lineAt: 0.05, lineDur: 1.5, sfx: [[0.1, 'charge', 1], [0.4, 'soul', 0.6]] });
  const slashCut = cut(0.5, sc({ bg: { kind: 'flat', col: '#000' }, moon: Object.assign({ x: 0.5, y: 0.45, r: 0.38 }, WHITE_MOON),
    trails: [{ from: [0.12, 0.66], to: [0.88, 0.2], w: 5, col: '#ffffff', t0: 0, t1: 0.55, fade: 0.9 }] }),
    { bars: false, shake: 5, shakeOut: true, sfx: [[0, 'god_blade', 1], [0.1, 'slash_2', 1]] });
  const bleedCut = cut(2.3, sc({ bg: { kind: 'grad', cols: ['#0a0204', '#3a0610', '#6a1020'] }, moon: { x: 0.5, y: 0.4, r: 0.32, col: '#ff3a52', glow: 'rgba(255,40,70,0.6)', wound: 1 },
    under: (ctx, S, k, T) => { for (let i = 0; i < 9; i++) A.tex(ctx, 'light_01', W() * (0.2 + i * 0.075), H() * (0.55 + (i % 3) * 0.12), 14, H() * 0.8, RED, 0.15, 0, true); },
    over: (ctx) => ridge(ctx, H() * 0.93, '#0a0204') }),
    { cam: { z: [1.0, 1.06] }, text: [{ kind: 'spaced', text: 'HE CUT THE MOON', y: 0.82, at: 0.15, o: { size: 14, col: '#ffe0e6' } }], sfx: [[0, 'quake', 0.9], [0.1, 'blow_big', 0.7]] });
  const deadCut = cut(1.7, sc({ bg: { kind: 'grad', cols: ['#140206', '#4a0a16', '#7a1424'] }, moon: { x: 0.5, y: 0.22, r: 0.14, col: '#ff3a52', glow: 'rgba(255,40,70,0.5)', wound: 1 }, sil: '#120206',
    actors: [0, 1, 2, 3, 4, 5, 6].map((i) => ({ who: 'dead:' + i, clip: 'Walk', fps: 8, ph: i * 2, ang: FRONT, x: 0.08 + i * 0.14, y: 1.14, to: [0.08 + i * 0.14, 0.96 - (i % 2) * 0.04], sc: 1.5, t0: i * 0.06, t1: 0.6 + i * 0.04, ease: 'out' })),
    over: (ctx) => ridge(ctx, H() * 0.97, '#0a0204') }),
    { cam: { z: [1.06, 1.0] }, text: [{ kind: 'spaced', text: 'AND THE DEAD WOKE', y: 0.12, at: 0.2, o: { size: 12, col: '#ffe0e6' } }], sfx: [[0.1, 'reinforce', 0.7], [0.6, 'horn', 0.5]] });

  // ---- 4. the chained kings: each soul bound inside his kingdom's guardian ------------------------------------------------
  const GUARD = [['warden', 'violet', '#c8b8ff', '#24124a'], ['twinA', 'ice', '#a8e8ff', '#0c2440', 'twinB'], ['umbral', 'violet', '#c8b8ff', '#160a2a'], ['hunger', 'ember', '#ffa040', '#3a0a02'], ['wing', 'storm', '#e0e8f4', '#1c2636']];
  const chainCut = ([who, world, col, base, also], i) => cut(0.55, sc({ bg: glowBg(col, base, [0.5, 0.5]), sil: INK,
    actors: also ? [{ who, clip: 'Idle4', fps: 8, ang: FRONT, x: 0.36, y: 1.0, sc: 2.4 }, { who: also, clip: 'Idle4', fps: 8, ang: FRONT, x: 0.64, y: 1.0, sc: 2.4 }] : [{ who, clip: 'Idle4', fps: 8, ang: FRONT, x: 0.5, y: 1.02, sc: (D.FOES[who].scale || 1) > 1.2 ? 2.0 : 2.8 }],
    over: (ctx, S, k) => { chains(ctx, W() * 0.5, H() * 0.55, k); if (k < 0.5) soul(ctx, W() * 0.5, H() * (0.1 + k * 0.9), 1.6, 1); else A.tex(ctx, 'light_01', W() * 0.5, H() * 0.55, 60, 60, '#ffffff', 0.6 * (1 - k), 0, true); } }),
    { grade: world, cam: { z: [1.18, 1.06], ease: 'out' }, flashAt: [0.5], text: [{ kind: 'line', text: VS.STORY.KINGS[i].title, y: 0.12, o: { size: 11, col: '#ffffff', spacing: 2, a: 1 } }],
      sfx: [[0, 'soul', 0.5], [0.27, 'clang_1', 0.8], [0.3, 'blow_1', 0.6]] });
  const chainedRow = cut(1.6, sc({ bg: { kind: 'grad', cols: ['#0a0204', '#3a0610', '#5a0c18'] }, moon: { x: 0.5, y: 0.26, r: 0.18, col: '#ff3a52', glow: 'rgba(255,40,70,0.5)', wound: 1 }, sil: INK,
    actors: [['warden', 0.12, 1.5], ['twinA', 0.3, 1.5], ['umbral', 0.5, 1.6], ['hunger', 0.7, 1.1], ['wing', 0.88, 1.0]].map(([who, x, s]) => ({ who, clip: 'Idle4', fps: 6, ang: FRONT, x, y: 0.95, sc: s })),
    over: (ctx) => ridge(ctx, H() * 0.97, INK) }),
    { cam: { z: [1.0, 1.04] }, line: 'He chained their souls inside five guardians.', lineAt: 0, lineDur: 1.6, sfx: [[0.05, 'clang_0', 0.5]] });

  // ---- 5. tonight; Vesper; the summit -----------------------------------------------------------------------------------
  const tonightCut = cut(2.0, sc({ bg: { kind: 'grad', cols: ['#000000', '#1a0208', '#3a0610'] }, moon: { x: 0.5, y: 0.5, r: 0.48, col: '#ff3a52', glow: 'rgba(255,40,70,0.7)', wound: 1 } }),
    { cam: { z: [1.0, 1.1] }, shake: 1.5, text: [{ kind: 'spaced', text: 'TONIGHT SHE BLEEDS OUT', y: 0.5, at: 0.1, o: { size: 15, col: '#ffffff' } }], line: 'At dawn she dies, and the dead never sleep again.', lineAt: 0.5, lineDur: 1.5,
      sfx: [[0, 'heartbeat', 0.9], [0.9, 'heartbeat', 0.9]] });
  const vesperCut = cut(1.9, E.eyes({ at: 0.45, over: (ctx, S, k, T) => { if (T > 0.8) K0.say(S, 'card', 'VESPER', K0.W() - 10, K0.BAR + 16, { align: 'right', sub: "THE MOON'S LAST KNIGHT", col: '#ff9aaa', k: T - 0.8 }); } }),
    { bars: false, sfx: [[0, 'quake', 0.5], [0.45, 'charge', 0.8], [0.8, 'clang_0', 0.6]] });
  const freeCut = cut(1.2, sc({ bg: glowBg('#ff8a9a', '#1a0206', [0.6, 0.5]), speed: { ang: 0, col: 'rgba(255,255,255,0.6)', n: 40, v: 1400 },
    actors: [{ who: V, clip: 'Run', fps: 16, ang: RIGHT, x: 0.12, y: 0.96, to: [0.64, 0.96], sc: 2.6, smear: 3, smearCol: '#ff3048', ease: 'lin' }] }),
    { cam: { z: [1.06, 1.0] }, text: [{ kind: 'punch', text: 'FREE THE KINGS', y: 0.28, at: 0.15, o: { size: 30 } }], sfx: [[0, 'whoosh', 0.9], [0.2, 'step_1', 0.8], [0.5, 'step_2', 0.8]] });
  const summitCut = cut(1.9, sc({ bg: { kind: 'grad', cols: ['#0c0206', '#3a0812', '#6a1020'] }, moon: { x: 0.5, y: 0.34, r: 0.3, col: '#ff3a52', glow: 'rgba(255,40,70,0.6)', wound: 1 },
    under: (ctx) => { const gy = H() * 0.74; ctx.fillStyle = '#050203'; ctx.beginPath(); ctx.moveTo(W() * 0.5 - 130, H() + 8); ctx.lineTo(W() * 0.5 - 90, gy); ctx.lineTo(W() * 0.5 + 90, gy); ctx.lineTo(W() * 0.5 + 130, H() + 8); ctx.fill(); },
    actors: [{ who: FC, clip: 'C_Stand', fps: 8, ang: FRONT, x: 0.5, y: 0.76, sc: 1.6, shade: INK }, { who: V, clip: 'Idle4', fps: 7, ang: BACK, x: 0.5, y: 1.04, sc: 2.6 }] }),
    { cam: { z: [1.0, 1.08] }, text: [{ kind: 'spaced', text: 'THE LAST HOUR', y: 0.1, o: { size: 11, col: '#ff9aaa' } }], line: 'Kneel.', lineAt: 0.7, lineDur: 1.1, lineCol: '#ffd0d8', sfx: [[0.1, 'step_2', 0.6], [0.7, 'charge', 0.6]] });

  // The title (the built shot of js/intro.js): the red moon, her on the rampart, THE BLEEDING MOON.
  const DUR = { title: 6.6 };
  const built = (name) => {
    const sfx = (I.OPEN_SFX || []).filter((x) => x[0] === name).map((x) => [x[1], x[2], x[3]]);
    return { d: DUR[name], name, sfx, draw(ctx, S, k, T) { SH[name](ctx, S, clamp(T / DUR[name]), T); } };
  };

  const CUTS = [moonCut, kingsCut, cameCut, ...kill(0, 'Attack1', 'I'), ...kill(1, 'Attack4', 'II', 'hit_crit'), ...kill(2, 'Attack3', 'III'), twoMore, nameCut,
    raiseCut, cut(0.06, E.flash('#ffffff'), { bars: false, flat: true }), slashCut, bleedCut, deadCut,
    ...GUARD.map(chainCut), chainedRow, tonightCut, vesperCut, freeCut, summitCut, built('title')];
  I.PARTS = { opening: E.film(CUTS, { music: ['moon', 'title'], amb: 'wind', titleShot: 'title' }) };
  I.OPENING = I.PARTS.opening;
})();
