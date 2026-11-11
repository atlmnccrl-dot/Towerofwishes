// THE BLEEDING MOON — the opening: an anime fight told in shots on the pixel buffer, in the style of the moon arts.
// Nothing here is the game's own view: every shot is a built set (a sleeping city, a graveyard, the
// Black Gate under the bleeding moon, a red void) with the cast as actors, silhouettes and close-ups.
//   A city under the white moon, the ground shaking, the First Cut rising behind the Spire as a god ·
//   his sword raised into the moon and the cut (impact frames) · the wound bleeds · a hand bursts from the earth and the dead stand up on a ridge · red eyes
//   open across a black plain, the horde in the lightning · Vesper's red eye, the draw · she cuts through the dead · three
//   panels · the First Cut as a god over the Spire, his gaze · his blade comes down, she holds it, throws
//   it off and points hers at him · the title over the red moon.
// A tap (or Esc) skips straight to the trial.
(function () {
  const VS = window.VS, D = VS.DATA, A = VS.A, R = VS.R, PX = VS.PX;
  const I = VS.INTRO = {};
  const RED = '#ff2a44', INK = '#050507', BAR = 16;
  const W = () => PX.W, H = () => PX.H;
  const K = () => VS.cine.kit;
  // The opening as a film: its shots (seconds), captions and sounds, timed from the start of their shot.
  const DUR = [['cold', 5.6], ['city', 3.2], ['godrise', 2.6], ['godcut', 4.4], ['scar', 1.8], ['rise', 3.6], ['horde', 3.4],
    ['eye', 1.8], ['draw', 1.0], ['name', 1.3], ['charge', 2.6], ['panels', 1.4], ['colossus', 4.0], ['gaze', 1.4], ['strike', 1.9], ['defy', 1.7], ['title', 6.6]];
  // Captions, timed from the start of their shot: [shot, from, to, text].
  const LINES = [
    ['city', 0.4, 3.0, 'Seven hundred years ago, he rose over the Spire.'], ['godrise', 0.2, 2.5, 'He wanted an army that would never die.'],
    ['godcut', 2.1, 4.3, 'So he cut the moon.'], ['scar', 0.2, 2.0, 'Its wound has bled ever since.'], ['rise', 1.2, 3.4, 'By its red light, his dead rise.'],
    ['horde', 0.3, 1.75, 'Tonight the wound bleeds out.'], ['horde', 1.85, 3.3, 'At dawn, the moon falls and his dead take everything.'],
    ['eye', 0.2, 1.7, 'One blade can stop him.'], ['colossus', 2.0, 3.9, 'He waits at the top of the Spire.'],
  ];
  // The charge: when each of the dead reaches her blade (seconds into the shot).
  const CONTACT = [0.3, 0.6, 0.85, 1.1, 1.32, 1.55, 1.78, 2.0];
  // Sounds, timed from the start of their shot: [shot, at, name, volume].
  const SFX = [
    ['cold', 0.05, 'thud', 0.5], ['cold', 1.15, 'thud', 0.6], ['cold', 2.3, 'thud', 0.7], ['cold', 3.45, 'thud', 0.8], ['cold', 3.6, 'charge', 0.9], ['cold', 3.95, 'blow_big', 0.8],
    ['cold', 4.6, 'blow_big', 1], ['cold', 4.61, 'clang_1', 0.9], ['cold', 4.63, 'quake', 1],
    ['city', 0.4, 'quake', 0.8], ['city', 0.6, 'horn', 0.6], ['city', 1.3, 'quake', 0.9], ['city', 2.2, 'quake', 1], ['city', 2.3, 'boss', 1], ['city', 2.32, 'blow_big', 0.9],
    ['godrise', 0, 'charge', 0.7], ['godrise', 1.2, 'unsheathe_01', 1], ['godrise', 1.22, 'whoosh', 1], ['godrise', 1.25, 'quake', 0.9],
    ['godcut', 0, 'charge', 1], ['godcut', 0.4, 'quake', 0.7], ['godcut', 0.75, 'windup', 1], ['godcut', 1.0, 'swish_2', 1], ['godcut', 1.35, 'slash_2', 1], ['godcut', 1.36, 'blow_big', 1], ['godcut', 1.37, 'smash', 1], ['godcut', 1.4, 'quake', 1], ['godcut', 1.56, 'clang_1', 1], ['godcut', 1.9, 'quake', 1], ['godcut', 2.0, 'magic', 0.8], ['godcut', 2.7, 'quake', 0.6], ['godcut', 3.0, 'horn', 0.6],
    ['scar', 0, 'magic', 0.5],
    ['rise', 0.4, 'smash', 0.8], ['rise', 0.45, 'quake', 0.6], ['rise', 1.3, 'spawn', 0.7], ['rise', 1.9, 'reinforce', 0.6], ['rise', 2.5, 'spawn', 0.5],
    ['horde', 0, 'horn', 0.7], ['horde', 0.5, 'reinforce', 0.5], ['horde', 1.3, 'bolt', 0.8], ['horde', 1.32, 'quake', 0.8], ['horde', 2.4, 'bolt', 0.6], ['horde', 2.42, 'quake', 0.6],
    ['eye', 0, 'quake', 0.6], ['eye', 0.4, 'charge', 0.9], ['eye', 0.72, 'blink', 0.9], ['eye', 0.74, 'clang_0', 0.5], ['draw', 0, 'unsheathe_01', 1],
    ['name', 0, 'whoosh', 1], ['name', 0.45, 'slash_1', 0.9], ['name', 0.9, 'swish_2', 1], ['draw', 0.35, 'slash_0', 1], ['draw', 0.4, 'whoosh', 1],
    ['panels', 0, 'slash_2', 0.9], ['panels', 0.35, 'slash_1', 0.9], ['panels', 0.7, 'blow_big', 0.8],
    ['colossus', 0, 'quake', 1], ['colossus', 0.1, 'horn', 0.8], ['colossus', 1.1, 'bolt', 0.7], ['colossus', 1.2, 'quake', 0.9], ['colossus', 2.3, 'boss', 1], ['colossus', 2.6, 'bolt', 0.6], ['colossus', 2.8, 'quake', 1],
    ['gaze', 0, 'charge', 1], ['gaze', 0.6, 'windup', 1],
    ['strike', 0, 'whoosh', 1], ['strike', 0.62, 'clang_1', 1], ['strike', 0.63, 'blow_big', 1], ['strike', 0.65, 'smash', 1], ['strike', 0.7, 'quake', 1],
    ['defy', 0, 'quake', 0.8], ['defy', 0.9, 'parry', 1], ['defy', 0.92, 'slash_2', 1], ['defy', 1.3, 'perfect', 0.8],
    ['title', 0.4, 'allout', 1], ['title', 0.42, 'clang_0', 0.7], ['title', 1.8, 'level_up', 0.4],
  ].concat(CONTACT.map((c, i) => ['charge', c, i % 2 ? 'slash_1' : 'slash_2', 0.85]));

  const cast = () => ({
    vesper: (D.HEROES.vesper || D.HERO).set, first: D.FOES.firstCut.set, warden: D.FOES.warden.set,
    dead: ['vh_townsfolk_001', 'vh_townsfolk_004', 'vh_townsfolk_007', 'vh_townsfolk_010', 'vh_townsfolk_013', 'vh_skeleton_002', 'vh_barbarian_002', D.FOES.ghoul.set, D.FOES.ghast.set, D.FOES.raider.set].filter((id) => A.hasSet(id)),
  });

  // A film: { shots: [[name, seconds]], lines: [[shot, from, to, text]], sfx: [[shot, at, name, vol]], draw: { shot: fn(ctx, S, k, T) },
  // music: [shot, cue], amb, noBars: { shot: 1 }, impact(shot, T) for frames without bars, titleShot (lets the bars go) }.
  function compile(f) {
    const shots = []; let t = 0; for (const [name, d] of f.shots) { shots.push([name, t, t + d]); t += d; }
    const at = (name) => (shots.find((x) => x[0] === name) || [0, 0])[1];
    return Object.assign({}, f, { SHOTS: shots, END: t, AT: at,
      LINES: (f.lines || []).map(([sh, a, b, text, col]) => [at(sh) + a, at(sh) + b, text, col]),
      SFX: (f.sfx || []).map(([sh, tt, name, v]) => [at(sh) + tt, name, v]),
      MUSIC_AT: f.music ? at(f.music[0]) + (f.music[2] || 0) : null });
  }
  I.compile = compile;
  // Play a film; then() when it ends or is skipped. opts.skippable: a tap or Esc ends it.
  I.play = function (film, then, opts) {
    opts = opts || {};
    const F = film.SHOTS ? film : compile(film);
    I.st = { t: 0, then, done: false, shake: 0, music: false, cast: cast(), f: F, skippable: opts.skippable !== false };
    if (!I.st.cast.dead.length) I.st.cast.dead = [D.FOES.ghoul.set];
    VS.audio.playMusic(null); VS.audio.playAmb(F.amb || 'wind');
  };
  I.start = (then) => I.play(I.OPENING, then, { skippable: true });
  I.update = function (dt, skip) {
    const S = I.st; if (!S || S.done) return;
    if (skip && S.skippable) { S.skipped = true; finish(); return; }
    const F = S.f, t0 = S.t; S.t += Math.min(dt, 0.1);
    for (const [at, name, v] of F.SFX) if (t0 < at && at <= S.t) VS.audio.sfx(name, v);
    if (F.MUSIC_AT != null && !S.music && S.t >= F.MUSIC_AT) { S.music = true; VS.audio.cue(F.music[1]); }
    if (S.t >= F.END) finish();
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
      ctx.lineTo(x1, y1); ctx.stroke();   // one straight cut (no jagged line)
      ctx.strokeStyle = RED; ctx.lineWidth = 1; ctx.stroke();
      if (T != null) for (let i = 0; i < 26; i++) {   // drops of red light falling from the wound
        const u = hash(i, 15) * wound, sx = x0 + r * 1.9 * u, sy = y0 - r * 0.68 * u, fall = (T * (30 + hash(i, 16) * 40) + hash(i, 17) * 90) % 110;
        ctx.fillStyle = i % 5 ? RED : '#ffb0bc'; ctx.globalAlpha = 1 - fall / 110; ctx.fillRect(Math.round(sx), Math.round(sy + fall), 1, 2 + (i % 3)); ctx.globalAlpha = 1;
      }
    }
  }
  function city(ctx, base, seed, col, lit, scale, ox) {
    const sc = scale || 1, o = ox || 0; let x = o ? -400 : -4;
    ctx.save(); ctx.translate(-o, 0); ctx.fillStyle = col;
    while (x < W() + 4 + o) {
      const w = Math.round((10 + hash(x | 0, seed) * 18) * sc), h = Math.round((14 + hash(x | 0, seed + 1) * 34) * sc);
      ctx.fillRect(x, base - h, w, h + 40);
      const roof = hash(x | 0, seed + 2);
      if (roof < 0.45) { ctx.beginPath(); ctx.moveTo(x - 1, base - h); ctx.lineTo(x + w / 2, base - h - w * 0.6); ctx.lineTo(x + w + 1, base - h); ctx.fill(); }
      else if (roof < 0.6) { ctx.fillRect(x + w / 2 - 2, base - h - 14 * sc, 4, 14 * sc); ctx.beginPath(); ctx.moveTo(x + w / 2 - 3, base - h - 14 * sc); ctx.lineTo(x + w / 2, base - h - 22 * sc); ctx.lineTo(x + w / 2 + 3, base - h - 14 * sc); ctx.fill(); }
      if (lit) { for (let j = 0; j < 4; j++) if (hash(x + j, seed + 3) < lit) { ctx.fillStyle = '#ffc870'; ctx.fillRect(Math.round(x + 2 + hash(x, j + 9) * (w - 4)), Math.round(base - h + 4 + hash(x, j + 19) * (h - 6)), 1, 1); } ctx.fillStyle = col; }
      x += w - 1;
    }
    ctx.restore();
  }
  function graves(ctx, base, seed, col, n, sc) {
    ctx.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const x = Math.round(hash(i, seed) * W()), h = Math.round((6 + hash(i, seed + 1) * 8) * sc), w = Math.round((4 + hash(i, seed + 2) * 4) * sc);
      if (hash(i, seed + 3) < 0.4) { ctx.fillRect(x - 1, base - h - 3, Math.max(2, sc * 1.4 | 0), h + 3); ctx.fillRect(x - w / 2, base - h + 1, w, Math.max(1, sc | 0)); }
      else { ctx.fillRect(x - w / 2, base - h, w, h); PX.disc(ctx, x, base - h, Math.round(w / 2), col); }
    }
  }
  function rain(ctx, T, n, a, slant) {
    ctx.fillStyle = `rgba(200,210,235,${a})`;
    for (let i = 0; i < n; i++) { const x = hash(i, 4) * (W() + 40), y = ((hash(i, 5) * H() + T * (380 + hash(i, 6) * 200)) % (H() + 20)) - 10; ctx.fillRect(Math.round(x - y * (slant || 0.12)), Math.round(y), 1, 5); }
  }
  // An actor rotated about its feet.
  function spun(ctx, set, clip, fr, ang, x, y, sc, o, rot) { ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(rot); A.actor(ctx, set, clip, fr, ang, 0, 0, sc, o); ctx.restore(); }
  // A pair of red eyes on a figure in silhouette.
  function eyes(ctx, set, clip, fr, ang, x, y, sc, a, col) {
    const b = A.box(set, clip, fr, ang, sc); if (!b) return;
    const al = a == null ? 1 : clamp(a), dir = Math.cos(ang) >= 0 ? 1 : -1, ex = Math.round(x + b.x + b.w / 2 + dir * sc), ey = Math.round(y + b.y + Math.max(3, b.h * 0.13));
    ctx.globalAlpha = al; ctx.fillStyle = col || RED; const pw = Math.max(1, Math.round(sc * 0.6)); ctx.fillRect(ex, ey, pw, 1); ctx.fillRect(ex - Math.max(2, Math.round(sc)), ey, pw, 1);
    A.tex(ctx, 'light_01', ex, ey, 6 * sc, 4 * sc, col || RED, 0.4 * al, 0, true); ctx.globalAlpha = 1;
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

  // ---- the grade: what makes a shot read as film ----------------------------------------------------
  const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  // Ink: everything already drawn becomes two tones (light above the threshold, dark below), like a
  // manga impact frame. rect limits it to part of the buffer.
  function poster(ctx, dark, light, thr, rect) {
    const [x, y, w, h] = rect || [0, 0, W(), H()]; if (w <= 0 || h <= 0) return;
    let im; try { im = ctx.getImageData(Math.max(0, x | 0), Math.max(0, y | 0), Math.min(W(), w | 0), Math.min(H(), h | 0)); } catch (e) { return; }   // a canvas that cannot be read keeps its colours
    const d = im.data, a = rgb(dark), b = rgb(light), t = (thr == null ? 0.32 : thr) * 255;
    for (let i = 0; i < d.length; i += 4) { const c = (d[i] * 0.3 + d[i + 1] * 0.55 + d[i + 2] * 0.15) > t ? b : a; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; }
    ctx.putImageData(im, Math.max(0, x | 0), Math.max(0, y | 0));
  }
  // Film grain: a fresh scatter of specks every frame.
  function grain(ctx, a, n) {
    for (let i = 0; i < (n || 260); i++) { ctx.fillStyle = Math.random() < 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a * 1.6})`; ctx.fillRect((Math.random() * W()) | 0, (Math.random() * H()) | 0, 1, 1); }
  }
  function vignette(ctx, a, col) {
    const g = ctx.createRadialGradient(W() / 2, H() / 2, H() * 0.42, W() / 2, H() / 2, W() * 0.62); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, col || '#000');
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = g; ctx.fillRect(-8, -8, W() + 16, H() + 16); ctx.restore();
  }
  // Soft out-of-focus lights drifting up behind a title.
  function bokeh(ctx, T, col, n, seed, a) {
    for (let i = 0; i < n; i++) {
      const r = 10 + hash(i, seed) * 26, x = ((hash(i, seed + 1) * W() * 1.3 + Math.sin(T * 0.4 + i) * 14) % (W() * 1.3)) - W() * 0.15, y = H() * 1.1 - ((T * (4 + hash(i, seed + 2) * 8) + hash(i, seed + 3) * H() * 1.2) % (H() * 1.3));
      const fl = 0.6 + 0.4 * Math.sin(T * (1 + hash(i, seed + 4)) + i);
      A.tex(ctx, 'light_01', x, y, r * 2.4, r * 2.4, col, (a == null ? 0.5 : a) * fl * (0.4 + 0.6 * hash(i, seed + 5)), 0, true);
      ctx.globalAlpha = 0.12 * fl; PX.disc(ctx, x, y, Math.round(r * 0.5), col); ctx.globalAlpha = 1;
    }
  }
  // Her eyes through the visor slit, drawn as manga ink in solid shapes: steel above and below with straight
  // hatching, heavy lids, brows drawn down, the irises turning red as she looks up (open 0..1).
  function mangaEyes(ctx, cx, cy, s, open, col, T) {
    const ink = '#0a0608', paper = '#ece6e8', sw = Math.round(30 * s), sh = Math.round(9 * s);
    const P = (pts) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(Math.round(x), Math.round(y)) : ctx.moveTo(Math.round(x), Math.round(y)))); ctx.closePath(); ctx.fill(); };
    // The visor: steel above and below the slit.
    const top = Math.round(cy - sh * 1.3), bot = Math.round(cy + sh * 1.0);
    ctx.fillStyle = '#1e1a1c'; ctx.fillRect(cx - 200, top - 60, 400, 60); ctx.fillRect(cx - 200, bot, 400, 60);
    ctx.fillStyle = '#4a4246'; for (let i = 0; i < 6; i++) { ctx.fillRect(cx - 200, top - 3 - i * 3, 400, 1); ctx.fillRect(cx - 200, bot + 3 + i * 3, 400, 1); }
    ctx.fillStyle = '#a89ea2'; ctx.fillRect(cx - 200, top - 1, 400, 1); ctx.fillRect(cx - 200, bot, 400, 1);
    const squint = 0.55 + 0.45 * open, eyes = [];
    for (const sx of [-1, 1]) {
      const ex = cx + sx * Math.round(22 * s), w = sw / 2, h = sh * squint * 0.5;
      // The brow, drawn down hard toward the nose.
      ctx.fillStyle = ink; P([[ex + sx * w * 1.05, cy - sh * 1.22], [ex - sx * w * 0.9, cy - sh * (0.62 + 0.1 * open)], [ex - sx * w * 0.95, cy - sh * (0.42 + 0.1 * open)], [ex + sx * w * 1.0, cy - sh * 1.02]]);
      // The white of the eye, an almond.
      const m = -sx, X = (d) => ex + m * d;
      ctx.fillStyle = paper; P([[X(-w), cy], [X(-w * 0.4), cy - h], [X(w * 0.5), cy - h * 0.9], [X(w), cy - h * 0.1], [X(w * 0.4), cy + h * 0.8], [X(-w * 0.5), cy + h * 0.7]]);
      // The iris and pupil, with a point of light.
      const ir = Math.max(2, Math.round(h * 0.95)), ix = Math.round(ex + sx * w * 0.08);
      PX.disc(ctx, ix, Math.round(cy - h * 0.05), ir, open > 0 ? R.mix('#3a3438', col, open) : '#3a3438');
      PX.disc(ctx, ix, Math.round(cy - h * 0.05), Math.max(1, Math.round(ir * 0.45)), ink);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(ix - Math.round(ir * 0.4), Math.round(cy - h * 0.5), Math.max(1, Math.round(s)), Math.max(1, Math.round(s)));
      // The upper lid, heavy, and a thin lower line.
      ctx.fillStyle = ink; P([[X(-w * 1.1), cy + 1], [X(-w * 0.4), cy - h - 2 * s], [X(w * 0.5), cy - h * 0.9 - 2 * s], [X(w * 1.12), cy - h * 0.1], [X(w * 0.5), cy - h * 0.9], [X(-w * 0.4), cy - h]]);
      ctx.fillRect(Math.round(ex - w * 0.48), Math.round(cy + h * 0.75), Math.round(w * 0.95), Math.max(1, Math.round(s * 0.6)));
      eyes.push({ x: ix, y: Math.round(cy - h * 0.05) });
    }
    return eyes;
  }
  // A manga eye panel: black, one thin box across the middle opening out from the centre; her eyes in it.
  function eyePanel(ctx, S, set, k, T, open, col) {
    fill(ctx, '#000');
    const bw = Math.round(W() * 0.7), bh = Math.round(H() * 0.34), by = Math.round(H() * 0.5 - bh / 2), grow = ease(clamp(k * 5));
    const hw = Math.round(bw / 2 * grow), cx = Math.round(W() / 2), cy = Math.round(by + bh / 2);
    if (hw < 2) return [{ x: cx, y: cy }, { x: cx, y: cy }];
    ctx.save(); ctx.beginPath(); ctx.rect(cx - hw, by, hw * 2, bh); ctx.clip();
    fill(ctx, '#ece6e8');
    const eyes = mangaEyes(ctx, cx, cy + 2, 2.0 + 0.15 * k, open, col, T);
    if (open > 0) for (const e of eyes) { A.tex(ctx, 'light_01', e.x, e.y, 40 * open, 18 * open, col, 0.6 * open, 0, true); }
    ctx.restore();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - hw - 1, by - 1, hw * 2 + 2, 1); ctx.fillRect(cx - hw - 1, by + bh, hw * 2 + 2, 1); ctx.fillRect(cx - hw - 1, by, 1, bh); ctx.fillRect(cx + hw, by, 1, bh);
    return eyes;
  }

  // ---- the words: queued in pixel-buffer coordinates, drawn at full resolution after the shot ------------
  function say(S, kind, text, x, y, o) { (S.words || (S.words = [])).push(Object.assign({ kind, text, x, y }, o || {})); }
  function words(S) {
    const c = R.pxText(), sx = R.W / W(), sy = R.H / H(), u = R.H / 720, list = S.words || []; S.words = [];
    for (const w of list) {
      const x = Math.round(w.x * sx), y = Math.round(w.y * sy), al = w.a == null ? 1 : w.a;
      c.save(); c.globalAlpha = al; c.textAlign = w.align || (w.kind === 'card' ? 'left' : 'center');
      if (w.kind === 'line') {
        const sz = Math.round(w.size * 1.9 * u); c.font = `${sz}px Adventurer, sans-serif`; c.textBaseline = w.mid ? 'middle' : 'alphabetic';
        if ('letterSpacing' in c) c.letterSpacing = Math.round((w.spacing || 0.6) * u * 1.6) + 'px';
        c.lineJoin = 'round'; c.lineWidth = Math.max(3, sz * 0.18); c.strokeStyle = 'rgba(5,3,7,0.95)'; c.strokeText(w.text, x, y);
        c.fillStyle = w.col || '#fff'; c.fillText(w.text, x, y);
      } else if (w.kind === 'card') {
        // A name card: a red bar slides in, the name over it, the title under it.
        const kk = clamp((w.k || 0) * 3), sz = Math.round(36 * u), ss = Math.round(20 * u), right = c.textAlign === 'right';
        c.textBaseline = 'alphabetic';
        let subW = 0; if (w.sub) { c.font = `${ss}px Adventurer, sans-serif`; if ('letterSpacing' in c) c.letterSpacing = Math.round(3 * u) + 'px'; subW = c.measureText(w.sub).width; if ('letterSpacing' in c) c.letterSpacing = '0px'; }
        c.font = `${sz}px Adventurer, sans-serif`;
        const tw = Math.max(c.measureText(w.text).width, subW), bw = Math.round((tw + 40 * u) * ease(kk)), bx = right ? x - bw + Math.round(8 * u) : x - Math.round(8 * u);
        c.fillStyle = 'rgba(5,3,7,0.7)'; c.fillRect(bx, y - sz - 4 * u, bw, sz + ss + 26 * u);
        c.fillStyle = RED; c.fillRect(right ? bx + bw - 4 * u : bx, y - sz - 4 * u, Math.round(4 * u), sz + ss + 26 * u);
        c.globalAlpha = al * clamp(kk * 2 - 0.4);
        const tx = right ? x - Math.round(6 * u) : x + Math.round(6 * u);
        c.lineJoin = 'round'; c.lineWidth = Math.max(3, sz * 0.16); c.strokeStyle = '#050307'; c.strokeText(w.text, tx, y); c.fillStyle = w.col || '#ffffff'; c.fillText(w.text, tx, y);
        if (w.sub) { c.font = `${ss}px Adventurer, sans-serif`; if ('letterSpacing' in c) c.letterSpacing = Math.round(3 * u) + 'px'; c.lineWidth = Math.max(2, ss * 0.2); c.strokeText(w.sub, tx, y + ss + 10 * u); c.fillStyle = '#ffb8c4'; c.fillText(w.sub, tx, y + ss + 10 * u); }
      } else if (w.kind === 'serif') {
        // A title card's words: small serif capitals, widely spaced, still.
        const sz = Math.round(w.size * 1.6 * u); c.font = `600 ${sz}px "Times New Roman", Georgia, serif`; c.textBaseline = 'middle'; c.textAlign = 'center';
        if ('letterSpacing' in c) c.letterSpacing = Math.round(sz * (w.spacing == null ? 0.12 : w.spacing)) + 'px';
        c.fillStyle = w.col || '#fff'; c.fillText(w.text, x, y);
      } else if (w.kind === 'spaced') {
        // Kinetic letters: they arrive far apart and flickering and draw together (k = seconds in).
        const k = w.k || 0, sz = Math.round(w.size * 1.6 * u), e = ease(clamp(k / (w.dur || 1.2)));
        c.font = `${w.serif ? '600 ' : ''}${sz}px ${w.serif ? '"Times New Roman", Georgia, serif' : 'Adventurer, sans-serif'}`; c.textBaseline = 'middle'; c.textAlign = 'left';
        const chars = [...w.text], ws = chars.map((ch) => c.measureText(ch).width), gap = sz * ((w.from == null ? 1.2 : w.from) + ((w.to == null ? 0.25 : w.to) - (w.from == null ? 1.2 : w.from)) * e);
        let tot = ws.reduce((s, v) => s + v, 0) + gap * (chars.length - 1), px0 = x - tot / 2;
        chars.forEach((ch, i) => {
          const on = k > 0.5 || hash(i, Math.floor(k * 24)) < 0.35 + k * 1.3;
          if (on && ch !== ' ') {
            if (w.glow) { c.shadowColor = w.glow; c.shadowBlur = Math.round(sz * 0.5); }
            c.fillStyle = w.col || '#fff'; c.fillText(ch, px0, y); c.shadowBlur = 0;
          }
          px0 += ws[i] + gap;
        });
      } else if (w.kind === 'knock') {
        // The scene seen through giant letters: everything else covered (col), the words cut out of it.
        const face = (z) => `900 ${z}px Impact, "Haettenschweiler", "Arial Narrow", "Helvetica Neue", Arial, sans-serif`;
        let sz = Math.round(R.H * (w.size || 0.9)); c.fillStyle = w.col || '#000'; c.fillRect(0, 0, R.W, R.H);
        c.globalCompositeOperation = 'destination-out'; c.globalAlpha = 1;
        c.font = face(sz); c.textBaseline = 'middle'; c.textAlign = 'center';
        if (!w.repeat) { const fit = R.W * 0.94 / (c.measureText(w.text).width * (w.sx || 0.82)); if (fit < 1) { sz = Math.floor(sz * fit); c.font = face(sz); } }   // one word always fits the screen
        if ('letterSpacing' in c) c.letterSpacing = Math.round(sz * -0.02) + 'px';
        c.save(); c.translate(x, y); c.scale(w.sx || 0.82, 1);
        const tw = c.measureText(w.text).width + sz * 0.12;
        if (w.repeat) { const off = ((w.scroll || 0) * u) % tw; for (let xx = -tw * 3 - off; xx < tw * 3; xx += tw) c.fillText(w.text, xx, 0); }
        else c.fillText(w.text, 0, 0);
        c.restore(); c.globalCompositeOperation = 'source-over';
      } else if (w.kind === 'punch') {
        // A short, heavy line over the action; it lands hard and shudders.
        const k = w.k || 0, pop = k < 0.1 ? 1 + (0.1 - k) * 3 : 1, sz = Math.round(w.size * 1.6 * u * pop);
        c.font = `900 ${sz}px Impact, "Haettenschweiler", "Arial Narrow", "Helvetica Neue", Arial, sans-serif`; c.textBaseline = 'middle'; c.textAlign = 'center';
        if ('letterSpacing' in c) c.letterSpacing = Math.round(sz * 0.02) + 'px';
        const jx = k < 0.25 ? Math.round((Math.random() - 0.5) * 6 * u) : 0, jy = k < 0.25 ? Math.round((Math.random() - 0.5) * 4 * u) : 0;
        if (k < 0.2) { c.globalAlpha = al * 0.7; c.fillStyle = '#00e0ff'; c.fillText(w.text, x + jx - 4 * u, y + jy); c.fillStyle = '#ff0040'; c.fillText(w.text, x + jx + 4 * u, y + jy); c.globalAlpha = al; }
        c.fillStyle = 'rgba(0,0,0,0.75)'; c.fillText(w.text, x + jx + Math.round(3 * u), y + jy + Math.round(3 * u));
        c.fillStyle = w.col || '#ffffff'; c.fillText(w.text, x + jx, y + jy);
      } else if (w.kind === 'track') {
        // A tracking box: corner brackets that snap down onto the target, its coordinates beside it.
        const k = w.k || 0, snap = 1 + 0.8 * (1 - ease(clamp(k / 0.18))), bw = Math.round(w.w * sx * snap), bh = Math.round(w.h * sy * snap), L = Math.round(Math.min(bw, bh) * 0.28);
        const x0 = x - bw / 2, y0 = y - bh / 2, lw = Math.max(1, Math.round(1.5 * u)); c.fillStyle = w.col || '#ffffff';
        for (const [cx2, cy2, dx, dy] of [[x0, y0, 1, 1], [x0 + bw, y0, -1, 1], [x0, y0 + bh, 1, -1], [x0 + bw, y0 + bh, -1, -1]]) { c.fillRect(Math.round(cx2 - (dx < 0 ? L : 0)), Math.round(cy2 - (dy < 0 ? lw : 0)), L, lw); c.fillRect(Math.round(cx2 - (dx < 0 ? lw : 0)), Math.round(cy2 - (dy < 0 ? L : 0)), lw, L); }
        c.fillRect(Math.round(x - lw), Math.round(y - lw), lw * 2, lw * 2);
        if (k > 0.12) {
          const n = (v) => String(Math.abs(Math.round(v)) % 1000).padStart(3, '0'), j = k < 0.5 ? Math.floor(Math.random() * 9) : 0;
          c.font = `${Math.round(13 * u)}px "Courier New", ui-monospace, monospace`; c.textBaseline = 'bottom'; c.textAlign = 'left';
          c.fillText(w.label || `x ${n(w.x * 4 + j)}  y ${n(w.y * 4 + j)}`, Math.round(x0), Math.round(y0 - 4 * u));
          if (w.sub) { c.textBaseline = 'top'; c.fillText(w.sub, Math.round(x0), Math.round(y0 + bh + 4 * u)); }
        }
      } else if (w.kind === 'link') {
        // A dotted line drawn from one tracked thing to another (k: how far it has got).
        const x2 = Math.round(w.x2 * sx), y2 = Math.round(w.y2 * sy), e = clamp(w.k == null ? 1 : w.k);
        c.strokeStyle = w.col || '#ffffff'; c.lineWidth = Math.max(1, Math.round(1.2 * u)); c.setLineDash([Math.round(3 * u), Math.round(5 * u)]);
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + (x2 - x) * e, y + (y2 - y) * e); c.stroke(); c.setLineDash([]);
        if (w.label && e >= 1) { c.font = `${Math.round(12 * u)}px "Courier New", ui-monospace, monospace`; c.fillStyle = w.col || '#ffffff'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(w.label, Math.round((x + x2) / 2 + 8 * u), Math.round((y + y2) / 2)); }
      } else if (w.kind === 'rings') {
        // Rings round an eye: broken arcs turning at different speeds, with fine ticks.
        const r = w.r * sy, T = w.T || 0; c.strokeStyle = w.col || '#ffffff'; c.lineWidth = Math.max(1, Math.round(1.2 * u));
        for (let i = 0; i < 4; i++) { const rr = r * (0.55 + i * 0.32), a0 = T * (i % 2 ? -0.8 : 1.1) * (1 + i * 0.3) + i; for (let s = 0; s < 3; s++) { c.beginPath(); c.arc(x, y, rr, a0 + s * 2.09, a0 + s * 2.09 + 1.2 + 0.25 * i); c.stroke(); } }
        for (let i = 0; i < 48; i++) { const a = i / 48 * 6.283 + T * 0.3, r0 = r * 1.62, r1 = r0 + (i % 4 ? 3 : 8) * u; c.beginPath(); c.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); c.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); c.stroke(); }
      } else {
        // A big title: slams in from larger with a white flash and a brief colour split, then holds crisp
        // (track: the letters also draw together from wide apart).
        const k = w.k || 0, punch = k < 0.15 ? 1 + (0.15 - k) * 4 : 1, sz = Math.round(w.size * 1.6 * u * punch);
        c.font = `${sz}px Adventurer, sans-serif`; c.textBaseline = 'middle'; c.textAlign = 'center';
        if ('letterSpacing' in c) c.letterSpacing = Math.round(sz * (w.track ? 0.04 + 0.5 * (1 - ease(clamp(k / 1.4))) : 0.04)) + 'px';
        if (k < 0.3) { const o = Math.round((0.3 - k) * 40 * u); c.globalAlpha = al * 0.6; c.fillStyle = '#00e0ff'; c.fillText(w.text, x - o, y); c.fillStyle = '#ff0040'; c.fillText(w.text, x + o, y); c.globalAlpha = al; }
        c.lineJoin = 'round'; c.lineWidth = Math.max(4, sz * 0.12); c.strokeStyle = '#050307'; c.strokeText(w.text, x, y + Math.round(sz * 0.05)); c.strokeText(w.text, x, y);
        const g = c.createLinearGradient(0, y - sz / 2, 0, y + sz / 2); g.addColorStop(0, '#ffb0bc'); g.addColorStop(0.5, '#ff2a44'); g.addColorStop(1, '#8a1022');
        c.fillStyle = k < 0.06 ? '#ffffff' : g; c.fillText(w.text, x, y);
      }
      c.restore();
    }
  }

  // ---- the shots -------------------------------------------------------------------------------------
  const SH = {};
  // The cold open: title cards cut hard between paper and black, the way a trailer begins. Then one
  // white frame in ink: his crowned head, close, and two red eyes.
  const COLD = [[0, 'BEFORE THE MOON BLED', 0], [1.15, 'BEFORE THE DEAD WOKE', 1], [2.3, 'AND BEFORE THE LAST NIGHT FELL', 0], [3.45, 'THERE WAS', 1]];
  SH.cold = function (ctx, S, k, T) {
    if (T < 4.6) {
      let c = COLD[0]; for (const x of COLD) if (T >= x[0]) c = x;
      const t = T - c[0], paper = !c[2], last = c === COLD[3];
      fill(ctx, paper ? '#ebe6e3' : '#000');
      if (paper) { vignette(ctx, 0.22, '#5a5052'); for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(40,30,34,0.25)'; ctx.fillRect(Math.round(hash(i, 970 + c[0] * 10) * W()), Math.round(hash(i, 971) * H()), 1, 1 + (i % 2)); } }   // dust on the paper
      else K().embers(ctx, T, last ? 14 : 0, 0, W(), RED);
      // THERE WAS alone, then it steps up and ONE lands under it, large and red: two lines, never one over the other.
      const one = last && t >= 0.5, up = one ? ease(clamp((t - 0.5) / 0.12)) : 0;
      say(S, 'serif', c[1], W() / 2, H() * (0.5 - 0.14 * up), { size: last ? 16 - 3 * up : 13, col: paper ? '#141012' : '#f4eef0', a: clamp(t * 7), spacing: last ? 0.16 : 0.12 });
      if (one) { const j = t < 0.6 ? Math.round((Math.random() - 0.5) * 3) : 0; say(S, 'serif', 'ONE', W() / 2 + j, H() * 0.55, { size: 72, col: '#d8162e', a: clamp((t - 0.5) * 12), spacing: 0.06 }); if (t < 0.56) kick(S, 4); }
      return;
    }
    if (T < 5.2) {
      // The flash: white, his head and horns in ink filling the frame, the eyes the only colour.
      const t = T - 4.6, sc = 14 + t * 5, ex = Math.round(W() / 2), ey = Math.round(H() * 0.5);
      fill(ctx, '#ffffff');
      { const g = ctx.createRadialGradient(ex, ey, 4, ex, ey, W() * 0.6); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#c8c2c4'); ctx.fillStyle = g; ctx.fillRect(-8, -8, W() + 16, H() + 16); }
      godAt(ctx, S, ex, Math.round(H() * 0.94), 3, T, { col: '#000', pose: 'raise' });   // his whole figure in ink, the sword up
      kick(S, t < 0.1 ? 8 : 2);
      return;
    }
    fill(ctx, '#000');
  };
  // Seven hundred years ago: a city asleep under the white moon, the Spire over its roofs. The ground
  // starts to shake; birds burst off the roofs; people run in the streets; and behind the Spire, out of
  // the night, he rises, a shape taller than the tower, until his eyes ignite.
  SH.city = function (ctx, S, k, T) {
    // Reworked 2026-11-10: he rises behind the Spire until his head and horns stand far above its tip; the
    // camera pushes in and tilts up with him; the city shakes and its windows go dark; the people in the
    // street scatter away from him, small and clear; lamps on posts light the street.
    const pan = T * 10, quake = clamp((T - 0.4) / 0.6), rise = ease(clamp((T - 0.5) / 2.1)), push = 1 + 0.07 * ease(k);
    const sx = Math.round(W() * 0.46 - pan * 0.3), ey = Math.round(H() * (1.3 - 0.98 * rise)), spTip = Math.round(H() * 0.62);   // low enough that all of him stands in the frame
    const shake = quake * (rise < 1 ? 1 : 0.4), qx = Math.round(Math.sin(T * 37) * shake), qy = Math.round(Math.cos(T * 29) * shake);
    grad(ctx, ['#05040c', R.mix('#141026', '#2a0a18', rise), R.mix('#2a1830', '#4a0c1c', rise)]);
    stars(ctx, 80, 0.8 * (1 - 0.5 * rise), 3, T);
    ctx.save(); ctx.translate(W() / 2, H() * 0.9); ctx.scale(push, push); ctx.translate(-W() / 2 + qx, -H() * 0.9 + qy);
    moon(ctx, W() * 0.8 - pan * 0.05, H() * 0.18, H() * 0.14, '#f4ece6', 'rgba(255,240,230,0.28)', 0);
    // Him, rising behind everything, against a red glow that swells with him.
    if (rise > 0) {
      // He rises out of the city behind the roofs and comes to stand on the Spire's tip (the real knight, crisp).
      const fy = Math.round(H() * 1.15 + (spTip + 1 - H() * 1.15) * rise);
      A.tex(ctx, 'light_01', sx, fy - 40, W() * 0.9 * (0.5 + rise), H() * 1.2, '#a01838', 0.6 * rise, 0, true);
      godAt(ctx, S, sx, fy, 2, T, { col: '#140409', amt: 0.35, pose: rise < 1 ? 'hover' : T > 2.3 ? 'raise' : 'stand', aura: 0.5 + 0.4 * rise, crown: rise >= 1 });
      if (rise > 0.2) A.fx(ctx, 'fc_wind', T, sx, fy - 50, 1.4, 0.7 * rise);   // ash and torn cloth streaming off him
      if (rise < 1) for (let i = 0; i < 16; i++) { const ph = (T * 1.4 + hash(i, 611)) % 1, px = sx + (hash(i, 612) - 0.5) * 40, py = fy - 10 + ph * 40; ctx.fillStyle = `rgba(30,12,20,${0.8 * (1 - ph)})`; ctx.fillRect(Math.round(px), Math.round(py), 1, 1); }
    }
    // The city: its windows going dark as the ground shakes.
    city(ctx, H() * 0.7, 7, '#1c1222', 0.25 * (1 - 0.7 * rise), 1.1, pan * 0.5);
    // The Spire, a black needle in front of him: he stands behind it, his head above its tip (drawn in front of the far roofs so it stands clear).
    ctx.fillStyle = '#6a2a40'; ctx.beginPath(); ctx.moveTo(sx - 21, H()); ctx.lineTo(sx - 4, spTip + 12); ctx.lineTo(sx, spTip - 1); ctx.lineTo(sx + 4, spTip + 12); ctx.lineTo(sx + 21, H()); ctx.fill();   // lit edge from his glow
    ctx.fillStyle = '#22121e'; ctx.beginPath(); ctx.moveTo(sx - 20, H()); ctx.lineTo(sx - 3, spTip + 12); ctx.lineTo(sx, spTip); ctx.lineTo(sx + 3, spTip + 12); ctx.lineTo(sx + 20, H()); ctx.fill();
    for (let i = 0; i < 6; i++) { const on = quake > 0.5 && hash(i, 613) < rise ? 0 : 1; ctx.fillStyle = `rgba(255,200,120,${on * (0.45 + 0.25 * Math.sin(T * 3 + i))})`; ctx.fillRect(sx + (i % 2 ? 1 : -2), Math.round(spTip + 16 + i * H() * 0.05), 1, 2); }
    city(ctx, H() * 0.78, 13, '#100a14', 0.4 * (1 - 0.6 * rise), 0.9, pan);
    // The street, lamps on posts.
    const gy = Math.round(H() * 0.79);   // the street, high enough for two lanes of people above the letterbox
    const st = ctx.createLinearGradient(0, gy - 8, 0, H()); st.addColorStop(0, '#24141c'); st.addColorStop(1, '#0a0508'); ctx.fillStyle = st; ctx.fillRect(-8, gy - 8, W() + 16, H());
    for (let i = 0; i < 5; i++) { const lx = Math.round(((i * 84 + 30 - pan) % (W() + 84) + W() + 84) % (W() + 84) - 42); ctx.fillStyle = '#08040a'; ctx.fillRect(lx, gy - 20, 2, 21); ctx.fillRect(lx - 2, gy - 21, 6, 2); ctx.fillStyle = '#ffd080'; ctx.fillRect(lx, gy - 19, 2, 2); A.tex(ctx, 'light_01', lx + 1, gy - 18, 22, 22, '#ffa040', 0.22, 0, true); A.tex(ctx, 'light_01', lx + 1, gy, 40, 8, '#ffa040', 0.18, 0, true); }
    ctx.restore();
    // The people flee (2026-11-10): two lanes along the street, in their own colours under the lamps, each
    // running away from where he rises; the near lane larger.
    for (let i = 0; i < 12; i++) {
      const t0 = 0.4 + hash(i, 601) * 1.5; if (T < t0) continue;
      const near = i % 2, x0 = W() * (0.32 + hash(i, 603) * 0.36), dir = x0 < sx ? -1 : 1, sp = (near ? 70 : 50) + hash(i, 602) * 30, x = x0 + dir * sp * (T - t0), y = gy + (near ? 15 : 5) + (i % 3);
      if (x < -20 || x > W() + 20) continue;
      A.actor(ctx, deadSet(S, i % 5), 'Run', Math.floor(T * 14 + i * 3) % 15, dir > 0 ? 0 : Math.PI, Math.round(x), y, near ? 1.25 : 0.95, { flash: near ? 0.15 : 0.35, flashCol: '#1a0a14' });
    }
    // Birds bursting off the roofs.
    for (let i = 0; i < 20; i++) { const t0 = 0.5 + hash(i, 604) * 0.8, a = T - t0; if (a < 0) continue; const bx = W() * (0.1 + hash(i, 605) * 0.8) + (hash(i, 606) - 0.5) * a * 60, by = H() * 0.7 - a * (50 + hash(i, 607) * 50); if (by < -5) continue; const fl = Math.floor(T * 14 + i) % 2; ctx.fillStyle = '#0a0610'; ctx.fillRect(Math.round(bx) - 2, Math.round(by) - fl, 2, 1); ctx.fillRect(Math.round(bx) + 1, Math.round(by) - fl, 2, 1); ctx.fillRect(Math.round(bx), Math.round(by), 1, 1); }
    kick(S, quake * 1.2 + (T > 2.3 && T < 2.4 ? 4 : 0));
    if (T > 2.3 && T < 2.36) fill(ctx, '#ffffff', 0.3);   // the moment he stands at full height
    if (T < 0.35) fill(ctx, '#000', 1 - T / 0.35);
    if (k > 0.9) fill(ctx, '#000', (k - 0.9) / 0.1);
  };
  // He towers over the Spire against the white moon, darkness pouring off him; he draws the sword back flat,
  // along the line the cut will take across the moon.
  SH.godrise = function (ctx, S, k, T) {
    const push = 1 + 0.06 * ease(k), raise = T > 1.2, mx = W() / 2;
    grad(ctx, ['#04030a', '#120a1c', '#20101c']);
    stars(ctx, 60, 0.7, 23, T);
    ctx.save(); ctx.translate(mx, H() * 0.6); ctx.scale(push, push); ctx.translate(-mx, -H() * 0.6);
    moon(ctx, mx + (raise ? Math.sin(T * 60) * 1.5 : 0), H() * 0.34, H() * 0.34, '#f4ece6', 'rgba(255,240,230,0.3)', 0);
    { const rg = ctx.createRadialGradient(mx, H() * 0.7, 4, mx, H() * 0.7, W() * 0.5); rg.addColorStop(0, 'rgba(30,0,8,0.8)'); rg.addColorStop(1, 'rgba(30,0,8,0)'); ctx.fillStyle = rg; ctx.fillRect(-8, -8, W() + 16, H() + 16); }
    // Him on the Spire's tip against the moon: he calls his army (arms out, the fire rising round him, his runes
    // opening on the roofs far below), then draws his sword back along the line the cut will take, the moon running
    // down its edge (his animation and effects packs: C_Command, C_Cut, fc_aura, fc_summon, fc_glint).
    A.tex(ctx, 'light_01', mx, H() * 0.55, 140, 150, '#a01838', 0.35, 0, true);
    if (!raise) for (let i = 0; i < 4; i++) A.fx(ctx, 'fc_summon', T + i * 0.3, mx + (i - 1.5) * 52, H() * (0.9 + (i % 2) * 0.05), 0.9, clamp(T * 2 - i * 0.25));
    godAt(ctx, S, mx, Math.round(H() * 0.88), 2, T, { pose: raise ? 'cut' : 'command', ft: raise ? 0.18 * clamp((T - 1.2) / 0.5) : null, col: '#0a0408', amt: 0.3, crown: true });
    if (raise) A.fx(ctx, 'fc_glint', T - 1.3, mx - 22, H() * 0.6, 1, 1, -1.1);   // the moon running down his blade
    // The tip of the Spire beneath his feet.
    ctx.fillStyle = '#030204'; ctx.beginPath(); ctx.moveTo(mx - 30, H() + 10); ctx.lineTo(mx - 4, H() * 0.88); ctx.lineTo(mx + 4, H() * 0.88); ctx.lineTo(mx + 30, H() + 10); ctx.fill();
    ctx.restore();
    K().hStreaks(ctx, 20, 'rgba(255,255,255,0.15)', 613, T, 900);
    if (raise && T < 1.3) { fill(ctx, '#ffffff', 0.5); kick(S, 6); }
    kick(S, 0.8);
    if (k > 0.92) fill(ctx, '#ffffff', (k - 0.92) / 0.08);
  };
  // The cut (rebuilt 2026-11-10), seen from the city below: the god behind the Spire, small and sharp, his
  // sword drawn back flat; light gathers on the blade; one burning line sweeps across the moon along the
  // wound; the moon splits, and red light pours out of the gap onto the city as its windows go dark.
  SH.godcut = function (ctx, S, k, T) {
    const mx = W() * 0.5, my = H() * 0.34, r = H() * 0.3, ang = -0.34, ca = Math.cos(ang), sa = Math.sin(ang);
    const x0 = mx - r * 0.95, y0 = my + r * 0.34, WL = r * 2.02, split = clamp((T - 1.55) / 1.6), sw = clamp((T - 1.15) / 0.3);
    const red = ease(split);
    grad(ctx, [R.mix('#04030c', '#14020a', red), R.mix('#120a22', '#4a0816', red), R.mix('#24142a', '#8a1424', red)]);
    stars(ctx, 60, 0.7 * (1 - red * 0.6), 23, T);
    const shake = T < 1.15 ? Math.sin(T * 50) * 1.5 * clamp(T / 1.1) : 0;
    if (split <= 0) {
      moon(ctx, mx + shake, my, r, R.mix('#f4ece6', '#ffe0e4', clamp(T / 1.1)), 'rgba(255,240,230,0.3)', 0);
      // The cut appearing along the wound line as the stroke passes.
      if (sw > 0) { const L = WL * ease(sw); ctx.save(); ctx.translate(x0, y0); ctx.rotate(ang); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, -1, L, 2); ctx.restore(); }
    } else {
      // The two halves pushed apart along the cut, the gap white-hot, then red.
      const sep = ease(split) * 5, nx = -sa, ny = ca;
      const half = (sg) => { ctx.save(); ctx.beginPath(); const L = W() * 2; ctx.moveTo(x0 - ca * L, y0 - sa * L); ctx.lineTo(x0 + ca * L, y0 + sa * L); ctx.lineTo(x0 + ca * L + nx * sg * L, y0 + sa * L + ny * sg * L); ctx.lineTo(x0 - ca * L + nx * sg * L, y0 - sa * L + ny * sg * L); ctx.closePath(); ctx.clip(); ctx.translate(nx * sg * sep, ny * sg * sep); moon(ctx, mx, my, r, R.mix('#f4ece6', '#ff8a98', red), 'rgba(255,40,70,0.5)', 0); ctx.restore(); };
      half(-1); half(1);
      ctx.save(); ctx.translate(x0, y0); ctx.rotate(ang); const gw = Math.max(2, Math.round(sep * 2)); ctx.fillStyle = split < 0.25 ? '#ffffff' : '#ff1a34'; ctx.fillRect(-2, -gw / 2, WL + 4, gw); ctx.fillStyle = '#ffd0d6'; ctx.fillRect(2, -0.5, WL - 4, 1); ctx.restore();
      A.tex(ctx, 'light_01', x0 + ca * WL / 2, y0 + sa * WL / 2, WL * 1.6, r * 0.5, split < 0.25 ? '#ffffff' : RED, 0.8, ang, true);
    }
    // The land: the Spire, the god behind it, the city.
    const hz = Math.round(H() * 0.86), gx = Math.round(mx), gy = Math.round(H() * 0.64);   // he stands on the Spire's tip, in front of the moon
    if (red > 0) A.tex(ctx, 'light_01', mx, hz, W() * 1.3, 60, RED, 0.6 * red, 0, true);
    A.tex(ctx, 'light_01', gx, gy - 40, 110, 110, red > 0 ? '#ff3a52' : '#a0a0c0', 0.25, 0, true);
    if (!S.noGod) godAt(ctx, S, gx, gy, 2, T, { pose: 'cut', ft: T < 1.15 ? 0.18 : 0.18 + 0.82 * clamp((T - 1.15) / 0.5), col: '#0a0408', amt: 0.3, crown: true });
    if (T > 1.1 && T < 1.75) A.fx(ctx, 'fc_crescent', T - 1.1, mx, my + r * 0.05, r / 120, 1, ang);   // his cut, a crescent of light across the moon
    if (T < 1.15 && !S.noGod) { const c = clamp(T / 1.1); A.tex(ctx, 'light_01', gx - 30, gy - 30, 30 + 40 * c, 30 + 40 * c, '#ffffff', 0.4 + 0.5 * c, 0, true); }   // light gathering on his blade
    ctx.fillStyle = '#0c0610'; ctx.beginPath(); ctx.moveTo(mx - 9, hz + 4); ctx.lineTo(mx - 2, H() * 0.68); ctx.lineTo(mx, H() * 0.64); ctx.lineTo(mx + 2, H() * 0.68); ctx.lineTo(mx + 9, hz + 4); ctx.fill();
    city(ctx, H() * 0.84, 7, '#1c1222', 0.3 * (1 - red), 1.0, 0);
    city(ctx, H() * 0.92, 13, '#0c0810', 0.4 * (1 - red), 0.9, 0);
    // The stroke: a burning line along the wound, from off the frame across the moon.
    if (sw > 0 && sw < 1) { const sx = x0 - ca * W(), L = W() + WL * ease(sw); A.tex(ctx, 'light_01', sx + ca * L / 2, y0 - sa * W() + sa * L / 2, L, 34, '#ffffff', 0.9, ang, true); A.tex(ctx, 'light_01', sx + ca * L / 2, y0 - sa * W() + sa * L / 2, L, 90, '#ff6a8a', 0.4, ang, true); kick(S, 4); }
    if (T > 1.45 && T < 1.55) fill(ctx, '#ffffff', 0.7);
    // The red pouring out of the gap down onto the city.
    if (split > 0) for (let i = 0; i < 26; i++) {
      const u = 0.06 + hash(i, 551) * 0.88, sx2 = x0 + ca * WL * u, sy2 = y0 + sa * WL * u, len = (hz - sy2) * clamp(split * 1.5 - hash(i, 552) * 0.4), w2 = 1 + (i % 3 === 0 ? 1 : 0);
      if (len <= 0) continue; ctx.fillStyle = `rgba(255,${40 + Math.round(hash(i, 553) * 60)},70,${0.4 + 0.3 * hash(i, 554)})`; ctx.fillRect(Math.round(sx2), Math.round(sy2), w2, Math.round(len));
      const ph = (T * (0.8 + hash(i, 555) * 0.5) + hash(i, 556)) % 1; ctx.fillStyle = '#ffd0d6'; ctx.fillRect(Math.round(sx2), Math.round(sy2 + (hz - sy2) * ph), 1, 2);
    }
    if (split > 0) K().embers(ctx, T, 30, 0, W(), RED);
    kick(S, (T > 1.45 && T < 1.9 ? 5 : 0.6));
  };
  // The cut seen from the city below, without him in the shot (2026-11-11: he is filmed at a man's scale on the summit,
  // js/story.js FC_DEED): his crescent of light sweeps across the moon, it splits, and the red pours down.
  SH.mooncut = function (ctx, S, k, T) { S.noGod = true; try { SH.godcut(ctx, S, k, T); } finally { S.noGod = false; } };
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
  // The dead rise. First, close on the ground: it cracks red and a hand bursts out. Then, wide: a ridge
  // against the bleeding moon, and the dead stand up on it one by one in a clean row, black on red, their
  // eyes lighting as they rise.
  function hand(ctx, x, y, L, col, rim) {
    const draw = (dx, dy, c) => {
      ctx.fillStyle = c; const top = y - L;
      ctx.fillRect(x - 4 + dx, top + 8 + dy, 8, L - 8);                   // the forearm
      ctx.fillRect(x - 6 + dx, top + dy, 12, 10);                          // the palm
      for (let f = 0; f < 4; f++) ctx.fillRect(x - 6 + f * 3 + dx, top - 7 + (f === 0 || f === 3 ? 2 : 0) + dy, 2, 8);   // fingers, clawed
      ctx.fillRect(x + 6 + dx, top + 3 + dy, 4, 2);                         // the thumb
    };
    draw(1, -1, rim); draw(0, 0, col);
  }
  SH.rise = function (ctx, S, k, T) {
    // Rebuilt 2026-11-10: a graveyard under the red moon; the dead claw up out of their graves one after
    // another, in their own colours under a red cast, dirt bursting up around them, and start to walk.
    const hz = Math.round(H() * 0.52), push = 1 + 0.05 * ease(k);
    grad(ctx, ['#0a0206', '#3a0812', '#6a1020']);
    stars(ctx, 30, 0.35, 31, T);
    ctx.save(); ctx.translate(W() / 2, H() * 0.8); ctx.scale(push, push); ctx.translate(-W() / 2, -H() * 0.8);
    moon(ctx, W() * 0.72, H() * 0.2, H() * 0.2, '#ff4a5e', 'rgba(255,40,70,0.55)', 1, T);
    const gr = ctx.createLinearGradient(0, hz, 0, H()); gr.addColorStop(0, '#2a0810'); gr.addColorStop(1, '#0a0205'); ctx.fillStyle = gr; ctx.fillRect(-20, hz, W() + 40, H());
    A.tex(ctx, 'light_01', W() * 0.6, hz + 4, W() * 1.2, 40, '#ff3048', 0.35, 0, true);
    for (let i = 0; i < 4; i++) A.tex(ctx, 'smoke_04', ((hash(i, 731) * W() * 1.4 + T * (6 + i * 3)) % (W() * 1.4)) - W() * 0.2, hz + 6 + i * 10, W() * 0.8, 24, '#4a0c18', 0.45, 0, false);
    // The graves, far to near, and the dead in them.
    const G = [];
    for (let i = 0; i < 9; i++) { const row = Math.floor(i / 3), col = i % 3, d = row / 2, x = W() * (0.18 + col * 0.32 + [0, 0.14, -0.08][row] + (hash(i, 733) - 0.5) * 0.06), y = hz + 10 + Math.pow(d, 1.3) * (H() - BAR - hz - 26); G.push({ i, d, x: Math.round(x), y: Math.round(y), t0: 0.15 + ((i * 0.41) % 1) * 1.8 }); }   // three rows, spread evenly
    G.sort((a, b) => a.y - b.y);
    for (const g of G) {
      const sc = 0.7 + g.d * 0.9, p = clamp((T - g.t0) / 0.7), set = deadSet(S, g.i + 2);
      // The headstone behind the grave, the mound in front of it.
      ctx.fillStyle = '#120408'; const sw = Math.round(7 * sc), sh = Math.round(10 * sc); ctx.fillRect(g.x - Math.round(sw / 2) - Math.round(10 * sc), g.y - sh, sw, sh); PX.disc(ctx, g.x - Math.round(10 * sc), g.y - sh, Math.round(sw / 2), '#120408');
      if (p > 0 && p < 1) { A.tex(ctx, 'light_01', g.x, g.y, 30 * sc, 12 * sc, RED, 0.6 * (1 - p), 0, true); A.fx(ctx, 'rock_burst', T - g.t0, g.x, g.y, sc * 0.9, 0.9, 0); }
      if (p > 0) {
        const walk = p >= 1, wy = walk ? Math.round((T - g.t0 - 0.7) * 6 * sc) : 0;
        ctx.save(); if (!walk) { ctx.beginPath(); ctx.rect(-20, -20, W() + 40, g.y + 21); ctx.clip(); }
        A.actor(ctx, set, walk ? 'Walk' : 'Idle', Math.floor(T * (walk ? 8 : 5) + g.i * 3) % 15, Math.PI / 2, g.x, g.y + wy + Math.round((1 - ease(p)) * 34 * sc), sc, { flash: 0.4, flashCol: '#3a0610' });
        ctx.restore();
      }
      ctx.fillStyle = '#1a060c'; ctx.beginPath(); ctx.ellipse(g.x, g.y + 1, 9 * sc, 2.5 * sc, 0, 0, 7); ctx.fill();
    }
    ctx.restore();
    K().embers(ctx, T, 20, 0, W(), RED);
    if (T < 0.25) fill(ctx, '#000', 1 - T / 0.25);
  };
  // Tonight. Two beats (the author, 2026-11-10: "could be far better"). First the moon, enormous over the
  // horizon, its wound opening wider and pouring red light down onto the land in falling streams. Then,
  // from high above, his dead: thousands of small shapes marching across the plain toward the last lit
  // city, rank behind rank, while the moon sinks toward the horizon behind them.
  SH.horde = function (ctx, S, k, T) {
    if (T < 1.7) {
      const t = T / 1.7, mx = W() / 2, my = H() * (0.5 - 0.04 * ease(t)), mr = H() * 0.45, hz = Math.round(H() * 0.82), open = 0.6 + 0.4 * ease(t);
      grad(ctx, ['#060104', '#2a0610', '#5a0c1a']);
      stars(ctx, 30, 0.35, 17, T);
      ctx.save(); ctx.translate(mx, hz); const z = 1 + 0.06 * t; ctx.scale(z, z); ctx.translate(-mx, -hz);
      moon(ctx, mx, my, mr, R.mix('#ff5a6a', '#ff2a44', t), 'rgba(255,40,70,0.6)', 0);   // its wound drawn below, straight
      // The wound: wider and hotter as the night runs out.
      const x0 = mx - mr * 0.95, y0 = my + mr * 0.34, ang = -0.34, L = mr * 2.02, cx = x0 + Math.cos(ang) * L / 2, cy = y0 + Math.sin(ang) * L / 2;
      A.tex(ctx, 'light_01', cx, cy, L * 1.3, mr * 0.5 * open, '#ff2a44', 0.7, ang, true);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang); const gw = Math.max(2, Math.round(mr * 0.07 * open)); ctx.fillStyle = '#2a0006'; ctx.fillRect(-L / 2, -gw / 2 - 1, L, gw + 2); ctx.fillStyle = '#ff1a34'; ctx.fillRect(-L / 2, -gw / 2, L, gw); ctx.fillStyle = '#ffd0d6'; ctx.fillRect(-L / 2 + 6, -0.5, L - 12, 1); ctx.restore();
      // It bleeds: streams of red light running off the wound down to the land, thickening.
      for (let i = 0; i < 22; i++) {
        const u = 0.08 + hash(i, 701) * 0.84, sx = x0 + Math.cos(ang) * L * u, sy = y0 + Math.sin(ang) * L * u, len = (hz - sy) * clamp(t * 1.6 - hash(i, 702) * 0.5), w = 1 + Math.round(hash(i, 703) * 2 * open);
        if (len <= 0) continue;
        ctx.fillStyle = `rgba(255,${40 + Math.round(hash(i, 704) * 60)},70,${0.45 + 0.3 * hash(i, 705)})`; ctx.fillRect(Math.round(sx - w / 2), Math.round(sy), w, Math.round(len));
        for (let d = 0; d < 3; d++) { const ph = (T * (0.9 + hash(i, 706 + d) * 0.6) + hash(i, 709 + d)) % 1; ctx.fillStyle = d ? '#ff6a7a' : '#ffd0d6'; ctx.fillRect(Math.round(sx), Math.round(sy + (hz - sy) * ph), 1, 3); }
      }
      // Where it lands, the land glows.
      A.tex(ctx, 'light_01', mx, hz, W() * 1.2, 40, '#ff2a44', 0.45 + 0.3 * t, 0, true);
      // The land: low and black, the broken Spire far off on the left, dead trees.
      ctx.fillStyle = '#040102'; ctx.beginPath(); ctx.moveTo(-20, H() + 20); for (let x = -20; x <= W() + 20; x += 6) ctx.lineTo(x, hz - Math.sin(x * 0.02) * 2 - Math.sin(x * 0.07) * 1); ctx.lineTo(W() + 20, H() + 20); ctx.closePath(); ctx.fill();
      ctx.beginPath(); const sp = Math.round(W() * 0.16); ctx.moveTo(sp - 7, hz); ctx.lineTo(sp - 3, hz - 46); ctx.lineTo(sp, hz - 54); ctx.lineTo(sp + 3, hz - 46); ctx.lineTo(sp + 7, hz); ctx.fill();
      for (const tx of [0.62, 0.71, 0.88]) { const x = Math.round(W() * tx); ctx.fillRect(x, hz - 14, 2, 15); ctx.fillRect(x - 4, hz - 10, 4, 1); ctx.fillRect(x + 2, hz - 8, 4, 1); }
      ctx.restore();
      K().embers(ctx, T, 24, 0, W(), RED);
      kick(S, 0.6 + t);
      if (T < 0.15) fill(ctx, '#000', 1 - T / 0.15);
      if (T > 1.62) fill(ctx, '#ffffff', (T - 1.62) / 0.08 * 0.8);   // lightning into the next beat
      return;
    }
    // From high above: the plain, the marching dead, the last city, the moon going down behind them.
    const t = T - 1.7, e = clamp(t / 1.7), hz = Math.round(H() * 0.3), flash = (t < 0.08) || (t > 0.75 && t < 0.83);
    grad(ctx, ['#14030a', '#4a0c18', '#7a1828']);
    moon(ctx, W() * 0.5, hz + H() * 0.02 + H() * 0.12 * ease(e), H() * 0.26, '#ff3a52', 'rgba(255,40,70,0.6)', 1, T);
    const fl = ctx.createLinearGradient(0, hz, 0, H()); fl.addColorStop(0, '#5a1420'); fl.addColorStop(0.35, '#2a0810'); fl.addColorStop(1, '#0c0205'); ctx.fillStyle = fl; ctx.fillRect(-20, hz, W() + 40, H());
    A.tex(ctx, 'light_01', W() * 0.5, hz + 4, W() * 1.1, 34, '#ff3048', 0.5, 0, true);
    // The ranks: small, spaced, darker as they come closer, all marching toward us.
    const ROWS = 9, cityY = Math.round(H() * 0.9);
    for (let r = 0; r < ROWS; r++) {
      const d = r / (ROWS - 1), y = Math.round(hz + 4 + Math.pow(d, 1.25) * (cityY - hz - 52) + t * (4 + d * 10)), sc = 0.28 + d * 0.5, sp = 9 + d * 15, n = Math.ceil(W() / sp) + 2, off = (r % 2) * sp * 0.5;
      const col = flash ? R.mix('#ffd0d8', '#5a2a32', d) : R.mix('#3a0a12', '#050102', d);
      for (let i = 0; i < n; i++) {
        if (hash(i, r + 720) < 0.12) continue;   // gaps in the ranks, so each shape reads
        const x = Math.round(i * sp - off + (hash(r, i + 721) - 0.5) * sp * 0.4), fr = Math.floor(T * 8 + i * 3 + r) % 15;
        A.actor(ctx, deadSet(S, i + r * 3), 'Walk', fr, Math.PI / 2, x, y, sc, { shade: col });
      }
    }
    // The last city at the bottom of the frame, lit from inside: its wall, towers with lit windows, torches
    // along the parapet going out one by one as the dead come on.
    A.tex(ctx, 'light_01', W() * 0.5, cityY + 6, W() * 1.3, 60, '#ffb050', 0.3 * (1 - 0.6 * e), 0, true);
    ctx.fillStyle = '#0c0407'; ctx.fillRect(-8, cityY, W() + 16, H());
    for (let x = -8; x < W() + 8; x += 10) ctx.fillRect(x, cityY - 5, 6, 5);
    for (const tw of [0.12, 0.38, 0.62, 0.88]) { const x = Math.round(W() * tw); ctx.fillStyle = '#0c0407'; ctx.fillRect(x - 6, cityY - 18, 12, 18); ctx.fillRect(x - 7, cityY - 21, 3, 3); ctx.fillRect(x - 1, cityY - 21, 3, 3); ctx.fillRect(x + 5, cityY - 21, 3, 3); ctx.fillStyle = '#ffb050'; ctx.fillRect(x - 1, cityY - 13, 2, 3); }
    for (let i = 0; i < 12; i++) { if (hash(i, 730) < e * 0.85) continue; const x = Math.round((i + 0.5) / 12 * W()), y = cityY - 7; ctx.fillStyle = '#ffd080'; ctx.fillRect(x, y, 1, 2); ctx.fillStyle = 'rgba(255,176,80,0.25)'; ctx.fillRect(x - 1, y - 1, 3, 4); }
    if (flash) { fill(ctx, '#ffe8ee', 0.18); kick(S, 3); }
    kick(S, 0.8);
  };
  // A manga panel: one thin box on black, her eyes in ink; the eye opens red; rings close round it.
  SH.eye = function (ctx, S, k, T) {
    const open = ease(clamp((T - 0.7) / 0.18)), eyes = eyePanel(ctx, S, S.cast.vesper, k, T, open, RED), at = eyes[1];

    if (T > 0.7 && T < 0.76) { fill(ctx, '#ffffff', 0.5); kick(S, 4); }
    K().embers(ctx, T, 18, 0, W(), RED);
    if (T > 0.9) say(S, 'card', 'VESPER', W() - 10, BAR + 16, { align: 'right', sub: 'THE MOONBLADE', col: '#ff9aaa', k: T - 0.9 });
    if (k > 0.92) fill(ctx, '#ffffff', (k - 0.92) / 0.08);
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
  // Her name, huge: the run is seen through its letters as they rush past; then the cover drops away.
  SH.name = function (ctx, S, k, T) {
    grad(ctx, ['#3a0812', '#c8203a', '#3a0812']);
    K().hStreaks(ctx, 70, 'rgba(255,220,220,0.5)', 17, T, 1800);
    const gy = Math.round(H() * 0.82);
    ctx.fillStyle = '#14040a'; ctx.fillRect(-8, gy, W() + 16, H());
    for (let i = 0; i < 12; i++) { const x = W() + 30 - ((T * 520 + hash(i, 128) * 700) % (W() + 60)); A.actor(ctx, deadSet(S, i), 'Run', Math.floor(T * 14 + i) % 15, Math.PI, Math.round(x), gy - 2, 1.2, { shade: '#2a0610' }); }
    const set = S.cast.vesper, hx = Math.round(W() * 0.42), sc = 3.2, fr = Math.floor(T * 16) % 15;
    for (let i = 4; i >= 1; i--) A.actor(ctx, set, 'Run', fr, 0, hx - i * 12, gy, sc, { shade: '#ff8090', alpha: 0.1 * (5 - i) });
    A.actor(ctx, set, 'Run', fr, 0, hx, gy, sc, { shade: '#050102' });
    const cover = 1 - clamp((k - 0.72) / 0.2);
    if (cover > 0) say(S, 'knock', 'VESPER', W() / 2, H() / 2, { size: 0.8, sx: 0.7, a: cover, col: '#000' });
    if (k > 0.94) fill(ctx, '#ffffff', (k - 0.94) / 0.06);
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
  // The First Cut as a god over the Spire. The camera starts on her, small on a broken rampart, and tilts
  // up the whole height of him: clouds drift across his chest, stones rise, lightning shows his shape,
  // the red moon sits behind his head like a halo, and his eyes ignite.
  // The god-shape of the First Cut, drawn as one silhouette round his eyes (u = the size of one unit):
  // a crowned and horned helm, a gorget, vast spiked pauldrons, a tattered cape spread like wings, both
  // hands on the hilt of a sword the size of a tower planted point-down before him.
  function deity(ctx, ex, ey, u, col, T, pose) {
    const P = (pts) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(ex + x * u, ey + y * u) : ctx.moveTo(ex + x * u, ey + y * u))); ctx.closePath(); ctx.fill(); };
    const sway = Math.sin(T * 1.3) * 0.6;
    ctx.fillStyle = col;
    // The cape, torn at the hem, moving a little.
    for (const sx of [-1, 1]) { const pts = [[sx * 6, 7], [sx * 13, 8]]; for (let i = 0; i <= 8; i++) { const yy = 20 + i * 6, xx = sx * (14 + i * 2.6 + Math.sin(T * 1.6 + i) * 0.8); pts.push([xx, yy]); } for (let i = 8; i >= 0; i--) pts.push([sx * (3 + i * 1.2), 70 + (i % 2 ? 6 : -2) + sway]); P(pts); }
    // Horns, sweeping out and up.
    for (const sx of [-1, 1]) P([[sx * 2.4, -3.5], [sx * 6, -7], [sx * 9.5, -12], [sx * 9, -18], [sx * 8, -13], [sx * 5, -8.5], [sx * 2.8, -6]]);
    // The sword: the blade (long, tapering to the point far below, or far above when raised), the guard, the grip, the pommel.
    const up = pose === 'raise', side = pose === 'side';
    // pose 'side': drawn back to his right, the blade held flat along the line of the cut (rising to the
    // right at the wound's angle), ready to sweep across the moon's face.
    const HX = -15, HY = 15, ca = Math.cos(Math.PI - 0.34), sa = Math.sin(Math.PI - 0.34);
    const R2 = (pts) => P(pts.map(([t, n]) => [HX + t * ca - n * sa, HY + t * sa + n * ca]));
    if (side) { R2([[8.5, -2.2], [8.5, 2.2], [80, 1.6], [87, 0], [80, -1.6]]); R2([[6, -8], [6, 8], [8.5, 9], [8.5, -9]]); R2([[-2, -1], [-2, 1], [6, 1], [6, -1]]); R2([[-4.5, -1.8], [-4.5, 1.8], [-2, 1.4], [-2, -1.4]]); }
    else if (up) { P([[-2.2, -23.5], [2.2, -23.5], [1.6, -88], [0, -95], [-1.6, -88]]); P([[-8, -21], [8, -21], [9, -23.5], [-9, -23.5]]); P([[-1, -21], [1, -21], [1, -13], [-1, -13]]); P([[-1.8, -13], [1.8, -13], [1.4, -10.5], [-1.4, -10.5]]); }
    else { P([[-2.2, 30], [2.2, 30], [1.6, 95], [0, 102], [-1.6, 95]]); P([[-8, 28], [8, 28], [9, 30.5], [-9, 30.5]]); P([[-1, 19], [1, 19], [1, 28], [-1, 28]]); P([[-1.8, 17], [1.8, 17], [1.4, 19.5], [-1.4, 19.5]]); }
    // The body: gorget, breastplate, waist.
    P([[-3, 4.5], [3, 4.5], [5.5, 8], [-5.5, 8]]);
    P([[-7.5, 8], [7.5, 8], [8.5, 18], [6, 32], [-6, 32], [-8.5, 18]]);
    // The pauldrons, with three spikes each.
    for (const sx of [-1, 1]) { P([[sx * 4, 7], [sx * 11, 5.5], [sx * 15, 8.5], [sx * 15.5, 13], [sx * 11, 15], [sx * 5.5, 12]]); for (let i = 0; i < 3; i++) P([[sx * (8 + i * 2.6), 6.2 - i * 0.2], [sx * (9.2 + i * 2.6), -0.5 - i * 1.2], [sx * (10.4 + i * 2.6), 6.5]]); }
    // The arms down to the hilt, the gauntlets on the grip.
    ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const sx of [-1, 1]) { ctx.lineWidth = 4.2 * u; ctx.beginPath(); ctx.moveTo(ex + sx * 12 * u, ey + 11 * u); if (side) { ctx.lineTo(ex + (sx < 0 ? -15 : 4) * u, ey + (sx < 0 ? 17 : 20) * u); ctx.lineTo(ex + HX * u, ey + HY * u); } else if (up) { ctx.lineTo(ex + sx * 13 * u, ey - 2 * u); ctx.lineTo(ex + sx * 2.6 * u, ey - 16.5 * u); } else { ctx.lineTo(ex + sx * 12.5 * u, ey + 19 * u); ctx.lineTo(ex + sx * 2.6 * u, ey + 23.5 * u); } ctx.stroke(); }
    if (side) R2([[-1, -3.4], [-1, 3.4], [4.5, 3.4], [4.5, -3.4]]); else if (up) P([[-3.4, -19.5], [3.4, -19.5], [3.4, -14], [-3.4, -14]]); else P([[-3.4, 21], [3.4, 21], [3.4, 26.5], [-3.4, 26.5]]);
    // The helm: tall, crowned with five spikes, narrowing to the jaw.
    P([[-3.4, -5], [3.4, -5], [3.2, 2], [2.4, 4.6], [0, 6], [-2.4, 4.6], [-3.2, 2]]);
    const crown = [[-3.4, -5]]; for (let i = 0; i <= 8; i++) crown.push([-3.4 + i * 0.85, i % 2 ? -6.2 : (i === 4 ? -11.5 : -8.6)]); crown.push([3.4, -5]); P(crown);
  }
  // The First Cut as his own character (the master knight), drawn giant: his eyes at (ex, ey), sized from sc
  // (the old silhouette's unit). pose 'raise': the sword held up (Taunt, frame 10); otherwise he stands
  // (Idle, or o.clip / o.fr). Whole-number scales keep the pixels square. o.dark: a tint laid over him to
  // sit him in the scene's light (o.tint); o.sil: one solid colour (o.col), for the ink frames.
  function colossusDrawn(ctx, S, ex, ey, sc, T, o) {
    const u = sc / 2;
    ctx.save();
    if (o.flat) { deity(ctx, ex, ey, u, o.col || '#050204', T, o.pose); ctx.restore(); return; }   // one solid shape, no edge lines
    deity(ctx, ex + Math.max(1, u * 0.35), ey - Math.max(1, u * 0.25), u, o.rim || '#ff5a6a', T, o.pose);   // the moon's rim light
    deity(ctx, ex - Math.max(1, u * 0.2), ey, u, '#5a0a1a', T, o.pose);
    deity(ctx, ex, ey, u, o.col || '#050204', T, o.pose);
    // A rune burning down the blade's edge.
    const y0 = o.pose === 'raise' ? -24 : 31, y1 = o.pose === 'raise' ? -87 : 94;
    ctx.strokeStyle = 'rgba(255,42,68,0.85)'; ctx.lineWidth = Math.max(1, u * 0.3); ctx.beginPath(); ctx.moveTo(ex, ey + y0 * u); ctx.lineTo(ex, ey + y1 * u); ctx.stroke();
    A.tex(ctx, 'light_01', ex, ey + (y0 + y1) / 2 * u, 8 * u, 70 * u, RED, 0.25, 0, true);
    ctx.restore();
  }
  // The First Cut: the drawn god, one solid shape (o.col; o.tint marks a hit, o.sil the ink frames).
  // The First Cut is the Master Knight (the set his duel form and the hero use), drawn from the real character at a
  // whole-number scale so his pixels stay sharp, its eyes at (ex, ey): standing guard (Idle4), the sword raised (Taunt,
  // or the overhead cut of Attack4 played through o.ft 0..1), drawn back for the moon cut (Attack6). A black or white
  // col asks for a pure silhouette (the ink frames); any other darkens him toward it. Until the set has loaded: the
  // polygons (or nothing, with o.optional).
  const GOD_SET = 'vh_firstcut', godRef = {};
  // pose -> [clip, frames, loop from (held poses cycle their last frames), fps]
  const GOD_FILM = { hover: ['C_Hover', 15], stand: ['C_Stand', 15], raise: ['C_Raise', 12, 4, 6], cut: ['C_Cut', 15], command: ['C_Command', 15, 7, 6] };
  // The First Cut standing with his feet at (fx, fy), k (a whole number) pixels per sprite pixel, in a pose: guard
  // (Idle4), raise (Taunt, or the overhead cut of Attack4 through o.ft 0..1), side (drawn back: Attack6, or the swing
  // through o.ft), kneel (the end of his overhead cut, down on one knee). Shading as colossus().
  function godAt(ctx, S, fx, fy, k, T, o) {
    // At most twice the sprite's size (2026-11-11, the author: "looks wrong and horrible"): larger, his pixels turned to blocks.
    o = o || {}; k = Math.max(1, Math.min(2, Math.round(k)));
    const col = o.col || '#050204', ink = o.ink || /^#(000|000000|fff|ffffff)$/i.test(col), ang = o.ang == null ? Math.PI / 2 : o.ang;
    let clip = 'Idle4', fr = Math.floor((T || 0) * 7) % 15;
    // His animation pack for the films (tools_firstcut.py: C_*, the cape in the wind): hover, stand, raise, cut, command.
    const FILM = GOD_FILM[o.pose];
    if (FILM) { clip = FILM[0]; const n = FILM[1]; fr = o.ft != null ? Math.min(n - 1, Math.floor(o.ft * n)) : FILM[2] != null ? FILM[2] + Math.floor((T || 0) * FILM[3]) % (n - FILM[2]) : Math.floor((T || 0) * 8) % n; }
    else if (o.pose === 'raise') { if (o.ft != null) { clip = 'Attack4'; fr = Math.min(14, Math.floor(o.ft * 15)); } else { clip = 'Taunt'; fr = 12; } }
    else if (o.pose === 'side') { clip = 'Attack6'; fr = o.ft != null ? Math.min(14, 1 + Math.floor(o.ft * 10)) : 1; }
    else if (o.pose === 'kneel') { clip = 'Attack4'; fr = 13; }
    if (!A.hasSet(GOD_SET)) { if (!o.optional) colossusDrawn(ctx, S, fx, fy - 38 * k, k, T, { flat: true, pose: o.pose === 'side' ? 'side' : o.pose === 'raise' ? 'raise' : 'plant', col }); return false; }
    const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    const ref = godRef['f' + k] || (godRef['f' + k] = A.box(GOD_SET, 'Idle4', 0, ang, k));   // his feet (the sprite's anchor sits higher)
    const y = ref ? fy - (ref.y + ref.h) : fy;
    // His effects pack (tools_firstcut_fx.py): the fire rising round him behind, the flames on his crown in front.
    if (o.aura && !ink) A.fx(ctx, 'fc_aura', T || 0, Math.round(fx), Math.round(fy + 2), k * 0.4, 0.6 * (o.aura === true ? 1 : o.aura));   // low, licking about his feet
    A.actor(ctx, GOD_SET, clip, fr, ang, Math.round(fx), Math.round(y), k, ink ? { shade: col } : { flash: Math.min(0.16, o.amt != null ? o.amt : 0.16), flashCol: col });
    if (o.crown && !ink && ref) A.fx(ctx, 'fc_crown', T || 0, Math.round(fx), Math.round(y + ref.y + 10 * k), k * 0.8, 0.9);
    ctx.imageSmoothingEnabled = sm; return true;
  }
  function colossus(ctx, S, ex, ey, sc, T, o) {
    o = o || {};
    const col = o.tint ? '#3a0a14' : (o.col || '#050204'), ink = o.ink || /^#(000|000000|fff|ffffff)$/i.test(col);
    if (A.hasSet(GOD_SET)) {
      const k = Math.max(1, Math.min(2, Math.round(sc))), ang = Math.PI / 2;
      let clip = 'Idle4', fr = Math.floor((T || 0) * 7) % 15;
      if (o.pose === 'raise') { if (o.ft != null) { clip = 'Attack4'; fr = Math.min(14, Math.floor(o.ft * 15)); } else { clip = 'Taunt'; fr = 12; } }
      else if (o.pose === 'side') { clip = 'Attack6'; fr = 1; }
      const ref = godRef[k] || (godRef[k] = A.box(GOD_SET, 'Idle4', 0, ang, k));
      if (ref) {
        const x = Math.round(ex - (ref.x + ref.w * 0.5)), y = Math.round(ey - (ref.y + ref.h * 0.15));
        const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
        A.actor(ctx, GOD_SET, clip, fr, ang, x, y, k, ink ? { shade: col } : { flash: o.amt != null ? o.amt : o.tint ? 0.5 : 0.28, flashCol: col });
        ctx.imageSmoothingEnabled = sm; return;
      }
    }
    if (o.optional) return;
    colossusDrawn(ctx, S, ex, ey, sc, T, { flat: true, pose: o.pose, col });
  }
  // No glowing eyes on him (the author, 2026-11-09).
  function burningEyes() {}
  SH.colossus = function (ctx, S, k, T) {
    const pan = ease(clamp((T - 0.4) / 2.2)), Hh = H();   // the world is about two screens tall; the camera tilts from the bottom to the top
    grad(ctx, ['#020103', '#14030a', '#3a0812']);
    const at = (wy) => Math.round(wy - Hh * 1.05 * (1 - pan));   // world 0..2.05H: at the start the bottom screen shows, at the end the top
    stars(ctx, 40, 0.5, 13, T);
    const ex = Math.round(W() * 0.5), eyW = Hh * 0.3, sc = 6.6;
    // The moon behind his head, his aura, the lightning.
    moon(ctx, ex, at(eyW), Hh * 0.38, '#ff3a52', 'rgba(255,40,70,0.6)', 1, T);
    A.tex(ctx, 'light_01', ex, at(eyW + Hh * 0.6), W() * 1.4, Hh * 1.8, '#5a0a2a', 0.5, 0, true);
    const bolt = (T > 1.1 && T < 1.22) || (T > 2.6 && T < 2.7);
    if (bolt) fill(ctx, 'rgba(255,220,230,0.18)');
    { const py = Hh * 0.8; ctx.fillStyle = '#030102'; ctx.beginPath(); ctx.moveTo(ex - 60, at(Hh * 1.4)); ctx.lineTo(ex - 14, at(py + 6)); ctx.lineTo(ex - 6, at(py)); ctx.lineTo(ex + 8, at(py)); ctx.lineTo(ex + 16, at(py + 8)); ctx.lineTo(ex + 64, at(Hh * 1.4)); ctx.fill();   // the pinnacle
      godAt(ctx, S, ex, at(py) + 1, 2, T, { col: bolt ? '#3a0c18' : '#0a0408', amt: bolt ? 0.15 : 0.3, pose: T > 2.3 ? 'raise' : 'stand', aura: true, crown: true });
      A.fx(ctx, 'fc_wind', T, ex - 10, at(py) - 50, 1.6, 0.8); }
    if (T > 2.3 && T < 2.4) kick(S, 6);
    // Clouds across his chest and waist, stones rising past him.
    for (let i = 0; i < 6; i++) A.tex(ctx, i % 2 ? 'smoke_07' : 'smoke_04', ((hash(i, 221) * W() * 1.6 + T * 12 * (i % 2 ? 1 : -1)) % (W() * 1.6)) - W() * 0.3, at(Hh * (0.85 + i * 0.17)), W() * 0.9, 50, '#3a0a14', 0.55, 0, false);
    for (let i = 0; i < 26; i++) { const wy = Hh * 2.0 - ((T * (30 + hash(i, 222) * 40) + hash(i, 223) * Hh * 2) % (Hh * 2)), x = hash(i, 224) * W(); ctx.fillStyle = i % 4 ? '#14060a' : '#ff5a6a'; const z = 1 + (i % 3); ctx.fillRect(Math.round(x), at(wy), z, z); }
    // The broken rampart, and her on it, small, her back to us.
    const ry = at(Hh * 1.94);
    ctx.fillStyle = '#030102'; ctx.beginPath(); ctx.moveTo(-10, ry + 40); for (let x = -10; x <= W() + 10; x += 10) ctx.lineTo(x, ry + (Math.abs(x - W() * 0.42) < 26 ? 0 : 3 + hash(x, 225) * 10)); ctx.lineTo(W() + 10, ry + 80); ctx.lineTo(-10, ry + 80); ctx.fill();
    for (let x = -10; x < W(); x += 18) if (hash(x, 226) > 0.3) ctx.fillRect(x, ry - 4, 10, 6);
    A.actor(ctx, S.cast.vesper, 'Idle4', Math.floor(T * 7) % 15, -Math.PI / 2, Math.round(W() * 0.42), ry + 1, 1.1, { shade: '#030102' });
    A.tex(ctx, 'light_01', W() * 0.42, ry - 14, 16, 22, RED, 0.35, 0, true);
    if (T > 2.6) say(S, 'card', 'THE FIRST CUT', 10, BAR + 16, { sub: 'WHO WOUNDED THE MOON', k: T - 2.6, col: '#ffffff' });
    kick(S, 1 + (T > 2.3 ? 1.2 : 0));
  };
  // His gaze (rebuilt 2026-11-10): from behind her on the rampart, small and in her own colours; him far
  // off over the Spire against the red moon, the moon behind his crown, looking down at her. "Kneel."
  SH.gaze = function (ctx, S, k, T) {
    const push = 1 + 0.05 * ease(k), gy = Math.round(H() * 0.84);
    grad(ctx, ['#0a0206', '#3a0812', '#7a1424']);
    stars(ctx, 30, 0.35, 41, T);
    ctx.save(); ctx.translate(W() / 2, gy); ctx.scale(push, push); ctx.translate(-W() / 2, -gy);
    moon(ctx, W() * 0.5, H() * 0.3, H() * 0.24, '#ff3a52', 'rgba(255,40,70,0.6)', 1, T);
    A.tex(ctx, 'light_01', W() * 0.5, H() * 0.4, W() * 0.8, H() * 0.7, '#7a1028', 0.5, 0, true);
    godAt(ctx, S, Math.round(W() * 0.5), Math.round(H() * 0.62) + 1, 2, T, { col: '#0a0306', amt: 0.3, pose: 'stand', crown: true });
    city(ctx, gy - 18, 29, '#14040a', 0, 0.7, 0);
    ctx.fillStyle = '#0c0206'; ctx.beginPath(); ctx.moveTo(W() * 0.5 - 6, gy - 16); ctx.lineTo(W() * 0.5 - 1, H() * 0.62); ctx.lineTo(W() * 0.5 + 1, H() * 0.62); ctx.lineTo(W() * 0.5 + 6, gy - 16); ctx.fill();   // the Spire (he stands on it)
    for (let i = 0; i < 3; i++) A.tex(ctx, 'smoke_04', ((hash(i, 741) * W() * 1.4 + T * (6 + i * 3)) % (W() * 1.4)) - W() * 0.2, gy - 16 + i * 4, W() * 0.8, 22, '#4a0c18', 0.5, 0, false);
    // The rampart and her on it, her back to us.
    ctx.fillStyle = '#050102'; ctx.fillRect(-8, gy, W() + 16, H()); for (let x = -8; x < W() + 8; x += 16) ctx.fillRect(x, gy - 6, 10, 6);
    A.tex(ctx, 'light_01', W() * 0.44, gy - 10, 40, 40, RED, 0.3, 0, true);
    A.actor(ctx, S.cast.vesper, 'Idle4', Math.floor(T * 7) % 15, -Math.PI / 2, Math.round(W() * 0.44), gy - 5, 1.4, {});
    ctx.restore();
    K().embers(ctx, T, 20, 0, W(), RED);
    if (T > 0.6 && T < 0.66) kick(S, 3);
  };
  // A tower-sized blade as one flat shape (still used by the First Cut's film).
  function bigBlade(ctx, x0, y0, x1, y1, wd, col, edge) {
    const a = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(a) * wd / 2, ny = Math.cos(a) * wd / 2;
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x0 + nx, y0 + ny); ctx.lineTo(x1 + nx * 0.4, y1 + ny * 0.4); ctx.lineTo(x1 + Math.cos(a) * wd * 0.8, y1 + Math.sin(a) * wd * 0.8); ctx.lineTo(x1 - nx * 0.4, y1 - ny * 0.4); ctx.lineTo(x0 - nx, y0 - ny); ctx.closePath(); ctx.fill();
    if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0 + nx, y0 + ny); ctx.lineTo(x1 + nx * 0.4, y1 + ny * 0.4); ctx.stroke(); }
  }
  // His blade comes down from the sky onto her (rebuilt 2026-11-10): one burning streak; she meets it and holds;
  // the ground breaks under her feet (the pack's impact); AND YET.
  SH.strike = function (ctx, S, k, T) {
    const vs = S.cast.vesper, gx = Math.round(W() * 0.46), gy = Math.round(H() * 0.84), hit = 0.33, sx = W() * 1.15, sy = -H() * 0.5, tx = gx + 4, ty = gy - 30;
    const ground = () => { ctx.fillStyle = '#080204'; ctx.fillRect(-8, gy, W() + 16, H()); };
    const streak = (f, a) => { const hx = sx + (tx - sx) * f, hy = sy + (ty - sy) * f, ang = Math.atan2(ty - sy, tx - sx), L = Math.hypot(hx - sx, hy - sy) + 30; A.tex(ctx, 'light_01', (sx + hx) / 2, (sy + hy) / 2, L, 60, RED, 0.9 * a, ang, true); A.tex(ctx, 'light_01', (sx + hx) / 2, (sy + hy) / 2, L, 16, '#ffffff', 0.9 * a, ang, true); };
    if (k < hit) {
      grad(ctx, ['#14020a', '#3a0812', '#14020a']); K().speedLines(ctx, tx, ty, 70, 'rgba(255,200,210,0.35)', 241, T, 40);
      ground(); streak(0.2 + 0.8 * (k / hit), 1);
      A.actor(ctx, vs, 'Idle4', Math.floor(T * 8) % 15, -Math.PI * 0.25, gx, gy, 1.7, {});
      return;
    }
    const e = k - hit;
    if (e < 0.03) { fill(ctx, '#ffffff'); kick(S, 8); return; }
    grad(ctx, ['#2a0408', '#8a1424', '#2a0408']); K().speedLines(ctx, tx, ty, 80, 'rgba(255,220,200,0.4)', 243, T, 50);
    ground(); streak(1, Math.max(0.35, 1 - e * 1.5));
    A.tex(ctx, 'light_01', gx, gy, W() * (0.5 + e), 40, '#ffb050', 0.7 * (1 - e), 0, true);
    A.fx(ctx, 'cb:01_crimson_tide_cleave/caster', (e - 0.03) * 1.9 * 0.9, gx, gy, 2.2, 1, 0);
    const push = Math.round(Math.sin(T * 50) * 1.2 * (1 - e));
    A.actor(ctx, vs, 'Special1', 8, -Math.PI * 0.25, gx + push, gy, 1.7, {});   // she holds it
    if (T > 1.0) say(S, 'punch', 'AND YET', W() / 2, H() * 0.3, { size: 34, k: T - 1.0 });
    kick(S, 4 * (1 - e));
  };
  // Red. She holds the tower of steel over her; she throws it off; she points her blade up at him.
  SH.defy = function (ctx, S, k, T) {
    const vs = S.cast.vesper, gx = Math.round(W() * 0.46), gy = Math.round(H() * 0.88), tipX = gx + 4, tipY = gy - 30, fromX = W() * 1.25, fromY = -H() * 0.6;
    fill(ctx, RED);
    ctx.fillStyle = '#000'; ctx.fillRect(-8, gy, W() + 16, H());
    const throwK = clamp((k - 0.5) / 0.15);
    if (throwK < 1) {
      const a = throwK * 0.7, cx = tipX, cy = tipY, rot = (x, y) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)];
      const [fx, fy] = rot(fromX, fromY); bigBlade(ctx, fx, fy, tipX - throwK * 60, tipY + throwK * 20, 26, '#000');
      A.actor(ctx, vs, 'Special1', throwK > 0 ? 12 : 8, -Math.PI * 0.25, gx + Math.round(Math.sin(T * 50) * (throwK ? 0 : 1.5)), gy, 1.7, { shade: '#000' });
      if (throwK > 0) { K().line(ctx, tipX - 80, tipY + 40, tipX + 120, tipY - 70, 2, '#ffffff'); kick(S, 5); say(S, 'punch', 'I STAND', W() / 2, H() * 0.42, { size: 40, k: T - 0.85 }); }
      else kick(S, 1.5);
    } else {
      // His eyes in the dark above; her small shape below, the blade raised at him.
      const e = clamp((k - 0.65) / 0.35);
      ctx.fillStyle = '#0a0204'; ctx.fillRect(-8, -8, W() + 16, gy + 8);
      { const rg = ctx.createRadialGradient(W() * 0.5, H() * 0.24, 4, W() * 0.5, H() * 0.3, W() * 0.6); rg.addColorStop(0, '#7a1424'); rg.addColorStop(1, '#14030a'); ctx.fillStyle = rg; ctx.fillRect(-8, -8, W() + 16, H() + 16); }
      godAt(ctx, S, Math.round(W() * 0.5), Math.round(H() * 0.62), 2, T, { col: '#030102', amt: 0.5, pose: 'stand' });
      burningEyes(ctx, Math.round(W() * 0.5), Math.round(H() * 0.24), 9, 1, T);
      ctx.fillStyle = '#000'; ctx.fillRect(-8, gy, W() + 16, H());
      A.actor(ctx, vs, 'Special1', 14, -Math.PI * 0.5, gx, gy, 1.9, { shade: '#e8203c' });   // solid red against his black
      K().line(ctx, gx + 2, gy - 34, gx + 2 + (W() * 0.5 - gx) * 0.25 * ease(e * 2), gy - 34 - 60 * ease(e * 2), 1, '#ffffff');
      if (k < 0.8) say(S, 'punch', 'I STAND', W() / 2, H() * 0.42, { size: 40, k: T - 0.85, a: clamp((0.8 - k) * 12) });
      if (k > 0.9) fill(ctx, '#ffffff', (k - 0.9) / 0.1);
    }
  };
  // The red moon; she stands on the rampart, her back to us; VESPER.
  SH.title = function (ctx, S, k, T) {
    const sh = S.f.SHOTS[S.f.SHOTS.length - 1], dur = sh[2] - sh[1], out = 0.6 / dur;
    grad(ctx, ['#080206', '#2a0610', '#4a0c18']);
    stars(ctx, 60, 0.5, 11, T);
    // His shadow over everything, faint, the moon at his heart; his eyes burning above the name.
    const loom = clamp((T - 0.2) / 1.2);
    // (No looming giant behind the title: he is a man-sized knight now, at the top of the Spire.)
    moon(ctx, W() / 2, H() * 0.62, H() * 0.4, '#ff3a52', 'rgba(255,40,70,0.55)', 1, T);
    bokeh(ctx, T, '#ff4a5e', 18, 981, 0.75 * clamp(T - 0.3));
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
      say(S, 'big', 'THE BLEEDING MOON', W() / 2, y, { size: 44, k: tk, track: true });
      const dv = R.uiImg && R.uiImg('divider');
      if (dv && tk > 0.3) { ctx.globalAlpha = clamp((tk - 0.3) * 3); ctx.drawImage(dv, Math.round(W() / 2 - dv.naturalWidth / 2), y + 20); ctx.globalAlpha = 1; }
      if (tk > 2.0) say(S, 'line', 'Six guardians. One night. Stop him before dawn.', W() / 2, H() - 10, { size: 17, col: '#ffffff', a: clamp((tk - 2.0) * 2) });
    }
    if (k > 1 - out) fill(ctx, '#000', (k - (1 - out)) / out);
  };

  // ---- the frame -------------------------------------------------------------------------------------
  function shotAt(F, t) { for (const x of F.SHOTS) if (t < x[2]) return x; return F.SHOTS[F.SHOTS.length - 1]; }
  I.shotAt = (t) => shotAt(I.st.f, t)[0];
  I.draw = function (ctx, dt) {
    const S = I.st; if (!S) return;
    const F = S.f;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, R.W, R.H);
    const c = R.pxBegin(), sh = shotAt(F, S.t), T = S.t - sh[1], k = clamp(T / (sh[2] - sh[1]));
    c.save();
    if (S.shake > 0.3) c.translate(Math.round((Math.random() - 0.5) * S.shake), Math.round((Math.random() - 0.5) * S.shake));
    F.draw[sh[0]](c, S, k, T);
    c.restore();
    S.shake = Math.max(0, S.shake - (dt || 0.016) * 18);
    // Letterbox (none on the impact frames; the title lets it go), the captions in the lower bar, the skip hint.
    const impact = (F.noBars && F.noBars[sh[0]]) || (F.impact && F.impact(sh[0], T));
    // The grade: a vignette on the ordinary frames, grain on all of them.
    if (!impact && !(F.flat && F.flat[sh[0]])) vignette(c, 0.55);
    grain(c, 0.07);
    const bars = sh[0] === F.titleShot ? Math.round(BAR * Math.max(0, 1 - T * 1.5)) : impact ? 0 : BAR;
    if (bars) { c.fillStyle = '#000'; c.fillRect(0, 0, W(), bars); c.fillRect(0, H() - bars, W(), bars); }
    // The words, on the sharp layer above.
    { let L = null; for (const x of F.LINES) if (S.t >= x[0] && S.t <= x[1] && (!L || x[0] > L[0])) L = x;   // one line at a time: the newest
      if (L) { const [a, b, text, col] = L; say(S, 'line', text, W() / 2, H() - BAR / 2 + 1, { size: 17, col: col || '#ffffff', a: Math.min(1, (S.t - a) * 4, (b - S.t) * 4), mid: true }); } }
    if (S.skippable) say(S, 'line', R.touch ? 'Tap to skip' : 'Esc to skip', W() - 6, BAR / 2 + 1, { size: 11, col: 'rgba(240,230,234,0.6)', align: 'right', mid: true });
    words(S);
  };
  // The opening itself, and the drawing kit the other films (js/bossfilms.js) are made with.
  const OPENING = compile({ shots: DUR, lines: LINES, sfx: SFX, draw: SH, music: ['draw', 'act0'], amb: 'wind', noBars: { cold: 1, eye: 1, name: 1, panels: 1, gaze: 1, defy: 1 }, flat: { cold: 1 },
    impact: (name, T) => name === 'godcut' && T >= 1.35 && T < 1.9, titleShot: 'title' });
  I.OPENING = OPENING; I.OPEN_SFX = SFX;
  // ---- the main menu's backdrop (the author, 2026-11-10: "far more badass and epic") ------------------
  // Drawn on the pixel buffer behind the menu: the First Cut towering behind the bleeding moon, the moon at
  // his heart pouring red light from its wound; the Spire and a ruined city on the horizon with his dead
  // marching along it; Vesper on a cliff edge in the foreground, her back to us, facing all of it; red sheet
  // lightning, mist, ash and embers. The menu column sits on the left, so the scene leans right.
  let MS = null;
  I.menu = function (dt) {
    if (!MS) MS = { cast: cast(), words: [], shake: 0, t: 0, f: {} };
    if (!MS.full && VS.main && VS.main.bgDone) { MS.cast = cast(); MS.full = true; }   // the marching dead join once the background load is done
    MS.t += dt || 0.016; const T = MS.t, S = MS, ctx = R.pxBegin(), w = W(), h = H();
    const drift = Math.sin(T * 0.07) * 6, hz = Math.round(h * 0.72);
    const bolt = ((T % 7.3) > 6.9 && (T % 7.3) < 7.0) || ((T % 7.3) > 7.08 && (T % 7.3) < 7.14), bl = bolt ? 1 : 0;
    grad(ctx, ['#040108', bolt ? '#5a0e22' : '#22040e', bolt ? '#a01a30' : '#5a0c1a']);
    stars(ctx, 70, 0.6, 41, T);
    ctx.save(); ctx.translate(Math.round(drift * 0.3), 0);
    // The moon's glow (he himself stands on the Spire, below).
    const gx = Math.round(w * 0.66), gy = Math.round(h * 0.17 + Math.sin(T * 0.5) * 1.5);
    A.tex(ctx, 'light_01', gx, gy + 30, w * 0.9, h * 1.1, '#7a1028', 0.45, 0, true);
    A.tex(ctx, 'light_01', gx, gy - 6, 90, 60, '#ff3a52', 0.35, 0, true);   // a red glow round his crowned head
    const mx = gx, my = Math.round(h * 0.47), mr = Math.round(h * 0.2);
    moon(ctx, mx, my, mr, '#ff3a52', 'rgba(255,40,70,0.6)', 0);
    { const x0 = mx - mr * 0.95, y0 = my + mr * 0.34, ang = -0.34, L = mr * 2.02, cx = x0 + Math.cos(ang) * L / 2, cy = y0 + Math.sin(ang) * L / 2;
      A.tex(ctx, 'light_01', cx, cy, L * 1.4, mr * 0.45, '#ff2a44', 0.6, ang, true);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang); ctx.fillStyle = '#2a0006'; ctx.fillRect(-L / 2, -2, L, 4); ctx.fillStyle = '#ff1a34'; ctx.fillRect(-L / 2, -1, L, 2); ctx.fillStyle = '#ffd0d6'; ctx.fillRect(-L / 2 + 4, 0, L - 8, 1); ctx.restore();
      for (let i = 0; i < 14; i++) { const u = 0.1 + hash(i, 801) * 0.8, sx = x0 + Math.cos(ang) * L * u, sy = y0 + Math.sin(ang) * L * u, ww = 1 + (i % 3 === 0 ? 1 : 0);
        ctx.fillStyle = `rgba(255,${50 + Math.round(hash(i, 802) * 60)},70,${0.35 + 0.25 * hash(i, 803)})`; ctx.fillRect(Math.round(sx), Math.round(sy), ww, hz - Math.round(sy));
        const ph = (T * (0.35 + hash(i, 804) * 0.3) + hash(i, 805)) % 1; ctx.fillStyle = '#ffd0d6'; ctx.fillRect(Math.round(sx), Math.round(sy + (hz - sy) * ph), 1, 2); } }
    ctx.restore();
    // Mist across the middle distance.
    for (let i = 0; i < 4; i++) A.tex(ctx, i % 2 ? 'smoke_07' : 'smoke_04', ((hash(i, 811) * w * 1.6 + T * (5 + i * 2)) % (w * 1.6)) - w * 0.3, hz - 8 + i * 3, w * 0.8, 26, '#5a0c1c', 0.35, 0, false);
    // The horizon: the Spire, the ruined city, his dead marching along the ridge.
    ctx.save(); ctx.translate(Math.round(drift * 0.6), 0);
    A.tex(ctx, 'light_01', mx, hz, w * 1.1, 30, '#ff2a44', 0.5, 0, true);
    city(ctx, hz + 2, 23, '#120308', 0.12, 0.55, 0);
    { const sp = Math.round(w * 0.47), tp = Math.round(h * 0.44); ctx.fillStyle = '#5a1a2a'; ctx.beginPath(); ctx.moveTo(sp - 10, hz + 4); ctx.lineTo(sp - 2, tp + 8); ctx.lineTo(sp - 2, tp); ctx.lineTo(sp + 2, tp); ctx.lineTo(sp + 2, tp + 8); ctx.lineTo(sp + 10, hz + 4); ctx.fill();
      ctx.fillStyle = '#0c0206'; ctx.beginPath(); ctx.moveTo(sp - 9, hz + 4); ctx.lineTo(sp - 1, tp + 9); ctx.lineTo(sp + 1, tp + 9); ctx.lineTo(sp + 9, hz + 4); ctx.fill();
      A.tex(ctx, 'light_01', sp, tp - 20, 50, 60, '#ff3a52', 0.4, 0, true);
      godAt(ctx, S, sp, tp + 1, 1, T, { col: bolt ? '#3a0c18' : '#0c0206', amt: 0.25, optional: true, pose: 'stand' }); }   // he waits at the top of the Spire
    ctx.fillStyle = '#0a0205'; ctx.fillRect(-20, hz + 2, w + 40, h);
    for (let i = 0; i < 34; i++) { const x = ((i * 11 + T * -6 + hash(i, 821) * 8) % (w + 40) + w + 40) % (w + 40) - 20; A.actor(ctx, deadSet(S, i), 'Walk', Math.floor(T * 7 + i * 3) % 15, Math.PI, Math.round(x), hz + 3 + (i % 3), 0.32, { shade: bolt ? '#4a1a24' : '#16040a' }); }
    ctx.restore();
    // The foreground: a broken cliff on the right, and her on its edge, her back to us, her blade low.
    const cy0 = Math.round(h * 0.8), vx = Math.round(mx + w * 0.03);   // on a crag in front of the moon's glow, so she stands out
    ctx.fillStyle = '#030102'; ctx.beginPath(); ctx.moveTo(vx - 70, h + 4); ctx.lineTo(vx - 40, cy0 + 10); ctx.lineTo(vx - 12, cy0 + 1); ctx.lineTo(vx + 14, cy0); ctx.lineTo(vx + 30, cy0 + 6); ctx.lineTo(w + 4, cy0 + 16); ctx.lineTo(w + 4, h + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#0c0306'; ctx.fillRect(-4, Math.round(h * 0.93), w + 8, h);
    A.tex(ctx, 'light_01', vx, cy0 - 10, 34, 34, '#ff2a44', 0.3 + 0.1 * Math.sin(T * 1.7), 0, true);
    A.actor(ctx, S.cast.vesper, 'Idle4', Math.floor(T * 7) % 15, -Math.PI / 2, vx, cy0, 1.05, { shade: '#050203' });
    // Wind-blown ash, embers rising, soft red lights in the air.
    for (let i = 0; i < 40; i++) { const ph = (T * (0.08 + hash(i, 831) * 0.08) + hash(i, 832)) % 1, x = ((hash(i, 833) * w * 1.3 - ph * w * 0.5) % w + w) % w, y = ph * h; ctx.fillStyle = i % 5 ? 'rgba(40,20,26,0.8)' : 'rgba(200,170,180,0.5)'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); }
    K().embers(ctx, T, 30, 0, w, RED);
    if (bl) fill(ctx, '#ffd0d8', 0.12);
    vignette(ctx, 0.6); grain(ctx, 0.06);
  };
  I.kit = { RED, INK, BAR, W, H, K, hash, ease, clamp, fill, grad, stars, moon, city, graves, rain, spun, eyes, closeUp, burst, sparks, deadSet, kick, say,
    deity, colossus, godAt, burningEyes, bigBlade, hand, poster, grain, vignette, bokeh, eyePanel, mangaEyesDraw: mangaEyes, SH };
})();
