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
  function closeupBody(g, a, k, t, cx, cy, ph, dir, flip, col1, col2, fromX, o) {
    o = o || {};
    // background: a colour wash, speed lines, a streak of light
    const W = g.canvas.width;
    const bg = g.createLinearGradient(0, cy - ph, 0, cy + ph); bg.addColorStop(0, col2); bg.addColorStop(0.5, col1); bg.addColorStop(1, col2);
    g.fillStyle = bg; g.fillRect(-W, cy - ph, W * 3, ph * 2);
    speedLines(g, cx, cy, W, ph * 2, 70, 'rgba(255,255,255,0.10)', Math.floor(t * 12), 0.15);
    const sx = lerp(-W * 0.2, W * 1.2, (t * 0.7) % 1);
    const st = g.createLinearGradient(sx - 200, 0, sx + 200, 0); st.addColorStop(0, 'rgba(255,255,255,0)'); st.addColorStop(0.5, 'rgba(255,255,255,0.18)'); st.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = st; g.fillRect(sx - 200, cy - ph, 400, ph * 2);
    if (o.burst) rays(g, cx, cy, W, ph * 2, o.burst, t, 18);
    // the face: a whole-number scale so the pixels stay square; the head sits on the focal point
    const S = Math.max(4, Math.round(ph * 1.15 / 14)), slide = (1 - easeOut(clamp01(k * 3))) * fromX;
    const clip = 'Idle', fr = Math.floor(t * 8) % clipLen(a, clip), lift = headLift(a, clip, dir, fr);
    g.save(); g.imageSmoothingEnabled = false;
    if (flip) { g.translate(cx * 2, 0); g.scale(-1, 1); }
    const push = 1 + k * 0.06, riseY = o.rise ? (1 - easeOut(clamp01(k * 2.2))) * ph * 1.1 : 0;
    g.translate(cx + slide * (flip ? -1 : 1), cy + riseY); g.scale(push, push);
    const sil = o.sil === undefined ? 0 : o.sil;
    if (sil > 0 && o.rim) { const rv = silhouette(a, clip, dir, fr, S, o.rim); for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.drawImage(rv, -64 * S + dx * S, lift * S - 90 * S + dy * S); }
    drawActor(g, a, clip, dir, fr, 0, lift * S, S);
    if (sil > 0) { const sv = silhouette(a, clip, dir, fr, S, '#06070b'); g.globalAlpha = sil; g.drawImage(sv, -64 * S, lift * S - 90 * S); g.globalAlpha = 1; }
    g.restore();
  }
  function drawCloseup(g, W, H, sh, k, t) {
    const ph = H * 0.3, cy = H * 0.5;
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    g.save(); panelPath(g, -40, cy - ph, W + 40, cy + ph, W * 0.03); g.clip();
    const silA = sh.sil === undefined ? 0 : typeof sh.sil === 'number' ? sh.sil : clamp01(1 - (k - sh.sil[0]) / (sh.sil[1] - sh.sil[0]));
    closeupBody(g, sh.who, k, t, W * (sh.x || 0.5), cy, ph, sh.dir === undefined ? 2 : sh.dir, false, sh.col1, sh.col2, sh.rise ? 0 : W * 0.3 * (sh.from || 1), { rise: sh.rise, sil: silA, rim: sh.rim, burst: sh.burst });
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
  // ---------------------------------------------------------------- full-frame panels: every shot is close and graphic
  function smoke(g, W, H, t, col, n) { for (let i = 0; i < n; i++) { const p = ((t * 0.08 + i / n) % 1), x = ((i * 0.618) % 1) * W + Math.sin(t * 0.4 + i) * 40, y = H * (1 - p * 0.9), r = H * (0.08 + p * 0.18); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col.replace('A', String(0.22 * (1 - p)))); gr.addColorStop(1, col.replace('A', '0')); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); } }
  function rays(g, cx, cy, W, H, col, t, n) { g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < (n || 14); i++) { const a = i / (n || 14) * Math.PI * 2 + t * 0.15, w = 0.05 + 0.03 * Math.sin(t * 2 + i); const R = Math.max(W, H); g.fillStyle = col; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a - w) * R, cy + Math.sin(a - w) * R); g.lineTo(cx + Math.cos(a + w) * R, cy + Math.sin(a + w) * R); g.closePath(); g.fill(); } g.restore(); }
  // a row of great banners seen from below, against the sky; they topple on cue (C.fall[i] = time), or one alone
  function drawBanners(g, W, H, sh, k, t) {
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, sh.top || '#2a1b3d'); bg.addColorStop(1, sh.bot || '#d0683a'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    if (sh.sun !== false) { const sx = W * 0.5, sy = H * 0.7, r = H * 0.5; const gl = g.createRadialGradient(sx, sy, 0, sx, sy, r); gl.addColorStop(0, sh.sunCol || 'rgba(255,190,110,0.55)'); gl.addColorStop(1, 'rgba(255,190,110,0)'); g.fillStyle = gl; g.fillRect(0, 0, W, H); }
    rays(g, W / 2, H * 0.95, W, H, sh.rayCol || 'rgba(255,200,140,0.05)', t, 16);
    const list = sh.only !== undefined ? [sh.only] : [0, 1, 2, 3, 4, 5, 6, 7, 8];
    const push = 1 + k * 0.05;
    list.forEach((i, j) => {
      const b = C.banners[i]; if (!b) return;
      const solo = sh.only !== undefined;
      const slot = W / 9, bw = solo ? H * 0.5 : Math.min(slot * 0.95, H * 0.5), bh = bw / 0.72 * (solo ? 1 : 1 - Math.abs(j - 4) * 0.04);
      const bx = solo ? W * 0.5 - bw * 0.34 : slot * (j + 0.5) - bw * 0.34, by = H * (solo ? 0.93 : 0.9);
      if (!b.cv) { b.cv = document.createElement('canvas'); b.cv.width = 200; b.cv.height = 280; }
      BB.UI.drawBanner(b.cv.getContext('2d'), b, 200, 280, C.t * 1.6 + i);
      const ft = C.fall && C.fall[i] !== undefined ? C.t - C.fall[i] : -1;
      const ang = ft >= 0 ? Math.min(1, ft / 0.8) ** 2 * 1.5 * (i % 2 ? 1 : -1) : Math.sin(C.t * 1.3 + i) * 0.02;
      g.save(); g.translate(bx, by); g.scale(push, push); g.rotate(ang);
      if (ft >= 0) g.globalAlpha = Math.max(0.15, 1 - ft * 0.45);
      g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 20;
      g.drawImage(b.cv, -bw * 0.16, -bh, bw, bh);
      g.restore();
      if (ft >= 0 && ft < 0.6) { g.save(); g.globalCompositeOperation = 'lighter'; const fl = g.createRadialGradient(bx, by - bh * 0.3, 0, bx, by - bh * 0.3, bh * 0.6); fl.addColorStop(0, 'rgba(255,140,60,' + (0.6 * (1 - ft / 0.6)) + ')'); fl.addColorStop(1, 'rgba(255,140,60,0)'); g.fillStyle = fl; g.fillRect(bx - bh, by - bh, bh * 2, bh * 2); g.restore(); }
    });
    if (sh.smoke) smoke(g, W, H, t, sh.smoke, 14);
    if (sh.fire) { g.save(); g.globalCompositeOperation = 'lighter'; const fg = g.createLinearGradient(0, H * 0.75, 0, H); fg.addColorStop(0, 'rgba(255,90,20,0)'); fg.addColorStop(1, 'rgba(255,110,30,0.45)'); g.fillStyle = fg; g.fillRect(0, H * 0.75, W, H * 0.25); g.restore(); }
  }
  // three faces in three slanted panels, sliding in one after another
  function drawTriple(g, W, H, sh, k, t) {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const sl = W * 0.06;
    for (let i = 0; i < 3; i++) {
      const x0 = W * i / 3, x1 = W * (i + 1) / 3, kk = clamp01((k - i * 0.12) / 0.9);
      if (kk <= 0) continue;
      g.save(); g.beginPath(); g.moveTo(x0 + sl, 0); g.lineTo(x1 + sl, 0); g.lineTo(x1 - sl, H); g.lineTo(x0 - sl, H); g.closePath(); g.clip();
      const c = sh.cols[i % sh.cols.length];
      closeupBody(g, sh.who[i], kk, t + i, (x0 + x1) / 2, H * 0.55, H * 0.27, sh.dir === undefined ? 2 : sh.dir, false, c[0], c[1], 0, { rise: true });
      g.restore();
      g.strokeStyle = sh.edge || '#ffe7a3'; g.lineWidth = 4; g.beginPath(); g.moveTo(x1 + sl, -4); g.lineTo(x1 - sl, H + 4); g.stroke();
    }
  }
  // the gate tearing open: fills the frame, rings, lightning, rain, debris
  function drawGate(g, W, H, sh, k, t) {
    const col = sh.col || [170, 90, 255];
    const bg = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7); bg.addColorStop(0, 'rgba(' + col + ',0.55)'); bg.addColorStop(0.5, 'rgba(10,6,20,1)'); bg.addColorStop(1, '#000'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    speedLines(g, W / 2, H / 2, W, H, 80, 'rgba(255,255,255,0.08)', Math.floor(t * 14), 0.12);
    const open = easeOut(clamp01(k * 1.6));
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) { g.strokeStyle = 'rgba(' + col + ',' + (0.5 - i * 0.1) + ')'; g.lineWidth = H * 0.006; g.setLineDash(i % 2 ? [H * 0.03, H * 0.02] : []); g.lineDashOffset = t * 60 * (i % 2 ? 1 : -1); g.beginPath(); g.ellipse(W / 2, H / 2, H * (0.2 + i * 0.09) * open, H * (0.3 + i * 0.12) * open, 0, 0, 7); g.stroke(); }
    g.setLineDash([]);
    BB.drawFx(g, k < 0.4 ? 'portalopen' : 'portal', Math.floor(t * 14) % (BB.fxLen(k < 0.4 ? 'portalopen' : 'portal') || 1), W / 2, H / 2, H / 210 * (0.3 + open * 0.9), { add: true, hue: sh.hue || 0 });
    g.restore();
    if (sh.rain) { g.strokeStyle = 'rgba(190,210,255,0.3)'; g.lineWidth = 1.2; g.beginPath(); for (let i = 0; i < 140; i++) { const h1 = Math.sin(i * 12.9898) * 43758.5 % 1, h2 = Math.abs(Math.sin(i * 78.233) * 12345.6 % 1), x = ((Math.abs(h1) * (W + 100) - t * 300) % (W + 100) + W + 100) % (W + 100) - 50, y = ((h2 * (H + 60) + t * 1500) % (H + 60)) - 30; g.moveTo(x, y); g.lineTo(x - 7, y + 20); } g.stroke(); }
  }
  // the horde: a wall of small panels, each a dead face, crashing in from the right
  function drawHorde(g, W, H, sh, k, t) {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const cols = 4, rows = 2, pw = W / cols, ph = H / rows, sl = pw * 0.12;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c, kk = clamp01((k - (cols - 1 - c) * 0.07 - r * 0.04) / 0.5); if (kk <= 0) continue;
      const x0 = c * pw + (1 - easeOut(kk)) * W * 0.6, y0 = r * ph;
      g.save(); g.beginPath(); g.moveTo(x0 + sl, y0 + 3); g.lineTo(x0 + pw + sl - 3, y0 + 3); g.lineTo(x0 + pw - sl - 3, y0 + ph - 3); g.lineTo(x0 - sl, y0 + ph - 3); g.closePath(); g.clip();
      closeupBody(g, sh.who[i % sh.who.length], kk, t + i * 0.37, x0 + pw / 2, y0 + ph / 2, ph * 0.5, 2 + (i % 2) * 1, false, i % 3 ? 'rgba(120,20,20,1)' : 'rgba(70,90,40,1)', 'rgba(10,4,4,1)', 0);
      g.restore();
      g.strokeStyle = 'rgba(255,90,70,0.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0 + sl, y0 + 3); g.lineTo(x0 + pw + sl - 3, y0 + 3); g.lineTo(x0 + pw - sl - 3, y0 + ph - 3); g.lineTo(x0 - sl, y0 + ph - 3); g.closePath(); g.stroke();
    }
    if (Math.floor(t * 10) % 7 === 0) { g.fillStyle = 'rgba(255,40,30,0.12)'; g.fillRect(0, 0, W, H); }
  }

  // ---------------------------------------------------------------- the player
  C.play = async function (name, opts, done) {
    const build = SCENES[name]; if (!build) { done && done(); return; }
    const el = document.getElementById('cine'); el.classList.add('on');
    Object.assign(C, { on: true, loading: true, t: 0, done, parts: [], shake: 0, flash: 0, flashCol: '#fff', bolts: [], cued: {}, shots: [], banners: [], fall: {} });
    try { const def = await build(opts || {}); C.shots = def.shots; C.total = C.shots.reduce((a, s) => a + s.dur, 0); }
    catch (e) { console.warn('cutscene skipped', e); C.end(); return; }
    C.loading = false;
    BB.music(opts.music || 'boss');
  };
  C.end = function () {
    if (!C.on) return;
    C.on = false; document.getElementById('cine').classList.remove('on');
    const d = C.done; C.done = null; d && d();
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
    if (sh.kind === 'banners') drawBanners(g, W, H, sh, k, lt);
    else if (sh.kind === 'triple') drawTriple(g, W, H, sh, k, lt);
    else if (sh.kind === 'gate') drawGate(g, W, H, sh, k, lt);
    else if (sh.kind === 'horde') drawHorde(g, W, H, sh, k, lt);
    else if (sh.kind === 'closeup') drawCloseup(g, W, H, sh, k, lt);
    else if (sh.kind === 'split') drawSplit(g, W, H, sh, k, lt);
    else if (sh.kind === 'impact') drawImpact(g, W, H, sh, k, lt);
    else if (sh.kind === 'title') drawTitle(g, W, H, sh, k, lt);
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
  async function cast(list) {
    const keys = new Set();
    for (const w of list) { const art = actorArt(w); if (art.key) keys.add(art.key); else if (art.layers) art.layers.forEach((L) => keys.add(L.key)); }
    await Promise.all([BB.loadOther()].concat([...keys].map((k) => BB.loadChar(k).catch(() => null))));
  }
  const leader = () => (BB.UI && BB.UI.leader ? BB.UI.leader() : BB.save.heroes[0]);
  const FALL = (i) => () => { if (C.fall[i] === undefined) { C.fall[i] = C.t; BB.sfx('slam'); C.shake = Math.max(C.shake, 0.25); } };
  const GOLD = ['rgba(200,140,50,1)', 'rgba(30,18,6,1)'], STEEL = ['rgba(70,100,150,1)', 'rgba(8,12,24,1)'], EMBER = ['rgba(170,60,30,1)', 'rgba(24,6,4,1)'];

  // ---------------------------------------------------------------- the cutscenes: every shot close, nothing from the game camera
  const SCENES = {
    // a new game: what the nine banners were, how they fell, and why one is left
    async intro() {
      const capW = { hero: leader() }, vesh = { foe: 'vesh' }, ghoul = { foe: 'ghoul' }, warden = { foe: 'warden' }, skel = { foe: 'necro' };
      const knights = BB.ROSTER.filter((c) => c.role === 'hero' && (c.arch === 'knight' || c.arch === 'spearman' || c.arch === 'barbarian')).slice(0, 3).map((c) => ({ hero: BB.newHero({ calling: c.calling, recruit: c.key, name: c.name }) }));
      while (knights.length < 3) knights.push(capW);
      await cast([capW, vesh, ghoul, warden, skel].concat(knights));
      const cols = BB.BANNER_COLORS.concat(['#3a6a8a']);
      for (let i = 0; i < 9; i++) C.banners.push(Object.assign({}, i === 8 ? BB.save.banner : { color: cols[i], sigil: BB.SIGILS[i % BB.SIGILS.length], trim: '#e8c66a' }));
      return { shots: [
        { kind: 'title', dur: 2.6, sup: 'GREENVALE', text: 'THREE HUNDRED YEARS AGO', size: 0.06, col: '#c9b48a', bg: '#100c08', fadeIn: 0.8, cues: [[0, MUSIC('calm')]] },
        { kind: 'banners', dur: 6, top: '#24183a', bot: '#d4703c', caption: 'Nine banners stood between the living and the dead.', capAt: 0.6, cues: [[0.2, EMBERS(30, '#ffcf8a')]] },
        { kind: 'triple', dur: 4.6, who: knights, cols: [GOLD, STEEL, GOLD], edge: '#ffe7a3', caption: 'Nine knights swore to hold them. For three hundred years, they did.', capAt: 0.5, cues: [[0.1, SFX('chime')], [0.6, SFX('chime')], [1.1, SFX('chime')]] },
        { kind: 'gate', dur: 5, col: [150, 90, 255], hue: 0, rain: true, caption: 'Then, one night, the Gravegates opened.', capAt: 1.4, cues: [
          [0, MUSIC('boss')], [0.1, SFX('charge')], [0.9, BOLT()], [1.6, () => { SHAKE(0.7)(); BB.sfx('portal'); BB.sfx('burst'); FLASH(0.5, '#e0d0ff')(); }], [1.7, SPARKS(140, '#c9a8ff', 0.5, 0.5, 900)], [2.8, BOLT()], [3.9, BOLT()]] },
        { kind: 'closeup', dur: 3.6, who: vesh, dir: 2, rise: true, sil: [0.25, 0.6], rim: '#7dffb0', col1: 'rgba(40,120,70,1)', col2: 'rgba(4,16,10,1)', edge: '#7dffb0', label: 'VESH MORROW · THE BONE CANTOR',
          caption: 'Out of the first one walked Vesh Morrow.', capAt: 0.5, cues: [[0, SFX('charge')], [0.3, EMBERS(40, '#7dffb0')], [1.4, SHAKE(0.3)]] },
        { kind: 'closeup', dur: 2.2, who: vesh, dir: 2, burst: 'rgba(125,255,176,0.07)', col1: 'rgba(60,170,100,1)', col2: 'rgba(4,20,12,1)', edge: '#7dffb0', from: 0.3, caption: 'He sang —', capAt: 0.3, cues: [[0, SFX('boss')], [0.2, SHAKE(0.4)]] },
        { kind: 'impact', dur: 0.45, who: vesh, clip: 'Attack1', accent: '#7dffb0', cues: [[0, SHAKE(0.9)], [0, SFX('burst')], [0, FLASH(0.6, '#c8ffe0')]] },
        { kind: 'horde', dur: 3.6, who: [ghoul, warden, skel, ghoul], caption: '— and the dead rose to listen.', capAt: 0.4, cues: [[0, SFX('slam')], [0.3, SHAKE(0.5)], [0.9, SHAKE(0.4)], [1.6, BOLT()]] },
        { kind: 'split', dur: 1.5, a: knights[0], b: warden, colA: GOLD, colB: EMBER, cues: [[0, SFX('rally')]] },
        { kind: 'impact', dur: 0.32, who: knights[0], who2: ghoul, clip: 'Attack1', accent: '#ff7a3a', cues: [[0, SHAKE(1)], [0, SFX('slam')], [0, FLASH(0.8)]] },
        { kind: 'banners', dur: 6, top: '#0a0810', bot: '#5a1a10', sun: false, fire: true, smoke: 'rgba(30,20,20,A)', rayCol: 'rgba(255,120,60,0.04)', caption: 'Eight banners fell before dawn.', capAt: 3.6, cues: [
          [0, EMBERS(60, '#ff8a3a')], [0.4, FALL(0)], [0.9, FALL(1)], [1.4, FALL(2)], [1.9, FALL(3)], [2.4, FALL(4)], [2.9, FALL(5)], [3.3, FALL(6)], [3.7, FALL(7)], [3.8, SHAKE(0.5)]] },
        { kind: 'banners', dur: 4.4, only: 8, top: '#3a3a42', bot: '#8a7468', sunCol: 'rgba(230,210,190,0.35)', smoke: 'rgba(60,55,55,A)', caption: 'One banner still stood.', capAt: 0.6, cues: [[0, SFX('chime')], [0, EMBERS(20, '#d8c8b8')]] },
        { kind: 'closeup', dur: 3.4, who: capW, dir: 2, sil: 1, rim: '#ffbe55', col1: 'rgba(110,70,40,1)', col2: 'rgba(14,8,4,1)', edge: '#ffbe55', from: -0.3, caption: 'Its bearer had no army left.', capAt: 0.5 },
        { kind: 'closeup', dur: 2.6, who: capW, dir: 2, sil: [0.1, 0.45], rim: '#ffbe55', burst: 'rgba(255,190,85,0.08)', col1: 'rgba(210,120,30,1)', col2: 'rgba(30,12,4,1)', edge: '#ffbe55', from: 0.2, cues: [[0, SFX('charge')], [0.3, () => { FLASH(0.5, '#ffe2a0')(); }], [0.4, EMBERS(70, '#ffb347')]] },
        { kind: 'impact', dur: 0.45, who: capW, clip: 'Taunt', accent: '#ffbe55', cues: [[0, SHAKE(1)], [0, SFX('slam')], [0, FLASH(0.9)]] },
        { kind: 'banners', dur: 4.2, only: 8, top: '#4a2a1a', bot: '#ffb85a', sunCol: 'rgba(255,220,150,0.6)', rayCol: 'rgba(255,220,150,0.08)', caption: 'So the Captain raised it, and swore to build a new army.', capAt: 0.5, capEnd: 4,
          cues: [[0, SFX('rally')], [0, SPARKS(140, '#ffcf7a', 0.5, 0.6, 800)], [0.1, SHAKE(0.6)], [0.4, EMBERS(60, '#ffcf7a')]] },
        { kind: 'title', dur: 3.8, text: 'BANNERBORN', sub: 'Raise your banner. Earn your heroes. Shut the Gravegates.', size: 0.13, col: '#ffbe55', bg: '#1d1206', fadeOut: 0.6,
          cues: [[0, SFX('burst')], [0, SHAKE(0.5)], [0.02, SPARKS(140, '#ffcf7a', 0.5, 0.5, 800)], [0.05, EMBERS(60, '#ffb347')], [0, MUSIC('calm')]] },
      ] };
    },
    // before a boss: the gate, the boss rising out of shadow, impact, the name, the face-off, the clash
    async boss(o) {
      const M = o.stage, F = BB.FOES[M.boss];
      const bossW = { foe: M.boss }, heroW = { hero: leader() }, grunt = { foe: M.waves && M.waves[0] ? M.waves[0][0] : 'ghoul' };
      await cast([bossW, heroW, grunt]);
      const red = M.boss === 'vesh' ? ['rgba(40,130,80,1)', 'rgba(4,16,10,1)', '#7dffb0', [100, 255, 170]] : M.boss === 'regent' ? ['rgba(90,70,160,1)', 'rgba(10,6,22,1)', '#c9a8ff', [180, 140, 255]] : M.boss === 'sallow' ? ['rgba(170,120,40,1)', 'rgba(24,14,4,1)', '#ffd27a', [255, 200, 110]] : ['rgba(160,30,24,1)', 'rgba(20,4,4,1)', '#ff7a6a', [255, 90, 70]];
      const name = F.name.split(',')[0].toUpperCase(), epi = (F.name.split(',')[1] || '').trim().toUpperCase();
      return { shots: [
        { kind: 'gate', dur: 2.2, col: red[3], hue: M.boss === 'vesh' ? 150 : M.boss === 'sallow' ? 30 : 0, cues: [[0, SFX('charge')], [0.8, () => { SHAKE(0.5)(); BB.sfx('portal'); }], [1.2, BOLT()]] },
        { kind: 'closeup', dur: 2.6, who: bossW, dir: 3, rise: true, sil: [0.3, 0.75], rim: red[2], col1: red[0], col2: red[1], edge: red[2], cues: [[0, SFX('boss')], [0.3, SHAKE(0.4)], [0.2, EMBERS(40, red[2])]] },
        { kind: 'impact', dur: 0.4, who: bossW, clip: F.atkClips ? F.atkClips[0] : 'Attack1', dir: 3, accent: red[2], cues: [[0, SHAKE(0.9)], [0, SFX('burst')], [0, FLASH(0.6)]] },
        { kind: 'title', dur: 2.1, text: name, sup: 'STAGE ' + M.code, sub: epi, size: 0.11, col: red[2], bg: red[1].replace(',1)', ',1)'), cues: [[0, SFX('slam')], [0, SHAKE(0.5)], [0.02, SPARKS(90, red[2], 0.5, 0.5, 650)]] },
        { kind: 'horde', dur: 1.6, who: [grunt, grunt, bossW, grunt], cues: [[0, SFX('slam')], [0.3, SHAKE(0.4)]] },
        { kind: 'split', dur: 1.7, a: heroW, b: bossW, colA: GOLD, colB: [red[0], red[1]], cues: [[0, SFX('rally')], [0.5, SHAKE(0.3)]] },
        { kind: 'impact', dur: 0.34, who: heroW, who2: bossW, clip: 'Attack1', accent: '#ffffff', cues: [[0, SHAKE(1)], [0, SFX('slam')], [0, FLASH(0.9)]] },
      ] };
    },
    // a new chapter: your banner, the land's colours, its name
    async chapter(o) {
      const ch = o.chapter, heroW = { hero: leader() };
      await cast([heroW]);
      C.banners.push(Object.assign({}, BB.save.banner));
      const sky = [null, ['#2a4a70', '#cfe3f0'], ['#6a3a2a', '#f6c880'], ['#2a1b3d', '#c8643a'], ['#06070f', '#2a2350']][ch.id];
      const roman = ['', 'I', 'II', 'III', 'IV'][ch.id];
      return { shots: [
        { kind: 'banners', dur: 2.6, only: 0, top: sky[0], bot: sky[1], fadeIn: 0.6, cues: [[0, SFX('charge')], [0.2, EMBERS(30, '#ffe0a0')]] },
        { kind: 'closeup', dur: 2.0, who: heroW, dir: 1, col1: 'rgba(200,120,40,1)', col2: 'rgba(30,14,4,1)', edge: '#ffbe55', from: -1 },
        { kind: 'title', dur: 2.8, sup: 'CHAPTER ' + roman, text: ch.name.toUpperCase(), sub: ch.blurb, size: 0.1, col: '#ffbe55', bg: '#140d05', cues: [[0, SFX('burst')], [0, SHAKE(0.4)], [0.02, SPARKS(70, '#ffcf7a', 0.5, 0.5, 550)]] },
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
