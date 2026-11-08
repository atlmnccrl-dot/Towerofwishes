// VESPER — the opening: an anime fight told in shots on the pixel buffer, in the style of the moon arts.
// Nothing here is the game's own view: every shot is a built set (a sleeping city, a graveyard, the
// Black Gate under the bleeding moon, a red void) with the cast as actors, silhouettes and close-ups.
//   The moon falls on a sleeping city · the First Cut leaps and cuts it (impact frames) · the wound
//   bleeds and the dead rise · tonight, the horde at the Black Gate · Vesper's boots in the rain, the
//   red eye, the draw · she cuts through the dead · three panels · the Gatewarden crashes down · eyes ·
//   the clash · one cut, he falls · the title over the red moon.
// A tap (or Esc) skips straight to the trial.
(function () {
  const VS = window.VS, D = VS.DATA, A = VS.A, R = VS.R, PX = VS.PX;
  const I = VS.INTRO = {};
  const RED = '#ff2a44', INK = '#050507', BAR = 14;
  const W = () => PX.W, H = () => PX.H;
  const K = () => VS.cine.kit;
  // The shots, in seconds.
  const SHOTS = [
    ['open', 0, 1.6], ['fall', 1.6, 5.0], ['swordsman', 5.0, 6.4], ['leap', 6.4, 7.6], ['cutmoon', 7.6, 8.7], ['scar', 8.7, 10.8],
    ['rise', 10.8, 13.8], ['gate', 13.8, 17.2], ['steps', 17.2, 18.8], ['eye', 18.8, 20.2], ['draw', 20.2, 21.2],
    ['charge', 21.2, 23.8], ['panels', 23.8, 25.2], ['drop', 25.2, 27.4], ['face', 27.4, 28.8], ['clash', 28.8, 30.4],
    ['pass', 30.4, 32.2], ['title', 32.2, 39.4],
  ];
  const END = SHOTS[SHOTS.length - 1][2];
  const LINES = [
    [1.9, 4.8, 'Seven hundred years ago, the moon began to fall.'],
    [5.2, 7.5, 'A swordsman cut it.'],
    [8.9, 10.7, 'It stopped. The wound never closed.'],
    [11.0, 13.6, 'Its red light raises the dead.'],
    [14.0, 15.5, 'Tonight the wound bleeds out.'],
    [15.6, 17.1, 'At dawn, the moon falls for good.'],
    [18.9, 20.1, 'One blade can close it.'],
  ];
  // The charge: when each of the dead reaches her blade (seconds into the shot).
  const CONTACT = [0.3, 0.6, 0.85, 1.1, 1.32, 1.55, 1.78, 2.0];
  // Sounds: [time, name, volume].
  const SFX = [
    [0.5, 'swish_0', 0.4], [1.0, 'thud', 0.6], [1.7, 'quake', 0.5], [3.4, 'quake', 0.7], [5.0, 'unsheathe_01', 0.8], [5.8, 'charge', 0.7],
    [6.4, 'whoosh', 1], [7.6, 'blow_big', 1], [7.6, 'slash_2', 1], [7.65, 'quake', 1], [8.7, 'magic', 0.5], [10.8, 'spawn', 0.7], [11.6, 'reinforce', 0.6],
    [13.8, 'horn', 0.7], [17.3, 'step_0', 0.7], [17.75, 'step_1', 0.7], [18.2, 'step_2', 0.7], [18.8, 'quake', 0.6], [19.2, 'charge', 0.9],
    [20.2, 'unsheathe_01', 1], [20.55, 'slash_0', 1], [20.6, 'whoosh', 1], [23.8, 'slash_2', 0.9], [24.15, 'slash_1', 0.9], [24.5, 'blow_big', 0.8],
    [25.2, 'whoosh', 0.9], [25.65, 'smash', 1], [25.66, 'quake', 1], [25.9, 'landed', 0.8], [27.4, 'windup', 0.8], [28.8, 'dodge', 0.8],
    [29.35, 'clang_1', 1], [29.36, 'blow_big', 1], [29.4, 'quake', 0.9], [30.4, 'swish_2', 1], [31.4, 'slash_2', 1], [31.42, 'ko', 0.9],
    [32.6, 'allout', 1], [32.62, 'clang_0', 0.7], [34.0, 'level_up', 0.4],
  ].concat(CONTACT.map((c, i) => [21.2 + c, i % 2 ? 'slash_1' : 'slash_2', 0.85]));
  const MUSIC_AT = 20.2;

  const cast = () => ({
    vesper: (D.HEROES.vesper || D.HERO).set, first: D.FOES.firstCut.set, warden: D.FOES.warden.set,
    dead: ['vh_townsfolk_001', 'vh_townsfolk_004', 'vh_townsfolk_007', 'vh_townsfolk_010', 'vh_townsfolk_013', 'vh_skeleton_002', 'vh_barbarian_002', D.FOES.ghoul.set, D.FOES.ghast.set, D.FOES.raider.set].filter((id) => A.hasSet(id)),
  });

  I.start = function (then) {
    I.st = { t: 0, then, done: false, shake: 0, music: false, cast: cast() };
    if (!I.st.cast.dead.length) I.st.cast.dead = [D.FOES.ghoul.set];
    VS.audio.playMusic(null); VS.audio.playAmb('wind');
  };
  I.update = function (dt, skip) {
    const S = I.st; if (!S || S.done) return;
    if (skip) { finish(); return; }
    const t0 = S.t; S.t += Math.min(dt, 0.1);
    for (const [at, name, v] of SFX) if (t0 < at && at <= S.t) VS.audio.sfx(name, v);
    if (!S.music && S.t >= MUSIC_AT) { S.music = true; VS.audio.cue('act0'); }
    if (S.t >= END) finish();
  };
  function finish() { const S = I.st; if (!S || S.done) return; S.done = true; R.hideCine(); VS.audio.duck(false); S.then(); }

  // ---- helpers ---------------------------------------------------------------------------------------
  const hash = (a, b) => K().hash(a, b), ease = (k) => K().ease(k);
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const fill = (ctx, col, a) => { ctx.save(); if (a != null) ctx.globalAlpha = Math.max(0, Math.min(1, a)); ctx.fillStyle = col; ctx.fillRect(-8, -8, W() + 16, H() + 16); ctx.restore(); };
  function grad(ctx, stops) { const g = ctx.createLinearGradient(0, 0, 0, H()); stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); ctx.fillStyle = g; ctx.fillRect(-8, -8, W() + 16, H() + 16); }
  function stars(ctx, n, a, seed, T) {
    for (let i = 0; i < n; i++) { const tw = 0.5 + 0.5 * Math.sin((T || 0) * 3 + i); ctx.fillStyle = `rgba(255,236,240,${a * (0.3 + 0.7 * hash(i, seed || 3)) * (0.6 + 0.4 * tw)})`; ctx.fillRect(Math.round(hash(i, 1) * W()), Math.round(hash(i, 2) * H() * 0.75), 1, 1); }
  }
  // A moon with craters; optionally the wound across it (0..1 drawn) and its bleeding (when T is given).
  function moon(ctx, x, y, r, col, glow, wound, T) {
    PX.moon(ctx, x, y, Math.round(r), col, glow);
    ctx.globalAlpha = 0.09; for (let i = 0; i < 6; i++) { const a = hash(i, 11) * 6.28, d = (0.2 + hash(i, 12) * 0.5) * r; PX.disc(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, Math.max(1, Math.round(r * (0.05 + hash(i, 13) * 0.07))), '#000000'); } ctx.globalAlpha = 1;
    if (wound > 0) {
      const x0 = x - r * 0.95, y0 = y + r * 0.34, x1 = x0 + (r * 1.9) * wound, y1 = y0 - r * 0.68 * wound;
      A.tex(ctx, 'light_01', (x0 + x1) / 2, (y0 + y1) / 2, r * 2.6 * wound, r * 0.7, RED, 0.6, -0.34, true);
      ctx.strokeStyle = '#2a0006'; ctx.lineWidth = Math.max(2, r * 0.07); ctx.beginPath(); ctx.moveTo(x0, y0);
      for (let i = 1; i <= 10; i++) { const u = i / 10 * wound; ctx.lineTo(x0 + r * 1.9 * u, y0 - r * 0.68 * u + (hash(i, 14) - 0.5) * r * 0.06); } ctx.stroke();
      ctx.strokeStyle = RED; ctx.lineWidth = 1; ctx.stroke();
      if (T != null) for (let i = 0; i < 26; i++) {   // drops of red light falling from the wound
        const u = hash(i, 15) * wound, sx = x0 + r * 1.9 * u, sy = y0 - r * 0.68 * u, fall = (T * (30 + hash(i, 16) * 40) + hash(i, 17) * 90) % 110;
        ctx.fillStyle = i % 5 ? RED : '#ffb0bc'; ctx.globalAlpha = 1 - fall / 110; ctx.fillRect(Math.round(sx), Math.round(sy + fall), 1, 2 + (i % 3)); ctx.globalAlpha = 1;
      }
    }
  }
  function city(ctx, base, seed, col, lit, scale) {
    const sc = scale || 1; let x = -4;
    ctx.fillStyle = col;
    while (x < W() + 4) {
      const w = Math.round((10 + hash(x | 0, seed) * 18) * sc), h = Math.round((14 + hash(x | 0, seed + 1) * 34) * sc);
      ctx.fillRect(x, base - h, w, h + 40);
      const roof = hash(x | 0, seed + 2);
      if (roof < 0.45) { ctx.beginPath(); ctx.moveTo(x - 1, base - h); ctx.lineTo(x + w / 2, base - h - w * 0.6); ctx.lineTo(x + w + 1, base - h); ctx.fill(); }
      else if (roof < 0.6) { ctx.fillRect(x + w / 2 - 2, base - h - 14 * sc, 4, 14 * sc); ctx.beginPath(); ctx.moveTo(x + w / 2 - 3, base - h - 14 * sc); ctx.lineTo(x + w / 2, base - h - 22 * sc); ctx.lineTo(x + w / 2 + 3, base - h - 14 * sc); ctx.fill(); }
      if (lit) { for (let j = 0; j < 4; j++) if (hash(x + j, seed + 3) < lit) { ctx.fillStyle = '#ffc870'; ctx.fillRect(Math.round(x + 2 + hash(x, j + 9) * (w - 4)), Math.round(base - h + 4 + hash(x, j + 19) * (h - 6)), 1, 1); } ctx.fillStyle = col; }
      x += w - 1;
    }
  }
  function graves(ctx, base, seed, col, n, sc) {
    ctx.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const x = Math.round(hash(i, seed) * W()), h = Math.round((6 + hash(i, seed + 1) * 8) * sc), w = Math.round((4 + hash(i, seed + 2) * 4) * sc);
      if (hash(i, seed + 3) < 0.4) { ctx.fillRect(x - 1, base - h - 3, Math.max(2, sc * 1.4 | 0), h + 3); ctx.fillRect(x - w / 2, base - h + 1, w, Math.max(1, sc | 0)); }
      else { ctx.fillRect(x - w / 2, base - h, w, h); PX.disc(ctx, x, base - h, Math.round(w / 2), col); }
    }
  }
  // The Black Gate: two towers, the wall and battlements, the gate glowing red.
  function gate(ctx, cx, base, s, col, T) {
    const tw = 26 * s, th = 96 * s, gw = 34 * s, gh = 46 * s, wall = 64 * s;
    ctx.fillStyle = col;
    ctx.fillRect(cx - wall - tw, base - wall, wall * 2 + tw * 2, wall + 2);
    for (const sx of [-1, 1]) {
      const x = cx + sx * (gw / 2 + tw * 0.6) - tw / 2;
      ctx.fillRect(x, base - th, tw, th + 2);
      ctx.beginPath(); ctx.moveTo(x - 3 * s, base - th); ctx.lineTo(x + tw / 2, base - th - 30 * s); ctx.lineTo(x + tw + 3 * s, base - th); ctx.fill();
      ctx.fillStyle = `rgba(255,${150 + Math.round(60 * Math.sin(T * 9 + sx))},80,0.9)`; ctx.fillRect(Math.round(x + tw / 2 - 1), Math.round(base - th * 0.62), 2, Math.max(1, Math.round(3 * s))); ctx.fillStyle = col;
    }
    for (let x = cx - wall - tw; x < cx + wall + tw; x += 8 * s) ctx.fillRect(x, base - wall - 5 * s, 5 * s, 5 * s);
    const glow = ctx.createLinearGradient(0, base - gh, 0, base); glow.addColorStop(0, 'rgba(255,42,68,0.0)'); glow.addColorStop(1, 'rgba(255,42,68,0.85)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.moveTo(cx - gw / 2, base); ctx.lineTo(cx - gw / 2, base - gh * 0.7); ctx.quadraticCurveTo(cx, base - gh * 1.15, cx + gw / 2, base - gh * 0.7); ctx.lineTo(cx + gw / 2, base); ctx.fill();
    A.tex(ctx, 'light_01', cx, base - gh * 0.3, gw * 3, gh * 1.6, RED, 0.35 + 0.1 * Math.sin(T * 4), 0, true);
  }
  function rain(ctx, T, n, a, slant) {
    ctx.fillStyle = `rgba(200,210,235,${a})`;
    for (let i = 0; i < n; i++) { const x = hash(i, 4) * (W() + 40), y = ((hash(i, 5) * H() + T * (380 + hash(i, 6) * 200)) % (H() + 20)) - 10; ctx.fillRect(Math.round(x - y * (slant || 0.12)), Math.round(y), 1, 5); }
  }
  // An actor rotated about its feet.
  function spun(ctx, set, clip, fr, ang, x, y, sc, o, rot) { ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(rot); A.actor(ctx, set, clip, fr, ang, 0, 0, sc, o); ctx.restore(); }
  // A pair of red eyes on a figure in silhouette.
  function eyes(ctx, set, clip, fr, ang, x, y, sc, a) {
    const b = A.box(set, clip, fr, ang, sc); if (!b) return;
    const al = a == null ? 1 : clamp(a), dir = Math.cos(ang) >= 0 ? 1 : -1, ex = Math.round(x + b.x + b.w / 2 + dir * sc), ey = Math.round(y + b.y + Math.max(3, b.h * 0.13));
    ctx.globalAlpha = al; ctx.fillStyle = RED; const pw = Math.max(1, Math.round(sc * 0.6)); ctx.fillRect(ex, ey, pw, 1); ctx.fillRect(ex - Math.max(2, Math.round(sc)), ey, pw, 1);
    A.tex(ctx, 'light_01', ex, ey, 6 * sc, 4 * sc, RED, 0.4 * al, 0, true); ctx.globalAlpha = 1;
  }
  // A face close-up; the eye opens (col). head: the eye's place in the frame at scale 1, from the frame's top left.
  function closeUp(ctx, set, ang, sc, cx, cy, head, open, col, T, opts) {
    const b = A.box(set, 'Idle4', 0, ang, sc); if (!b) return { x: cx, y: cy };
    const fx = Math.round(cx - b.x - head[0] * sc), fy = Math.round(cy - b.y - head[1] * sc);
    A.actor(ctx, set, 'Idle4', 0, ang, fx, fy, sc, opts || { grey: true });   // one held frame keeps the eye on the face
    if (open > 0) {
      const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, 18 * open); g.addColorStop(0, col + 'c0'); g.addColorStop(1, col + '00');
      ctx.fillStyle = g; ctx.fillRect(cx - 40, cy - 40, 80, 80);
      ctx.fillStyle = col; ctx.fillRect(Math.round(cx - 7 * open), cy - 1, Math.round(14 * open), 3);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(cx - 2 * open), cy, Math.round(4 * open), 1);
    }
    return { x: cx, y: cy };
  }
  // Radial lines on an impact, in one colour.
  function burst(ctx, cx, cy, col, n, seed, r0) {
    ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < n; i++) { const a = hash(i, seed) * 6.283, r = (r0 || 24) + hash(i, seed + 1) * 30; ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.lineTo(cx + Math.cos(a) * (r + 260), cy + Math.sin(a) * (r + 260)); }
    ctx.stroke();
  }
  function sparks(ctx, cx, cy, T, n, seed, spread) {
    for (let i = 0; i < n; i++) {
      const life = (T * 2.4 + hash(i, seed)) % 1, a = -Math.PI / 2 + (hash(i, seed + 1) - 0.5) * (spread || 3.2), v = 40 + hash(i, seed + 2) * 90;
      const x = cx + Math.cos(a) * v * life, y = cy + Math.sin(a) * v * life + 60 * life * life;
      ctx.fillStyle = life < 0.3 ? '#ffffff' : i % 3 ? '#ffd27a' : '#ff7a3a'; ctx.globalAlpha = 1 - life; ctx.fillRect(Math.round(x), Math.round(y), life < 0.2 ? 2 : 1, 1);
    }
    ctx.globalAlpha = 1;
  }
  function deadSet(S, i) { const d = S.cast.dead; return d[i % d.length]; }
  function kick(S, v) { S.shake = Math.max(S.shake, v); }

  // ---- the shots -------------------------------------------------------------------------------------
  const SH = {};
  // Black; a red drop falls and rings out.
  SH.open = function (ctx, S, k) {
    fill(ctx, '#000');
    const cx = Math.round(W() / 2), cy = Math.round(H() * 0.56), f = clamp((k - 0.2) / 0.35);
    if (k > 0.2 && k < 0.58) { ctx.fillStyle = RED; ctx.fillRect(cx, Math.round(cy * f) - 6, 1, 6); ctx.fillStyle = '#ffd0d6'; ctx.fillRect(cx, Math.round(cy * f) - 1, 1, 1); }
    if (k >= 0.55) for (let i = 0; i < 3; i++) { const kk = ease((k - 0.55) * 2.2 - i * 0.15); if (kk <= 0) continue; ctx.strokeStyle = `rgba(255,42,68,${1 - kk})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, cy, 4 + kk * 90, 1 + kk * 10, 0, 0, 7); ctx.stroke(); }
    if (k > 0.8) fill(ctx, '#0a0612', (k - 0.8) / 0.2);
  };
  // The moon falls on a sleeping city; the people in the street look up.
  SH.fall = function (ctx, S, k, T) {
    const e = ease(k);
    grad(ctx, ['#05040c', '#120a1c', '#3a1220']);
    stars(ctx, 90, 0.9, 3, T);
    const r = H() * (0.22 + 0.2 * e), mx = W() * (0.6 - 0.06 * e), my = H() * (0.02 + 0.3 * e);
    // Its trail: streaks of fire behind it.
    for (let i = 0; i < 26; i++) { const a = -2.2 + (hash(i, 31) - 0.5) * 0.5, L = 30 + hash(i, 32) * 90, ox = (hash(i, 33) - 0.5) * r * 1.4; ctx.strokeStyle = i % 3 ? 'rgba(255,170,140,0.25)' : 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(mx + ox, my - r * 0.3); ctx.lineTo(mx + ox + Math.cos(a) * L, my - r * 0.3 + Math.sin(a) * L); ctx.stroke(); }
    moon(ctx, mx, my, r, '#efd8cc', `rgba(255,${Math.round(150 - 90 * e)},120,0.4)`, 0);
    K().hStreaks(ctx, 18, 'rgba(255,220,220,0.12)', 5, T, 500);
    const base = Math.round(H() * 0.8);
    city(ctx, base + 4, 7, '#1a0c16', 0, 1.2);
    city(ctx, base + 14, 13, '#0a0508', 0.35, 1.0);
    const st = ctx.createLinearGradient(0, base + 12, 0, H()); st.addColorStop(0, '#3a1a1a'); st.addColorStop(1, '#120808'); ctx.fillStyle = st; ctx.fillRect(-8, base + 12, W() + 16, H());
    // Townsfolk in the street, backs to us, looking up.
    for (let i = 0; i < 7; i++) {
      const set = deadSet(S, i), x = Math.round(W() * (0.1 + i * 0.13) + (i % 2 ? 6 : -4)), y = Math.round(H() * 0.95 + (i % 3) * 3);
      A.actor(ctx, set, 'Idle', Math.floor(T * 8 + i * 4) % 15, -Math.PI / 2 + (i - 3) * 0.12, x, y, 1.35 + (i % 3) * 0.15, { shade: '#040205' });
    }
    kick(S, 0.4 + 1.6 * e);
    if (k > 0.9) fill(ctx, '#ffffff', (k - 0.9) / 0.1 * 0.5);
  };
  // The swordsman close up against the moon: grey, wind, the blade drawn.
  SH.swordsman = function (ctx, S, k, T) {
    grad(ctx, ['#100816', '#2a1018']);
    moon(ctx, W() * 0.78, H() * 0.3, H() * 0.7, '#f2dccc', 'rgba(255,120,110,0.35)', 0);
    K().hStreaks(ctx, 36, 'rgba(255,255,255,0.18)', 9, T, 1100);
    const set = S.cast.first, sc = 4.0, fr = Math.floor(T * 7) % 15, draw = k > 0.45;
    const x = Math.round(W() * 0.36 + (1 - ease(k * 2)) * -14), y = Math.round(H() * 1.24);
    const clip = 'Idle';
    A.actor(ctx, set, clip, fr, 0, x + 2, y - 1, sc, { shade: '#fff2ec' });   // the moon's rim light
    A.actor(ctx, set, clip, fr, 0, x - 1, y, sc, { shade: '#7a1424' });
    A.actor(ctx, set, clip, fr, 0, x, y, sc, { shade: '#07040a' });
    if (draw && k > 0.62) { const gx = W() * (0.3 + (k - 0.62) * 1.6); K().line(ctx, gx - 40, H() * 0.45, gx + 30, H() * 0.36, 1, '#ffffff'); A.tex(ctx, 'star_06', gx, H() * 0.41, 30, 30, '#ffffff', 0.9, T * 3, true); }
    PX.text(ctx, 'THE FIRST CUT', W() - 10, BAR + 12, 7, '#f0e6ea', 'right');
    if (k > 0.92) fill(ctx, '#ffffff', (k - 0.92) / 0.08);
  };
  // He leaps at the falling moon, a black shape with its afterimages and speed lines.
  SH.leap = function (ctx, S, k, T) {
    const mx = W() * 0.55, my = H() * 0.4, r = H() * 0.36;
    grad(ctx, ['#1a0812', '#3a1420']);
    K().speedLines(ctx, mx, my, 60, 'rgba(255,240,240,0.35)', 21, T, r * 0.9);
    moon(ctx, mx, my, r, '#f2d6c8', 'rgba(255,90,90,0.45)', 0);
    const set = S.cast.first, e = ease(k), px = W() * 0.08 + (mx - W() * 0.08 + r * 0.2) * e, py = H() * 0.98 - (H() * 0.98 - my - 34) * Math.sin(e * Math.PI / 2), sc = 1.3 + 0.8 * e;
    const fr = Math.min(14, Math.floor(k * 12));
    for (let i = 4; i >= 1; i--) A.actor(ctx, set, 'Attack4', Math.max(0, fr - i), 0, Math.round(px - i * 9 * sc * 0.5), Math.round(py + i * 5), sc, { shade: RED, alpha: 0.14 * (5 - i) });
    A.actor(ctx, set, 'Attack4', fr, 0, Math.round(px), Math.round(py), sc, { shade: '#050307' });
    city(ctx, H() * 1.02, 13, '#080406', 0, 1.3);
    kick(S, 1.5);
  };
  // Impact frames: white, the inverted moon, then the wound torn across it.
  SH.cutmoon = function (ctx, S, k, T) {
    const mx = W() * 0.55, my = H() * 0.42, r = H() * 0.38, set = S.cast.first;
    if (k < 0.07) { fill(ctx, '#ffffff'); kick(S, 6); return; }
    if (k < 0.24) {
      fill(ctx, '#000'); burst(ctx, mx, my, '#ffffff', 70, 41, r * 1.05);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(mx, my, r, 0, 7); ctx.stroke();
      A.actor(ctx, set, 'Attack4', 14, 0, Math.round(mx + r * 0.45), Math.round(my + 52), 2.3, { shade: '#ffffff' });
      K().line(ctx, mx - r * 1.3, my + r * 0.46, mx + r * 1.3, my - r * 0.46, 2, '#ffffff'); return;
    }
    if (k < 0.34) {
      fill(ctx, '#ffffff'); PX.disc(ctx, mx, my, Math.round(r), '#000');
      A.actor(ctx, set, 'Attack4', 14, 0, Math.round(mx + r * 0.45), Math.round(my + 52), 2.3, { shade: '#000' });
      K().line(ctx, mx - r * 1.3, my + r * 0.46, mx + r * 1.3, my - r * 0.46, 2, '#ffffff'); return;
    }
    const kk = (k - 0.34) / 0.66;
    grad(ctx, ['#14060c', '#3a0e18']);
    stars(ctx, 60, 0.7, 5, T);
    moon(ctx, mx + Math.sin(T * 60) * 2 * (1 - kk), my, r, '#f0d0c4', 'rgba(255,60,80,0.5)', Math.min(1, 0.4 + kk * 3), null);
    // Sparks spraying off the cut, the swordsman falling away.
    sparks(ctx, mx + r * 0.3, my - r * 0.1, T, 80, 51, 6.2);
    A.actor(ctx, set, 'TakeDamage', Math.min(14, Math.floor(kk * 14)), 0, Math.round(mx + r * 0.8 + kk * 30), Math.round(my + 40 + kk * 70), 2.4 - kk, { shade: '#050307' });
    kick(S, 3 * (1 - kk));
  };
  // The moon hangs still, the wound bleeding red light; the sky turns red.
  SH.scar = function (ctx, S, k, T) {
    const e = ease(k);
    grad(ctx, ['#08040a', e > 0.5 ? '#2a0a12' : '#1a0a16', '#40101a']);
    stars(ctx, 70, 0.8 - 0.4 * e, 7, T);
    const r = H() * 0.32, mx = W() * 0.5, my = H() * 0.38 - k * 4;
    const mixc = [240, 200, 190].map((v, i) => Math.round(v + ([255, 80, 100][i] - v) * e * 0.55).toString(16).padStart(2, '0')).join('');
    moon(ctx, mx, my, r, '#' + mixc, `rgba(255,40,70,${0.3 + 0.3 * e})`, 1, T);
    A.tex(ctx, 'light_01', W() / 2, H() * 0.8, W() * 1.6, 40, RED, 0.35 * e, 0, true);   // long red light on the horizon
    city(ctx, H() * 0.86, 23, '#0c0508', 0.08 * (1 - e), 1.1);
    ctx.fillStyle = '#050304'; ctx.fillRect(-8, H() * 0.86, W() + 16, H());
  };
  // The dead rise from the graves under the red light.
  SH.rise = function (ctx, S, k, T) {
    grad(ctx, ['#12030a', '#4a0c18', '#a8203a']);
    moon(ctx, W() * 0.8, H() * 0.26, H() * 0.2, '#ff5a6a', 'rgba(255,40,70,0.5)', 1, T);
    for (let i = 0; i < 5; i++) A.tex(ctx, 'light_01', W() * (0.1 + i * 0.22), H() * 0.5, 30, H() * 1.2, RED, 0.12, 0.25, true);   // shafts of red light
    const base = Math.round(H() * 0.84);
    graves(ctx, base - 8, 61, '#22060c', 14, 1.0);
    ctx.fillStyle = '#0a0204'; ctx.fillRect(-8, base - 8, W() + 16, H());
    graves(ctx, base + 6, 81, '#060102', 9, 1.6);
    // The risen: the death clip played backwards, out of the ground.
    for (let i = 0; i < 7; i++) {
      const st = 0.05 + hash(i, 91) * 0.5, p = clamp((k - st) / 0.35), set = deadSet(S, i), ang = i % 2 ? Math.PI * 0.85 : Math.PI * 0.15;
      const x = Math.round(W() * (0.08 + i * 0.14) + hash(i, 92) * 10), y = base + 4 + (i % 3) * 5, sc = 1.5 + (i % 3) * 0.25;
      if (p <= 0) continue;
      ctx.save(); ctx.beginPath(); ctx.rect(-8, -8, W() + 16, y + 10); ctx.clip();
      const fr = p < 1 ? Math.max(0, 14 - Math.floor(p * 15)) : Math.floor(T * 8 + i) % 15, clip = p < 1 ? 'Die' : 'Idle';
      A.actor(ctx, set, clip, fr, ang, x, y + Math.round((1 - ease(p)) * 6), sc, { shade: '#120206' });
      ctx.restore();
      if (p > 0.8) eyes(ctx, set, clip, fr, ang, x, y, sc, (p - 0.8) * 5);
      if (p < 0.5) for (let j = 0; j < 6; j++) { ctx.fillStyle = '#2a0a10'; ctx.fillRect(Math.round(x + (hash(i, j) - 0.5) * 16), Math.round(y - p * 30 * hash(j, i)), 2, 2); }
    }
    // One rises close to us, cut by the frame.
    const p = clamp((k - 0.45) / 0.45), cs = 3.4, cx = Math.round(W() * 0.14), cy = Math.round(H() * 1.16), cset = deadSet(S, 2);
    if (p > 0) { const fr = p < 1 ? Math.max(0, 14 - Math.floor(p * 15)) : Math.floor(T * 8) % 15, clip = p < 1 ? 'Die' : 'Idle'; A.actor(ctx, cset, clip, fr, Math.PI * 0.1, cx, cy + Math.round((1 - ease(p)) * 30), cs, { shade: '#050102' }); if (p > 0.85) eyes(ctx, cset, clip, fr, Math.PI * 0.1, cx, cy, cs, (p - 0.85) * 6); }
    for (let i = 0; i < 3; i++) A.tex(ctx, 'smoke_04', W() * (0.2 + i * 0.35) + Math.sin(T + i) * 10, base + 4, 160, 30, '#ff3048', 0.18, 0, true);
  };
  // Tonight: the horde marches on the Black Gate under the bleeding moon.
  SH.gate = function (ctx, S, k, T) {
    const pan = Math.round(k * 26);
    grad(ctx, ['#0c0206', '#3a0a14', '#14040a']);
    stars(ctx, 40, 0.4, 9, T);
    ctx.save(); ctx.translate(-pan * 0.3, 0); moon(ctx, W() * 0.5 + 10, H() * 0.36, H() * 0.34, '#ff4a5e', 'rgba(255,40,70,0.55)', 1, T); ctx.restore();
    const base = Math.round(H() * 0.76);
    A.tex(ctx, 'light_01', W() / 2, base, W() * 1.8, 50, '#ff3048', 0.5, 0, true);
    ctx.save(); ctx.translate(-pan * 0.5, 0); gate(ctx, W() * 0.5 + 12, base, 0.8, '#070204', T); ctx.restore();
    const fl = ctx.createLinearGradient(0, base, 0, H()); fl.addColorStop(0, '#4a0e1a'); fl.addColorStop(1, '#16040a'); ctx.fillStyle = fl; ctx.fillRect(-8, base, W() + 16, H());
    // Three ranks of the dead, marching on the gate, the nearer the darker and quicker.
    const ranks = [[0.9, '#2a0810', base + 6, 9, 14], [1.3, '#14040a', base + 16, 7, 20], [2.2, '#040102', base + 34, 5, 30]];
    ranks.forEach(([sc, col, y, n, sp], ri) => {
      for (let i = 0; i < n; i++) {
        const dir = (i + ri) % 2 ? 1 : -1, span = W() + 60, x0 = hash(i, 101 + ri) * span, x = ((x0 + dir * T * sp) % span + span) % span - 30 - pan * (0.6 + ri * 0.3);
        const ang = dir > 0 ? -Math.PI * 0.15 : -Math.PI * 0.85, set = deadSet(S, i + ri * 3), fr = Math.floor(T * 11 + i * 4) % 15, yy = Math.round(y + (i % 2) * 3);
        A.actor(ctx, set, 'Walk', fr, ang, Math.round(x), yy, sc, { shade: col });
        if (ri < 2 && i % 2 === 0) eyes(ctx, set, 'Walk', fr, ang, Math.round(x), yy, sc, 0.8);
      }
    });
    A.tex(ctx, 'smoke_07', W() * 0.5, base + 6, W() * 1.4, 24, '#ff3048', 0.15, 0, true);
    PX.text(ctx, 'THE BLACK GATE', 10, BAR + 12, 7, '#f0d0d6');
  };
  // Rain on wet stone; armoured boots walk in. Only her legs and cape fit the frame.
  SH.steps = function (ctx, S, k, T) {
    grad(ctx, ['#0a0810', '#1c1220', '#0c0a10']);
    moon(ctx, W() * 0.72, H() * 0.28, H() * 0.1, '#ff4a5e', 'rgba(255,40,70,0.4)', 1, null);
    gate(ctx, W() * 0.72, H() * 0.62, 0.35, '#0a0608', T);
    const gy = Math.round(H() * 0.7);
    ctx.fillStyle = '#100c14'; ctx.fillRect(-8, gy, W() + 16, H());
    ctx.fillStyle = 'rgba(255,60,80,0.18)'; ctx.fillRect(Math.round(W() * 0.72 - 8), gy + 2, 16, 30);
    ctx.fillStyle = 'rgba(160,170,200,0.2)'; for (let i = 0; i < 18; i++) ctx.fillRect(Math.round(hash(i, 111) * W()), gy + 4 + Math.round(hash(i, 112) * (H() - gy)), 6 + Math.round(hash(i, 113) * 20), 1);
    const set = S.cast.vesper, sc = 3.0, x = Math.round(W() * 0.08 + k * W() * 0.4), y = Math.round(H() * 0.93), fr = Math.floor(T * 11) % 15;
    ctx.save(); ctx.globalAlpha = 0.25; ctx.translate(0, y * 2); ctx.scale(1, -1); A.actor(ctx, set, 'Walk', fr, 0, x, y, sc, { shade: '#2a1018' }); ctx.restore();
    A.actor(ctx, set, 'Walk', fr, 0, x, y, sc, {});
    const st = (T * 11 / 7.5) % 1; if (st < 0.25) for (let i = 0; i < 8; i++) { ctx.fillStyle = 'rgba(210,220,240,0.7)'; ctx.fillRect(Math.round(x + (hash(i, 114) - 0.3) * 40), Math.round(y - 4 - st * 30 * hash(i, 115)), 1, 1); }
    rain(ctx, T, 110, 0.5, 0.14);
    PX.text(ctx, 'VESPER', 10, BAR + 12, 8, '#ff9aaa');
    PX.text(ctx, 'THE MOONBLADE', 10, BAR + 22, 6, '#e8d8dc');
  };
  // The visor close up; under it an eye opens red and the red cracks run out.
  SH.eye = function (ctx, S, k, T) {
    fill(ctx, INK);
    K().embers(ctx, T, 26, 0, W(), RED);
    const sc = 3.4 + 0.6 * ease(k), open = ease((k - 0.2) / 0.35);
    const at = closeUp(ctx, S.cast.vesper, 0, sc, Math.round(W() * 0.6 + Math.sin(T * 2) * 2), Math.round(H() * 0.42), [19, 6], open, RED, T);
    if (open > 0) { ctx.globalAlpha = clamp((k - 0.35) * 3); for (let i = 0; i < 6; i++) K().crack(ctx, at.x + (i % 2 ? 6 : -6), at.y + 2, Math.PI / 2 + (i - 2.5) * 0.35, 40 + 50 * ease((k - 0.35) / 0.5), 70 + i, RED, 1); ctx.globalAlpha = 1; }
    rain(ctx, T, 50, 0.25, 0.1);
    const cx = Math.round(W() * 0.28); ctx.fillStyle = INK; ctx.fillRect(cx - 3, 0, 6, H()); ctx.fillStyle = '#ffffff'; ctx.fillRect(cx + 3, 0, 1, H());
    if (k > 0.9) fill(ctx, '#ffffff', (k - 0.9) / 0.1);
  };
  // The draw: the knight large and grey, the red cut thrown across the whole frame.
  SH.draw = function (ctx, S, k, T) {
    fill(ctx, INK);
    K().hStreaks(ctx, 40, 'rgba(120,120,135,0.6)', 3, T, 1300);
    const set = S.cast.vesper, sc = 4.4, fr = Math.min(14, 5 + Math.floor(k * 10));
    const fx = Math.round(W() * 0.7 - ease(k * 1.6) * W() * 0.08), fy = Math.round(H() * 1.12);
    for (let i = 3; i >= 1; i--) A.actor(ctx, set, 'Special1', Math.max(0, fr - i), Math.PI, fx + i * 10, fy, sc, { shade: i === 1 ? '#5a1020' : '#2a0810', alpha: 0.5 - i * 0.12 });
    A.actor(ctx, set, 'Special1', fr, Math.PI, fx, fy, sc, { grey: true });
    if (k > 0.35) {
      const kk = ease((k - 0.35) / 0.3), y0 = H() * 0.48, x0 = fx - 40;
      ctx.save(); ctx.translate(x0, y0); ctx.rotate(-0.12);
      ctx.fillStyle = 'rgba(120,40,200,0.65)'; ctx.fillRect(-W() * 1.2 * kk, -6, W() * 1.2 * kk, 12);
      ctx.fillStyle = RED; ctx.fillRect(-W() * 1.2 * kk, -3, W() * 1.2 * kk, 6);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-W() * 1.2 * kk, -1, W() * 1.2 * kk, 1);
      for (let i = 0; i < 70; i++) { const px = -hash(i, 1) * W() * 1.1 * kk, py = (hash(i, 2) - 0.5) * 40 * (0.3 + kk) + Math.sin(i + T * 6) * 3; ctx.fillStyle = i % 3 ? RED : '#9a4cff'; ctx.fillRect(Math.round(px), Math.round(py), 2, 2); }
      ctx.restore();
      A.fx(ctx, 'slash_arc_blood', (k - 0.35) * 0.9, W() * 0.3, y0 - 6, 3.2, 0.9, 0, true);
      if (k < 0.45) kick(S, 3);
    }
    if (k > 0.8) { K().line(ctx, 0, H() * 0.15, W(), H() * 0.75, 2, '#ffffff'); K().line(ctx, W() * 0.2, H(), W() * 0.85, 0, 1, '#ffffff'); }
    if (k > 0.93) fill(ctx, '#ffffff', (k - 0.93) / 0.07);
  };
  // She runs through the dead: the world streaks past, each one cut and thrown.
  SH.charge = function (ctx, S, k, T) {
    grad(ctx, ['#2a0610', '#7a1424', '#2a0610']);
    moon(ctx, W() * 0.8, H() * 0.3, H() * 0.16, '#ff7a88', 'rgba(255,60,80,0.4)', 1, null);
    K().hStreaks(ctx, 60, 'rgba(255,200,200,0.35)', 13, T, 1500);
    const gy = Math.round(H() * 0.8);
    ctx.fillStyle = '#14040a'; ctx.fillRect(-8, gy, W() + 16, H());
    ctx.fillStyle = 'rgba(255,120,130,0.4)'; for (let i = 0; i < 20; i++) { const x = W() - ((T * 900 + hash(i, 121) * 900) % (W() + 60)); ctx.fillRect(Math.round(x), gy + 3 + Math.round(hash(i, 122) * 20), 10 + Math.round(hash(i, 123) * 30), 1); }
    for (let i = 0; i < 10; i++) { const x = W() + 30 - ((T * 420 + hash(i, 124) * 600) % (W() + 60)); A.actor(ctx, deadSet(S, i), 'Run', Math.floor(T * 14 + i) % 15, Math.PI, Math.round(x), gy - 4, 1.0, { shade: '#3a0a14' }); }   // the far dead streaking by
    const set = S.cast.vesper, hx = Math.round(W() * 0.34), sc = 2.5;
    let last = -1; for (let i = 0; i < CONTACT.length; i++) if (T >= CONTACT[i]) last = i;
    const since = last >= 0 ? T - CONTACT[last] : 9;
    // The dead she meets: rushing in, then cut and thrown spinning behind her.
    CONTACT.forEach((c, i) => {
      const set2 = deadSet(S, i + 2), d = T - c, sc2 = 2.1;
      if (d < 0) { const x = hx + 22 + (-d) * 280; if (x < W() + 40) A.actor(ctx, set2, 'Run', Math.floor(T * 14 + i * 3) % 15, Math.PI, Math.round(x), gy, sc2, { shade: '#050102' }); }
      else if (d < 1.2) {
        const x = hx + 22 - d * 140 + (i % 2 ? 0 : d * 60), y = gy - 330 * d + 520 * d * d;
        if (y < H() + 40) spun(ctx, set2, 'TakeDamage', Math.min(14, 3 + Math.floor(d * 20)), Math.PI, x, Math.min(y, gy), sc2, { shade: d < 0.06 ? '#ffffff' : '#050102' }, (i % 2 ? -1 : 1) * d * 9);
        if (d < 0.3) { ctx.globalAlpha = 1 - d / 0.3; const a = (hash(i, 125) - 0.5) * 1.6; K().line(ctx, hx + 22 - Math.cos(a) * 46, gy - 24 - Math.sin(a) * 46, hx + 22 + Math.cos(a) * 46, gy - 24 + Math.sin(a) * 46, d < 0.06 ? 3 : 1, '#ffffff'); ctx.globalAlpha = 1; }
        if (d < 0.5) for (let j = 0; j < 14; j++) { ctx.fillStyle = j % 3 ? RED : '#ffffff'; ctx.fillRect(Math.round(hx + 22 + d * (40 + hash(i, j) * 90)), Math.round(gy - 24 - d * hash(j, i) * 70 + d * d * 160), 2, 1); }
      }
    });
    const clips = ['Attack1', 'Attack2', 'Attack3', 'Attack6', 'Kick', 'Attack2', 'Attack1', 'Special1'];
    const attacking = since < 0.26, clip = attacking ? clips[last % clips.length] : 'Run', fr = attacking ? Math.min(14, 4 + Math.floor(since * 40)) : Math.floor(T * 16) % 15;
    for (let i = 3; i >= 1; i--) A.actor(ctx, set, clip, fr, 0, hx - i * 9, gy, sc, { shade: RED, alpha: 0.12 * (4 - i) });
    A.actor(ctx, set, clip, fr, 0, hx, gy, sc, {});
    if (since < 0.05) { fill(ctx, '#ffffff', 0.3); kick(S, 2.5); }
    if (k > 0.94) fill(ctx, '#ffffff', (k - 0.94) / 0.06);
  };
  // Three panels slam in: the blade, a thrall's face as the cut lands, her eye.
  SH.panels = function (ctx, S, k, T) {
    fill(ctx, '#000');
    const Wd = W(), Hd = H(), set = S.cast.vesper;
    const polys = [[[0, 0], [Wd * 0.4, 0], [Wd * 0.3, Hd], [0, Hd]], [[Wd * 0.4 + 4, 0], [Wd * 0.72, 0], [Wd * 0.62, Hd], [Wd * 0.3 + 4, Hd]], [[Wd * 0.72 + 4, 0], [Wd, 0], [Wd, Hd], [Wd * 0.62 + 4, Hd]]];
    const at = [0, 0.22, 0.44];
    const path = (p) => { ctx.beginPath(); p.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };
    polys.forEach((p, i) => {
      const kk = k - at[i]; if (kk < 0) return;
      const off = Math.round(Math.max(0, 1 - kk / 0.08) * (i === 1 ? -30 : 30));
      ctx.save(); ctx.translate(0, off); path(p); ctx.clip();
      if (i === 0) {
        fill(ctx, RED); K().speedLines(ctx, Wd * 0.18, Hd * 0.5, 40, 'rgba(0,0,0,0.5)', 131, T, 20);
        const fr = Math.min(14, 4 + Math.floor(kk * 26));
        A.actor(ctx, set, 'Attack2', fr, 0, Math.round(Wd * 0.13) + 1, Math.round(Hd * 0.92), 2.9, { shade: '#ffffff' });
        A.actor(ctx, set, 'Attack2', fr, 0, Math.round(Wd * 0.13), Math.round(Hd * 0.92), 2.9, {});
        A.fx(ctx, 'arc_white', kk * 1.2, Wd * 0.24, Hd * 0.5, 2.0, 1, -0.4);
      } else if (i === 1) {
        fill(ctx, '#e8e2e6'); K().speedLines(ctx, Wd * 0.5, Hd * 0.5, 50, 'rgba(0,0,0,0.35)', 133, T, 26);
        const d = deadSet(S, 1), fr = Math.min(14, 2 + Math.floor(kk * 24)), dx = Math.round(Wd * 0.5 + kk * 12), dy = Math.round(Hd * 0.9);
        A.actor(ctx, d, 'TakeDamage', fr, Math.PI, dx, dy, 2.8, { shade: '#050102' });
        eyes(ctx, d, 'TakeDamage', fr, Math.PI, dx, dy, 2.8, 1);
        if (kk > 0.04) {
          ctx.globalAlpha = clamp(1 - (kk - 0.4) * 3); K().line(ctx, Wd * 0.3, Hd * 0.25, Wd * 0.72, Hd * 0.7, 3, RED); K().line(ctx, Wd * 0.3, Hd * 0.25, Wd * 0.72, Hd * 0.7, 1, '#ffffff'); ctx.globalAlpha = 1;
          for (let j = 0; j < 24; j++) { const u = hash(j, 135), t2 = kk * (1 + hash(j, 136)); ctx.fillStyle = j % 4 ? RED : '#000'; ctx.fillRect(Math.round(Wd * (0.3 + u * 0.42) + t2 * 30), Math.round(Hd * (0.25 + u * 0.45) - t2 * 20 + t2 * t2 * 60), 2, 2); }
        }
      } else {
        fill(ctx, '#16121a'); K().embers(ctx, T, 20, Wd * 0.62, Wd, RED);
        closeUp(ctx, set, 0, 4.4, Math.round(Wd * 0.86), Math.round(Hd * 0.46), [19, 6], ease(kk * 4), RED, T);
      }
      ctx.restore();
      if (kk < 0.05) kick(S, 2.5);
      ctx.save(); ctx.translate(0, off); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; path(p); ctx.stroke(); ctx.restore();
    });
    if (k > 0.86) fill(ctx, '#ffffff', (k - 0.86) / 0.14);
  };
  // The Gatewarden crashes down in front of the moon; the ground breaks; his name.
  SH.drop = function (ctx, S, k, T) {
    const land = 0.2, kd = k - land;
    grad(ctx, ['#0c0206', '#3a0a14', '#7a1626']);
    const wx = Math.round(W() * 0.6), gy = Math.round(H() * 0.82);
    moon(ctx, wx, H() * 0.42, H() * 0.3, '#ff4a5e', 'rgba(255,40,70,0.5)', 1, T);
    gate(ctx, W() * 0.92, gy, 0.55, '#120408', T);
    city(ctx, gy, 191, '#160408', 0, 0.6);
    const fl = ctx.createLinearGradient(0, gy, 0, H()); fl.addColorStop(0, '#2a0810'); fl.addColorStop(1, '#0a0204'); ctx.fillStyle = fl; ctx.fillRect(-8, gy, W() + 16, H());
    const ws = S.cast.warden, vs = S.cast.vesper, sc = 3.0, rim = (clip, fr, y) => { A.actor(ctx, ws, clip, fr, Math.PI, wx + 1, y - 1, sc, { shade: '#b8a8ff' }); A.actor(ctx, ws, clip, fr, Math.PI, wx - 1, y, sc, { shade: '#3a2a6a' }); };
    // Her, at the left, in silhouette: she watches him come down.
    A.actor(ctx, vs, 'Idle4', Math.floor(T * 8) % 15, 0, Math.round(W() * 0.14), gy + 6, 2.2, { shade: '#050203' });
    eyes(ctx, vs, 'Idle4', Math.floor(T * 8) % 15, 0, Math.round(W() * 0.14), gy + 6, 2.2, 1);
    if (k < land) {
      const f = k / land, y = Math.round(gy - (1 - f) * 210);
      ctx.fillStyle = `rgba(0,0,0,${0.3 + 0.5 * f})`; ctx.beginPath(); ctx.ellipse(wx, gy + 2, 10 + 30 * f, 3 + 6 * f, 0, 0, 7); ctx.fill();
      for (let i = 0; i < 20; i++) { const x = wx + (hash(i, 141) - 0.5) * 80, yy = ((T * 700 + hash(i, 142) * 200) % 200) - 20; ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(Math.round(x), Math.round(yy), 1, 8); }
      A.actor(ctx, ws, 'Attack4', Math.min(8, Math.floor(f * 9)), Math.PI, wx, y, sc, { shade: '#050203' });
      return;
    }
    if (kd < 0.04) { fill(ctx, '#ffffff'); A.actor(ctx, ws, 'Attack4', 9, Math.PI, wx, gy, sc, { shade: '#000' }); kick(S, 7); return; }
    for (let i = 0; i < 7; i++) K().crack(ctx, wx + (i - 3) * 6, gy + 2, (i < 3 ? Math.PI : 0) + (hash(i, 143) - 0.5) * 0.4, 30 + 50 * ease(kd * 3), 150 + i, i % 2 ? RED : '#000', 1);
    for (let i = 0; i < 2; i++) { const rk = ease(kd * 2.2 - i * 0.12); if (rk <= 0 || rk >= 1) continue; ctx.strokeStyle = `rgba(255,230,235,${1 - rk})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(wx, gy + 1, 8 + rk * 150, 2 + rk * 16, 0, 0, 7); ctx.stroke(); }
    for (let i = 0; i < 26; i++) { const life = clamp(kd * 1.6 - hash(i, 146) * 0.2); if (life <= 0 || life >= 1) continue; ctx.fillStyle = `rgba(90,40,50,${0.7 * (1 - life)})`; const sz = 3 + Math.round(life * 6); ctx.fillRect(Math.round(wx + (hash(i, 147) - 0.5) * 2 * 70 * ease(life)), Math.round(gy - 4 - hash(i, 148) * 16 * life), sz, Math.max(2, sz >> 1)); }
    const fr = kd < 0.25 ? Math.min(14, 9 + Math.floor(kd * 24)) : Math.floor(T * 8) % 15, clip = kd < 0.25 ? 'Attack4' : 'Idle4';
    A.tex(ctx, 'light_01', wx, gy - 40, 120, 120, '#9a8cff', 0.3, 0, true);
    rim(clip, fr, gy); A.actor(ctx, ws, clip, fr, Math.PI, wx, gy, sc, {});
    for (let i = 0; i < 18; i++) { const life = clamp(kd * 2 - hash(i, 144) * 0.3); if (life <= 0 || life >= 1) continue; ctx.fillStyle = '#1a0a0e'; ctx.fillRect(Math.round(wx + (hash(i, 145) - 0.5) * 140 * life), Math.round(gy - 70 * life + 100 * life * life), 2, 2); }
    if (kd < 0.5) kick(S, 3 * (1 - kd * 2));
    if (kd > 0.15) {   // the name card
      const nk = kd - 0.15, nx = W() * 0.28, ny = H() * 0.22;
      K().title(ctx, 'THE GATEWARDEN', nx, ny, 18, nk, T);
      if (nk > 0.18) { ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(nx - 60 * ease(nk * 3)), Math.round(ny + 11), Math.round(120 * ease(nk * 3)), 1); }
      if (nk > 0.12) PX.text(ctx, 'KEEPER OF THE BLACK GATE', nx, ny + 21, 6, '#e8d8dc', 'center');
    }
  };
  // Split screen: her red eye above, his violet eye below.
  SH.face = function (ctx, S, k, T) {
    fill(ctx, '#000');
    const mid = Math.round(H() / 2), slide = Math.round((1 - ease(k * 5)) * 60);
    ctx.save(); ctx.beginPath(); ctx.rect(-8, -8, W() + 16, mid + 7); ctx.clip();
    fill(ctx, '#3a1018'); K().hStreaks(ctx, 24, 'rgba(255,90,110,0.4)', 151, T, 900);
    closeUp(ctx, S.cast.vesper, 0, 4.4, Math.round(W() * 0.4 - slide), Math.round(mid * 0.45), [19, 6], 1, RED, T, {});
    ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(-8, mid + 1, W() + 16, H()); ctx.clip();
    fill(ctx, '#3a3466'); K().hStreaks(ctx, 24, 'rgba(200,190,255,0.4)', 153, T, 900);
    closeUp(ctx, S.cast.warden, Math.PI, 4.4, Math.round(W() * 0.6 + slide), Math.round(mid + mid * 0.3), [15, 6], 1, '#b8a8ff', T, {});
    ctx.restore();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-8, mid - 1, W() + 16, 2);
    if (k > 0.9) fill(ctx, '#ffffff', (k - 0.9) / 0.1);
  };
  // They dash and their blades meet: the impact frames, then the sparks pour from the lock.
  SH.clash = function (ctx, S, k, T) {
    const vs = S.cast.vesper, ws = S.cast.warden, cx = W() / 2, gy = Math.round(H() * 0.84), hit = 0.34;
    if (k < hit) {
      grad(ctx, ['#14040a', '#4a0c18', '#14040a']);
      K().hStreaks(ctx, 60, 'rgba(255,220,220,0.4)', 161, T, 1600);
      ctx.fillStyle = '#0a0204'; ctx.fillRect(-8, gy, W() + 16, H());
      const f = ease(k / hit), vx = Math.round(-30 + (cx - 34 + 30) * f), wx = Math.round(W() + 40 - (W() + 40 - cx - 38) * f);
      for (let i = 3; i >= 1; i--) { A.actor(ctx, vs, 'Run', Math.floor(T * 16) % 15, 0, vx - i * 14, gy, 2.6, { shade: RED, alpha: 0.12 * (4 - i) }); A.actor(ctx, ws, 'Run', Math.floor(T * 14) % 15, Math.PI, wx + i * 14, gy, 3.0, { shade: '#9a8cff', alpha: 0.12 * (4 - i) }); }
      A.actor(ctx, vs, 'Run', Math.floor(T * 16) % 15, 0, vx, gy, 2.6, {});
      A.actor(ctx, ws, 'Run', Math.floor(T * 14) % 15, Math.PI, wx, gy, 3.0, {});
      return;
    }
    const kk = k - hit, vx = Math.round(cx - 40), wx = Math.round(cx + 44);
    if (kk < 0.06) { fill(ctx, '#ffffff'); A.actor(ctx, vs, 'Attack1', 8, 0, vx, gy, 2.6, { shade: '#000' }); A.actor(ctx, ws, 'Attack1', 8, Math.PI, wx, gy, 3.0, { shade: '#000' }); kick(S, 7); return; }
    if (kk < 0.13) { fill(ctx, '#000'); burst(ctx, cx, gy - 50, '#ffffff', 80, 163, 16); A.actor(ctx, vs, 'Attack1', 8, 0, vx, gy, 2.6, { shade: '#ffffff' }); A.actor(ctx, ws, 'Attack1', 8, Math.PI, wx, gy, 3.0, { shade: '#ffffff' }); return; }
    const e = kk - 0.13;
    const hot = ctx.createRadialGradient(cx, gy - 50, 4, cx, gy - 50, W() * 0.6); hot.addColorStop(0, '#fff2d0'); hot.addColorStop(0.18, '#ffb050'); hot.addColorStop(0.5, '#ff2a44'); hot.addColorStop(1, '#3a0610');
    ctx.fillStyle = hot; ctx.fillRect(-8, -8, W() + 16, H() + 16);
    burst(ctx, cx, gy - 50, 'rgba(60,0,10,0.35)', 50, 165, 30);
    ctx.fillStyle = '#000'; ctx.fillRect(-8, gy, W() + 16, H());
    for (let i = 0; i < 3; i++) { const rk = ease(e * 1.8 - i * 0.15); if (rk <= 0 || rk >= 1) continue; ctx.strokeStyle = `rgba(255,220,180,${1 - rk})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, gy - 50, 6 + rk * 120, 6 + rk * 120, 0, 0, 7); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,200,170,0.25)'; for (let i = 0; i < 16; i++) { const life = (e * 1.5 + hash(i, 166)) % 1; ctx.fillRect(Math.round(cx + (hash(i, 168) - 0.5) * 2 * 90 * life), Math.round(gy - 2 - 8 * life), 3, 2); }
    const push = Math.round(Math.sin(T * 40) * 1.5);
    A.actor(ctx, vs, 'Attack1', 8, 0, vx + push, gy, 2.6, { shade: '#000' });
    A.actor(ctx, ws, 'Attack1', 8, Math.PI, wx + push, gy, 3.0, { shade: '#000' });
    eyes(ctx, vs, 'Attack1', 8, 0, vx + push, gy, 2.6, 1);
    A.tex(ctx, 'light_01', cx, gy - 50, 36, 36, '#ffffff', 0.8, 0, true);
    sparks(ctx, cx + 2, gy - 50, T, 70, 167, 4.5);
    kick(S, 1.5);
  };
  // All red. She has passed through him; one white line; a beat; he comes apart and falls.
  SH.pass = function (ctx, S, k) {
    const vs = S.cast.vesper, ws = S.cast.warden, gy = Math.round(H() * 0.9);
    fill(ctx, RED);
    const lx0 = W() * 0.02, ly0 = H() * 0.2, lx1 = W() * 0.98, ly1 = H() * 0.78, split = clamp((k - 0.55) / 0.3), wx = Math.round(W() * 0.34);
    const drawW = (o) => A.actor(ctx, ws, split > 0.6 ? 'Die' : 'Attack1', split > 0.6 ? Math.min(14, Math.floor((split - 0.6) * 30)) : 10, 0, wx, gy, 3.2, o);
    if (split <= 0) drawW({ shade: '#000' });
    else {
      const d = ease(split) * 14;
      const side = (above) => { ctx.save(); ctx.beginPath(); ctx.moveTo(lx0 - 20, ly0 - 4); ctx.lineTo(lx1 + 20, ly1 - 4); const yy = above ? -10 : H() + 10; ctx.lineTo(lx1 + 20, yy); ctx.lineTo(lx0 - 20, yy); ctx.closePath(); ctx.clip(); };
      side(true); ctx.translate(-d, -d * 0.6); drawW({ shade: '#000' }); ctx.restore();
      side(false); ctx.translate(d * 0.4, d * 0.4); drawW({ shade: '#000' }); ctx.restore();
      A.tex(ctx, 'light_01', wx, gy - 40, 120, 30, '#ffffff', 0.5 * (1 - split), 0.55, true);
    }
    A.actor(ctx, vs, 'Special1', 14, 0, Math.round(W() * 0.82), gy, 2.4, { shade: '#000' });
    const lk = ease(k * 5);
    K().line(ctx, lx0, ly0, lx0 + (lx1 - lx0) * lk, ly0 + (ly1 - ly0) * lk, k > 0.55 && k < 0.62 ? 3 : 1, '#ffffff');
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; for (let i = 0; i < 10; i++) ctx.fillRect(Math.round(hash(i, 171) * W()), Math.round(hash(i, 172) * H()), 2, 2);
    if (k > 0.55 && k < 0.6) kick(S, 5);
    if (k > 0.86) fill(ctx, '#ffffff', (k - 0.86) / 0.14);
  };
  // The red moon; she stands on the rampart, her back to us; VESPER.
  SH.title = function (ctx, S, k, T) {
    const sh = SHOTS[SHOTS.length - 1], dur = sh[2] - sh[1], out = 0.6 / dur;
    grad(ctx, ['#080206', '#2a0610', '#4a0c18']);
    stars(ctx, 60, 0.5, 11, T);
    moon(ctx, W() / 2, H() * 0.62, H() * 0.4, '#ff3a52', 'rgba(255,40,70,0.55)', 1, T);
    K().embers(ctx, T, 40, 0, W(), RED);
    const gy = Math.round(H() * 0.86);
    ctx.fillStyle = '#050203'; ctx.beginPath(); ctx.moveTo(-8, gy + 6); for (let x = -8; x <= W() + 8; x += 6) ctx.lineTo(x, gy + (Math.abs(x - W() / 2) < 30 ? 0 : 4 + hash(x, 181) * 6)); ctx.lineTo(W() + 8, H() + 8); ctx.lineTo(-8, H() + 8); ctx.fill();
    A.actor(ctx, S.cast.vesper, 'Idle4', Math.floor(T * 7) % 15, -Math.PI / 2, Math.round(W() / 2), gy + 1, 1.6, { shade: '#050203' });
    const tk = T - 0.4;
    if (tk > 0) {
      if (tk < 0.08) fill(ctx, '#ffffff', 1 - tk / 0.08);
      const y = Math.round(H() * 0.24);
      const band = ctx.createLinearGradient(0, y - 34, 0, y + 50); band.addColorStop(0, 'rgba(5,2,4,0)'); band.addColorStop(0.35, 'rgba(5,2,4,0.6)'); band.addColorStop(0.7, 'rgba(5,2,4,0.6)'); band.addColorStop(1, 'rgba(5,2,4,0)');
      ctx.globalAlpha = clamp(tk * 4); ctx.fillStyle = band; ctx.fillRect(-8, y - 34, W() + 16, 84); ctx.globalAlpha = 1;
      K().title(ctx, 'VESPER', W() / 2, y, Math.min(44, Math.round(W() / 6.5)), Math.min(1, tk), T);
      const dv = R.uiImg && R.uiImg('divider');
      if (dv && tk > 0.3) { ctx.globalAlpha = clamp((tk - 0.3) * 3); ctx.drawImage(dv, Math.round(W() / 2 - dv.naturalWidth / 2), y + 20); ctx.globalAlpha = 1; }
      if (tk > 1.0) { ctx.globalAlpha = clamp((tk - 1.0) * 2); PX.text(ctx, 'A LAST DITCH EFFORT', W() / 2, y + 36, 8, '#ffb8c4', 'center'); ctx.globalAlpha = 1; }
      if (tk > 2.0) { ctx.globalAlpha = clamp((tk - 2.0) * 2); PX.text(ctx, 'Six guardians. One night. Close the wound before dawn.', W() / 2, H() - 8, 7, '#f6eef0', 'center'); ctx.globalAlpha = 1; }
    }
    if (k > 1 - out) fill(ctx, '#000', (k - (1 - out)) / out);
  };

  // ---- the frame -------------------------------------------------------------------------------------
  function shotAt(t) { for (const s of SHOTS) if (t < s[2]) return s; return SHOTS[SHOTS.length - 1]; }
  I.shotAt = (t) => shotAt(t)[0];
  const NO_BARS = { panels: 1, face: 1, pass: 1 };
  I.draw = function (ctx, dt) {
    const S = I.st; if (!S) return;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, R.W, R.H);
    const c = R.pxBegin(), sh = shotAt(S.t), T = S.t - sh[1], k = clamp(T / (sh[2] - sh[1]));
    c.save();
    if (S.shake > 0.3) c.translate(Math.round((Math.random() - 0.5) * S.shake), Math.round((Math.random() - 0.5) * S.shake));
    SH[sh[0]](c, S, k, T);
    c.restore();
    S.shake = Math.max(0, S.shake - (dt || 0.016) * 18);
    // Letterbox (none on the impact frames; the title lets it go), the captions in the lower bar, the skip hint.
    const impact = NO_BARS[sh[0]] || (sh[0] === 'cutmoon' && k < 0.34);
    const bars = sh[0] === 'title' ? Math.round(BAR * Math.max(0, 1 - T * 1.5)) : impact ? 0 : BAR;
    if (bars) { c.fillStyle = '#000'; c.fillRect(0, 0, W(), bars); c.fillRect(0, H() - bars, W(), bars); }
    for (const [a, b, text] of LINES) {
      if (S.t < a || S.t > b) continue;
      c.globalAlpha = Math.min(1, (S.t - a) * 4, (b - S.t) * 4);
      PX.text(c, text, W() / 2, H() - 4, 8, '#f6eef0', 'center');
      c.globalAlpha = 1;
    }
    PX.text(c, R.touch ? 'tap to skip' : 'esc to skip', W() - 6, 10, 6, 'rgba(230,220,224,0.5)', 'right', { shadow: false });
  };
})();
