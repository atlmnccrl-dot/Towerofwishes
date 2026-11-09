// THE BLEEDING MOON — the edit: films built as fast cuts, the way the reference edits are cut.
// A film is a list of cuts, most of them under half a second. Each cut has a camera (push, tilt, drift),
// may be graded into one colour world (a gradient map over everything drawn), and draws from a few
// templates: a scene (a set, actors with motion, smears, arcs, trails, speed fields, rings, effects), an
// inverted silhouette (the impact frame), a ring (the fisheye hit), a face, full-frame manga eyes, a
// card, a flash, a blink. Dialogue lines ride on cuts and may run across several.
// E.film(cuts, opts) compiles to the film format js/intro.js plays.
(function () {
  const VS = window.VS, D = VS.DATA, A = VS.A, PX = VS.PX, I = VS.INTRO, K0 = I.kit;
  const { RED, W, H, K, hash, ease, clamp, fill, kick, say, poster } = K0;
  const E = VS.EDIT = {};
  const lerp = (a, b, t) => a + (b - a) * t;
  const EZ = { lin: (k) => k, out: (k) => 1 - Math.pow(1 - k, 3), in: (k) => k * k * k, io: ease, snap: (k) => 1 - Math.pow(1 - k, 7), hold: (k) => (k < 0.5 ? 0 : 1) };
  E.EZ = EZ;

  // ---- colour worlds: everything drawn is mapped through a palette by its brightness -------------------
  const PAL = E.PAL = {
    blood: ['#050002', '#3a040e', '#c8102e', '#ff6a7a', '#fff0f2'],
    violet: ['#04020a', '#24124a', '#6a4ad0', '#c8b8ff', '#ffffff'],
    ice: ['#01040a', '#0c2440', '#3a90c8', '#a8e8ff', '#ffffff'],
    ink: ['#000000', '#000000', '#0a0a0a', '#f4f0f0', '#ffffff'],
    ember: ['#040100', '#3a0a02', '#c83a08', '#ffa040', '#fff4d0'],
    storm: ['#03050a', '#1c2636', '#5a6e8a', '#c8d4e8', '#ffffff'],
    toxic: ['#010402', '#06301a', '#20a050', '#8affa8', '#f0fff2'],
    gold: ['#050200', '#3a1e02', '#c87a10', '#ffd060', '#fffae8'],
    grey: ['#0c0c0e', '#3a3a40', '#808088', '#c8c8cc', '#f8f8f8'],
    dusk: ['#04020a', '#2a0a30', '#a01848', '#ff8a6a', '#fff0e0'],
  };
  const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const luts = {};
  function lut(name) {
    if (luts[name]) return luts[name];
    const st = PAL[name].map(rgb), L = new Uint8Array(768), n = st.length - 1;
    for (let v = 0; v < 256; v++) { const t = v / 255 * n, i = Math.min(n - 1, Math.floor(t)), f = t - i; for (let c = 0; c < 3; c++) L[v * 3 + c] = Math.round(st[i][c] + (st[i + 1][c] - st[i][c]) * f); }
    return (luts[name] = L);
  }
  // keepRed: Vesper's red (and blood) stays red inside any world.
  function grade(ctx, name, keepRed, lift) {
    let im; try { im = ctx.getImageData(0, 0, W(), H()); } catch (e) { return; }
    const d = im.data, L = lut(name), up = lift || 1;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      if (keepRed && r > 110 && r > g * 1.8 && r > b * 1.5) continue;
      const v = Math.min(255, ((r * 0.3 + g * 0.55 + b * 0.15) * up) | 0), j = v * 3; d[i] = L[j]; d[i + 1] = L[j + 1]; d[i + 2] = L[j + 2]; d[i + 3] = 255;
    }
    ctx.putImageData(im, 0, 0);
  }
  E.grade = grade;

  // ---- who plays: 'vesper', 'dead:3' (the risen), a foe's key, or a set id -------------------------------
  function who(S, w) {
    if (!w || w === 'vesper') return S.cast.vesper;
    if (w.startsWith('dead:')) return K0.deadSet(S, +w.slice(5));
    if (D.FOES[w]) return D.FOES[w].set;
    return w;
  }
  E.who = who;

  // ---- drawing pieces ---------------------------------------------------------------------------------
  const BIG = () => [-W(), -H(), W() * 3, H() * 3];
  function bg(ctx, b, S, k, T) {
    if (!b) return;
    if (typeof b === 'function') return b(ctx, S, k, T);
    const [x, y, w, h] = BIG();
    if (b.kind === 'flat') { ctx.fillStyle = b.col; ctx.fillRect(x, y, w, h); return; }
    if (b.kind === 'grad') { const g = ctx.createLinearGradient(0, 0, 0, H()); b.cols.forEach((c, i) => g.addColorStop(i / (b.cols.length - 1), c)); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); return; }
    if (b.kind === 'glow') {
      ctx.fillStyle = b.base || '#000'; ctx.fillRect(x, y, w, h);
      const cx = (b.at ? b.at[0] : 0.5) * W(), cy = (b.at ? b.at[1] : 0.5) * H(), g = ctx.createRadialGradient(cx, cy, 2, cx, cy, (b.r || 0.7) * W());
      g.addColorStop(0, b.col); g.addColorStop(1, b.base || '#000'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); return;
    }
    if (b.kind === 'plane') {
      // A vast plane: sky above the horizon, floor below it fading toward the viewer.
      const hz = (b.hz == null ? 0.6 : b.hz) * H(), sky = b.sky || ['#0a0a0e', '#3a3a44'], fl = b.floor || ['#5a5a64', '#2a2a30'];
      let g = ctx.createLinearGradient(0, -H(), 0, hz); g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]); ctx.fillStyle = g; ctx.fillRect(x, y, w, hz - y);
      g = ctx.createLinearGradient(0, hz, 0, H() * 1.6); g.addColorStop(0, fl[0]); g.addColorStop(1, fl[1]); ctx.fillStyle = g; ctx.fillRect(x, hz, w, H() * 3);
      if (b.line) { ctx.fillStyle = b.line; ctx.fillRect(x, Math.round(hz), w, 1); }
      return;
    }
  }
  // Straight parallel streaks rushing across the frame at an angle (the camera moving with something fast).
  function speed(ctx, sp, T) {
    if (!sp) return;
    const n = sp.n || 40, a = sp.ang || 0, v = sp.v || 900;
    ctx.save(); ctx.translate(W() / 2, H() / 2); ctx.rotate(a); ctx.fillStyle = sp.col || 'rgba(255,255,255,0.5)';
    for (let i = 0; i < n; i++) { const L = 20 + hash(i, 1301) * 90, y = (hash(i, 1302) - 0.5) * H() * 2.2, x = ((hash(i, 1303) * W() * 3 - T * v * (0.6 + hash(i, 1304) * 0.8)) % (W() * 3) + W() * 3) % (W() * 3) - W() * 1.5; ctx.fillRect(Math.round(x), Math.round(y), Math.round(L), hash(i, 1305) < 0.2 ? 2 : 1); }
    ctx.restore();
  }
  // A long straight trail of light from one point to another, growing over t0..t1 of the cut.
  function trail(ctx, tr, k, glow) {
    const g = clamp((k - (tr.t0 || 0)) / ((tr.t1 || 1) - (tr.t0 || 0))), fade = tr.fade ? clamp(1 - (k - tr.fade) / (1 - tr.fade)) : 1; if (g <= 0 || fade <= 0) return;
    const x0 = tr.from[0] * W(), y0 = tr.from[1] * H(), x1 = lerp(x0, tr.to[0] * W(), EZ.out(g)), y1 = lerp(y0, tr.to[1] * H(), EZ.out(g)), a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0), w = tr.w || 4;
    ctx.save(); ctx.globalAlpha = fade; ctx.translate(x0, y0); ctx.rotate(a);
    if (glow) A.tex(ctx, 'light_01', L / 2, 0, L * 1.2, w * 6, tr.col || '#ffffff', 0.5, 0, true);
    else { ctx.fillStyle = tr.col || '#ffffff'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L * 0.15, -w / 2); ctx.lineTo(L, -w / 2); ctx.lineTo(L + w, 0); ctx.lineTo(L, w / 2); ctx.lineTo(L * 0.15, w / 2); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.fillRect(L * 0.2, -0.5, L * 0.8, 1); }
    ctx.restore();
  }
  // An actor: { who, clip, fr: n | [from, to] | null (plays at fps), ang, x, y, to: [x, y], arc, sc: n | [from, to],
  // ease, t0, t1 (the part of the cut it moves in), smear (afterimages), smearCol, rot (spins), shade, grey, alpha, eyes }.
  function actor(ctx, S, a, k, T) {
    const set = who(S, a.who), span = (a.t1 == null ? 1 : a.t1) - (a.t0 || 0), f = EZ[a.ease || 'out'];
    const kk = (q) => clamp((q - (a.t0 || 0)) / span), e = f(kk(k));
    const x0 = a.x * W(), y0 = a.y * H(), x1 = (a.to ? a.to[0] : a.x) * W(), y1 = (a.to ? a.to[1] : a.y) * H();
    const pos = (ee) => [lerp(x0, x1, ee), lerp(y0, y1, ee) - (a.arc ? Math.sin(Math.PI * ee) * a.arc * H() : 0)];
    const frAt = (q) => (a.fr == null ? Math.floor((T - (k - q) * 0) * (a.fps || 10) + (a.ph || 0)) % 15 : Array.isArray(a.fr) ? Math.round(lerp(a.fr[0], a.fr[1], clamp(kk(q) * (a.frRate || 1)))) : a.fr);
    const sc = Array.isArray(a.sc) ? lerp(a.sc[0], a.sc[1], e) : (a.sc || 1), ang = a.ang || 0, clip = a.clip || 'Idle4';
    const o = a.shade ? { shade: a.shade } : a.grey ? { grey: true } : {}; if (a.alpha != null) o.alpha = a.alpha;
    const draw = (x, y, oo, rot) => { if (rot) K0.spun(ctx, set, clip, frAt(k), ang, x, y, sc, oo, rot); else A.actor(ctx, set, clip, frAt(k), ang, Math.round(x), Math.round(y), sc, oo); };
    if (a.smear) for (let i = a.smear; i >= 1; i--) { const [sx, sy] = pos(f(kk(k - i * (a.smearGap || 0.045)))); draw(sx, sy, { shade: a.smearCol || '#ffffff', alpha: (a.smearA || 0.5) * (a.smear + 1 - i) / (a.smear + 1) }, a.rot ? a.rot * e : 0); }
    const [px, py] = pos(e);
    draw(px, py, o, a.rot ? a.rot * e : 0);
    return { set, clip, fr: frAt(k), ang, x: px, y: py, sc };
  }
  E.actor = actor;
  function rings(ctx, list, k) {
    for (const r of list || []) {
      const e = clamp((k - (r.t0 || 0)) / (r.dur || 0.6)); if (e <= 0 || e >= 1) continue;
      const rk = EZ.out(e); ctx.strokeStyle = r.col || '#ffffff'; ctx.globalAlpha = 1 - e; ctx.lineWidth = r.w || 2;
      ctx.beginPath(); ctx.ellipse(r.x * W(), r.y * H(), 4 + rk * (r.rx || 0.6) * W(), 1 + rk * (r.ry || 0.08) * H(), 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
    }
  }
  // Debris thrown out from a point (rubble, ice, blood): [x, y, t0, n, col, spread].
  function debris(ctx, list, k, d) {
    for (const b of list || []) {
      const t = (k - (b.t0 || 0)) * d; if (t <= 0 || t > 1.2) continue;
      for (let i = 0; i < (b.n || 24); i++) {
        const a = -Math.PI / 2 + (hash(i, 1311) - 0.5) * (b.spread || 2.6), v = (60 + hash(i, 1312) * 140) * (b.v || 1);
        ctx.fillStyle = Array.isArray(b.col) ? b.col[i % b.col.length] : (b.col || '#ffffff'); ctx.globalAlpha = clamp(1.2 - t);
        ctx.fillRect(Math.round(b.x * W() + Math.cos(a) * v * t), Math.round(b.y * H() + Math.sin(a) * v * t + 160 * t * t), b.s || 2, b.s || 2);
      }
      ctx.globalAlpha = 1;
    }
  }

  // ---- templates: each returns { draw, post } (post is drawn after the grade, so its colour survives) ----
  // A scene: { bg, moon: { x, y, r, col, wound }, under(ctx, S, k, T), speed, actors, rings, debris, trails,
  // fx: [{ key, x, y, sc, t0, ang, flip }], glows: [{ x, y, w, h, col, a }], over(ctx, S, k, T) }.
  E.scene = function (o) {
    let last = [];
    return {
      draw(ctx, S, k, T, c) {
        bg(ctx, o.bg, S, k, T);
        if (o.moon) K0.moon(ctx, o.moon.x * W(), o.moon.y * H(), o.moon.r * H(), o.moon.col || '#f4ece6', o.moon.glow || 'rgba(255,240,230,0.3)', o.moon.wound || 0, o.moon.wound ? T : null);
        if (o.under) o.under(ctx, S, k, T);
        speed(ctx, o.speed, T);
        last = (o.actors || []).map((a) => actor(ctx, S, o.sil && a.shade === undefined && !a.lit ? Object.assign({ shade: o.sil }, a) : a, k, T));
        rings(ctx, o.rings, k);
        debris(ctx, o.debris, k, c.d);
        for (const tr of o.trails || []) trail(ctx, tr, k, false);
        if (o.mid) o.mid(ctx, S, k, T, last);
      },
      post(ctx, S, k, T, c) {
        for (const tr of o.trails || []) if (tr.glow !== false) trail(ctx, tr, k, true);
        for (const g of o.glows || []) A.tex(ctx, 'light_01', g.x * W(), g.y * H(), g.w * W(), (g.h || g.w) * H(), g.col, g.a == null ? 0.5 : g.a, 0, true);
        (o.actors || []).forEach((a, i) => { const L = last[i]; if (a.eyes && L) K0.eyes(ctx, L.set, L.clip, L.fr, L.ang, L.x, L.y, L.sc, a.eyesA == null ? 1 : a.eyesA, a.eyes); });
        for (const f of o.fx || []) { const t = (k - (f.t0 || 0)) * c.d; if (t >= 0) A.fx(ctx, f.key, t, f.x * W(), f.y * H(), f.sc || 1, f.a == null ? 1 : f.a, f.ang || 0, f.flip); }
        if (o.sparks) for (const s of o.sparks) { const t = (k - (s.t0 || 0)) * c.d; if (t >= 0 && t < 0.6) K0.sparks(ctx, s.x * W(), s.y * H(), t, s.n || 50, s.seed || 7, s.spread || 6.2); }
        if (o.over) o.over(ctx, S, k, T, last);
      },
    };
  };
  // The impact frame: one figure as a flat silhouette (fg) on bg, with speed lines (radial or level).
  E.inv = function (o) {
    return {
      draw(ctx, S, k, T) {
        fill(ctx, o.bg || '#000');
        const cx = (o.x == null ? 0.5 : o.x) * W(), cy = (o.cy == null ? 0.5 : o.cy) * H();
        if (o.lines === 'level') { ctx.fillStyle = o.fg || '#fff'; for (let i = 0; i < 70; i++) { const y = cy + (hash(i, 1321) - 0.5) * H() * 0.9, L = 20 + hash(i, 1322) * W() * 0.5, x = hash(i, 1323) < 0.5 ? cx - 30 - L - hash(i, 1324) * 40 : cx + 30 + hash(i, 1324) * 40; ctx.fillRect(Math.round(x), Math.round(y), Math.round(L), 1 + (i % 4 === 0 ? 1 : 0)); } }
        else K0.burst(ctx, cx, cy, o.fg || '#fff', o.n || 110, 1325 + (o.seed || 0), o.r0 || 26);
        for (const a of o.actors || []) actor(ctx, S, Object.assign({ shade: o.fg || '#fff' }, a), k, T);
      },
    };
  };
  // The fisheye hit: a white ring bursting round the struck figure, the inside rushing outward.
  E.ring = function (o) {
    return {
      draw(ctx, S, k, T) {
        fill(ctx, o.bg || '#000');
        const cx = (o.x || 0.5) * W(), cy = (o.y || 0.5) * H(), r = H() * (o.r || 0.45) * (0.85 + 0.25 * EZ.out(k));
        ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.clip();
        fill(ctx, o.inside || '#2a2a30'); K0.burst(ctx, cx, cy, 'rgba(255,255,255,0.55)', 120, 1331, 6);
        for (const a of o.actors || []) actor(ctx, S, a, k, T);
        ctx.restore();
        ctx.strokeStyle = o.col || '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
        ctx.lineWidth = 1; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(cx, cy, r + 5 + k * 10, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
      },
    };
  };
  // A face, close: the figure scaled up so its head sits at (cx, cy); eyes lit after the grade.
  E.face = function (o) {
    let L = null;
    return {
      draw(ctx, S, k, T) {
        bg(ctx, o.bg || { kind: 'glow', col: '#3a3a44' }, S, k, T);
        const set = who(S, o.who), clip = o.clip || 'Idle4', fr = o.fr == null ? 0 : o.fr, ang = o.ang == null ? Math.PI / 2 : o.ang, sc = o.sc || 5;
        const b = A.box(set, clip, fr, ang, sc); if (!b) return;
        const hx = b.x + b.w * (o.head ? o.head[0] : 0.5), hy = b.y + b.h * (o.head ? o.head[1] : 0.16);
        const x = (o.cx || 0.5) * W() - hx, y = (o.cy || 0.42) * H() - hy;
        A.actor(ctx, set, clip, fr, ang, Math.round(x), Math.round(y), sc, o.shade ? { shade: o.shade } : {});
        L = { set, clip, fr, ang, x: Math.round(x), y: Math.round(y), sc };
        if (o.under) o.under(ctx, S, k, T);
      },
      post(ctx, S, k, T) {
        if (L && o.eyes) K0.eyes(ctx, L.set, L.clip, L.fr, L.ang, L.x, L.y, L.sc, o.eyesAt == null ? 1 : clamp((k - o.eyesAt) * 8), o.eyes);
        if (o.over) o.over(ctx, S, k, T);
      },
    };
  };
  // Focus lines: black wedges from the frame's edge toward a clear centre (the manga "look here").
  function focusLines(ctx, cx, cy, r0, n, col, seed, T) {
    ctx.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const a = hash(i, seed) * 6.283 + Math.floor(T * 24) * 0.0, w = 0.006 + hash(i, seed + 1) * 0.02, r1 = r0 + hash(i, seed + 2) * 30 * (0.5 + 0.5 * Math.sin(T * 40 + i)), R = W() * 1.2;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.lineTo(cx + Math.cos(a - w) * R, cy + Math.sin(a - w) * R); ctx.lineTo(cx + Math.cos(a + w) * R, cy + Math.sin(a + w) * R); ctx.closePath(); ctx.fill();
    }
  }
  E.focusLines = focusLines;
  // Her eyes filling the frame on paper, focus lines closing in; the irises turn (col) at `at`.
  E.eyes = function (o) {
    return {
      draw(ctx, S, k, T) {
        fill(ctx, o.paper || '#ece6e8');
        const open = o.at == null ? 1 : EZ.snap(clamp((k - o.at) / 0.12));
        K0.mangaEyesDraw(ctx, W() / 2, H() * 0.5, o.sc || 4, open, o.col || RED, T);
        focusLines(ctx, W() / 2, H() / 2, H() * (o.r0 || 0.36), o.n || 90, o.ink || '#0a0608', 1341, T);
      },
      post(ctx, S, k, T) { if (o.over) o.over(ctx, S, k, T); },
    };
  };
  E.flash = (col) => ({ draw: (ctx) => fill(ctx, col) });
  E.card = function (o) {
    return { draw(ctx, S, k, T) { fill(ctx, o.bg || '#000'); if (o.under) o.under(ctx, S, k, T); say(S, o.kind || 'serif', o.text, W() / 2, H() * (o.y || 0.5), Object.assign({ size: 13, col: o.col || '#f4eef0', k: T, a: clamp(T * (o.fadeIn || 9)) }, o.opts || {})); } };
  };
  // A colour-smear glitch: bands of colour torn sideways.
  E.glitch = function (o) {
    return { draw(ctx, S, k, T) {
      fill(ctx, '#000'); const cols = (o && o.cols) || ['#ff2a44', '#ffb030', '#30ff80', '#30a0ff', '#ffffff'];
      for (let i = 0; i < 26; i++) { const y = Math.floor(hash(i, 1351 + Math.floor(T * 30)) * H()), h = 2 + Math.floor(hash(i, 1352) * 14); ctx.fillStyle = cols[i % cols.length]; ctx.globalAlpha = 0.5 + 0.5 * hash(i, 1353); ctx.fillRect(Math.round(hash(i, 1354 + Math.floor(T * 30)) * W() * 0.6 - W() * 0.2), y, Math.round(W() * (0.4 + hash(i, 1355) * 0.8)), h); }
      ctx.globalAlpha = 1;
    } };
  };

  // ---- the cut list ---------------------------------------------------------------------------------
  // A cut: { d, ...template, cam: { z: [a, b], r: [a, b] (radians), x: [a, b], y: [a, b] (frame fractions), ease },
  // grade (palette name), keepRed, lift, poster: [dark, light, thr], shake, flashAt: [k...], whiteOut, blackIn,
  // sfx: [[at, name, vol]], line, lineDur, lineAt, lineCol, bars: false, name }.
  // E.blink(): a few frames of black. E.hold(cut, k, d): the same cut frozen at k (a stutter).
  E.blink = (d) => ({ d: d || 0.04, draw: (ctx) => fill(ctx, '#000'), bars: false, flat: true });
  E.hold = (c, k, d) => Object.assign({}, c, { d: d || 0.05, freeze: k, srcD: c.d, sfx: null, line: null });
  function run(c, ctx, S, k, T) {
    if (c.freeze != null) { k = c.freeze; T = c.freeze * c.srcD; }
    const cam = c.cam || {}, e = (EZ[cam.ease || 'io'])(k);
    const z = cam.z ? lerp(cam.z[0], cam.z[1], e) : 1, r = cam.r ? lerp(cam.r[0], cam.r[1], e) : 0;
    const px = cam.x ? lerp(cam.x[0], cam.x[1], e) * W() : 0, py = cam.y ? lerp(cam.y[0], cam.y[1], e) * H() : 0;
    const cover = 1 + Math.abs(r) * 0.95, fx = cam.at ? cam.at[0] * W() : W() / 2, fy = cam.at ? cam.at[1] * H() : H() / 2;
    const apply = () => { ctx.translate(fx, fy); ctx.rotate(r); ctx.scale(z * cover, z * cover); ctx.translate(-fx - px, -fy - py); };
    fill(ctx, '#000');
    ctx.save(); apply(); c.draw(ctx, S, k, T, c); ctx.restore();
    if (c.grade) grade(ctx, c.grade, c.keepRed, c.lift);
    if (c.poster) poster(ctx, c.poster[0], c.poster[1], c.poster[2]);
    if (c.post) { ctx.save(); apply(); c.post(ctx, S, k, T, c); ctx.restore(); }
    if (c.shake) kick(S, c.shake * (c.shakeOut ? 1 - k : 1));
    if (c.flashAt) for (const f of c.flashAt) if (k >= f && k < f + 0.06 / c.d) { fill(ctx, '#ffffff', 0.85); kick(S, 5); }
    if (c.blackIn && T < c.blackIn) fill(ctx, '#000', 1 - T / c.blackIn);
    if (c.whiteOut && k > 1 - c.whiteOut) fill(ctx, '#ffffff', (k - (1 - c.whiteOut)) / c.whiteOut);
    if (c.blackOut && k > 1 - c.blackOut) fill(ctx, '#000', (k - (1 - c.blackOut)) / c.blackOut);
    if (c.text) for (const w of [].concat(c.text)) if (T >= (w.at || 0)) say(S, w.kind || 'punch', w.text, W() * (w.x == null ? 0.5 : w.x), H() * (w.y == null ? 0.5 : w.y), Object.assign({ size: 30, k: T - (w.at || 0) }, w.o || {}));
  }
  E.run = run;
  E.film = function (cuts, opts) {
    const shots = [], draw = {}, sfx = [], lines = [], noBars = {}, flat = {};
    cuts.filter(Boolean).forEach((c, i) => {
      const name = c.name || 'c' + i; shots.push([name, c.d]);
      draw[name] = (ctx, S, k, T) => run(c, ctx, S, k, T);
      for (const s of c.sfx || []) sfx.push([name, s[0], s[1], s[2] == null ? 1 : s[2]]);
      if (c.line) { const a = c.lineAt || 0.02; lines.push([name, a, a + (c.lineDur || c.d), c.line, c.lineCol]); }
      for (const [a, dur, text, col] of c.lines || []) lines.push([name, a, a + dur, text, col]);
      if (c.bars === false) noBars[name] = 1;
      if (c.flat) flat[name] = 1;
    });
    return I.compile(Object.assign({ shots, draw, sfx, lines, noBars, flat, amb: 'wind', impact: () => false }, opts || {}));
  };
})();
