// Bannerborn — cutscenes. A cutscene is a list of shots on its own canvas:
//   scene   — a real map with scripted actors, the camera flying between keyframes, effects on cue
//   closeup — an extreme pixel close-up of one face in a slanted panel, speed lines, light streaks
//   split   — two faces in diagonal panels, facing off
//   impact  — anime impact frames: inverted silhouettes, radial lines, flashing black/white
//   title   — a word slammed onto the screen with sparks
// plus letterbox, shake, flashes, lightning and screen-space sparks over everything. Tap Skip to leave.
(function () {
  const BB = window.BB;
  const CV = () => document.getElementById('cineCv');
  const C = BB.Cinema = { on: false };
  const ease = (k) => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  const easeOut = (k) => 1 - Math.pow(1 - k, 3);
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp01 = (k) => Math.max(0, Math.min(1, k));

  // ---------------------------------------------------------------- actors: who appears, drawn how
  // an actor is { hero } (paper-doll or recruit) or { foe: kind } (fixed art, maybe tinted)
  function actorArt(a) {
    if (a.npcKey) return { key: a.npcKey, tint: '' };
    if (a.hero) return { layers: BB.heroLayers(a.hero) };
    const F = BB.FOES[a.foe]; const key = F.art || (F.poolPick ? 'h/' + F.poolPick : null);
    return { key, tint: F.tint || '' };
  }
  function drawActor(g, a, clip, dir, fr, x, y, sc, opts) {
    const art = a._art || (a._art = actorArt(a));
    if (art.layers) BB.drawLayers(g, art.layers, clip, dir, fr, x, y, sc, Object.assign({ noSlash: true }, opts || {}));
    else if (art.key) BB.drawChar(g, art.key, art.tint, clip, dir, fr, x, y, sc, opts && opts.flash);
  }
  // how far above the feet the face sits, read from the frame itself (frames are trimmed; FOOT_Y is 90)
  function headLift(a, clip, dir, fr) {
    const art = a._art || (a._art = actorArt(a)), keys = art.layers ? art.layers.map((L) => L.key) : [art.key];
    let top = 90;
    for (const k of keys) { const A = BB.A.chars[k]; if (!A) continue; const c = BB.resolveClip(k, clip), n = A.meta.clips[c]; if (!n) continue; const r = A.meta.f[c][dir * n + Math.min(n - 1, fr)]; if (r && r[2] > 1) top = Math.min(top, r[5]); }
    return Math.max(10, 90 - top - 7);
  }
  const clipLen = (a, clip) => { const art = a._art || (a._art = actorArt(a)); return BB.clipLen(art.layers ? art.layers[0].key : art.key, clip) || 15; };
  const silCache = {};
  function silhouette(a, clip, dir, fr, sc, col) { // the actor as a flat cut-out
    const S = Math.ceil(128 * sc), k = S + col; let c = silCache[k];
    if (!c) { c = silCache[k] = document.createElement('canvas'); c.width = S; c.height = S; }
    const x = c.getContext('2d'); x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, S, S); x.imageSmoothingEnabled = false;
    drawActor(x, a, clip, dir, fr, S / 2, 90 * sc, sc);
    x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, S, S);
    return c;
  }

  // ---------------------------------------------------------------- screen-space effects
  function speedLines(g, cx, cy, W, H, n, col, seed, inner) {
    g.save(); g.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const r = Math.sin((i + seed) * 91.7) * 0.5 + 0.5, a = (i / n) * Math.PI * 2 + r * 0.05, w = 0.004 + r * 0.012;
      const r0 = Math.max(W, H) * (inner + r * 0.18), r1 = Math.max(W, H) * 1.2;
      g.beginPath(); g.moveTo(cx + Math.cos(a - w) * r1, cy + Math.sin(a - w) * r1); g.lineTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a + w) * r1, cy + Math.sin(a + w) * r1); g.fill();
    }
    g.restore();
  }
  function lightning(g, x, y0, y1, w, col, seed) {
    let x0 = x; g.save(); g.strokeStyle = col; g.lineWidth = w; g.shadowColor = col; g.shadowBlur = w * 6; g.beginPath(); g.moveTo(x0, y0);
    const n = 12; for (let i = 1; i <= n; i++) { x0 += (Math.sin(seed * 13 + i * 7.1) * 0.5) * w * 14; g.lineTo(x0, y0 + (y1 - y0) * i / n); }
    g.stroke(); g.restore();
  }
  function sparks(n, x, y, col, spd, up) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = spd * (0.3 + Math.random()); C.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (up || 0), t: 0, life: 0.5 + Math.random() * 0.8, col, r: 1 + Math.random() * 2.5 }); }
  }
  function embers(W, H, col, n) { for (let i = 0; i < n; i++) C.parts.push({ x: Math.random() * W, y: H + 10, vx: (Math.random() - 0.5) * 30, vy: -60 - Math.random() * 120, t: 0, life: 2 + Math.random() * 2, col, r: 1 + Math.random() * 2, drift: true }); }

  // ---------------------------------------------------------------- shot renderers
  // a slanted panel; returns the panel polygon so callers can clip to it
  function panelPath(g, x0, y0, x1, y1, slant) { g.beginPath(); g.moveTo(x0 + slant, y0); g.lineTo(x1 + slant, y0); g.lineTo(x1 - slant, y1); g.lineTo(x0 - slant, y1); g.closePath(); }
  function closeupBody(g, a, k, t, cx, cy, ph, dir, flip, col1, col2, fromX) {
    // background: a colour wash, speed lines, a streak of light
    const W = g.canvas.width;
    const bg = g.createLinearGradient(0, cy - ph, 0, cy + ph); bg.addColorStop(0, col2); bg.addColorStop(0.5, col1); bg.addColorStop(1, col2);
    g.fillStyle = bg; g.fillRect(-W, cy - ph, W * 3, ph * 2);
    speedLines(g, cx, cy, W, ph * 2, 70, 'rgba(255,255,255,0.10)', Math.floor(t * 12), 0.15);
    const sx = lerp(-W * 0.2, W * 1.2, (t * 0.7) % 1);
    const st = g.createLinearGradient(sx - 200, 0, sx + 200, 0); st.addColorStop(0, 'rgba(255,255,255,0)'); st.addColorStop(0.5, 'rgba(255,255,255,0.18)'); st.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = st; g.fillRect(sx - 200, cy - ph, 400, ph * 2);
    // the face: a whole-number scale so the pixels stay square; the head sits on the focal point
    const S = Math.max(4, Math.round(ph * 1.15 / 14)), slide = (1 - easeOut(clamp01(k * 3))) * fromX;
    const clip = 'Idle', fr = Math.floor(t * 8) % clipLen(a, clip), lift = headLift(a, clip, dir, fr);
    g.save(); g.imageSmoothingEnabled = false;
    if (flip) { g.translate(cx * 2, 0); g.scale(-1, 1); }
    const push = 1 + k * 0.06;
    g.translate(cx + slide * (flip ? -1 : 1), cy); g.scale(push, push);
    drawActor(g, a, clip, dir, fr, 0, lift * S, S);
    g.restore();
  }
  function drawCloseup(g, W, H, sh, k, t) {
    const ph = H * 0.3, cy = H * 0.5;
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    g.save(); panelPath(g, -40, cy - ph, W + 40, cy + ph, W * 0.03); g.clip();
    closeupBody(g, sh.who, k, t, W * (sh.x || 0.5), cy, ph, sh.dir === undefined ? 2 : sh.dir, false, sh.col1, sh.col2, W * 0.3 * (sh.from || 1));
    g.restore();
    g.strokeStyle = sh.edge || 'rgba(255,255,255,0.85)'; g.lineWidth = 3; panelPath(g, -40, cy - ph, W + 40, cy + ph, W * 0.03); g.stroke();
    if (sh.label) titleText(g, sh.label, W * 0.07, cy + ph - 24, Math.round(H * 0.035), k, 'left', sh.edge || '#fff', true);
  }
  function drawSplit(g, W, H, sh, k, t) {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const sl = W * 0.08;
    // left: the hero; right: the foe
    g.save(); g.beginPath(); g.moveTo(0, 0); g.lineTo(W / 2 + sl, 0); g.lineTo(W / 2 - sl, H); g.lineTo(0, H); g.closePath(); g.clip();
    closeupBody(g, sh.a, k, t, W * 0.27, H * 0.5, H * 0.42, 1, false, sh.colA[0], sh.colA[1], -W * 0.25);
    g.restore();
    g.save(); g.beginPath(); g.moveTo(W / 2 + sl, 0); g.lineTo(W, 0); g.lineTo(W, H); g.lineTo(W / 2 - sl, H); g.closePath(); g.clip();
    closeupBody(g, sh.b, k, t, W * 0.73, H * 0.5, H * 0.42, 3, false, sh.colB[0], sh.colB[1], W * 0.25);
    g.restore();
    g.strokeStyle = '#fff'; g.lineWidth = 6; g.shadowColor = '#fff'; g.shadowBlur = 20; g.beginPath(); g.moveTo(W / 2 + sl, -10); g.lineTo(W / 2 - sl, H + 10); g.stroke(); g.shadowBlur = 0;
    if (k > 0.35) titleText(g, 'VS', W / 2, H * 0.56, Math.round(H * 0.16), clamp01((k - 0.35) * 4), 'center', '#fff');
  }
  function drawImpact(g, W, H, sh, k, t) {
    const inv = Math.floor(t / 0.06) % 2 === 1;
    g.fillStyle = inv ? '#f4f1ea' : '#050505'; g.fillRect(0, 0, W, H);
    speedLines(g, W / 2, H * 0.5, W, H, 90, inv ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.9)', Math.floor(t * 20), 0.05);
    const list = sh.who2 ? [[sh.who, W * 0.32, 1], [sh.who2, W * 0.68, 3]] : [[sh.who, W / 2, sh.dir === undefined ? 2 : sh.dir]];
    for (const [a, x, dir] of list) {
      const S = Math.max(3, Math.round(H * 0.85 / 60)), clip = sh.clip || 'Attack1';
      const fr = Math.min(clipLen(a, clip) - 1, Math.floor(clipLen(a, clip) * 0.6));
      const sv = silhouette(a, clip, dir, fr, S, inv ? '#050505' : '#ffffff');
      const z = 1 + (1 - k) * 0.15;
      g.save(); g.translate(x, H * 0.62); g.scale(z, z); g.drawImage(sv, -64 * S, -90 * S); g.restore();
    }
    if (sh.accent) { g.fillStyle = sh.accent; g.globalAlpha = 0.85; g.fillRect(0, H * 0.48, W, H * 0.02); g.globalAlpha = 1; }
  }
  function titleText(g, s, x, y, size, k, align, col, small) {
    g.save();
    const z = small ? 1 : lerp(2.4, 1, easeOut(clamp01(k * 5)));
    g.translate(x, y); g.scale(z, z);
    g.font = (small ? 700 : 900) + ' ' + size + 'px Outfit, sans-serif'; g.textAlign = align; g.textBaseline = 'middle';
    g.letterSpacing = (small ? size * 0.2 : size * 0.12) + 'px';
    g.globalAlpha = small ? clamp01(k * 4) : clamp01(k * 8);
    if (!small) for (let i = 3; i >= 1; i--) { g.globalAlpha = clamp01(k * 8) * 0.12; g.fillStyle = col; g.fillText(s, -i * 10 * (1 - clamp01(k * 4)), 0); }
    g.globalAlpha = small ? clamp01(k * 4) : clamp01(k * 8);
    g.shadowColor = col; g.shadowBlur = small ? 10 : 30; g.fillStyle = small ? col : '#fff'; g.fillText(s, 0, 0);
    if (!small) { g.shadowBlur = 0; g.strokeStyle = col; g.lineWidth = 2; g.strokeText(s, 0, 0); }
    g.restore();
  }
  function drawTitle(g, W, H, sh, k, t) {
    if (!sh.over) { const bg = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7); bg.addColorStop(0, sh.bg || '#1a1208'); bg.addColorStop(1, '#000'); g.fillStyle = bg; g.fillRect(0, 0, W, H); }
    else { g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, 0, W, H); }
    if (k < 0.35) speedLines(g, W / 2, H / 2, W, H, 60, 'rgba(255,255,255,' + (0.25 * (1 - k / 0.35)) + ')', 3, 0.2);
    const fl = g.createLinearGradient(0, 0, W, 0); fl.addColorStop(0, 'rgba(255,255,255,0)'); fl.addColorStop(0.5, sh.col || '#ffbe55'); fl.addColorStop(1, 'rgba(255,255,255,0)');
    const lw = W * 0.6 * easeOut(clamp01((k - 0.08) * 3));
    g.fillStyle = fl; g.fillRect(W / 2 - lw / 2, H * 0.5 + H * 0.085, lw, 3);
    if (sh.sup) titleText(g, sh.sup, W / 2, H * 0.37, Math.round(H * 0.03), clamp01((k - 0.05) * 2), 'center', sh.col || '#ffbe55', true);
    titleText(g, sh.text, W / 2, H * 0.5, Math.round(H * (sh.size || 0.12)), k, 'center', sh.col || '#ffbe55');
    if (sh.sub) titleText(g, sh.sub, W / 2, H * 0.64, Math.round(H * 0.032), clamp01((k - 0.25) * 2), 'center', '#c8d0dc', true);
  }
  // ---------------------------------------------------------------- the side-on stage: a painted world seen like a film, never the game camera
  const SKY = {
    dusk: { top: [42, 27, 61], bot: [214, 104, 58], sun: [255, 190, 110], far: [62, 34, 54], mid: [36, 21, 42], gnd: [26, 18, 16], fog: [214, 120, 80], stars: 0 },
    night: { top: [5, 7, 15], bot: [26, 35, 64], sun: [223, 232, 255], far: [14, 20, 36], mid: [10, 14, 26], gnd: [7, 9, 15], fog: [60, 80, 130], stars: 1, moon: 1 },
    dawn: { top: [52, 50, 60], bot: [150, 118, 104], sun: [255, 220, 190], far: [74, 64, 72], mid: [46, 40, 48], gnd: [28, 24, 24], fog: [170, 150, 140], stars: 0 },
    warm: { top: [70, 44, 40], bot: [235, 160, 90], sun: [255, 225, 160], far: [92, 56, 50], mid: [56, 34, 34], gnd: [32, 22, 18], fog: [240, 180, 120], stars: 0 },
    day: { top: [70, 120, 190], bot: [200, 225, 240], sun: [255, 250, 230], far: [110, 130, 150], mid: [60, 90, 60], gnd: [50, 64, 36], fog: [220, 235, 245], stars: 0 },
    desert: { top: [120, 70, 60], bot: [246, 200, 130], sun: [255, 235, 180], far: [170, 110, 74], mid: [140, 86, 56], gnd: [120, 80, 50], fog: [250, 210, 150], stars: 0 },
    crimson: { top: [16, 4, 6], bot: [110, 22, 18], sun: [255, 120, 90], far: [40, 10, 12], mid: [24, 6, 8], gnd: [12, 4, 5], fog: [160, 40, 30], stars: 0 },
    toxic: { top: [4, 12, 10], bot: [24, 80, 56], sun: [160, 255, 200], far: [10, 30, 24], mid: [6, 18, 14], gnd: [4, 10, 8], fog: [60, 160, 110], stars: 1, moon: 1 },
    violet: { top: [10, 6, 22], bot: [70, 44, 120], sun: [210, 180, 255], far: [24, 16, 44], mid: [14, 10, 28], gnd: [8, 6, 16], fog: [120, 90, 190], stars: 1, moon: 1 },
  };
  const rgb = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a === undefined ? 1 : a) + ')';
  const mixC = (a, b, k) => [0, 1, 2].map((i) => Math.round(lerp(a[i], b[i], k)));
  function mixPal(A, B, k) { const o = {}; for (const q in A) o[q] = Array.isArray(A[q]) ? mixC(A[q], B[q], k) : lerp(A[q], B[q] || 0, k); return o; }
  const fr = (x) => x - Math.floor(x);
  const noise = (x, s) => Math.sin(x * 0.9 + s) * 0.5 + Math.sin(x * 2.3 + s * 1.7) * 0.3 + Math.sin(x * 5.1 + s * 3.1) * 0.2;
  // the landscape behind, in parallax layers
  function backdrop(g, W, H, P, camX, unit, gy, land, t) {
    const sk = g.createLinearGradient(0, 0, 0, gy); sk.addColorStop(0, rgb(P.top)); sk.addColorStop(1, rgb(P.bot)); g.fillStyle = sk; g.fillRect(0, 0, W, gy + 2);
    if (P.stars > 0.05) { g.fillStyle = 'rgba(255,255,255,' + 0.7 * P.stars + ')'; for (let i = 0; i < 90; i++) { const x = ((i * 137.5) % 1000) / 1000 * W, y = ((i * 71.3) % 1000) / 1000 * gy * 0.7; g.fillRect(x, y, 1.5, 1.5); } }
    // sun or moon
    const sx = W * 0.72 - camX * unit * 0.03, sy = gy * (P.moon ? 0.28 : 0.62), sr = H * (P.moon ? 0.06 : 0.09);
    const gl = g.createRadialGradient(sx, sy, 0, sx, sy, sr * 5); gl.addColorStop(0, rgb(P.sun, 0.55)); gl.addColorStop(1, rgb(P.sun, 0)); g.fillStyle = gl; g.fillRect(sx - sr * 5, sy - sr * 5, sr * 10, sr * 10);
    g.fillStyle = rgb(P.sun, 0.95); g.beginPath(); g.arc(sx, sy, sr, 0, 7); g.fill();
    // far ridge
    const layer = (par, base, amp, col, seed, deco) => {
      const off = camX * unit * par;
      g.fillStyle = col; g.beginPath(); g.moveTo(0, gy + 2);
      for (let x = 0; x <= W + 8; x += 8) { const wx = (x + off) / (unit * 3); g.lineTo(x, base - (noise(wx, seed) * 0.5 + 0.5) * amp); }
      g.lineTo(W, gy + 2); g.closePath(); g.fill();
      if (deco) deco(off, base, amp, col);
    };
    layer(0.15, gy - H * 0.12, H * 0.16, rgb(P.far), 3);
    // the middle distance: what this land looks like
    layer(0.4, gy - H * 0.04, H * 0.07, rgb(P.mid), 9, (off, base, amp, col) => {
      g.fillStyle = col;
      for (let i = -2; i < 40; i++) {
        const wx = i * unit * 1.6 - (off % (unit * 1.6 * 40)), seedv = Math.sin(i * 12.9898) * 0.5 + 0.5;
        if (wx < -unit * 2 || wx > W + unit * 2) continue;
        const by = base - (noise((wx + off) / (unit * 3), 9) * 0.5 + 0.5) * amp + 2;
        if (land === 'village' && seedv > 0.35) { const w = unit * (0.7 + seedv * 0.5), h = unit * (0.5 + seedv * 0.4); g.fillRect(wx, by - h, w, h + 4); g.beginPath(); g.moveTo(wx - w * 0.12, by - h); g.lineTo(wx + w / 2, by - h - w * 0.55); g.lineTo(wx + w * 1.12, by - h); g.fill(); if (seedv > 0.8) g.fillRect(wx + w * 0.7, by - h - w * 0.75, w * 0.15, w * 0.4); }
        else if (land === 'desert') { g.beginPath(); g.ellipse(wx, by + 4, unit * (1.4 + seedv), unit * 0.35, 0, Math.PI, 0); g.fill(); if (seedv > 0.75) { g.fillRect(wx, by - unit * 1.3, unit * 0.07, unit * 1.3); for (let f = 0; f < 5; f++) { g.beginPath(); g.ellipse(wx + Math.cos(f * 1.25 - 2.2) * unit * 0.3, by - unit * 1.3 + Math.sin(f * 1.25 - 2.2) * unit * 0.12, unit * 0.32, unit * 0.06, f * 1.25 - 2.2, 0, 7); g.fill(); } } }
        else if (land === 'ruins' || land === 'gate') { if (seedv > 0.3) { const w = unit * (0.4 + seedv * 0.5), h = unit * (0.8 + seedv * 1.6); g.beginPath(); g.moveTo(wx, by + 4); g.lineTo(wx, by - h); g.lineTo(wx + w * 0.3, by - h + unit * 0.2); g.lineTo(wx + w * 0.6, by - h - unit * 0.1); g.lineTo(wx + w, by - h + unit * 0.3); g.lineTo(wx + w, by + 4); g.fill(); } if (land === 'gate' && i % 9 === 4) { g.fillRect(wx, by - unit * 3, unit * 0.5, unit * 3); g.fillRect(wx + unit * 2, by - unit * 3, unit * 0.5, unit * 3); g.beginPath(); g.arc(wx + unit * 1.25, by - unit * 3, unit * 1.25, Math.PI, 0); g.lineTo(wx + unit * 2, by - unit * 3); g.arc(wx + unit * 1.25, by - unit * 3, unit * 0.75, 0, Math.PI, true); g.fill(); } }
        else { if (seedv > 0.25) { const h = unit * (0.9 + seedv * 1.1); g.beginPath(); g.moveTo(wx - unit * 0.32, by + 2); g.lineTo(wx, by - h); g.lineTo(wx + unit * 0.32, by + 2); g.fill(); } }
      }
    });
    // fog where the land meets the sky
    const fg = g.createLinearGradient(0, gy - H * 0.16, 0, gy); fg.addColorStop(0, rgb(P.fog, 0)); fg.addColorStop(1, rgb(P.fog, 0.28)); g.fillStyle = fg; g.fillRect(0, gy - H * 0.16, W, H * 0.16);
    // the ground
    const gg = g.createLinearGradient(0, gy, 0, H); gg.addColorStop(0, rgb(mixC(P.gnd, P.fog, 0.25))); gg.addColorStop(1, rgb(P.gnd)); g.fillStyle = gg; g.fillRect(0, gy, W, H - gy);
    g.fillStyle = rgb(mixC(P.gnd, P.fog, 0.4), 0.5); g.fillRect(0, gy, W, 2);
  }
  function foreground(g, W, H, P, camX, unit, gy, land) { // dark grass and stones close to the lens
    const off = camX * unit * 1.35;
    g.fillStyle = rgb(mixC(P.gnd, [0, 0, 0], 0.5));
    for (let i = -2; i < 60; i++) {
      const x = i * unit * 0.9 - (off % (unit * 0.9 * 60)); if (x < -unit || x > W + unit) continue;
      const s = Math.sin(i * 7.77) * 0.5 + 0.5, y = H - H * 0.02;
      if (land === 'desert' || land === 'ruins') { g.beginPath(); g.ellipse(x, y, unit * (0.3 + s * 0.4), unit * (0.15 + s * 0.15), 0, Math.PI, 0); g.fill(); }
      else for (let b = 0; b < 4; b++) { g.beginPath(); g.moveTo(x + b * 6, y); g.quadraticCurveTo(x + b * 6 + 4, y - unit * (0.3 + s * 0.5), x + b * 6 + 9, y - unit * (0.4 + s * 0.6)); g.lineTo(x + b * 6 + 5, y); g.fill(); }
    }
  }
  // cast on the side-on stage: x in metres along the ground, d = depth (0 near, 1 far)
  const A2 = (who, x, o) => Object.assign({ who, x, d: 0, dir: 0, clip: 'Idle', ct: Math.random(), rise: 1, riseSpd: 1.2, alpha: 1, dead: false, deadT: 0, vx: 0, scale: 1, fade: false }, o || {});
  const act = (a, clip) => { if (!a) return; a.clip = clip; a.ct = 0; };
  function drawStage2d(g, W, H, sh, k, t, dt) {
    const camX = lerp(sh.pan[0], sh.pan[1], ease(k)), zoom = lerp((sh.zoom || [1, 1])[0], (sh.zoom || [1, 1])[1], ease(k));
    const unit = H / 9 * zoom, gy = H * (sh.ground || 0.76);
    const P = mixPal(SKY[sh.sky], SKY[sh.skyTo || sh.sky], clamp01(t / (sh.skyIn || sh.dur)));
    C.pal = P;
    g.save(); g.imageSmoothingEnabled = true;
    backdrop(g, W, H, P, camX, unit, gy, sh.land || 'forest', t);
    const toX = (x, d) => W / 2 + (x - camX) * unit * (1 - (d || 0) * 0.35);
    // the gate, if one is open
    if (C.gate) {
      C.gate.open = Math.min(1, C.gate.open + dt * 0.8);
      const gx = toX(C.gate.x, 0.15), gs = unit / 70 * 2.6 * (0.3 + C.gate.open * 0.7), gyy = gy - unit * 1.4;
      g.save(); g.globalCompositeOperation = 'lighter';
      const gl = g.createRadialGradient(gx, gy, 0, gx, gy, unit * 3); gl.addColorStop(0, 'rgba(160,90,255,0.45)'); gl.addColorStop(1, 'rgba(160,90,255,0)'); g.fillStyle = gl; g.beginPath(); g.ellipse(gx, gy, unit * 3, unit * 0.8, 0, 0, 7); g.fill();
      BB.drawFx(g, C.gate.open < 1 ? 'portalopen' : 'portal', Math.floor(t * 14) % (BB.fxLen(C.gate.open < 1 ? 'portalopen' : 'portal') || 1), gx, gyy, gs, { add: true, hue: C.gate.hue || 0 });
      g.restore();
    }
    // banners on the ridge
    for (const b of C.banners) {
      if (b.fallT !== undefined) b.fallT += dt;
      const ang = b.fallT !== undefined ? Math.min(1, b.fallT / 0.9) ** 2 * 1.45 * (b.side || 1) : 0;
      if (!b.cv) { b.cv = document.createElement('canvas'); b.cv.width = 100; b.cv.height = 140; }
      BB.UI.drawBanner(b.cv.getContext('2d'), b, 100, 140, C.t * 1.4 + b.x);
      const bx = toX(b.x, b.d || 0.1), bh = unit * 2.3 * (1 - (b.d || 0.1) * 0.35), byy = gy - (b.d || 0.1) * unit * 0.9;
      g.save(); g.translate(bx, byy); g.rotate(ang); g.globalAlpha = b.fallT !== undefined ? Math.max(0.4, 1 - b.fallT * 0.2) : 1;
      g.drawImage(b.cv, -bh * 0.16, -bh, bh * 0.72, bh); g.restore();
    }
    // the cast, far to near
    const list = C.cast.slice().sort((p, q) => q.d - p.d);
    g.imageSmoothingEnabled = false;
    for (const a of list) {
      a.ct += dt; if (a.rise < 1) a.rise = Math.min(1, a.rise + dt * a.riseSpd);
      if (a.goTo && !a.dead) { const dx = a.goTo.x - a.x, step = (a.goTo.spd || 2) * dt; if (Math.abs(dx) <= step) { a.x = a.goTo.x; const th = a.goTo.then; a.goTo = null; act(a, th || 'Idle'); if (th && th.startsWith('Attack')) a.loop = th; } else { a.x += Math.sign(dx) * step; a.dir = dx > 0 ? 0 : 4; if (a.clip !== 'Run') act(a, 'Run'); } }
      if (a.vx) { a.x += a.vx * dt; a.vx *= Math.pow(0.08, dt); if (Math.abs(a.vx) < 0.1) a.vx = 0; }
      if (a.loop && !a.dead && a.ct > 0.8) a.ct = 0;
      if (a.dead) { a.deadT += dt; if (a.fade) a.alpha = Math.max(0, 1 - (a.deadT - 0.6) / 0.8); }
      if (a.alpha <= 0) continue;
      const sf = 1 - a.d * 0.35, sc = Math.max(1, Math.round(unit * sf / 17 * a.scale));
      const x = toX(a.x, a.d), y = gy - a.d * unit * 0.9;
      const n = clipLen(a.who, a.clip), loop = a.clip === 'Idle' || a.clip === 'Run' || a.clip === 'Walk';
      const fr = a.dead ? Math.min(n - 1, Math.floor(a.deadT * 14)) : loop ? Math.floor(a.ct * (a.clip === 'Run' ? 18 : 9)) % n : Math.min(n - 1, Math.floor(a.ct * 16));
      const lift = (1 - a.rise) * 60 * sc;
      g.save(); g.globalAlpha = a.alpha;
      if (a.rise < 1) { g.beginPath(); g.rect(x - 80 * sc, y - 140 * sc, 160 * sc, 140 * sc + 2); g.clip(); }
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(x, y, 14 * sc, 3.5 * sc, 0, 0, 7); g.fill();
      drawActor(g, a.who, a.clip, a.dir, fr, x, y + lift, sc, { flash: a.flash || 0 });
      if (a.d > 0.05 || a.shadowed) { // distance haze: the far ones melt into the dusk
        const sv = silhouette(a.who, a.clip, a.dir, fr, sc, rgb(P.mid)); g.globalAlpha = a.alpha * Math.min(0.85, a.d * 0.75 + (a.shadowed || 0)); g.drawImage(sv, x - 64 * sc, y + lift - 90 * sc);
      }
      g.restore();
      if (a.flash) a.flash = Math.max(0, a.flash - dt * 2);
    }
    // shockwaves along the ground
    g.imageSmoothingEnabled = true;
    for (const r of C.rings) { r.t += dt; const q = r.t / 0.9; if (q >= 1) continue; g.strokeStyle = r.col; g.globalAlpha = 1 - q; g.lineWidth = unit * 0.12 * (1 - q); g.beginPath(); g.ellipse(toX(r.x, 0), gy, q * unit * 7, q * unit * 1.4, 0, 0, 7); g.stroke(); g.globalAlpha = 1; }
    C.rings = C.rings.filter((r) => r.t < 0.9);
    foreground(g, W, H, P, camX, unit, gy, sh.land || 'forest');
    // weather
    if (C.weather === 'rain') { // streaks at scattered places and speeds
      g.strokeStyle = 'rgba(180,200,255,0.3)'; g.lineWidth = 1.1; g.beginPath();
      for (let i = 0; i < 150; i++) { const h1 = fr(Math.sin(i * 12.9898) * 43758.5), h2 = fr(Math.sin(i * 78.233) * 12345.6), sp = 0.7 + h2 * 0.6; const y = ((h2 * (H + 60) + C.t * 1500 * sp) % (H + 60)) - 30, x = ((h1 * (W + 100) - C.t * 300 * sp) % (W + 100) + W + 100) % (W + 100) - 50; g.moveTo(x, y); g.lineTo(x - 7, y + 18 * sp); }
      g.stroke(); }
    if (C.weather === 'ash') { g.fillStyle = 'rgba(220,210,200,0.6)'; for (let i = 0; i < 90; i++) { const x = ((i * 131.1 + C.t * 30 + Math.sin(C.t + i) * 20) % W), y = ((i * 77.7 + C.t * 40) % H); g.fillRect(x, y, 2, 2); } }
    if (C.weather === 'embers') { g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,150,60,0.8)'; for (let i = 0; i < 70; i++) { const x = ((i * 113.3 + Math.sin(C.t * 0.7 + i) * 40) % W), y = H - ((i * 61.1 + C.t * 70) % H); g.fillRect(x, y, 2, 2); } g.globalCompositeOperation = 'source-over'; }
    g.restore();
  }

  // ---------------------------------------------------------------- the player
  C.play = async function (name, opts, done) {
    const build = SCENES[name]; if (!build) { done && done(); return; }
    const el = document.getElementById('cine'); el.classList.add('on');
    Object.assign(C, { on: true, loading: true, t: 0, done, parts: [], shake: 0, flash: 0, flashCol: '#fff', bolts: [], cued: {}, shots: [], banners: [], cast: [], rings: [], gate: null, weather: null, vesh: null });
    try { const def = await build(opts || {}); C.shots = def.shots; C.total = C.shots.reduce((a, s) => a + s.dur, 0); }
    catch (e) { console.warn('cutscene skipped', e); C.end(); return; }
    C.loading = false;
    BB.music(opts.music || 'boss');
  };
  C.end = function () {
    if (!C.on) return;
    C.on = false; document.getElementById('cine').classList.remove('on');
    const d = C.done; C.done = null; C.cast = []; d && d();
  };
  C.render = function (dt) {
    const cv = CV(); if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr); if (!W || !H) return;
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0);
    if (C.loading) { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); return; }
    C.t += dt;
    if (C.t >= C.total) { C.end(); return; }
    // the current shot, and its cues (sounds, shakes, flashes, sparks) fired once
    let acc = 0, sh = C.shots[0], si = 0;
    for (let i = 0; i < C.shots.length; i++) { if (C.t < acc + C.shots[i].dur) { sh = C.shots[i]; si = i; break; } acc += C.shots[i].dur; }
    const lt = C.t - acc, k = clamp01(lt / sh.dur);
    for (const cue of sh.cues || []) { const id = si + ':' + cue[0]; if (!C.cued[id] && lt >= cue[0]) { C.cued[id] = 1; cue[1]({ W, H, dpr }); } }
    g.save();
    if (C.shake > 0) { C.shake = Math.max(0, C.shake - dt * 1.6); g.translate((Math.random() - 0.5) * C.shake * 40 * dpr, (Math.random() - 0.5) * C.shake * 30 * dpr); }
    g.imageSmoothingEnabled = false;
    if (sh.kind === 'stage2d') drawStage2d(g, W, H, sh, k, lt, dt);
    else if (sh.kind === 'closeup') drawCloseup(g, W, H, sh, k, lt);
    else if (sh.kind === 'split') drawSplit(g, W, H, sh, k, lt);
    else if (sh.kind === 'impact') drawImpact(g, W, H, sh, k, lt);
    else if (sh.kind === 'title') { if (sh.bg2d) { drawStage2d(g, W, H, Object.assign({ dur: sh.dur }, sh.bg2d), k, lt, dt); sh.over = true; } drawTitle(g, W, H, sh, k, lt); }
    g.restore();
    g.setTransform(1, 0, 0, 1, 0, 0);
    // lightning
    for (const b of C.bolts) { b.t += dt; if (b.t < 0.18) lightning(g, b.x * W, 0, b.y * H, 3 * dpr, '#e8f4ff', b.seed); }
    C.bolts = C.bolts.filter((b) => b.t < 0.2);
    // sparks and embers, screen space
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const p of C.parts) { p.t += dt; p.x += p.vx * dt * dpr; p.y += p.vy * dt * dpr; if (!p.drift) p.vy += 220 * dt; else p.vx += Math.sin(p.t * 3 + p.y) * 10 * dt; const a = Math.max(0, 1 - p.t / p.life); g.globalAlpha = a; g.fillStyle = p.col; g.beginPath(); g.arc(p.x, p.y, p.r * dpr, 0, 7); g.fill(); }
    g.restore(); C.parts = C.parts.filter((p) => p.t < p.life);
    // fades from and to black
    if (sh.fadeIn && lt < sh.fadeIn) { g.fillStyle = 'rgba(0,0,0,' + (1 - lt / sh.fadeIn) + ')'; g.fillRect(0, 0, W, H); }
    if (sh.fadeOut && lt > sh.dur - sh.fadeOut) { g.fillStyle = 'rgba(0,0,0,' + clamp01((lt - (sh.dur - sh.fadeOut)) / sh.fadeOut) + ')'; g.fillRect(0, 0, W, H); }
    // vignette, letterbox, flash
    const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.6)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
    const lb = H * 0.11; g.fillStyle = '#000'; g.fillRect(0, 0, W, lb); g.fillRect(0, H - lb, W, lb);
    if (C.flash > 0) { g.globalAlpha = Math.min(1, C.flash); g.fillStyle = C.flashCol; g.fillRect(0, 0, W, H); g.globalAlpha = 1; C.flash = Math.max(0, C.flash - dt * 3); }
    // the subtitle: one line in the lower bar, in and out with its shot
    if (sh.caption) {
      const c0 = sh.capAt || 0.3, c1 = sh.capEnd || sh.dur - 0.25;
      const a = clamp01(Math.min((lt - c0) / 0.45, (c1 - lt) / 0.4));
      if (a > 0) {
        g.globalAlpha = a; g.font = 'italic 500 ' + Math.round(Math.max(14, H * 0.034)) + 'px Inter, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = '#eef1f6'; g.shadowColor = 'rgba(0,0,0,0.9)'; g.shadowBlur = 8; g.fillText(sh.caption, W / 2, H - lb / 2 + (1 - a) * 6); g.shadowBlur = 0; g.globalAlpha = 1;
      }
    }
  };
  // cue helpers
  const SFX = (n) => () => BB.sfx(n);
  const SHAKE = (v) => () => { C.shake = Math.max(C.shake, v); };
  const FLASH = (v, col) => () => { C.flash = v; C.flashCol = col || '#fff'; };
  const BOLT = () => () => { C.bolts.push({ x: 0.2 + Math.random() * 0.6, y: 0.5 + Math.random() * 0.3, t: 0, seed: Math.random() * 99 }); C.flash = 0.35; C.flashCol = '#cfe6ff'; BB.sfx('slam'); };
  const SPARKS = (n, col, fx, fy, spd) => (o) => sparks(n, o.W * (fx || 0.5), o.H * (fy || 0.5), col, (spd || 500) * o.dpr, 0);
  const EMBERS = (n, col) => (o) => embers(o.W, o.H, col, n);
  const MUSIC = (m) => () => BB.music(m);

  // load the art a cutscene needs
  async function cast(list, npcs) {
    const keys = new Set();
    for (const w of list) { const art = actorArt(w); if (art.key) keys.add(art.key); else if (art.layers) art.layers.forEach((L) => keys.add(L.key)); }
    for (const k of (npcs || [])) keys.add(k);
    await Promise.all([BB.loadOther()].concat([...keys].map((k) => BB.loadChar(k).catch(() => null))));
  }
  const leader = () => (BB.UI && BB.UI.leader ? BB.UI.leader() : BB.save.heroes[0]);
  const RING = (x, col) => () => C.rings.push({ x, t: 0, col: col || '#ffcf7a' });
  const WEATHER = (w) => () => { C.weather = w; };

  // ---------------------------------------------------------------- the cutscenes
  const SCENES = {
    // a new game: what the nine banners were, how they fell, and why one is left
    async intro() {
      const capW = { hero: leader() }, vesh = { foe: 'vesh' }, ghoul = { foe: 'ghoul' }, warden = { foe: 'warden' };
      const knights = BB.ROSTER.filter((c) => c.role === 'hero' && (c.arch === 'knight' || c.arch === 'spearman')).slice(0, 4).map((c) => ({ hero: BB.newHero({ calling: c.calling, recruit: c.key, name: c.name }) }));
      const npcs = BB.npcKeys().slice(0, 4);
      await cast([capW, vesh, ghoul, warden].concat(knights), npcs);
      // nine banners on the ridge, two metres apart; the ninth is yours
      const cols = BB.BANNER_COLORS.concat(['#3a6a8a']);
      for (let i = 0; i < 9; i++) C.banners.push(Object.assign({ x: -8 + i * 2, d: 0.12, side: i % 2 ? 1 : -1 }, i === 8 ? BB.save.banner : { color: cols[i], sigil: BB.SIGILS[i % BB.SIGILS.length], trim: '#e8c66a' }));
      const folk = npcs.filter((k) => BB.A.chars[k]).map((k, i) => { const a = A2({ foe: null, npc: k }, -16 + i * 3.2, { d: 0.25 + (i % 2) * 0.2, dir: i % 2 ? 0 : 4 }); a.who = { npcKey: k }; return a; });
      folk.forEach((a, i) => { a.goTo = { x: a.x + (i % 2 ? 4 : -4), spd: 0.7, then: 'Idle' }; });
      const kn = knights.map((w, i) => A2(w, -6 + i * 4 + 0.6, { d: 0, dir: 0 }));
      const cap = A2(capW, 8.8, { d: 0, dir: 4, clip: 'Idle', shadowed: 0 });
      C.cast.push(...folk, ...kn);
      const dead = [];
      const raise = (n, x0, x1) => { for (let i = 0; i < n; i++) { const a = A2(Math.random() < 0.25 ? warden : ghoul, x0 + Math.random() * (x1 - x0), { d: Math.random() * 0.8, dir: 4, rise: 0, riseSpd: 0.8 + Math.random() * 0.6 }); dead.push(a); C.cast.push(a); } };
      const march = (spd, near) => dead.forEach((a, i) => { if (a.dead) return; const tx = near !== undefined ? near + 1.2 + Math.random() * 4 : -6 + (i % 4) * 4 + 1.6 + Math.random() * 0.6; a.goTo = { x: tx, spd: spd * (0.8 + Math.random() * 0.4), then: near !== undefined ? 'Idle' : 'Attack1' }; });
      const fall = (i) => () => { const b = C.banners[i]; if (b && b.fallT === undefined) { b.fallT = 0; BB.sfx('slam'); } };
      const slay = (a) => () => { if (a && !a.dead) { a.dead = true; a.deadT = 0; act(a, 'Die'); a.loop = null; a.flash = 0.8; BB.sfx('herodie'); } };
      return { shots: [
        { kind: 'stage2d', dur: 7, fadeIn: 1.4, sky: 'dusk', land: 'village', pan: [-14, -3], zoom: [1, 1.08],
          caption: 'For three hundred years, nine banners kept the dead in their graves.', capAt: 1, cues: [[0, MUSIC('calm')]] },
        { kind: 'stage2d', dur: 6.5, sky: 'dusk', skyTo: 'night', skyIn: 2.4, land: 'village', pan: [-3, 11], zoom: [1.08, 1.0],
          caption: 'Then, one night, the Gravegates opened.', capAt: 2.4, cues: [
            [1.4, () => folk.forEach((a) => { a.goTo = { x: a.x - 30, spd: 4.5, then: 'Idle' }; })], [2.2, BOLT()], [2.5, WEATHER('rain')],
            [3.3, () => { C.gate = { x: 15, open: 0 }; SHAKE(0.6)(); BB.sfx('portal'); MUSIC('boss')(); }], [3.4, RING(15, '#b98cff')], [4.9, BOLT()]] },
        { kind: 'stage2d', dur: 4.8, sky: 'night', land: 'village', pan: [13.6, 14.4], zoom: [1.5, 2.1],
          caption: 'Out of the first one walked Vesh Morrow, the Bone Cantor.', capAt: 0.9, cues: [
            [0.3, () => { C.vesh = A2(vesh, 14.4, { d: 0.05, dir: 4, rise: 0, riseSpd: 0.55, scale: 1.35 }); C.cast.push(C.vesh); BB.sfx('charge'); }],
            [2.6, () => { act(C.vesh, 'Taunt'); SHAKE(0.5)(); BB.sfx('boss'); }], [2.6, RING(14.4, '#7dffb0')], [3.2, BOLT()]] },
        { kind: 'closeup', dur: 2.5, who: vesh, dir: 2, col1: 'rgba(40,120,70,1)', col2: 'rgba(4,16,10,1)', edge: '#7dffb0', caption: 'He sang —', capAt: 0.7, cues: [[0, SFX('charge')], [0.3, EMBERS(40, '#7dffb0')]] },
        { kind: 'impact', dur: 0.42, who: vesh, clip: 'Attack1', accent: '#7dffb0', cues: [[0, SHAKE(0.8)], [0, SFX('burst')], [0, FLASH(0.6, '#c8ffe0')]] },
        { kind: 'stage2d', dur: 6.2, sky: 'night', land: 'village', pan: [16, 6], zoom: [1.2, 1.0],
          caption: '— and the dead rose to listen.', capAt: 0.6, cues: [
            [0.1, () => { C.vesh.alpha = 0; }], [0.2, () => raise(7, 10, 22)], [1.0, () => raise(7, 6, 18)], [1.9, () => raise(6, 12, 24)], [2.8, () => march(2.2)], [3.4, BOLT()], [4.5, SHAKE(0.3)]] },
        { kind: 'stage2d', dur: 8, sky: 'night', land: 'village', pan: [-7, 6], zoom: [1.3, 1.3], ground: 0.8,
          caption: 'Eight banners fell before dawn.', capAt: 4.8, capEnd: 7.8, cues: [
            [0, WEATHER('embers')], [0.05, () => { kn.forEach((a) => { act(a, 'Attack1'); a.loop = 'Attack1'; }); dead.forEach((a, i) => { if (i >= 12) { a.alpha = 0; return; } const j = i % 4, row = Math.floor(i / 4); a.x = kn[j].x + 1.25 + row * 0.75 + (row % 2) * 0.3; a.d = Math.min(0.85, row * 0.2); a.goTo = null; a.dir = 4; act(a, 'Attack1'); a.ct = Math.random() * 0.6; a.loop = 'Attack1'; }); }],
            [1.0, fall(0)], [1.6, slay(kn[0])], [1.8, fall(1)], [2.5, fall(2)], [3.1, slay(kn[1])], [3.3, fall(3)], [4.0, fall(4)], [4.6, slay(kn[2])], [4.8, fall(5)], [5.5, fall(6)], [6.1, slay(kn[3])], [6.3, fall(7)], [6.4, SHAKE(0.35)]] },
        { kind: 'stage2d', dur: 5.4, sky: 'dawn', land: 'village', pan: [8.2, 8.8], zoom: [1.9, 2.5], ground: 0.8,
          caption: 'One banner still stood. Its bearer had no army left.', capAt: 0.9, cues: [
            [0, WEATHER('ash')], [0.01, () => { C.cast = C.cast.filter((a) => !kn.includes(a)); C.cast.push(cap); dead.forEach((a) => { if (a.dead) return; a.loop = null; a.x = 13 + Math.random() * 8; act(a, 'Idle'); }); march(0.9, 9); }]] },
        { kind: 'closeup', dur: 2.4, who: capW, dir: 1, col1: 'rgba(200,110,30,1)', col2: 'rgba(30,12,4,1)', edge: '#ffbe55', from: -1, cues: [[0.1, EMBERS(50, '#ffb347')], [1.4, SFX('charge')]] },
        { kind: 'impact', dur: 0.42, who: capW, clip: 'Taunt', accent: '#ffbe55', cues: [[0, SHAKE(0.8)], [0, SFX('slam')], [0, FLASH(0.8)]] },
        { kind: 'stage2d', dur: 4.6, sky: 'dawn', skyTo: 'warm', skyIn: 1.4, land: 'village', pan: [9, 9.6], zoom: [2.3, 1.5], ground: 0.8, fadeOut: 0.9,
          caption: 'So the Captain raised it, and swore to build a new one.', capAt: 1, capEnd: 3.9, cues: [
            [0, () => { act(cap, 'Taunt'); cap.flash = 1; BB.sfx('rally'); C.weather = null; }], [0.05, RING(8.8)], [0.25, RING(8.8, '#ffffff')],
            [0.15, () => dead.forEach((a) => { if (a.dead) return; a.vx = 9 + Math.random() * 6; setTimeout(() => { a.dead = true; a.deadT = 0; a.fade = true; act(a, 'Die'); a.loop = null; }, 200 + Math.random() * 300); })],
            [0.2, SHAKE(0.7)], [0.25, SPARKS(110, '#ffcf7a', 0.5, 0.62, 650)], [1.1, EMBERS(50, '#ffb347')]] },
        { kind: 'title', dur: 3.8, text: 'BANNERBORN', sub: 'Raise your banner. Earn your heroes. Shut the Gravegates.', size: 0.13, col: '#ffbe55', bg: '#1d1206', fadeOut: 0.6,
          cues: [[0, SFX('burst')], [0, SHAKE(0.5)], [0.02, SPARKS(120, '#ffcf7a', 0.5, 0.5, 700)], [0.05, EMBERS(60, '#ffb347')], [0, MUSIC('calm')]] },
      ] };
    },
    // before a boss: on a side-on stage the boss rises, then the close-up, impact, the name, the face-off
    async boss(o) {
      const M = o.stage, F = BB.FOES[M.boss];
      const bossW = { foe: M.boss }, heroW = { hero: leader() }, grunt = { foe: M.waves && M.waves[0] ? M.waves[0][0] : 'ghoul' };
      await cast([bossW, heroW, grunt]);
      const ch = M.chapter, land = ['', 'forest', 'desert', 'ruins', 'gate'][ch], sky = { vesh: 'toxic', regent: 'violet', sallow: 'desert', kestrelfoe: 'desert' }[M.boss] || 'crimson';
      const red = M.boss === 'vesh' ? ['rgba(40,130,80,1)', 'rgba(4,16,10,1)', '#7dffb0'] : M.boss === 'regent' ? ['rgba(90,70,160,1)', 'rgba(10,6,22,1)', '#c9a8ff'] : M.boss === 'sallow' ? ['rgba(170,120,40,1)', 'rgba(24,14,4,1)', '#ffd27a'] : ['rgba(160,30,24,1)', 'rgba(20,4,4,1)', '#ff7a6a'];
      const hero = A2(heroW, -7, { dir: 0 }); C.cast.push(hero); hero.goTo = { x: -4, spd: 1.6, then: 'Idle' };
      let boss = null;
      const name = F.name.split(',')[0].toUpperCase(), epi = (F.name.split(',')[1] || '').trim().toUpperCase();
      return { shots: [
        { kind: 'stage2d', dur: 3.4, sky, land, pan: [-5, 0.5], zoom: [1.0, 1.2], cues: [
          [0.1, SFX('charge')], [1.1, () => { boss = A2(bossW, 3, { d: 0, dir: 4, rise: 0, riseSpd: 0.7, scale: Math.min(1.3, (F.scale || 1.6) * 0.7) }); C.cast.push(boss); BB.sfx('portal'); SHAKE(0.4)(); }], [1.1, RING(3, red[2])],
          [1.7, () => { for (let i = 0; i < 4; i++) C.cast.push(A2(grunt, 5 + i * 1.6, { d: 0.35 + (i % 2) * 0.3, dir: 4, rise: 0, riseSpd: 1 })); }], [1.5, BOLT()],
          [2.6, () => { if (boss) act(boss, 'Taunt'); SHAKE(0.6)(); BB.sfx('boss'); }]] },
        { kind: 'closeup', dur: 1.6, who: bossW, dir: 3, col1: red[0], col2: red[1], edge: red[2], cues: [[0, SFX('charge')], [0.1, EMBERS(30, red[2])]] },
        { kind: 'impact', dur: 0.38, who: bossW, clip: F.atkClips ? F.atkClips[0] : 'Attack1', dir: 3, accent: red[2], cues: [[0, SHAKE(0.9)], [0, SFX('burst')], [0, FLASH(0.6)]] },
        { kind: 'title', dur: 2.0, bg2d: { sky, land, pan: [0.5, 1], zoom: [1.2, 1.25] }, text: name, sup: 'STAGE ' + M.code, sub: epi, size: 0.11, col: red[2], cues: [[0, SFX('slam')], [0, SHAKE(0.5)], [0.02, SPARKS(80, red[2], 0.5, 0.5, 600)]] },
        { kind: 'split', dur: 1.6, a: heroW, b: bossW, colA: ['rgba(200,110,30,1)', 'rgba(30,12,4,1)'], colB: [red[0], red[1]], cues: [[0, SFX('rally')], [0.5, SHAKE(0.3)]] },
        { kind: 'impact', dur: 0.32, who: heroW, who2: bossW, clip: 'Attack1', accent: '#ffffff', cues: [[0, SHAKE(1)], [0, SFX('slam')], [0, FLASH(0.9)]] },
      ] };
    },
    // a new chapter: the banner crosses a new land
    async chapter(o) {
      const ch = o.chapter, heroW = { hero: leader() };
      await cast([heroW]);
      const land = ['', 'forest', 'desert', 'ruins', 'gate'][ch.id], sky = ['', 'day', 'desert', 'dusk', 'night'][ch.id];
      const walker = A2(heroW, -6, { d: 0.05, dir: 0 }); walker.goTo = { x: 4, spd: 2.2, then: 'Idle' }; C.cast.push(walker);
      C.banners.push(Object.assign({ x: -7, d: 0.05, side: 1 }, BB.save.banner));
      const roman = ['', 'I', 'II', 'III', 'IV'][ch.id];
      return { shots: [
        { kind: 'stage2d', dur: 3.4, fadeIn: 0.8, sky, land, pan: [-12, 2], zoom: [0.9, 1.05], cues: [[0, SFX('charge')], [0, WEATHER(ch.id === 4 ? 'ash' : null)]] },
        { kind: 'title', dur: 2.6, bg2d: { sky, land, pan: [2, 3], zoom: [1.05, 1.1] }, sup: 'CHAPTER ' + roman, text: ch.name.toUpperCase(), sub: ch.blurb, size: 0.1, col: '#ffbe55', cues: [[0, SFX('burst')], [0, SHAKE(0.4)], [0.02, SPARKS(60, '#ffcf7a', 0.5, 0.5, 500)]] },
      ] };
    },
    // a boss falls
    async bossDown(o) {
      const M = o.stage, F = BB.FOES[M.boss], boss = { foe: M.boss };
      const art = actorArt(boss); if (art.key) await BB.loadChar(art.key).catch(() => null);
      return { shots: [
        { kind: 'impact', dur: 0.5, who: boss, clip: 'TakeDamage', dir: 3, accent: '#ffffff', cues: [[0, SHAKE(1)], [0, SFX('burst')], [0, FLASH(1)]] },
        { kind: 'closeup', dur: 1.3, who: boss, dir: 3, col1: 'rgba(120,120,130,1)', col2: 'rgba(8,8,10,1)', edge: '#ffffff', cues: [[0.2, SPARKS(120, '#e8e8f0', 0.5, 0.5, 400)], [0.2, SFX('slam')], [0.6, SHAKE(0.4)]] },
        { kind: 'title', dur: 2.0, text: F.name.split(',')[0].toUpperCase() + ' FALLS', sub: 'STAGE ' + M.code + ' CLEARED', size: 0.09, col: '#ffbe55', bg: '#140d05', cues: [[0, SFX('burst')], [0, SHAKE(0.5)], [0.02, SPARKS(100, '#ffcf7a', 0.5, 0.5, 650)], [0.05, EMBERS(50, '#ffb347')]] },
      ] };
    },
  };
  C.has = (name) => !!SCENES[name];
  const skip = document.getElementById('cineSkip');
  if (skip) skip.addEventListener('click', (e) => { e.stopPropagation(); BB.sfx('click'); C.end(); });
})();
