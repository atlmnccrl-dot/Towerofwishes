// VESPER — the opening: an anime fight told in shots on the pixel buffer, in the style of the moon arts.
// Nothing here is the game's own view: every shot is a built set (a sleeping city, a graveyard, the
// Black Gate under the bleeding moon, a red void) with the cast as actors, silhouettes and close-ups.
//   The moon falls on a sleeping city · the First Cut, small against it, leaps and cuts it (impact
//   frames) · the wound bleeds · a hand bursts from the earth and the dead stand up on a ridge · red eyes
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
  // The shots, in seconds.
  const DUR = [['open', 1.6], ['fall', 3.4], ['swordsman', 1.4], ['leap', 1.2], ['cutmoon', 1.1], ['scar', 2.1], ['rise', 3.6], ['horde', 3.4],
    ['eye', 1.4], ['draw', 1.0], ['charge', 2.6], ['panels', 1.4], ['colossus', 4.0], ['gaze', 1.4], ['strike', 1.9], ['defy', 1.7], ['title', 7.2]];
  const SHOTS = []; { let t = 0; for (const [name, d] of DUR) { SHOTS.push([name, t, t + d]); t += d; } }
  const END = SHOTS[SHOTS.length - 1][2];
  const AT = (name) => SHOTS.find((x) => x[0] === name)[1];
  // Captions, timed from the start of their shot: [shot, from, to, text].
  const LINES = [
    ['fall', 0.3, 3.2, 'Seven hundred years ago, the moon began to fall.'], ['swordsman', 0.2, 2.5, 'A swordsman cut it.'],
    ['scar', 0.2, 2.0, 'It stopped. The wound never closed.'], ['rise', 1.2, 3.4, 'Its red light raises the dead.'],
    ['horde', 0.3, 1.75, 'Tonight the wound bleeds out.'], ['horde', 1.85, 3.3, 'At dawn, the moon falls for good.'],
    ['eye', 0.1, 1.3, 'One blade can close it.'], ['colossus', 2.0, 3.9, 'The one who cut it waits at the top of the Spire.'],
  ].map(([sh, a, b, text]) => [AT(sh) + a, AT(sh) + b, text]);
  // The charge: when each of the dead reaches her blade (seconds into the shot).
  const CONTACT = [0.3, 0.6, 0.85, 1.1, 1.32, 1.55, 1.78, 2.0];
  // Sounds, timed from the start of their shot: [shot, at, name, volume].
  const SFX = [
    ['open', 0.5, 'swish_0', 0.4], ['open', 1.0, 'thud', 0.6], ['fall', 0.1, 'quake', 0.5], ['fall', 1.8, 'quake', 0.7], ['swordsman', 0, 'unsheathe_01', 0.8], ['swordsman', 0.8, 'charge', 0.7],
    ['leap', 0, 'whoosh', 1], ['cutmoon', 0, 'blow_big', 1], ['cutmoon', 0, 'slash_2', 1], ['cutmoon', 0.05, 'quake', 1], ['scar', 0, 'magic', 0.5],
    ['rise', 0.4, 'smash', 0.8], ['rise', 0.45, 'quake', 0.6], ['rise', 1.3, 'spawn', 0.7], ['rise', 1.9, 'reinforce', 0.6], ['rise', 2.5, 'spawn', 0.5],
    ['horde', 0, 'horn', 0.7], ['horde', 0.5, 'reinforce', 0.5], ['horde', 1.3, 'bolt', 0.8], ['horde', 1.32, 'quake', 0.8], ['horde', 2.4, 'bolt', 0.6], ['horde', 2.42, 'quake', 0.6],
    ['eye', 0, 'quake', 0.6], ['eye', 0.4, 'charge', 0.9], ['draw', 0, 'unsheathe_01', 1], ['draw', 0.35, 'slash_0', 1], ['draw', 0.4, 'whoosh', 1],
    ['panels', 0, 'slash_2', 0.9], ['panels', 0.35, 'slash_1', 0.9], ['panels', 0.7, 'blow_big', 0.8],
    ['colossus', 0, 'quake', 1], ['colossus', 0.1, 'horn', 0.8], ['colossus', 1.1, 'bolt', 0.7], ['colossus', 1.2, 'quake', 0.9], ['colossus', 2.3, 'boss', 1], ['colossus', 2.6, 'bolt', 0.6], ['colossus', 2.8, 'quake', 1],
    ['gaze', 0, 'charge', 1], ['gaze', 0.6, 'windup', 1],
    ['strike', 0, 'whoosh', 1], ['strike', 0.62, 'clang_1', 1], ['strike', 0.63, 'blow_big', 1], ['strike', 0.65, 'smash', 1], ['strike', 0.7, 'quake', 1],
    ['defy', 0, 'quake', 0.8], ['defy', 0.9, 'parry', 1], ['defy', 0.92, 'slash_2', 1], ['defy', 1.3, 'perfect', 0.8],
    ['title', 0.4, 'allout', 1], ['title', 0.42, 'clang_0', 0.7], ['title', 1.8, 'level_up', 0.4],
  ].concat(CONTACT.map((c, i) => ['charge', c, i % 2 ? 'slash_1' : 'slash_2', 0.85])).map(([sh, t, name, v]) => [AT(sh) + t, name, v]);
  const MUSIC_AT = AT('draw');

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
      } else {
        // A big title: slams in from larger with a white flash and a brief colour split, then holds crisp.
        const k = w.k || 0, punch = k < 0.15 ? 1 + (0.15 - k) * 4 : 1, sz = Math.round(w.size * 1.6 * u * punch);
        c.font = `${sz}px Adventurer, sans-serif`; c.textBaseline = 'middle'; c.textAlign = 'center';
        if ('letterSpacing' in c) c.letterSpacing = Math.round(sz * 0.04) + 'px';
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
    say(S, 'card', 'THE FIRST CUT', W() - 10, BAR + 16, { align: 'right', sub: 'WHO WOUNDED THE MOON', k: T });
    if (k > 0.92) fill(ctx, '#ffffff', (k - 0.92) / 0.08);
  };
  // He leaps at the falling moon: a small black figure against its vast face, with afterimages and speed lines.
  SH.leap = function (ctx, S, k, T) {
    const mx = W() * 0.56, my = H() * 0.52, r = H() * 0.62;
    grad(ctx, ['#1a0812', '#3a1420']);
    K().speedLines(ctx, mx, my, 70, 'rgba(255,240,240,0.35)', 21, T, r * 0.95);
    moon(ctx, mx, my, r, '#f2d6c8', 'rgba(255,90,90,0.45)', 0);
    const set = S.cast.first, e = ease(k), px = W() * 0.04 + (mx + r * 0.1 - W() * 0.04) * e, py = H() * 1.04 - (H() * 1.04 - (my - r * 0.12)) * Math.sin(e * Math.PI / 2), sc = 0.7 + 0.25 * e;
    const fr = Math.min(14, Math.floor(k * 12));
    for (let i = 4; i >= 1; i--) A.actor(ctx, set, 'Attack4', Math.max(0, fr - i), 0, Math.round(px - i * 7), Math.round(py + i * 4), sc, { shade: RED, alpha: 0.14 * (5 - i) });
    A.actor(ctx, set, 'Attack4', fr, 0, Math.round(px), Math.round(py), sc, { shade: '#050307' });
    city(ctx, H() * 1.02, 13, '#080406', 0, 1.3);
    kick(S, 1.2);
  };
  // Impact frames: white, the inverted moon with the tiny swordsman across it, then the wound torn across it.
  SH.cutmoon = function (ctx, S, k, T) {
    const mx = W() * 0.55, my = H() * 0.5, r = H() * 0.6, set = S.cast.first, kx = Math.round(mx + r * 0.18), ky = Math.round(my - r * 0.02);
    const cutLine = (col) => K().line(ctx, mx - r * 1.3, my + r * 0.46, mx + r * 1.3, my - r * 0.46, 2, col);
    if (k < 0.07) { fill(ctx, '#ffffff'); kick(S, 6); return; }
    if (k < 0.24) {
      fill(ctx, '#000'); burst(ctx, kx, ky - 16, '#ffffff', 70, 41, 22);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(mx, my, r, 0, 7); ctx.stroke();
      cutLine('#ffffff'); A.actor(ctx, set, 'Attack4', 14, 0, kx, ky, 0.95, { shade: '#ffffff' }); return;
    }
    if (k < 0.34) { fill(ctx, '#ffffff'); PX.disc(ctx, mx, my, Math.round(r), '#000'); cutLine('#ffffff'); A.actor(ctx, set, 'Attack4', 14, 0, kx, ky, 0.95, { shade: '#ffffff' }); return; }
    const kk = (k - 0.34) / 0.66;
    grad(ctx, ['#14060c', '#3a0e18']);
    stars(ctx, 60, 0.7, 5, T);
    moon(ctx, mx + Math.sin(T * 60) * 2 * (1 - kk), my, r, '#f0d0c4', 'rgba(255,60,80,0.5)', Math.min(1, 0.4 + kk * 3), null);
    sparks(ctx, kx, ky - 14, T, 80, 51, 6.2);
    A.actor(ctx, set, 'TakeDamage', Math.min(14, Math.floor(kk * 14)), 0, Math.round(kx + kk * 26), Math.round(ky + kk * 60), 0.9 - kk * 0.25, { shade: '#050307' });
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
    if (T < 1.1) {
      const t = T, gy = Math.round(H() * 0.62);
      grad(ctx, ['#1a0408', '#5a0e1c', '#a82038']);
      moon(ctx, W() * 0.78, H() * 0.04, H() * 0.42, '#ff4a5e', 'rgba(255,40,70,0.5)', 1, T);
      ctx.fillStyle = '#0c0306'; ctx.fillRect(-8, gy, W() + 16, H());
      // A tombstone and a cross, close.
      ctx.fillStyle = '#060103'; ctx.fillRect(Math.round(W() * 0.16), gy - 46, 30, 50); PX.disc(ctx, W() * 0.16 + 15, gy - 46, 15, '#060103');
      ctx.fillRect(Math.round(W() * 0.84), gy - 52, 5, 56); ctx.fillRect(Math.round(W() * 0.84) - 10, gy - 40, 25, 5);
      ctx.fillStyle = '#1a0a0e'; for (let i = 0; i < 30; i++) ctx.fillRect(Math.round(hash(i, 201) * W()), gy + 4 + Math.round(hash(i, 202) * (H() - gy)), 2 + Math.round(hash(i, 203) * 4), 1);
      const hx = Math.round(W() * 0.5), hy = gy + 30, ck = clamp(t / 0.4);
      // The earth cracks red.
      if (ck > 0) { A.tex(ctx, 'light_01', hx, hy, 120 * ck, 30 * ck, RED, 0.5, 0, true); for (let i = 0; i < 6; i++) K().crack(ctx, hx, hy, (i / 6) * Math.PI * 2, 14 + 40 * ck, 210 + i, i % 2 ? RED : '#ff9aa8', 1); }
      // The hand bursts out.
      const hk = clamp((t - 0.35) / 0.45);
      if (hk > 0) {
        ctx.save(); ctx.beginPath(); ctx.rect(-8, -8, W() + 16, hy + 8); ctx.clip();
        ctx.translate(hx, hy); ctx.scale(1.6, 1.6); ctx.translate(-hx, -hy);
        hand(ctx, hx, hy, Math.round(8 + 36 * ease(hk)), '#120408', '#ff5a6a');
        ctx.restore();
        if (hk < 0.6) for (let i = 0; i < 26; i++) { const a = -Math.PI / 2 + (hash(i, 211) - 0.5) * 2.2, v = 30 + hash(i, 212) * 70, tt = hk * 0.8; ctx.fillStyle = i % 3 ? '#2a1014' : '#5a2a2e'; ctx.fillRect(Math.round(hx + Math.cos(a) * v * tt), Math.round(hy + Math.sin(a) * v * tt + 120 * tt * tt), 2, 2); }
        if (hk < 0.15) kick(S, 3);
      }
      if (t > 0.98) fill(ctx, '#000', (t - 0.98) / 0.12);
      return;
    }
    const t = T - 1.1, push = 1 + 0.05 * clamp(t / 2.3);
    grad(ctx, ['#12030a', '#3a0812', '#7a1424']);
    ctx.save(); ctx.translate(W() / 2, H() * 0.7); ctx.scale(push, push); ctx.translate(-W() / 2, -H() * 0.7);
    moon(ctx, W() * 0.5, H() * 0.66, H() * 0.5, '#ff4a5e', 'rgba(255,40,70,0.55)', 1, T);
    const ridge = (x) => H() * 0.76 - Math.sin((x / W()) * Math.PI) * 10;
    const path = () => { ctx.beginPath(); ctx.moveTo(-20, H() + 20); for (let x = -20; x <= W() + 20; x += 4) ctx.lineTo(x, ridge(x)); ctx.lineTo(W() + 20, H() + 20); ctx.closePath(); };
    // Crosses on the ridge, then the ridge itself.
    ctx.fillStyle = '#050203';
    for (const gx of [0.06, 0.3, 0.62, 0.95]) { const x = Math.round(W() * gx), y = Math.round(ridge(x)); ctx.fillRect(x, y - 16, 3, 18); ctx.fillRect(x - 5, y - 12, 13, 3); }
    path(); ctx.fill();
    // The risen, in a row: the death clip played backwards, out of the ridge.
    const N = 6, order = [2, 4, 0, 5, 1, 3];
    for (let i = 0; i < N; i++) {
      const x = Math.round(W() * (0.12 + i * 0.152)), y = Math.round(ridge(x)) + 2, set = deadSet(S, i), st = 0.15 + order[i] * 0.26, p = clamp((t - st) / 0.55), sc = 1.45;
      if (p <= 0) continue;
      const clip = 'Idle', fr = Math.floor(T * 7 + i * 3) % 15, ang = Math.PI / 2, shakeX = p < 1 ? Math.round(Math.sin(T * 40 + i) * 1.2) : 0;
      ctx.save(); ctx.beginPath(); ctx.rect(-20, -20, W() + 40, y + 20); ctx.clip();
      A.actor(ctx, set, clip, fr, ang, x + shakeX, y + Math.round((1 - ease(p)) * 64), sc, { shade: '#050203' });
      ctx.restore();
      if (p > 0.85) {   // the eyes light
        const b = A.box(set, 'Idle', 0, ang, sc); if (b) { const ex = Math.round(x + b.x + b.w / 2), ey = Math.round(y + b.y + Math.max(3, b.h * 0.13)), a = clamp((p - 0.85) * 7); ctx.globalAlpha = a; ctx.fillStyle = '#ffd0d6'; ctx.fillRect(ex - 3, ey, 2, 1); ctx.fillRect(ex + 1, ey, 2, 1); A.tex(ctx, 'light_01', ex, ey, 18, 10, RED, 0.7 * a, 0, true); ctx.globalAlpha = 1; }
      }
      if (p > 0 && p < 0.4) for (let j = 0; j < 8; j++) { ctx.fillStyle = '#1a0608'; ctx.fillRect(Math.round(x + (hash(i, j) - 0.5) * 18), Math.round(y - p * 26 * hash(j, i + 7)), 2, 2); }
    }
    A.tex(ctx, 'smoke_07', W() * 0.5, H() * 0.8, W() * 1.6, 26, '#ff3048', 0.18, 0, true);
    ctx.restore();
    if (t < 0.15) fill(ctx, '#000', 1 - t / 0.15);
  };
  // Tonight: a black plain under the bleeding moon. Red eyes open in the dark, hundreds of them, in waves
  // from the middle out; lightning shows the horde they belong to, rank behind rank to the horizon,
  // marching at us.
  SH.horde = function (ctx, S, k, T) {
    const hz = Math.round(H() * 0.66), flash = (T > 1.3 && T < 1.42) || (T > 2.4 && T < 2.47), push = 1 + 0.06 * k;
    grad(ctx, ['#020103', '#10030a', '#34070f']);
    stars(ctx, 30, 0.35, 17, T);
    ctx.save(); ctx.translate(W() / 2, H() * 0.75); ctx.scale(push, push); ctx.translate(-W() / 2, -H() * 0.75);
    moon(ctx, W() * 0.5, hz + H() * 0.1, H() * 0.44, '#ff3a52', 'rgba(255,40,70,0.55)', 1, T);
    const fl = ctx.createLinearGradient(0, hz, 0, H()); fl.addColorStop(0, '#4a0c18'); fl.addColorStop(0.5, '#2a060e'); fl.addColorStop(1, '#100206'); ctx.fillStyle = fl; ctx.fillRect(-20, hz, W() + 40, H());
    A.tex(ctx, 'light_01', W() * 0.5, hz + 8, W() * 0.9, 50, '#ff3048', 0.35, 0, true);   // the moon's light across the plain
    // Countless far eyes along the horizon, no bodies to see.
    for (let i = 0; i < 160; i++) { const x = hash(i, 301) * W(), y = hz + 1 + Math.pow(hash(i, 302), 2) * 10, open = 0.15 + Math.abs(x - W() / 2) / W() * 1.1 + hash(i, 303) * 0.3; if (T < open) continue; ctx.fillStyle = `rgba(255,42,68,${Math.min(1, (T - open) * 4) * (0.5 + 0.5 * hash(i, 304))})`; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); ctx.fillRect(Math.round(x) + 2, Math.round(y), 1, 1); }
    // The ranks, far to near.
    const ROWS = 6;
    for (let r = 0; r < ROWS; r++) {
      const d = r / (ROWS - 1), y0 = hz + 5 + Math.pow(d, 1.4) * (H() - BAR - hz - 4) + T * 3 * d, sc = 0.4 + d * 1.55, sp = 12 + d * 38, n = Math.ceil(W() / sp) + 2, off = (r % 2) * sp * 0.5;
      for (let i = 0; i < n; i++) {
        const x = Math.round(i * sp - off + (hash(r, i + 310) - 0.5) * sp * 0.5), y = Math.round(y0 + (hash(i, r + 311) - 0.5) * 3), set = deadSet(S, i + r * 3), fr = Math.floor(T * 8 + i * 3 + r) % 15;
        A.actor(ctx, set, 'Walk', fr, Math.PI / 2, x, y, sc, { shade: flash ? '#4a1a24' : '#040102' });
        const open = 0.1 + Math.abs(x - W() / 2) / W() * 1.2 + (1 - d) * 0.15 + hash(i, r + 312) * 0.15;
        if (T < open) continue;
        const b = A.box(set, 'Walk', fr, Math.PI / 2, sc); if (!b) continue;
        const a = Math.min(1, (T - open) * 5), ex = Math.round(x + b.x + b.w / 2), ey = Math.round(y + b.y + Math.max(2, b.h * 0.13)), pw = Math.max(1, Math.round(sc * 0.7)), gap = Math.max(1, Math.round(sc * 1.1));
        ctx.globalAlpha = a; ctx.fillStyle = d > 0.6 ? '#ffd0d6' : RED; ctx.fillRect(ex - gap - pw, ey, pw, Math.max(1, pw >> 1)); ctx.fillRect(ex + gap, ey, pw, Math.max(1, pw >> 1));
        if (sc > 0.9) A.tex(ctx, 'light_01', ex, ey, 10 * sc, 5 * sc, RED, 0.5 * a, 0, true);
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
    if (flash) { fill(ctx, '#ffe8ee', 0.2); ctx.strokeStyle = '#ffe0e8'; ctx.lineWidth = 1; ctx.beginPath(); let x = W() * (T < 2 ? 0.27 : 0.74), y = 0; ctx.moveTo(x, y); while (y < hz) { x += (hash(Math.floor(T * 10), y | 0) - 0.5) * 16; y += 7; ctx.lineTo(x, y); } ctx.stroke(); kick(S, 3); }
    if (T < 0.12) fill(ctx, '#000', 1 - T / 0.12);
  };
  // The visor close up; under it an eye opens red and the red cracks run out.
  SH.eye = function (ctx, S, k, T) {
    fill(ctx, INK);
    K().embers(ctx, T, 26, 0, W(), RED);
    const sc = 3.4 + 0.6 * ease(k), open = ease((k - 0.2) / 0.35);
    const at = closeUp(ctx, S.cast.vesper, 0, sc, Math.round(W() * 0.6 + Math.sin(T * 2) * 2), Math.round(H() * 0.42), [19, 6], open, RED, T);
    if (open > 0) { ctx.globalAlpha = clamp((k - 0.35) * 3); for (let i = 0; i < 6; i++) K().crack(ctx, at.x + (i % 2 ? 6 : -6), at.y + 2, Math.PI / 2 + (i - 2.5) * 0.35, 40 + 50 * ease((k - 0.35) / 0.5), 70 + i, RED, 1); ctx.globalAlpha = 1; }
    rain(ctx, T, 50, 0.25, 0.1);
    if (T > 0.5) say(S, 'card', 'VESPER', W() - 10, BAR + 16, { align: 'right', sub: 'THE MOONBLADE', col: '#ff9aaa', k: T - 0.5 });
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
  // The First Cut as a god over the Spire. The camera starts on her, small on a broken rampart, and tilts
  // up the whole height of him: clouds drift across his chest, stones rise, lightning shows his shape,
  // the red moon sits behind his head like a halo, and his eyes ignite.
  // The god-shape of the First Cut, drawn as one silhouette round his eyes (u = the size of one unit):
  // a crowned and horned helm, a gorget, vast spiked pauldrons, a tattered cape spread like wings, both
  // hands on the hilt of a sword the size of a tower planted point-down before him.
  function deity(ctx, ex, ey, u, col, T) {
    const P = (pts) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(ex + x * u, ey + y * u) : ctx.moveTo(ex + x * u, ey + y * u))); ctx.closePath(); ctx.fill(); };
    const sway = Math.sin(T * 1.3) * 0.6;
    ctx.fillStyle = col;
    // The cape, torn at the hem, moving a little.
    for (const sx of [-1, 1]) { const pts = [[sx * 6, 7], [sx * 13, 8]]; for (let i = 0; i <= 8; i++) { const yy = 20 + i * 6, xx = sx * (14 + i * 2.6 + Math.sin(T * 1.6 + i) * 0.8); pts.push([xx, yy]); } for (let i = 8; i >= 0; i--) pts.push([sx * (3 + i * 1.2), 70 + (i % 2 ? 6 : -2) + sway]); P(pts); }
    // Horns, sweeping out and up.
    for (const sx of [-1, 1]) P([[sx * 2.4, -3.5], [sx * 6, -7], [sx * 9.5, -12], [sx * 9, -18], [sx * 8, -13], [sx * 5, -8.5], [sx * 2.8, -6]]);
    // The sword: the blade (long, tapering to the point far below), the guard, the grip, the pommel.
    P([[-2.2, 30], [2.2, 30], [1.6, 95], [0, 102], [-1.6, 95]]);
    P([[-8, 28], [8, 28], [9, 30.5], [-9, 30.5]]); P([[-1, 19], [1, 19], [1, 28], [-1, 28]]); P([[-1.8, 17], [1.8, 17], [1.4, 19.5], [-1.4, 19.5]]);
    // The body: gorget, breastplate, waist.
    P([[-3, 4.5], [3, 4.5], [5.5, 8], [-5.5, 8]]);
    P([[-7.5, 8], [7.5, 8], [8.5, 18], [6, 32], [-6, 32], [-8.5, 18]]);
    // The pauldrons, with three spikes each.
    for (const sx of [-1, 1]) { P([[sx * 4, 7], [sx * 11, 5.5], [sx * 15, 8.5], [sx * 15.5, 13], [sx * 11, 15], [sx * 5.5, 12]]); for (let i = 0; i < 3; i++) P([[sx * (8 + i * 2.6), 6.2 - i * 0.2], [sx * (9.2 + i * 2.6), -0.5 - i * 1.2], [sx * (10.4 + i * 2.6), 6.5]]); }
    // The arms down to the hilt, the gauntlets on the grip.
    ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const sx of [-1, 1]) { ctx.lineWidth = 4.2 * u; ctx.beginPath(); ctx.moveTo(ex + sx * 12 * u, ey + 11 * u); ctx.lineTo(ex + sx * 12.5 * u, ey + 19 * u); ctx.lineTo(ex + sx * 2.6 * u, ey + 23.5 * u); ctx.stroke(); }
    P([[-3.4, 21], [3.4, 21], [3.4, 26.5], [-3.4, 26.5]]);
    // The helm: tall, crowned with five spikes, narrowing to the jaw.
    P([[-3.4, -5], [3.4, -5], [3.2, 2], [2.4, 4.6], [0, 6], [-2.4, 4.6], [-3.2, 2]]);
    const crown = [[-3.4, -5]]; for (let i = 0; i <= 8; i++) crown.push([-3.4 + i * 0.85, i % 2 ? -6.2 : (i === 4 ? -11.5 : -8.6)]); crown.push([3.4, -5]); P(crown);
  }
  function colossus(ctx, S, ex, ey, sc, T, o) {
    const u = sc / 2;   // sc as the old sprite scale: eyes ±1.5·sc apart become ±3u... keep the eyes inside the visor
    ctx.save();
    deity(ctx, ex + Math.max(1, u * 0.35), ey - Math.max(1, u * 0.25), u, o.rim || '#ff5a6a', T);   // the moon's rim light
    deity(ctx, ex - Math.max(1, u * 0.2), ey, u, '#5a0a1a', T);
    deity(ctx, ex, ey, u, o.col || '#050204', T);
    // A rune burning down the blade's edge.
    ctx.strokeStyle = 'rgba(255,42,68,0.85)'; ctx.lineWidth = Math.max(1, u * 0.3); ctx.beginPath(); ctx.moveTo(ex, ey + 31 * u); ctx.lineTo(ex, ey + 94 * u); ctx.stroke();
    A.tex(ctx, 'light_01', ex, ey + 60 * u, 8 * u, 70 * u, RED, 0.25, 0, true);
    ctx.restore();
  }
  function burningEyes(ctx, ex, ey, sc, open, T) {
    if (open <= 0) return;
    const d = 0.9 * sc, w = Math.max(2, Math.round(sc * 0.5 * open)), h = Math.max(1, Math.round(sc * 0.2 * open)), fl = 0.85 + 0.15 * Math.sin(T * 30);
    A.tex(ctx, 'light_01', ex, ey, sc * 7 * open, sc * 3.5 * open, RED, 0.8 * fl, 0, true);
    for (const sx of [-1, 1]) {
      const x = Math.round(ex + sx * d);
      A.tex(ctx, 'light_01', x, ey, sc * 2.4, sc * 1.4, '#ffffff', 0.6 * open, 0, true);
      ctx.fillStyle = RED; ctx.fillRect(x - w, ey - h, w * 2, h * 2); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - Math.round(w * 0.6), ey - Math.max(1, h >> 1), Math.round(w * 1.2), Math.max(1, h));
    }
  }
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
    if (bolt) { fill(ctx, 'rgba(255,220,230,0.18)'); ctx.strokeStyle = '#ffd8e0'; ctx.lineWidth = 1; ctx.beginPath(); let x = W() * (T < 2 ? 0.2 : 0.8), y = 0; ctx.moveTo(x, y); while (y < Hh) { x += (hash(Math.floor(T * 10), y | 0) - 0.5) * 18; y += 8; ctx.lineTo(x, y); } ctx.stroke(); }
    colossus(ctx, S, ex, at(eyW), sc, T, { rim: bolt ? '#ffffff' : '#ff5a6a', col: bolt ? '#1a0a12' : '#050204' });
    burningEyes(ctx, ex, at(eyW), sc, ease(clamp((T - 2.3) / 0.35)), T);
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
  // His gaze: the visor huge and black against the moon, the eyes white-hot; below, her eye answers.
  SH.gaze = function (ctx, S, k, T) {
    const split = Math.round(H() * 0.66);
    ctx.save(); ctx.beginPath(); ctx.rect(-8, -8, W() + 16, split + 7); ctx.clip();
    fill(ctx, '#2a0610'); moon(ctx, W() / 2, H() * 0.3, H() * 0.75, '#ff3a52', 'rgba(255,40,70,0.6)', 0);
    const sc = 30 + 4 * ease(k), ex = Math.round(W() / 2), ey = Math.round(H() * 0.36);
    colossus(ctx, S, ex, ey, sc, T, { rimA: 0.7 });
    burningEyes(ctx, ex, ey, sc * 0.95, 1, T);
    for (let i = 0; i < 14; i++) { const a = (hash(i, 231) - 0.5) * 0.9, L = 30 + hash(i, 232) * 80; ctx.strokeStyle = 'rgba(255,200,200,0.35)'; ctx.lineWidth = 1; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(ex + sx * 1.3 * sc, ey); ctx.lineTo(ex + sx * (1.3 * sc + L), ey + Math.tan(a) * L); ctx.stroke(); } }
    ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(-8, split + 1, W() + 16, H()); ctx.clip();
    fill(ctx, '#140608'); K().hStreaks(ctx, 20, 'rgba(255,90,110,0.4)', 233, T, 900);
    closeUp(ctx, S.cast.vesper, 0, 4.0, Math.round(W() * 0.62 - (1 - ease(k * 4)) * 50), Math.round(split + (H() - split) * 0.55), [19, 6], 1, RED, T, {});
    ctx.restore();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-8, split - 1, W() + 16, 2);
    kick(S, 1.2);
    if (k > 0.9) fill(ctx, '#ffffff', (k - 0.9) / 0.1);
  };
  // His blade comes down from the sky, the size of a tower; she meets it. Impact frames; sparks; the ground breaks.
  function bigBlade(ctx, x0, y0, x1, y1, wd, col, edge) {
    const a = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(a) * wd / 2, ny = Math.cos(a) * wd / 2;
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x0 + nx, y0 + ny); ctx.lineTo(x1 + nx * 0.4, y1 + ny * 0.4); ctx.lineTo(x1 + Math.cos(a) * wd * 0.8, y1 + Math.sin(a) * wd * 0.8); ctx.lineTo(x1 - nx * 0.4, y1 - ny * 0.4); ctx.lineTo(x0 - nx, y0 - ny); ctx.closePath(); ctx.fill();
    if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0 + nx, y0 + ny); ctx.lineTo(x1 + nx * 0.4, y1 + ny * 0.4); ctx.stroke(); }
  }
  SH.strike = function (ctx, S, k, T) {
    const vs = S.cast.vesper, gx = Math.round(W() * 0.46), gy = Math.round(H() * 0.84), hit = 0.33, tipX = gx + 4, tipY = gy - 30, fromX = W() * 1.25, fromY = -H() * 0.6;
    const ground = () => { ctx.fillStyle = '#080204'; ctx.fillRect(-8, gy, W() + 16, H()); };
    if (k < hit) {
      const f = ease(k / hit);
      grad(ctx, ['#12030a', '#4a0c18', '#1a0408']);
      moon(ctx, W() * 0.8, H() * 0.2, H() * 0.22, '#ff3a52', 'rgba(255,40,70,0.5)', 1, T);
      ground();
      const tx = fromX + (tipX - fromX) * f, ty = fromY + (tipY - fromY) * f;
      for (let i = 1; i <= 3; i++) { ctx.globalAlpha = 0.15 * (4 - i); bigBlade(ctx, fromX, fromY, tx + i * 26, ty - i * 30, 26, '#ff8a9a'); } ctx.globalAlpha = 1;
      bigBlade(ctx, fromX, fromY, tx, ty, 26, '#1a1418', '#ffffff');
      A.actor(ctx, vs, 'Idle4', Math.floor(T * 10) % 15, -Math.PI * 0.25, gx, gy, 1.7, {});
      return;
    }
    const kk = k - hit;
    if (kk < 0.04) { fill(ctx, '#ffffff'); bigBlade(ctx, fromX, fromY, tipX, tipY, 26, '#000'); A.actor(ctx, vs, 'Special1', 8, -Math.PI * 0.25, gx, gy, 1.7, { shade: '#000' }); kick(S, 8); return; }
    if (kk < 0.1) { fill(ctx, '#000'); burst(ctx, tipX, tipY, '#ffffff', 90, 241, 10); bigBlade(ctx, fromX, fromY, tipX, tipY, 26, '#ffffff'); A.actor(ctx, vs, 'Special1', 8, -Math.PI * 0.25, gx, gy, 1.7, { shade: '#ffffff' }); return; }
    const e = kk - 0.1;
    const hot = ctx.createRadialGradient(tipX, tipY, 4, tipX, tipY, W() * 0.7); hot.addColorStop(0, '#fff2d0'); hot.addColorStop(0.15, '#ffb050'); hot.addColorStop(0.45, '#c8102e'); hot.addColorStop(1, '#2a0408');
    ctx.fillStyle = hot; ctx.fillRect(-8, -8, W() + 16, H() + 16);
    burst(ctx, tipX, tipY, 'rgba(60,0,10,0.4)', 60, 243, 24);
    ground();
    for (let i = 0; i < 10; i++) K().crack(ctx, gx, gy + 1, (i < 5 ? Math.PI : 0) + (hash(i, 244) - 0.5) * 0.5, 30 + 120 * ease(e * 2), 250 + i, i % 2 ? RED : '#ffb050', 1);
    for (let i = 0; i < 2; i++) { const rk = ease(e * 2 - i * 0.2); if (rk <= 0 || rk >= 1) continue; ctx.strokeStyle = `rgba(255,230,200,${1 - rk})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(gx, gy, 10 + rk * 200, 3 + rk * 22, 0, 0, 7); ctx.stroke(); }
    const push = Math.round(Math.sin(T * 50) * 1.5);
    bigBlade(ctx, fromX, fromY, tipX + push, tipY, 26, '#000');
    A.actor(ctx, vs, 'Special1', 8, -Math.PI * 0.25, gx + push, gy, 1.7, { shade: '#000' });
    sparks(ctx, tipX, tipY, T, 90, 245, 5.5);
    for (let i = 0; i < 20; i++) { const life = clamp(e * 2 - hash(i, 246) * 0.3); if (life <= 0 || life >= 1) continue; ctx.fillStyle = '#1a0608'; ctx.fillRect(Math.round(gx + (hash(i, 247) - 0.5) * 2 * 120 * life), Math.round(gy - 80 * life + 140 * life * life), 3, 2); }
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
      if (throwK > 0) { K().line(ctx, tipX - 80, tipY + 40, tipX + 120, tipY - 70, 2, '#ffffff'); kick(S, 5); }
      else kick(S, 1.5);
    } else {
      // His eyes in the dark above; her small shape below, the blade raised at him.
      const e = clamp((k - 0.65) / 0.35);
      ctx.fillStyle = '#0a0204'; ctx.fillRect(-8, -8, W() + 16, gy + 8);
      colossus(ctx, S, Math.round(W() * 0.5), Math.round(H() * 0.24), 9, T, { rim: '#5a0a1a', rimA: 0.8, col: '#140306' });
      burningEyes(ctx, Math.round(W() * 0.5), Math.round(H() * 0.24), 9, 1, T);
      ctx.fillStyle = '#000'; ctx.fillRect(-8, gy, W() + 16, H());
      A.actor(ctx, vs, 'Special1', 14, -Math.PI * 0.5, gx, gy, 1.9, { shade: '#000' });
      K().line(ctx, gx + 2, gy - 34, gx + 2 + (W() * 0.5 - gx) * 0.25 * ease(e * 2), gy - 34 - 60 * ease(e * 2), 1, '#ffffff');
      if (k > 0.9) fill(ctx, '#ffffff', (k - 0.9) / 0.1);
    }
  };
  // The red moon; she stands on the rampart, her back to us; VESPER.
  SH.title = function (ctx, S, k, T) {
    const sh = SHOTS[SHOTS.length - 1], dur = sh[2] - sh[1], out = 0.6 / dur;
    grad(ctx, ['#080206', '#2a0610', '#4a0c18']);
    stars(ctx, 60, 0.5, 11, T);
    // His shadow over everything, faint, the moon at his heart; his eyes burning above the name.
    const loom = clamp((T - 0.2) / 1.2);
    if (loom > 0) { ctx.save(); ctx.globalAlpha = 0.85 * loom; colossus(ctx, S, Math.round(W() / 2), Math.round(H() * 0.09), 8, T, { rim: '#4a0a16', col: '#12030a' }); ctx.restore(); burningEyes(ctx, Math.round(W() / 2), Math.round(H() * 0.09), 8, loom * (0.75 + 0.25 * Math.sin(T * 2)), T); }
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
      say(S, 'big', 'VESPER', W() / 2, y, { size: 78, k: tk });
      const dv = R.uiImg && R.uiImg('divider');
      if (dv && tk > 0.3) { ctx.globalAlpha = clamp((tk - 0.3) * 3); ctx.drawImage(dv, Math.round(W() / 2 - dv.naturalWidth / 2), y + 20); ctx.globalAlpha = 1; }
      if (tk > 1.0) say(S, 'line', 'A LAST DITCH EFFORT', W() / 2, y + 38, { size: 18, col: '#ffc8d2', a: clamp((tk - 1.0) * 2), spacing: 3 });
      if (tk > 2.0) say(S, 'line', 'Six guardians. One night. Close the wound before dawn.', W() / 2, H() - 10, { size: 17, col: '#ffffff', a: clamp((tk - 2.0) * 2) });
    }
    if (k > 1 - out) fill(ctx, '#000', (k - (1 - out)) / out);
  };

  // ---- the frame -------------------------------------------------------------------------------------
  function shotAt(t) { for (const s of SHOTS) if (t < s[2]) return s; return SHOTS[SHOTS.length - 1]; }
  I.shotAt = (t) => shotAt(t)[0];
  const NO_BARS = { panels: 1, gaze: 1, defy: 1 };
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
    // The words, on the sharp layer above.
    for (const [a, b, text] of LINES) if (S.t >= a && S.t <= b) say(S, 'line', text, W() / 2, H() - BAR / 2 + 1, { size: 17, col: '#ffffff', a: Math.min(1, (S.t - a) * 4, (b - S.t) * 4), mid: true });
    say(S, 'line', R.touch ? 'Tap to skip' : 'Esc to skip', W() - 6, BAR / 2 + 1, { size: 11, col: 'rgba(240,230,234,0.6)', align: 'right', mid: true });
    words(S);
  };
})();
