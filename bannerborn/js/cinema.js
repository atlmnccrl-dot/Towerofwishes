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
  const TAU = Math.PI * 2;

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
    if (!o.noBg) { const bg = g.createLinearGradient(0, cy - ph, 0, cy + ph); bg.addColorStop(0, col2); bg.addColorStop(0.5, col1); bg.addColorStop(1, col2); g.fillStyle = bg; g.fillRect(-W, cy - ph, W * 3, ph * 2); }
    speedLines(g, cx, cy, W, ph * 2, 70, 'rgba(255,255,255,0.10)', Math.floor(t * 12), 0.15);
    const sx = lerp(-W * 0.2, W * 1.2, (t * 0.7) % 1);
    const st = g.createLinearGradient(sx - 200, 0, sx + 200, 0); st.addColorStop(0, 'rgba(255,255,255,0)'); st.addColorStop(0.5, 'rgba(255,255,255,0.18)'); st.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = st; g.fillRect(sx - 200, cy - ph, 400, ph * 2);
    if (o.burst) rays(g, cx, cy, W, ph * 2, o.burst, t, 18);
    if (o.bigword) { g.save(); g.font = '800 ' + Math.round(ph * 1.5) + 'px Cinzel, Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = o.bigcol || 'rgba(255,255,255,0.16)'; if (g.letterSpacing !== undefined) g.letterSpacing = Math.round(ph * 0.08) + 'px'; g.translate(cx, cy - ph * 0.05); g.scale(1 + k * 0.08, 1 + k * 0.08); g.fillText(o.bigword, 0, 0); if (g.letterSpacing !== undefined) g.letterSpacing = '0px'; g.restore(); }
    if (o.waves) { g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 7; i++) { const q = (t * 0.9 + i / 7) % 1; g.strokeStyle = o.waves.replace('A', String((1 - q) * 0.7)); g.lineWidth = ph * 0.02 * (1 - q) + 1; g.beginPath(); g.ellipse(cx, cy - ph * 0.15, q * W * 0.7, q * ph * 1.3, 0, 0, 7); g.stroke(); } g.restore(); }
    // the face: a whole-number scale so the pixels stay square; the head sits on the focal point
    const S = Math.max(4, Math.round(ph * 1.15 / 14 * (o.zoom || 1))), slide = (1 - easeOut(clamp01(k * 3))) * fromX;
    const clip = o.clip || 'Idle', fr = o.fr !== undefined ? o.fr : Math.floor(t * 8) % clipLen(a, clip), lift = headLift(a, o.clip ? 'Idle' : clip, dir, o.clip ? 0 : fr);
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
    closeupBody(g, sh.who, k, t, W * (sh.x || 0.5), cy + (sh.dy || 0) * ph, ph, sh.dir === undefined ? 2 : sh.dir, false, sh.col1, sh.col2, sh.rise ? 0 : W * 0.3 * (sh.from || 1), { rise: sh.rise, sil: silA, rim: sh.rim, burst: sh.burst, waves: sh.waves, zoom: sh.zoom, bigword: sh.bigword, bigcol: sh.bigcol });
    if (sh.converge && k < 0.95) for (let i = 0; i < 3; i++) { const a = Math.random() * Math.PI * 2, R = Math.max(W, H) * 0.6; C.parts.push({ x: W / 2 + Math.cos(a) * R, y: cy + Math.sin(a) * R * 0.6, vx: -Math.cos(a) * R * 1.1, vy: -Math.sin(a) * R * 0.66, t: 0, life: 0.85, col: sh.converge, r: 1.5 + Math.random() * 2, drift: true, nograv: true }); }
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
  function drawHeart(g, W, H, sh, k, t) { // black, and a heartbeat
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const beat = Math.max(0, Math.sin((t % 1.05) / 1.05 * Math.PI * 2) ** 12);
    const gl = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, H * (0.3 + beat * 0.35)); gl.addColorStop(0, 'rgba(160,20,20,' + (0.12 + beat * 0.35) + ')'); gl.addColorStop(1, 'rgba(160,20,20,0)'); g.fillStyle = gl; g.fillRect(0, 0, W, H);
    if (k > 0.7) { const lw = W * easeOut(clamp01((k - 0.7) / 0.3)); g.fillStyle = '#ffd27a'; g.shadowColor = '#ffbe55'; g.shadowBlur = 20; g.fillRect(W / 2 - lw / 2, H / 2 - 1, lw, 2); g.shadowBlur = 0; }
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
  // three faces in three slanted panels, sliding in one after another
  function drawTriple(g, W, H, sh, k, t) {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const n = sh.who.length, sl = W * (n > 3 ? 0.025 : 0.06), stag = n > 3 ? 0.075 : 0.12;
    for (let i = 0; i < n; i++) {
      const x0 = W * i / n, x1 = W * (i + 1) / n, kk = clamp01((k - i * stag) / (n > 3 ? 0.45 : 0.9));
      if (kk <= 0) continue;
      const drop = (1 - easeOut(clamp01(kk * 2.5))) * H * (i % 2 ? 1 : -1);
      g.save(); g.translate(0, drop); g.beginPath(); g.moveTo(x0 + sl, 0); g.lineTo(x1 + sl, 0); g.lineTo(x1 - sl, H); g.lineTo(x0 - sl, H); g.closePath(); g.clip();
      const c = sh.cols[i % sh.cols.length];
      if (n > 3) { const wb = g.createLinearGradient(0, 0, 0, H); wb.addColorStop(0, c[1]); wb.addColorStop(0.45, c[0]); wb.addColorStop(1, c[1]); g.fillStyle = wb; g.fillRect(x0 - sl, 0, x1 - x0 + sl * 2, H); }
      closeupBody(g, sh.who[i], kk, t + i, (x0 + x1) / 2, H * (n > 3 ? 0.47 : 0.52), H * (n > 3 ? 0.125 : 0.27), sh.dir === undefined ? 2 : sh.dir, false, c[0], c[1], 0, { rise: n <= 3, noBg: n > 3 });
      if (sh.banners && C.banners[i] && BB.UI.sigilPath) { // their banner's sigil under each face
        const b = C.banners[i], cx = (x0 + x1) / 2 - sl * 0.55, cy = H * 0.8, r = Math.min(x1 - x0, H) * 0.16;
        g.fillStyle = b.trim || '#e8c66a'; g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = 8; BB.UI.sigilPath(g, b.sigil, cx, cy, r); g.fill('evenodd'); g.shadowBlur = 0;
      }
      g.restore();
      g.strokeStyle = sh.edge || '#ffe7a3'; g.lineWidth = n > 3 ? 3 : 4; g.beginPath(); g.moveTo(x1 + sl, -4 + drop); g.lineTo(x1 - sl, H + 4 + drop); g.stroke();
    }
  }
  // ---------------------------------------------------------------- painted sets: the banner field and the Gravegate
  const hr = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const rgbOf = (hex) => { if (!hex || hex[0] !== '#') return [128, 128, 128]; let h = hex.slice(1); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); const n = parseInt(h, 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const rgba = (c, a) => 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + a + ')';
  const mix = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  const easeBack = (k) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
  // soft clouds: a dark body and a lit underside, drifting
  function clouds(g, W, H, t, n, y0, y1, body, lit, speed, seed) {
    for (let i = 0; i < n; i++) {
      const s = seed + i * 7, rx = W * (0.1 + hr(s) * 0.2), span = W + rx * 2;
      const x = ((hr(s + 1) * span + t * speed * (0.6 + hr(s + 2))) % span) - rx, y = lerp(y0, y1, hr(s + 3));
      for (const [col, dy, a] of [[body, 0, 0.85], [lit, rx * 0.07, 0.5]]) {
        g.save(); g.translate(x, y + dy); g.scale(1, 0.2 + hr(s + 4) * 0.08);
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(0.6, rgba(col, a * 0.5)); gr.addColorStop(1, rgba(col, 0));
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, 7); g.fill(); g.restore();
      }
    }
  }
  // a ridge line across the frame
  function ridge(g, W, H, y, amp, seed, col, shift) {
    g.fillStyle = col; g.beginPath(); g.moveTo(-10, H + 10);
    for (let i = 0; i <= 48; i++) { const x = i / 48 * (W + 20) - 10, u = x / W + shift; g.lineTo(x, y - amp * (Math.sin(u * 5.3 + seed) * 0.5 + Math.sin(u * 13.1 + seed * 2) * 0.3 + Math.sin(u * 31 + seed) * 0.12)); }
    g.lineTo(W + 10, H + 10); g.closePath(); g.fill();
  }
  function birds(g, W, H, t, n, col, y0, y1) {
    g.strokeStyle = col; g.lineWidth = Math.max(1.2, H * 0.003); g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const sp = 0.03 + hr(i + 40) * 0.03, x = ((hr(i + 41) + t * sp) % 1.2 - 0.1) * W, y = lerp(y0, y1, hr(i + 42)) + Math.sin(t * 0.7 + i) * H * 0.01;
      const s = H * (0.008 + hr(i + 43) * 0.008), f = Math.sin(t * 9 + i * 2) * s * 0.7;
      g.beginPath(); g.moveTo(x - s, y - f); g.quadraticCurveTo(x - s * 0.4, y - s * 0.2, x, y); g.quadraticCurveTo(x + s * 0.4, y - s * 0.2, x + s, y - f); g.stroke();
    }
  }
  function grass(g, W, H, t, n, col, shift, hmul) {
    g.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const span = W * 1.4, x = ((hr(i + 70) * span - shift * W) % span + span) % span - W * 0.2, h = H * (0.05 + hr(i + 71) * 0.11) * (hmul || 1);
      if (x > W * 0.22 && x < W * 0.78 && hr(i + 72) > 0.35) continue; // keep the middle clear
      const bend = Math.sin(t * 1.8 + i) * h * 0.18 + h * 0.15, w = H * 0.006;
      g.beginPath(); g.moveTo(x - w, H); g.quadraticCurveTo(x - w * 0.5 + bend * 0.4, H - h * 0.6, x + bend, H - h); g.quadraticCurveTo(x + w * 0.5 + bend * 0.4, H - h * 0.6, x + w, H); g.fill();
    }
  }
  // a war banner's cloth, painted once: a long gonfalon with a swallowtail, trim, the sigil, fringe
  const TEX_W = 128, TEX_H = 320, PAD = 70;
  function clothTex(b, q) {
    q = q || 1; const key = 'tex' + q;
    if (b[key]) return b[key];
    const c = b[key] = document.createElement('canvas'); c.width = TEX_W * q; c.height = TEX_H * q; const x = c.getContext('2d'); x.scale(q, q);
    const base = rgbOf(b.color), trim = b.trim || '#e8c66a', tr = rgbOf(trim);
    const shape = (o) => { x.beginPath(); x.moveTo(o, o); x.lineTo(TEX_W - o, o); x.lineTo(TEX_W - o, TEX_H * 0.84 - o); x.lineTo(TEX_W * 0.75, TEX_H - o * 2); x.lineTo(TEX_W * 0.5, TEX_H * 0.86 - o); x.lineTo(TEX_W * 0.25, TEX_H - o * 2); x.lineTo(o, TEX_H * 0.84 - o); x.closePath(); };
    shape(0); x.save(); x.clip();
    const gr = x.createLinearGradient(0, 0, TEX_W, 0); gr.addColorStop(0, rgba(mix(base, [0, 0, 0], 0.45), 1)); gr.addColorStop(0.45, rgba(base, 1)); gr.addColorStop(1, rgba(mix(base, [0, 0, 0], 0.5), 1));
    x.fillStyle = gr; x.fillRect(0, 0, TEX_W, TEX_H);
    const vg = x.createLinearGradient(0, 0, 0, TEX_H); vg.addColorStop(0, 'rgba(0,0,0,0.25)'); vg.addColorStop(0.3, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.35)'); x.fillStyle = vg; x.fillRect(0, 0, TEX_W, TEX_H);
    for (let y = 0; y < TEX_H; y += 3) { x.fillStyle = 'rgba(0,0,0,0.07)'; x.fillRect(0, y, TEX_W, 1); }
    for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(0,0,0,' + (0.04 + hr(i + b.color.length) * 0.08) + ')'; x.beginPath(); x.arc(hr(i * 3 + 1) * TEX_W, hr(i * 3 + 2) * TEX_H, 4 + hr(i * 3) * 14, 0, 7); x.fill(); }
    x.fillStyle = trim; x.fillRect(0, 26, TEX_W, 9); x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(0, 35, TEX_W, 2);
    x.fillStyle = trim; x.fillRect(0, TEX_H * 0.66, TEX_W, 5);
    x.restore();
    x.lineWidth = 7; x.strokeStyle = trim; shape(3.5); x.stroke(); x.lineWidth = 1.5; x.strokeStyle = 'rgba(0,0,0,0.5)'; shape(8); x.stroke();
    if (BB.UI && BB.UI.sigilPath) {
      x.save(); x.shadowColor = 'rgba(0,0,0,0.6)'; x.shadowBlur = 6; x.shadowOffsetY = 3;
      x.fillStyle = trim; BB.UI.sigilPath(x, b.sigil, TEX_W / 2, TEX_H * 0.4, TEX_W * 0.3); x.fill('evenodd'); x.restore();
      x.save(); x.globalCompositeOperation = 'source-atop'; const hl = x.createLinearGradient(0, TEX_H * 0.3, 0, TEX_H * 0.5); hl.addColorStop(0, 'rgba(255,255,255,0.35)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
      x.restore();
    }
    // fringe
    x.strokeStyle = rgba(tr, 0.9); x.lineWidth = 1.5;
    for (let i = 0; i <= 24; i++) { const u = i / 24, px = u * TEX_W, py = u < 0.25 ? lerp(TEX_H * 0.84, TEX_H - 6, u / 0.25) : u < 0.5 ? lerp(TEX_H - 6, TEX_H * 0.86, (u - 0.25) / 0.25) : u < 0.75 ? lerp(TEX_H * 0.86, TEX_H - 6, (u - 0.5) / 0.25) : lerp(TEX_H - 6, TEX_H * 0.84, (u - 0.75) / 0.25); x.beginPath(); x.moveTo(px, py - 2); x.lineTo(px, py + 7); x.stroke(); }
    return c;
  }
  // the cloth in the wind: strips that sway (pinned at the bar), folds that roll across, backlight, burning
  function warpCloth(b, t, o) {
    const q = o.q || 1, tex = clothTex(b, q), ck = 'wcv' + q, out = b[ck] || (b[ck] = document.createElement('canvas'));
    const OW = TEX_W + PAD * 2, OH = TEX_H + 30;
    if (out.width !== OW * q) { out.width = OW * q; out.height = OH * q; }
    const x = out.getContext('2d'); x.setTransform(q, 0, 0, q, 0, 0); x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, OW, OH);
    const n = q > 1 ? 110 : 44, sh = TEX_H / n, seed = b.seed || 0, wind = o.wind || 0, offs = [];
    for (let i = 0; i < n; i++) {
      const v = (i + 0.5) / n;
      const off = wind * Math.pow(v, 1.3) * 46 + Math.sin(t * 2.1 + v * 4.5 + seed) * v * 12 * (o.gust || 1) + Math.sin(t * 5.3 + v * 10 + seed) * v * 3;
      offs.push(off); x.drawImage(tex, 0, i * sh * q, TEX_W * q, (sh + 1) * q, PAD + off, i * sh + Math.sin(t * 3 + v * 6 + seed) * v * 2, TEX_W, sh + 1);
    }
    x.globalCompositeOperation = 'source-atop';
    const fold = x.createLinearGradient(0, 0, TEX_W, 0);
    for (let j = 0; j <= 8; j++) { const c = Math.cos(j * 1.25 - t * 3.2 + seed); fold.addColorStop(j / 8, c < 0 ? 'rgba(0,0,0,' + (-c * 0.42) + ')' : 'rgba(255,236,200,' + (c * 0.16) + ')'); }
    for (let i = 0; i < n; i++) { x.save(); x.translate(PAD + offs[i], 0); x.fillStyle = fold; x.fillRect(0, i * sh, TEX_W, sh + 2); x.restore(); }
    if (o.back) { x.fillStyle = o.back; x.fillRect(0, 0, OW, OH); }
    if (o.torn) { // scorched from below, holed, a ragged hem
      const sc = x.createLinearGradient(0, TEX_H * 0.3, 0, TEX_H); sc.addColorStop(0, 'rgba(20,10,6,0)'); sc.addColorStop(1, 'rgba(20,10,6,' + 0.75 * Math.min(1, o.torn) + ')'); x.fillStyle = sc; x.fillRect(0, 0, OW, OH);
      const jag = (cx, cy, r, sd) => { x.beginPath(); for (let j = 0; j < 9; j++) { const a = j / 9 * Math.PI * 2, rr = r * (0.55 + hr(sd + j) * 0.7); x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); };
      for (let h = 0; h < Math.round(o.torn * 6); h++) {
        const hu = hr(seed * 13 + h), hv = hu < 0.3 ? 0.1 + hu * 0.5 : 0.56 + (hu - 0.3) * 0.45, row = Math.min(n - 1, Math.floor(hv * n)), cx = PAD + (0.12 + hr(seed * 13 + h + 40) * 0.76) * TEX_W + offs[row], cy = hv * TEX_H, r = 3 + hr(seed * 13 + h + 80) * 7;
        x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(14,6,3,0.75)'; jag(cx, cy, r * 1.35, h * 11); x.fill();
        x.globalCompositeOperation = 'destination-out'; jag(cx, cy, r, h * 11 + 3); x.fill();
      }
      if (o.torn > 0.5) { x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.moveTo(0, OH); for (let px = 0; px <= OW; px += 7) x.lineTo(px, TEX_H * (0.8 + hr(px + seed) * 0.12)); x.lineTo(OW, OH); x.closePath(); x.fill(); }
      x.globalCompositeOperation = 'source-atop';
    }
    if (o.burn > 0) {
      const edge = (px) => TEX_H * (1.05 - o.burn * 1.05) + Math.sin(px * 0.11 + seed) * 9 + Math.sin(px * 0.037 + seed * 3) * 16 + Math.sin(px * 0.3 + t * 6) * 2;
      x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.moveTo(0, OH);
      for (let px = 0; px <= OW; px += q > 1 ? 2 : 6) x.lineTo(px, edge(px)); x.lineTo(OW, OH); x.closePath(); x.fill();
      x.globalCompositeOperation = 'source-atop';
      const stp = q > 1 ? 2 : 6; for (let px = 0; px <= OW; px += stp) { const ey = edge(px), gr = x.createLinearGradient(0, ey - 26, 0, ey); gr.addColorStop(0, 'rgba(20,8,4,0)'); gr.addColorStop(0.6, 'rgba(25,8,4,0.85)'); gr.addColorStop(1, 'rgba(255,120,30,1)'); x.fillStyle = gr; x.fillRect(px, ey - 26, stp + 0.5, 27); }
    }
    if (o.haze) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = o.haze; x.fillRect(0, 0, OW, OH); }
    if (o.burn > 0 && o.fire) {
      x.globalCompositeOperation = 'lighter';
      for (let px = 4; px <= OW; px += q > 1 ? 5 : 9) {
        const ey = TEX_H * (1.05 - o.burn * 1.05) + Math.sin(px * 0.11 + seed) * 9 + Math.sin(px * 0.037 + seed * 3) * 16;
        if (ey > TEX_H + 10 || ey < -20) continue;
        const fl = 0.6 + 0.4 * Math.sin(t * 17 + px), h = 22 + 26 * fl * hr(px + Math.floor(t * 8));
        const gr = x.createRadialGradient(px, ey - h * 0.35, 0, px, ey - h * 0.35, h * 0.7); gr.addColorStop(0, 'rgba(255,230,140,' + 0.7 * fl + ')'); gr.addColorStop(0.4, 'rgba(255,120,30,' + 0.45 * fl + ')'); gr.addColorStop(1, 'rgba(160,30,10,0)');
        x.fillStyle = gr; x.fillRect(px - h, ey - h * 1.1, h * 2, h * 1.6);
      }
    }
    x.setTransform(1, 0, 0, 1, 0, 0);
    return out;
  }
  // one banner on its pole, drawn in world units at a base point; returns the pole tip in screen space
  function drawWarBanner(g, b, bx, by, s, ang, t, o) {
    const P = 4.6, cw = 1.25, m = cw / TEX_W;
    g.save(); g.translate(bx, by); g.rotate(ang); g.scale(s, s);
    const wood = o.wood || '#2a1c12';
    g.fillStyle = wood; g.fillRect(-0.055, -P, 0.11, P);
    if (o.rim) { g.fillStyle = o.rim; g.fillRect(-0.055, -P, 0.03, P); }
    // crossbar, knobs, cords
    g.fillStyle = wood; g.fillRect(-cw * 0.62, -P + 0.22, cw * 1.24, 0.08);
    g.fillStyle = b.trim || '#e8c66a'; for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * cw * 0.62, -P + 0.26, 0.07, 0, 7); g.fill(); }
    if (!o.noCloth) {
      const cv = warpCloth(b, t, o);
      g.imageSmoothingEnabled = true; g.drawImage(cv, -cw / 2 - PAD * m, -P + 0.27, cv.width * m, cv.height * m); g.imageSmoothingEnabled = false;
    }
    g.strokeStyle = b.trim || '#e8c66a'; g.lineWidth = 0.025;
    for (const sx of [-1, 1]) { const sw = Math.sin(t * 2.4 + sx + (b.seed || 0)) * 0.08 + (o.wind || 0) * 0.15; g.beginPath(); g.moveTo(sx * cw * 0.62, -P + 0.3); g.quadraticCurveTo(sx * cw * 0.64 + sw * 0.5, -P + 0.8, sx * cw * 0.62 + sw, -P + 1.2); g.stroke(); g.fillStyle = b.trim || '#e8c66a'; g.beginPath(); g.ellipse(sx * cw * 0.62 + sw, -P + 1.28, 0.05, 0.1, 0, 0, 7); g.fill(); }
    // the spearhead finial, with a glint
    g.fillStyle = '#d8b25a'; g.beginPath(); g.moveTo(0, -P - 0.55); g.lineTo(0.11, -P - 0.12); g.lineTo(0, -P); g.lineTo(-0.11, -P - 0.12); g.closePath(); g.fill();
    g.restore();
    const tip = { x: bx + Math.sin(ang) * (P + 0.3) * s, y: by - Math.cos(ang) * (P + 0.3) * s };
    if (o.glint) { const a = Math.max(0, Math.sin(t * 1.3 + (b.seed || 0) * 2)) ** 12; if (a > 0.02) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; g.fillStyle = '#fff6d8'; const r = s * 0.6; g.beginPath(); g.moveTo(tip.x - r, tip.y); g.lineTo(tip.x, tip.y - r * 0.08); g.lineTo(tip.x + r, tip.y); g.lineTo(tip.x, tip.y + r * 0.08); g.closePath(); g.fill(); g.beginPath(); g.moveTo(tip.x, tip.y - r * 0.7); g.lineTo(tip.x + r * 0.06, tip.y); g.lineTo(tip.x, tip.y + r * 0.7); g.lineTo(tip.x - r * 0.06, tip.y); g.closePath(); g.fill(); g.restore(); } }
    return tip;
  }
  // a fallen banner trampled into the mud: the pole along the ground, the cloth lying flat, torn and burnt
  function drawWreck(g, b, x, y, s, side, t, o) {
    const P = 4.6, cw = 1.25, m = cw / TEX_W;
    const cv = warpCloth(b, t * 0.15 + (b.seed || 0), { wind: 0, gust: 0.2, burn: 0.35, torn: 1, haze: o.haze || 'rgba(26,18,14,0.5)' });
    g.save(); g.translate(x, y); g.scale(s, s * 0.32); g.rotate(-side * (Math.PI / 2 - 0.1));
    g.fillStyle = o.wood || '#1a120c'; g.fillRect(-0.06, -P * 0.7, 0.12, P * 0.7);
    g.save(); g.translate(0.15 * side, -P * 0.74); g.rotate(side * 0.5); g.fillRect(-0.06, -P * 0.3, 0.12, P * 0.3); g.restore(); // the snapped top
    g.imageSmoothingEnabled = true; g.drawImage(cv, -cw / 2 - PAD * m, -P * 0.66, cv.width * m, cv.height * m * 0.9); g.imageSmoothingEnabled = false;
    g.restore();
  }
  // the field after a battle: spears stuck in the earth, dropped shields, swords
  function drawDebris(g, P, H, near, col, rim) {
    for (let i = 0; i < 46; i++) {
      const x = -7 + hr(i + 1500) * 14, z = 3.4 + hr(i + 1501) * 15; if ((z < 6) !== near) continue;
      if (Math.abs(x - 0.35) < 0.7 && Math.abs(z - 6.2) < 1.2) continue;
      const p = P(x, z), s = p.s, type = Math.floor(hr(i + 1502) * 4), tilt = (hr(i + 1503) - 0.5) * 0.9;
      g.save(); g.translate(p.x, p.y); g.fillStyle = col; g.strokeStyle = col; g.lineCap = 'round';
      if (type === 0 || type === 3) { const L = type ? 0.8 : 1.9; g.rotate(tilt); g.lineWidth = s * 0.05; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -L * s); g.stroke(); if (!type) { g.beginPath(); g.moveTo(0, -L * s - s * 0.22); g.lineTo(s * 0.06, -L * s); g.lineTo(-s * 0.06, -L * s); g.closePath(); g.fill(); } else { g.beginPath(); g.moveTo(-s * 0.05, -L * s); g.lineTo(s * 0.03, -L * s - s * 0.1); g.lineTo(s * 0.06, -L * s + s * 0.02); g.fill(); } }
      else if (type === 1) { g.rotate(tilt * 0.9 + (tilt > 0 ? 0.5 : -0.5)); const w = s * 0.17, h = s * 0.36; g.beginPath(); g.moveTo(-w, -h); g.lineTo(w, -h); g.lineTo(w, -h * 0.45); g.quadraticCurveTo(w * 0.9, -h * 0.05, 0, 0); g.quadraticCurveTo(-w * 0.9, -h * 0.05, -w, -h * 0.45); g.closePath(); g.fill(); if (rim) { g.strokeStyle = rim; g.lineWidth = Math.max(1, s * 0.015); g.beginPath(); g.moveTo(-w, -h); g.lineTo(w, -h); g.lineTo(w, -h * 0.45); g.stroke(); } }
      else { g.rotate(tilt * 0.6); g.lineWidth = s * 0.035; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -s * 0.9); g.moveTo(-s * 0.16, -s * 0.68); g.lineTo(s * 0.16, -s * 0.68); g.stroke(); }
      g.restore();
    }
  }
  // a figure as a backlit cut-out standing in the field (fixed sprite scale, drawn into world units)
  function figure(g, a, x, y, s, col, rim, flip, clip) {
    if (!a) return;
    const SC = 2, cl = clip || 'Idle', fr = Math.floor(C.t * 7) % clipLen(a, cl), m = 3.1 / (128 * SC) * s;
    const sv = silhouette(a, cl, 2, fr, SC, col);
    g.save(); g.translate(x, y); if (flip) g.scale(-1, 1);
    if (rim) { const rv = silhouette(a, cl, 2, fr, SC, rim); for (const [dx, dy] of [[-1.5, 0], [1.5, 0], [0, -1.5]]) g.drawImage(rv, -64 * SC * m + dx, -90 * SC * m + dy, 128 * SC * m, 128 * SC * m); }
    g.drawImage(sv, -64 * SC * m, -90 * SC * m, 128 * SC * m, 128 * SC * m);
    g.restore();
  }
  // nine (or one) war banners on a ridge at the end of the day, a moving camera, an army beneath them;
  // on cue each catches fire, burns and topples; `fallen` leaves the wrecks smoking; `raise` hauls one upright
  function drawBanners(g, W, H, sh, k, t) {
    const top = rgbOf(sh.top || '#2a1b3d'), bot = rgbOf(sh.bot || '#d0683a'), sunC = rgbOf(sh.sunHex || '#ffcf8a');
    const solo = sh.only !== undefined, ek = ease(k);
    const camX = lerp(sh.cam ? sh.cam[0] : (solo ? -0.25 : -0.9), sh.cam ? sh.cam[1] : (solo ? 0.25 : 0.6), ek);
    const F = H * 0.9 * lerp(1, sh.push || 1.1, ek), hy = H * (sh.hy || 0.64) + (sh.crane ? (1 - ek) * H * sh.crane : 0), camH = 1.25;
    const sunX = W * (sh.sunX || 0.62) - camX * W * 0.02, sunY = sh.rise ? lerp(hy + H * 0.08, hy - H * 0.16, easeOut(k)) : hy - H * (sh.sunUp || 0.02);
    // sky
    const bg = g.createLinearGradient(0, 0, 0, hy); bg.addColorStop(0, rgba(top, 1)); bg.addColorStop(1, rgba(bot, 1)); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    if (sh.sun !== false) {
      const gl = g.createRadialGradient(sunX, sunY, 0, sunX, sunY, H * 0.9); gl.addColorStop(0, rgba(sunC, 0.85)); gl.addColorStop(0.12, rgba(sunC, 0.45)); gl.addColorStop(1, rgba(sunC, 0)); g.fillStyle = gl; g.fillRect(0, 0, W, H);
      g.fillStyle = rgba(mix(sunC, [255, 255, 255], 0.6), 0.95); g.beginPath(); g.arc(sunX, sunY, H * 0.05, 0, 7); g.fill();
    }
    clouds(g, W, H, t, 9, H * 0.12, hy - H * 0.2, mix(top, [0, 0, 0], 0.25), mix(bot, sunC, 0.5), W * 0.012, 3);
    clouds(g, W, H, t, 6, hy - H * 0.22, hy - H * 0.06, mix(bot, top, 0.5), mix(bot, sunC, 0.7), W * 0.02, 11);
    if (sh.storm) { // a storm gathering over it all
      clouds(g, W, H, t, Math.round(12 * sh.storm), -H * 0.08, H * 0.32, [5, 4, 8], mix([40, 26, 30], bot, 0.25), W * 0.035, 41);
      if (C.flash > 0.15) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(200,210,255,' + (C.flash * 0.25) + ')'; g.fillRect(0, 0, W, H * 0.4); g.restore(); }
    }
    if (sh.part) { // the clouds tear open over the sun
      const pk = clamp01((k - sh.part) / 0.3); g.save(); g.globalCompositeOperation = 'lighter';
      const br = g.createRadialGradient(sunX, sunY, 0, sunX, sunY, H * (0.2 + pk * 0.9)); br.addColorStop(0, rgba(sunC, 0.7 * pk)); br.addColorStop(1, rgba(sunC, 0)); g.fillStyle = br; g.fillRect(0, 0, W, H);
      g.restore(); rays(g, sunX, sunY, W, H, rgba(sunC, (0.12 * pk).toFixed(3)), t * 0.4, 26);
    }
    if (sh.sun !== false) rays(g, sunX, sunY, W, H, sh.rayCol || rgba(sunC, 0.05), t * 0.5, 22);
    if (sh.fire) { // the far fields burn
      for (let i = 0; i < 14; i++) { const x = hr(i + 90) * W, fl = 0.6 + 0.4 * Math.sin(t * 7 + i * 3); const gr = g.createRadialGradient(x, hy, 0, x, hy, H * 0.12 * fl); gr.addColorStop(0, 'rgba(255,140,40,' + 0.5 * fl + ')'); gr.addColorStop(1, 'rgba(255,60,20,0)'); g.fillStyle = gr; g.fillRect(x - H * 0.2, hy - H * 0.2, H * 0.4, H * 0.3); }
    }
    if (sh.smoke) smoke(g, W, H, t, sh.smoke, 16);
    birds(g, W, H, t + 3, sh.fire ? 10 : 6, rgba(mix(top, [0, 0, 0], 0.7), 0.85), H * 0.16, hy - H * 0.25);
    // the land: far hills, the army's spears on the ridge, the field
    const haze = mix(bot, sunC, 0.25);
    ridge(g, W, H, hy - H * 0.035, H * 0.03, 2, rgba(mix(haze, [0, 0, 0], 0.35), 1), camX * 0.01);
    ridge(g, W, H, hy, H * 0.018, 5, rgba(mix(haze, [0, 0, 0], 0.6), 1), camX * 0.02);
    if (!solo && !sh.fire) { // the nine hosts: a forest of spears along the ridge
      g.strokeStyle = rgba(mix(haze, [0, 0, 0], 0.75), 0.9); g.lineWidth = Math.max(1, H * 0.0018); g.beginPath();
      for (let i = 0; i < 260; i++) { const x = ((hr(i + 200) * 1.2 - camX * 0.03) % 1.2 - 0.1) * W, y = hy + H * 0.004 - H * 0.012 * Math.sin(x / W * 5.3 + 5) * 0.5, h = H * (0.012 + hr(i + 201) * 0.016); g.moveTo(x, y); g.lineTo(x + Math.sin(t + i) * 0.6, y - h); }
      g.stroke();
    }
    const fg = g.createLinearGradient(0, hy, 0, H); fg.addColorStop(0, rgba(mix(haze, [0, 0, 0], 0.65), 1)); fg.addColorStop(1, rgba(mix(bot, [0, 0, 0], 0.92), 1)); g.fillStyle = fg; g.fillRect(0, hy + H * 0.004, W, H - hy);
    // ground mist along the horizon
    g.save(); g.globalCompositeOperation = 'lighter'; const mg = g.createLinearGradient(0, hy - H * 0.05, 0, hy + H * 0.08); mg.addColorStop(0, rgba(haze, 0)); mg.addColorStop(0.5, rgba(haze, 0.18)); mg.addColorStop(1, rgba(haze, 0)); g.fillStyle = mg; g.fillRect(0, hy - H * 0.05, W, H * 0.13); g.restore();
    // the banners, far to near
    const P = (x, z) => ({ x: W / 2 + (x - camX) * F / z, y: hy + camH * F / z, s: F / z });
    const debCol = rgba(mix(bot, [0, 0, 0], 0.9), 1), debRim = sh.sun !== false ? rgba(sunC, 0.5) : null;
    if (sh.debris) drawDebris(g, P, H, false, debCol, debRim);
    let list;
    if (solo) {
      list = [{ i: sh.only, x: 0.35, z: sh.near || 6.2, stand: true }];
      if (sh.fallen) [[-2.4, 6.5], [2.9, 7.4], [-1, 9.5], [1.8, 11.5], [-3.8, 10.5], [4.4, 13], [-0.3, 15], [3.2, 17]].forEach(([x, z], j) => list.push({ i: j < 8 && j !== sh.only ? j : 8 - j, x, z, wreck: true, side: j % 2 ? 1 : -1 }));
    } else list = C.banners.map((b, i) => ({ i, x: -3.5 + i * 1.5, z: 4.4 + i * 1.6 }));
    list.sort((a, b) => b.z - a.z);
    const knights = sh.knights || [];
    for (const L of list) {
      const b = C.banners[L.i]; if (!b) continue; if (b.seed === undefined) b.seed = L.i * 1.7;
      const p = P(L.x, L.z), hz = clamp01((L.z - 4) / 20) * 0.75, hcol = rgba(haze, hz.toFixed(3));
      const ft = C.fall && C.fall[L.i] !== undefined ? C.t - C.fall[L.i] : -1;
      let ang = Math.sin(C.t * 1.1 + L.i) * 0.012, burn = 0, fire = false, wind = sh.wind === undefined ? 0.35 : sh.wind;
      const side = L.side || (L.i % 2 ? 1 : -1);
      if (L.wreck) { drawWreck(g, b, p.x, p.y, p.s, side, t, { haze: rgba(mix([26, 18, 14], haze, hz), 0.55), wood: rgba(mix([22, 15, 10], haze, hz), 1) }); if (sh.smoke) { const tp = { x: p.x + side * 1.6 * p.s, y: p.y }; for (let q = 0; q < 4; q++) { const qq = (t * 0.25 + q / 4 + L.i * 0.1) % 1, r = p.s * (0.3 + qq * 1.2); const gr = g.createRadialGradient(tp.x + qq * p.s, tp.y - qq * p.s * 3, 0, tp.x + qq * p.s, tp.y - qq * p.s * 3, r); gr.addColorStop(0, 'rgba(40,36,36,' + 0.35 * (1 - qq) + ')'); gr.addColorStop(1, 'rgba(40,36,36,0)'); g.fillStyle = gr; g.fillRect(tp.x - r * 2, tp.y - qq * p.s * 3 - r, r * 4, r * 2); } } continue; }
      if (ft >= 0) {
        burn = clamp01(ft / 1.9) * 0.9; fire = true;
        const tf = Math.max(0, ft - 0.35), D = 0.85; ang = side * (tf < D ? Math.pow(tf / D, 2) * 1.42 : 1.42 + Math.sin((tf - D) * 18) * 0.05 * Math.exp(-(tf - D) * 6));
        wind = -side * 1.4 * clamp01(tf / D);
        if (tf >= D && !b.hit) { b.hit = true; const tp = { x: p.x + Math.sin(ang) * 4.9 * p.s, y: p.y - Math.cos(ang) * 4.9 * p.s }; sparks(40, tp.x, tp.y, '#ffb35a', 500 * (W / 1280), 120); for (let q = 0; q < 26; q++) C.parts.push({ x: tp.x + (Math.random() - 0.5) * p.s * 2, y: Math.min(H * 0.88, tp.y), vx: (Math.random() - 0.5) * 120, vy: -30 - Math.random() * 70, t: 0, life: 1.4 + Math.random(), col: '#6a5040', r: 2 + Math.random() * 4, drift: true }); C.shake = Math.max(C.shake, 0.45 / Math.max(1, L.z / 6)); BB.sfx('slam'); }
      }
      if (sh.raise && L.stand) { const rk = clamp01(k / 0.5); ang = (1 - easeBack(rk)) * 1.15; wind = 0.6 + (1 - rk) * 0.8; }
      const knight = knights.length && !L.wreck ? knights[L.i % knights.length] : null;
      const silCol = rgba(mix([10, 7, 8], haze, hz), 1), rim = sh.sun !== false ? rgba(mix(sunC, [255, 255, 255], 0.3), (0.85 * (1 - hz)).toFixed(3)) : null;
      if (knight && !(ft > 0.6)) figure(g, knight, p.x + 0.55 * p.s, p.y, p.s * 1.45, silCol, rim, L.i % 2);
      drawWarBanner(g, b, p.x, p.y, p.s, ang, C.t, { wind, burn, fire, torn: L.stand && sh.torn ? sh.torn : 0, haze: hz > 0.01 ? hcol : null, wood: rgba(mix([30, 20, 14], haze, hz), 1), rim, glint: !L.wreck && !burn, back: sh.sun !== false ? rgba(sunC, 0.12) : null, gust: sh.gust });
      if ((L.wreck || ft > 1.4) && sh.smoke) { const tp = { x: p.x + Math.sin(ang) * 3 * p.s, y: p.y - Math.cos(ang) * 3 * p.s }; for (let q = 0; q < 4; q++) { const qq = (t * 0.25 + q / 4 + L.i * 0.1) % 1, r = p.s * (0.3 + qq * 1.2); const gr = g.createRadialGradient(tp.x + qq * p.s, tp.y - qq * p.s * 3, 0, tp.x + qq * p.s, tp.y - qq * p.s * 3, r); gr.addColorStop(0, 'rgba(40,36,36,' + 0.35 * (1 - qq) + ')'); gr.addColorStop(1, 'rgba(40,36,36,0)'); g.fillStyle = gr; g.fillRect(tp.x - r * 2, tp.y - qq * p.s * 3 - r, r * 4, r * 2); } }
      if (fire && burn < 0.9 && Math.random() < 0.5) { const tp = { x: p.x + Math.sin(ang) * 3.4 * p.s, y: p.y - Math.cos(ang) * 3.4 * p.s }; C.parts.push({ x: tp.x + (Math.random() - 0.5) * p.s, y: tp.y + (Math.random() - 0.5) * p.s * 2, vx: (Math.random() - 0.5) * 40, vy: -80 - Math.random() * 80, t: 0, life: 1 + Math.random(), col: Math.random() < 0.5 ? '#ffb347' : '#ff6a2a', r: 1 + Math.random() * 2, drift: true }); }
      if (sh.bearer && L.stand) figure(g, sh.bearer, p.x - 0.45 * p.s, p.y + 0.05 * p.s, p.s * 1.7, '#0b0705', rim, false, sh.raise && k < 0.5 ? 'Attack1' : 'Idle');
    }
    if (sh.debris) drawDebris(g, P, H, true, debCol, debRim);
    if (sh.fire) { g.save(); g.globalCompositeOperation = 'lighter'; const fl = g.createLinearGradient(0, H * 0.7, 0, H); fl.addColorStop(0, 'rgba(255,90,20,0)'); fl.addColorStop(1, 'rgba(255,110,30,0.4)'); g.fillStyle = fl; g.fillRect(0, H * 0.7, W, H * 0.3); g.restore(); }
    grass(g, W, H, t, 70, rgba(mix(bot, [0, 0, 0], 0.95), 1), camX * 0.25, 1);
    if (sh.ash) { g.fillStyle = 'rgba(210,205,200,0.7)'; for (let i = 0; i < 90; i++) { const x = ((hr(i + 300) * W + Math.sin(t * 0.8 + i) * 30 + t * 18) % W + W) % W, y = (hr(i + 301) * H + t * H * 0.05 * (0.5 + hr(i + 302))) % H, r = 0.6 + hr(i + 303) * 1.8; g.fillRect(x, y, r * (W / 1280) * 1.5, r * (W / 1280) * 1.5); } }
    // bloom and a lens flare off the sun
    if (sh.sun !== false) {
      g.save(); g.globalCompositeOperation = 'lighter';
      const bl = g.createRadialGradient(sunX, sunY, 0, sunX, sunY, H * 0.35); bl.addColorStop(0, rgba(sunC, 0.35 * (sh.flare || 1))); bl.addColorStop(1, rgba(sunC, 0)); g.fillStyle = bl; g.fillRect(0, 0, W, H);
      const vx = W / 2 - sunX, vy = H / 2 - sunY;
      [[0.5, 0.04, 0.05], [0.9, 0.02, 0.07], [1.3, 0.07, 0.03], [1.7, 0.03, 0.05]].forEach(([d, r, a]) => { g.fillStyle = rgba(mix(sunC, [180, 220, 255], d / 2), a * (sh.flare || 1)); g.beginPath(); g.arc(sunX + vx * d, sunY + vy * d, H * r, 0, 7); g.fill(); });
      g.fillStyle = rgba(sunC, 0.08 * (sh.flare || 1)); g.fillRect(0, sunY - H * 0.003, W, H * 0.006);
      g.restore();
    }
  }
  // an extreme close-up of one banner streaming across the frame from its pole: the cloth snapping in the wind,
  // fire eating through the sigil (`burn: [from, to]`), or unfurling in gold light (`unfurl`)
  function drawClothClose(g, W, H, sh, k, t) {
    const b = C.banners[sh.banner]; if (!b) return; if (b.seed === undefined) b.seed = sh.banner * 1.7;
    const top = rgbOf(sh.top || '#070508'), bot = rgbOf(sh.bot || '#4a140c'), glow = rgbOf(sh.glow || '#ff8a3a');
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const ph = H * 0.36, cy = H * 0.5, sl = W * 0.03;
    g.save(); panelPath(g, -40, cy - ph, W + 40, cy + ph, sl); g.clip();
    const bg = g.createLinearGradient(0, cy - ph, 0, cy + ph); bg.addColorStop(0, rgba(top, 1)); bg.addColorStop(1, rgba(bot, 1)); g.fillStyle = bg; g.fillRect(0, cy - ph, W, ph * 2);
    const gx = W * (sh.glowX || 0.7), gl = g.createRadialGradient(gx, cy + ph * 0.6, 0, gx, cy + ph * 0.6, W * 0.6); gl.addColorStop(0, rgba(glow, 0.55)); gl.addColorStop(1, rgba(glow, 0));
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gl; g.fillRect(0, cy - ph, W, ph * 2);
    if (sh.rays) rays(g, gx, cy + ph * 0.2, W, ph * 2, rgba(glow, 0.07), t, 20);
    // wind streaks rushing past
    g.strokeStyle = rgba(mix(glow, [255, 255, 255], 0.5), 0.12); g.lineWidth = Math.max(1, H * 0.002); g.beginPath();
    for (let i = 0; i < 40; i++) { const y = cy - ph + hr(i + 1600) * ph * 2, len = W * (0.08 + hr(i + 1601) * 0.2), x = ((hr(i + 1602) * (W + len) + t * W * (1.2 + hr(i + 1603))) % (W + len)) - len; g.moveTo(x, y); g.lineTo(x + len, y); }
    g.stroke(); g.restore();
    // the cloth: its pinned edge on the pole at the left, the tails streaming right
    const burn = sh.burn ? clamp01((k - sh.burn[0]) / (sh.burn[1] - sh.burn[0])) * 0.92 : 0, unf = sh.unfurl ? lerp(0.25, 1, easeBack(clamp01(k / 0.45))) : 1;
    const Q = 3, cv = warpCloth(b, t * 1.7, { q: Q, wind: sh.vertical ? 0.05 : 0.15, gust: sh.vertical ? 1.0 : 2.4, burn, fire: burn > 0, torn: sh.torn || 0, back: sh.back });
    const sc = (W * 1.02 / TEX_H) * lerp(1, 1.1, k), px = W * 0.07 - k * W * 0.05;
    if (sh.vertical) { // hanging from its crossbar and unrolling downward, the camera settling on the sigil
      const vs = W * 0.46 / TEX_W, drop = easeOut(clamp01(k / 0.55)), len = lerp(0.12, 1, drop), cx = W / 2;
      const yTop = lerp(cy - ph * 0.75, cy - TEX_H * 0.42 * vs, ease(clamp01(k / 0.8)));
      g.save(); g.imageSmoothingEnabled = true; g.translate(cx, yTop); g.scale(vs, vs * len);
      g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 30; g.drawImage(cv, -(PAD + TEX_W / 2), 0, cv.width / Q, cv.height / Q); g.shadowBlur = 0; g.restore();
      g.fillStyle = '#1a120c'; g.fillRect(cx - W * 0.29, yTop - H * 0.03, W * 0.58, H * 0.035); g.fillStyle = rgba(glow, 0.6); g.fillRect(cx - W * 0.29, yTop - H * 0.03, W * 0.58, H * 0.008);
      g.fillStyle = b.trim || '#e8c66a'; for (const sx of [-1, 1]) { g.beginPath(); g.arc(cx + sx * W * 0.29, yTop - H * 0.012, H * 0.025, 0, 7); g.fill(); }
      if (drop < 1 && Math.random() < 0.8) sparks(2, cx + (Math.random() - 0.5) * W * 0.46, yTop + TEX_H * vs * len, '#ffe7a3', 300 * (W / 1280), 60);
    } else {
      g.save(); g.imageSmoothingEnabled = true; g.translate(px, cy - ph * 0.02); g.rotate(-Math.PI / 2 + Math.sin(t * 1.4) * 0.03); g.scale(sc, sc * unf);
      g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 30; g.drawImage(cv, -(PAD + TEX_W / 2), 0, cv.width / Q, cv.height / Q); g.shadowBlur = 0;
      g.restore();
      g.fillStyle = '#1a120c'; g.fillRect(px - H * 0.022, cy - ph, H * 0.044, ph * 2);
      g.fillStyle = rgba(glow, 0.5); g.fillRect(px + H * 0.012, cy - ph, H * 0.01, ph * 2);
    }
    // embers off the burning edge / sparks off the gold
    if (burn > 0 && burn < 0.9) { const fx = px + TEX_H * (1.05 - burn * 1.05) * sc * unf; for (let i = 0; i < 3; i++) C.parts.push({ x: fx + (Math.random() - 0.5) * W * 0.03, y: cy + (Math.random() - 0.5) * TEX_W * sc, vx: 60 + Math.random() * 160, vy: -60 - Math.random() * 120, t: 0, life: 0.8 + Math.random(), col: Math.random() < 0.5 ? '#ffb347' : '#ff5a1a', r: 1 + Math.random() * 2.5, drift: true }); }
    if (sh.sparkle && Math.random() < 0.7) C.parts.push({ x: px + Math.random() * W * 0.9, y: cy + (Math.random() - 0.5) * ph * 1.6, vx: 40 + Math.random() * 80, vy: -20 - Math.random() * 50, t: 0, life: 1 + Math.random(), col: '#ffe7a3', r: 1 + Math.random() * 2, drift: true });
    g.restore();
    g.strokeStyle = sh.edge || '#ffbe55'; g.lineWidth = 3; panelPath(g, -40, cy - ph, W + 40, cy + ph, sl); g.stroke();
  }
  // an impact frame: a banner's pole snapping in two, flashing black and white, splinters flying
  function drawSnap(g, W, H, sh, k, t) {
    const inv = Math.floor(t / 0.05) % 2 === 1, fg = inv ? '#050505' : '#f4f1ea';
    g.fillStyle = inv ? '#f4f1ea' : '#050505'; g.fillRect(0, 0, W, H);
    speedLines(g, W * 0.5, H * 0.45, W, H, 90, inv ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.9)', Math.floor(t * 20), 0.05);
    const b = C.banners[sh.banner]; if (!b) return; if (b.seed === undefined) b.seed = sh.banner * 1.7;
    const cv = warpCloth(b, t * 3, { wind: -0.8 * (sh.side || 1), gust: 2.5, burn: 0.25 });
    const sil = C.snapCv || (C.snapCv = document.createElement('canvas'));
    if (sil.width !== cv.width) { sil.width = cv.width; sil.height = cv.height; }
    const x = sil.getContext('2d'); x.globalCompositeOperation = 'copy'; x.drawImage(cv, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = fg; x.fillRect(0, 0, sil.width, sil.height);
    const side = sh.side || 1, bx = W * (sh.x || 0.5), brk = H * 0.64, pw = H * 0.02, e = easeOut(k);
    g.fillStyle = fg;
    g.save(); g.translate(bx, H * 1.1); g.rotate(-side * 0.05); g.fillRect(-pw / 2, brk - H * 1.1, pw, H * 1.1 - brk + H * 0.1); g.restore(); // the stump
    g.save(); g.translate(bx, brk - e * H * 0.06); g.rotate(side * (0.12 + e * 0.6));
    const L = H * 0.44; g.fillRect(-pw / 2, -L, pw, L);
    g.fillRect(-H * 0.11, -L + H * 0.03, H * 0.22, pw * 0.8); // crossbar
    g.beginPath(); g.moveTo(0, -L - H * 0.06); g.lineTo(pw, -L); g.lineTo(-pw, -L); g.closePath(); g.fill(); // spearhead
    const m = (H * 0.19) / TEX_W; g.imageSmoothingEnabled = false; g.drawImage(sil, -H * 0.095 - PAD * m, -L + H * 0.035, sil.width * m, sil.height * m);
    g.restore();
    // splinters
    for (let i = 0; i < 16; i++) { const a = hr(i + 1700) * Math.PI * 2, d = e * H * (0.12 + hr(i + 1701) * 0.35), sx = bx + Math.cos(a) * d, sy = brk + Math.sin(a) * d * 0.8, sz = H * (0.008 + hr(i + 1702) * 0.02); g.save(); g.translate(sx, sy); g.rotate(a + t * 8); g.beginPath(); g.moveTo(-sz, 0); g.lineTo(sz * 2.5, -sz * 0.3); g.lineTo(sz * 2.5, sz * 0.3); g.closePath(); g.fill(); g.restore(); }
    if (sh.accent) { g.fillStyle = sh.accent; g.globalAlpha = 0.85; g.fillRect(0, brk - H * 0.01, W, H * 0.02); g.globalAlpha = 1; }
  }
  // the Gravegate: an ancient stone arch in a graveyard under a storm. Its runes wake one by one, a seam of light
  // splits the arch, then it tears open: a shockwave, a vortex, the dead taking shape inside, the camera falling in
  function deadTree(g, x, y, len, ang, depth, w, seed) {
    if (depth <= 0 || len < 2) return;
    const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
    g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
    deadTree(g, x2, y2, len * 0.72, ang - 0.35 - hr(seed) * 0.4, depth - 1, w * 0.68, seed * 1.3 + 1);
    deadTree(g, x2, y2, len * 0.66, ang + 0.3 + hr(seed + 2) * 0.45, depth - 1, w * 0.68, seed * 1.7 + 2);
  }
  function drawGate(g, W, H, sh, k, t) {
    const col = sh.col || [170, 90, 255], hot = mix(col, [255, 255, 255], 0.55);
    const kb = sh.burstAt ? sh.burstAt / sh.dur : 0.39, I = k < kb ? 0 : clamp01((k - kb) / 0.08), pulse = 0.85 + 0.15 * Math.sin(t * 9);
    const seam = clamp01((k - (kb - 0.17)) / 0.17);
    // the camera: a slow push, then a fall into the gate
    const cx = W / 2, base = H * 0.86, ro = H * 0.3, ri = H * 0.198, ys = H * 0.47, vcx = cx, vcy = (ys - ri + base) / 2;
    const rush = k > 0.86 ? Math.pow((k - 0.86) / 0.14, 3) * 3.5 : 0, zoom = 1 + 0.12 * ease(k) + rush;
    const shakeT = k < kb ? seam * 3 : 0;
    g.save(); g.translate(vcx + (Math.random() - 0.5) * shakeT, vcy + (Math.random() - 0.5) * shakeT); g.scale(zoom, zoom); g.translate(-vcx, -vcy);
    // storm sky lit from below by the gate
    const hy = H * 0.68;
    const bg = g.createLinearGradient(0, 0, 0, hy); bg.addColorStop(0, '#04040a'); bg.addColorStop(1, rgba(mix([14, 12, 26], col, 0.15 + I * 0.25), 1)); g.fillStyle = bg; g.fillRect(-W, -H, W * 3, H * 3);
    clouds(g, W, H, t, 12, H * 0.02, hy - H * 0.22, [8, 8, 16], mix([30, 26, 46], col, 0.2 + I * 0.35), W * 0.03, 21);
    if (I > 0) { const gl = g.createRadialGradient(vcx, vcy, 0, vcx, vcy, H * 1.1); gl.addColorStop(0, rgba(col, 0.38 * I)); gl.addColorStop(0.5, rgba(col, 0.08 * I)); gl.addColorStop(1, rgba(col, 0)); g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gl; g.fillRect(-W, -H, W * 3, H * 3); g.restore(); }
    // horizon: dead trees, the far graves
    g.fillStyle = '#07060c'; ridge(g, W, H, hy, H * 0.025, 9, '#08070e', 0);
    g.strokeStyle = '#07060c'; g.lineCap = 'round';
    deadTree(g, W * 0.1, hy + H * 0.01, H * 0.12, -Math.PI / 2 - 0.1, 6, H * 0.016, 3);
    deadTree(g, W * 0.88, hy + H * 0.005, H * 0.15, -Math.PI / 2 + 0.12, 6, H * 0.02, 7);
    deadTree(g, W * 0.24, hy, H * 0.06, -Math.PI / 2, 5, H * 0.008, 11);
    const ground = g.createLinearGradient(0, hy, 0, H); ground.addColorStop(0, '#0b0a12'); ground.addColorStop(1, '#030305'); g.fillStyle = ground; g.fillRect(-W, hy, W * 3, H * 2);
    // light pooled on the ground, and the cracks running out from the arch
    if (seam > 0 || I > 0) {
      g.save(); g.globalCompositeOperation = 'lighter';
      const pool = g.createRadialGradient(cx, base, 0, cx, base, H * 0.7); pool.addColorStop(0, rgba(col, 0.55 * Math.max(I * pulse, seam * 0.3))); pool.addColorStop(1, rgba(col, 0));
      g.save(); g.translate(cx, base); g.scale(1, 0.22); g.translate(-cx, -base); g.fillStyle = pool; g.fillRect(cx - H, base - H, H * 2, H * 2); g.restore();
      g.strokeStyle = rgba(hot, 0.9 * Math.max(seam, I)); g.shadowColor = rgba(col, 1); g.shadowBlur = 12; g.lineWidth = Math.max(1.5, H * 0.003);
      for (let c = 0; c < 9; c++) { const a = Math.PI * (0.05 + c / 8 * 0.9), reach = clamp01(seam * 1.2 + I) * H * (0.25 + hr(c + 500) * 0.35); let px = cx + (hr(c + 501) - 0.5) * ri * 1.6, py = base; g.beginPath(); g.moveTo(px, py); for (let s = 1; s <= 8; s++) { const d = reach / 8; px += Math.cos(a) * d * 1.9 * (Math.cos(a) > 0 ? 1 : 1) + (hr(c * 9 + s) - 0.5) * d * 0.8; py += Math.sin(a) * d * 0.45 + (hr(c * 9 + s + 50) - 0.2) * d * 0.25; g.lineTo(px, py); } g.stroke(); }
      g.restore();
    }
    // gravestones: back ones before the arch, near ones after; they lean away from the blast
    const stones = []; for (let i = 0; i < 16; i++) { const y = lerp(hy + H * 0.02, H * 1.0, hr(i + 600) ** 0.8), xs = hr(i + 601); const x = xs < 0.5 ? lerp(-W * 0.05, cx - ro * 1.25, xs * 2) : lerp(cx + ro * 1.25, W * 1.05, (xs - 0.5) * 2); stones.push({ x, y, s: (y - hy) / (H - hy), type: Math.floor(hr(i + 602) * 3), tilt: (hr(i + 603) - 0.5) * 0.3, i }); }
    stones.sort((a, b) => a.y - b.y);
    const drawStone = (st) => {
      const sz = H * (0.04 + st.s * 0.16), dir = st.x < cx ? -1 : 1, blow = I * dir * 0.18 * st.s * (1 - clamp01((k - kb) * 4) * 0.3);
      g.save(); g.translate(st.x, st.y); g.rotate(st.tilt + blow);
      g.beginPath();
      if (st.type === 0) { g.moveTo(-sz * 0.3, 0); g.lineTo(-sz * 0.3, -sz * 0.7); g.arc(0, -sz * 0.7, sz * 0.3, Math.PI, 0); g.lineTo(sz * 0.3, 0); }
      else if (st.type === 1) { const w = sz * 0.09; g.rect(-w, -sz, w * 2, sz); g.rect(-sz * 0.32, -sz * 0.78, sz * 0.64, w * 2); }
      else { g.moveTo(-sz * 0.2, 0); g.lineTo(-sz * 0.14, -sz * 0.9); g.lineTo(0, -sz * 1.05); g.lineTo(sz * 0.14, -sz * 0.9); g.lineTo(sz * 0.2, 0); }
      g.closePath(); g.fillStyle = '#0a0a10'; g.fill();
      const lit = Math.max(I * pulse, seam * 0.3, C.flash > 0.2 ? 0.5 : 0);
      if (lit > 0) { g.strokeStyle = rgba(mix(col, [255, 255, 255], 0.3), (lit * (0.4 + st.s * 0.5)).toFixed(3)); g.lineWidth = Math.max(1, sz * 0.04); g.stroke(); }
      g.restore();
    };
    for (const st of stones) if (st.y < base) drawStone(st);
    // what's inside the arch: the night behind it, then the seam, then the vortex
    const opening = () => { g.beginPath(); g.moveTo(cx - ri, base); g.lineTo(cx - ri, ys); g.arc(cx, ys, ri, Math.PI, Math.PI * 2); g.lineTo(cx + ri, base); g.closePath(); };
    g.save(); opening(); g.clip();
    if (I > 0) {
      const R = Math.max(ri, (base - ys + ri) / 2) * 1.4, vs = easeOut(I);
      g.fillStyle = rgba(mix([6, 2, 12], col, 0.15), 1); g.fillRect(cx - ri, ys - ri, ri * 2, base - ys + ri);
      g.save(); g.globalCompositeOperation = 'lighter'; g.translate(vcx, vcy); g.scale(vs, vs * 1.35);
      // rings rushing inward: a tunnel
      for (let n = 0; n < 9; n++) { const q = 1 - ((t * 0.55 + n / 9) % 1), r = R * q * q; g.strokeStyle = rgba(col, (0.5 * q).toFixed(3)); g.lineWidth = Math.max(1, R * 0.03 * q); g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke(); }
      // spiral arms
      for (let arm = 0; arm < 10; arm++) {
        const sp = 1.6 + (arm % 3) * 0.7, tw = 4.4 + (arm % 2) * 1.6;
        for (const [lw, a] of [[0.05, 0.12], [0.018, 0.5], [0.006, 0.9]]) {
          g.strokeStyle = rgba(arm % 3 ? col : hot, a); g.lineWidth = Math.max(1, R * lw); g.beginPath();
          for (let s = 2; s <= 34; s++) { const q = s / 34, r = R * (1 - q) ** 1.2, an = arm / 10 * Math.PI * 2 + q * tw + t * sp; if (s === 2) g.moveTo(Math.cos(an) * r, Math.sin(an) * r); else g.lineTo(Math.cos(an) * r, Math.sin(an) * r); }
          g.stroke();
        }
      }
      for (let i = 0; i < 70; i++) { const q = (t * (0.25 + hr(i + 950) * 0.3) + hr(i + 951)) % 1, r = R * (1 - q), an = hr(i + 952) * 7 + q * 6 + t; g.fillStyle = rgba(hot, (0.9 * q).toFixed(3)); const ps = Math.max(1, R * 0.012 * (1 - q * 0.5)); g.fillRect(Math.cos(an) * r - ps / 2, Math.sin(an) * r - ps / 2, ps, ps); }
      const core = g.createRadialGradient(0, 0, 0, 0, 0, R * 0.55); core.addColorStop(0, 'rgba(255,255,255,' + 0.95 * pulse + ')'); core.addColorStop(0.25, rgba(hot, 0.7)); core.addColorStop(1, rgba(col, 0)); g.fillStyle = core; g.beginPath(); g.arc(0, 0, R * 0.55, 0, 7); g.fill();
      g.restore();
      // the dead taking shape in the light
      const who = sh.figures || [];
      who.forEach((a, j) => {
        const st = kb + 0.12 + j * 0.1, q = clamp01((k - st) / 0.35); if (q <= 0) return;
        const s = H * lerp(0.04, 0.3, easeOut(q)), off = (j - (who.length - 1) / 2) * ri * 0.7 * q;
        figure(g, a, vcx + off, vcy + H * 0.1 + H * 0.1 * q, s / 1.45, rgba([4, 2, 8], (0.5 + 0.5 * q).toFixed(3)), rgba(hot, (0.9 * q).toFixed(3)), j % 2, 'Run');
      });
    } else if (seam > 0) {
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(cx - ri, ys - ri, ri * 2, base - ys + ri);
      g.save(); g.globalCompositeOperation = 'lighter';
      const sw = ri * (0.02 + seam * seam * 0.12), sg = g.createLinearGradient(cx - sw * 4, 0, cx + sw * 4, 0); sg.addColorStop(0, rgba(col, 0)); sg.addColorStop(0.5, rgba(hot, 0.4 + seam * 0.6)); sg.addColorStop(1, rgba(col, 0));
      g.fillStyle = sg; g.fillRect(cx - sw * 4, ys - ri, sw * 8, base - ys + ri);
      g.fillStyle = 'rgba(255,255,255,' + seam + ')'; g.fillRect(cx - sw * 0.25, ys - ri * seam, sw * 0.5, (base - ys + ri) * seam);
      g.restore();
    }
    g.restore();
    // the arch: voussoirs, a keystone, block pillars; runes waking in turn; light from inside on the stone
    const stoneTop = '#2a2a36', stoneBot = '#121218';
    const nv = 13;
    for (let v = 0; v < nv; v++) {
      const a0 = Math.PI + v / nv * Math.PI, a1 = Math.PI + (v + 1) / nv * Math.PI, key = v === (nv - 1) / 2, rOut = key ? ro * 1.07 : ro;
      g.beginPath(); g.arc(cx, ys, rOut, a0 + 0.004, a1 - 0.004); g.arc(cx, ys, ri, a1 - 0.004, a0 + 0.004, true); g.closePath();
      const gr = g.createLinearGradient(0, ys - ro, 0, ys); gr.addColorStop(0, stoneTop); gr.addColorStop(1, stoneBot); g.fillStyle = gr; g.fill();
      g.strokeStyle = '#050508'; g.lineWidth = Math.max(1, H * 0.003); g.stroke();
      const on = clamp01((k - 0.04 - v * 0.022) / 0.05), am = (a0 + a1) / 2, rr = (ri + rOut) / 2, rx = cx + Math.cos(am) * rr, ry = ys + Math.sin(am) * rr;
      if (on > 0) {
        g.save(); g.translate(rx, ry); g.rotate(am + Math.PI / 2); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(hot, (on * (0.6 + 0.4 * Math.sin(t * 6 + v))).toFixed(3)); g.shadowColor = rgba(col, 1); g.shadowBlur = 14; g.lineWidth = Math.max(1.5, H * 0.004);
        const rs = (ro - ri) * 0.22; g.beginPath(); const gl = Math.floor(hr(v + 700) * 4);
        if (gl === 0) { g.moveTo(0, -rs); g.lineTo(0, rs); g.moveTo(-rs * 0.6, -rs * 0.3); g.lineTo(rs * 0.6, rs * 0.3); }
        else if (gl === 1) { g.moveTo(-rs * 0.6, rs); g.lineTo(0, -rs); g.lineTo(rs * 0.6, rs); g.moveTo(-rs * 0.3, rs * 0.2); g.lineTo(rs * 0.3, rs * 0.2); }
        else if (gl === 2) { g.arc(0, 0, rs * 0.6, 0, 7); g.moveTo(0, -rs); g.lineTo(0, rs); }
        else { g.moveTo(-rs * 0.6, -rs); g.lineTo(rs * 0.6, 0); g.lineTo(-rs * 0.6, rs); }
        g.stroke(); g.restore();
      }
    }
    for (const sx of [-1, 1]) { // pillars
      const x0 = sx < 0 ? cx - ro : cx + ri, pw = ro - ri, rows = 6, rh = (base - ys) / rows;
      for (let r = 0; r < rows; r++) { const y0 = ys + r * rh, inset = (r % 2) * pw * 0.04; const gr = g.createLinearGradient(x0, 0, x0 + pw, 0); gr.addColorStop(0, sx < 0 ? '#16161e' : '#24242e'); gr.addColorStop(1, sx < 0 ? '#24242e' : '#16161e'); g.fillStyle = gr; g.fillRect(x0 + inset, y0, pw - inset * 2, rh - H * 0.003); }
      g.fillStyle = '#0e0e14'; g.fillRect(x0 - pw * 0.12, base - H * 0.025, pw * 1.24, H * 0.03); g.fillRect(x0 - pw * 0.06, ys - H * 0.012, pw * 1.12, H * 0.02);
      const on = clamp01((k - 0.04 - (sx < 0 ? 0 : 0.3)) / 0.1);
      if (on > 0) { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(hot, (on * 0.7).toFixed(3)); g.shadowColor = rgba(col, 1); g.shadowBlur = 10; g.lineWidth = Math.max(1.2, H * 0.003); g.beginPath(); for (let r = 0; r < 5; r++) { const y = ys + (r + 0.5) * (base - ys) / 5, mx = x0 + (ro - ri) / 2, rs = (ro - ri) * 0.16; g.moveTo(mx - rs, y - rs); g.lineTo(mx + rs, y + rs); g.moveTo(mx + rs, y - rs); g.lineTo(mx - rs, y + rs); } g.stroke(); g.restore(); }
    }
    // light spilling onto the inner faces of the arch
    if (I > 0 || seam > 0) { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(hot, (Math.max(I * pulse, seam * 0.5) * 0.8).toFixed(3)); g.shadowColor = rgba(col, 1); g.shadowBlur = 24; g.lineWidth = H * 0.006; opening(); g.stroke(); g.restore(); }
    // arcs leaping from the gate to the stones
    if (I > 0 || seam > 0.5) { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(hot, 0.85); g.shadowColor = rgba(col, 1); g.shadowBlur = 10; g.lineWidth = Math.max(1, H * 0.0025); const seed = Math.floor(t * 12); for (let a = 0; a < 4; a++) { if (hr(seed + a * 31) < 0.35) continue; const ang = Math.PI + hr(seed + a) * Math.PI, x1 = cx + Math.cos(ang) * ro * 1.02, y1 = ys + Math.sin(ang) * ro * 1.02; let px = vcx, py = vcy; g.beginPath(); g.moveTo(px, py); for (let s = 1; s <= 7; s++) { px = lerp(vcx, x1, s / 7) + (hr(seed + a * 7 + s) - 0.5) * H * 0.05; py = lerp(vcy, y1, s / 7) + (hr(seed + a * 7 + s + 9) - 0.5) * H * 0.05; g.lineTo(px, py); } g.stroke(); } g.restore(); }
    // the shockwave when it tears open
    const sk = (k - kb) / 0.18;
    if (sk > 0 && sk < 1) { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(hot, (1 - sk).toFixed(3)); g.lineWidth = H * 0.03 * (1 - sk); g.beginPath(); g.ellipse(cx, base, W * 1.2 * easeOut(sk), H * 0.12 * easeOut(sk), 0, 0, 7); g.stroke(); g.lineWidth = H * 0.02 * (1 - sk); g.beginPath(); g.arc(vcx, vcy, H * 1.2 * easeOut(sk), 0, 7); g.stroke(); g.restore(); }
    // debris: rising while the gate wakes, then dragged into it
    g.fillStyle = '#0d0c14';
    for (let i = 0; i < 34; i++) {
      const p = (t * 0.45 + hr(i + 800)) % 1, sz = H * (0.004 + hr(i + 801) * 0.01);
      let x, y;
      if (I <= 0) { x = cx + (hr(i + 802) - 0.5) * ro * 3.5; y = base + H * 0.04 - p * H * 0.18 * seam; if (seam <= 0) continue; }
      else { const ang = hr(i + 803) * Math.PI * 2 + p * 5, r = (1 - p) * W * 0.6; x = vcx + Math.cos(ang) * r; y = vcy + Math.sin(ang) * r * 0.6; }
      g.save(); g.translate(x, y); g.rotate(t * 3 + i); g.fillRect(-sz, -sz * 0.7, sz * 2, sz * 1.4); if (I > 0) { g.globalCompositeOperation = 'lighter'; g.fillStyle = rgba(col, 0.5); g.fillRect(-sz, -sz * 0.7, sz * 2, sz * 0.4); g.fillStyle = '#0d0c14'; } g.restore();
    }
    for (const st of stones) if (st.y >= base) drawStone(st);
    g.restore();
    // rain, lit near the gate
    if (sh.rain) { g.lineWidth = Math.max(1, H * 0.0018); for (const [cc, n0] of [['rgba(170,180,220,0.22)', 0], [rgba(hot, 0.35 * I), 1]]) { g.strokeStyle = cc; g.beginPath(); for (let i = n0; i < 180; i += 2) { const h1 = hr(i + 900), h2 = hr(i + 901), x = ((h1 * (W + 100) - t * 300) % (W + 100) + W + 100) % (W + 100) - 50, y = ((h2 * (H + 60) + t * 1500) % (H + 60)) - 30; if (n0 && Math.abs(x - cx) > W * 0.3) continue; g.moveTo(x, y); g.lineTo(x - 7, y + 22); } g.stroke(); } }
    if (rush > 0) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rgba(hot, Math.min(0.9, rush * 0.4).toFixed(3)); g.fillRect(0, 0, W, H); g.restore(); speedLines(g, W / 2, H / 2, W, H, 90, rgba(hot, 0.35), Math.floor(t * 20), 0.08); }
  }
  // the tease: more gates on far hills flaring open one after another, a shape standing in each, only its eyes lit
  function drawGates(g, W, H, sh, k, t) {
    const zoom = 1 + 0.08 * ease(k);
    g.save(); g.translate(W / 2, H * 0.6); g.scale(zoom, zoom); g.translate(-W / 2, -H * 0.6);
    const hy = H * 0.66;
    const bg = g.createLinearGradient(0, 0, 0, hy); bg.addColorStop(0, '#030308'); bg.addColorStop(1, '#141020'); g.fillStyle = bg; g.fillRect(-W, -H, W * 3, H * 3);
    clouds(g, W, H, t, 12, H * 0.04, hy - H * 0.25, [6, 6, 12], [34, 28, 48], W * 0.02, 31);
    const list = sh.gates || [];
    // pillars of light into the clouds, behind everything
    list.forEach((G, j) => {
      const I = clamp01((k - G.at) / 0.06); if (I <= 0) return;
      const x = W * G.x, base = hy + H * G.dy, c = G.col, pulse = 0.8 + 0.2 * Math.sin(t * 7 + j);
      g.save(); g.globalCompositeOperation = 'lighter';
      const pw = H * G.sc * 0.18, pl = g.createLinearGradient(x - pw, 0, x + pw, 0); pl.addColorStop(0, rgba(c, 0)); pl.addColorStop(0.5, rgba(c, 0.35 * I * pulse)); pl.addColorStop(1, rgba(c, 0));
      g.fillStyle = pl; g.fillRect(x - pw, -H, pw * 2, base + H);
      const gl = g.createRadialGradient(x, base - H * G.sc * 0.3, 0, x, base - H * G.sc * 0.3, H * 0.7 * G.sc); gl.addColorStop(0, rgba(c, 0.5 * I)); gl.addColorStop(1, rgba(c, 0)); g.fillStyle = gl; g.fillRect(x - H, base - H * 1.2, H * 2, H * 1.6);
      // the clouds above it lit from below
      const cl = g.createRadialGradient(x, H * 0.12, 0, x, H * 0.12, H * 0.5 * G.sc + H * 0.1); cl.addColorStop(0, rgba(c, 0.28 * I)); cl.addColorStop(1, rgba(c, 0)); g.fillStyle = cl; g.fillRect(x - H, -H * 0.4, H * 2, H);
      g.restore();
    });
    // hills: each gate stands on its own
    ridge(g, W, H, hy - H * 0.06, H * 0.05, 13, '#0c0a14', 0);
    ridge(g, W, H, hy, H * 0.03, 17, '#08070d', 0);
    const order = list.map((G, j) => [G, j]).sort((a, b) => a[0].sc - b[0].sc);
    for (const [G, j] of order) {
      const I = clamp01((k - G.at) / 0.06), x = W * G.x, base = hy + H * G.dy, S = H * G.sc, c = G.col, hot = mix(c, [255, 255, 255], 0.55), pulse = 0.85 + 0.15 * Math.sin(t * 8 + j * 2);
      const ro = S * 0.3, ri = S * 0.2, ys = base - S * 0.42;
      // hill under it
      g.fillStyle = '#060509'; g.beginPath(); g.ellipse(x, base + S * 0.05, S * 0.9, S * 0.1, 0, Math.PI, 0); g.fill(); g.fillRect(x - S * 0.9, base + S * 0.05, S * 1.8, H);
      // the opening: the vortex
      g.save(); g.beginPath(); g.moveTo(x - ri, base); g.lineTo(x - ri, ys); g.arc(x, ys, ri, Math.PI, Math.PI * 2); g.lineTo(x + ri, base); g.closePath(); g.clip();
      g.fillStyle = '#05040a'; g.fillRect(x - ri, ys - ri, ri * 2, base - ys + ri);
      if (I > 0) {
        const vy = (ys - ri + base) / 2, R = (base - ys + ri) * 0.6;
        g.globalCompositeOperation = 'lighter';
        for (let n = 0; n < 6; n++) { const q = 1 - ((t * 0.6 + n / 6) % 1); g.strokeStyle = rgba(c, (0.6 * q * I).toFixed(3)); g.lineWidth = Math.max(1, R * 0.04 * q); g.beginPath(); g.ellipse(x, vy, ri * q * 1.1, R * q, 0, 0, 7); g.stroke(); }
        for (let arm = 0; arm < 5; arm++) { g.strokeStyle = rgba(arm % 2 ? hot : c, 0.6 * I); g.lineWidth = Math.max(1, R * 0.025); g.beginPath(); for (let s = 2; s <= 20; s++) { const q = s / 20, an = arm / 5 * 7 + q * 4.5 + t * 2.5; const px = x + Math.cos(an) * ri * (1 - q), py = vy + Math.sin(an) * R * (1 - q); if (s === 2) g.moveTo(px, py); else g.lineTo(px, py); } g.stroke(); }
        const core = g.createRadialGradient(x, vy, 0, x, vy, R * 0.6); core.addColorStop(0, 'rgba(255,255,255,' + 0.9 * I * pulse + ')'); core.addColorStop(0.3, rgba(hot, 0.6 * I)); core.addColorStop(1, rgba(c, 0)); g.fillStyle = core; g.fillRect(x - ri, ys - ri, ri * 2, base - ys + ri);
      }
      g.restore();
      // the arch itself
      g.beginPath(); g.moveTo(x - ro, base); g.lineTo(x - ro, ys); g.arc(x, ys, ro, Math.PI, Math.PI * 2); g.lineTo(x + ro, base); g.lineTo(x + ri, base); g.lineTo(x + ri, ys); g.arc(x, ys, ri, Math.PI * 2, Math.PI, true); g.lineTo(x - ri, base); g.closePath();
      g.fillStyle = '#121219'; g.fill();
      if (I > 0) { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(hot, (0.7 * I * pulse).toFixed(3)); g.shadowColor = rgba(c, 1); g.shadowBlur = 16; g.lineWidth = Math.max(1, S * 0.008); g.beginPath(); g.moveTo(x - ri, base); g.lineTo(x - ri, ys); g.arc(x, ys, ri, Math.PI, Math.PI * 2); g.lineTo(x + ri, base); g.stroke();
        for (let r = 0; r < 7; r++) { const an = Math.PI + (r + 0.5) / 7 * Math.PI, rr = (ri + ro) / 2, rs = (ro - ri) * 0.18; const rx = x + Math.cos(an) * rr, ry = ys + Math.sin(an) * rr; g.beginPath(); g.moveTo(rx - rs, ry - rs); g.lineTo(rx + rs, ry + rs); g.moveTo(rx + rs, ry - rs); g.lineTo(rx - rs, ry + rs); g.stroke(); }
        g.restore(); }
      // the one who waits there: black against the light, only the eyes
      if (G.who && I > 0) {
        const q = clamp01((k - G.at - 0.04) / 0.2), sPx = ri * 2.9 / 1.45 * lerp(0.8, 1, easeOut(q)), fx = x, fy = base - S * 0.005;
        figure(g, G.who, fx, fy, sPx, '#030206', rgba(hot, (0.55 * q).toFixed(3)), j % 2, 'Idle');
        const SC = 2, m = 3.1 / (128 * SC) * sPx, fr = Math.floor(C.t * 7) % clipLen(G.who, 'Idle'), lift = headLift(G.who, 'Idle', 2, fr);
        const ey = fy - (lift + 2) * SC * m, ex = fx + (j % 2 ? -1 : 1) * 0.5 * SC * m, d = Math.max(2.5, 2.4 * SC * m), blink = Math.sin(t * 1.3 + j * 4) > 0.97 ? 0.1 : 1;
        if (q > 0.3) { const ea = blink * clamp01((q - 0.3) * 3); g.save(); g.globalCompositeOperation = 'lighter'; for (const sx of [-1, 1]) { const gx = ex + sx * d * 1.2, gl = g.createRadialGradient(gx, ey, 0, gx, ey, d * 3); gl.addColorStop(0, rgba(c, 0.8 * ea)); gl.addColorStop(1, rgba(c, 0)); g.fillStyle = gl; g.fillRect(gx - d * 3, ey - d * 3, d * 6, d * 6); g.fillStyle = 'rgba(255,255,255,' + ea + ')'; g.beginPath(); g.ellipse(gx, ey, d * 0.6, d * 0.32, sx * 0.25, 0, 7); g.fill(); } g.restore(); }
      }
      // the flare as it opens
      const f = (k - G.at) / 0.1;
      if (f > 0 && f < 1) { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(hot, (1 - f).toFixed(3)); g.lineWidth = S * 0.008 * (1 - f); g.beginPath(); g.ellipse(x, base, S * 1.2 * easeOut(f), S * 0.12 * easeOut(f), 0, 0, 7); g.stroke(); g.fillStyle = rgba(hot, (0.25 * (1 - f) * (1 - f)).toFixed(3)); g.fillRect(-W, -H, W * 3, H * 3); g.restore(); }
    }
    // rain
    g.strokeStyle = 'rgba(170,180,220,0.18)'; g.lineWidth = Math.max(1, H * 0.0016); g.beginPath();
    for (let i = 0; i < 140; i++) { const x = ((hr(i + 1200) * (W + 100) - t * 300) % (W + 100) + W + 100) % (W + 100) - 50, y = ((hr(i + 1201) * (H + 60) + t * 1400) % (H + 60)) - 30; g.moveTo(x, y); g.lineTo(x - 7, y + 20); }
    g.stroke();
    g.restore();
  }
  // ---------------------------------------------------------------- the oath panels again: they fall, one stands, the army to come
  // mode 'fall': the nine panels; eight crack, drain to grey as their knight falls, and drop away (sh.fallAt seconds)
  // mode 'lone': the last panel slides to the middle in falling ash, the Captain dim
  // mode 'renew': the Captain's panel blazes; eight empty frames light up around it, waiting to be filled
  function oathPanel(g, W, H, i, x0, x1, o) {
    const sl = o.sl || W * 0.025, b = C.banners[i], c = rgbOf(b ? b.color : '#555555');
    g.save(); if (o.dy || o.rot) { const mx = (x0 + x1) / 2; g.translate(mx, H / 2 + (o.dy || 0)); g.rotate(o.rot || 0); g.translate(-mx, -H / 2); }
    g.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
    g.beginPath(); g.moveTo(x0 + sl, 0); g.lineTo(x1 + sl, 0); g.lineTo(x1 - sl, H); g.lineTo(x0 - sl, H); g.closePath(); g.save(); g.clip();
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, rgba(mix(c, [0, 0, 0], 0.85), 1)); bg.addColorStop(0.45, rgba(mix(c, [255, 230, 190], o.glow ? 0.3 : 0.12), 1)); bg.addColorStop(1, rgba(mix(c, [0, 0, 0], 0.85), 1)); g.fillStyle = bg; g.fillRect(x0 - sl, 0, x1 - x0 + sl * 2, H);
    if (o.glow) rays(g, (x0 + x1) / 2, H * 0.45, W, H, 'rgba(255,220,150,' + (0.06 * o.glow) + ')', o.t, 16);
    if (o.who) { g.save(); g.globalAlpha *= o.bodyAlpha === undefined ? 1 : o.bodyAlpha; closeupBody(g, o.who, 1, o.t + i, (x0 + x1) / 2, H * 0.47, H * (o.ph || 0.125), 2, false, 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 0, { noBg: true, clip: o.clip, fr: o.fr, sil: o.sil, rim: o.rim }); g.restore(); }
    if (o.empty) { // an empty place: a "?" in the dark
      g.fillStyle = 'rgba(255,231,163,' + 0.5 * o.empty + ')'; g.font = '800 ' + Math.round(H * 0.16) + 'px Outfit, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', (x0 + x1) / 2, H * 0.46);
    }
    if (b && BB.UI.sigilPath && !o.empty) { const cx = (x0 + x1) / 2 - sl * 0.55, cy = H * 0.8, r = Math.min(x1 - x0, H) * 0.16; g.fillStyle = b.trim || '#e8c66a'; g.shadowColor = o.glow ? '#ffd27a' : 'rgba(0,0,0,0.7)'; g.shadowBlur = o.glow ? 18 : 8; BB.UI.sigilPath(g, b.sigil, cx, cy, r); g.fill('evenodd'); g.shadowBlur = 0; }
    if (o.grey > 0) { g.globalCompositeOperation = 'saturation'; g.fillStyle = 'rgba(128,128,128,' + o.grey + ')'; g.fillRect(x0 - sl, 0, x1 - x0 + sl * 2, H); g.globalCompositeOperation = 'source-over'; g.fillStyle = 'rgba(8,8,10,' + o.grey * 0.5 + ')'; g.fillRect(x0 - sl, 0, x1 - x0 + sl * 2, H); }
    if (o.crack > 0) { g.strokeStyle = 'rgba(255,255,255,' + Math.min(1, o.crack * 2) + ')'; g.lineWidth = 2.5; g.shadowColor = '#fff'; g.shadowBlur = 10; g.beginPath(); const mx = (x0 + x1) / 2; let py = 0, px = mx + sl * 0.6; g.moveTo(px, py); for (let s = 1; s <= 9; s++) { py = H * s / 9 * Math.min(1, o.crack * 3); px = mx + sl * (0.6 - s / 9 * 1.2) + Math.sin(i * 7 + s * 3.1) * (x1 - x0) * 0.18; g.lineTo(px, py); } g.stroke(); g.shadowBlur = 0; }
    if (o.flash > 0) { g.fillStyle = 'rgba(255,255,255,' + o.flash + ')'; g.fillRect(x0 - sl, 0, x1 - x0 + sl * 2, H); }
    g.restore();
    g.strokeStyle = o.edge || '#ffe7a3'; g.lineWidth = o.glow ? 4 : 3; if (o.glow) { g.shadowColor = '#ffd27a'; g.shadowBlur = 16 * o.glow; }
    g.beginPath(); g.moveTo(x0 + sl, 0); g.lineTo(x1 + sl, 0); g.lineTo(x1 - sl, H); g.lineTo(x0 - sl, H); g.closePath(); g.stroke(); g.shadowBlur = 0;
    g.restore();
  }
  function drawOath(g, W, H, sh, k, t) {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const who = sh.who, n = 9, pw = W / n;
    if (sh.mode === 'fall') {
      for (let i = 0; i < n; i++) {
        const ft = sh.fallAt[i] === undefined ? -1 : t - sh.fallAt[i];
        const o = { t, who: who[i], fr: undefined, clip: undefined };
        if (ft >= 0) {
          o.flash = Math.max(0, 0.9 - ft * 8); o.crack = ft; o.grey = Math.min(1, ft * 2.5);
          o.clip = 'Die'; o.fr = Math.min(clipLen(who[i], 'Die') - 1, Math.floor(ft * 12));
          o.bodyAlpha = 1 - clamp01((ft - 0.1) / 0.45);
          if (ft > 0.05 && ft < 0.6) for (let q = 0; q < 5; q++) C.parts.push({ x: pw * i + Math.random() * pw, y: H * (0.2 + Math.random() * 0.55), vx: 40 + Math.random() * 120, vy: -40 - Math.random() * 90, t: 0, life: 1 + Math.random() * 0.8, col: Math.random() < 0.3 ? '#ff8a3a' : '#9a9590', r: 1 + Math.random() * 2.2, drift: true });
          const d = Math.max(0, ft - 0.45); o.dy = d * d * H * 2.2; o.rot = d * d * (i % 2 ? 0.5 : -0.5); o.alpha = Math.max(0, 1 - d * 1.4);
        }
        if (o.alpha === 0) continue;
        oathPanel(g, W, H, i, pw * i, pw * (i + 1), Object.assign(o, { glow: i === 8 && k > 0.75 ? (k - 0.75) * 4 : 0 }));
      }
      return;
    }
    if (sh.mode === 'lone') {
      const q = ease(clamp01(k / 0.45)), x0 = lerp(pw * 8, W * 0.32, q), x1 = lerp(W, W * 0.68, q);
      oathPanel(g, W, H, 8, x0, x1, { t, who: who[8], ph: lerp(0.125, 0.3, q), grey: 0.55, sl: W * 0.03, glow: 0 });
      g.fillStyle = 'rgba(210,205,200,0.6)'; for (let i = 0; i < 80; i++) { const x = ((hr(i + 2100) * W + Math.sin(t * 0.8 + i) * 30 + t * 14) % W + W) % W, y = (hr(i + 2101) * H + t * H * 0.06 * (0.5 + hr(i + 2102))) % H, r = (0.6 + hr(i + 2103) * 1.8) * (W / 1280) * 1.5; g.fillRect(x, y, r, r); }
      return;
    }
    if (sh.mode === 'renew') {
      const cw = W * 0.34, cx0 = W / 2 - cw / 2, side = (W - cw) / 2 / 4;
      for (let j = 0; j < 8; j++) {
        const at = 0.18 + j * 0.07, q = clamp01((k - at) / 0.12); if (q <= 0) continue;
        const slot = j < 4 ? j : j + 1, x0 = slot < 4 ? slot * side : cx0 + cw + (slot - 5) * side;
        oathPanel(g, W, H, j, x0, x0 + side, { t, empty: q, alpha: q, sl: W * 0.015, edge: 'rgba(255,231,163,' + (0.5 + 0.5 * q) + ')' });
      }
      oathPanel(g, W, H, 8, cx0, cx0 + cw, { t, who: who[8], ph: 0.3, glow: 0.5 + 0.5 * clamp01(k * 3), sl: W * 0.03 });
    }
  }
  // the bosses still to come, each in its own gate: a black shape, rim-lit, only the eyes
  function drawTease(g, W, H, sh, k, t) {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const n = sh.gates.length, sl = W * 0.05;
    sh.gates.forEach((G, i) => {
      const x0 = W * i / n, x1 = W * (i + 1) / n, kk = clamp01((k - i * 0.22) / 0.3); if (kk <= 0) return;
      const drop = (1 - easeOut(clamp01(kk * 2))) * H * (i % 2 ? 1 : -1), c = G.col, hot = mix(c, [255, 255, 255], 0.55), mx = (x0 + x1) / 2;
      g.save(); g.translate(0, drop); g.beginPath(); g.moveTo(x0 + sl, 0); g.lineTo(x1 + sl, 0); g.lineTo(x1 - sl, H); g.lineTo(x0 - sl, H); g.closePath(); g.clip();
      g.fillStyle = rgba(mix(c, [0, 0, 0], 0.88), 1); g.fillRect(x0 - sl, 0, x1 - x0 + sl * 2, H);
      // the gate's vortex behind it
      g.save(); g.globalCompositeOperation = 'lighter'; g.translate(mx, H * 0.45);
      const R = H * 0.55;
      for (let r = 0; r < 7; r++) { const q = 1 - ((t * 0.5 + r / 7) % 1); g.strokeStyle = rgba(c, (0.45 * q).toFixed(3)); g.lineWidth = Math.max(1, R * 0.025 * q); g.beginPath(); g.ellipse(0, 0, R * q * 0.7, R * q, 0, 0, TAU); g.stroke(); }
      for (let a = 0; a < 6; a++) { g.strokeStyle = rgba(a % 2 ? hot : c, 0.4); g.lineWidth = Math.max(1, R * 0.012); g.beginPath(); for (let s = 2; s <= 24; s++) { const q = s / 24, an = a / 6 * TAU + q * 4.5 + t * 2; const px = Math.cos(an) * R * 0.7 * (1 - q), py = Math.sin(an) * R * (1 - q); s === 2 ? g.moveTo(px, py) : g.lineTo(px, py); } g.stroke(); }
      const core = g.createRadialGradient(0, 0, 0, 0, 0, R * 0.5); core.addColorStop(0, rgba(hot, 0.85)); core.addColorStop(1, rgba(c, 0)); g.fillStyle = core; g.beginPath(); g.arc(0, 0, R * 0.5, 0, TAU); g.fill();
      g.restore();
      // the shape, black, rim-lit
      closeupBody(g, G.who, kk, t + i, mx, H * 0.5, H * 0.2, 2, false, 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 0, { noBg: true, sil: 1, rim: rgba(hot, 1), rise: true });
      // the eyes light
      const ea = clamp01((kk - 0.6) * 4) * (Math.sin(t * 1.4 + i * 3) > 0.96 ? 0.1 : 1);
      if (ea > 0) { const ey = H * (0.5 + (G.eyeY || -0.08)), d = H * 0.009; g.save(); g.globalCompositeOperation = 'lighter'; for (const sx of [-1, 1]) { const gx = mx + sx * d * 1.6 + (G.eyeX || 0) * H, gl = g.createRadialGradient(gx, ey, 0, gx, ey, d * 5); gl.addColorStop(0, rgba(c, 0.9 * ea)); gl.addColorStop(1, rgba(c, 0)); g.fillStyle = gl; g.fillRect(gx - d * 5, ey - d * 5, d * 10, d * 10); g.fillStyle = 'rgba(255,255,255,' + ea + ')'; g.beginPath(); g.ellipse(gx, ey, d, d * 0.5, sx * 0.3, 0, TAU); g.fill(); } g.restore(); }
      g.restore();
      g.strokeStyle = rgba(hot, 0.9); g.lineWidth = 3; g.beginPath(); g.moveTo(x1 + sl, -4 + drop); g.lineTo(x1 - sl, H + 4 + drop); g.stroke();
      if (kk > 0.5) { g.save(); g.globalAlpha = clamp01((kk - 0.5) * 3); const lg = g.createLinearGradient(0, H * 0.7, 0, H * 0.9); lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(0.4, 'rgba(0,0,0,0.75)'); lg.addColorStop(1, 'rgba(0,0,0,0.75)'); g.fillStyle = lg; g.fillRect(x0 - sl, H * 0.7 + drop, x1 - x0, H * 0.2); g.textAlign = 'center'; g.font = '700 ' + Math.round(H * 0.024) + 'px Outfit, sans-serif'; g.fillStyle = rgba(hot, 1); if (g.letterSpacing !== undefined) g.letterSpacing = '4px'; g.fillText(G.land, mx - sl * 0.4, H * 0.84 + drop); g.font = '800 ' + Math.round(H * 0.05) + 'px Outfit, sans-serif'; g.fillStyle = '#e8e8f0'; g.fillText('? ? ?', mx - sl * 0.5, H * 0.79 + drop); if (g.letterSpacing !== undefined) g.letterSpacing = '0px'; g.restore(); }
    });
  }
  // ---------------------------------------------------------------- trailer language: kinetic type, the moon, the iris, the montage
  const SERIF = 'Cinzel, "Cormorant Garamond", Georgia, serif', SERIF2 = '"Cormorant Garamond", Cinzel, Georgia, serif';
  // words land one at a time on black or paper-white; one word can burn red; a line can spread its letters or fly them in
  function drawType(g, W, H, sh, k, t) {
    const white = sh.bg === 'white', ink = white ? '#141210' : '#ecebe6';
    g.fillStyle = white ? '#e9e5dc' : '#000'; g.fillRect(0, 0, W, H);
    if (white) { g.fillStyle = 'rgba(0,0,0,0.05)'; for (let i = 0; i < 70; i++) g.fillRect(hr(i + 3000) * W, hr(i + 3001) * H, 1 + hr(i + 3002) * 3, 1 + hr(i + 3003) * 3); }
    sh._seen = sh._seen || {};
    if (sh.giant) { // a word too big for the frame, behind everything
      const gk = clamp01((t - (sh.giant.at || 0)) / 0.25); if (gk > 0) { g.save(); g.globalAlpha = gk * (sh.giant.alpha || 0.9); g.font = '800 ' + Math.round(H * (sh.giant.size || 0.42)) + 'px ' + SERIF; g.textAlign = 'center'; g.textBaseline = 'middle';
        const gr = g.createLinearGradient(0, H * 0.2, 0, H * 0.8); gr.addColorStop(0, sh.giant.col || '#f3e9e9'); gr.addColorStop(1, sh.giant.col2 || '#8a2a2a'); g.fillStyle = gr; g.translate(W / 2, H / 2); g.scale(1 + (1 - gk) * 0.3 + t * 0.01, 1 + (1 - gk) * 0.3 + t * 0.01); g.fillText(sh.giant.text, 0, 0); g.restore(); } }
    sh.lines.forEach((L, li) => {
      const size = Math.round(H * (L.size || 0.045)), y = H * (L.y || 0.5), font = (L.w || 600) + ' ' + size + 'px ' + (L.font === 2 ? SERIF2 : SERIF);
      const out = L.out !== undefined && t > L.out ? clamp01(1 - (t - L.out) / 0.3) : 1; if (out <= 0) return;
      g.font = font; g.textBaseline = 'middle';
      if (L.spread || L.fly) { // letter by letter
        const letters = L.text.split(''), sp = L.spread ? size * lerp(0.1, L.spread, ease(clamp01((t - L.at) / 1.2))) : size * 0.08;
        const widths = letters.map((c) => g.measureText(c).width), total = widths.reduce((a, b) => a + b, 0) + sp * (letters.length - 1);
        let x = W / 2 - total / 2;
        letters.forEach((c, i) => {
          const lt = t - L.at - (L.fly ? i * 0.035 : 0), a = clamp01(lt / (L.fly ? 0.5 : 0.25)); if (a <= 0) { x += widths[i] + sp; return; }
          let dx = 0, dy = 0, rot = 0, sc = 1;
          if (L.fly) { const e = 1 - easeOut(a), sd = hr(i * 7 + li); dx = (sd - 0.5) * W * 1.2 * e; dy = (hr(i * 11 + li) - 0.5) * H * 1.4 * e; rot = (sd - 0.5) * 6 * e; sc = 1 + e * 2; if (a >= 1 && !sh._seen['f' + li + i]) { sh._seen['f' + li + i] = 1; if (i === letters.length - 1) { BB.score && BB.score('braam', 1.1); C.flash = 0.8; C.flashCol = '#fff'; C.shake = Math.max(C.shake, 0.9); C.rgb = 1; } } }
          g.save(); g.translate(x + widths[i] / 2 + dx, y + dy); g.rotate(rot); g.scale(sc, sc); g.globalAlpha = out * Math.min(1, a * 2);
          if (L.col) { g.shadowColor = L.glow || L.col; g.shadowBlur = size * 0.5; }
          g.fillStyle = L.col || ink; g.textAlign = 'center'; g.fillText(c, 0, 0); g.restore();
          x += widths[i] + sp;
        });
        return;
      }
      const words = L.text.split(' '), sw = g.measureText(' ').width, ws = words.map((w) => g.measureText(w).width), total = ws.reduce((a, b) => a + b, 0) + sw * (words.length - 1);
      let x = W / 2 - total / 2;
      words.forEach((w, i) => {
        const wt = t - L.at - i * (L.gap || 0.2), a = clamp01(wt / 0.1); if (a <= 0) { x += ws[i] + sw; return; }
        const hi = L.hi && w.replace(/[^\w]/g, '').toUpperCase() === L.hi;
        if (!sh._seen[li + ':' + i]) { sh._seen[li + ':' + i] = 1; if (BB.score) BB.score(hi ? 'boom' : 'tick', hi ? 1 : 0.8); if (hi) C.shake = Math.max(C.shake, 0.35); }
        const pop = 1 + (1 - easeOut(clamp01(wt / 0.18))) * 0.25;
        g.save(); g.translate(x + ws[i] / 2, y); g.scale(pop, pop); g.globalAlpha = out * a; g.textAlign = 'center';
        if (hi) { const j = Math.sin(t * 40) * size * 0.015; g.translate(j, -j); g.shadowColor = L.hiCol || '#ff2a2a'; g.shadowBlur = size * 1.2; g.fillStyle = L.hiCol || '#ff3030'; g.fillText(w, 0, 0); g.shadowBlur = size * 0.4; g.fillText(w, 0, 0); }
        else { g.fillStyle = ink; g.fillText(w, 0, 0); }
        g.restore(); x += ws[i] + sw;
      });
    });
  }
  // a tiny figure on a hill of wreckage against an enormous moon
  function drawMoon(g, W, H, sh, k, t) {
    const z = 1 + ease(k) * (sh.push || 0.08), cx = W / 2, cy = H * 0.5;
    g.save(); g.translate(cx, cy); g.scale(z, z); g.translate(-cx, -cy);
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#05060c'); bg.addColorStop(1, '#141826'); g.fillStyle = bg; g.fillRect(-W, -H, W * 3, H * 3);
    g.fillStyle = '#d8dce8'; for (let i = 0; i < 120; i++) { const a = 0.3 + 0.7 * Math.abs(Math.sin(t * 2 + i)); g.globalAlpha = a * 0.7; g.fillRect(hr(i + 3100) * W, hr(i + 3101) * H * 0.7, 1.5, 1.5); } g.globalAlpha = 1;
    const mc = sh.moon || [236, 232, 222], R = H * 0.44, my = H * 0.56;
    const glow = g.createRadialGradient(cx, my, R * 0.9, cx, my, R * 1.8); glow.addColorStop(0, rgba(mc, 0.35)); glow.addColorStop(1, rgba(mc, 0)); g.fillStyle = glow; g.fillRect(-W, -H, W * 3, H * 3);
    const md = g.createRadialGradient(cx - R * 0.3, my - R * 0.3, R * 0.1, cx, my, R); md.addColorStop(0, rgba(mix(mc, [255, 255, 255], 0.3), 1)); md.addColorStop(1, rgba(mix(mc, [120, 120, 130], 0.35), 1));
    g.fillStyle = md; g.beginPath(); g.arc(cx, my, R, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.arc(cx, my, R, 0, TAU); g.clip(); for (let i = 0; i < 14; i++) { const a = hr(i + 3200) * TAU, d = hr(i + 3201) * R * 0.85, r = R * (0.02 + hr(i + 3202) * 0.06); g.fillStyle = 'rgba(110,110,120,' + (0.06 + hr(i + 3203) * 0.08) + ')'; g.beginPath(); g.arc(cx + Math.cos(a) * d, my + Math.sin(a) * d, r, 0, TAU); g.fill(); }
      for (let i = 0; i < 5; i++) { const x = ((hr(i + 3300) * 1.6 + t * 0.03 * (1 + i * 0.3)) % 1.6 - 0.3) * W, y = my + (hr(i + 3301) - 0.5) * R * 1.4; g.fillStyle = 'rgba(10,12,20,0.55)'; g.beginPath(); g.ellipse(x, y, R * 0.9, R * 0.06, 0, 0, TAU); g.fill(); } g.restore();
    // the hill, the wreckage, the figure with the banner
    const hy = H * 0.84; g.fillStyle = '#020204'; g.beginPath(); g.moveTo(-10, H + 10); g.lineTo(-10, hy + H * 0.04); g.quadraticCurveTo(cx - W * 0.1, hy - H * 0.02, cx, hy - H * 0.035); g.quadraticCurveTo(cx + W * 0.12, hy - H * 0.02, W + 10, hy + H * 0.05); g.lineTo(W + 10, H + 10); g.closePath(); g.fill();
    g.strokeStyle = '#020204'; g.lineWidth = Math.max(2, H * 0.004); g.lineCap = 'round';
    for (let i = 0; i < 14; i++) { const x = cx + (hr(i + 3400) - 0.5) * W * 0.8, base = hy + Math.abs(x - cx) / W * H * 0.06 - H * 0.02, a = -Math.PI / 2 + (hr(i + 3401) - 0.5) * 1.1, l = H * (0.05 + hr(i + 3402) * 0.08); g.beginPath(); g.moveTo(x, base); g.lineTo(x + Math.cos(a) * l, base + Math.sin(a) * l); g.stroke(); }
    if (sh.who) {
      const SC = 2, fr = Math.floor(t * 6) % clipLen(sh.who, 'Idle'), sv = silhouette(sh.who, 'Idle', sh.dir === undefined ? 2 : sh.dir, fr, SC, '#020204'), hgt = H * (sh.fig || 0.13), m = hgt / (60 * SC);
      const fx = cx, fy = hy - H * 0.032;
      g.drawImage(sv, fx - 64 * SC * m, fy - 90 * SC * m, 128 * SC * m, 128 * SC * m);
      if (sh.banner) { const px = fx + hgt * 0.32, top = fy - hgt * 1.9; g.lineWidth = Math.max(2, H * 0.005); g.beginPath(); g.moveTo(px, fy); g.lineTo(px, top); g.stroke();
        g.fillStyle = '#020204'; g.beginPath(); g.moveTo(px, top + hgt * 0.05); for (let i = 0; i <= 10; i++) { const u = i / 10; g.lineTo(px + u * hgt * 0.9, top + hgt * 0.05 + Math.sin(t * 3 + u * 5) * hgt * 0.06 * u); } for (let i = 10; i >= 0; i--) { const u = i / 10; g.lineTo(px + u * hgt * 0.9 - (i % 3 === 0 ? hgt * 0.05 : 0), top + hgt * 0.55 + Math.sin(t * 3 + u * 5 + 0.6) * hgt * 0.08 * u); } g.closePath(); g.fill(); }
    }
    g.fillStyle = 'rgba(200,200,210,0.5)'; for (let i = 0; i < 60; i++) { const x = ((hr(i + 3500) * W + t * 18 + Math.sin(t + i) * 20) % W + W) % W, y = (hr(i + 3501) * H + t * H * 0.04) % H; g.fillRect(x, y, 1.6, 1.6); }
    g.restore();
  }
  // an eye fills the frame and rings open out of it into the next world
  function drawIris(g, W, H, sh, k, t) {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const c = sh.col || [125, 255, 176], cx = W / 2, cy = H * 0.5;
    if (sh.who && k < 0.55) { g.save(); g.globalAlpha = 1 - clamp01((k - 0.35) / 0.2); closeupBody(g, sh.who, 1, t, cx, cy + H * 0.22, H * 0.3, 2, false, rgba(mix(c, [0, 0, 0], 0.6), 1), 'rgba(0,0,0,1)', 0, { zoom: 1.5 + k * 1.2 }); g.restore(); }
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) { const q = (k * 1.6 + i / 9) % 1, r = Math.pow(q, 2.2) * Math.max(W, H) * 0.9; g.strokeStyle = rgba(c, (0.9 * (1 - q) * clamp01(k * 4)).toFixed(3)); g.lineWidth = Math.max(1.5, H * 0.012 * (1 - q)); g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke(); }
    const core = g.createRadialGradient(cx, cy, 0, cx, cy, H * 0.25 * (0.3 + k)); core.addColorStop(0, rgba(mix(c, [255, 255, 255], 0.6), clamp01(k * 2))); core.addColorStop(1, rgba(c, 0)); g.fillStyle = core; g.fillRect(0, 0, W, H);
    g.restore();
    if (k > 0.6) speedLines(g, cx, cy, W, H, 90, rgba(c, (0.4 * (k - 0.6) / 0.4).toFixed(3)), Math.floor(t * 24), 0.06);
    if (k > 0.85) { g.fillStyle = 'rgba(255,255,255,' + ((k - 0.85) / 0.15) + ')'; g.fillRect(0, 0, W, H); }
  }
  // flash cuts: a burst of frames, each one held for a beat, white between
  function drawMontage(g, W, H, sh, k, t) {
    let acc = 0, fi = 0; for (; fi < sh.frames.length - 1; fi++) { if (t < acc + sh.frames[fi].d) break; acc += sh.frames[fi].d; }
    const F = sh.frames[fi], lt = t - acc, fk = clamp01(lt / F.d);
    if (sh._fi !== fi) { sh._fi = fi; if (BB.score) BB.score(F.hit ? 'hit' : 'boom', F.hit ? 1 : 0.8); C.shake = Math.max(C.shake, F.hit ? 0.8 : 0.4); if (F.sfx) BB.sfx(F.sfx); if (F.voice && BB.voice) BB.voice(F.voice, 0.8); }
    const bgc = F.bg || '#000'; g.fillStyle = bgc; g.fillRect(0, 0, W, H);
    if (F.word) { g.save(); g.font = '800 ' + Math.round(H * (F.wsize || 0.5)) + 'px ' + SERIF; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = F.wcol || 'rgba(255,255,255,0.9)'; g.translate(W / 2, H / 2); g.scale(1.05 + fk * 0.06, 1.05 + fk * 0.06); g.fillText(F.word, 0, 0); g.restore(); }
    if (F.who) {
      const z = 1.18 - easeOut(fk) * 0.18, S = Math.max(4, Math.round(H * (F.size || 0.85) / 60)), clip = F.clip || 'Idle', n = clipLen(F.who, clip), fr = F.clip ? Math.min(n - 1, Math.floor(fk * n)) : Math.floor(t * 8) % n;
      const sv = silhouette(F.who, clip, F.dir === undefined ? 2 : F.dir, fr, S, F.ink || '#000');
      g.save(); g.translate(W * (F.x || 0.5), H * (F.y || 0.95)); g.scale(z * (F.flip ? -1 : 1), z);
      if (F.rim) { const rv = silhouette(F.who, clip, F.dir === undefined ? 2 : F.dir, fr, S, F.rim); for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1]]) g.drawImage(rv, -64 * S + dx * S * 0.6, -90 * S + dy * S * 0.6); }
      g.drawImage(sv, -64 * S, -90 * S);
      if (F.eyes) { const lift = headLift(F.who, clip, F.dir === undefined ? 2 : F.dir, fr); g.globalCompositeOperation = 'lighter'; g.fillStyle = F.eyes; g.shadowColor = F.eyes; g.shadowBlur = S * 3; g.fillRect(-2.2 * S, -(lift + 1) * S, 1.4 * S, 0.8 * S); g.fillRect(0.8 * S, -(lift + 1) * S, 1.4 * S, 0.8 * S); }
      g.restore();
    }
    if (F.lines !== false) speedLines(g, W / 2, H / 2, W, H, 60, F.lcol || 'rgba(255,255,255,0.12)', Math.floor(t * 20), 0.2);
    if (lt < 0.05 && fi > 0) { g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(0, 0, W, H); }
  }
  // grading: the shot pushed to black and white, or one colour against black
  function applyGrade(g, cv, W, H, grade) {
    const tmp = C.gtmp || (C.gtmp = document.createElement('canvas')); if (tmp.width !== W || tmp.height !== H) { tmp.width = W; tmp.height = H; }
    const x = tmp.getContext('2d'); x.globalCompositeOperation = 'copy'; x.drawImage(cv, 0, 0);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    if ('filter' in g) { g.filter = grade === 'manga' ? 'grayscale(1) contrast(6) brightness(1.2)' : 'grayscale(1) contrast(2.4) brightness(1.15)'; g.globalCompositeOperation = 'copy'; g.drawImage(tmp, 0, 0); g.filter = 'none'; }
    if (grade === 'sepia' && 'filter' in g) { g.filter = 'sepia(0.75) contrast(1.35) saturate(0.8) brightness(0.95)'; g.globalCompositeOperation = 'copy'; g.drawImage(tmp, 0, 0); g.filter = 'none'; g.restore(); return; }
    const col = { red: '#ff2b2b', green: '#62ff92', blue: '#5aa8ff', gold: '#ffb54a', violet: '#b48cff' }[grade];
    if (col) { g.globalCompositeOperation = 'multiply'; g.fillStyle = col; g.fillRect(0, 0, W, H); }
    g.restore();
  }
  // ================================================================ six more ways to shoot a scene, one per reference
  // a sprite drawn at a chosen height, feet at (x, y)
  function actorAt(g, a, clip, dir, fr, x, y, h, o) {
    const S = h / 42; g.save(); g.imageSmoothingEnabled = false; if (o && o.alpha !== undefined) g.globalAlpha *= o.alpha;
    if (o && o.flip) { g.translate(x * 2, 0); g.scale(-1, 1); }
    drawActor(g, a, clip, dir, fr, x, y, S, o && o.flash ? { flash: o.flash } : undefined); g.restore();
  }
  function silAt(g, a, clip, dir, fr, x, y, h, col, rim, flip) {
    const SC = 2, m = h / (42 * SC), sv = silhouette(a, clip, dir, fr, SC, col);
    g.save(); g.translate(x, y); if (flip) g.scale(-1, 1); g.imageSmoothingEnabled = false;
    if (rim) { const rv = silhouette(a, clip, dir, fr, SC, rim); for (const [dx, dy] of [[-1.5, 0], [1.5, 0], [0, -1.5]]) g.drawImage(rv, -64 * SC * m + dx, -90 * SC * m + dy, 128 * SC * m, 128 * SC * m); }
    g.drawImage(sv, -64 * SC * m, -90 * SC * m, 128 * SC * m, 128 * SC * m); g.restore();
  }
  const frOf = (a, clip, t, fps) => Math.floor(t * (fps || 8)) % clipLen(a, clip);
  // the pixels of a sprite, for breaking it apart
  const pixCache = {};
  function pixelsOf(a, clip, dir, fr) {
    const art = a._art || (a._art = actorArt(a)), key = (art.key || 'hero') + clip + dir + fr; if (pixCache[key]) return pixCache[key];
    const SC = 1, S = 128, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    drawActor(x, a, clip, dir, fr, S / 2, 90, SC); let d; try { d = x.getImageData(0, 0, S, S).data; } catch (e) { return (pixCache[key] = []); }
    const pts = []; for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) { const i = (yy * S + xx) * 4; if (d[i + 3] > 90) pts.push({ x: xx - S / 2, y: yy - 90, c: 'rgb(' + d[i] + ',' + d[i + 1] + ',' + d[i + 2] + ')', r: hr(xx * 131 + yy) }); }
    let top = 0; for (const p of pts) top = Math.min(top, p.y); for (const p of pts) p.v = (p.y - top) / Math.max(1, -top); // 0 at the head, 1 at the feet
    return (pixCache[key] = pts);
  }
  // break a sprite apart: 'shatter' (stone falling), 'dust' (rising motes), 'sand' (blown away), 'glitch' (slices and static), 'ink' (drowned)
  function breakApart(g, a, x, y, h, mode, k, t, col) {
    const pts = pixelsOf(a, 'Idle', 2, 0), s = h / 42;
    g.save(); g.imageSmoothingEnabled = false;
    for (const p of pts) {
      let px = x + p.x * s, py = y + p.y * s, al = 1, c = p.c;
      if (mode === 'shatter') { const q = clamp01((k - p.r * 0.25) / 0.7); px += (p.x * 0.02 + (p.r - 0.5)) * q * h * 0.9; py += (q * q * h * 1.4) - Math.sin(q * 3) * h * 0.2 * (1 - p.v); al = 1 - clamp01((q - 0.75) * 4); if (q > 0.05) c = '#8a7d70'; }
      else if (mode === 'dust') { const q = clamp01((k - (1 - p.v) * 0.4) / 0.6); px += Math.sin(p.r * 20 + t * 2) * q * h * 0.25; py -= q * h * (0.6 + p.r); al = 1 - q; if (q > 0) c = q > 0.3 ? (col || '#ffd27a') : p.c; }
      else if (mode === 'sand') { const q = clamp01((k - (p.x / 60 + 0.5) * 0.45 - p.r * 0.1) / 0.55); px += q * q * h * (1.6 + p.r); py -= Math.sin(q * 3 + p.r * 5) * h * 0.15 * q; al = 1 - clamp01((q - 0.6) * 2.5); if (q > 0) c = q > 0.2 ? '#d8b070' : p.c; }
      else if (mode === 'glitch') { const band = Math.floor((p.y + 90) / 6), off = (hr(band * 13 + Math.floor(t * 18)) - 0.5) * h * 0.6 * k; px += off; al = 1 - clamp01((k - 0.5 - hr(band) * 0.3) * 3); if (hr(band + Math.floor(t * 30)) < 0.15 * k) c = hr(band) < 0.5 ? '#ff3df0' : '#3dfcff'; }
      else if (mode === 'ink') { const q = clamp01((k - p.v * 0.3) / 0.7); px += (p.r - 0.5) * q * h * 0.3; py += q * h * 0.3 * p.r; c = q > 0.2 ? '#000' : p.c; al = 1; }
      if (al <= 0) continue; g.globalAlpha = al; g.fillStyle = c; g.fillRect(px, py, s + 0.6, s + 0.6);
    }
    g.restore();
  }

  // ---- ARENA (the chanting crowd): a torch-lit crypt hall, rows of the dead chanting on the beat, the champion on his dais
  function drawArena(g, W, H, sh, k, t) {
    const beat = (t * (sh.bpm || 100) / 60), pulse = Math.pow(1 - (beat % 1), 3), on = Math.floor(beat);
    const z = 1 + (sh.push || 0.08) * ease(k); g.save(); g.translate(W / 2, H * 0.6); g.scale(z, z); g.translate(-W / 2 + (sh.pan ? lerp(-W * 0.08, W * 0.08, k) : 0), -H * 0.6);
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#1a0e08'); bg.addColorStop(0.6, '#4a2814'); bg.addColorStop(1, '#2a160c'); g.fillStyle = bg; g.fillRect(-W, -H, W * 3, H * 3);
    // the hall: pillars and arches, light shafts, torches
    for (let i = -1; i < 8; i++) { const x = i * W / 6; g.fillStyle = '#080503'; g.fillRect(x - W * 0.02, 0, W * 0.04, H * 0.7); g.strokeStyle = 'rgba(255,150,70,0.12)'; g.lineWidth = 2; g.beginPath(); g.arc(x + W / 12, H * 0.3, W / 12, Math.PI, 0); g.stroke(); }
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) { const x = W * (0.15 + i * 0.24), gr = g.createLinearGradient(x, 0, x + W * 0.08, H); gr.addColorStop(0, 'rgba(255,190,120,0.28)'); gr.addColorStop(1, 'rgba(255,190,120,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(x - W * 0.02, 0); g.lineTo(x + W * 0.03, 0); g.lineTo(x + W * 0.14, H); g.lineTo(x + W * 0.02, H); g.closePath(); g.fill(); }
    for (let i = 0; i < 6; i++) { const x = W * (0.08 + i * 0.17), y = H * 0.36, f = 0.75 + 0.25 * Math.sin(t * 13 + i * 3); const gl = g.createRadialGradient(x, y, 0, x, y, H * 0.12 * f); gl.addColorStop(0, 'rgba(255,170,60,0.75)'); gl.addColorStop(1, 'rgba(255,90,20,0)'); g.fillStyle = gl; g.fillRect(x - H * 0.15, y - H * 0.15, H * 0.3, H * 0.3); g.fillStyle = 'rgba(255,230,160,' + f + ')'; g.beginPath(); g.ellipse(x, y, H * 0.008, H * 0.018 * f, 0, 0, TAU); g.fill(); }
    for (let i = 0; i < 70; i++) { const x = (hr(i + 4000) * W + t * 10) % W, y = (hr(i + 4001) * H * 0.8 + Math.sin(t + i) * 10); g.fillStyle = 'rgba(255,210,150,' + (0.25 + 0.25 * Math.sin(t * 2 + i)) + ')'; g.fillRect(x, y, 1.6, 1.6); }
    g.restore();
    // the dais and the champion
    if (sh.boss) {
      const bx = W / 2, by = H * (sh.close ? 1.02 : 0.66), bh = H * (sh.close ? 0.8 : 0.4);
      if (!sh.close) { g.save(); g.globalCompositeOperation = 'lighter'; const sp = g.createRadialGradient(bx, by - bh * 0.5, 0, bx, by - bh * 0.5, bh * 0.9); sp.addColorStop(0, 'rgba(255,170,90,0.35)'); sp.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = sp; g.fillRect(bx - bh, by - bh * 1.4, bh * 2, bh * 1.6); g.restore(); }
      if (!sh.close) { g.fillStyle = '#120a06'; g.beginPath(); g.ellipse(bx, by + H * 0.01, W * 0.16, H * 0.04, 0, 0, TAU); g.fill(); g.fillRect(bx - W * 0.16, by + H * 0.01, W * 0.32, H * 0.1); }
      const clip = sh.roar && k > 0.3 ? 'Special1' : 'Taunt', fr = sh.roar && k > 0.3 ? Math.min(clipLen(sh.boss, clip) - 1, Math.floor((k - 0.3) * 30)) : frOf(sh.boss, clip, t, 9);
      actorAt(g, sh.boss, clip, 2, fr, bx, by, bh);
      if (sh.roar && k > 0.3) { g.save(); g.globalCompositeOperation = 'lighter'; const rr = (k - 0.3) * W; g.strokeStyle = 'rgba(255,200,140,' + Math.max(0, 0.6 - (k - 0.3)) + ')'; g.lineWidth = H * 0.01; g.beginPath(); g.ellipse(bx, by - bh * 0.5, rr, rr * 0.5, 0, 0, TAU); g.stroke(); g.restore(); }
    }
    // the crowd: three rows of the dead, chanting, arms up on the beat
    const rows = sh.close ? [] : sh.crowdClose ? [[1.0, 0.6, 5]] : [[0.78, 0.16, 14], [0.9, 0.23, 11], [1.04, 0.33, 8]];
    rows.forEach(([ry, rh, n], ri) => {
      for (let i = 0; i < n; i++) {
        const a = sh.crowd[(i + ri * 3) % sh.crowd.length], x = (i + 0.5) / n * W * 1.1 - W * 0.05 + (ri % 2 ? W / n / 2 : 0), jump = pulse * H * 0.02 * (1 + ri * 0.5) * (hr(i + ri * 30) * 0.6 + 0.6);
        const up = (on + i) % 2 === 0 && pulse > 0.3, clip = up ? 'Attack1' : 'Idle', fr = up ? Math.min(clipLen(a, clip) - 1, 3) : frOf(a, 'Idle', t + i, 8);
        silAt(g, a, clip, i % 2 ? 1 : 3, fr, x, H * ry - jump, H * rh, '#070403', ri === 2 || sh.crowdClose ? 'rgba(255,180,100,0.85)' : 'rgba(255,170,90,0.5)', i % 2);
      }
    });
    g.restore();
    // the chant
    if (sh.chant) { const word = sh.chant[on % sh.chant.length]; g.save(); g.globalAlpha = 0.35 + pulse * 0.6; g.font = '800 ' + Math.round(H * 0.24 * (1 + pulse * 0.08)) + 'px ' + SERIF; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffd7a8'; g.shadowColor = '#ff7a2a'; g.shadowBlur = H * 0.05 * pulse; g.fillText(word, W / 2, H * 0.3); g.restore();
      if (sh._on !== on) { sh._on = on; if (BB.score) BB.score('boom', 0.9); C.shake = Math.max(C.shake, 0.18); } }
  }

  // ---- DUST (the awakening): darkness full of golden motes, one spotlight, a red stage, a violet point of light
  function drawDust(g, W, H, sh, k, t) {
    const mode = sh.mode;
    g.fillStyle = mode === 'stage' ? '#0a0203' : '#030203'; g.fillRect(0, 0, W, H);
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 90; i++) { const d = hr(i + 4100), r = H * (0.003 + d * d * 0.03), x = ((hr(i + 4101) * W + t * (10 + d * 30)) % (W + r * 2)) - r, y = (hr(i + 4102) * H - t * (6 + d * 20) + H * 2) % H; const a = (0.15 + 0.35 * (1 - d)) * (0.6 + 0.4 * Math.sin(t * 2 + i));
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, mode === 'stage' ? 'rgba(255,120,90,' + a + ')' : 'rgba(255,205,120,' + a + ')'); gr.addColorStop(1, 'rgba(255,160,80,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    g.restore();
    const a = sh.who, cx = W / 2;
    if (mode === 'spot') {
      const fy = H * 0.86, h = H * 0.44; g.save(); g.globalCompositeOperation = 'lighter'; const cone = g.createLinearGradient(cx, 0, cx, fy); cone.addColorStop(0, 'rgba(255,220,170,0.25)'); cone.addColorStop(1, 'rgba(255,220,170,0.03)'); g.fillStyle = cone; g.beginPath(); g.moveTo(cx - W * 0.03, 0); g.lineTo(cx + W * 0.03, 0); g.lineTo(cx + W * 0.16, fy); g.lineTo(cx - W * 0.16, fy); g.closePath(); g.fill(); g.restore();
      g.fillStyle = 'rgba(255,220,170,0.12)'; g.beginPath(); g.ellipse(cx, fy, W * 0.16, H * 0.035, 0, 0, TAU); g.fill();
      actorAt(g, a, 'Idle', 2, frOf(a, 'Idle', t, 6), cx, fy, h * (1 + k * 0.05));
      const mask = g.createRadialGradient(cx, fy - h * 0.75, h * 0.15, cx, fy - h * 0.4, h * 0.9); mask.addColorStop(0, 'rgba(3,2,3,0)'); mask.addColorStop(1, 'rgba(3,2,3,0.85)'); g.fillStyle = mask; g.fillRect(0, 0, W, H);
    } else if (mode === 'stage') {
      const fy = H * 0.84; g.save(); g.globalCompositeOperation = 'lighter'; const floor = g.createRadialGradient(cx, fy, 0, cx, fy, W * 0.5); floor.addColorStop(0, 'rgba(255,40,40,0.55)'); floor.addColorStop(1, 'rgba(120,0,0,0)'); g.fillStyle = floor; g.save(); g.translate(cx, fy); g.scale(1, 0.18); g.translate(-cx, -fy); g.fillRect(0, fy - W * 0.5, W, W); g.restore();
        const cone = g.createLinearGradient(0, 0, 0, fy); cone.addColorStop(0, 'rgba(255,30,30,0.3)'); cone.addColorStop(1, 'rgba(255,30,30,0.05)'); g.fillStyle = cone; g.beginPath(); g.moveTo(cx - W * 0.05, 0); g.lineTo(cx + W * 0.05, 0); g.lineTo(cx + W * 0.3, fy); g.lineTo(cx - W * 0.3, fy); g.closePath(); g.fill(); g.restore();
      const n = clipLen(a, 'Attack1'), fr = Math.min(n - 1, Math.floor(k * n * 1.2)), x = lerp(W * 0.25, W * 0.72, easeOut(k)), z = Math.sin(clamp01(k * 1.2) * Math.PI) * H * 0.18;
      for (let i = 4; i >= 1; i--) silAt(g, a, 'Attack1', 1, fr, x - i * W * 0.04, fy - z, H * 0.42, 'rgba(255,40,40,' + (0.12 * (5 - i) / 4) + ')');
      actorAt(g, a, 'Attack1', 1, fr, x, fy - z, H * 0.42); g.fillStyle = 'rgba(255,0,0,0.25)'; g.globalCompositeOperation = 'multiply'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
    } else if (mode === 'glow') {
      closeupBody(g, a, k, t, cx, H * 0.55, H * 0.24, 2, false, 'rgba(10,6,14,1)', 'rgba(0,0,0,1)', 0, { zoom: 1.0 + k * 0.25 });
      g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, 0, W, H);
      const px = cx + H * 0.16, py = H * 0.52, gk = easeOut(clamp01(k * 1.4)), col = sh.col || [180, 90, 255];
      g.save(); g.globalCompositeOperation = 'lighter';
      const lit = g.createRadialGradient(px, py, 0, px, py, H * 0.55 * gk); lit.addColorStop(0, rgba(col, 0.55)); lit.addColorStop(1, rgba(col, 0)); g.fillStyle = lit; g.fillRect(0, 0, W, H);
      const core = g.createRadialGradient(px, py, 0, px, py, H * 0.05 * (0.5 + gk)); core.addColorStop(0, 'rgba(255,255,255,1)'); core.addColorStop(0.4, rgba(col, 0.9)); core.addColorStop(1, rgba(col, 0)); g.fillStyle = core; g.fillRect(px - H * 0.1, py - H * 0.1, H * 0.2, H * 0.2);
      g.fillStyle = rgba(col, 0.5 * gk); g.fillRect(0, py - H * 0.003, W, H * 0.006); g.fillStyle = 'rgba(255,255,255,' + 0.7 * gk + ')'; g.fillRect(px - W * 0.15 * gk, py - 1, W * 0.3 * gk, 2);
      g.restore();
      if (k > 0.9) { g.fillStyle = 'rgba(255,255,255,' + ((k - 0.9) * 10) + ')'; g.fillRect(0, 0, W, H); }
    }
  }

  // ---- JOURNEY (one unbroken take): a body dissolving into sand, dunes rushing below, the storm, an eye, the stars, the tomb
  function drawJourney(g, W, H, sh, k, t) {
    if (sh.span) k = sh.span[0] + k * (sh.span[1] - sh.span[0]);
    const a = sh.who, gold = sh.col || [255, 200, 110], ph = (a0, a1) => clamp01((k - a0) / (a1 - a0));
    const p0 = 1 - ph(0.18, 0.26), p1 = ph(0.18, 0.26) * (1 - ph(0.46, 0.52)), p2 = ph(0.46, 0.52) * (1 - ph(0.64, 0.68)), p3 = ph(0.64, 0.68) * (1 - ph(0.86, 0.9)), p4 = ph(0.86, 0.9);
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    if (p0 > 0) { g.save(); g.globalAlpha = p0; const bg = g.createRadialGradient(W / 2, H * 0.5, 0, W / 2, H * 0.5, W * 0.6); bg.addColorStop(0, '#3a2a14'); bg.addColorStop(1, '#0a0602'); g.fillStyle = bg; g.fillRect(0, 0, W, H); breakApart(g, a, W * 0.45, H * 0.86, H * 0.6, 'sand', ph(0.02, 0.24), t); g.restore(); }
    if (p1 > 0) { // dunes rushing toward the camera
      g.save(); g.globalAlpha = p1; const sky = g.createLinearGradient(0, 0, 0, H * 0.5); sky.addColorStop(0, '#3a2412'); sky.addColorStop(1, '#f0b060'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,240,200,0.9)'; g.beginPath(); g.arc(W * 0.62, H * 0.42, H * 0.07, 0, TAU); g.fill();
      for (let L = 0; L < 7; L++) { const d = (L + (t * 1.2 % 1)) / 7, y = H * (0.45 + d * d * 0.6), amp = H * 0.04 * (0.4 + d * 2), off = t * (0.3 + d * 2.5);
        g.fillStyle = rgba(mix([200, 140, 70], [60, 34, 14], d), 1); g.beginPath(); g.moveTo(0, H); for (let i = 0; i <= 40; i++) { const x = i / 40 * W; g.lineTo(x, y - amp * Math.sin(x / W * 4 + off + L) - amp * 0.4 * Math.sin(x / W * 9 + L)); } g.lineTo(W, H); g.closePath(); g.fill(); }
      g.strokeStyle = 'rgba(255,220,160,0.35)'; g.lineWidth = 1.5; g.beginPath(); for (let i = 0; i < 70; i++) { const y = hr(i + 4200) * H * 0.9, x = ((hr(i + 4201) * W + t * W * 1.5) % (W + 100)) - 50; g.moveTo(x, y); g.lineTo(x + 40, y + 4); } g.stroke(); g.restore(); }
    if (p2 > 0) { // the storm opens an eye
      g.save(); g.globalAlpha = p2; g.fillStyle = '#2a1a0c'; g.fillRect(0, 0, W, H); clouds(g, W, H, t * 3, 14, H * 0.05, H * 0.95, [40, 26, 12], [190, 130, 60], W * 0.15, 61);
      const ek = ph(0.5, 0.64), ew = W * 0.42, eh = H * 0.22 * easeOut(ek);
      g.save(); g.beginPath(); g.moveTo(W / 2 - ew, H / 2); g.quadraticCurveTo(W / 2, H / 2 - eh * 2, W / 2 + ew, H / 2); g.quadraticCurveTo(W / 2, H / 2 + eh * 2, W / 2 - ew, H / 2); g.closePath(); g.fillStyle = '#0a0602'; g.fill(); g.clip();
      g.globalCompositeOperation = 'lighter'; for (let r = 0; r < 8; r++) { g.strokeStyle = rgba(gold, 0.7 - r * 0.08); g.lineWidth = H * 0.008; g.beginPath(); g.arc(W / 2, H / 2, H * (0.06 + r * 0.025) * (1 + ph(0.6, 0.68) * 4), 0, TAU); g.stroke(); }
      const core = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, H * 0.06); core.addColorStop(0, 'rgba(255,255,230,1)'); core.addColorStop(1, rgba(gold, 0)); g.fillStyle = core; g.fillRect(0, 0, W, H); g.restore(); g.restore(); }
    if (p3 > 0) { // through the pupil: a rush of gold stars
      g.save(); g.globalAlpha = p3; g.fillStyle = '#05030a'; g.fillRect(0, 0, W, H);
      const neb = g.createRadialGradient(W * 0.6, H * 0.4, 0, W * 0.6, H * 0.4, W * 0.6); neb.addColorStop(0, 'rgba(160,90,40,0.5)'); neb.addColorStop(1, 'rgba(20,10,30,0)'); g.fillStyle = neb; g.fillRect(0, 0, W, H);
      g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 160; i++) { const an = hr(i + 4300) * TAU, d0 = hr(i + 4301), q = (d0 + t * 0.6) % 1, r = q * q * W * 0.8; const x = W / 2 + Math.cos(an) * r, y = H / 2 + Math.sin(an) * r; g.strokeStyle = 'rgba(255,220,160,' + q + ')'; g.lineWidth = 1 + q * 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(an) * r * 0.1, y + Math.sin(an) * r * 0.1); g.stroke(); } g.restore(); g.restore(); }
    if (p4 > 0) { // the tomb at dusk, and him
      g.save(); g.globalAlpha = p4; const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#120a14'); sky.addColorStop(0.7, '#a8582a'); sky.addColorStop(1, '#2a140a'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
      g.fillStyle = '#0a0503'; g.beginPath(); g.moveTo(W * 0.3, H * 0.82); g.lineTo(W * 0.5, H * 0.3); g.lineTo(W * 0.7, H * 0.82); g.closePath(); g.fill(); g.fillRect(0, H * 0.82, W, H * 0.2);
      g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rgba(gold, 0.6); g.fillRect(W * 0.48, H * 0.62, W * 0.04, H * 0.2); g.restore();
      silAt(g, a, 'Idle', 2, frOf(a, 'Idle', t, 6), W / 2, H * 0.82, H * 0.3 * (0.7 + ph(0.88, 1) * 0.3), '#050302', rgba(gold, 1));
      g.restore(); }
  }

  // ---- NEON (the dreamy edit): violet and cyan, a HUD scanning, glitch slices, a pale moon with spaced letters, a fall through stars
  function drawNeon(g, W, H, sh, k, t) {
    const a = sh.who, mode = sh.mode, cy = [80, 240, 255], mg = [255, 70, 220];
    const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#0a0620'); bg.addColorStop(1, '#1a0a2e'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    if (mode === 'scan') {
      const fy = H * 0.87, h = H * 0.6, x = W * 0.5, fr = frOf(a, 'Idle', t, 7);
      silAt(g, a, 'Idle', 2, fr, x - H * 0.008, fy, h, rgba(cy, 0.85)); silAt(g, a, 'Idle', 2, fr, x + H * 0.008, fy, h, rgba(mg, 0.85)); actorAt(g, a, 'Idle', 2, fr, x, fy, h, { alpha: 0.85 });
      g.strokeStyle = rgba(cy, 0.9); g.lineWidth = 2; const bx0 = x - h * 0.4, by0 = fy - h * 1.02, bw = h * 0.8, bh = h * 1.05, L = h * 0.08;
      for (const [px, py, dx, dy] of [[bx0, by0, 1, 1], [bx0 + bw, by0, -1, 1], [bx0, by0 + bh, 1, -1], [bx0 + bw, by0 + bh, -1, -1]]) { g.beginPath(); g.moveTo(px + dx * L, py); g.lineTo(px, py); g.lineTo(px, py + dy * L); g.stroke(); }
      const sy = by0 + ((t * 0.6) % 1) * bh; g.fillStyle = rgba(cy, 0.35); g.fillRect(bx0, sy, bw, 2);
      g.font = '600 ' + Math.round(H * 0.022) + 'px monospace'; g.fillStyle = rgba(cy, 0.8); g.textAlign = 'left';
      for (let i = 0; i < 9; i++) g.fillText(['ID', 'SOUL', 'GATE', 'CROWN', 'BOUND', 'AGE', 'KIN', 'WILL', 'THREAT'][i] + '  ' + Math.floor(hr(i + Math.floor(t * 6)) * 99999).toString(16).toUpperCase(), bx0 + bw + H * 0.03, by0 + H * 0.05 + i * H * 0.035);
      g.fillStyle = rgba(mg, 0.85); g.fillText('▲ THREAT: ABSOLUTE', bx0, by0 - H * 0.02);
    } else if (mode === 'moon') {
      const R = H * 0.6, mx = W / 2, my = H * 1.05; const glow = g.createRadialGradient(mx, my, R * 0.9, mx, my, R * 1.6); glow.addColorStop(0, 'rgba(210,190,255,0.35)'); glow.addColorStop(1, 'rgba(210,190,255,0)'); g.fillStyle = glow; g.fillRect(0, 0, W, H);
      const md = g.createRadialGradient(mx - R * 0.3, my - R * 0.4, R * 0.1, mx, my, R); md.addColorStop(0, '#f4eefe'); md.addColorStop(1, '#9a8cc0'); g.fillStyle = md; g.beginPath(); g.arc(mx, my, R, 0, TAU); g.fill();
      g.save(); g.beginPath(); g.arc(mx, my, R, 0, TAU); g.clip(); for (let i = 0; i < 20; i++) { g.fillStyle = 'rgba(120,100,170,' + (0.08 + hr(i + 4400) * 0.1) + ')'; g.beginPath(); g.arc(mx + (hr(i + 4401) - 0.5) * R * 1.8, my - hr(i + 4402) * R, R * (0.02 + hr(i + 4403) * 0.05), 0, TAU); g.fill(); } g.restore();
      silAt(g, a, 'Idle', 2, frOf(a, 'Idle', t, 6), W * 0.5, H * 0.5 + Math.sin(t * 1.5) * H * 0.01, H * 0.12, '#0a0620', rgba(cy, 0.9));
    } else if (mode === 'fall') {
      g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 120; i++) { const x = hr(i + 4500) * W, y = ((hr(i + 4501) * H - t * H * (0.6 + hr(i) * 1.5)) % H + H) % H, l = H * (0.02 + hr(i + 4502) * 0.08); g.strokeStyle = i % 3 ? rgba(cy, 0.5) : rgba(mg, 0.5); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + l); g.stroke(); } g.restore();
      const x = W / 2 + Math.sin(t * 0.8) * W * 0.04, y = H * 0.7; g.save(); g.translate(x, y - H * 0.18); g.rotate(Math.sin(t * 0.7) * 0.4 + k * 0.6); g.translate(-x, -(y - H * 0.18));
      silAt(g, a, 'TakeDamage', 2, 1, x, y, H * 0.32, rgba(mg, 0.9)); actorAt(g, a, 'TakeDamage', 2, 1, x + 2, y, H * 0.32, { alpha: 0.9 }); g.restore();
    }
    // HUD frame, scanlines, glitch slices
    g.fillStyle = 'rgba(0,0,0,0.18)'; for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
    if (hr(Math.floor(t * 14)) < 0.35) { const cv = g.canvas, n = 4; for (let i = 0; i < n; i++) { const y = hr(i + Math.floor(t * 14) * 7) * H, hh = H * (0.01 + hr(i + 9) * 0.05), dx = (hr(i + 3 + Math.floor(t * 14)) - 0.5) * W * 0.08; g.drawImage(cv, 0, y, cv.width, hh, dx, y, cv.width, hh); } }
    if (sh.text) { const L = sh.text, sz = Math.round(H * 0.075), sp = H * lerp(0.02, 0.09, ease(k)); g.font = '700 ' + sz + 'px Outfit, sans-serif'; g.textBaseline = 'middle'; const ws = L.split('').map((c) => g.measureText(c).width), tot = ws.reduce((p, q) => p + q, 0) + sp * (L.length - 1); let x = W / 2 - tot / 2;
      L.split('').forEach((c, i) => { const ap = clamp01((k - i * 0.04) * 4); g.globalAlpha = ap; g.fillStyle = '#ffffff'; g.shadowColor = rgba(cy, 1); g.shadowBlur = sz * 0.4; g.fillText(c, x, H * (sh.textY || 0.42)); x += ws[i] + sp; }); g.globalAlpha = 1; g.shadowBlur = 0; }
  }

  // ---- INK (the psychic abstract): white ink morphing on black, scattered letters, eyes in the dark, the white void
  function drawInk(g, W, H, sh, k, t) {
    const mode = sh.mode;
    g.fillStyle = mode === 'void' ? '#000' : '#000'; g.fillRect(0, 0, W, H);
    if (mode === 'blots') {
      const tmp = C.inkCv || (C.inkCv = document.createElement('canvas')); const w2 = Math.ceil(W / 4), h2 = Math.ceil(H / 4); if (tmp.width !== w2) { tmp.width = w2; tmp.height = h2; }
      const x = tmp.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, w2, h2); x.fillStyle = '#fff';
      for (let i = 0; i < 14; i++) { const an = hr(i + 4600) * TAU + t * (0.4 + hr(i + 4601)), d = (0.1 + hr(i + 4602) * 0.35) * w2 * (0.6 + 0.4 * Math.sin(t * 0.8 + i)); x.beginPath(); x.arc(w2 / 2 + Math.cos(an) * d, h2 / 2 + Math.sin(an) * d * 0.6, h2 * (0.06 + hr(i + 4603) * 0.12) * (0.5 + k), 0, TAU); x.fill(); }
      g.save(); g.imageSmoothingEnabled = true; if ('filter' in g) g.filter = 'blur(' + Math.round(H * 0.02) + 'px) contrast(30)'; g.drawImage(tmp, 0, 0, W, H); g.filter = 'none'; g.restore();
    }
    if (mode === 'eyes') {
      for (let i = 0; i < (sh.pairs || 1); i++) { const ex = W * (sh.pairs > 1 ? 0.2 + hr(i + 4700) * 0.6 : 0.5), ey = H * (sh.pairs > 1 ? 0.25 + hr(i + 4701) * 0.5 : 0.48), s = H * (sh.pairs > 1 ? 0.012 : 0.04), op = Math.sin(t * 1.3 + i * 2) > 0.95 ? 0.1 : clamp01((k - i * 0.05) * 4);
        g.save(); g.globalCompositeOperation = 'lighter'; for (const sx of [-1, 1]) { const gx = ex + sx * s * 2.2, gl = g.createRadialGradient(gx, ey, 0, gx, ey, s * 4); gl.addColorStop(0, 'rgba(255,255,255,' + 0.5 * op + ')'); gl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.fillRect(gx - s * 4, ey - s * 4, s * 8, s * 8); g.fillStyle = 'rgba(255,255,255,' + op + ')'; g.beginPath(); g.ellipse(gx, ey, s, s * 0.45, sx * 0.2, 0, TAU); g.fill(); } g.restore(); }
    }
    if (mode === 'void') {
      const R = H * (0.3 + ease(k) * 0.12); g.fillStyle = '#f2f0ea'; g.beginPath(); for (let i = 0; i <= 60; i++) { const an = i / 60 * TAU, rr = R * (1 + Math.sin(an * 7 + t * 3) * 0.01); g.lineTo(W / 2 + Math.cos(an) * rr, H / 2 + Math.sin(an) * rr); } g.closePath(); g.fill();
      if (sh.who) silAt(g, sh.who, 'Idle', 2, frOf(sh.who, 'Idle', t, 6), W / 2, H / 2 + R * 0.25 + Math.sin(t * 1.4) * H * 0.01, H * 0.14, '#000');
      g.fillStyle = '#000'; for (let i = 0; i < 18; i++) { const an = hr(i + 4800) * TAU, d = R * (1.05 + hr(i + 4801) * 0.6), r = H * (0.004 + hr(i + 4802) * 0.02); g.beginPath(); g.arc(W / 2 + Math.cos(an) * d, H / 2 + Math.sin(an) * d, r, 0, TAU); g.fillStyle = '#f2f0ea'; g.fill(); }
    }
    if (sh.letters) { // scattered letters, each in its own place
      const L = sh.letters.split(''); g.font = '500 ' + Math.round(H * 0.05) + 'px Outfit, sans-serif'; g.textBaseline = 'middle';
      L.forEach((c, i) => { if (c === ' ') return; const ap = clamp01((k - i * 0.06) * 5) * (hr(i + Math.floor(t * 8)) < 0.1 ? 0.3 : 1); g.globalAlpha = ap; g.fillStyle = '#fff'; g.fillText(c, W * (0.18 + i / L.length * 0.64) + (hr(i + 4900) - 0.5) * W * 0.03, H * (0.2 + (hr(i + 4901) - 0.5) * 0.08)); });
      g.globalAlpha = 1; g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(W * 0.15, H * 0.25); g.lineTo(W * 0.15 + W * 0.7 * clamp01(k * 2), H * 0.25); g.stroke();
    }
    if (sh.data) { g.font = '600 ' + Math.round(H * 0.018) + 'px monospace'; g.fillStyle = '#ff3b3b'; for (let i = 0; i < 6; i++) g.fillText('x ' + Math.floor(hr(i + Math.floor(t * 10)) * 9999) + '  y ' + Math.floor(hr(i + 3 + Math.floor(t * 10)) * 9999), W * (0.1 + hr(i + 5000) * 0.75), H * (0.6 + hr(i + 5001) * 0.3)); }
  }

  // ---- RAIN (the underdog): night rain, the hero down on one knee, words over the picture, the name roaring behind him as he rises
  function drawRain(g, W, H, sh, k, t) {
    const a = sh.who, col = sh.col || [90, 110, 220];
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0a0c22'); bg.addColorStop(1, '#1c1840'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    if (sh.giant) { const sz = Math.round(H * 0.42); g.save(); g.font = '800 ' + sz + 'px ' + SERIF; g.textBaseline = 'middle'; g.fillStyle = 'rgba(200,210,255,' + (0.25 + 0.15 * clamp01(k * 3)) + ')'; const w = g.measureText(sh.giant + ' ').width, off = (t * W * 0.05) % w; for (let x = -off; x < W; x += w) g.fillText(sh.giant, x, H * 0.45); g.restore(); }
    if (sh.crowd) { const n = sh.crowd.length; sh.crowd.forEach((p, i) => { const x = (i + 0.5) / n * W, j = Math.abs(Math.sin(t * 6 + i)) * H * 0.02; g.save(); g.beginPath(); g.rect(i / n * W + 2, H * 0.12, W / n - 4, H * 0.76); g.clip(); g.fillStyle = rgba(mix(col, [255, 230, 200], 0.3), 0.25); g.fillRect(i / n * W, 0, W / n, H); actorAt(g, p, i % 2 ? 'Attack1' : 'Taunt', 2, frOf(p, i % 2 ? 'Attack1' : 'Taunt', t + i, 9), x, H * 1.12 - j, H * 0.8); g.restore(); }); }
    if (a) {
      const kneel = sh.kneel && !(sh.rise && k > 0.45), clip = kneel ? 'TakeDamage' : (sh.roar ? 'Taunt' : 'Idle'), fr = kneel ? Math.min(clipLen(a, clip) - 1, 2) : frOf(a, clip, t, sh.roar ? 10 : 7);
      const h = H * (sh.close ? 0.95 : 0.52) * (kneel ? 0.92 : 1) * (sh.rise ? 1 + easeOut(clamp01((k - 0.4) / 0.4)) * 0.08 : 1);
      actorAt(g, a, clip, 2, fr, W / 2, H * (sh.close ? 1.22 : 0.87), h);
      g.fillStyle = rgba(col, 0.28); g.globalCompositeOperation = 'multiply'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
    }
    g.strokeStyle = 'rgba(190,200,255,0.35)'; g.lineWidth = Math.max(1, H * 0.0018); g.beginPath(); for (let i = 0; i < 220; i++) { const x = ((hr(i + 5100) * (W + 100) - t * 220) % (W + 100) + W + 100) % (W + 100) - 50, y = ((hr(i + 5101) * (H + 60) + t * 1700) % (H + 60)) - 30; g.moveTo(x, y); g.lineTo(x - 5, y + 24); } g.stroke();
    if (sh.words) sh.words.forEach((w, i) => { const ap = clamp01((t - w.at) * 6) * (w.out && t > w.out ? clamp01(1 - (t - w.out) * 5) : 1); if (ap <= 0) return; g.save(); g.globalAlpha = ap; g.font = '800 ' + Math.round(H * (w.size || 0.07)) + 'px Outfit, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,0.8)'; g.shadowBlur = 12; g.fillText(w.text, W / 2, H * (w.y || 0.5)); g.restore(); });
  }
  // ---- CITY (the refugees): a ruined skyline at dusk, smoke, a lantern-lit crowd looking up
  function drawCity(g, W, H, sh, k, t) {
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#140c1e'); sky.addColorStop(0.65, '#7a3a3a'); sky.addColorStop(1, '#1a0e10'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    smoke(g, W, H, t, 'rgba(40,24,30,A)', 12);
    const z = 1 + ease(k) * 0.06; g.save(); g.translate(W / 2, H); g.scale(z, z); g.translate(-W / 2, -H);
    for (let L = 0; L < 3; L++) { g.fillStyle = ['#2a1820', '#1a0e14', '#0a0508'][L]; let x = -20; while (x < W + 20) { const bw = W * (0.04 + hr(x * 7 + L) * 0.06), bh = H * (0.15 + hr(x * 3 + L * 5) * 0.3) * (1 - L * 0.15), y = H * (0.75 + L * 0.06); g.fillRect(x, y - bh, bw, bh + H); if (hr(x + L) < 0.4) { g.beginPath(); g.moveTo(x, y - bh); g.lineTo(x + bw / 2, y - bh - H * 0.06); g.lineTo(x + bw, y - bh); g.fill(); } if (L === 2) for (let w = 0; w < 3; w++) if (hr(x * 5 + w) < 0.3) { g.fillStyle = 'rgba(255,170,80,' + (0.5 + 0.3 * Math.sin(t * 4 + x)) + ')'; g.fillRect(x + bw * 0.3, y - bh + H * 0.03 + w * H * 0.05, bw * 0.15, H * 0.02); g.fillStyle = '#0a0508'; } x += bw + W * 0.005; } }
    g.restore();
    if (sh.crowd) sh.crowd.forEach((p, i) => { const x = W * (0.1 + i / (sh.crowd.length - 1) * 0.8), y = H * (0.98 + (i % 2) * 0.03); silAt(g, p, 'Idle', i % 2 ? 1 : 3, frOf(p, 'Idle', t + i, 6), x, y, H * 0.24, '#060305', 'rgba(255,170,90,0.6)', i % 2); });
  }
  // ---- a boss's death: the body comes apart its own way
  function drawBreak(g, W, H, sh, k, t) {
    const bgc = { shatter: ['#1a0e08', '#3a1a10'], dust: ['#050304', '#1a1206'], sand: ['#2a1a0a', '#6a4220'], glitch: ['#0a0620', '#1a0a2e'], ink: ['#f2f0ea', '#d8d4cc'] }[sh.mode];
    const bg = g.createRadialGradient(W / 2, H * 0.5, 0, W / 2, H * 0.5, W * 0.7); bg.addColorStop(0, bgc[1]); bg.addColorStop(1, bgc[0]); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    if (sh.mode === 'ink') { const R = H * 2 * easeOut(clamp01((k - 0.35) / 0.6)); g.fillStyle = '#000'; g.beginPath(); for (let i = 0; i <= 50; i++) { const an = i / 50 * TAU, rr = R * (1 + Math.sin(an * 9 + t * 4) * 0.08); g.lineTo(W / 2 + Math.cos(an) * rr, H * 0.55 + Math.sin(an) * rr); } g.closePath(); g.fill(); }
    breakApart(g, sh.who, W / 2, H * 0.86, H * 0.58, sh.mode, k, t, sh.col);
    if (sh.mode === 'glitch') { g.fillStyle = 'rgba(0,0,0,0.2)'; for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1); }
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
    Object.assign(C, { on: true, loading: true, t: 0, done, parts: [], shake: 0, flash: 0, flashCol: '#fff', bolts: [], cued: {}, shots: [], banners: [], fall: {}, cracks: [], crackShot: -1, rgb: 0 });
    let def = null;
    try { def = await build(opts || {}); C.shots = def.shots; C.total = C.shots.reduce((a, s) => a + s.dur, 0); }
    catch (e) { console.warn('cutscene skipped', e); C.end(); return; }
    C.loading = false;
    BB.music(def.music !== undefined ? def.music : (opts.music || 'boss'));
  };
  C.end = function () {
    if (!C.on) return;
    if (BB.score) BB.score('drone', false);
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
    else if (sh.kind === 'gates') drawGates(g, W, H, sh, k, lt);
    else if (sh.kind === 'oath') drawOath(g, W, H, sh, k, lt);
    else if (sh.kind === 'type') drawType(g, W, H, sh, k, lt);
    else if (sh.kind === 'arena') drawArena(g, W, H, sh, k, lt);
    else if (sh.kind === 'dust') drawDust(g, W, H, sh, k, lt);
    else if (sh.kind === 'journey') drawJourney(g, W, H, sh, k, lt);
    else if (sh.kind === 'neon') drawNeon(g, W, H, sh, k, lt);
    else if (sh.kind === 'ink') drawInk(g, W, H, sh, k, lt);
    else if (sh.kind === 'rain') drawRain(g, W, H, sh, k, lt);
    else if (sh.kind === 'city') drawCity(g, W, H, sh, k, lt);
    else if (sh.kind === 'break') drawBreak(g, W, H, sh, k, lt);
    else if (sh.kind === 'moon') drawMoon(g, W, H, sh, k, lt);
    else if (sh.kind === 'iris') drawIris(g, W, H, sh, k, lt);
    else if (sh.kind === 'montage') drawMontage(g, W, H, sh, k, lt);
    else if (sh.kind === 'tease') drawTease(g, W, H, sh, k, lt);
    else if (sh.kind === 'cloth') drawClothClose(g, W, H, sh, k, lt);
    else if (sh.kind === 'snap') drawSnap(g, W, H, sh, k, lt);
    else if (sh.kind === 'horde') drawHorde(g, W, H, sh, k, lt);
    else if (sh.kind === 'closeup') drawCloseup(g, W, H, sh, k, lt);
    else if (sh.kind === 'split') drawSplit(g, W, H, sh, k, lt);
    else if (sh.kind === 'impact') drawImpact(g, W, H, sh, k, lt);
    else if (sh.kind === 'title') drawTitle(g, W, H, sh, k, lt);
    else if (sh.kind === 'heart') drawHeart(g, W, H, sh, k, lt);
    g.restore();
    g.setTransform(1, 0, 0, 1, 0, 0);
    // lightning
    for (const b of C.bolts) { b.t += dt; if (b.t < 0.18) lightning(g, b.x * W, 0, b.y * H, 3 * dpr, '#e8f4ff', b.seed); }
    C.bolts = C.bolts.filter((b) => b.t < 0.2);
    // sparks and embers, screen space
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const p of C.parts) { p.t += dt; p.x += p.vx * dt * dpr; p.y += p.vy * dt * dpr; if (p.nograv) { /* straight in */ } else if (!p.drift) p.vy += 220 * dt; else p.vx += Math.sin(p.t * 3 + p.y) * 10 * dt; const a = Math.max(0, 1 - p.t / p.life); g.globalAlpha = a; g.fillStyle = p.col; g.beginPath(); g.arc(p.x, p.y, p.r * dpr, 0, 7); g.fill(); }
    g.restore(); C.parts = C.parts.filter((p) => p.t < p.life);
    // cracks spreading across the glass
    if (C.crackShot !== si) { C.cracks = []; C.crackShot = si; }
    for (const c of C.cracks) {
      c.t += dt; const grow = clamp01(c.t / 0.25);
      g.save(); g.strokeStyle = 'rgba(255,255,255,0.9)'; g.shadowColor = c.col || '#fff'; g.shadowBlur = 10; g.lineWidth = 2;
      for (const br of c.br) { g.beginPath(); g.moveTo(c.x * W, c.y * H); const n = Math.max(1, Math.floor(br.length * grow)); for (let i = 0; i < n; i++) g.lineTo(br[i][0] * W, br[i][1] * H); g.stroke(); }
      g.restore();
    }
    if (sh.grade) applyGrade(g, cv, W, H, sh.grade);
    // a colour split on the hardest moments
    if (C.rgb > 0) {
      const off = Math.round(C.rgb * 14 * dpr), tmp = C.tmp || (C.tmp = document.createElement('canvas'));
      if (tmp.width !== W || tmp.height !== H) { tmp.width = W; tmp.height = H; }
      const x = tmp.getContext('2d'); x.globalCompositeOperation = 'copy'; x.drawImage(cv, 0, 0); x.globalCompositeOperation = 'multiply'; x.fillStyle = '#ff2030'; x.fillRect(0, 0, W, H);
      g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.55; g.drawImage(tmp, off, 0);
      x.globalCompositeOperation = 'copy'; x.drawImage(cv, 0, 0); x.globalCompositeOperation = 'multiply'; x.fillStyle = '#20e0ff'; x.fillRect(0, 0, W, H);
      g.drawImage(tmp, -off, 0); g.restore();
      C.rgb = Math.max(0, C.rgb - dt * 2.2);
    }
    // film grain
    g.fillStyle = 'rgba(255,255,255,0.05)'; for (let i = 0; i < 260; i++) g.fillRect(Math.random() * W, Math.random() * H, dpr, dpr);
    // fades from and to black
    if (sh.fadeIn && lt < sh.fadeIn) { g.fillStyle = 'rgba(0,0,0,' + (1 - lt / sh.fadeIn) + ')'; g.fillRect(0, 0, W, H); }
    if (sh.fadeOut && lt > sh.dur - sh.fadeOut) { g.fillStyle = 'rgba(0,0,0,' + clamp01((lt - (sh.dur - sh.fadeOut)) / sh.fadeOut) + ')'; g.fillRect(0, 0, W, H); }
    // vignette, letterbox, flash
    const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.6)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
    const lb = H * 0.11; g.fillStyle = '#000'; g.fillRect(0, 0, W, lb); g.fillRect(0, H - lb, W, lb);
    if (C.flash > 0) { g.globalAlpha = Math.min(1, C.flash); g.fillStyle = C.flashCol; g.fillRect(0, 0, W, H); g.globalAlpha = 1; C.flash = Math.max(0, C.flash - dt * 3); }
    // the subtitle: one line in the lower bar, in and out with its shot
    if (sh.caption) {
      const two = sh.cap2 && lt >= sh.cap2[1] - 0.05, c0 = two ? sh.cap2[1] : sh.capAt || 0.3, c1 = two ? sh.cap2[2] : sh.capEnd || sh.dur - 0.25;
      const a = clamp01(Math.min((lt - c0) / 0.45, (c1 - lt) / 0.4));
      if (a > 0) {
        g.globalAlpha = a; g.font = 'italic 500 ' + Math.round(Math.max(14, H * 0.034)) + 'px Inter, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = '#eef1f6'; g.shadowColor = 'rgba(0,0,0,0.9)'; g.shadowBlur = 8; g.fillText(two ? sh.cap2[0] : sh.caption, W / 2, H - lb / 2 + (1 - a) * 6); g.shadowBlur = 0; g.globalAlpha = 1;
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
  const RGB = (v) => () => { C.rgb = Math.max(C.rgb, v); };
  const CRACK = (x, y, col) => () => { // jagged cracks from a point
    const br = [];
    for (let b = 0; b < 7; b++) { let a = b / 7 * Math.PI * 2 + Math.random() * 0.5, px = x, py = y; const pts = []; for (let i = 0; i < 9; i++) { a += (Math.random() - 0.5) * 0.7; const st = 0.025 + Math.random() * 0.04; px += Math.cos(a) * st; py += Math.sin(a) * st * 1.6; pts.push([px, py]); } br.push(pts); }
    C.cracks.push({ x, y, br, t: 0, col }); BB.sfx('slam');
  };
  const VOICE = (n, v) => () => BB.voice && BB.voice(n, v === undefined ? 1 : v, 0.9);
  const SCORE = (n, a) => () => BB.score && BB.score(n, a);
  const BEAT = () => () => { BB.sfx('herodie'); C.shake = Math.max(C.shake, 0.12); };

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
      // nine knights, one under each banner; the ninth banner is yours, and its knight is the Captain
      const pool = BB.ROSTER.filter((c) => c.role === 'hero'), knights = [];
      for (const arch of ['knight', 'paladin', 'spearman', 'barbarian', 'ranger', 'mage', 'monk', 'duelist']) { const c = pool.find((q) => q.arch === arch); if (c) knights.push({ hero: BB.newHero({ calling: c.calling, recruit: c.key, name: c.name }) }); }
      while (knights.length < 8) knights.push(capW);
      knights.push(capW);
      const later = [{ foe: 'ossric' }, { foe: 'sallow' }, { foe: 'regent' }];
      await cast([capW, vesh, ghoul, warden, skel].concat(knights, later));
      const cols = BB.BANNER_COLORS.concat(['#3a6a8a']);
      for (let i = 0; i < 9; i++) C.banners.push(Object.assign({}, i === 8 ? BB.save.banner : { color: cols[i], sigil: BB.SIGILS[i % BB.SIGILS.length], trim: '#e8c66a' }));
      const oathCols = C.banners.map((b) => { const c = rgbOf(b.color); return [rgba(mix(c, [255, 230, 190], 0.15), 1), rgba(mix(c, [0, 0, 0], 0.85), 1)]; });
      return { music: null, shots: [
        { kind: 'heart', dur: 3.0, cues: [[0, SCORE('drone')], [0.25, BEAT()], [1.2, BEAT()], [2.15, BEAT()]] },
        { kind: 'type', dur: 3.2, bg: 'white', lines: [{ text: 'THREE HUNDRED YEARS AGO', at: 0.3, size: 0.075, gap: 0.24 }, { text: 'Greenvale', at: 1.7, size: 0.042, y: 0.61, font: 2, w: 600 }] },
        { kind: 'type', dur: 4.0, lines: [{ text: 'NINE BANNERS STOOD', at: 0.3, size: 0.085, y: 0.42, gap: 0.26 }, { text: 'BETWEEN THE LIVING AND THE DEAD', at: 1.4, size: 0.055, y: 0.58, gap: 0.18, hi: 'DEAD' }] },
        { kind: 'triple', dur: 5.6, who: knights, cols: oathCols, banners: true, edge: '#ffe7a3', caption: 'Nine knights swore an oath to hold them.', capAt: 1.4, capEnd: 5.4, cues: [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => [0.05 + i * 0.075 * 5.6, i === 8 ? () => { BB.sfx('rally'); SHAKE(0.4)(); BB.score && BB.score('hit', 0.9); } : SFX('chime')]).concat([[4.0, SPARKS(90, '#ffe7a3', 0.5, 0.5, 700)], [4.0, SCORE('shimmer')]]) },
        { kind: 'closeup', dur: 2.4, grade: 'gold', bigword: 'OATH', bigcol: 'rgba(255,230,180,0.18)', who: knights[0], dir: 2, burst: 'rgba(255,220,150,0.09)', col1: 'rgba(220,160,60,1)', col2: 'rgba(30,18,6,1)', edge: '#ffe7a3', from: 0.4, caption: 'For three hundred years, they held.', capAt: 0.3,
          cues: [[0.15, SFX('rally')], [0.2, SPARKS(80, '#ffe7a3', 0.5, 0.5, 600)], [0.25, SHAKE(0.3)]] },
        { kind: 'type', dur: 2.4, lines: [{ text: 'THEN, ONE NIGHT', at: 0.25, size: 0.095, gap: 0.32 }], cues: [[0.6, SCORE('riser', 1.8)]] },
        { kind: 'gate', dur: 6.6, col: [150, 90, 255], rain: true, burstAt: 2.6, figures: [ghoul, warden, skel], caption: 'Then, one night, the Gravegates opened.', capAt: 2.9, capEnd: 5.6, cues: [
          [0, SCORE('drone')], [0.9, SCORE('riser', 1.7)], [0.1, SFX('charge')], [0.5, BOLT()], [1.2, SFX('charge')], [1.6, SHAKE(0.2)], [2.1, SHAKE(0.35)], [2.6, () => { SHAKE(1)(); BB.sfx('portal'); BB.sfx('burst'); BB.sfx('slam'); FLASH(0.9, '#e0d0ff')(); RGB(1)(); }], [0.6, VOICE('rumble', 0.8)], [3.2, VOICE('descent', 0.8)],
          [2.6, SCORE('braam', 1.2)], [2.62, SPARKS(220, '#c9a8ff', 0.5, 0.5, 1200)], [3.6, BOLT()], [4.4, SFX('boss')], [4.5, SHAKE(0.4)], [5.2, BOLT()], [5.8, SFX('charge')], [6.2, RGB(0.8)]] },
        { kind: 'closeup', dur: 3.6, who: vesh, dir: 2, rise: true, sil: [0.25, 0.6], rim: '#7dffb0', col1: 'rgba(40,120,70,1)', col2: 'rgba(4,16,10,1)', edge: '#7dffb0', label: 'VESH MORROW · THE BONE CANTOR', grade: 'green', bigword: 'VESH', bigcol: 'rgba(160,255,190,0.2)',
          caption: 'Out of the first one walked Vesh Morrow.', capAt: 0.5, cues: [[0, SFX('charge')], [0.4, VOICE('deep_groan', 0.9)], [0.3, EMBERS(50, '#7dffb0')], [1.4, SHAKE(0.3)]] },
        { kind: 'closeup', dur: 1.6, grade: 'manga', who: vesh, dir: 2, zoom: 2.3, dy: 0.35, col1: 'rgba(30,90,55,1)', col2: 'rgba(2,10,6,1)', edge: '#7dffb0', from: 0.05, caption: 'He opened his mouth —', capAt: 0.2, cues: [[0, SFX('charge')], [1.2, SHAKE(0.3)]] },
        { kind: 'closeup', dur: 2.6, who: vesh, dir: 2, waves: 'rgba(125,255,176,A)', burst: 'rgba(125,255,176,0.06)', col1: 'rgba(60,170,100,1)', col2: 'rgba(4,20,12,1)', edge: '#7dffb0', from: 0.2, caption: '— and sang.', capAt: 0.3,
          grade: 'green', cues: [[0, SCORE('braam', 1.2)], [0, SFX('boss')], [0, VOICE('deep_roar', 1)], [0.1, RGB(0.6)], [0.2, SHAKE(0.5)], [1.0, RGB(0.5)], [1.0, SHAKE(0.4)], [1.8, RGB(0.6)]] },
        { kind: 'impact', dur: 0.45, who: vesh, clip: 'Attack1', accent: '#7dffb0', cues: [[0, SHAKE(1)], [0, SFX('burst')], [0, FLASH(0.6, '#c8ffe0')], [0, RGB(1)]] },
        { kind: 'iris', dur: 1.4, who: vesh, col: [125, 255, 176], cues: [[0, SCORE('riser', 1.3)], [0, SFX('charge')]] },
        { kind: 'gates', dur: 3.6, caption: 'He was only the first.', capAt: 0.4, capEnd: 3.4,
          gates: [{ x: 0.2, dy: 0.02, sc: 0.42, col: [255, 80, 60], at: 0.3, who: later[0] }, { x: 0.52, dy: -0.04, sc: 0.3, col: [255, 196, 90], at: 0.48, who: later[1] }, { x: 0.82, dy: 0.06, sc: 0.55, col: [190, 150, 255], at: 0.66, who: later[2] }],
          cues: [[0, SFX('charge')], [1.08, SCORE('hit', 0.7)], [1.73, SCORE('hit', 0.8)], [2.38, SCORE('hit', 1)], [1.08, () => { BB.sfx('portal'); SHAKE(0.5)(); }], [1.73, () => { BB.sfx('portal'); SHAKE(0.4)(); }], [2.38, () => { BB.sfx('portal'); BB.sfx('slam'); SHAKE(0.7)(); RGB(0.6)(); }], [3.0, BOLT()], [2.5, VOICE('dino_bellow2', 0.8)]] },
        { kind: 'tease', dur: 4.6, caption: 'Three more gates opened that night. What stood in them is waiting still.', capAt: 0.5, capEnd: 4.4,
          gates: [{ land: 'GREENVALE', col: [255, 80, 60], who: later[0] }, { land: 'THE SUNSCAR', col: [255, 196, 90], who: later[1] }, { land: 'ALDMERE', col: [190, 150, 255], who: later[2] }],
          cues: [[0, () => { BB.sfx('portal'); SHAKE(0.4)(); }], [0, SCORE('boom')], [1.0, SCORE('boom')], [2.0, SCORE('boom')], [2.75, SCORE('braam', 1.1)], [1.0, () => { BB.sfx('portal'); SHAKE(0.4)(); }], [2.0, () => { BB.sfx('portal'); SHAKE(0.5)(); }], [0.75, VOICE('giant_laugh', 0.9)], [1.75, VOICE('deep_froth', 0.9)], [2.75, () => { BB.sfx('boss'); RGB(0.6)(); BB.voice && BB.voice('deep_roar', 1, 0.8); }]] },
        { kind: 'montage', dur: 3.4, caption: 'The dead heard him. Every grave in the vale broke open.', capAt: 0.2, capEnd: 3.3, frames: [
          { d: 0.32, who: ghoul, bg: '#9a0e0e', ink: '#000', eyes: '#ffe14a', voice: 'dino_horde' }, { d: 0.26, who: warden, bg: '#000', ink: '#000', rim: '#ff3b2b', eyes: '#ff3b2b', flip: true },
          { d: 0.26, word: 'RISE', wcol: '#ff2a2a', bg: '#000', lines: false }, { d: 0.26, who: skel, bg: '#e9e5dc', ink: '#000', size: 0.95 },
          { d: 0.26, who: ghoul, bg: '#0b3a14', ink: '#000', rim: '#62ff92', eyes: '#62ff92', flip: true }, { d: 0.26, who: warden, bg: '#9a0e0e', ink: '#000', size: 1.05, eyes: '#ffe14a' },
          { d: 0.26, who: skel, bg: '#000', ink: '#000', rim: '#c9a8ff', eyes: '#c9a8ff' }, { d: 0.3, word: 'THE DEAD', wsize: 0.3, wcol: '#ece9e2', bg: '#9a0e0e', lines: false, hit: true },
          { d: 1.22, who: vesh, bg: '#000', ink: '#000', rim: '#7dffb0', eyes: '#7dffb0', size: 0.9, voice: 'deep_roar' }] },
        { kind: 'montage', dur: 1.9, frames: [
          { d: 0.26, who: knights[0], clip: 'Attack1', bg: '#e9e5dc', ink: '#000', x: 0.38, dir: 1, sfx: 'slam', hit: true }, { d: 0.24, who: warden, clip: 'Attack1', bg: '#000', ink: '#fff', x: 0.62, dir: 3, sfx: 'slam' },
          { d: 0.24, who: knights[1], clip: 'Attack1', bg: '#9a0e0e', ink: '#000', x: 0.4, dir: 1, sfx: 'slam' }, { d: 0.24, who: ghoul, clip: 'Attack1', bg: '#e9e5dc', ink: '#000', x: 0.6, dir: 3, sfx: 'slam', hit: true },
          { d: 0.24, who: knights[3], clip: 'Attack1', bg: '#000', ink: '#fff', x: 0.4, dir: 1, sfx: 'slam' }, { d: 0.24, who: skel, clip: 'Attack1', bg: '#9a0e0e', ink: '#000', x: 0.6, dir: 3, sfx: 'slam' },
          { d: 0.44, who: ghoul, clip: 'Attack1', bg: '#000', ink: '#000', rim: '#ff3b2b', x: 0.5, dir: 2, size: 1.0, sfx: 'burst', hit: true }] },
        { kind: 'closeup', dur: 1.6, grade: 'red', who: knights[2], dir: 2, sil: [0.4, 0], rim: '#ff5a3a', col1: 'rgba(120,20,15,1)', col2: 'rgba(14,2,2,1)', edge: '#ff5a3a', from: 0.1, cues: [[0.5, SFX('herodie')], [0.5, SHAKE(0.4)]] },
        { kind: 'oath', mode: 'fall', dur: 5.4, who: knights, fallAt: [0.55, 1.0, 1.4, 1.75, 2.05, 2.32, 2.56, 2.78], caption: 'Eight banners fell before dawn.', capAt: 3.3, capEnd: 5.2,
          cues: [[0, SFX('flame')], [0.55, () => { BB.sfx('snap'); SHAKE(0.35)(); }], [1.0, () => { BB.sfx('snap'); SHAKE(0.35)(); }], [1.4, () => { BB.sfx('snap'); SHAKE(0.35)(); }], [1.75, () => { BB.sfx('snap'); SHAKE(0.35)(); }], [2.05, () => { BB.sfx('snap'); SHAKE(0.35)(); }], [2.32, () => { BB.sfx('snap'); SHAKE(0.35)(); }], [2.56, () => { BB.sfx('snap'); SHAKE(0.35)(); }], [2.78, () => { BB.sfx('snap'); SHAKE(0.6)(); }], [2.78, SCORE('hit', 1.1)], [2.85, RGB(0.6)], [3.0, EMBERS(50, '#ff8a3a')], [4.3, SFX('chime')]] },
        { kind: 'oath', mode: 'lone', dur: 4.4, who: knights, caption: 'One banner still stood.', capAt: 0.9, cues: [[0.5, SFX('chime')]] },
        { kind: 'moon', dur: 4.4, who: capW, banner: true, fig: 0.12, caption: 'Its bearer had no army left.', capAt: 0.6, cues: [[0.2, SCORE('drone')], [0.9, BEAT()], [2.1, BEAT()], [3.3, BEAT()]] },
        { kind: 'closeup', dur: 2.8, who: capW, dir: 2, sil: 1, rim: '#ffd27a', converge: '#ffcf7a', burst: 'rgba(255,190,85,0.05)', col1: 'rgba(150,90,40,1)', col2: 'rgba(20,10,4,1)', edge: '#ffbe55', from: 0, caption: 'But a banner remembers every oath sworn under it.', capAt: 0.3,
          bigword: 'OATH', bigcol: 'rgba(255,220,150,0.14)', cues: [[0, SFX('charge')], [0.2, SCORE('riser', 2.5)], [0.5, BEAT()], [1.2, BEAT()], [1.8, BEAT()], [2.2, BEAT()], [2.5, RGB(0.4)]] },
        { kind: 'closeup', dur: 2.6, who: capW, dir: 2, zoom: 1.2, sil: [0.05, 0.35], rim: '#ffbe55', burst: 'rgba(255,190,85,0.1)', col1: 'rgba(230,140,40,1)', col2: 'rgba(30,12,4,1)', edge: '#ffbe55', from: 0.15,
          cues: [[0, SCORE('braam', 1.2)], [0, SFX('rally')], [0.05, () => { FLASH(0.8, '#ffe2a0')(); RGB(0.8)(); SHAKE(0.6)(); }], [0.1, SPARKS(160, '#ffcf7a', 0.5, 0.5, 900)], [0.3, EMBERS(80, '#ffb347')]] },
        { kind: 'impact', dur: 0.5, who: capW, clip: 'Taunt', accent: '#ffbe55', cues: [[0, SHAKE(1)], [0, SFX('burst')], [0, FLASH(1)], [0, RGB(1)], [0.05, CRACK(0.5, 0.5, '#ffbe55')]] },
        { kind: 'oath', mode: 'renew', dur: 5.4, who: knights, caption: 'So the Captain raised it, and swore to build a new army.', capAt: 0.5, capEnd: 5.2,
          cues: [[0.4, SCORE('shimmer')], [0, () => { BB.sfx('rally'); BB.sfx('burst'); FLASH(0.6, '#ffe8b0')(); SHAKE(0.6)(); }], [0.05, SPARKS(160, '#ffcf7a', 0.5, 0.45, 900)], [0.3, EMBERS(70, '#ffcf7a')]].concat([0, 1, 2, 3, 4, 5, 6, 7].map((j) => [(0.18 + j * 0.07) * 5.4 + 0.1, SFX('chime')])).concat([[4.3, EMBERS(40, '#ffe0a0')]]) },
        { kind: 'type', dur: 2.6, lines: [{ text: 'RAISE YOUR BANNER', at: 0.25, size: 0.095, gap: 0.34, hi: 'BANNER', hiCol: '#ffbe55' }] },
        { kind: 'type', dur: 5.0, fadeOut: 0.8, lines: [{ text: 'BANNERBORN', at: 0.15, size: 0.16, w: 800, fly: true, col: '#ffcf7a', glow: '#ff9a2a' }, { text: 'Earn your heroes. Shut the Gravegates.', at: 1.6, size: 0.045, y: 0.66, font: 2, w: 600, gap: 0.12 }],
          cues: [[0, SCORE('riser', 0.85)], [0.95, SPARKS(200, '#ffcf7a', 0.5, 0.5, 1000)], [1.0, EMBERS(80, '#ffb347')], [1.0, CRACK(0.5, 0.5, '#ffbe55')], [4.2, SCORE('drone', false)]] },
      ] };
    },
    // before a boss: each one is shot in its own style
    async boss(o) {
      const M = o.stage, F = BB.FOES[M.boss], b = M.boss;
      const bossW = { foe: b }, heroW = { hero: leader() };
      const name = F.name.split(',')[0].toUpperCase(), epi = (F.name.split(',')[1] || '').trim();
      const skels = ['h/skeleton_001', 'h/skeleton_003', 'h/skeleton_010', 'h/skeleton_011', 'h/skeleton_014'].map((k) => ({ npcKey: k }));
      await cast([bossW, heroW, { foe: 'ghoul' }, { foe: 'necro' }].concat(skels));
      const clash = (col) => ({ kind: 'impact', dur: 0.45, who: heroW, who2: bossW, clip: 'Attack1', accent: col, cues: [[0, SCORE('braam', 1)], [0, SHAKE(1)], [0, SFX('slam')], [0, FLASH(0.9)]] });
      if (b === 'ossric') return { music: null, shots: [ // the arena: a crypt full of the dead chanting his name
        { kind: 'arena', dur: 3.4, boss: bossW, crowd: skels.concat([{ foe: 'ghoul' }]), bpm: 104, push: 0.1, grade: 'sepia', fadeIn: 0.4, cues: [[0, SCORE('drone')], [0.3, VOICE('dino_horde', 0.5)]] },
        { kind: 'arena', dur: 2.0, crowd: skels.concat([{ foe: 'ghoul' }]), crowdClose: true, pan: true, bpm: 104, chant: ['OSS', 'RIC'], grade: 'sepia', push: 0.04 },
        { kind: 'arena', dur: 1.7, boss: bossW, close: true, crowd: skels, bpm: 104, grade: 'sepia', cues: [[0.2, () => BB.foeVoice && BB.foeVoice({ kind: 'ossric', boss: true }, 'taunt')]] },
        { kind: 'arena', dur: 2.2, boss: bossW, roar: true, crowd: skels.concat([{ foe: 'ghoul' }]), bpm: 104, push: 0.16, grade: 'sepia', cues: [[0.6, SCORE('braam', 1.2)], [0.6, SHAKE(0.9)], [0.6, () => BB.foeVoice && BB.foeVoice({ kind: 'ossric', boss: true }, 'enrage')], [0.62, SPARKS(160, '#ffb070', 0.5, 0.4, 900)]] },
        { kind: 'type', dur: 2.4, lines: [{ text: name, at: 0.05, size: 0.18, w: 800, fly: true, col: '#ffcf9a', glow: '#ff5a2a' }, { text: epi.toUpperCase(), at: 1.0, size: 0.04, y: 0.66, spread: 0.6, col: '#ffb080' }], cues: [[2.2, SCORE('drone', false)]] },
        clash('#ff7a3a')] };
      if (b === 'kestrelfoe') return { music: null, shots: [ // the awakening: dust, a spotlight, a red stage, a violet light
        { kind: 'dust', mode: 'spot', dur: 3.2, who: bossW, fadeIn: 0.6, cues: [[0.2, SCORE('shimmer')], [1.6, SCORE('tick')], [2.2, SCORE('tick')], [2.6, SCORE('riser', 0.6)]] },
        { kind: 'dust', mode: 'stage', dur: 1.1, who: bossW, cues: [[0, SCORE('hit', 1)], [0, SHAKE(0.6)], [0, VOICE('hiss', 0.8)], [0, RGB(0.6)]] },
        { kind: 'dust', mode: 'glow', dur: 2.4, who: bossW, col: [255, 200, 110], cues: [[0, SCORE('riser', 2.2)], [2.2, SCORE('braam', 1.1)]] },
        { kind: 'type', dur: 2.2, lines: [{ text: 'KESTREL', at: 0.1, size: 0.05, spread: 1.4, col: '#ffd27a' }, { text: epi, at: 0.7, size: 0.035, y: 0.6, font: 2 }] },
        clash('#ffd27a')] };
      if (b === 'sallow') return { music: null, shots: [ // one unbroken take: sand, dunes, the storm's eye, the stars, the tomb
        { kind: 'journey', dur: 8.0, who: bossW, col: [255, 200, 110], fadeIn: 0.5, cues: [[0, SCORE('drone')], [0.3, VOICE('deep_froth', 0.7)], [1.6, SCORE('boom', 0.6)], [3.8, SCORE('riser', 1.4)], [5.2, VOICE('deep_groan', 0.8)], [5.4, SCORE('riser', 1.6)], [7.0, SCORE('braam', 1.2)]] },
        { kind: 'type', dur: 2.6, lines: [{ text: name, at: 0.05, size: 0.15, w: 800, fly: true, col: '#ffd27a', glow: '#ff9a2a' }, { text: epi, at: 1.0, size: 0.04, y: 0.66, font: 2, gap: 0.12 }], cues: [[2.4, SCORE('drone', false)]] },
        clash('#ffd27a')] };
      if (b === 'regent') return { music: null, shots: [ // the neon dream: a scan, a pale moon, a fall through the stars
        { kind: 'neon', mode: 'scan', dur: 3.0, who: bossW, fadeIn: 0.3, cues: [[0, SCORE('drone')], [0.4, SCORE('tick')], [0.8, SCORE('tick')], [1.2, SCORE('tick')], [1.8, () => BB.foeVoice && BB.foeVoice({ kind: 'regent', boss: true }, 'taunt')], [0, RGB(0.4)]] },
        { kind: 'neon', mode: 'moon', dur: 3.4, who: bossW, text: 'THE PALE REGENT', textY: 0.3, cues: [[0, SCORE('shimmer')], [1.6, SCORE('riser', 1.6)]] },
        { kind: 'neon', mode: 'fall', dur: 1.8, who: bossW, cues: [[0, SCORE('braam', 1.1)], [0, RGB(1)], [0, SHAKE(0.6)]] },
        { kind: 'type', dur: 2.0, lines: [{ text: 'R E G E N T', at: 0.05, size: 0.09, w: 800, col: '#c9a8ff', glow: '#ff46dc', gap: 0.08 }], cues: [[1.8, SCORE('drone', false)]] },
        clash('#c9a8ff')] };
      return { music: null, shots: [ // Vesh: ink, scattered letters, eyes in the dark, the white void
        { kind: 'ink', mode: 'blots', dur: 3.0, letters: 'v  e  s  h     m  o  r  r  o  w', fadeIn: 0.3, cues: [[0, SCORE('drone')], [0.5, SCORE('tick')], [1.1, SCORE('tick')], [1.7, SCORE('tick')], [2.4, SCORE('riser', 0.6)]] },
        { kind: 'ink', mode: 'eyes', dur: 1.8, pairs: 1, cues: [[0, SCORE('hit', 1)], [0.3, VOICE('deep_groan', 0.9)]] },
        { kind: 'ink', mode: 'eyes', dur: 1.2, pairs: 9, data: true, cues: [[0, SCORE('boom')], [0.6, SCORE('boom')]] },
        { kind: 'ink', mode: 'void', dur: 2.8, who: bossW, data: true, cues: [[0, SCORE('riser', 2.4)], [0.5, VOICE('deep_roar', 1)], [2.6, SCORE('braam', 1.2)], [2.6, FLASH(1)]] },
        { kind: 'montage', dur: 1.3, frames: [{ d: 0.3, who: bossW, bg: '#f2f0ea', ink: '#000', size: 1 }, { d: 0.25, word: 'VESH', wsize: 0.5, wcol: '#000', bg: '#f2f0ea', lines: false, hit: true }, { d: 0.75, who: bossW, bg: '#000', ink: '#000', rim: '#fff', eyes: '#fff', size: 0.9 }] },
        { kind: 'type', dur: 2.2, lines: [{ text: 'THE BONE CANTOR', at: 0.05, size: 0.06, spread: 0.6, col: '#f2f0ea' }], cues: [[2.0, SCORE('drone', false)]] },
        clash('#ffffff')] };
    },
    // a new chapter: each land opens its own way
    async chapter(o) {
      const ch = o.chapter, heroW = { hero: leader() }, roman = ['', 'I', 'II', 'III', 'IV'][ch.id];
      const folk = ['h/townsfolk_001', 'h/townsfolk_003', 'h/townsfolk_009', 'h/townsfolk_011', 'h/townsfolk_012', 'h/townsfolk_002'].map((k) => ({ npcKey: k }));
      await cast([heroW].concat(folk));
      const card = (col) => ({ kind: 'type', dur: 3.2, lines: [{ text: 'CHAPTER ' + roman, at: 0.05, size: 0.035, y: 0.36, spread: 0.7, col }, { text: ch.name.toUpperCase(), at: 0.1, size: ch.name.length > 14 ? 0.1 : 0.13, w: 800, fly: true, col, glow: col }, { text: ch.blurb, at: 1.1, size: 0.036, y: 0.65, font: 2, gap: 0.08 }], cues: [[2.9, SCORE('drone', false)]] });
      if (ch.id === 1) return { music: null, shots: [ // and yet, I must try
        { kind: 'rain', dur: 2.0, who: heroW, kneel: true, fadeIn: 0.5, words: [{ text: 'AND YET', at: 0.6 }], cues: [[0, SCORE('drone')], [0.6, SCORE('boom', 0.7)]] },
        { kind: 'rain', dur: 1.8, who: heroW, kneel: true, close: true, words: [{ text: 'I MUST TRY', at: 0.3 }], cues: [[0.3, SCORE('boom', 0.9)], [1.0, SCORE('riser', 0.8)]] },
        { kind: 'rain', dur: 2.4, who: heroW, kneel: true, rise: true, giant: 'GREENVALE', cues: [[0.9, SCORE('braam', 1.1)], [0.9, SHAKE(0.7)]] },
        { kind: 'rain', dur: 1.2, who: heroW, roar: true, close: true, cues: [[0, SFX('rally')], [0, RGB(0.5)]] },
        { kind: 'rain', dur: 1.4, crowd: folk.slice(0, 4), cues: [[0, SCORE('hit', 0.8)]] },
        card('#a8c8ff')] };
      if (ch.id === 2) return { music: null, shots: [
        { kind: 'journey', dur: 3.4, who: heroW, col: [255, 200, 110], fadeIn: 0.4, span: [0.24, 0.45], cues: [[0, SCORE('drone')], [2.4, SCORE('riser', 1.0)]] },
        card('#ffd27a')] };
      if (ch.id === 3) return { music: null, shots: [
        { kind: 'city', dur: 3.6, crowd: folk, fadeIn: 0.5, cues: [[0, SCORE('drone')], [1.0, SCORE('shimmer')], [2.6, SCORE('riser', 1.0)]] },
        { kind: 'montage', dur: 1.4, frames: folk.slice(0, 4).map((p, i) => ({ d: 0.35, who: p, bg: ['#3a1a20', '#000', '#7a3a3a', '#000'][i], ink: '#000', rim: '#ffb070', size: 0.9 })) },
        card('#ffb070')] };
      return { music: null, shots: [
        { kind: 'ink', mode: 'void', dur: 3.2, who: heroW, letters: 't h e    c a n t o r \' s    g a t e', fadeIn: 0.5, cues: [[0, SCORE('drone')], [1.2, SCORE('tick')], [1.8, SCORE('tick')], [2.6, SCORE('riser', 0.6)]] },
        { kind: 'ink', mode: 'eyes', dur: 1.4, pairs: 12, cues: [[0, SCORE('hit', 1)]] },
        card('#c9a8ff')] };
    },
    // a boss falls: the body comes apart its own way
    async bossDown(o) {
      const M = o.stage, F = BB.FOES[M.boss], boss = { foe: M.boss };
      const art = actorArt(boss); if (art.key) await BB.loadChar(art.key).catch(() => null);
      const mode = { ossric: 'shatter', kestrelfoe: 'dust', sallow: 'sand', regent: 'glitch', vesh: 'ink' }[M.boss] || 'dust';
      const col = { ossric: '#ffb070', kestrelfoe: '#ffd27a', sallow: '#ffd27a', regent: '#c9a8ff', vesh: '#000000' }[M.boss] || '#ffcf7a';
      return { music: null, shots: [
        { kind: 'impact', dur: 0.5, who: boss, clip: 'TakeDamage', dir: 3, accent: '#ffffff', cues: [[0, () => BB.foeVoice && BB.foeVoice({ kind: M.boss, boss: true }, 'die')], [0, SCORE('hit', 1.1)], [0, SHAKE(1)], [0, FLASH(1)]] },
        { kind: 'break', dur: 2.8, who: boss, mode, col: { kestrelfoe: '#ffd27a', sallow: '#d8b070' }[M.boss], cues: [[0, SCORE(mode === 'ink' ? 'riser' : 'boom', mode === 'ink' ? 2.4 : 1)], [0.2, SFX(mode === 'shatter' ? 'slam' : mode === 'glitch' ? 'cast' : 'flame')], [0, RGB(mode === 'glitch' ? 1 : 0)]] },
        { kind: 'type', dur: 2.6, lines: [{ text: F.name.split(',')[0].toUpperCase(), at: 0.05, size: 0.12, w: 800, fly: true, col: mode === 'ink' ? '#f2f0ea' : col, glow: col }, { text: 'HAS FALLEN', at: 0.9, size: 0.05, y: 0.62, spread: 0.5, col: '#ece9e2' }, { text: 'Stage ' + M.code + ' cleared', at: 1.4, size: 0.03, y: 0.72, font: 2 }], cues: [[0.9, SPARKS(100, col === '#000000' ? '#ffffff' : col, 0.5, 0.5, 650)]] },
      ] };
    },
  };
  C.has = (name) => !!SCENES[name];
  const skip = document.getElementById('cineSkip');
  if (skip) skip.addEventListener('click', (e) => { e.stopPropagation(); BB.sfx('click'); C.end(); });
})();
