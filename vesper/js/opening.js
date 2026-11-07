// VESPER — the opening, about 23 seconds, drawn at full resolution: smooth painted light and
// ribbons around crisp scaled-up pixel figures. It is cut like an anime transformation:
//   blood sky   a flat red sky, the swordsman a black silhouette, pushing in, one glint; the cut
//   ribbons     the cut tears the sky; ribbons of red light whip across the frame; the title
//   the dead    the ribbons fall and the dead assemble out of flying shards
//   wipes       a dark smear, a gold flash
//   the hero    your hero forms out of the ribbons, shard by shard; the camera climbs the figure
//   the eye     an extreme close-up: the eye opens red
//   the spire   the flat red sky again, the Spire black with a guardian's eyes on every ledge; title
(function () {
  const VS = window.VS, D = VS.DATA, A = VS.A, R = VS.R;
  const O = VS.OPEN = {};
  const RED = '#ff2a44', BLOOD = '#e8141e';
  const BEATS = [['sky', 0, 4.6], ['ribbons', 4.6, 7.4], ['dead', 7.4, 10.4], ['wipe', 10.4, 11.0], ['hero', 11.0, 15.6], ['eye', 15.6, 18.6], ['spire', 18.6, 23.4]];
  O.BEATS = BEATS; O.dur = BEATS[BEATS.length - 1][2];
  O.next = (t) => { const b = BEATS.find((x) => x[1] > t + 0.01); return b ? b[1] : O.dur; };
  O.cues = function (t0, t1) {
    const out = [], at = (t) => t0 < t && t <= t1;
    const C = [[0.05, 'quake', 0.5], [1.6, 'charge', 0.5], [3.6, 'charge', 0.9], [4.45, 'whoosh', 1], [4.6, 'blow_big', 1], [4.6, 'clang_1', 0.9], [4.7, 'quake', 1], [5.6, 'allout', 0.9],
      [7.4, 'quake', 0.8], [8.2, 'horn', 0.6], [10.4, 'whoosh', 1], [10.75, 'blow_big', 0.9], [11.2, 'magic', 0.8], [12.6, 'charge', 0.7], [14.6, 'allout', 0.8],
      [15.6, 'quake', 0.7], [16.6, 'clang_1', 0.8], [18.6, 'whoosh', 0.9], [21.0, 'blow_big', 1], [21.0, 'clang_1', 0.8], [21.05, 'quake', 1]];
    for (const [t, n, v] of C) if (at(t)) out.push([n, v]);
    return out;
  };
  const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const ease = (k) => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3);
  const easeIn = (k) => Math.pow(Math.max(0, Math.min(1, k)), 2.2);
  const clamp01 = (k) => Math.max(0, Math.min(1, k));
  const W = () => R.W, H = () => R.H;

  // ---- painting tools -----------------------------------------------------------------------------
  // A figure at a screen scale, its feet at (x, y); shade turns it into a flat silhouette.
  const fig = (ctx, set, clip, fr, ang, x, y, sc, o) => A.actor(ctx, set, clip, fr, ang, Math.round(x), Math.round(y), sc, o || {});
  // The point on a figure: fx, fy are fractions of its frame (0,0 top-left), feet at (x, y).
  function onFig(set, clip, fr, ang, x, y, sc, fx, fy) { const b = A.box(set, clip, fr, ang, sc) || { x: -16 * sc, y: -48 * sc, w: 32 * sc, h: 48 * sc }; return { x: x + b.x + b.w * fx, y: y + b.y + b.h * fy, b }; }
  // A ribbon of light: a tapered band following a moving curve, soft edge, bright core.
  function ribbon(ctx, pts, w, col, core, alpha) {
    if (pts.length < 2) return;
    const L = [], Rt = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[Math.min(pts.length - 1, i + 1)], o = pts[Math.max(0, i - 1)], dx = q[0] - o[0], dy = q[1] - o[1], n = Math.hypot(dx, dy) || 1, f = Math.sin(Math.PI * i / (pts.length - 1)), ww = w * (0.15 + 0.85 * f);
      L.push([p[0] - dy / n * ww, p[1] + dx / n * ww]); Rt.push([p[0] + dy / n * ww, p[1] - dx / n * ww]);
    }
    const path = new Path2D(); path.moveTo(L[0][0], L[0][1]); for (const p of L) path.lineTo(p[0], p[1]); for (let i = Rt.length - 1; i >= 0; i--) path.lineTo(Rt[i][0], Rt[i][1]); path.closePath();
    ctx.save(); ctx.globalAlpha *= alpha == null ? 1 : alpha; ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = w * 0.8; ctx.fill(path); ctx.shadowBlur = 0;
    if (core) { ctx.lineWidth = Math.max(1, w * 0.16); ctx.strokeStyle = core; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); }
    ctx.restore();
  }
  const PAL = ['#f6e6cc', '#f0b48a', '#e2643c', '#c8283a', '#7a1424', '#ffd9b0'];
  // A storm of ribbons whipping across the frame; density 0..1, dir: sweep direction.
  function storm(ctx, t, n, seed, density, front) {
    for (let i = 0; i < n; i++) {
      if (hash(seed, i) > density) continue;
      const sp = 0.8 + hash(seed + 1, i) * 1.6, ph = (t * sp * 0.55 + hash(seed + 2, i)) % 1, ang = -0.5 + hash(seed + 3, i) * 1.0 + (i % 2 ? Math.PI : 0);
      const cx = W() / 2 + Math.cos(ang) * (ph - 0.5) * W() * 2.4, cy = H() * (0.1 + hash(seed + 4, i) * 0.8) + Math.sin(ang) * (ph - 0.5) * H(), len = W() * (0.5 + hash(seed + 5, i) * 0.7), amp = H() * (0.05 + hash(seed + 6, i) * 0.12);
      const pts = []; for (let j = 0; j <= 18; j++) { const u = j / 18 - 0.5; pts.push([cx + Math.cos(ang) * u * len - Math.sin(ang) * Math.sin(u * 5 + t * 6 + i) * amp, cy + Math.sin(ang) * u * len + Math.cos(ang) * Math.sin(u * 5 + t * 6 + i) * amp]); }
      const w = H() * (front ? 0.05 + hash(seed + 7, i) * 0.06 : 0.015 + hash(seed + 7, i) * 0.03), col = PAL[Math.floor(hash(seed + 8, i) * PAL.length)];
      ribbon(ctx, pts, w, col, hash(seed + 9, i) < 0.4 ? 'rgba(255,250,240,0.85)' : null, front ? 0.92 : 0.6);
    }
  }
  // A figure assembling out of shards: triangles of its frame fly in from scattered spots.
  const shardCache = new Map();
  function shards(ctx, set, clip, fr, ang, x, y, sc, k, seed, o) {
    const b = A.box(set, clip, fr, ang, sc); if (!b) return;
    const key = set + clip + fr + ang + Math.round(sc * 100) + (o && o.shade || '');
    let c = shardCache.get(key);
    if (!c) { c = document.createElement('canvas'); c.width = Math.ceil(b.w) + 2; c.height = Math.ceil(b.h) + 2; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; A.actor(g, set, clip, fr, ang, Math.round(-b.x) + 1, Math.round(-b.y) + 1, sc, o || {}); if (shardCache.size > 30) shardCache.clear(); shardCache.set(key, c); }
    const N = 7, cw = c.width / N, ch = c.height / (N + 3), ox = x + b.x - 1, oy = y + b.y - 1;
    for (let gy = 0; gy < N + 3; gy++) for (let gx = 0; gx < N; gx++) for (let tri = 0; tri < 2; tri++) {
      const id = (gy * N + gx) * 2 + tri, delay = hash(seed, id) * 0.5, kk = ease((k - delay) / 0.5); if (kk <= 0) continue;
      const a = hash(seed + 1, id) * Math.PI * 2, dist = (1 - kk) * H() * (0.4 + hash(seed + 2, id) * 0.8), rot = (1 - kk) * (hash(seed + 3, id) - 0.5) * 6;
      const x0 = gx * cw, y0 = gy * ch, P = tri ? [[x0, y0], [x0 + cw, y0], [x0, y0 + ch]] : [[x0 + cw, y0], [x0 + cw, y0 + ch], [x0, y0 + ch]], cxp = (P[0][0] + P[1][0] + P[2][0]) / 3, cyp = (P[0][1] + P[1][1] + P[2][1]) / 3;
      ctx.save(); ctx.translate(ox + cxp + Math.cos(a) * dist, oy + cyp + Math.sin(a) * dist); ctx.rotate(rot); ctx.translate(-cxp, -cyp);
      ctx.beginPath(); ctx.moveTo(P[0][0] - 0.6, P[0][1] - 0.6); ctx.lineTo(P[1][0] + 0.6, P[1][1] - 0.6); ctx.lineTo(P[2][0] - 0.6, P[2][1] + 0.6); ctx.closePath(); ctx.clip();
      ctx.globalAlpha *= Math.min(1, kk * 2); ctx.drawImage(c, 0, 0); ctx.restore();
    }
  }
  function grade(ctx, top, bot, a) { const g = ctx.createLinearGradient(0, 0, 0, H()); g.addColorStop(0, top); g.addColorStop(1, bot); ctx.save(); ctx.globalAlpha = a == null ? 1 : a; ctx.fillStyle = g; ctx.fillRect(0, 0, W(), H()); ctx.restore(); }
  function vignette(ctx, a) { const g = ctx.createRadialGradient(W() / 2, H() / 2, H() * 0.35, W() / 2, H() / 2, W() * 0.7); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W(), H()); }
  let grainC = null;
  function grain(ctx, t) {
    if (!grainC) { grainC = document.createElement('canvas'); grainC.width = 256; grainC.height = 256; const g = grainC.getContext('2d'), d = g.createImageData(256, 256); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 18; } g.putImageData(d, 0, 0); }
    ctx.save(); ctx.globalCompositeOperation = 'overlay'; const ox = Math.floor(hash(Math.floor(t * 24), 1) * 256), oy = Math.floor(hash(Math.floor(t * 24), 2) * 256);
    for (let y = -oy; y < H(); y += 256) for (let x = -ox; x < W(); x += 256) ctx.drawImage(grainC, x, y); ctx.restore();
  }
  function flash(ctx, col, a) { if (a <= 0) return; ctx.save(); ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = col; ctx.fillRect(0, 0, W(), H()); ctx.restore(); }
  // Big type: a red glow, a hard white face, a slam in with a little glitch.
  function title(ctx, text, x, y, size, k, t, col) {
    if (k <= 0) return;
    const slam = k < 0.12 ? 1 + (0.12 - k) * 4 : 1, a = Math.min(1, k * 6);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(slam, slam);
    ctx.font = R.fd(size, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; if ('letterSpacing' in ctx) ctx.letterSpacing = Math.round(size * 0.12) + 'px';
    const tw = ctx.measureText(text).width + ('letterSpacing' in ctx ? 0 : text.length * size * 0.12); if (tw > W() * 0.9) ctx.scale(W() * 0.9 / tw, W() * 0.9 / tw);
    ctx.shadowColor = col || RED; ctx.shadowBlur = size * 0.5; ctx.fillStyle = col || RED; ctx.fillText(text, 0, 0);
    ctx.shadowBlur = 0; ctx.fillStyle = '#ffffff'; ctx.fillText(text, (k < 0.3 && hash(Math.floor(t * 30), 3) < 0.4) ? (hash(Math.floor(t * 30), 4) - 0.5) * size * 0.2 : 0, 0);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'; ctx.restore();
  }
  function line(ctx, text, y, k, size) { if (k <= 0) return; ctx.save(); ctx.globalAlpha = Math.min(1, k * 3); ctx.font = R.fb((size || 20) * R.k, 600); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 8 * R.dpr; ctx.fillStyle = '#f6eef0'; ctx.fillText(text, W() / 2, y); ctx.restore(); }
  function bars(ctx, a) { const h = H() * 0.09 * (a == null ? 1 : a); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W(), h); ctx.fillRect(0, H() - h, W(), h); }

  // ---- the shots ------------------------------------------------------------------------------------
  const S = {};
  // A flat red sky, the swordsman a black silhouette from below; slow push in; one glint; the cut.
  S.sky = function (ctx, k, t) {
    grade(ctx, '#ff2a1e', BLOOD); grade(ctx, 'rgba(0,0,0,0)', 'rgba(40,0,0,0.85)', 1);
    const push = 1 + 0.16 * ease(k), sc = H() / 52 * 0.95 * push, fx = W() * 0.52, fy = H() * 1.12;
    const fr = k < 0.75 ? Math.min(5, Math.floor(k * 8)) : Math.min(14, 6 + Math.floor((k - 0.75) / 0.25 * 9));
    ctx.save(); if (k > 0.95) ctx.translate((Math.random() - 0.5) * 30 * R.dpr, (Math.random() - 0.5) * 30 * R.dpr);
    // Ground and the risen dead in the foreground, all black.
    ctx.fillStyle = '#0a0000'; ctx.beginPath(); ctx.moveTo(0, H()); for (let i = 0; i <= 12; i++) ctx.lineTo(i * W() / 12, H() * (0.86 - hash(i, 2) * 0.06)); ctx.lineTo(W(), H()); ctx.fill();
    fig(ctx, 'master_knight', 'Special1', fr, Math.PI * 0.5, fx, fy, sc, { shade: '#000000' });
    // The glint: the only light on him.
    const e = onFig('master_knight', 'Special1', fr, Math.PI * 0.5, fx, fy, sc, 0.5, 0.2);
    const g = ease((k - 0.35) / 0.15) * (1 - ease((k - 0.6) / 0.1));
    if (g > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; A.tex(ctx, 'star_06', e.x, e.y, 140 * R.k * g, 140 * R.k * g, '#ffffff', g, t, true); ctx.restore(); }
    ctx.restore();
    line(ctx, 'SEVEN HUNDRED YEARS AGO, THE MOON BEGAN TO FALL.', H() * 0.16, (k - 0.15) * 2 * (1 - clamp01((k - 0.7) * 6)), 22);
    // The cut: a white line tears across the whole sky.
    if (k > 0.9) { const kk = ease((k - 0.9) / 0.08); ctx.save(); ctx.translate(W() / 2, H() * 0.42); ctx.rotate(-0.22); ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 30 * R.dpr; ctx.fillRect(-W() * kk, -3 * R.dpr, W() * 2 * kk, 6 * R.dpr); ctx.restore(); }
    if (k > 0.97) flash(ctx, '#ffffff', (k - 0.97) / 0.03);
    vignette(ctx, 0.5);
  };
  // The sky torn open: ribbons of the moon's light whip across the frame; the title slams in.
  S.ribbons = function (ctx, k, t) {
    grade(ctx, '#2a0610', '#7a1424'); A.tex(ctx, 'light_01', W() * 0.5, H() * 0.4, W() * 1.4, H() * 1.4, '#ff6a4a', 0.5 + 0.2 * Math.sin(t * 9), 0, true);
    storm(ctx, t, 26, 11, 0.9, false);
    // The moon behind it all, cut in two, the wound blazing.
    const mx = W() * 0.5, my = H() * 0.42, mr = H() * (0.24 + 0.04 * ease(k));
    ctx.save(); ctx.fillStyle = '#f2e6e0'; ctx.shadowColor = '#ffb0a0'; ctx.shadowBlur = 60 * R.dpr; ctx.beginPath(); ctx.arc(mx, my, mr, 0, 7); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(mx, my); ctx.rotate(-0.22); const gw = mr * 0.12 * ease(k * 2); ctx.fillStyle = RED; ctx.shadowColor = RED; ctx.shadowBlur = 40 * R.dpr; ctx.fillRect(-mr * 1.05, -gw, mr * 2.1, gw * 2); ctx.fillStyle = '#ffffff'; ctx.fillRect(-mr * 1.05, -gw * 0.2, mr * 2.1, gw * 0.4); ctx.restore();
    storm(ctx, t + 3, 14, 23, 0.85, true);
    flash(ctx, '#ffffff', 1 - k * 6);
    title(ctx, 'THE FIRST CUT', W() / 2, H() * 0.78, Math.min(74 * R.k, W() / 10), (k - 0.3) / 0.7, t);
    line(ctx, 'A swordsman cut the falling moon. It stopped. The wound never closed.', H() * 0.9, (k - 0.5) * 2, 18);
    vignette(ctx, 0.55);
  };
  // The ribbons rain down; the dead assemble out of flying shards under the bleeding moon.
  S.dead = function (ctx, k, t) {
    grade(ctx, '#3a0610', '#120206'); A.tex(ctx, 'light_01', W() * 0.5, H() * 0.15, W() * 1.2, H() * 0.9, RED, 0.55, 0, true);
    const mr = H() * 0.16; ctx.save(); ctx.fillStyle = '#ff3a48'; ctx.shadowColor = RED; ctx.shadowBlur = 50 * R.dpr; ctx.beginPath(); ctx.arc(W() * 0.5, H() * 0.18, mr, 0, 7); ctx.fill(); ctx.restore();
    // Red light pouring down in strands.
    for (let i = 0; i < 14; i++) { const x = W() * (0.1 + hash(i, 4) * 0.8), y0 = H() * 0.2, y1 = y0 + (H() * 0.7) * ease(k * 1.5 - hash(i, 5) * 0.3); const pts = []; for (let j = 0; j <= 10; j++) pts.push([x + Math.sin(j * 0.8 + t * 4 + i) * 12 * R.dpr, y0 + (y1 - y0) * j / 10]); ribbon(ctx, pts, 5 * R.dpr, i % 3 ? '#e2343c' : '#ffb08a', null, 0.7); }
    const gy = H() * 0.86; A.tex(ctx, 'light_01', W() * 0.5, gy, W() * 1.3, H() * 0.7, '#ff3a3a', 0.9, 0, true); ctx.fillStyle = '#080102'; ctx.fillRect(0, gy, W(), H() - gy);
    const keys = ['shield', 'raider', 'brute', 'ghoul', 'husk', 'archer', 'spearman'];
    keys.forEach((key, i) => { const f = D.FOES[key], x = W() * (0.09 + i * 0.137), sc = H() / 52 * 0.42 * Math.min(1.25, f.scale || 1); shards(ctx, f.set, 'Idle4', Math.floor(t * 7 + i) % 15, i % 2 ? Math.PI * 0.75 : Math.PI * 0.25, x, gy, sc, k * 1.4 - i * 0.07, 40 + i, { shade: '#050000' });
      const e = onFig(f.set, 'Idle4', 0, i % 2 ? Math.PI * 0.75 : Math.PI * 0.25, x, gy, sc, 0.5, 0.14); if (k * 1.4 - i * 0.07 > 0.9) { ctx.fillStyle = RED; ctx.shadowColor = RED; ctx.shadowBlur = 12 * R.dpr; ctx.fillRect(e.x - 6 * R.dpr, e.y, 12 * R.dpr, 3 * R.dpr); ctx.shadowBlur = 0; } });
    storm(ctx, t, 10, 31, 0.35, true);
    title(ctx, 'ITS LIGHT RAISES THE DEAD', W() / 2, H() * 0.3, Math.min(54 * R.k, W() / 15), (k - 0.35) / 0.65, t);
    line(ctx, 'Tonight the wound bleeds out. At dawn, the moon falls for good.', H() * 0.4, (k - 0.6) * 2.5, 18);
    vignette(ctx, 0.6);
  };
  // A dark smear across the frame, then a gold flash.
  S.wipe = function (ctx, k, t) {
    grade(ctx, '#5a0c14', '#1a0406'); storm(ctx, t, 12, 41, 0.6, false);
    const p = ease(k / 0.6), edge = -W() * 0.2 + p * W() * 1.5;
    ctx.save(); ctx.fillStyle = '#060001'; ctx.beginPath(); ctx.moveTo(-W(), 0); ctx.lineTo(edge, 0);
    for (let i = 0; i <= 12; i++) ctx.lineTo(edge - H() * 0.4 * i / 12 + (hash(i, 7) - 0.5) * 70 * R.dpr, H() * i / 12);
    ctx.lineTo(-W(), H()); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ff3a3a'; ctx.lineWidth = 4 * R.dpr; ctx.shadowColor = RED; ctx.shadowBlur = 20 * R.dpr; ctx.beginPath(); ctx.moveTo(edge, 0); for (let i = 0; i <= 12; i++) ctx.lineTo(edge - H() * 0.4 * i / 12 + (hash(i, 7) - 0.5) * 70 * R.dpr, H() * i / 12); ctx.stroke(); ctx.restore();
    if (k > 0.55) { const g = ease((k - 0.55) / 0.4), gr = ctx.createRadialGradient(W() * 0.5, H() * 0.5, 0, W() * 0.5, H() * 0.5, W() * 0.8); gr.addColorStop(0, '#fff6d8'); gr.addColorStop(0.4, '#ffc848'); gr.addColorStop(1, '#b85a08'); ctx.save(); ctx.globalAlpha = g; ctx.fillStyle = gr; ctx.fillRect(0, 0, W(), H()); ctx.restore(); }
  };
  // Your hero forms out of the ribbons, shard by shard; the camera climbs the figure, feet to face.
  S.hero = function (ctx, k, t, set) {
    grade(ctx, '#3a0c10', '#120408'); A.tex(ctx, 'light_01', W() * 0.5, H() * 0.5, W() * 1.3, H() * 1.3, '#ff5a3a', 0.55, 0, true);
    storm(ctx, t, 22, 51, 0.9, false);
    const sc = H() * 1.25 / 46, climb = ease(clamp01((k - 0.35) / 0.65)), x = W() * 0.5, y = H() * (1.55 - 0.42 * climb);
    flash(ctx, '#ffd070', 0.9 - k * 8);
    shards(ctx, set, 'Idle4', Math.floor(t * 6) % 15, Math.PI * 0.5, x, y, sc, k * 2.2, 77, {});
    // Red rim light down one side once formed.
    if (k > 0.45) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * ease((k - 0.45) * 3); fig(ctx, set, 'Idle4', Math.floor(t * 6) % 15, Math.PI * 0.5, x + 4 * R.dpr, y, sc, { shade: '#ff2a3a' }); ctx.restore(); fig(ctx, set, 'Idle4', Math.floor(t * 6) % 15, Math.PI * 0.5, x, y, sc, { alpha: ease((k - 0.45) * 3) }); }
    storm(ctx, t + 7, 12, 61, 0.45 - 0.35 * clamp01((k - 0.4) * 3), true);
    line(ctx, 'One blade can close the wound.', H() * 0.88, (k - 0.55) * 2.5, 22);
    vignette(ctx, 0.6);
  };
  // An extreme close-up: the eye opens red, light cracks out of it, the camera keeps pushing.
  S.eye = function (ctx, k, t, set) {
    grade(ctx, '#0a0204', '#000000');
    const sc = H() / 48 * (1.5 + 0.35 * ease(k)), fr = Math.floor(t * 5) % 15, x0 = W() * 0.5, y0 = H() * 0.42;
    const e = onFig(set, 'Idle4', fr, Math.PI * 0.5, 0, 0, sc, 0.5, 0.16), x = x0 - e.x, y = y0 - e.y;
    fig(ctx, set, 'Idle4', fr, Math.PI * 0.5, x + Math.sin(t * 2) * 3 * R.dpr, y, sc, {}); fig(ctx, set, 'Idle4', fr, Math.PI * 0.5, x + Math.sin(t * 2) * 3 * R.dpr, y, sc, { shade: '#1a0004', alpha: 0.55 });
    const open = ease((k - 0.2) / 0.3);
    if (open > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      A.tex(ctx, 'light_01', x0, y0, W() * 0.45 * open, W() * 0.45 * open, RED, 0.5, 0, true);
      A.tex(ctx, 'star_06', x0, y0, W() * 0.3 * open, W() * 0.3 * open, '#ffb0b0', 0.55, t * 0.5, true); ctx.restore();
      ctx.fillStyle = RED; ctx.shadowColor = RED; ctx.shadowBlur = 30 * R.dpr; ctx.fillRect(x0 - 26 * R.dpr * open, y0 - 4 * R.dpr, 52 * R.dpr * open, 8 * R.dpr); ctx.fillStyle = '#ffffff'; ctx.fillRect(x0 - 8 * R.dpr * open, y0 - 1.5 * R.dpr, 16 * R.dpr * open, 3 * R.dpr); ctx.shadowBlur = 0;
      ctx.strokeStyle = RED; ctx.lineWidth = 3 * R.dpr; ctx.shadowColor = RED; ctx.shadowBlur = 12 * R.dpr;
      for (let i = 0; i < 8; i++) { let px = x0 + (i % 2 ? 22 : -22) * R.dpr, py = y0 + 6 * R.dpr, a = Math.PI / 2 + (i - 3.5) * 0.3; const L = H() * 0.6 * ease((k - 0.35) / 0.5); ctx.beginPath(); ctx.moveTo(px, py); for (let j = 0; j < 8; j++) { a += (hash(i, j) - 0.5) * 1.0; px += Math.cos(a) * L / 8; py += Math.sin(a) * L / 8; ctx.lineTo(px, py); } ctx.stroke(); }
      ctx.shadowBlur = 0;
    }
    title(ctx, 'CLIMB THE SPIRE', W() / 2, H() * 0.82, 46 * R.k, (k - 0.55) / 0.45, t);
    line(ctx, 'Six guardians. One night. Close the wound before dawn.', H() * 0.9, (k - 0.7) * 3, 18);
    if (k > 0.92) flash(ctx, '#ffffff', (k - 0.92) / 0.08);
    vignette(ctx, 0.7);
  };
  // Back to the flat red sky: the Spire black against it, a guardian's eyes lit on every ledge.
  S.spire = function (ctx, k, t, set) {
    grade(ctx, '#ff2a1e', BLOOD); grade(ctx, 'rgba(0,0,0,0)', 'rgba(30,0,0,0.9)');
    const push = 1 + 0.1 * ease(k), cx = W() / 2, base = H() * 1.02, top = H() * (0.06 - 0.04 * ease(k)), wB = W() * 0.3 * push;
    ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.moveTo(cx - wB, base); ctx.lineTo(cx - wB * 0.12, top + 30 * R.dpr); ctx.lineTo(cx, top); ctx.lineTo(cx + wB * 0.12, top + 30 * R.dpr); ctx.lineTo(cx + wB, base); ctx.closePath(); ctx.fill();
    const G = ['warden', 'twinA', 'umbral', 'hunger', 'wing', 'firstCut'];
    G.forEach((key, i) => { const f = D.FOES[key], fy = base - (base - top) * (0.14 + i * 0.13), side = i % 2 ? 1 : -1, w = wB * (1 - (base - fy) / (base - top)), fx = cx + side * (w + 26 * R.dpr), sc = H() / 52 * 0.42 * Math.min(1.3, f.scale || 1);
      ctx.fillStyle = '#000'; ctx.fillRect(fx - 40 * R.dpr, fy, 80 * R.dpr, 6 * R.dpr);
      fig(ctx, f.set, 'Idle4', Math.floor(t * 7 + i) % 15, side > 0 ? Math.PI * 0.8 : Math.PI * 0.2, fx, fy, sc, { shade: '#000000' });
      const lit = clamp01((k - 0.08 - i * 0.07) * 5); if (lit > 0) { const e = onFig(f.set, 'Idle4', 0, side > 0 ? Math.PI * 0.8 : Math.PI * 0.2, fx, fy, sc, 0.5, 0.14); ctx.save(); ctx.globalAlpha = lit; ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 14 * R.dpr; ctx.fillRect(e.x - 8 * R.dpr, e.y, 16 * R.dpr, 3 * R.dpr); ctx.restore(); } });
    // The hero at the foot, small, looking up.
    fig(ctx, set, 'Idle4', Math.floor(t * 7) % 15, -Math.PI / 2, cx, H() * 0.97, H() / 52 * 0.6, { shade: '#000000' });
    if (k > 0.52) { const kk = (k - 0.52) / 0.48; flash(ctx, '#ffffff', 1 - kk * 8); flash(ctx, '#000000', Math.min(0.45, kk)); title(ctx, 'VESPER', W() / 2, H() * 0.44, 150 * R.k, kk, t); line(ctx, 'A LAST DITCH EFFORT', H() * 0.58, (kk - 0.25) * 3, 20); }
    vignette(ctx, 0.5);
  };

  // Draw the opening at time t, at full resolution.
  O.draw = function (ctx, t, heroSet) {
    const b = BEATS.find((x) => t < x[2]) || BEATS[BEATS.length - 1], k = clamp01((t - b[1]) / (b[2] - b[1]));
    ctx.save(); ctx.imageSmoothingEnabled = false; S[b[0]](ctx, k, t, heroSet); ctx.restore();
    grain(ctx, t); bars(ctx, 1);
  };
})();
