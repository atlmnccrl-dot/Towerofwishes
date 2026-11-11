// VESPER — the game drawn at the screen's full resolution: clean layered arenas under the red moon,
// a glossy floor that reflects the fighters, crisp pixel characters, drawn (vector) effects, a slim
// HUD, touch controls with icons, dialogue beside the speaker, the boss card, and the cinematic
// pixel buffer laid over everything when a moon art plays.
(function () {
  const VS = window.VS, D = VS.DATA, A = VS.A, PX = VS.PX;
  const R = VS.R = { t: 0, cam: 0, shake: 0, flash: 0, flashCol: '255,255,255', fx: [], parts: [], floaters: [], touch: false, punch: 0 };
  // The pixel font everywhere (Adventurer): no synthetic bold, labels a touch larger to stay crisp.
  const FD = '"Adventurer", "Chakra Petch", system-ui, sans-serif', FB = FD;
  R.fd = (px) => `${Math.round(px * 1.15)}px ${FD}`;
  R.fb = (px) => `${Math.round(px * 1.15)}px ${FB}`;
  const RED = '#ff2a44';
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const mix = (c1, c2, k) => { const a = hex(c1), b = hex(c2); return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
  const rgba = (c, a) => { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; };
  R.mix = mix; R.rgba = rgba;
  R.SIDE_W = 560;   // the width of the side-on stage used by the title, menus and scenes

  // ---- canvas and scale ---------------------------------------------------------------------
  R.init = function (canvas) {
    R.canvas = canvas; R.ctx = canvas.getContext('2d', { alpha: false });
    R.resize(); window.addEventListener('resize', R.resize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', R.resize);
  };
  R.resize = function () {
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = window.innerWidth, h = window.innerHeight;
    R.canvas.width = Math.round(w * dpr); R.canvas.height = Math.round(h * dpr);
    R.canvas.style.width = w + 'px'; R.canvas.style.height = h + 'px';
    R.W = R.canvas.width; R.H = R.canvas.height; R.dpr = dpr;
    R.S = R.H / 150;                                   // device px per world px: the fighters are ~30% of the height
    R.k = dpr * clamp(h / 420, 0.85, 1.5) * (R.kScale || 1);   // UI unit (scaled by the text size option)
    R.floorY = Math.round(R.H * 0.8);
    R.ctx.imageSmoothingEnabled = false;
    for (const k in cache) delete cache[k];
    PX.fit(R.W / R.H);
  };
  R.toDev = (cx, cy) => ({ x: cx * R.dpr, y: cy * R.dpr });
  R.viewW = () => R.W / R.S;
  R.sx = (x) => (x - R.cam) * R.S;
  R.sy = (y) => R.floorY + y * 0.6 * R.S;

  // ---- cached pieces --------------------------------------------------------------------------
  const cache = {};
  function glow(col) {
    const k = 'glow' + col; if (cache[k]) return cache[k];
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, rgba(col, 1)); gr.addColorStop(0.4, rgba(col, 0.35)); gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return (cache[k] = c);
  }
  function shadowImg() {
    if (cache.shadow) return cache.shadow;
    const c = document.createElement('canvas'); c.width = 128; c.height = 32; const g = c.getContext('2d');
    g.scale(1, 0.25); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,0.7)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return (cache.shadow = c);
  }
  R.glowAt = function (ctx, col, x, y, r, a) { const ga = ctx.globalAlpha; ctx.globalAlpha = ga * a; ctx.drawImage(glow(col), x - r, y - r, r * 2, r * 2); ctx.globalAlpha = ga; };

  // ---- the arena ---------------------------------------------------------------------------------
  // Silhouette shapes, drawn as clean filled paths.
  const SH = {
    tower(g, x, b, w, h) { g.fillRect(x - w / 2, b - h, w, h); g.beginPath(); g.moveTo(x - w * 0.62, b - h); g.lineTo(x, b - h - w * 1.1); g.lineTo(x + w * 0.62, b - h); g.fill(); },
    arch(g, x, b, w, h) { g.beginPath(); g.rect(x - w / 2, b - h, w, h); g.moveTo(x + w * 0.3, b); g.lineTo(x + w * 0.3, b - h * 0.55); g.arc(x, b - h * 0.55, w * 0.3, 0, Math.PI, true); g.lineTo(x - w * 0.3, b); g.closePath(); g.fill('evenodd'); g.fillRect(x - w * 0.6, b - h - w * 0.08, w * 1.2, w * 0.1); },
    spire(g, x, b, w, h) { g.fillRect(x - w / 2, b - h * 0.55, w, h * 0.55); g.beginPath(); g.moveTo(x - w / 2, b - h * 0.55); g.lineTo(x, b - h); g.lineTo(x + w / 2, b - h * 0.55); g.fill(); },
    pine(g, x, b, w, h) { g.beginPath(); for (let i = 0; i < 3; i++) { const y0 = b - h * (0.15 + i * 0.26), ww = w * (1 - i * 0.24); g.moveTo(x - ww / 2, y0); g.lineTo(x, y0 - h * 0.42); g.lineTo(x + ww / 2, y0); } g.fill(); g.fillRect(x - w * 0.06, b - h * 0.18, w * 0.12, h * 0.18); },
    deadTree(g, x, b, w, h, seed) {
      g.beginPath(); g.moveTo(x - w * 0.08, b); g.lineTo(x - w * 0.03, b - h * 0.7); g.lineTo(x + w * 0.03, b - h * 0.7); g.lineTo(x + w * 0.08, b); g.fill();
      g.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const y0 = b - h * (0.35 + i * 0.1), dir = i % 2 ? 1 : -1, len = w * (0.5 - i * 0.05) * (0.7 + hash(seed, i) * 0.6);
        g.lineWidth = Math.max(1, w * 0.05 * (1 - i * 0.12)); g.beginPath(); g.moveTo(x, y0); g.quadraticCurveTo(x + dir * len * 0.5, y0 - len * 0.2, x + dir * len, y0 - len * 0.6); g.stroke();
      }
    },
    rock(g, x, b, w, h, seed) { g.beginPath(); g.moveTo(x - w / 2, b); for (let i = 0; i <= 5; i++) { const t = i / 5; g.lineTo(x - w / 2 + w * t, b - h * Math.sin(t * Math.PI) * (0.7 + hash(seed, i) * 0.4)); } g.lineTo(x + w / 2, b); g.fill(); },
    needle(g, x, b, w, h, seed) { g.beginPath(); g.moveTo(x - w / 2, b); g.lineTo(x - w * 0.12, b - h); g.lineTo(x + w * 0.1 * hash(seed, 1), b - h * 0.96); g.lineTo(x + w / 2, b); g.fill(); },
    pillar(g, x, b, w, h, seed) { g.fillRect(x - w / 2, b - h, w, h); g.fillRect(x - w * 0.7, b - h - w * 0.25, w * 1.4, w * 0.25); g.fillRect(x - w * 0.7, b - w * 0.2, w * 1.4, w * 0.2); },
    broken(g, x, b, w, h, seed) { g.beginPath(); g.moveTo(x - w / 2, b); g.lineTo(x - w / 2, b - h * 0.8); g.lineTo(x - w * 0.1, b - h * (0.9 + hash(seed, 2) * 0.1)); g.lineTo(x + w * 0.15, b - h * 0.78); g.lineTo(x + w / 2, b - h * 0.86); g.lineTo(x + w / 2, b); g.fill(); g.fillRect(x - w * 0.7, b - w * 0.2, w * 1.4, w * 0.2); },
    temple(g, x, b, w, h) { for (let i = 0; i < 5; i++) { const ww = w * (1 - i * 0.17); g.fillRect(x - ww / 2, b - h * (i + 1) / 5, ww, h / 5 + 1); } g.fillRect(x - w * 0.06, b - h * 1.25, w * 0.12, h * 0.25); },
  };
  const LAND = {
    gate: [['arch', 1.0, 0.9], ['tower', 0.35, 0.7], ['deadTree', 0.8, 0.6], ['tower', 0.3, 0.55], ['pillar', 0.18, 0.5]],
    cloister: [['spire', 0.3, 1.0], ['pine', 0.5, 0.55], ['spire', 0.22, 0.75], ['arch', 0.7, 0.6], ['pine', 0.45, 0.5]],
    stair: [['temple', 1.2, 0.75], ['spire', 0.2, 0.8], ['pillar', 0.18, 0.5], ['broken', 0.2, 0.45]],
    waste: [['deadTree', 0.9, 0.7], ['rock', 0.9, 0.3], ['deadTree', 0.7, 0.5], ['rock', 0.6, 0.22]],
    throat: [['needle', 0.4, 1.0], ['rock', 0.8, 0.35], ['needle', 0.3, 0.7], ['needle', 0.25, 0.55]],
    shadow: [['broken', 0.22, 0.8], ['arch', 0.9, 0.75], ['pillar', 0.2, 0.7], ['broken', 0.2, 0.5], ['temple', 0.8, 0.4]],
  };
  function ridgePath(g, w, base, amp, seed, wave) {
    g.beginPath(); g.moveTo(0, base + 2);
    const n = Math.ceil(w / wave) + 2; let px = 0, py = base - amp * hash(seed, 0);
    g.lineTo(0, py);
    for (let i = 1; i <= n; i++) { const x = i * wave, y = base - amp * (0.25 + 0.75 * hash(seed, i)); g.quadraticCurveTo(px + wave * 0.5, py, (px + x) / 2 + wave * 0.25, (py + y) / 2); px = x; py = y; }
    g.lineTo(w, base + 2); g.closePath(); g.fill();
  }
  function layers(st) {
    const key = 'L' + st.id; if (cache[key]) return cache[key];
    const L = st.look, W = R.W, F = R.floorY, S = R.S;
    const sky = document.createElement('canvas'); sky.width = W; sky.height = R.H; const g = sky.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, F); gr.addColorStop(0, L.sky[0]); gr.addColorStop(0.6, L.sky[1]); gr.addColorStop(1, L.sky[2]);
    g.fillStyle = gr; g.fillRect(0, 0, W, F);
    for (let i = 0; i < 70; i++) { const x = hash(i, 11) * W, y = hash(i, 12) * F * 0.6, r = (hash(i, 13) < 0.85 ? 0.6 : 1.1) * R.dpr; g.fillStyle = `rgba(255,240,240,${0.15 + hash(i, 14) * 0.5})`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
    // The moon.
    const mr = R.H * (L.moon / 216) * 0.95, mx = W * 0.68, my = F * 0.36;
    const gl = g.createRadialGradient(mx, my, mr * 0.9, mx, my, mr * 3.2); gl.addColorStop(0, rgba(L.moonCol, 0.42)); gl.addColorStop(1, rgba(L.moonCol, 0));
    g.fillStyle = gl; g.fillRect(0, 0, W, F);
    const mg = g.createLinearGradient(mx - mr, my - mr, mx + mr, my + mr); mg.addColorStop(0, mix(L.moonCol, '#ffffff', 0.25)); mg.addColorStop(1, mix(L.moonCol, '#000000', 0.12));
    g.fillStyle = mg; g.beginPath(); g.arc(mx, my, mr, 0, 7); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.06)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(mx + (hash(i, 3) - 0.5) * mr * 1.2, my + (hash(i, 4) - 0.5) * mr * 1.2, mr * (0.08 + hash(i, 5) * 0.14), 0, 7); g.fill(); }
    // The far ridges are painted into the sky (they barely move); the near silhouettes get their own
    // layer, only as tall as they reach, wide enough for their parallax across the arena.
    const BAND = Math.round(R.H * 0.5), top0 = F - BAND;
    g.fillStyle = mix(L.sky[1], '#000000', 0.25); ridgePath(g, W, F, R.H * 0.16, st.id.length * 3, R.H * 0.22);
    g.fillStyle = mix(L.sky[1], '#000000', 0.42); ridgePath(g, W, F, R.H * 0.08, st.id.length * 5 + 1, R.H * 0.13);
    const mid = document.createElement('canvas'); mid.width = Math.ceil(W + R.SIDE_W * S * 0.38 + 40); mid.height = BAND;
    const gm = mid.getContext('2d'), mc = mix(L.sky[0], '#000000', 0.5); gm.translate(0, -top0); gm.fillStyle = mc; gm.strokeStyle = mc;
    const list = LAND[st.id] || LAND.gate, step = R.H * 0.42;
    for (let i = 0, x = R.H * 0.2; x < mid.width + step; i++, x += step * (0.7 + hash(i, 7) * 0.7)) {
      const [kind, ww, hh] = list[i % list.length]; SH[kind](gm, x, F + 1, R.H * 0.2 * ww, R.H * 0.42 * hh, i + 3);
    }
    gm.fillStyle = mix(L.sky[0], '#000000', 0.62); ridgePath(gm, mid.width, F, R.H * 0.035, 99, R.H * 0.08);
    for (const [c, y0] of [[sky, 0], [mid, top0]]) { const h = c.getContext('2d'); h.setTransform(1, 0, 0, 1, 0, -y0); const hz = h.createLinearGradient(0, F * 0.72, 0, F); hz.addColorStop(0, rgba(L.fog, 0)); hz.addColorStop(1, rgba(L.fog, 0.55)); h.fillStyle = hz; h.fillRect(0, F * 0.72, c.width, F * 0.28); h.setTransform(1, 0, 0, 1, 0, 0); }
    // The floor: glossy, the moon reflected in it.
    g.save(); g.translate(0, F);
    const fh = R.H - F, top = mix(L.sky[2], '#000000', 0.62), bot = mix(L.sky[0], '#000000', 0.55);
    const fg = g.createLinearGradient(0, 0, 0, fh); fg.addColorStop(0, top); fg.addColorStop(1, bot); g.fillStyle = fg; g.fillRect(0, 0, W, fh);
    g.save(); g.translate(mx, 0); g.scale(1, 2.2);
    const rf = g.createRadialGradient(0, 0, 0, 0, 0, mr * 1.4); rf.addColorStop(0, rgba(L.moonCol, 0.32)); rf.addColorStop(1, rgba(L.moonCol, 0));
    g.fillStyle = rf; g.fillRect(-mr * 1.5, 0, mr * 3, fh); g.restore();
    g.fillStyle = rgba(L.moonCol, 0.5); g.fillRect(0, 0, W, Math.max(1, R.dpr));
    g.restore();
    return (cache[key] = { sky, mid, top0, mx, my, mr });
  }
  R.drawArena = function (ctx, st, cam) {
    const Ls = layers(st), S = R.S, F = R.floorY;
    ctx.drawImage(Ls.sky, 0, 0);
    ctx.drawImage(Ls.mid, -Math.round(cam * S * 0.38) - 20, Ls.top0);
    // Seams on the floor, fanning toward the viewer, so the ground moves with the camera.
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = R.dpr;
    const cx = R.W / 2, first = Math.floor(cam / 48) * 48;
    ctx.beginPath();
    for (let x = first; x < cam + R.viewW() + 48; x += 48) { const sx = (x - cam) * S; ctx.moveTo(sx, F); ctx.lineTo(cx + (sx - cx) * 2.6, R.H); }
    for (const f of [0.18, 0.45, 0.8]) { const y = F + (R.H - F) * f; ctx.moveTo(0, y); ctx.lineTo(R.W, y); }
    ctx.stroke();
  };
  R.drawWeather = function (ctx, st, cam, t, amount) {
    const L = st.look, W = R.W, H = R.H, d = R.dpr;
    const n = Math.round((L.snow || L.ash ? 70 : L.embers ? 40 : L.wind ? 34 : 0) * (amount || 1));
    for (let i = 0; i < n; i++) {
      const sp = (14 + hash(i, 1) * 26) * R.S * 0.4, x0 = hash(i, 2) * (W + 100);
      if (L.wind) { const x = ((x0 - t * (260 + sp * 6) - cam * R.S * 0.8) % (W + 100) + W + 100) % (W + 100) - 50, y = hash(i, 3) * H * 0.95; ctx.fillStyle = 'rgba(220,230,255,0.18)'; ctx.fillRect(x, y, (16 + sp) * d, d); continue; }
      const up = L.embers ? -1 : 1, y = ((hash(i, 3) * H + up * t * sp) % H + H) % H;
      const x = ((x0 + Math.sin(t * 0.8 + i) * 10 * d - cam * R.S * 0.9 - (L.ash ? t * 14 * d : 0)) % (W + 100) + W + 100) % (W + 100) - 50;
      ctx.fillStyle = L.snow ? 'rgba(240,244,255,0.85)' : L.ash ? 'rgba(170,160,160,0.55)' : (i % 3 ? 'rgba(255,90,60,0.9)' : 'rgba(255,200,130,0.9)');
      ctx.beginPath(); ctx.arc(x, y, (L.snow ? 1.4 : 1) * d * (0.6 + hash(i, 5)), 0, 7); ctx.fill();
    }
  };

  // ---- the helicopter view (fights) ---------------------------------------------------------------
  // High above and a little to the side at one fixed angle: the ground is rotated by HELI.ang and
  // flattened by HELI.pitch; fighters and props stand upright on it. No perspective shrinking.
  // A true isometric view: the large tile maps' own angle (a ground tile is a 2:1 diamond).
  const HELI = R.HELI = { ang: -Math.PI / 4, pitch: 0.5 };
  const hc = Math.cos(HELI.ang), hs = Math.sin(HELI.ang);
  R.hcam = { x: 0, y: 0 };
  R.Sh = () => R.H / (340 * (R.camFix || R.camK || 1));   // the camera distance option scales the view (camFix: a fight that sets its own)
  R.P = function (x, y, z) {
    const dx = x - R.hcam.x, dy = y - R.hcam.y, Sh = R.Sh();
    const rx = dx * hc - dy * hs, ry = dx * hs + dy * hc;
    return { x: R.W / 2 + rx * Sh, y: R.H * 0.56 + ry * Sh * HELI.pitch - (z || 0) * Sh, d: ry };
  };
  // The sprite row to use for a world facing: the direction as it appears on screen.
  R.screenToGround = function (sx, sy) {
    const ry = sy / HELI.pitch, rx = sx, n0 = Math.hypot(sx, sy);
    let x = rx * hc + ry * hs, y = -rx * hs + ry * hc; const n = Math.hypot(x, y) || 1;
    return { x: x / n * Math.min(1, n0), y: y / n * Math.min(1, n0) };
  };
  R.screenAng = (a) => Math.atan2(Math.sin(a + HELI.ang) * HELI.pitch, Math.cos(a + HELI.ang));
  // Put the canvas in ground coordinates (world px on the floor).
  function unground(ctx) { if (R.baseT) ctx.setTransform(R.baseT); else ctx.setTransform(1, 0, 0, 1, 0, 0); }
  function ground(ctx) {
    const Sh = R.Sh(), p = HELI.pitch, cx = R.hcam.x, cy = R.hcam.y;
    // On top of the frame's base transform (a zoom or a shake), not instead of it.
    const B = R.baseT; if (B) ctx.setTransform(B); else ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.transform(Sh * hc, Sh * p * hs, -Sh * hs, Sh * p * hc, R.W / 2 - Sh * (hc * cx - hs * cy), R.H * 0.56 - Sh * p * (hs * cx + hc * cy));
  }
  function farCountry(g, st, W, H) {
    const q = 4, w = Math.ceil(W / q), h = Math.ceil(H / q), c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    const L = st.look, far = mix(L.sky[1], '#000000', 0.45), near = mix(L.sky[0], '#000000', 0.7), hz = Math.round(h * 0.56);
    const ridge = (base, amp, seed, col, step) => { x.fillStyle = col; x.beginPath(); x.moveTo(0, h); for (let i = 0; i <= w; i += step) x.lineTo(i, base - (hash(i, seed) * 0.6 + Math.sin(i * 0.05 + seed) * 0.4 + 0.4) * amp); x.lineTo(w, h); x.fill(); };
    const tower = (tx, ty, tw, th, col, spire) => { x.fillStyle = col; x.fillRect(tx, ty - th, tw, th); if (spire) { x.beginPath(); x.moveTo(tx - 1, ty - th); x.lineTo(tx + tw / 2, ty - th - spire); x.lineTo(tx + tw + 1, ty - th); x.fill(); } else for (let k = 0; k < tw; k += 3) x.fillRect(tx + k, ty - th - 2, 2, 2); };
    const glowAt = (gx, gy, r, col, a) => { const gr = x.createRadialGradient(gx, gy, 0, gx, gy, r); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0)); x.fillStyle = gr; x.fillRect(gx - r, gy - r, r * 2, r * 2); };
    switch (st.id) {
      case 'gate':   // a walled city and its gate towers, lit windows
        ridge(hz + 6, 10, 61, far, 6);
        for (let i = 0; i < 9; i++) { const tx = Math.round(w * (0.05 + i * 0.11 + hash(i, 62) * 0.03)), th = 10 + hash(i, 63) * 16; tower(tx, hz + 4, 5 + Math.round(hash(i, 64) * 3), th, near, hash(i, 65) < 0.4 ? 6 : 0); if (hash(i, 66) < 0.6) { x.fillStyle = '#ffb060'; x.fillRect(tx + 2, Math.round(hz - th * 0.6), 1, 1); } }
        x.fillStyle = near; x.fillRect(0, hz + 2, w, h);
        break;
      case 'cloister':   // snow peaks under a pale moon
        ridge(hz, 34, 71, mix(far, '#8aa0c0', 0.25), 4);
        x.fillStyle = 'rgba(230,240,255,0.55)'; for (let i = 0; i < w; i += 4) { const y0 = hz - (hash(i, 71) * 0.6 + Math.sin(i * 0.05 + 71) * 0.4 + 0.4) * 34; x.fillRect(i, y0, 3, 3); }
        ridge(hz + 14, 18, 72, near, 5);
        break;
      case 'stair':   // ruined spires floating in a violet haze
        glowAt(w * 0.3, hz, w * 0.4, '#8a3ae0', 0.25);
        for (let i = 0; i < 7; i++) { const tx = w * (0.06 + i * 0.14), ty = hz - 10 - hash(i, 81) * 22, th = 14 + hash(i, 82) * 20; tower(Math.round(tx), Math.round(ty), 4, th, near, 7); x.beginPath(); x.moveTo(tx - 2, ty); x.lineTo(tx + 6, ty); x.lineTo(tx + 2, ty + 8 + hash(i, 83) * 8); x.fill(); }
        ridge(hz + 18, 6, 84, near, 8);
        break;
      case 'waste':   // jagged volcanic ridges, ember glow along their feet, smoke
        glowAt(w * 0.6, hz + 6, w * 0.5, '#ff5a20', 0.3);
        ridge(hz + 4, 30, 91, mix(far, '#3a0a04', 0.3), 3); ridge(hz + 14, 16, 92, near, 4);
        x.fillStyle = 'rgba(255,120,40,0.7)'; for (let i = 0; i < w; i += 7) if (hash(i, 93) < 0.3) x.fillRect(i, hz + 12 + hash(i, 94) * 4, 1, 1);
        break;
      case 'throat':   // great cliff columns and wind streaks
        for (let i = 0; i < 6; i++) { const tx = Math.round(w * (0.04 + i * 0.17 + hash(i, 101) * 0.05)), tw = 8 + Math.round(hash(i, 102) * 10), th = 30 + hash(i, 103) * 30; x.fillStyle = i % 2 ? far : near; x.fillRect(tx, hz + 10 - th, tw, th + h); x.fillStyle = mix(far, '#ffffff', 0.1); x.fillRect(tx, hz + 10 - th, 1, th); }
        x.fillStyle = 'rgba(220,230,240,0.25)'; for (let i = 0; i < 14; i++) x.fillRect(Math.round(hash(i, 104) * w), Math.round(hz - 40 + hash(i, 105) * 50), 10 + Math.round(hash(i, 106) * 20), 1);
        break;
      default:   // the Moon's Shadow: the Spire itself, vast on the horizon, a red light at its tip
        glowAt(w * 0.32, hz - 30, w * 0.25, '#ff2a44', 0.2);
        x.fillStyle = near; x.beginPath(); x.moveTo(w * 0.32 - 14, h); x.lineTo(w * 0.32 - 3, hz - 60); x.lineTo(w * 0.32, hz - 70); x.lineTo(w * 0.32 + 3, hz - 60); x.lineTo(w * 0.32 + 14, h); x.fill();
        x.fillStyle = '#ff4a5e'; x.fillRect(Math.round(w * 0.32), hz - 69, 1, 2);
        ridge(hz + 10, 10, 111, near, 6);
    }
    // Fade the country into the dark below.
    const fd = x.createLinearGradient(0, hz - 20, 0, h); fd.addColorStop(0, 'rgba(0,0,0,0)'); fd.addColorStop(1, 'rgba(0,0,0,0.7)'); x.fillStyle = fd; x.fillRect(0, 0, w, h);
    const sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, w * q, h * q); g.imageSmoothingEnabled = sm;
  }
  function heliSky(st) {
    const key = 'hsky' + st.id; if (cache[key]) return cache[key];
    const L = st.look, W = R.W + 80, H = R.H, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, L.sky[0]); gr.addColorStop(0.55, mix(L.sky[1], '#000000', 0.2)); gr.addColorStop(1, mix(L.sky[0], '#000000', 0.5));
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,240,240,${0.12 + hash(i, 24) * 0.5})`; g.beginPath(); g.arc(hash(i, 21) * W, hash(i, 22) * H * 0.7, (hash(i, 23) < 0.85 ? 0.6 : 1.2) * R.dpr, 0, 7); g.fill(); }
    const mr = R.H * (L.moon / 216) * 0.85, mx = W * 0.74, my = H * 0.17;
    const gl = g.createRadialGradient(mx, my, mr * 0.9, mx, my, mr * 3.4); gl.addColorStop(0, rgba(L.moonCol, 0.4)); gl.addColorStop(1, rgba(L.moonCol, 0));
    g.fillStyle = gl; g.fillRect(0, 0, W, H);
    const mg = g.createLinearGradient(mx - mr, my - mr, mx + mr, my + mr); mg.addColorStop(0, mix(L.moonCol, '#ffffff', 0.25)); mg.addColorStop(1, mix(L.moonCol, '#000000', 0.12));
    g.fillStyle = mg; g.beginPath(); g.arc(mx, my, mr, 0, 7); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.06)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(mx + (hash(i, 3) - 0.5) * mr * 1.2, my + (hash(i, 4) - 0.5) * mr * 1.2, mr * (0.08 + hash(i, 5) * 0.14), 0, 7); g.fill(); }
    // The far country (2026-11-10): each hour's own silhouettes on the horizon, drawn at a quarter of the resolution and
    // scaled up without smoothing so they share the game's pixel grid; darker toward the bottom, behind the floating arena.
    farCountry(g, st, W, H);
    // Low clouds drifting past below the platform.
    for (let i = 0; i < 9; i++) { const cx = hash(i, 31) * W, cy = H * (0.55 + hash(i, 32) * 0.4), rw = R.H * (0.3 + hash(i, 33) * 0.4); g.save(); g.translate(cx, cy); g.scale(1, 0.22); const cg = g.createRadialGradient(0, 0, 0, 0, 0, rw); cg.addColorStop(0, rgba(L.fog, 0.35)); cg.addColorStop(1, rgba(L.fog, 0)); g.fillStyle = cg; g.fillRect(-rw, -rw, rw * 2, rw * 2); g.restore(); }
    return (cache[key] = c);
  }
  function fogImg() {
    if (cache.fog) return cache.fog;
    const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d'); g.scale(1, 0.25);
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    return (cache.fog = c);
  }
  function fog(ctx, st) {
    const img = fogImg(), Sh = R.Sh(); ctx.save(); ctx.globalAlpha = st.look.snow || st.look.ash ? 0.1 : 0.07;
    for (let i = 0; i < 3; i++) { const x = ((R.t * (6 + i * 2) + hash(i, 5) * 900) % 900) - 450, y = (hash(i, 6) - 0.5) * 380, q = R.P(x, y); ctx.drawImage(img, q.x - 160 * Sh, q.y - 30 * Sh, 320 * Sh, 60 * Sh); }
    ctx.restore();
  }
  // ---- effects (fights) -----------------------------------------------------------------------------
  R.pfx = []; R.chains = [];
  // A pack effect (the pixel effect atlas) at a point in the world, height z.
  const PK = (name, x, y, z, scale, o) => R.pfx.push(Object.assign({ name, x, y, z: z || 0, t: 0, scale: scale || 1 }, o || {}));
  R.pk = PK;   // (the story films place effects with it)
  R.spawns = {};
  const P = (o) => R.parts.push(Object.assign({ t: 0, vx: 0, vy: 0, vz: 0, g: 0, z: 0, size: 2, col: '#fff', shape: 'sq', life: 0.4 }, o));
  const FX = (o) => R.fx.push(Object.assign({ t: 0 }, o));
  // The part of a line that lies over the floor (his cuts run far past the summit's edge): [x1, y1, x2, y2].
  function overFloor(s, x1, y1, x2, y2) {
    const AR = VS.arenaOf(s); let a0 = -1, a1 = -1;
    for (let i = 0; i <= 60; i++) { const f = i / 60; if (VS.inside(AR, x1 + (x2 - x1) * f, y1 + (y2 - y1) * f, 4)) { if (a0 < 0) a0 = f; a1 = f; } }
    if (a0 < 0) return [x1, y1, x2, y2];
    return [x1 + (x2 - x1) * a0, y1 + (y2 - y1) * a0, x1 + (x2 - x1) * a1, y1 + (y2 - y1) * a1];
  }
  R.float = function (text, x, y, z, col, big, label) {
    if (R.noNumbers && /^[+-]?\d+$/.test(text)) return;   // damage and heal numbers (off unless asked for)
    // Labels near each other stack upward instead of printing over one another (at most three).
    if (label) {
      const near = R.floaters.filter((f) => f.label && f.t < 0.7 && Math.hypot(f.x - x, f.y - y) < 60);
      if (near.some((f) => f.text === text)) return;
      if (near.length >= 3) near[0].t = 99;
      z += 20 * Math.min(2, near.filter((f) => f.t < 99).length);
    } else { const near = R.floaters.filter((f) => !f.label && f.t < 0.25 && Math.hypot(f.x - x, f.y - y) < 30).length; x += (near % 3 - 1) * 12 * Math.min(1, near); z += 8 * Math.min(3, near); }
    R.floaters.push({ text, x, y, z, t: 0, col, big, label });
  };
  function sparks(x, y, z, n, col, speed, size) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, e = (Math.random() - 0.3) * 1.2, v = speed * (0.4 + Math.random()); P({ x, y, z, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6, vz: Math.sin(e) * v, life: 0.18 + Math.random() * 0.15, size: size || 1.2, col, shape: 'line' }); }
  }
  // Kill streaks: kills close together build up to a called-out streak.
  R.streak = 0; R.streakT = 0; R.streakShow = null;
  const STREAK = [null, null, 'DOUBLE KILL', 'TRIPLE KILL', 'QUAD KILL', 'RAMPAGE', 'RAMPAGE', 'RAMPAGE', 'MASSACRE'];
  function streakName(n) { return n >= 8 ? 'MASSACRE' : STREAK[n]; }
  R.drawStreak = function (ctx, dt) {
    R.streakT = Math.max(0, R.streakT - dt); if (!R.streakT) R.streak = 0;
    const sh = R.streakShow; if (!sh) return; sh.t += dt; if (sh.t > 1.4) { R.streakShow = null; return; }
    const k = R.k, pop = sh.t < 0.1 ? 1.6 - sh.t / 0.1 * 0.6 : 1, a = Math.min(1, (1.4 - sh.t) / 0.3), x = R.W * 0.72, y = R.H * 0.44;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(-0.08); ctx.scale(pop, pop);
    ctx.font = R.fd(34 * k, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; if ('letterSpacing' in ctx) ctx.letterSpacing = 3 * R.dpr + 'px';
    ctx.lineWidth = 6 * R.dpr; ctx.strokeStyle = 'rgba(8,2,6,0.9)'; ctx.strokeText(sh.text, 0, 0); ctx.fillStyle = sh.n >= 5 ? RED : '#ffffff'; ctx.fillText(sh.text, 0, 0);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    label(ctx, sh.n + ' KILLS', 0, 26 * k, 11 * k, '#ff8a9a', 'center', 4, 700); ctx.restore();
  };
  R.consume = function (s) {
    for (const e of s.events) {
      const u = e.id != null ? s.units.find((o) => o.id === e.id) : null, sc = u ? u.scale : 1;
      switch (e.type) {
        case 'hit': {
          const z = 22 * sc, sa = R.screenAng(e.ang || 0);
          if (e.soul) { FX({ kind: 'spark', x: e.x, y: e.y, z, life: 0.2, col: e.col || '#cfe0ff', r: e.heavy ? 22 : 15 }); sparks(e.x, e.y, z, e.heavy ? 9 : 5, e.col || '#cfe0ff', 110); if (e.heavy) PK('v_impact', e.x, e.y, z, 0.9); R.float(String(e.dmg), e.x, e.y, z + 12, e.col || '#cfe0ff'); break; }   // a bound soul's blow: its colour, no shake
          // Pack effects only on the blows that matter; light cuts get clean sparks alone.
          // Every blow lands: a slash mark in its direction, sparks, a number; heavier blows punch the camera.
          // No cross-shaped sparkles on the blows (the author, 2026-11-10): a slash on the dash-cut, a burst on the arts.
          if (e.fx === 'finisher') { R.punch = Math.max(R.punch || 0, 0.06); PK('v_impact', e.x, e.y, z, 1.7); PK('v_blood', e.x, e.y, z - 6, 1.3); }   // the forge's burst (tools_forge.py)
          else if (e.fx === 'dash') PK('v_slash', e.x, e.y, z, 1.4, { angle: sa });   // the forge's crescent (the pack's katana opens on a cross flare)
          else if (e.art) PK('hit_crit', e.x, e.y, z, 2);
          else if (e.heavy) { R.punch = Math.max(R.punch || 0, 0.035); PK('v_impact', e.x, e.y, z, 1.25); }
          FX({ kind: 'spark', x: e.x, y: e.y, z, life: 0.22, col: e.art ? RED : '#ffffff', r: e.finisher ? 36 : e.heavy ? 28 : 20 });
          sparks(e.x, e.y, z, e.finisher ? 18 : e.heavy ? 13 : 8, e.heavy ? '#ffd9a0' : '#ffffff', e.heavy ? 190 : 130);
          R.float(String(e.dmg), e.x, e.y, z + 14, e.art ? RED : e.heavy || e.finisher ? '#ffd9a0' : '#ffffff', e.heavy || e.finisher || e.art);
          R.shake = Math.max(R.shake, e.art ? 8 : e.finisher ? 7 : e.heavy ? 5 : 2.6);
          break;
        }
        case 'hurt': sparks(e.x, e.y, 22, 9, RED, 130, 1.6); R.float(String(e.dmg), e.x, e.y, 38, '#ff5a6e', e.big); R.flash = 0.35; R.flashCol = '255,30,50'; R.shake = Math.max(R.shake, e.big ? 6 : 4); break;
        case 'parry': FX({ kind: 'ring', x: e.x, y: e.y, z: 22, life: 0.35, col: '#cfeeff', r0: 4, r1: 46, w: 3 }); sparks(e.x, e.y, 22, 14, '#cfeeff', 200, 1.6); R.float('PARRY', e.x, e.y, 50, '#cfeeff', true, true); R.flash = 0.45; R.flashCol = '210,235,255'; R.shake = 5; break;
        case 'perfect': R.float('PERFECT', e.x, e.y, 56, '#8ef0ff', true, true); FX({ kind: 'gring', x: e.x, y: e.y, life: 0.5, col: '#8ef0ff', r0: 6, r1: 60, w: 2 }); break;
        case 'riposte': R.float('RIPOSTE', e.x, e.y, 64, '#ff9aa8', true, true); break;
        case 'break': { FX({ kind: 'ring', x: e.x, y: e.y, z: 24 * sc, life: 0.45, col: '#ffd060', r0: 6, r1: 60, w: 3 }); for (let i = 0; i < 14; i++) { const a = Math.random() * Math.PI * 2, v = 90 + Math.random() * 120; P({ x: e.x, y: e.y, z: 24 * sc, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6, vz: 60 + Math.random() * 80, g: -380, life: 0.6, size: 3, col: '#ffd060', shape: 'tri', rot: Math.random() * 6 }); } R.float('BREAK', e.x, e.y, 56 * sc, '#ffd060', true, true); R.shake = 7; break; }
        case 'counter': R.float('COUNTER', e.x, e.y, 58, '#5ac8b0', true, true); sparks(e.x, e.y, 22, 10, '#c8fff0', 160); R.shake = Math.max(R.shake, 4); break;
        case 'healpulse': PK('v_heal', e.x, e.y, 0, 1.6); FX({ kind: 'gring', x: e.x, y: e.y, life: 0.7, col: '#ffe08a', r0: 8, r1: e.r, w: 3 }); PK('holy_light', e.x, e.y, 0, 1.6); if (e.n) R.float('+HEAL', e.x, e.y, 64, '#ffe08a', false, true); break;
        case 'block': R.float('BLOCK', e.x, e.y, 54, '#c8c0b0', false, true); sparks(e.x, e.y, 22, 6, '#e8e0c8', 120); break;
        case 'guardbreak': FX({ kind: 'ring', x: e.x, y: e.y, z: 22, life: 0.4, col: '#ffd060', r0: 6, r1: 56, w: 3 }); R.float('GUARD BREAK', e.x, e.y, 60, '#ffd060', true, true); R.shake = Math.max(R.shake, 8); R.punch = Math.max(R.punch || 0, 0.05); break;
        case 'explode': PK('blast', e.x, e.y, 10, 3.2); PK('smoke_burst', e.x, e.y, 8, 2.2); FX({ kind: 'gring', x: e.x, y: e.y, life: 0.5, col: '#ff6a5a', r0: 6, r1: e.r * 1.4, w: 4 }); sparks(e.x, e.y, 14, 24, '#ff8a6a', 260); R.flash = 0.4; R.flashCol = '255,90,60'; R.shake = Math.max(R.shake, 10); break;
        case 'reinforce': R.flash = 0.35; R.flashCol = '255,40,70'; R.shake = Math.max(R.shake, 7); break;
        case 'soulRise': PK('v_soul', e.x, e.y, 0, e.first ? 1.2 : 1.6); if (A.hasFx('v_spawn')) PK('v_spawn', e.x, e.y, 0, 0.9); break;
        case 'soulFall': PK('v_soul', e.x, e.y, 0, 1.4); break;
        case 'soulSig': { PK(e.asc ? 'v_aura' : 'v_soul', e.x, e.y, 0, e.asc ? 1.6 : 1.1); const su = s.units.find((x) => x.id === e.id); if (su) R.float(e.name.toUpperCase(), e.x, e.y, 70 * su.scale, e.col); break; }
        case 'heal': PK('v_heal', e.x, e.y, 0, 1.1); R.float('+' + e.n, e.x, e.y, 58, '#7dffb0'); break;
        case 'finisher': R.impactF = { t: 0, dur: 0.14, x: e.x, y: e.y, big: true }; R.punch = 0.09; R.shake = Math.max(R.shake, 12); R.float('FINISH', e.x, e.y, 70, '#ffffff', true, true); break;
        case 'kill': {
          if (!e.hero && !e.boss && u && !u.ally) { R.streak = R.streakT > 0 ? R.streak + 1 : 1; R.streakT = 2.4; const nm = streakName(R.streak); if (nm) R.streakShow = { text: nm, n: R.streak, t: 0 }; if (u.elite) { R.float('ELITE DOWN', e.x, e.y, 64, RED, true, true); R.shake = Math.max(R.shake, 8); } }
          const col = (u && u.def.color) || '#ffffff';
          for (let i = 0; i < (e.boss ? 60 : 22); i++) P({ x: e.x + (Math.random() - 0.5) * 16 * sc, y: e.y + (Math.random() - 0.5) * 8 * sc, z: Math.random() * 36 * sc, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 16, vz: 20 + Math.random() * 60, g: 10, life: 0.7 + Math.random() * 0.6, size: 1.5 + Math.random() * 1.5, col, shape: 'sq' });
          if (e.hero) PK('smoke_dark', e.x, e.y, 16 * sc, 1.3 * sc); else PK(A.hasFx('v_soul') ? 'v_soul' : 'dissipate', e.x, e.y, 4 * sc, 1.5 * sc);   // his dead give up a red soul
          if (e.boss) { R.flash = 0.9; R.flashCol = '255,255,255'; R.shake = 12; PK('blast', e.x, e.y, 20 * sc, 3); PK('smoke_dark', e.x, e.y, 10, 3); }
          break;
        }
        case 'pickup': PK(e.kind === 'hp' ? 'v_heal' : 'v_levelup', e.x, e.y, 0, 0.8); break;
        case 'chest': PK('v_loot', e.x, e.y, 0, 1.6); PK('v_levelup', e.x, e.y, 0, 1.0); break;
        case 'moonFull': { const h = s.hero; PK('v_levelup', h.x, h.y, 0, 1.3); break; }   // the moon gauge full: a gold column
        case 'blink': if (e.petals) { for (let i = 0; i < 14; i++) { const a = Math.random() * 6.28, v = 40 + Math.random() * 80; P({ x: e.x, y: e.y, z: 14 + Math.random() * 20, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6, vz: 20 + Math.random() * 40, g: -40, life: 0.8, size: 2, col: Math.random() < 0.5 ? '#ff9ab8' : '#ffffff', shape: 'tri', rot: Math.random() * 6 }); } } PK('teleport', e.x, e.y, 0, 1.6); FX({ kind: 'ring', x: e.x, y: e.y, z: 20, life: 0.3, col: '#c070ff', r0: 40, r1: 2, w: 2 }); sparks(e.x, e.y, 20, 10, '#c070ff', 90); break;
        case 'dodge': for (let i = 0; i < 6; i++) P({ x: e.x, y: e.y, z: 1, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 40, vz: Math.random() * 25, g: -40, life: 0.35, size: 2 + Math.random() * 2, col: 'rgba(200,190,200,0.35)', shape: 'circle' }); break;
        case 'boltHit': if (e.burstFx || e.burst) PK(e.burstFx || 'explosion_fire', e.x, e.y, 10, e.burst ? e.burst / 14 : 1.4); FX({ kind: 'ring', x: e.x, y: e.y, z: 16, life: 0.25, col: '#e0b0ff', r0: 3, r1: 22, w: 2 }); sparks(e.x, e.y, 16, 8, '#e0b0ff', 120); break;
        case 'slam': PK('shockwave', e.x, e.y, 0, 2.2); FX({ kind: 'gring', x: e.x, y: e.y, life: 0.45, col: '#ff6a5a', r0: e.r * 0.3, r1: e.r * 1.2, w: 3 }); for (let i = 0; i < 16; i++) { const a = Math.random() * Math.PI * 2; P({ x: e.x + Math.cos(a) * e.r * 0.6, y: e.y + Math.sin(a) * e.r * 0.6, z: 1, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, vz: 40 + Math.random() * 60, g: -200, life: 0.5, size: 2.5, col: 'rgba(160,140,140,0.8)', shape: 'sq' }); } R.shake = Math.max(R.shake, 6); break;
        // No drawn crescent on the swing (2026-11-10): one generic arc never matched the blade's real path in each
        // clip. The sprite's own sword carries the swing; sparks and a glow mark where it connects.
        case 'swing': break;
        case 'spin': { const h = s.hero; if (s.heroDef.heavy.fx === 'frost') { PK('v_frost', h.x, h.y, 0, 2.2); PK('explosion_frost', h.x, h.y, 10, 3); PK('frost_nova', h.x, h.y, 4, 2.6); } else PK('spin_slash', h.x, h.y, 18, 2.2); FX({ kind: 'gring', x: h.x, y: h.y, life: 0.35, col: '#ffffff', r0: 8, r1: 46, w: 3 }); FX({ kind: 'spin', x: h.x, y: h.y, life: 0.3 }); R.shake = Math.max(R.shake, 4); break; }
        case 'spawn': if (e.mode === 'rift' && !e.boss && A.hasFx('v_spawn')) PK('v_spawn', e.x, e.y, 0, 1.3); break;   // the ground tears open
        case 'landed': if (e.boss) { PK('shockwave', e.x, e.y, 0, 3.2); FX({ kind: 'gring', x: e.x, y: e.y, life: 0.6, col: '#ffffff', r0: 10, r1: 110, w: 4 }); R.shake = 14; } else { const u2 = s.units.find((o) => o.id === e.id); if (u2 && u2.mode === 'drop') { FX({ kind: 'gring', x: e.x, y: e.y, life: 0.4, col: '#ffffff', r0: 4, r1: 34, w: 2 }); R.shake = Math.max(R.shake, 2.5); } else if (u2 && u2.mode === 'rift') PK('smoke_burst', e.x, e.y, 6, 1.0); } break;
        case 'portal': R.flash = 0.4; R.flashCol = '255,220,230'; break;
        case 'impact': R.impactF = { t: 0, dur: e.size === 'big' ? 0.17 : 0.1, x: e.x, y: e.y, big: e.size === 'big' }; R.shake = Math.max(R.shake, e.size === 'big' ? 12 : 6); break;
        case 'launch': { const z = 20 * sc; FX({ kind: 'gring', x: e.x, y: e.y, life: 0.35, col: '#ffffff', r0: 4, r1: 36, w: 2 }); for (let i = 0; i < 8; i++) P({ x: e.x, y: e.y, z: 2, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 20, vz: 160 + Math.random() * 120, life: 0.35, size: 1.4, col: '#ffffff', shape: 'line' }); R.float('LAUNCH', e.x, e.y, z + 40, '#ffd060', true, true); R.shake = Math.max(R.shake, 4); break; }
        case 'juggle': sparks(e.x, e.y, (u ? u.z : 0) + 22, 6, '#ffd9a0', 120); break;
        case 'land': FX({ kind: 'gring', x: e.x, y: e.y, life: 0.4, col: 'rgba(220,210,220,0.8)', r0: 6, r1: 40, w: 2 }); for (let i = 0; i < 10; i++) { const a = Math.random() * 6.28; P({ x: e.x, y: e.y, z: 1, vx: Math.cos(a) * 50, vy: Math.sin(a) * 30, vz: 20 + Math.random() * 30, g: -120, life: 0.45, size: 2.2, col: 'rgba(200,190,200,0.5)', shape: 'circle' }); } R.shake = Math.max(R.shake, 3.5); break;
        case 'wall': sparks(e.x, e.y, 20, 14, '#ffffff', 180, 1.6); R.float('WALL', e.x, e.y, 50, '#ffffff', true, true); R.shake = Math.max(R.shake, 6); break;
        case 'phase': if (!e.quiet) { R.flash = 0.6; R.flashCol = '255,40,60'; R.shake = 8; } break;
        // The god: his blade landing along its line, his hand slamming down, his phases, his kneeling, his fall.
        case 'cut': {
          // The blade lands: a white-hot slash along the whole line that thins away, its crimson glow after it, a glowing
          // fissure left in the floor, sparks and dust along it, the camera struck.
          [e.x1, e.y1, e.x2, e.y2] = overFloor(s, e.x1, e.y1, e.x2, e.y2);
          const mx = (e.x1 + e.x2) / 2, my = (e.y1 + e.y2) / 2;
          FX({ kind: 'gslash', x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2, w: e.w, life: e.god ? 1.8 : 0.9, god: !!e.god });
          if (e.god) { PK('v_crack', mx, my, 0, 2.4); PK('v_shock', mx, my, 0, 1.6); R.shake = Math.max(R.shake, 13); R.flash = Math.max(R.flash, 0.4); R.flashCol = '255,70,90'; R.punch = Math.max(R.punch || 0, 0.06); }
          else { R.shake = Math.max(R.shake, 8); R.flash = Math.max(R.flash, 0.2); R.flashCol = '255,255,255'; }
          const n = 14; for (let i = 0; i <= n; i++) { const f = i / n, x = e.x1 + (e.x2 - e.x1) * f, y = e.y1 + (e.y2 - e.y1) * f; sparks(x, y, 4, i % 2 ? 5 : 3, i % 3 ? '#ffd0d8' : '#ff3048', 170, 1.3); if (i % 3 === 1) PK('smoke_burst', x, y, 2, 0.9); }
          break; }
        case 'gateSpawn': FX({ kind: 'gring', x: e.x, y: e.y, life: 0.5, col: '#ff5a6a', r0: 10, r1: 70, w: 3 }); R.shake = Math.max(R.shake, 3); break;
        case 'gateDown': PK('v_blast', e.x, e.y, 10, 2.4); PK('v_shock', e.x, e.y, 0, 2.4); PK('blast', e.x, e.y, 30, 3); PK('smoke_dark', e.x, e.y, 20, 3); PK('cb:01_crimson_tide_cleave/caster', e.x, e.y, 4, 2); FX({ kind: 'gring', x: e.x, y: e.y, life: 0.7, col: '#ffffff', r0: 20, r1: 180, w: 5 }); R.float('GATE DESTROYED', e.x, e.y, 90, '#ffd0d6', true, true); R.shake = Math.max(R.shake, 14); R.flash = Math.max(R.flash, 0.5); R.flashCol = '255,80,100'; R.punch = Math.max(R.punch || 0, 0.06); break;
        case 'godMove': R.godPose = { move: e.move, t: 0 }; if (e.move === 'last') { R.bossArt = { key: 'godCut', name: 'THE LAST CUT', t: 0 }; R.flash = 0.6; R.flashCol = '255,30,50'; R.shake = 16; } break;
        case 'doom': { R.flash = 1; R.flashCol = '255,255,255'; R.shake = 28; R.punch = 0.1; const AR = VS.arenaOf(s), rr = AR.godR || 300; for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, x = Math.cos(a) * rr * 0.6, y = Math.sin(a) * rr * 0.6; PK('cb:01_crimson_tide_cleave/caster', x, y, 4, 2); PK('v_pillar', x, y, 0, 2); PK('v_crack', x, y, 0, 1.6); } FX({ kind: 'gring', x: e.x, y: e.y, life: 0.8, col: '#cfe0ff', r0: e.r, r1: e.r * 3, w: 5 }); break; }
        case 'godPhase': R.bossArt = { key: 'godCut', name: e.n === 2 ? 'HIS DEAD RISE' : 'HE KNEELS TO KILL', t: 0 }; R.flash = 0.7; R.flashCol = '255,40,60'; R.shake = 14; break;
        case 'godKneel': R.shake = 16; R.flash = 0.4; R.flashCol = '255,255,255'; FX({ kind: 'gring', x: e.x, y: e.y, life: 0.7, col: '#ffffff', r0: 20, r1: 200, w: 4 }); break;
        case 'godDown': PK('cb:19_recall_beam/caster', s.hero.x, s.hero.y, 0, 3); R.flash = 1; R.flashCol = '255,250,252'; R.shake = 24; R.godFall = 0.001; break;
        case 'skill': {
          const h = s.hero; R.float(e.name.toUpperCase(), h.x, h.y, 64, s.heroDef.color, true, true);
          if (e.kind === 'wave') PK('slash_arc_blood', h.x + Math.cos(e.ang) * 14, h.y + Math.sin(e.ang) * 14, 20, 1.6, { angle: R.screenAng(e.ang) });
          if (e.kind === 'zone') PK('spell_cast', h.x, h.y, 26, 1.6);
          if (e.kind === 'smoke') { for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; PK('smoke_burst', h.x + Math.cos(a) * 26, h.y + Math.sin(a) * 18, 8, 2); } FX({ kind: 'gring', x: h.x, y: h.y, life: 0.5, col: '#c9a0ff', r0: 6, r1: 70, w: 3 }); R.shake = Math.max(R.shake, 4); }
          if (e.kind === 'clones') PK('summon', h.x, h.y, 0, 1.6);
          if (e.kind === 'chain') PK('spell_zap', h.x, h.y, 26, 1.6);
          if (e.kind === 'leapSlam') PK('charge_up', h.x, h.y, 10, 1.6);
          break;
        }
        case 'chain': R.chains.push({ pts: e.pts, t: 0 }); for (const p of e.pts.slice(1)) PK('hit_shock', p[0], p[1], 22, 1.6); R.flash = 0.3; R.flashCol = '255,240,170'; R.shake = Math.max(R.shake, 4); break;
        case 'thunder': PK('v_bolt', e.x, e.y, 0, 2.2); PK('thunder', e.x, e.y, 0, 3.2); PK('lightning_holy', e.x, e.y, 0, 2.4); FX({ kind: 'gring', x: e.x, y: e.y, life: 0.5, col: '#fff0a0', r0: 6, r1: e.r * 1.6, w: 4 }); R.impactF = { t: 0, dur: 0.08, x: e.x, y: e.y, big: false }; R.shake = Math.max(R.shake, 9); break;
        case 'strike': if (e.fx === 'fire_burst' || e.fx === 'explosion_fire') PK('v_fire', e.x, e.y, 0, 1.4); if (e.hand) { PK('v_shock', e.x, e.y, 0, 2.6); PK('v_crack', e.x, e.y, 0, 1.8); PK('cb:10_quake_stomp/caster', e.x, e.y, 0, 2.4); R.shake = Math.max(R.shake, 14); FX({ kind: 'gring', x: e.x, y: e.y, life: 0.6, col: '#ffffff', r0: 20, r1: 150, w: 4 }); FX({ kind: 'gring', x: e.x, y: e.y, life: 0.9, col: '#ff3048', r0: 10, r1: 110, w: 6 }); FX({ kind: 'gcrater', x: e.x, y: e.y, r: e.r || 50, life: 1.6 }); R.flash = Math.max(R.flash, 0.35); R.flashCol = '255,60,80'; R.punch = Math.max(R.punch || 0, 0.06); for (let i = 0; i < 18; i++) { const a = i / 18 * 6.28; P({ x: e.x + Math.cos(a) * 10, y: e.y + Math.sin(a) * 10, z: 4, vx: Math.cos(a) * (60 + Math.random() * 90), vy: Math.sin(a) * (60 + Math.random() * 90), vz: 120 + Math.random() * 160, life: 0.9, size: 2 + Math.random() * 2, col: i % 3 ? '#2a1a20' : '#ff5a6a', shape: 'sq', g: -520 }); } } if (!e.quiet) { PK(e.fx || 'blast', e.x, e.y, 6, e.fx === 'poison_cloud' ? 1.6 : 2.2); FX({ kind: 'gring', x: e.x, y: e.y, life: 0.35, col: e.team === 'hero' ? '#ffffff' : '#ff8070', r0: 3, r1: e.r * 1.3, w: 2 }); R.shake = Math.max(R.shake, 3); } else PK(e.fx || 'blast', e.x, e.y, 6, 1.4); break;
        case 'tick': R.float(String(e.dmg), e.x, e.y, 30, '#b0ff90', false); break;
        case 'cast': if (u) PK('cast_circle', u.x, u.y, 2, 1.6); break;
        case 'vanish': PK('v_shadow', e.x, e.y, 22, 1.4); PK('smoke_dark', e.x, e.y, 10, 1.2); break;
        case 'bossArt': R.bossArt = { key: e.key, name: e.name, t: 0 }; break;
        // The tell before a delayed blow: a hard glint on the weapon, held.
        case 'glint': { const c = e.unparry ? '#ff5a6a' : '#ffffff'; FX({ kind: 'ring', x: e.x, y: e.y, z: e.z, life: 0.4, col: c, r0: 4, r1: 40, w: 2 }); break; }
        case 'artEnd': R.flash = 1; R.flashCol = '255,255,255'; R.shake = 12; break;
      }
    }
  };
  function drawFx(ctx, dt) {
    const Sh = R.Sh();
    R.fx = R.fx.filter((f) => {
      f.t += dt; const k = f.t / f.life; if (k >= 1) return false;
      ctx.save();
      if (f.kind === 'gcut') {
        ground(ctx); const a = Math.atan2(f.y2 - f.y1, f.x2 - f.x1), L = Math.hypot(f.x2 - f.x1, f.y2 - f.y1); ctx.translate(f.x1, f.y1); ctx.rotate(a);
        ctx.globalAlpha = 1 - k; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, -f.w * (1 - k), L, f.w * 2 * (1 - k)); ctx.fillStyle = '#ff2a44'; ctx.fillRect(0, -1, L, 2);
        ctx.restore(); return true;
      }
      if (f.kind === 'gslash') {
        // The sword's mark: first a white-hot slash (thinning), then the crimson glow, then a fissure that cools.
        const a = Math.atan2(f.y2 - f.y1, f.x2 - f.x1), L = Math.hypot(f.x2 - f.x1, f.y2 - f.y1), t = f.t;
        ctx.save(); ground(ctx); ctx.translate(f.x1, f.y1); ctx.rotate(a);
        const hot = Math.max(0, 1 - t / 0.25), glow = Math.max(0, 1 - t / 0.8), cool = Math.max(0, 1 - t / f.life);
        ctx.fillStyle = `rgba(20,4,8,${0.7 * cool})`; ctx.fillRect(0, -2.2, L, 4.4);   // the fissure
        ctx.fillStyle = `rgba(255,${60 + Math.round(80 * glow)},80,${0.9 * cool * (0.75 + 0.25 * Math.sin(t * 30))})`; ctx.fillRect(0, -0.8, L, 1.6);
        if (glow > 0) { ctx.fillStyle = `rgba(255,42,68,${0.35 * glow})`; ctx.fillRect(0, -f.w * 0.9 * glow, L, f.w * 1.8 * glow); }
        if (hot > 0) { ctx.fillStyle = `rgba(255,255,255,${hot})`; ctx.fillRect(0, -f.w * 0.55 * hot, L, f.w * 1.1 * hot); }
        ctx.restore(); ctx.restore(); return true;
      }
      if (f.kind === 'gcrater') {
        // Where his hand came down: a ring of cracked stone glowing red, cooling.
        const q = R.P(f.x, f.y, 0), rw = f.r * R.Sh() * 0.75, cool = 1 - k;
        ctx.translate(q.x, q.y); ctx.scale(1, HELI.pitch);
        const g = ctx.createRadialGradient(0, 0, rw * 0.2, 0, 0, rw); g.addColorStop(0, `rgba(10,2,4,${0.6 * cool})`); g.addColorStop(0.75, `rgba(40,6,12,${0.5 * cool})`); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rw, 0, 7); ctx.fill();
        ctx.strokeStyle = `rgba(255,60,80,${0.8 * cool})`; ctx.lineWidth = 1.5 * R.dpr;
        for (let i = 0; i < 9; i++) { const a0 = i / 9 * 6.28 + 0.3, r0 = rw * 0.25, r1 = rw * (0.7 + 0.25 * ((i * 37) % 7) / 7); ctx.beginPath(); ctx.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0); ctx.lineTo(Math.cos(a0 + 0.12) * (r0 + r1) / 2, Math.sin(a0 + 0.12) * (r0 + r1) / 2); ctx.lineTo(Math.cos(a0 - 0.05) * r1, Math.sin(a0 - 0.05) * r1); ctx.stroke(); }
        ctx.restore(); return true;
      }
      if (f.kind === 'gring') {
        ground(ctx); ctx.globalAlpha = 1 - k; ctx.strokeStyle = f.col; ctx.lineWidth = f.w * (1 - k * 0.5);
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r0 + (f.r1 - f.r0) * (1 - Math.pow(1 - k, 2)), 0, 7); ctx.stroke();
        ctx.restore(); return true;
      }
      const q = R.P(f.x, f.y, f.z || 0), x = q.x, y = q.y;
      if (f.kind === 'ring') { ctx.globalAlpha = 1 - k; ctx.strokeStyle = f.col; ctx.lineWidth = f.w * R.dpr * (1 - k * 0.5); ctx.beginPath(); ctx.arc(x, y, (f.r0 + (f.r1 - f.r0) * (1 - Math.pow(1 - k, 2))) * Sh * 0.5, 0, 7); ctx.stroke(); }
      else if (f.kind === 'spark') { ctx.globalAlpha = 1 - k; R.glowAt(ctx, f.col, x, y, f.r * Sh * 0.6 * (0.6 + k), 0.9); }   // a soft glow where the blow lands (no cross-shaped star: the author, 2026-11-10)
      else if (f.kind === 'spin') { const c0 = R.P(f.x, f.y, 18), r = 40 * Sh; ctx.globalAlpha = (1 - k); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5 * R.dpr * (1 - k); ctx.beginPath(); ctx.ellipse(c0.x, c0.y, r, r * 0.5, 0, k * 6, k * 6 + Math.PI * 1.6); ctx.stroke(); ctx.strokeStyle = RED; ctx.lineWidth = 2 * R.dpr; ctx.beginPath(); ctx.ellipse(c0.x, c0.y, r * 1.06, r * 0.53, 0, k * 6, k * 6 + Math.PI * 1.6); ctx.stroke(); }
      else if (f.kind === 'star') { ctx.globalAlpha = 1 - k; ctx.fillStyle = f.col; const r = f.r * Sh * 0.5 * (0.4 + k); ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * 0.18 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.fill(); }
      else if (f.kind === 'slash') {
        // A crescent of light swept around the blade, white at the core with a red rim, turned to
        // the facing as it looks on screen.
        const sa = R.screenAng(f.ang), big = f.big ? 1.3 : 1, r = (f.long ? 32 : 24) * big * Sh, c0 = R.P(f.x, f.y, 20);
        const cx = c0.x + Math.cos(sa) * 6 * Sh, cy = c0.y + Math.sin(sa) * 6 * Sh;
        const half = f.dir === 2 ? 0.9 : 1.2, a0 = f.dir === 1 ? sa + half : sa - half, a1 = f.dir === 1 ? sa - half : sa + half, ccw = a1 < a0;
        const prog = Math.min(1, k * 2.2), am = a0 + (a1 - a0) * prog;
        ctx.globalAlpha = (1 - k) * 0.95;
        ctx.beginPath(); ctx.arc(cx, cy, r, a0, am, ccw); ctx.arc(cx + Math.cos(sa) * r * 0.16, cy + Math.sin(sa) * r * 0.16, r * 0.8, am, a0, !ccw); ctx.closePath();
        ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.strokeStyle = RED; ctx.lineWidth = 2 * R.dpr; ctx.beginPath(); ctx.arc(cx, cy, r + R.dpr, a0, am, ccw); ctx.stroke();
        if (f.long) { ctx.globalAlpha = (1 - k) * 0.6; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2 * R.dpr; ctx.beginPath(); ctx.moveTo(cx - Math.cos(sa) * r * 2.2, cy - Math.sin(sa) * r * 2.2); ctx.lineTo(cx, cy); ctx.stroke(); }
      }
      ctx.restore(); return true;
    });
    R.pfx = R.pfx.filter((e) => {
      e.t += dt; const q = R.P(e.x, e.y, e.z);
      const alive = A.fx(ctx, e.name, e.t, q.x, q.y, e.scale * Sh * 0.55, e.alpha, e.angle, e.flip);
      return alive && e.t < 5;
    });
    R.parts = R.parts.filter((p) => {
      p.t += dt; if (p.t >= p.life) return false;
      p.vz += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z = Math.max(0, p.z + p.vz * dt);
      const k = p.t / p.life, q = R.P(p.x, p.y, p.z), sz = p.size * R.dpr * (1 - k * 0.5);
      ctx.globalAlpha = 1 - k; ctx.fillStyle = p.col; ctx.strokeStyle = p.col;
      if (p.shape === 'line') { const q2 = R.P(p.x - p.vx * 0.05, p.y - p.vy * 0.05, p.z - p.vz * 0.05); ctx.lineWidth = sz; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q2.x, q2.y); ctx.stroke(); }
      else if (p.shape === 'circle') { ctx.beginPath(); ctx.arc(q.x, q.y, sz * 2, 0, 7); ctx.fill(); }
      else if (p.shape === 'tri') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate((p.rot || 0) + p.t * 8); ctx.beginPath(); ctx.moveTo(0, -sz * 2); ctx.lineTo(sz * 1.6, sz * 1.4); ctx.lineTo(-sz * 1.6, sz * 1.4); ctx.fill(); ctx.restore(); }
      else ctx.fillRect(q.x - sz, q.y - sz, sz * 2, sz * 2);
      ctx.globalAlpha = 1; return true;
    });
  }

  // ---- fighters (fights) ----------------------------------------------------------------------------
  // Danger on the floor during a wind-up: the circle an area blow will hit, the path of a lunge,
  // the cone of a swing. White is an ordinary blow, red a heavy one: dash through both.
  function hazards(ctx, s) {
    const Sh = R.Sh();
    for (const z of s.hazards) {
      const foe = z.team === 'foe', soulCol = z.soul && s.soul ? s.soul.def.color : null, col = foe ? '#ff2a44' : z.team === 'arena' ? '#ffa040' : soulCol || '#ffffff';
      if (z.kind === 'wave') {
        // A shockwave: a band of red light rolling out over the floor.
        const rr = z.t < z.delay ? 0 : (z.rr || z.r0); if (!rr) continue;
        ctx.save(); ground(ctx); ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = rgba('#ff2a44', 0.45); ctx.lineWidth = z.w * 1.6; ctx.beginPath(); ctx.arc(z.x, z.y, rr, 0, 7); ctx.stroke();
        ctx.strokeStyle = rgba('#ffd0d6', 0.6); ctx.lineWidth = z.w * 0.5; ctx.beginPath(); ctx.arc(z.x, z.y, rr, 0, 7); ctx.stroke();
        ctx.restore(); continue;
      }
      if (z.kind === 'doom') {
        // The Last Cut coming: the whole summit pulses red, but for one pool of moonlight.
        const k = z.t / z.delay, pulse = 0.5 + 0.5 * Math.sin(R.t * (6 + 10 * k)), big = 2000;
        ctx.save(); ground(ctx); ctx.fillStyle = rgba('#ff1a34', 0.12 + 0.22 * k + 0.08 * pulse); ctx.beginPath(); ctx.rect(-big, -big, big * 2, big * 2); ctx.arc(z.sx, z.sy, z.sr, 0, 7, true); ctx.fill('evenodd');
        const gr = ctx.createRadialGradient(z.sx, z.sy, 0, z.sx, z.sy, z.sr); gr.addColorStop(0, 'rgba(230,240,255,0.55)'); gr.addColorStop(1, 'rgba(200,220,255,0.15)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(z.sx, z.sy, z.sr, 0, 7); ctx.fill();
        ctx.restore();
        const q = R.P(z.sx, z.sy, 0); A.tex(ctx, 'light_01', q.x, q.y - R.H * 0.3, 70 * Sh, R.H * 0.9, '#cfe0ff', 0.55 + 0.25 * pulse, 0, true);
        label(ctx, 'REACH THE LIGHT', R.W / 2, R.H * 0.3, 22 * R.k, pulse > 0.5 ? '#ffffff' : '#cfe0ff', 'center', 4, 700);
        continue;
      }
      if (z.kind === 'cut') {
        if (z.t >= z.delay) continue;
        // His sword (2026-11-11, the author: "make the hand and sword far more epic and clean"): a thin line of light charges
        // along the floor where it will fall, the edges of the danger faint beside it; in the last half second the blade
        // itself comes down out of the sky onto the line, a wall of white-hot light edged in crimson.
        // Only the part of the line over the floor is drawn (his cuts run far past the summit's edge).
        if (!z.vis) { const AR = VS.arenaOf(s); let a0 = -1, a1 = -1; for (let i = 0; i <= 60; i++) { const f = i / 60; if (VS.inside(AR, z.x1 + (z.x2 - z.x1) * f, z.y1 + (z.y2 - z.y1) * f, 4)) { if (a0 < 0) a0 = f; a1 = f; } }
          z.vis = a0 < 0 ? [0, 1] : [a0, a1]; }
        const X1 = z.x1 + (z.x2 - z.x1) * z.vis[0], Y1 = z.y1 + (z.y2 - z.y1) * z.vis[0], X2 = z.x1 + (z.x2 - z.x1) * z.vis[1], Y2 = z.y1 + (z.y2 - z.y1) * z.vis[1];
        const k = z.t / z.delay, cc = soulCol || '#ff2a44', L = Math.hypot(X2 - X1, Y2 - Y1), mx = (X1 + X2) / 2, my = (Y1 + Y2) / 2;
        const p1 = R.P(X1, Y1, 0), p2 = R.P(X2, Y2, 0), sa = Math.atan2(p2.y - p1.y, p2.x - p1.x), sl = Math.hypot(p2.x - p1.x, p2.y - p1.y), pm = R.P(mx, my, 0);
        ctx.save(); ground(ctx); ctx.translate(X1, Y1); ctx.rotate(Math.atan2(Y2 - Y1, X2 - X1));
        ctx.fillStyle = rgba(cc, 0.06 + 0.1 * k); ctx.fillRect(0, -z.w, L, z.w * 2);   // the danger, faint
        ctx.strokeStyle = rgba(cc, 0.22 + 0.3 * k); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -z.w); ctx.lineTo(L, -z.w); ctx.moveTo(0, z.w); ctx.lineTo(L, z.w); ctx.stroke();
        ctx.restore();
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        A.tex(ctx, 'light_01', pm.x, pm.y, sl * 1.05, z.w * Sh * (0.9 + 0.5 * k), cc, 0.2 + 0.35 * k, sa, true);   // its glow
        const c = 0.5 * Math.min(1, k * 1.25);   // the core line, charging out from the middle to both ends
        ctx.strokeStyle = rgba('#ffd0d8', 0.5 + 0.5 * k); ctx.lineWidth = Math.max(1, (1 + k) * R.dpr); ctx.beginPath();
        ctx.moveTo(pm.x + (p1.x - pm.x) * c * 2, pm.y + (p1.y - pm.y) * c * 2); ctx.lineTo(pm.x + (p2.x - pm.x) * c * 2, pm.y + (p2.y - pm.y) * c * 2); ctx.stroke();
        if (z.god && z.delay - z.t < 0.5) {
          // The blade's edge coming down fast, a short streak of light above it (not a wall).
          const f = 1 - (z.delay - z.t) / 0.5, fall = f * f, hb = 300 * (1 - fall), ht = hb + 16 + 40 * f;
          const b1 = R.P(X1, Y1, hb), b2 = R.P(X2, Y2, hb), t1 = R.P(X1, Y1, ht), t2 = R.P(X2, Y2, ht), bm = R.P(mx, my, hb), tm = R.P(mx, my, ht);
          const g = ctx.createLinearGradient(bm.x, bm.y, tm.x, tm.y); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.18, rgba(cc, 0.6)); g.addColorStop(1, rgba(cc, 0));
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(b1.x, b1.y); ctx.lineTo(b2.x, b2.y); ctx.lineTo(t2.x, t2.y); ctx.lineTo(t1.x, t1.y); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 2 * R.dpr; ctx.beginPath(); ctx.moveTo(b1.x, b1.y); ctx.lineTo(b2.x, b2.y); ctx.stroke();   // its edge
          A.tex(ctx, 'light_01', bm.x, bm.y, sl * 1.2, 40 * Sh, cc, 0.5 * f, sa, true);
          A.tex(ctx, 'light_01', pm.x, pm.y, sl * 1.1, 26 * Sh, '#ffffff', 0.35 * f * f, sa, true);   // the floor lit before it lands
        }
        ctx.restore(); continue;
      }
      if (z.t < z.delay) {
        // The warning: a circle filling in until the strike lands.
        const k = z.t / z.delay; ctx.save(); ground(ctx);
        if (!z.part) { ctx.fillStyle = rgba(col, 0.08 + 0.12 * k); ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, 7); ctx.fill();
          ctx.fillStyle = rgba(col, 0.28); ctx.beginPath(); ctx.arc(z.x, z.y, z.r * k, 0, 7); ctx.fill(); }
        ctx.strokeStyle = rgba(col, 0.8); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, 7); ctx.stroke(); ctx.restore();
        if (z.part) {
          // His hand (2026-11-11, "far more epic and clean"): its shadow gathering, a rune circle turning under it, then a
          // column of crimson light slamming down out of the sky onto the mark.
          const q = R.P(z.x, z.y, 0), k2 = z.t / z.delay, Sh2 = R.Sh(), rw = z.r * Sh2 * 0.75;
          ctx.save();
          const sg = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, rw * (0.4 + 0.6 * k2)); sg.addColorStop(0, `rgba(0,0,0,${0.55 + 0.3 * k2})`); sg.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.translate(q.x, q.y); ctx.scale(1, HELI.pitch); ctx.translate(-q.x, -q.y); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(q.x, q.y, rw * (0.4 + 0.6 * k2), 0, 7); ctx.fill();
          ctx.globalCompositeOperation = 'lighter'; A.tex(ctx, 'magic_02', q.x, q.y, rw * 2.3, rw * 2.3, '#ff2a44', 0.25 + 0.5 * k2, R.t * (1 + 2 * k2), true); A.tex(ctx, 'magic_01', q.x, q.y, rw * 1.5, rw * 1.5, '#ffb0bc', 0.15 + 0.35 * k2, -R.t * 2, true);
          ctx.restore();
          const left = z.delay - z.t;
          if (left < 0.45) {
            const f = 1 - left / 0.45, head = R.P(z.x, z.y, 420 * (1 - f * f)), top = R.P(z.x, z.y, 900);
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            A.tex(ctx, 'light_01', q.x, (top.y + head.y) / 2, rw * (1.6 - 0.6 * f), Math.max(10, head.y - top.y), '#ff2a44', 0.55 + 0.35 * f, 0, true);
            A.tex(ctx, 'light_01', q.x, (top.y + head.y) / 2, rw * 0.5, Math.max(10, head.y - top.y), '#ffffff', 0.4 + 0.4 * f, 0, true);
            A.tex(ctx, 'light_01', head.x, head.y, rw * 1.8, rw * 1.2, '#ffd0d8', 0.8, 0, true);
            ctx.restore();
          }
        }
        if (z.kind === 'strike' && !z.part && z.delay - z.t < 0.35) { const q = R.P(z.x, z.y, 0), q2 = R.P(z.x, z.y, 200); ctx.strokeStyle = rgba('#ffffff', 0.5 * (1 - (z.delay - z.t) / 0.35)); ctx.lineWidth = 2 * R.dpr; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q2.x, q2.y); ctx.stroke(); }
        continue;
      }
      if (z.kind === 'zone') {
        const life = Math.min(1, (z.t - z.delay) / 0.3, (z.delay + z.dur - z.t) / 0.4), tint = z.fx === 'burning_ground' ? '#ff7030' : z.fx === 'poison_cloud' ? '#80ff60' : z.fx === 'frost_nova' ? '#9ad8ff' : '#c070ff';
        ctx.save(); ground(ctx); const gr = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, z.r); gr.addColorStop(0, rgba(tint, 0.35 * life)); gr.addColorStop(1, rgba(tint, 0)); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, 7); ctx.fill();
        ctx.strokeStyle = rgba(tint, 0.5 * life); ctx.lineWidth = 1; ctx.setLineDash([4, 5]); ctx.lineDashOffset = -R.t * 10; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, 7); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
        if (z.fx) for (let i = 0; i < 3; i++) { const a = i * 2.1 + z.x, rr = z.r * 0.45, q = R.P(z.x + Math.cos(a) * rr, z.y + Math.sin(a) * rr * 0.8, 0); A.fx(ctx, z.fx, R.t + i * 0.3, q.x, q.y, Sh * 0.7 * Math.max(0.5, z.r / 40), 0.85 * life); }
      } else if (z.kind === 'tornado') {
        const q = R.P(z.x, z.y, 0);
        for (let i = 0; i < 6; i++) { const y = q.y - i * 9 * Sh, rw = (8 + i * 4) * Sh, a = R.t * 9 + i; ctx.strokeStyle = rgba(i % 2 ? '#ffffff' : '#c8d8ff', 0.55); ctx.lineWidth = 2 * R.dpr; ctx.beginPath(); ctx.ellipse(q.x + Math.sin(a) * 3 * Sh, y, rw, rw * 0.3, 0, a, a + 4.2); ctx.stroke(); }
        A.fx(ctx, 'wind_gust', R.t * 1.5, q.x, q.y - 26 * Sh, Sh * 1.2, 0.7);
        if (Math.random() < 0.5) P({ x: z.x + (Math.random() - 0.5) * 30, y: z.y + (Math.random() - 0.5) * 16, z: 2, vx: (Math.random() - 0.5) * 60, vy: 0, vz: 60 + Math.random() * 60, life: 0.5, size: 1.6, col: 'rgba(210,210,220,0.6)', shape: 'sq' });
      }
    }
  }
  function chains(ctx, dt) {
    R.chains = R.chains.filter((c) => {
      c.t += dt; if (c.t > 0.35) return false; const a = 1 - c.t / 0.35;
      for (const [col, w] of [['rgba(255,240,150,' + a * 0.5 + ')', 6], ['rgba(255,255,255,' + a + ')', 2]]) {
        ctx.strokeStyle = col; ctx.lineWidth = w * R.dpr; ctx.beginPath();
        c.pts.forEach((p, i) => { const q = R.P(p[0], p[1], 22); if (!i) { ctx.moveTo(q.x, q.y); return; } const pq = R.P(c.pts[i - 1][0], c.pts[i - 1][1], 22); for (let j = 1; j <= 5; j++) { const f = j / 5; ctx.lineTo(pq.x + (q.x - pq.x) * f + (j < 5 ? (Math.random() - 0.5) * 16 * R.dpr : 0), pq.y + (q.y - pq.y) * f + (j < 5 ? (Math.random() - 0.5) * 16 * R.dpr : 0)); } });
        ctx.stroke();
      }
      return true;
    });
  }
  function telegraphs(ctx, s) {
    ground(ctx);
    for (const u of s.units) {
      if (u.team !== 'foe' || u.state !== 'attack' || u.atk.blink || u.atk.bolt || u.atk.zone || u.atk.rain || u.atk.quake || u.atk.summon || u.atk.clones || u.atk.tornado) continue;
      const k = u.atk, w = k.wind * u.windMul; if (u.st >= w + 0.05) continue;
      const t = Math.min(1, u.st / w), col = k.unparry ? (R.safe ? '#ff9a1a' : '#ff2a44') : (R.safe ? '#3aa0ff' : '#ffffff');
      ctx.save();
      if (k.aoe) { const c = VS.aoeAt(u, k); ctx.fillStyle = rgba(col, 0.1 + 0.18 * t); ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, 7); ctx.fill(); ctx.fillStyle = rgba(col, 0.25); ctx.beginPath(); ctx.arc(c.x, c.y, c.r * t, 0, 7); ctx.fill(); ctx.strokeStyle = rgba(col, 0.75); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, 7); ctx.stroke(); }
      else if (k.lunge) { const L = k.lunge + k.reach * u.scale, hw = (u.rad + 6); ctx.translate(u.x, u.y); ctx.rotate(u.ang); ctx.fillStyle = rgba(col, 0.08 + 0.16 * t); ctx.fillRect(0, -hw, L, hw * 2); ctx.fillStyle = rgba(col, 0.28); ctx.fillRect(0, -hw, L * t, hw * 2); ctx.strokeStyle = rgba(col, 0.6); ctx.lineWidth = 1.2; ctx.strokeRect(0, -hw, L, hw * 2); }
      else { const r = k.reach * u.scale + 8, half = (k.arc || 1.5) / 2 + 0.2; ctx.translate(u.x, u.y); ctx.fillStyle = rgba(col, 0.06 + 0.14 * t); ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, u.ang - half, u.ang + half); ctx.closePath(); ctx.fill(); ctx.strokeStyle = rgba(col, 0.45 * t); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, r, u.ang - half, u.ang + half); ctx.stroke(); }
      ctx.restore();
    }
    unground(ctx);
  }
  // ---- the god (the final fight) ----------------------------------------------------------------
  // He looms behind the summit in screen space, a vast black shape against the moon, eyes burning; his
  // sword goes up as he readies a cut, his head comes down when he kneels; he falls away when he dies.
  function drawGod(ctx, s, dt) {
    const K = VS.INTRO && VS.INTRO.kit; if (!K) return;
    if (s.god && s.god.body) return;   // he stands on the summit himself now (D.FOES.firstCutFinal): no giant past the rim
    const g = s.god, P = R.godPose; if (P) { P.t += dt; if (P.t > 1.6) R.godPose = null; }
    const kneel = s.units.some((u) => u.alive && u.part === 'head'), fall = R.godFall ? (R.godFall += dt) : 0;
    R.godKneel = (R.godKneel || 0) + ((kneel ? 1 : 0) - (R.godKneel || 0)) * Math.min(1, dt * 3);
    // He stands outside the map (the author, 2026-11-10), the real knight on a broken pillar of stone in the void past the
    // summit's far edge, about twice a man's size and crisp (a whole-number scale), looking in. When he kneels he has
    // come down onto the summit itself (drawGodPart, 'head'); when he dies he falls away.
    const AR = VS.arenaOf(s), top = AR.godR ? godTop(AR).r : 0, far = top + 26, edge = R.P(-hs * far, -hc * far), edgeY = AR.godR ? edge.y : R.H * 0.25;
    const k = Math.max(2, Math.round(R.Sh() * 1.8)), ex = Math.round(AR.godR ? edge.x : R.W * 0.52), fy = Math.round(edgeY + R.H * 0.05 + fall * R.H * 0.8);   // his feet just behind the rim
    const a = (fall ? Math.max(0, 1 - fall / 1.6) : 1) * (1 - R.godKneel); if (a <= 0.02) return;
    let L = R.godLayer; if (!L || L.width !== R.W || L.height !== R.H) { L = R.godLayer = document.createElement('canvas'); L.width = R.W; L.height = R.H; }
    const c = L.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, R.W, R.H); c.globalCompositeOperation = 'source-over';
    A.tex(c, 'light_01', ex, fy - 30 * k, 120 * k, 110 * k, '#ff3048', 0.45, 0, true);
    // The pillar he stands on, falling away into the dark below.
    const pw = 15 * k; c.fillStyle = '#120a10'; c.beginPath(); c.moveTo(ex - pw, fy); c.lineTo(ex + pw, fy); c.lineTo(ex + pw * 0.8, fy + R.H * 0.5); c.lineTo(ex - pw * 0.8, fy + R.H * 0.5); c.fill();
    c.fillStyle = '#2a1c24'; c.beginPath(); c.moveTo(ex - pw, fy); c.lineTo(ex, fy - pw * 0.35); c.lineTo(ex + pw, fy); c.lineTo(ex, fy + pw * 0.35); c.fill();
    c.fillStyle = 'rgba(255,48,72,0.35)'; c.fillRect(ex - pw, fy + 1, 2 * pw, Math.max(1, k));
    const raise = P && (P.move === 'blade' || P.move === 'sweep') && P.t < 1.3, slam = P && (P.move === 'hand' || P.move === 'rain' || P.move === 'last') && P.t < 1.3;
    K.godAt(c, null, ex, fy, k, R.t, { col: g.flash > 0 ? '#ff3048' : '#0a0306', amt: g.flash > 0 ? 0.45 : 0.15, pose: raise ? 'raise' : slam ? 'raise' : null, ft: raise || slam ? Math.min(1, P.t / 1.35) : null });
    // Wherever the floor is, he is cut away, so the pillar sinks behind the summit's edge.
    c.globalCompositeOperation = 'destination-out'; R.isoMask(c, VS.arenaOf(s)); c.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a; ctx.drawImage(L, 0, 0); ctx.restore();
  }
  // The summit while he lives (2026-11-10, "far more intense"): glowing cracks that spread with each phase, red
  // lightning across the sky, embers rising, and in his last phase a ground that never stops trembling.
  function godAmbience(ctx, s, dt) {
    const g = s.god; if (!g || !g.alive) return;
    const ph = g.gPhase || 1, AR = VS.arenaOf(s), rr = AR.godR || 300;
    if (ph >= 2) {
      ctx.save(); ground(ctx); ctx.globalCompositeOperation = 'lighter';
      const n = ph === 2 ? 5 : 9, pulse = 0.55 + 0.45 * Math.sin(R.t * 3);
      for (let i = 0; i < n; i++) { const a = hash(i, 901) * 6.283, L = rr * (0.55 + hash(i, 902) * 0.5) * (ph === 2 ? 0.7 : 1), x0 = Math.cos(a) * 20, y0 = Math.sin(a) * 20, x1 = Math.cos(a) * L, y1 = Math.sin(a) * L;
        ctx.strokeStyle = rgba('#ff2a44', 0.35 * pulse); ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.strokeStyle = rgba('#ffb0bc', 0.5 * pulse); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
      ctx.restore();
    }
    if (ph === 3) R.shake = Math.max(R.shake, 1.4);
    R.godStorm = (R.godStorm == null ? 3 : R.godStorm) - dt;
    if (R.godStorm <= 0) { R.godStorm = (ph === 3 ? 1.8 : ph === 2 ? 2.8 : 4) + Math.random() * 2; R.flash = Math.max(R.flash, 0.45); R.flashCol = '255,40,70'; R.shake = Math.max(R.shake, 4); if (VS.audio) { VS.audio.sfx('bolt', 0.5); VS.audio.sfx('quake', 0.35); } }
    if (Math.random() < 0.5 + ph * 0.2) { const a = Math.random() * 6.283, d = Math.random() * rr; P({ x: Math.cos(a) * d, y: Math.sin(a) * d, z: 0, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 6, vz: 30 + Math.random() * 50, g: -6, life: 1.4 + Math.random(), size: 1.4, col: Math.random() < 0.7 ? '#ff4a5e' : '#ffd0a0', shape: 'sq' }); }
  }
  // A giant gauntlet, fingers spread, lying on the floor (its wrist rising out of the frame toward him).
  function godHand(ctx, x, y, k, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#0c0608'; ctx.strokeStyle = '#3a2830'; ctx.lineWidth = 2 * R.dpr;
    ctx.beginPath(); ctx.moveTo(x - 14 * k, y - 10 * k); ctx.lineTo(x + 40 * k, y - 120 * k); ctx.lineTo(x + 64 * k, y - 110 * k); ctx.lineTo(x + 18 * k, y - 4 * k); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, y, 26 * k, 13 * k, 0, 0, 7); ctx.fill(); ctx.stroke();
    for (let i = 0; i < 4; i++) { const fx = x - 22 * k + i * 13 * k; ctx.beginPath(); ctx.ellipse(fx, y + 12 * k, 5 * k, 12 * k, (i - 1.5) * 0.25, 0, 7); ctx.fill(); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(x + 26 * k, y - 2 * k, 11 * k, 5 * k, -0.6, 0, 7); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function drawGodPart(ctx, s, u) {
    const K = VS.INTRO && VS.INTRO.kit, Sh = R.Sh(), q = R.P(u.x, u.y, 0), x = Math.round(q.x), y = Math.round(q.y);
    const fade = u.alive ? Math.min(1, u.st * 6, u.life * 2) : Math.max(0, 1 - u.deadT * 3), flash = u.flash > 0;
    ctx.save(); ctx.globalAlpha = fade;
    if (u.part === 'blade') {
      // Where his blade stands in the floor: a shaft of white-crimson light (no drawn shapes, 2026-11-11).
      A.tex(ctx, 'light_01', x, y, 70 * Sh, 30 * Sh, '#ff3048', 0.5, 0, true);
      A.tex(ctx, 'light_01', x, y - 60 * Sh, 18 * Sh, 130 * Sh, flash ? '#ffffff' : '#ff3048', 0.8, 0, true); A.tex(ctx, 'light_01', x, y - 60 * Sh, 6 * Sh, 130 * Sh, '#ffffff', 0.7, 0, true);
    } else if (u.part === 'hand') {
      // Where his hand came down: a rune circle burning in the floor.
      ctx.save(); ctx.translate(x, y); ctx.scale(1, HELI.pitch); A.tex(ctx, 'magic_02', 0, 0, 70 * Sh, 70 * Sh, flash ? '#ffffff' : '#ff3048', 0.7, R.t, true); ctx.restore();
    } else if (u.part === 'head' && K) {
      // He has come down onto the summit: the knight on one knee where the ring is, open (the real character).
      A.tex(ctx, 'light_01', x, y - 30 * Sh, 120 * Sh, 100 * Sh, '#ff3048', 0.4, 0, true);
      K.godAt(ctx, null, x, y, Math.max(2, Math.round(Sh * 2.2)), R.t, { pose: 'kneel', col: flash ? '#ff3048' : '#0a0306', amt: flash ? 0.45 : 0.12 });
    }
    // The place to strike: a ring pulsing on the floor, brighter on his head.
    const pr = (u.rad + 6) * Sh * 0.75, pk = 0.5 + 0.5 * Math.sin(R.t * 8);
    ctx.globalAlpha = fade * (0.55 + 0.35 * pk); ctx.strokeStyle = u.part === 'head' ? '#ffffff' : '#ffd0d6'; ctx.lineWidth = 2.5 * R.dpr;
    ctx.beginPath(); ctx.ellipse(x, y, pr, pr * 0.5, 0, 0, 7); ctx.stroke();
    ctx.restore();
  }
  // A rift gate on the summit's rim (the god's gates): a red portal at 0.7 size with its health over it,
  // flashing when struck, collapsing in smoke when it falls.
  function drawGate(ctx, s, u) {
    if (!u.alive && u.deadT > 1.2) return;
    const Sh = R.Sh(), q = R.P(u.x, u.y), age = (u.bornT == null ? (u.bornT = R.t) : u.bornT, R.t - u.bornT), sc = Sh * 0.7, col = '#ff2a44';
    const rise = u.alive ? Math.min(1, age / 0.8) : Math.max(0, 1 - u.deadT / 0.8), open = u.alive ? Math.max(0, Math.min(1, (age - 0.4) / 0.6)) : Math.max(0, 1 - u.deadT / 0.4);
    vfxPortal(ctx, q.x, q.y, sc, col, rise, open, R.t, 1);
    if (u.flash > 0) A.tex(ctx, 'light_01', q.x, q.y - 40 * sc, 110 * sc, 140 * sc, '#ffffff', 0.6 * u.flash, 0, true);
    if (u.alive && open > 0.5) {
      const w = 54 * Sh, y = Math.round(q.y - 100 * sc), f = Math.max(0, u.hp / u.maxHp);
      ctx.fillStyle = 'rgba(8,4,10,0.85)'; ctx.fillRect(Math.round(q.x - w / 2) - 1, y - 1, Math.round(w) + 2, Math.max(4, Math.round(4 * R.dpr)) + 2);
      ctx.fillStyle = '#ff2a44'; ctx.fillRect(Math.round(q.x - w / 2), y, Math.round(w * f), Math.max(4, Math.round(4 * R.dpr)));
    }
  }
  function drawUnit(ctx, s, u, pass) {
    if (u.def.god) return;
    if (u.def.gate) { if (pass !== 'reflect') drawGate(ctx, s, u); return; }
    if (u.def.part) { if (pass !== 'reflect' && (u.alive || u.deadT < 0.4)) drawGodPart(ctx, s, u); return; }
    const Sh = R.Sh(), sc = Sh * u.scale, q = R.P(u.x, u.y), x = Math.round(q.x), y0 = Math.round(q.y), lift = Math.round((u.z || 0) * Sh), y = y0 - lift, sa = R.screenAng(u.ang);
    let alpha = 1;
    if (u.state === 'dead' && u.team === 'foe') alpha = Math.max(0, 1 - Math.max(0, u.deadT - 0.5) / 0.6);
    if (alpha <= 0) return;
    if (u.state === 'spawn') { if (pass !== 'reflect') drawSpawn(ctx, u, x, y, sc, sa); return; }
    if (pass === 'reflect') { ctx.save(); ctx.translate(0, 2 * y0 + lift); ctx.scale(1, -1); A.actor(ctx, u.set, u.clip, u.frame, sa, x, y, sc, { alpha: 0.11 * alpha }); ctx.restore(); return; }
    if (u.def.tint && u.alive) { A.tex(ctx, 'light_01', x, y - 20 * sc, 60 * sc, 60 * sc, u.def.tint, 0.45 + 0.25 * Math.sin(R.t * 12 + u.id), 0, true); }
    if (u.def.guard && u.alive && !(u.guardT > 0) && u.state !== 'hurt' && u.state !== 'down') {
      ctx.save(); ground(ctx); ctx.strokeStyle = 'rgba(230,220,200,0.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(u.x, u.y, 18 * u.scale, u.ang - u.def.guard.arc, u.ang + u.def.guard.arc); ctx.stroke(); ctx.restore(); unground(ctx);
    }
    if (u.elite && u.alive) {
      if (A.hasFx('v_aura')) A.fx(ctx, 'v_aura', R.t, x, y0, sc * 0.75, 0.9);   // the forge's turning rune ring
      ctx.save(); ctx.translate(x, y0); ctx.scale(1, HELI.pitch); A.tex(ctx, 'magic_01', 0, 0, 52 * sc, 52 * sc, RED, 0.75, R.t * 1.5, true); ctx.restore();
      A.tex(ctx, 'smoke_07', x, y - 22 * sc, 60 * sc, 70 * sc, RED, 0.35 + 0.1 * Math.sin(R.t * 8), R.t * 2, true);
      A.tex(ctx, 'light_01', x, y - 22 * sc, 70 * sc, 70 * sc, RED, 0.3, 0, true);
    }
    if (u.aura && u.alive) { R.glowAt(ctx, RED, x, y - 22 * sc, 46 * sc, 0.3 + 0.12 * Math.sin(R.t * 7)); if (Math.random() < 0.4) P({ x: u.x + (Math.random() - 0.5) * 20 * u.scale, y: u.y, z: 4, vz: 50 + Math.random() * 40, life: 0.7, size: 1.6, col: 'rgba(255,60,90,0.9)', shape: 'sq' }); }

    const sw = 26 * sc * Math.max(0.45, 1 - (u.z || 0) / 160); ctx.globalAlpha = alpha * Math.max(0.35, 1 - (u.z || 0) / 200); ctx.drawImage(shadowImg(), x - sw / 2, y0 - sw * 0.12, sw, sw * 0.25); ctx.globalAlpha = 1;
    R.glowAt(ctx, u.team === 'hero' ? RED : '#c8c0e0', x, y - 22 * sc, 34 * sc, u.team === 'hero' ? 0.16 : 0.07);
    // A ring under each fighter: red for the knight, white for foes, red and white for a boss.
    if (u.alive && !s.staged) { const rw = 13 * sc, rh = rw * HELI.pitch * 0.9; ctx.save(); ctx.lineWidth = (u.def.boss ? 2.4 : 1.6) * R.dpr; ctx.strokeStyle = u === s.hero ? rgba(s.heroDef.color || '#ff2a44', 0.95) : u.soul ? rgba(u.def.color, 0.75) : u.ally ? 'rgba(170,120,255,0.7)' : u.def.boss ? 'rgba(255,120,140,0.8)' : 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(x, y0, rw, rh, 0, 0, 7); ctx.stroke(); if (u === s.hero) { ctx.fillStyle = rgba(s.heroDef.color || '#ff2a44', 0.12); ctx.fill(); } ctx.restore(); }
    const winding = u.state === 'attack' && u.team === 'foe' && u.st < u.atk.wind * u.windMul;
    const opts = { alpha, flash: u.flash * 0.55 };
    if (u.slowT > 0 && !u.flash) { opts.flash = 0.3; opts.flashCol = '#8fd0ff'; if (Math.random() < 0.15) P({ x: u.x + (Math.random() - 0.5) * 14, y: u.y, z: 10 + Math.random() * 30, vz: 10, life: 0.6, size: 1.4, col: '#d8f0ff', shape: 'sq' }); }
    if (u.def.tint && !opts.flash) { opts.flash = 0.25 + 0.25 * Math.sin(R.t * 12 + u.id); opts.flashCol = u.def.tint; }
    if (u.soul) {
      // A bound soul: a pale wisp at first, then solid in its colour, then ascended in a cold flame (D.SOULS).
      const st = u.soul.stage, sc2 = u.def.color, pulse = 0.5 + 0.5 * Math.sin(R.t * 4 + u.id);
      opts.alpha = alpha * [0.62, 0.86, 0.95][st]; opts.flash = Math.max(opts.flash || 0, [0.55, 0.32, 0.22][st] + 0.08 * pulse); opts.flashCol = sc2;
      if (u.alive) {
        R.glowAt(ctx, sc2, x, y - 22 * sc, (30 + st * 10) * sc, 0.12 + st * 0.06 + 0.05 * pulse);
        if (st >= 1) { ctx.save(); ctx.translate(x, y0); ctx.scale(1, HELI.pitch); A.tex(ctx, 'magic_01', 0, 0, (34 + st * 8) * sc, (34 + st * 8) * sc, sc2, 0.35 + 0.15 * st, R.t * 1.2, true); ctx.restore(); }
        if (st === 2) { A.tex(ctx, 'smoke_07', x, y - 24 * sc, 54 * sc, 66 * sc, sc2, 0.3 + 0.1 * pulse, R.t * 2, true); A.tex(ctx, 'light_01', x, y - 24 * sc, 64 * sc, 64 * sc, sc2, 0.22, 0, true); }
        if (Math.random() < 0.18 + st * 0.12) P({ x: u.x + (Math.random() - 0.5) * 16 * u.scale, y: u.y, z: 6 + Math.random() * 20, vz: 26 + Math.random() * 30, life: 0.9, size: 1.4 + st * 0.3, col: sc2, shape: 'sq' });
      }
    } else if (u.ally) { opts.alpha = alpha * 0.82; opts.flash = Math.max(opts.flash || 0, 0.35); opts.flashCol = '#a070ff'; }
    if (u.def.clone) { opts.flash = Math.max(opts.flash || 0, 0.45); opts.flashCol = '#20081a'; }
    if (u === s.hero && s.invisT > 0) opts.alpha = 0.35;
    if (winding && u.atk.unparry) { opts.flash = 0.3 + 0.25 * Math.sin(R.t * 30); opts.flashCol = R.safe ? '#ff9a1a' : '#ff2040'; }
    if (u.team === 'hero' && u.iframes > 0 && u.state !== 'dodge' && u.state !== 'hurt' && Math.floor(R.t * 20) % 2) opts.alpha = 0.55;
    if (u.state === 'dodge') for (let i = 1; i <= 4; i++) { const g = R.P(u.x - u.dodgeDir[0] * i * 10, u.y - u.dodgeDir[1] * i * 10); A.actor(ctx, u.set, u.clip, Math.max(0, u.frame - i * 2), sa, g.x, g.y, sc, { shade: RED, alpha: 0.32 - i * 0.07 }); }
    A.actor(ctx, u.set, u.clip, u.frame, sa, x, y, sc, opts);
    if (winding) {
      const k = Math.min(1, u.st / (u.atk.wind * u.windMul)), hy = y - (48 * u.scale + 10) * Sh, col = u.atk.unparry ? (R.safe ? '#ff9a1a' : RED) : (R.safe ? '#3aa0ff' : '#ffffff');
      ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2 * R.dpr; ctx.globalAlpha = 0.35 + 0.65 * k;
      ctx.beginPath(); ctx.arc(x, hy, (4 + 12 * (1 - k)) * Sh * 0.5, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, hy, 1.6 * R.dpr * (1 + k), 0, 7); ctx.fill();
      if (k > 0.75) R.glowAt(ctx, col, x, hy, 14 * Sh * 0.5, 0.6);
      ctx.restore();
    }
    if (u.stunT > 0 && u.alive) { const hy = y - (50 * u.scale + 6) * Sh; for (let i = 0; i < 3; i++) { const a = R.t * 6 + i * 2.09; ctx.fillStyle = '#fff0a0'; const sx = x + Math.cos(a) * 8 * Sh, sy = hy + Math.sin(a) * 2.5 * Sh; ctx.beginPath(); for (let j = 0; j < 8; j++) { const aa = j * Math.PI / 4, rr = j % 2 ? 1 * Sh : 2.6 * Sh; ctx.lineTo(sx + Math.cos(aa) * rr, sy + Math.sin(aa) * rr); } ctx.fill(); } }
    if (u.state === 'parry' && u.st <= s.mods.parryWin) {
      ctx.save(); ctx.strokeStyle = '#cfeeff'; ctx.lineWidth = 2.5 * R.dpr; ctx.globalAlpha = 0.9;
      const cx = x + Math.cos(sa) * 5 * Sh, cy = y - 22 * Sh + Math.sin(sa) * 3 * Sh;
      ctx.beginPath(); ctx.arc(cx, cy, 15 * Sh, sa - 1.1, sa + 1.1); ctx.stroke();
      R.glowAt(ctx, '#cfeeff', cx + Math.cos(sa) * 12 * Sh, cy + Math.sin(sa) * 12 * Sh, 18 * Sh, 0.35); ctx.restore();
    }
  }

  // An entrance: a rift opens in the floor and the foe rises out of it; a boss drops from the sky.
  function drawSpawn(ctx, u, x, y, sc, sa) {
    const k = Math.min(1, u.st / u.dur), Sh = R.Sh();
    if (u.mode === 'side') {
      // Running in through a side gate at the arena's edge: the gate glows while it lets them through.
      drawSideGate(ctx, u.from.x, u.from.y, 1 - Math.max(0, (k - 0.7) / 0.3), Math.min(1, k * 4));
      A.actor(ctx, u.set, 'Run', u.frame, sa, x, y, sc, k < 0.25 ? { shade: '#05030a', alpha: 0.4 + k * 2.4 } : {});
      if (Math.random() < 0.4) P({ x: u.x, y: u.y, z: 1, vz: 10, life: 0.3, size: 1.5, col: 'rgba(200,190,200,0.4)', shape: 'circle' });
      return;
    }
    if (u.mode === 'drop' && !u.def.boss) {
      const z = Math.pow(1 - k, 2) * 120, sw = 26 * sc * (0.3 + 0.7 * k);
      ctx.save(); ground(ctx); ctx.strokeStyle = `rgba(255,255,255,${0.3 + 0.5 * k})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(u.x, u.y, 12 * u.scale * (1.8 - 0.8 * k), 0, 7); ctx.stroke(); ctx.restore();
      ctx.globalAlpha = 0.25 + 0.5 * k; ctx.drawImage(shadowImg(), x - sw / 2, y - sw * 0.12, sw, sw * 0.25); ctx.globalAlpha = 1;
      A.actor(ctx, u.set, u.clip, u.frame, sa, x, y - z * Sh, sc, k < 0.8 ? { shade: '#05030a' } : {});
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = R.dpr; ctx.beginPath(); ctx.moveTo(x, y - z * Sh - 40 * sc); ctx.lineTo(x, y - z * Sh - 90 * sc); ctx.stroke();
      return;
    }
    if (u.def.boss && u.mode === 'drop') {
      const z = Math.pow(1 - k, 2) * 150, sw = 26 * sc * (0.4 + 0.6 * k);
      ctx.save(); ground(ctx); const rr = 26 * u.scale; ctx.fillStyle = `rgba(255,42,68,${0.12 + 0.2 * k})`; ctx.beginPath(); ctx.arc(u.x, u.y, rr, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,42,68,0.85)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(u.x, u.y, rr * (1.6 - 0.6 * k), 0, 7); ctx.stroke(); ctx.restore();
      ctx.globalAlpha = 0.3 + 0.6 * k; ctx.drawImage(shadowImg(), x - sw / 2, y - sw * 0.12, sw, sw * 0.25); ctx.globalAlpha = 1;
      A.actor(ctx, u.set, u.clip, u.frame, sa, x, y - z * Sh, sc, k < 0.85 ? { shade: '#000000' } : {});
      if (k < 0.9) { ctx.strokeStyle = 'rgba(255,42,68,0.5)'; ctx.lineWidth = 2 * R.dpr; ctx.beginPath(); ctx.moveTo(x, y - z * Sh - 40 * sc); ctx.lineTo(x, y - z * Sh - 160 * sc); ctx.stroke(); }
      return;
    }
    const open = Math.min(1, k * 3), rw = 18 * sc * open;
    ctx.save();
    ctx.save(); ctx.translate(x, y); ctx.scale(1, HELI.pitch * 0.7);
    A.tex(ctx, 'magic_01', 0, 0, rw * 3.2, rw * 3.2, '#c070ff', 0.9, R.t * 0.8 + u.id, true);
    A.tex(ctx, 'twirl_02', 0, 0, rw * 2.4, rw * 2.4, '#c070ff', 0.85, R.t * 3, true);
    A.tex(ctx, 'smoke_07', 0, 0, rw * 2.6, rw * 2.6, '#1a0820', 0.6, -R.t, false); ctx.restore();
    A.tex(ctx, 'light_01', x, y - 10 * sc, 40 * sc * open, 50 * sc * open, '#c070ff', 0.7, 0, true);
    // The body rises out of the floor: cut off at the floor line, black first, then its colours.
    const rise = Math.max(0, (k - 0.25) / 0.75);
    if (rise > 0) {
      ctx.beginPath(); ctx.rect(x - 60 * sc, y - 90 * sc, 120 * sc, 90 * sc + 2); ctx.clip();
      const oy = y + (1 - rise) * 46 * sc;
      A.actor(ctx, u.set, u.clip, u.frame, sa, x, oy, sc, rise < 0.7 ? { shade: '#05030a' } : { alpha: 1, flash: (1 - rise) * 2, flashCol: '#c070ff' });
    }
    ctx.restore();
    for (let i = 0; i < 2; i++) if (Math.random() < 0.5) P({ x: u.x + (Math.random() - 0.5) * 20, y: u.y + (Math.random() - 0.5) * 8, z: 2, vx: 0, vy: 0, vz: 30 + Math.random() * 40, g: 0, life: 0.6, size: 1.4, col: 'rgba(200,90,255,0.8)', shape: 'sq' });
  }
  // ---- The portal, built only from the vfx textures (assets/vfx) ----------------------------------------
  // On the floor: two rune rings turning against each other over a pool of light. Upright: a ring of
  // light for a rim, smoke churning around it, three layers of swirl turning inside, a bright core,
  // flares orbiting the edge and a beam into the sky. open (0..1) grows it from a single flare to a
  // slit to the full oval; rise (0..1) gathers the floor rings and smoke before it opens.
  function vfxPortal(ctx, x, y, u, col, rise, open, t, alpha) {
    const ga = ctx.globalAlpha; ctx.globalAlpha = ga * (alpha == null ? 1 : alpha);
    const hot = mix(col, '#ffffff', 0.45), deep = mix(col, '#000000', 0.55);
    // The floor.
    ctx.save(); ctx.translate(x, y); ctx.scale(1, HELI.pitch);
    A.tex(ctx, 'light_01', 0, 0, 130 * u * rise, 130 * u * rise, col, 0.28 * rise, 0, true);
    A.tex(ctx, 'magic_02', 0, 0, 150 * u * rise, 150 * u * rise, col, 0.9 * rise, t * 0.6, true);
    A.tex(ctx, 'magic_01', 0, 0, 100 * u * rise, 100 * u * rise, hot, 0.8 * rise, -t * 0.9, true);
    A.tex(ctx, 'circle_03', 0, 0, (120 + 10 * Math.sin(t * 4)) * u * rise, (120 + 10 * Math.sin(t * 4)) * u * rise, col, 0.32 * rise, 0, true);
    ctx.restore();
    const cy = y - 58 * u, W = 74 * u, H = 112 * u, w = W * Math.max(0.04, open), h = H * (0.25 + 0.75 * Math.min(1, open * 3 + rise * 0.2));
    // Smoke gathering and churning around the rim (spiralling in while it rises).
    for (let i = 0; i < 12; i++) {
      const a = t * (1.1 + (i % 3) * 0.25) + i * 0.52, rr = 0.55 + (1 - rise) * 0.9 + 0.06 * Math.sin(t * 3 + i);
      const sx = x + Math.cos(a) * (Math.max(w, W * 0.3)) * rr, sy = cy + Math.sin(a) * h * rr * 0.62, sz = (34 + 14 * ((i * 7) % 3)) * u;
      A.tex(ctx, i % 2 ? 'smoke_07' : 'smoke_04', sx, sy, sz, sz, deep, 0.55 * rise, a, false);
      A.tex(ctx, i % 2 ? 'smoke_04' : 'smoke_07', sx, sy, sz * 0.8, sz * 0.8, col, 0.22 * rise, -a, true);
    }
    // The beam into the sky.
    if (open > 0.15) A.tex(ctx, 'light_01', x, cy - R.H * 0.5, (30 + 8 * Math.sin(t * 9)) * u * open, R.H * 1.1, hot, 0.35 * open, 0, true);
    // The flare that becomes the portal.
    if (open < 1) { const f = rise * (1 - open); A.tex(ctx, 'star_06', x, cy, (60 + 90 * open) * u, (60 + 90 * open) * u, '#ffffff', f, t * 0.8, true); }
    if (open > 0) {
      // Inside: the swirl, three layers turning, and a hot core.
      A.tex(ctx, 'light_01', x, cy, w * 1.8, h * 1.5, col, 0.3 * open, 0, true);
      A.tex(ctx, 'smoke_07', x, cy, w * 1.15, h * 0.95, '#07020a', 0.95, t * 0.5, false);
      A.tex(ctx, 'smoke_04', x, cy, w * 0.95, h * 0.8, '#0c0310', 0.9, -t * 0.7, false);
      A.tex(ctx, 'twirl_02', x, cy, w * 1.25, h * 1.05, col, 0.95, t * 2.4, true);
      A.tex(ctx, 'twirl_02', x, cy, w * 0.95, h * 0.8, RED, 0.6, -t * 3.1, true);
      A.tex(ctx, 'twirl_02', x, cy, w * 0.7, h * 0.6, '#ffffff', 0.5, t * 4, true);
      A.tex(ctx, 'magic_01', x, cy, w * 0.9, h * 0.65, hot, 0.5 * open, -t * 1.5, true);
      A.tex(ctx, 'light_01', x, cy, w * 0.45, h * 0.38, '#ffffff', 0.7, 0, true);
      // The rim: a ring of light squeezed into an oval, doubled for a hot edge.
      A.tex(ctx, 'circle_03', x, cy, w * 1.35, h * 1.15, col, 0.9, 0, true);
      A.tex(ctx, 'circle_03', x, cy, w * 1.25, h * 1.07, '#ffffff', 0.3 + 0.15 * Math.sin(t * 7), 0, true);
      // Flares riding the rim.
      for (let i = 0; i < 6; i++) { const a = t * 1.8 + i * Math.PI / 3, tw = 0.5 + 0.5 * Math.sin(t * 9 + i * 2); A.tex(ctx, 'star_06', x + Math.cos(a) * w * 0.6, cy + Math.sin(a) * h * 0.52, (14 + 18 * tw) * u, (14 + 18 * tw) * u, i % 2 ? '#ffffff' : hot, open * (0.5 + 0.5 * tw), a, true); }
    }
    ctx.globalAlpha = ga;
  }
  // Foes coming in from the side step out of a small portal at the arena's edge.
  function drawSideGate(ctx, x, y, a, open) {
    if (a <= 0) return;
    const q = R.P(x, y), o = open == null ? 1 : open;
    vfxPortal(ctx, q.x, q.y, R.Sh() * 0.55, '#c070ff', 1, Math.min(1, o * 1.4), R.t * 1.4 + x, a);
  }
  // The way on: the portal rises (0 to 1 s) and bursts open (0.9 to 1.5 s). An arrival portal
  // (p.closing) stands open, then collapses to a flare and vanishes in smoke.
  function drawPortal(ctx, st, p) {
    const Sh = R.Sh(), L = st.look, t = R.t, q = R.P(p.x, p.y), col = mix(L.moonCol, '#ff2a44', 0.35);
    const rise = p.closing ? Math.max(0, 1 - Math.max(0, p.t - 0.9) / 0.6) : Math.min(1, p.t / 1.0);
    const open = p.closing ? (p.t < 0.15 ? 1 : Math.max(0, 1 - (p.t - 0.15) / 0.6)) : Math.max(0, Math.min(1, (p.t - 0.9) / 0.6));
    if (p.closing && p.t > 1.6) return;
    if (!p.boomed && (p.closing || open > 0.05)) {
      p.boomed = true; p.boomT = t;
      for (let i = 0; i < 22; i++) { const a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 160; P({ x: p.x, y: p.y, z: 20 + Math.random() * 70, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7, vz: 40 + Math.random() * 120, g: -300, life: 0.9, size: 2 + Math.random() * 2, col: i % 3 ? col : '#ffffff', shape: 'sq' }); }
      if (!p.closing) { R.impactF = { t: 0, dur: 0.09, x: p.x, y: p.y, big: false }; R.punch = 0.05; }
      R.shake = Math.max(R.shake, p.closing ? 4 : 10); R.flash = 0.5; R.flashCol = '255,235,240';
    }
    if (p.closing && !p.puffed && p.t > 0.75) { p.puffed = true; p.puffT = t; }
    vfxPortal(ctx, q.x, q.y, Sh, col, rise, open, t, 1);
    // The burst: a shockwave across the floor and a ring flung outward.
    if (p.boomT != null && t - p.boomT < 0.9) {
      const k = (t - p.boomT) / 0.9, r = (60 + 360 * k) * Sh;
      ctx.save(); ctx.translate(q.x, q.y); ctx.scale(1, HELI.pitch); A.tex(ctx, 'circle_03', 0, 0, r, r, '#ffffff', 1 - k, 0, true); ctx.restore();
      A.tex(ctx, 'circle_03', q.x, q.y - 58 * Sh, (80 + 220 * k) * Sh, (110 + 300 * k) * Sh, col, (1 - k) * 0.8, 0, true);
    }
    // A collapsed portal leaves a puff of smoke.
    if (p.puffT != null && t - p.puffT < 0.9) { const k = (t - p.puffT) / 0.9; for (let i = 0; i < 6; i++) { const a = i * 1.05; A.tex(ctx, i % 2 ? 'smoke_07' : 'smoke_04', q.x + Math.cos(a) * 40 * Sh * k, q.y - 58 * Sh + Math.sin(a) * 30 * Sh * k - 20 * Sh * k, (50 + 50 * k) * Sh, (50 + 50 * k) * Sh, mix(L.sky[0], '#ffffff', 0.4), 0.7 * (1 - k), a + k, false); } }
    if (!p.closing && rise > 0.3 && Math.random() < 0.6) P({ x: p.x + (Math.random() - 0.5) * 60, y: p.y + (Math.random() - 0.5) * 20, z: 2, vz: 50 + Math.random() * 70, life: 1.0, size: 1.6, col: Math.random() < 0.5 ? 'rgba(255,255,255,0.9)' : rgba(col, 0.9), shape: 'sq' });
  }
  // Chevrons on the floor from the hero toward the way on.
  function guide(ctx, s) {
    const p = s.portal, h = s.hero; if (!p || s.transit) return;
    const dx = p.x - h.x, dy = p.y - h.y, d = Math.hypot(dx, dy); if (d < 30) return;
    const w = VS.steer(VS.arenaOf(s), h.x, h.y, p.x, p.y);
    ground(ctx); ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(Math.atan2(w[1], w[0]));
    for (let i = 0; i < 3; i++) { const o = 26 + i * 14 + (R.t * 30) % 14, a = 0.55 - i * 0.15; ctx.strokeStyle = rgba('#ffffff', a); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(o - 5, -6); ctx.lineTo(o, 0); ctx.lineTo(o - 5, 6); ctx.stroke(); }
    ctx.restore(); unground(ctx);
  }
  // An impact frame, as in the moon arts: white with black silhouettes, then black with white ones.
  function impactFrame(ctx, s, dt) {
    if (R.calm) { R.impactF = null; return; }   // reduce flashing: no black-and-white frames
    const f = R.impactF; if (!f) return; f.t += dt; if (f.t >= f.dur) { R.impactF = null; return; }
    const first = f.t < f.dur * 0.6, bg = first ? '#ffffff' : '#050307', fg = first ? '#000000' : '#ffffff';
    ctx.fillStyle = bg; ctx.fillRect(0, 0, R.W, R.H);
    const c = R.P(f.x, f.y, 24);
    ctx.strokeStyle = first ? '#000000' : RED; ctx.lineWidth = 2 * R.dpr;
    ctx.beginPath(); for (let i = 0; i < (f.big ? 48 : 30); i++) { const a = hash(i, 77) * Math.PI * 2, r0 = R.H * (0.12 + hash(i, 78) * 0.2), r1 = r0 + R.H * (0.3 + hash(i, 79) * 0.6); ctx.moveTo(c.x + Math.cos(a) * r0, c.y + Math.sin(a) * r0); ctx.lineTo(c.x + Math.cos(a) * r1, c.y + Math.sin(a) * r1); } ctx.stroke();
    for (const u of s.units) { if (u.state === 'dead' && u.deadT > 0.5) continue; const q = R.P(u.x, u.y, u.z || 0); A.actor(ctx, u.set, u.clip, u.frame, R.screenAng(u.ang), Math.round(q.x), Math.round(q.y), R.Sh() * u.scale, { shade: fg }); }
    if (f.big) { ctx.strokeStyle = fg; ctx.lineWidth = 3 * R.dpr; ctx.beginPath(); ctx.moveTo(c.x - R.W * 0.6, c.y + R.H * 0.3); ctx.lineTo(c.x + R.W * 0.6, c.y - R.H * 0.3); ctx.stroke(); }
  }
  // The god's summit: the whole floor in view, set low in the frame so the void above it, where he stands,
  // shows; the camera only slides sideways when the screen is too narrow for the floor.
  const GOD_ZOOM = 1.3;
  function godCam(s) {
    const A = VS.arenaOf(s), Sh = R.Sh(), half = godTop(A).r, h = s.hero;
    const rxH = (h.x * hc - h.y * hs), m = Math.max(0, (half * Sh + 40 * R.dpr - R.W / 2) / Sh), rx = clamp(rxH, -m, m), ry = -0.06 * R.H / (Sh * HELI.pitch);
    return { x: rx * hc + ry * hs, y: -rx * hs + ry * hc };
  }
  // How far the floor reaches toward the top of the screen (in ground units along the screen's up), cached.
  function godTop(A) {
    if (A._top) return A._top;
    let r = 0; for (let cy = 0; cy < A.h; cy++) for (let cx = 0; cx < A.w; cx++) if (A.cells[cy * A.w + cx]) for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const x = A.x0 + (cx + ox) * A.T, y = A.y0 + (cy + oy) * A.T; r = Math.max(r, Math.abs(x * hs + y * hc), Math.abs(x * hc - y * hs)); }
    return (A._top = { r });
  }
  R.follow = function (s, dt) {
    R.camFix = s.god && VS.arenaOf(s).godR ? GOD_ZOOM : 0;
    if (R.camFix) { const c = godCam(s), k = Math.min(1, dt * 4); R.hcam.x += (c.x - R.hcam.x) * k; R.hcam.y += (c.y - R.hcam.y) * k; return; }
    const h = s.hero, f = VS.sim.foes(s).sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y))[0];
    let tx = h.x, ty = h.y;
    if (f && Math.hypot(f.x - h.x, f.y - h.y) < 180) { tx = h.x * 0.65 + f.x * 0.35; ty = h.y * 0.65 + f.y * 0.35; }
    // While a door opens the camera turns to it, then keeps it in view as the hero walks over.
    const A = VS.arenaOf(s);
    if (A.kind === 'grid') { const B = A.bounds, m = A.T * 0.9; tx = clamp(tx, B.x0 + m, B.x1 - m); ty = clamp(ty, B.y0 + m, B.y1 - m); }
    else { const lx = A.shape === 'rect' ? A.hw * 0.62 : A.shape === 'cross' ? A.arm * 0.6 : A.r * 0.45, ly = A.shape === 'rect' ? A.hh * 0.55 : lx; tx = clamp(tx, -lx, lx); ty = clamp(ty, -ly, ly); }
    // The door stands tall: aim a little above its foot (screen up) so the whole of it is in frame.
    if (s.portal) { const P0 = s.portal, k = Math.min(1, P0.t / 1.2), w = P0.t < 1.9 ? 0.95 * k : 0.5, up = 70; tx += (P0.x - hs * up - tx) * w; ty += (P0.y - hc * up - ty) * w; }
    const k = Math.min(1, dt * 4); R.hcam.x += (tx - R.hcam.x) * k; R.hcam.y += (ty - R.hcam.y) * k;
  };
  R.snapCam = function (s) {
    R.camFix = s.god && VS.arenaOf(s).godR ? GOD_ZOOM : 0;
    if (R.camFix) { const c = godCam(s); R.hcam.x = c.x; R.hcam.y = c.y; return; }
    const k = VS.arenaOf(s).kind === 'grid' ? 1 : 0.6; R.hcam.x = s.hero.x * k; R.hcam.y = s.hero.y * k;
  };
  R.drawFight = function (ctx, s, dt) {
    const st = s.def;
    if (!s.staged) R.follow(s, dt);
    // Inside the warp tunnel nothing of the arena shows: draw only the tunnel.
    if (s.transit && s.transit.t > VS.TRANSIT.into + 0.05 && s.transit.t < VS.TRANSIT.swap) { transitOverlay(ctx, s); R.shake = Math.max(0, R.shake - dt * 22); return; }
    // Arriving: the door he came through seals behind him.
    if (s.entry && s.entry !== R.entrySeen) { R.entrySeen = s.entry; const en = s.entry, gr = VS.arenaOf(s).kind === 'grid', n = Math.hypot(en.x, en.y) || 1; R.entryDoor = { x: gr ? en.x - 26 : en.x + en.x / n * 26, y: gr ? en.y : en.y + en.y / n * 26, t: 0, kind: s.entry.kind === 'stairs' ? 'gate' : s.entry.kind, closing: true }; }
    if (R.entryDoor) { R.entryDoor.t += dt; if (R.entryDoor.t > 1.8) R.entryDoor = null; }
    const zoomIn = s.transit && s.transit.t < VS.TRANSIT.swap && s.transit.p ? Math.pow(Math.min(1, s.transit.t / VS.TRANSIT.swap), 2) * 0.7 : 0;
    ctx.save();
    if (zoomIn) { const c = R.P(s.transit.p.x, s.transit.p.y, 40), z = 1 + zoomIn; ctx.translate(c.x, c.y); ctx.scale(z, z); ctx.translate(-c.x, -c.y); }
    // A filmed story shot pushes the camera in on the action.
    if (s.zoom && s.zoom !== 1) { ctx.translate(R.W / 2, R.H * 0.56); ctx.scale(s.zoom, s.zoom); ctx.translate(-R.W / 2, -R.H * 0.56); }
    // A camera punch on the big blows: a quick zoom in that springs back.
    if (R.punch > 0.001) { const z = 1 + R.punch; ctx.translate(R.W / 2, R.H * 0.56); ctx.scale(z, z); ctx.translate(-R.W / 2, -R.H * 0.56); R.punch = Math.max(0, R.punch - (R.realDt || dt) * 0.45); }
    R.baseT = ctx.getTransform();
    // The sky and the moon behind the platform, drifting a little with the camera.
    const sky = heliSky(st); ctx.drawImage(sky, -40 - Math.round(R.hcam.x * 0.06 * R.dpr), 0);
    // The arena: a large tile map (its ground and the walls behind), or the old round platform.
    const AR = VS.arenaOf(s);
    R.isoGround(ctx, s, AR);
    // Warm light from the braziers on the floor, and fog drifting across it.
    fog(ctx, st);
    if (s.god) { drawGod(ctx, s, dt); godAmbience(ctx, s, dt); }   // the god towers over the far edge of the summit
    hazards(ctx, s);
    telegraphs(ctx, s);
    guide(ctx, s);
    // Reflections in the glossy floor, then everything upright sorted by depth.
    const units = s.units.slice();
    const items = units.map((u) => ({ d: R.P(u.x, u.y).d, u })).concat(R.isoItems(s, AR));
    if (s.portal) items.push({ d: R.P(s.portal.x, s.portal.y).d - 1, portal: s.portal });
    if (R.entryDoor) items.push({ d: R.P(R.entryDoor.x, R.entryDoor.y).d - 1, portal: R.entryDoor });
    items.sort((a, b) => a.d - b.d);
    for (const it of items) { if (it.u) drawUnit(ctx, s, it.u); else if (it.portal) drawPortal(ctx, st, it.portal); else if (it.iso) R.isoDraw(ctx, s, AR, it); }
    R.isoLights(ctx, s, AR);
    // Pickups: a health orb or a moon shard bobbing where they fell (the forge's v_orb_*).
    for (const p of s.drops || []) { const q = R.P(p.x, p.y), fade = p.t > 12 ? Math.max(0, (14 - p.t) / 2) * (Math.sin(R.t * 20) > 0 ? 1 : 0.4) : Math.min(1, p.t * 4); A.fx(ctx, p.kind === 'hp' ? 'v_orb_hp' : 'v_orb_moon', R.t + p.x * 0.01, q.x, q.y, R.Sh() * 0.7, fade); }
    // Bolts: a glowing orb with a tail.
    for (const b of s.bolts) {
      const q = R.P(b.x, b.y, 16), t = R.P(b.x - b.vx * 0.12, b.y - b.vy * 0.12, 16);
      const col = b.reflected ? '#ffffff' : ({ wind_gust: '#dfe8ff', dark_slash: RED, fireball: '#ff8040', fireball_big: '#ff8040', explosion_fire: '#ff8040', magic_missile: '#ff9ad0', fireball_arcane: '#d080ff', arcane_orb: '#c070ff', rock: '#d8b060', arrow: '#ffffff', dart: '#c0e0a0', dagger: '#e0d0ff' })[b.fx] || '#c070ff';
      ctx.save(); ctx.strokeStyle = rgba(col, 0.45); ctx.lineWidth = (b.big ? 7 : 3.5) * R.Sh() * 0.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(q.x, q.y); ctx.stroke(); ctx.restore();
      R.glowAt(ctx, col, q.x, q.y, (b.big ? 22 : 12) * R.Sh(), 0.8);
      const sa = Math.atan2(q.y - t.y, q.x - t.x), info = A.hasFx(b.fx);
      if (info) A.fx(ctx, b.fx, b.t, q.x, q.y, R.Sh() * (b.big ? 1.3 : 0.75), 1, sa);
      else { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(q.x, q.y, 2.4 * R.Sh(), 0, 7); ctx.fill(); }
    }
    chains(ctx, dt);
    drawFx(ctx, dt);
    R.drawWeather(ctx, st, R.hcam.x * 0.5, R.t, 0.45);
    ctx.restore(); R.baseT = null;
    // Floaters.
    R.floaters = R.floaters.filter((fl) => {
      fl.t += dt; const k = fl.t / (fl.label ? 1.0 : 0.8); if (k >= 1) return false;
      const pop = fl.t < 0.08 ? 1.5 - fl.t / 0.08 * 0.5 : 1, size = (fl.label ? 15 : fl.big ? 20 : 14) * R.k * pop, q = R.P(fl.x, fl.y, fl.z + k * 14);
      ctx.save(); ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      ctx.font = R.fd(size, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.lineWidth = 4 * R.dpr; ctx.strokeStyle = 'rgba(8,4,10,0.85)'; ctx.strokeText(fl.text, q.x, q.y); ctx.fillStyle = fl.col; ctx.fillText(fl.text, q.x, q.y);
      ctx.restore(); return true;
    });
    if (!s.staged) offscreen(ctx, s);
    R.drawStreak(ctx, dt);
    const h = s.hero;
    if (s.slowT > 0) { ctx.fillStyle = 'rgba(140,230,255,0.07)'; ctx.fillRect(0, 0, R.W, R.H); }
    if (h.alive && h.hp / h.maxHp <= s.mods.ldx) vignette(ctx, 0.35 + 0.15 * Math.sin(R.t * 5));
    if (R.calm) R.flash = Math.min(R.flash, 0.25);
    if (R.flash > 0) { ctx.fillStyle = `rgba(${R.flashCol},${R.flash * 0.45})`; ctx.fillRect(0, 0, R.W, R.H); R.flash = Math.max(0, R.flash - dt * 2.8); }
    impactFrame(ctx, s, R.realDt || dt);
    transitOverlay(ctx, s);
    R.shake = Math.max(0, R.shake - dt * 22);
  };
  // Foes out of sight: a red chevron at the screen's edge pointing at each (bigger for bosses), so a
  // wave closing in from all sides on the large maps is never a surprise.
  function offscreen(ctx, s) {
    const m = 26 * R.k, cx = R.W / 2, cy = R.H / 2;
    for (const u of s.units) {
      if (u.team !== 'foe' || !u.alive || u.def.god) continue;
      const q = R.P(u.x, u.y, 20); if (q.x > m && q.x < R.W - m && q.y > m && q.y < R.H - m) continue;
      const dx = q.x - cx, dy = q.y - cy, k = Math.min((cx - m) / Math.abs(dx || 1e-6), (cy - m) / Math.abs(dy || 1e-6)), x = cx + dx * k, y = cy + dy * k, an = Math.atan2(dy, dx), r = (u.def.boss ? 11 : 7) * R.k;
      ctx.save(); ctx.translate(x, y); ctx.rotate(an); ctx.globalAlpha = 0.6 + 0.3 * Math.sin(R.t * 6 + u.id);
      ctx.fillStyle = u.def.boss || u.elite ? '#ff2a44' : '#ff6a7a'; ctx.strokeStyle = 'rgba(8,4,10,0.8)'; ctx.lineWidth = 2 * R.dpr;
      ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(-r * 0.7, -r * 0.8); ctx.lineTo(-r * 0.3, 0); ctx.lineTo(-r * 0.7, r * 0.8); ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore();
    }
  }
  function transitOverlay(ctx, s) {
    // Travelling through the way on: rush into the door through speed lines, white out, then arrive
    // through a door that seals behind.
    if (s.transit) {
      const T = VS.TRANSIT, t = s.transit.t, pre = t < T.swap;
      const a = pre ? Math.max(0, (t - T.into * 0.6) / (T.swap - T.into * 0.6)) : Math.max(0, 1 - (t - T.swap) / 0.6);
      const c = pre && s.transit.p ? R.P(s.transit.p.x, s.transit.p.y, 40) : { x: R.W / 2, y: R.H / 2 };
      const tun = pre ? Math.max(0, Math.min(1, (t - T.into) / (T.swap - T.into))) : 0;
      if (pre && t < T.into + 0.05) {
        // Rushing in: speed lines converge on the door.
        ctx.save(); ctx.strokeStyle = `rgba(255,255,255,${Math.min(1, a * 1.4)})`; ctx.lineWidth = 2 * R.dpr; ctx.beginPath();
        for (let i = 0; i < 70; i++) { const an = hash(i, 91) * Math.PI * 2, r0 = R.H * (0.08 + hash(i, 92) * 0.2) * (1 - a * 0.6), r1 = r0 + R.H * (0.3 + hash(i, 93) * 0.9); ctx.moveTo(c.x + Math.cos(an) * r0, c.y + Math.sin(an) * r0); ctx.lineTo(c.x + Math.cos(an) * r1, c.y + Math.sin(an) * r1); }
        ctx.stroke(); ctx.restore();
        ctx.fillStyle = `rgba(255,246,248,${a * 0.8})`; ctx.fillRect(0, 0, R.W, R.H);
      } else if (pre) {
        // The warp tunnel: streaks rushing past, the knight falling through it, a white flash at the end.
        const cx = R.W / 2, cy = R.H / 2, D = Math.hypot(R.W, R.H) / 2;
        ctx.fillStyle = '#07040a'; ctx.fillRect(0, 0, R.W, R.H);
        const gl = ctx.createRadialGradient(cx, cy, 0, cx, cy, R.H * 0.5); gl.addColorStop(0, 'rgba(255,255,255,0.9)'); gl.addColorStop(0.15, 'rgba(255,60,90,0.45)'); gl.addColorStop(1, 'rgba(255,42,68,0)'); ctx.fillStyle = gl; ctx.fillRect(0, 0, R.W, R.H);
        // The vortex: layers of the swirl texture turning and swelling toward the viewer, a rune ring.
        for (let i = 0; i < 4; i++) { const ph = (t * 0.9 + i / 4) % 1, sz = D * 2.6 * ph * ph; A.tex(ctx, 'twirl_02', cx, cy, sz, sz * 0.7, i % 2 ? '#ff2a44' : '#ffffff', Math.sin(ph * Math.PI) * 0.9, t * (2 + i) * (i % 2 ? -1 : 1), true); }
        A.tex(ctx, 'magic_02', cx, cy, R.H * (0.6 + tun), R.H * (0.6 + tun) * 0.7, '#ff2a44', 0.6, t * 1.2, true);
        A.tex(ctx, 'light_01', cx, cy, R.H * 0.5, R.H * 0.5, '#ffffff', 0.8, 0, true);
        const h2 = s.hero, sc = R.Sh() * (1.6 + tun * 1.4);
        for (let i = 3; i >= 1; i--) A.actor(ctx, h2.set, 'Rolling', 6, -Math.PI / 2, cx, cy + 30 * R.Sh() + i * 14 * R.Sh(), sc, { shade: '#ff2a44', alpha: 0.15 * (4 - i) });
        A.actor(ctx, h2.set, 'Attack4', Math.min(14, Math.floor(tun * 14)), -Math.PI / 2, cx, cy + 30 * R.Sh(), sc, { shade: '#ffffff' });
        if (tun > 0.88) { ctx.fillStyle = `rgba(255,250,252,${(tun - 0.88) / 0.12})`; ctx.fillRect(0, 0, R.W, R.H); }
      } else { ctx.fillStyle = `rgba(255,246,248,${a})`; ctx.fillRect(0, 0, R.W, R.H); }
    }
  }
  function vignette(ctx, a) {
    if (!cache.vig) {
      const c = cache.vig = document.createElement('canvas'); c.width = R.W; c.height = R.H; const g = c.getContext('2d');
      const gr = g.createRadialGradient(R.W / 2, R.H / 2, R.H * 0.38, R.W / 2, R.H / 2, R.W * 0.62); gr.addColorStop(0, 'rgba(210,10,35,0)'); gr.addColorStop(1, 'rgba(210,10,35,1)');
      g.fillStyle = gr; g.fillRect(0, 0, R.W, R.H);
    }
    const ga = ctx.globalAlpha; ctx.globalAlpha = a; ctx.drawImage(cache.vig, 0, 0); ctx.globalAlpha = ga;
  }
  // Where a unit's head is on screen (for lines spoken in a fight).
  R.headOf = (u) => { const q = R.P(u.x, u.y, 50 * u.scale + (u.z || 0)); return { x: q.x, y: q.y }; };

  // The cinematic has its own canvas over the game: the 180 px pixel buffer, stretched to the screen
  // by CSS with pixelated sampling (the browser's compositor does the enlargement).
  // Clear the pixel buffer, fit it to the screen's shape and show it; returns its context.
  R.pxBegin = function () {
    const c = PX.ctx, el = PX.buf;
    if (!el.parentNode) {
      el.id = 'cine'; Object.assign(el.style, { position: 'fixed', left: '0', top: '0', width: '100%', height: '100%', imageRendering: 'pixelated', zIndex: '4', pointerEvents: 'none', display: 'none' });
      document.body.appendChild(el);
    }
    PX.fit(R.W / R.H);
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, PX.W, PX.H); c.globalAlpha = 1; c.imageSmoothingEnabled = false;
    if (el.style.display !== 'block') el.style.display = 'block';
    return c;
  };
  R.drawCine = function (ctx, s) {
    const h = s.hero, c = R.pxBegin();
    const q = R.P(h.x, h.y);
    PX.heroAt = { x: q.x / R.W * PX.W, y: q.y / R.H * PX.H, k: R.Sh() * h.scale * PX.H / R.H };
    VS.cine.draw(c, s);
    if (PX.shake > 0) { R.shake = Math.max(R.shake, PX.shake * 1.5); PX.shake = 0; }
  };
  // A full-resolution layer above the pixel buffer for the words in a cinematic, so they stay sharp.
  const txt = document.createElement('canvas');
  R.pxText = function () {
    if (!txt.parentNode) { txt.id = 'cine-text'; Object.assign(txt.style, { position: 'fixed', left: '0', top: '0', width: '100%', height: '100%', zIndex: '5', pointerEvents: 'none', display: 'none' }); document.body.appendChild(txt); }
    if (txt.width !== R.W || txt.height !== R.H) { txt.width = R.W; txt.height = R.H; }
    const c = txt.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, R.W, R.H); c.globalAlpha = 1;
    if (txt.style.display !== 'block') txt.style.display = 'block';
    return c;
  };
  R.hideCine = function () {
    if (PX.buf.parentNode && PX.buf.style.display !== 'none') PX.buf.style.display = 'none';
    if (txt.parentNode && txt.style.display !== 'none') txt.style.display = 'none';
  };
  R.cineCovers = (s) => s.cine && VS.cine.beatAt(s.cine)[0] !== 'snap';

  // ---- HUD --------------------------------------------------------------------------------------------
  // The interface's pixel pieces (assets/ui/vesper, drawn by tools_ui.py), shown at a whole-pixel scale.
  const uiImg = {};
  function ui(name) { let im = uiImg[name]; if (!im) { im = uiImg[name] = new Image(); im.src = A.ROOT + 'ui/vesper/' + name + '.png'; } return im.complete && im.naturalWidth ? im : null; }
  R.px = () => Math.max(2, Math.round(R.k * 1.5));
  // A 9-slice frame: the corners at whole-pixel scale, the edges and the middle stretched.
  R.frame9 = function (ctx, name, x, y, w, h, slice, ps) {
    const im = ui(name); if (!im) { ctx.fillStyle = 'rgba(10,6,12,0.86)'; ctx.fillRect(x, y, w, h); return; }
    const n = im.naturalWidth, c = slice, d = c * (ps || R.px()), sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const sx = [0, c, n - c, n], dx = [x, x + d, x + w - d, x + w], sy = [0, c, n - c, n], dy = [y, y + d, y + h - d, y + h];
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { const sw = sx[i + 1] - sx[i], sh = sy[j + 1] - sy[j], ww = dx[i + 1] - dx[i], hh = dy[j + 1] - dy[j]; if (ww > 0 && hh > 0) ctx.drawImage(im, sx[i], sy[j], sw, sh, dx[i], dy[j], ww, hh); }
    ctx.imageSmoothingEnabled = sm;
  };
  R.uiImg = ui;
  // A pixel bar: an iron rim, a dark trough, the fill in segments with a lit top row, a white trail for damage just taken.
  function slantBar(ctx, x, y, w, h, frac, trail, col) {
    const p = Math.max(1, Math.round(R.px() / 2)); x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.max(4 * p, Math.round(h / p) * p);
    ctx.fillStyle = '#050307'; ctx.fillRect(x - 2 * p, y - 2 * p, w + 4 * p, h + 4 * p);
    ctx.fillStyle = '#4a3a46'; ctx.fillRect(x - p, y - p, w + 2 * p, p); ctx.fillStyle = '#261c24'; ctx.fillRect(x - p, y + h, w + 2 * p, p);
    ctx.fillStyle = '#160c12'; ctx.fillRect(x, y, w, h);
    if (trail > frac) { ctx.fillStyle = '#f3e0e4'; ctx.fillRect(x, y, Math.round(w * trail), h); }
    if (frac > 0) {
      const fw = Math.max(p, Math.round(w * frac)); ctx.fillStyle = mix(col, '#000000', 0.2); ctx.fillRect(x, y, fw, h);
      ctx.fillStyle = col; ctx.fillRect(x, y, fw, h - 2 * p); ctx.fillStyle = mix(col, '#ffffff', 0.45); ctx.fillRect(x, y, fw, p);
      ctx.fillStyle = 'rgba(5,3,7,0.45)'; const seg = 8 * p; for (let sx = x + seg; sx < x + fw; sx += seg) ctx.fillRect(sx, y, p, h);
    }
  }
  const trails = {};
  function trailOf(id, v, dt) { const t = trails[id] == null ? v : trails[id]; trails[id] = v < t ? Math.max(v, t - dt * 0.5) : v; return trails[id]; }
  function label(ctx, text, x, y, size, col, align, spacing, weight) {
    ctx.font = R.fd(size, weight || 600); ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
    if ('letterSpacing' in ctx) ctx.letterSpacing = (spacing || 0) * 0.35 * R.dpr + 'px';
    // A hard pixel shadow under every label, like the rest of the game's text.
    const off = Math.max(1, Math.round(size / 9)); ctx.fillStyle = 'rgba(5,3,7,0.9)'; ctx.fillText(text, x + off, y + off);
    ctx.fillStyle = col; ctx.fillText(text, x, y);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }
  R.label = label;
  R.drawHud = function (ctx, s, dt, opts) {
    const h = s.hero, k = R.k, m = 18 * k, W = R.W;
    // The knight.
    const bw = Math.min(W * 0.3, 250 * k), hf = h.hp / h.maxHp;
    R.frame9(ctx, 'frame_thin', m - 10 * k, m - 8 * k, bw + 56 * k, 46 * k, 8, Math.max(1, Math.round(R.px() * 0.75)));
    label(ctx, s.heroDef.name || 'Vesper', m, m + 10 * k, 13 * k, '#f3eef0', 'left', 1);
    slantBar(ctx, m, m + 17 * k, bw, 9 * k, hf, trailOf('hero', hf, dt), RED);
    label(ctx, `${Math.ceil(h.hp)}`, m + bw + 8 * k, m + 25 * k, 12 * k, '#f3eef0', 'left', 0, 700);
    // The moon gauge (once the ultimate is learned).
    if (!s.mods.can || s.mods.can.art) {
    const gx = m + 16 * k, gy = m + 52 * k, gr = 14 * k, mk = s.moon / 100, full = mk >= 1;
    ctx.lineWidth = 3 * k * 0.8; ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.arc(gx, gy, gr, 0, 7); ctx.stroke();
    ctx.strokeStyle = full ? RED : '#c8203a'; ctx.beginPath(); ctx.arc(gx, gy, gr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * mk); ctx.stroke();
    if (full) R.glowAt(ctx, RED, gx, gy, gr * 2.6, 0.45 + 0.25 * Math.sin(R.t * 6));
    ctx.fillStyle = full ? RED : 'rgba(200,32,58,0.45)'; ctx.beginPath(); ctx.arc(gx, gy, gr * 0.62 * (full ? 1 : 0.4 + 0.6 * mk), 0, 7); ctx.fill();
    if (full) {
      const ldx = VS.ldxReady(s);
      label(ctx, ldx ? 'LAST DITCH EFFORT' : 'RED MOON', gx + gr + 10 * k, gy + 1 * k, (ldx ? 15 : 13) * k, ldx ? (Math.sin(R.t * 10) > 0 ? RED : '#ffffff') : '#ff8a9a', 'left', 2, 700);
      label(ctx, opts.touch ? 'TAP MOON' : 'PRESS E', gx + gr + 10 * k, gy + 14 * k, 9 * k, '#a99aa2', 'left', 2);
    } else label(ctx, `MOON ${Math.floor(s.moon)}%`, gx + gr + 10 * k, gy + 4 * k, 10 * k, '#a99aa2', 'left', 2);
    }
    // The bound soul at her side: its name in its colour, its health, its signature charging (a ring), or re-forming.
    if (s.soul) {
      const so = s.soul, S = so.def, sx = m, sy = m + ((!s.mods.can || s.mods.can.art) ? 80 : 50) * k, sw = Math.min(bw * 0.6, 140 * k), cr = 8 * k;
      const cdk = so.alive ? 1 - Math.max(0, so.soul.sigCd) / (S.sig.cd * (so.soul.asc ? 0.85 : 1)) : 0, ready = so.alive && so.soul.sigCd <= 0;
      ctx.lineWidth = 2 * k * 0.8; ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.arc(sx + cr, sy, cr, 0, 7); ctx.stroke();
      ctx.strokeStyle = S.color; ctx.beginPath(); ctx.arc(sx + cr, sy, cr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * cdk); ctx.stroke();
      if (ready) R.glowAt(ctx, S.color, sx + cr, sy, cr * 2.4, 0.3 + 0.15 * Math.sin(R.t * 6));
      ctx.fillStyle = so.alive ? S.color : 'rgba(255,255,255,0.2)'; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(sx + cr, sy, cr * 0.42, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      label(ctx, S.name.toUpperCase() + '  ·  ' + VS.DATA.SOUL_STAGES[so.soul.stage].toUpperCase() + ' ' + so.soul.lvl, sx + cr * 2 + 8 * k, sy - 3 * k, 9 * k, S.color, 'left', 2, 700);
      if (so.alive) slantBar(ctx, sx + cr * 2 + 8 * k, sy + 2 * k, sw, 4 * k, so.hp / so.maxHp, trailOf('soul', so.hp / so.maxHp, dt), S.color);
      else label(ctx, `RE-FORMING ${Math.ceil(so.soul.reform)}`, sx + cr * 2 + 8 * k, sy + 9 * k, 8 * k, '#a99aa2', 'left', 2);
    }
    // Bosses.
    const bosses = s.units.filter((u) => u.def.boss && (u.alive || u.deadT < 1) && !(u.def.god && u.body));   // the god behind the First Cut's body has no bar of its own
    // Bosses: a long slim bar at the bottom centre, between the stick and the buttons on a phone.
    bosses.forEach((b, i) => {
      const n = bosses.length, span = Math.min(W * (opts.touch ? 0.42 : 0.5), 520 * k), gap = 22 * k, bwid = (span - (n - 1) * gap) / n;
      const bx = W / 2 - span / 2 + i * (bwid + gap), by = R.H - m - 12 * k;
      label(ctx, b.def.name.toUpperCase(), bx, by - 7 * k, (n > 1 ? 11 : 13) * k, '#f3eef0', 'left', 2, 700);
      if (n === 1) label(ctx, b.def.title.toUpperCase(), bx + bwid, by - 7 * k, 9 * k, '#ff8a9a', 'right', 2);
      const f = Math.max(0, b.hp) / b.maxHp;
      slantBar(ctx, bx, by, bwid, 7 * k, f, trailOf('b' + b.id, f, dt), b.phase === 2 ? RED : '#d8304a');
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(bx + bwid * 0.5, by - 2 * k, Math.max(1, R.dpr), 11 * k);
      if (b.maxPoise) { ctx.fillStyle = 'rgba(255,208,96,0.85)'; ctx.fillRect(bx + 6 * k, by + 10 * k, (bwid - 12 * k) * b.poise / b.maxPoise, 2 * k); }
    });
    { const G = s.goal || (VS.STORY && VS.STORY.GOALS && VS.STORY.GOALS[s.stage]), gx = W - m - (opts.touch ? 44 * k : 0), last = s.hasBoss && s.area >= s.waves.length - 1;
      if (G) { label(ctx, 'GOAL', gx, m + 10 * k, 9 * k, RED, 'right', 3, 700); label(ctx, (s.portal && !s.transit ? 'Go through the door' : last ? G.boss : G.reach).toUpperCase(), gx, m + 25 * k, 12 * k, '#f3eef0', 'right', 2, 700); }
      if (!bosses.length) label(ctx, s.endlessNext ? `WAVE ${Math.max(1, s.wave + 1)}` : `AREA ${(s.area || 0) + 1} / ${s.waves.length}`, gx, m + 40 * k, (s.endlessNext ? 12 : 9) * k, s.endlessNext ? '#ffd060' : '#a99aa2', 'right', 3);
      // Challenge rules: the clock, or a reminder that one hit ends it.
      if (s.rules && s.rules.time) { const left = Math.max(0, s.rules.time - s.time), urgent = left < 15; label(ctx, `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`, gx, m + 66 * k, 22 * k, urgent && Math.sin(R.t * 10) > 0 ? RED : '#ffffff', 'right', 2, 700); }
      if (s.rules && s.rules.nohit) label(ctx, 'UNTOUCHABLE', gx, m + 58 * k, 11 * k, '#c9a0ff', 'right', 4, 700);
      if (s.rules && s.rules.glass) label(ctx, 'GLASS BLADE', gx, m + 58 * k, 11 * k, '#c9a0ff', 'right', 4, 700); }
    if (opts.auto) label(ctx, 'AUTO', W - m - (opts.touch ? 44 * k : 0), m + 56 * k, 10 * k, '#ff8a9a', 'right', 3);
  };

  // The two skills: square slots bottom left (keys R and F), a sweep while they recharge.
  R.drawSkills = function (ctx, s, touch) {
    if (touch || !s.heroDef.skills) return;
    const k = R.k, m = 18 * k, sz = 34 * k;
    s.heroDef.skills.forEach((sk, i) => {
      if (s.mods.can && !s.mods.can['skill' + (i + 1)]) return;
      const x = m + i * (sz + 96 * k), y = R.H - m - sz - 22 * k, cd = s.cds[i] / sk.cd, ready = s.cds[i] <= 0;
      ctx.save(); ctx.fillStyle = 'rgba(10,6,12,0.6)'; ctx.fillRect(x, y, sz, sz);
      if (!ready) { ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.moveTo(x + sz / 2, y + sz / 2); ctx.arc(x + sz / 2, y + sz / 2, sz * 0.7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - cd)); ctx.closePath(); ctx.save(); ctx.clip(); ctx.fillRect(x, y, sz, sz); ctx.restore(); }
      ctx.strokeStyle = ready ? rgba(s.heroDef.color, 0.95) : 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.5 * R.dpr; ctx.strokeRect(x, y, sz, sz);
      skillIcon(ctx, sk.kind, x + sz / 2, y + sz / 2, sz * 0.32, ready ? '#ffffff' : 'rgba(255,255,255,0.4)');
      label(ctx, 'AUTO', x + 3 * k, y + 10 * k, 7 * k, ready ? s.heroDef.color : '#a99aa2', 'left', 0, 700);
      if (!ready) label(ctx, Math.ceil(s.cds[i]) + '', x + sz - 3 * k, y + sz - 4 * k, 10 * k, '#ffffff', 'right', 0, 700);
      ctx.restore();
      label(ctx, sk.name.toUpperCase(), x + sz + 7 * k, y + sz / 2 + 3 * k, 9 * k, ready ? '#f3eef0' : '#8a7a82', 'left', 1.5, 600);
    });
  };
  function skillIcon(ctx, kind, x, y, r, col) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = Math.max(1.5, r * 0.18); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (kind === 'wave') { ctx.beginPath(); ctx.arc(-r * 0.4, 0, r, -1.1, 1.1); ctx.stroke(); ctx.beginPath(); ctx.arc(-r * 0.1, 0, r * 0.7, -1, 1); ctx.stroke(); }
    else if (kind === 'blinkStrike' || kind === 'blink') { ctx.beginPath(); ctx.moveTo(-r, r * 0.6); ctx.lineTo(-r * 0.2, -r * 0.2); ctx.lineTo(r * 0.1, r * 0.2); ctx.lineTo(r, -r * 0.8); ctx.stroke(); ctx.beginPath(); ctx.arc(r * 0.8, -r * 0.7, r * 0.18, 0, 7); ctx.fill(); }
    else if (kind === 'zone') { for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28; ctx.beginPath(); ctx.ellipse(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, r * 0.32, r * 0.18, a, 0, 7); ctx.fill(); } }
    else if (kind === 'chain' || kind === 'leapSlam') { ctx.beginPath(); ctx.moveTo(r * 0.2, -r); ctx.lineTo(-r * 0.4, r * 0.1); ctx.lineTo(r * 0.1, r * 0.1); ctx.lineTo(-r * 0.2, r); ctx.stroke(); if (kind === 'leapSlam') { ctx.beginPath(); ctx.moveTo(-r, r); ctx.lineTo(r, r); ctx.stroke(); } }
    else if (kind === 'clones') { for (const o of [-0.45, 0.45]) { ctx.beginPath(); ctx.arc(o * r, -r * 0.35, r * 0.25, 0, 7); ctx.fill(); ctx.fillRect(o * r - r * 0.2, -r * 0.05, r * 0.4, r * 0.75); } }
    else if (kind === 'smoke') { for (const [a, b, c] of [[-0.4, 0.1, 0.45], [0.35, 0.15, 0.4], [0, -0.3, 0.45]]) { ctx.beginPath(); ctx.arc(a * r, b * r, c * r, 0, 7); ctx.stroke(); } }
    ctx.restore();
  }
  // The boss's signature move: a title card on the pixel overlay, 1 s.
  R.drawBossArt = function (s, dt) {
    const b = R.bossArt; if (!b) return false; b.t += dt; if (b.t > 1.05) { R.bossArt = null; return false; }
    const el = PX.buf; if (!el.parentNode) { el.id = 'cine'; Object.assign(el.style, { position: 'fixed', left: '0', top: '0', width: '100%', height: '100%', imageRendering: 'pixelated', zIndex: '4', pointerEvents: 'none', display: 'none' }); document.body.appendChild(el); }
    PX.fit(R.W / R.H); const c = PX.ctx, W = PX.W, H = PX.H, k = b.t / 1.05, f = D.FOES[b.key] || D.FOES[b.key.replace('_clone', '')];
    c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false;
    const white = b.t < 0.07;
    c.fillStyle = white ? '#ffffff' : '#120207'; c.fillRect(0, 0, W, H);
    if (!white) { const gr = c.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, 'rgba(255,42,68,0.35)'); gr.addColorStop(1, 'rgba(255,42,68,0)'); c.fillStyle = gr; c.fillRect(0, 0, W, H); }
    c.strokeStyle = white ? '#000' : 'rgba(255,42,68,0.6)'; c.lineWidth = 1; c.beginPath();
    for (let i = 0; i < 40; i++) { const y = (i * 37 % H), x = W - ((b.t * 900 + i * 53) % (W + 80)); c.moveTo(x, y); c.lineTo(x + 40 + (i % 3) * 20, y); } c.stroke();
    // The guardian itself, crisp at twice its size and in its own colours, lit red (2026-11-11: no blown-up ink silhouettes).
    if (f) { if (!white && A.tex) { c.save(); c.globalCompositeOperation = 'lighter'; A.tex(c, 'light_01', Math.round(W * 0.28), Math.round(H * 0.62), W * 0.5, H * 0.9, f.color || '#ff2a44', 0.35, 0, true); c.restore(); }
      A.actor(c, f.set, 'Special1', Math.min(14, Math.floor(k * 18)), 0, Math.round(W * 0.28 + k * 8), Math.round(H * 0.97), 2, white ? { shade: '#000000' } : { flash: 0.18, flashCol: '#ff2a44' }); }
    if (!white) { c.fillStyle = '#ffffff'; c.fillRect(Math.round(W * 0.5), Math.round(H * 0.52), Math.round(W * 0.46 * Math.min(1, k * 4)), 1); }
    if (!white && VS.cine && VS.cine.kit) { VS.cine.kit.title(c, b.name, Math.round(W * 0.7), Math.round(H * 0.44), Math.min(22, Math.round(W * 0.5 / (b.name.length * 0.62 + 1))), k, b.t); PX.text(c, (f ? f.name : '').toUpperCase(), Math.round(W * 0.7), Math.round(H * 0.62), 7, '#ffd0d8', 'center'); }
    c.fillStyle = '#000'; c.fillRect(0, 0, W, 10); c.fillRect(0, H - 10, W, 10);
    if (el.style.display !== 'block') el.style.display = 'block';
    return true;
  };
  // Touch controls: a stick bottom left; CUT, DASH and MOON bottom right (the heavy and both skills come on
  // their own from the combo; small marks by CUT show when each is ready); pause top right.
  R.touchLayout = function () {
    const k = R.k, m = 18 * k, W = R.W, H = R.H;
    return { stick: { x: m + 64 * k, y: H - m - 60 * k, r: 50 * k },
      buttons: [{ id: 'atk', x: W - m - 62 * k, y: H - m - 58 * k, r: 46 * k }, { id: 'dodge', x: W - m - 158 * k, y: H - m - 36 * k, r: 30 * k },
        { id: 'art', x: W - m - 172 * k, y: H - m - 120 * k, r: 28 * k },
        { id: 'pause', x: W - m - 18 * k, y: m + 18 * k, r: 18 * k }].filter((b) => !R.kit || R.kit[{ dodge: 'dodge', parry: 'parry', heavy: 'heavy', art: 'art', s1: 'skill1', s2: 'skill2' }[b.id]] !== false) };
  };
  function icon(ctx, id, x, y, r, col) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = Math.max(2, r * 0.11); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const q = r * 0.45;
    if (id === 'atk') { ctx.rotate(-Math.PI / 4); ctx.beginPath(); ctx.moveTo(0, q * 1.1); ctx.lineTo(0, -q * 1.25); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-q * 0.45, q * 0.55); ctx.lineTo(q * 0.45, q * 0.55); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, q * 0.55); ctx.lineTo(0, q * 1.1); ctx.lineWidth *= 1.6; ctx.stroke(); }
    else if (id === 'dodge') { for (const o of [-0.35, 0.3]) { ctx.beginPath(); ctx.moveTo((o - 0.25) * q * 1.6, -q * 0.7); ctx.lineTo((o + 0.25) * q * 1.6, 0); ctx.lineTo((o - 0.25) * q * 1.6, q * 0.7); ctx.stroke(); } }
    else if (id === 'parry') { ctx.beginPath(); ctx.moveTo(0, -q); ctx.lineTo(q * 0.85, -q * 0.6); ctx.lineTo(q * 0.75, q * 0.25); ctx.quadraticCurveTo(q * 0.4, q * 0.85, 0, q * 1.05); ctx.quadraticCurveTo(-q * 0.4, q * 0.85, -q * 0.75, q * 0.25); ctx.lineTo(-q * 0.85, -q * 0.6); ctx.closePath(); ctx.stroke(); }
    else if (id === 'heavy') { ctx.beginPath(); ctx.arc(0, 0, q * 0.85, -2.6, 1.8); ctx.stroke(); ctx.beginPath(); ctx.moveTo(q * 0.85 * Math.cos(1.8) - q * 0.3, q * 0.85 * Math.sin(1.8)); ctx.lineTo(q * 0.85 * Math.cos(1.8), q * 0.85 * Math.sin(1.8)); ctx.lineTo(q * 0.85 * Math.cos(1.8) + q * 0.05, q * 0.85 * Math.sin(1.8) - q * 0.32); ctx.stroke(); }
    else if (id === 'art') { ctx.beginPath(); ctx.arc(0, 0, q * 0.85, 0, 7); ctx.fill(); }
    else if (id === 'pause') { ctx.fillRect(-q * 0.5, -q * 0.6, q * 0.32, q * 1.2); ctx.fillRect(q * 0.18, -q * 0.6, q * 0.32, q * 1.2); }
    ctx.restore();
  }
  // Each control's colour and name.
  const PAD = { atk: ['#ff2a44', 'CUT'], heavy: ['#ff8a3a', 'HEAVY'], dodge: ['#7ad8ff', 'DASH'], art: ['#ff2a44', 'MOON'], s1: ['#c9a0ff', ''], s2: ['#c9a0ff', ''], pause: ['#ffffff', ''] };
  // What is ready to come out of the combo: the heavy and the hero's two skills (cooldown left, 0..1).
  function autoMarks(s) {
    const out = [], H = s.heroDef, can = s.mods.can || {};
    if (can.heavy !== false) out.push({ kind: 'heavy', f: Math.min(1, (s.heavyCd || 0) / 3.2) });
    (H.skills || []).forEach((sk, i) => { if (can['skill' + (i + 1)] !== false) out.push({ kind: sk.kind, f: Math.min(1, s.cds[i] / (sk.cd || 6)) }); });
    return out;
  }
  // The touch controls, minimal (the author's pick, 2026-11-10): soft dark discs, no outlines, big white icons.
  function disc(ctx, x, y, r, fill) { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
  R.drawTouch = function (ctx, s, st) {
    const L = R.touchLayout(), k = R.k;
    ctx.save();
    // The stick: a soft disc, the knob white (red while moving).
    const S = L.stick, kx = st.stick ? st.stick.dx * S.r * 0.6 : 0, ky = st.stick ? st.stick.dy * S.r * 0.6 : 0, on = !!st.stick && Math.hypot(kx, ky) > 2;
    disc(ctx, S.x, S.y, S.r, 'rgba(8,5,10,0.32)');
    disc(ctx, S.x + kx, S.y + ky, S.r * 0.4, on ? 'rgba(255,90,110,0.88)' : 'rgba(255,255,255,0.55)');
    // CUT, DASH, MOON and pause.
    for (const b of L.buttons) {
      const [col, name] = PAD[b.id] || ['#ffffff', ''], held = st.held[b.id], moonFull = s.moon >= 100, lit = b.id === 'art' && moonFull;
      if (lit) R.glowAt(ctx, RED, b.x, b.y, b.r * 2.2, 0.5 + 0.25 * Math.sin(R.t * 6));
      disc(ctx, b.x, b.y, b.r * (held ? 0.94 : 1), held ? R.rgba(col, 0.55) : lit ? R.rgba(col, 0.4) : 'rgba(8,5,10,0.38)');
      if (b.id === 'art' && !moonFull) {   // the moon filling from the bottom
        ctx.save(); const f = Math.min(1, s.moon / 100), rr = b.r * 0.62; ctx.beginPath(); ctx.rect(b.x - rr, b.y + rr - 2 * rr * f, rr * 2, 2 * rr * f); ctx.clip(); disc(ctx, b.x, b.y, rr, 'rgba(255,42,68,0.45)'); ctx.restore();
      }
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 6 * R.dpr; icon(ctx, b.id, b.x, b.y, b.r * 1.15, b.id === 'pause' ? 'rgba(255,255,255,0.85)' : '#ffffff'); ctx.restore();
      if (name && b.r > 20 * k) label(ctx, name, b.x, b.y + b.r + 12 * k, 9 * k, 'rgba(255,255,255,0.75)', 'center', 2, 700);
    }
    // What the combo has ready, in a small row above CUT: the heavy and the two skills (gold when ready).
    const atk = L.buttons.find((x) => x.id === 'atk');
    if (atk) autoMarks(s).forEach((m, i, all) => {
      const r = 11 * k, x = atk.x + (i - (all.length - 1) / 2) * 28 * k, y = atk.y - atk.r - 22 * k, ready = m.f <= 0;
      ctx.save(); ctx.globalAlpha = ready ? 1 : 0.6;
      disc(ctx, x, y, r, ready ? 'rgba(255,208,96,0.4)' : 'rgba(8,5,10,0.45)');
      if (!ready) { ctx.fillStyle = 'rgba(5,3,7,0.6)'; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r * 0.9, -Math.PI / 2, -Math.PI / 2 + m.f * Math.PI * 2); ctx.closePath(); ctx.fill(); }
      if (m.kind === 'heavy') icon(ctx, 'heavy', x, y, r * 1.1, '#ffffff'); else skillIcon(ctx, m.kind, x, y, r * 0.5, '#ffffff');
      ctx.restore();
    });
    ctx.restore();
  };

  // ---- story overlays ------------------------------------------------------------------------------------
  // A line beside the speaker: their name above, a thin bar in their colour; shouts are larger.
  R.say = function (ctx, x, y, who, col, text, t, o) {
    o = o || {}; const k = R.k, size = (o.shout ? 19 : 15) * k, maxW = Math.min(R.W * 0.42, 340 * k);
    ctx.font = R.fb(size, o.shout ? 700 : 500);
    const words = text.split(' '), lines = []; let cur = '';
    for (const w of words) { const tt = cur ? cur + ' ' + w : w; if (ctx.measureText(tt).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tt; }
    if (cur) lines.push(cur);
    const lh = size * 1.3, left = x > R.W * 0.55, tx = left ? x - 22 * k : x + 22 * k, top = y - lines.length * lh - 4 * k;
    ctx.save(); ctx.globalAlpha = Math.min(1, t * 5);
    const sh = o.shout && t < 0.4 ? (Math.random() - 0.5) * 3 * k : 0;
    ctx.fillStyle = col; ctx.fillRect(left ? tx + 8 * k : tx - 10 * k, top - 14 * k, 2.5 * k, lines.length * lh + 18 * k);
    ctx.globalAlpha *= 0.6; ctx.fillRect(Math.min(x, left ? tx + 8 * k : tx - 10 * k), y, Math.abs(x - (left ? tx + 8 * k : tx - 10 * k)), Math.max(1, R.dpr)); ctx.globalAlpha = Math.min(1, t * 5);
    label(ctx, who.toUpperCase(), tx, top - 3 * k, 10 * k, col, left ? 'right' : 'left', 3, 700);
    ctx.font = R.fb(size, o.shout ? 700 : 500); ctx.textAlign = left ? 'right' : 'left'; ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 8 * R.dpr;
    lines.forEach((l, i) => { ctx.fillStyle = o.shout ? '#ffffff' : '#f3eef0'; ctx.fillText(l, tx + sh, top + (i + 1) * lh - lh * 0.25); });
    ctx.restore();
  };
  R.card = function (ctx, top, main, t, dim) {
    const k = R.k, a = Math.min(1, t / 0.45);
    ctx.fillStyle = `rgba(4,3,6,${dim})`; ctx.fillRect(0, 0, R.W, R.H);
    ctx.save(); ctx.globalAlpha = a;
    if (top) label(ctx, top, R.W / 2, R.H / 2 - (main ? 22 * k : -6 * k), 13 * k, RED, 'center', 6, 700);
    if (main) { ctx.font = R.fd(32 * k, 700); ctx.textAlign = 'center'; ctx.fillStyle = '#f3eef0'; if ('letterSpacing' in ctx) ctx.letterSpacing = 2 * R.dpr + 'px'; ctx.fillText(main, R.W / 2, R.H / 2 + 16 * k); if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'; }
    const lw = (80 + 60 * a) * k; ctx.fillStyle = 'rgba(255,42,68,0.6)'; ctx.fillRect(R.W / 2 - lw / 2, R.H / 2 + 30 * k, lw, Math.max(1, R.dpr));
    ctx.restore();
  };
  R.bossCard = function (ctx, s, keys, t) {
    const k = R.k, ease = (x) => 1 - Math.pow(1 - Math.min(1, x), 3), a = ease(t / 0.3), out = t > 1.5 ? Math.min(1, (t - 1.5) / 0.35) : 0;
    ctx.save(); ctx.globalAlpha = 1 - out;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, R.W, R.H);
    const y = R.H * 0.34, off = (1 - a) * R.W * 0.6, bh = 96 * k;
    ctx.fillStyle = 'rgba(8,5,10,0.92)'; ctx.beginPath(); ctx.moveTo(-10 + off, y + 14 * k); ctx.lineTo(R.W + 10 + off, y - 10 * k); ctx.lineTo(R.W + 10 + off, y + bh - 14 * k); ctx.lineTo(-10 + off, y + bh + 10 * k); ctx.closePath(); ctx.fill();
    ctx.fillStyle = RED; ctx.fillRect(0, y + bh + 4 * k, R.W * a, 2 * k);
    keys.forEach((key, i) => {
      const f = D.FOES[key], u = s.units.find((o) => o.key === key), sc = R.S * 2.0 * Math.min(1.3, f.scale || 1);
      A.actor(ctx, f.set, 'Idle4', u ? u.frame : 0, Math.PI, Math.round(R.W * (keys.length > 1 ? 0.66 + i * 0.16 : 0.78) - off * 0.3), Math.round(y + bh + 8 * k), sc, { grey: true });
    });
    const f = D.FOES[keys[0]], name = keys.length > 1 ? 'THE HOLLOW TWINS' : f.name.toUpperCase(), sub = keys.length > 1 ? 'THE LEFT HAND AND THE RIGHT' : f.title.toUpperCase();
    ctx.font = R.fd(38 * k, 700); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#ffffff';
    if ('letterSpacing' in ctx) ctx.letterSpacing = 2 * R.dpr + 'px';
    ctx.fillText(name, R.W * 0.07 + off, y + bh * 0.58); if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    label(ctx, sub, R.W * 0.07 + off + 2 * k, y + bh * 0.58 + 22 * k, 11 * k, '#ff8a9a', 'left', 4, 600);
    ctx.restore();
  };
  R.banner = function (ctx, text, t, col, sub, low) {
    const k = R.k, a = Math.min(1, t * 4, (2.2 - t) * 3); if (a <= 0) return;
    text = String(text).toUpperCase(); ctx.save(); ctx.globalAlpha = a; const y = R.H * (low ? 0.78 : 0.3), lw = (60 + 80 * Math.min(1, t * 3)) * k;
    ctx.font = R.fd(22 * k, 700); const hw = Math.max(120 * k, (ctx.measureText(text).width + text.length * 6 * R.dpr) / 2 + 26 * k);
    const dv = ui('divider'); if (dv) { const ps = R.px(), dw = dv.naturalWidth * ps * Math.min(1, t * 3 + 0.3), sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false; ctx.drawImage(dv, 0, 0, dv.naturalWidth, dv.naturalHeight, Math.round(R.W / 2 - dw / 2), Math.round(y + (sub ? 24 : 8) * k), Math.round(dw), dv.naturalHeight * ps); ctx.imageSmoothingEnabled = sm; }
    void lw; void hw; label(ctx, text, R.W / 2, y, 26 * k, col, 'center', 6, 700); if (sub) label(ctx, sub, R.W / 2, y + 18 * k, 10 * k, '#d8c8d0', 'center', 4, 600); ctx.restore();
  };
  // A coaching card at the top of the screen: the tutorial's steps and new-ability tips.
  R.coach = function (ctx, o) {
    const k = R.k, a = Math.min(1, o.t * 4, o.life != null ? (o.life - o.t) * 3 : 1); if (a <= 0) return;
    const w = Math.min(R.W * 0.62, 520 * k), x = R.W / 2 - w / 2, y = 70 * k + (1 - a) * -12 * k;
    ctx.save(); ctx.globalAlpha = a;
    ctx.font = R.fb(15 * k, 500);
    const lines = []; let line = ''; for (const wd of o.text.split(' ')) { if (ctx.measureText(line + ' ' + wd).width > w - 32 * k && line) { lines.push(line); line = wd; } else line = line ? line + ' ' + wd : wd; } lines.push(line);
    const h = (34 + 18 * lines.length) * k;
    R.frame9(ctx, o.done ? 'frame_hot' : 'frame_thin', x - 6 * k, y - 6 * k, w + 12 * k, h + 12 * k, o.done ? 16 : 8, o.done ? Math.max(1, Math.round(R.px() / 2)) : R.px());
    label(ctx, o.title, x + 16 * k, y + 22 * k, 11 * k, o.col || '#ffd060', 'left', 4, 700);
    ctx.font = R.fb(15 * k, 500); ctx.fillStyle = '#f3eef0'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    lines.forEach((ln, i) => ctx.fillText(ln, x + 16 * k, y + (42 + i * 18) * k));
    if (o.of) for (let i = 0; i < o.of; i++) { ctx.fillStyle = i < o.step || (i === o.step && o.done) ? (o.col || '#ffd060') : i === o.step ? '#ffffff' : 'rgba(255,255,255,0.2)'; ctx.fillRect(x + w - (o.of - i) * 14 * k - 6 * k, y + 14 * k, 9 * k, 3 * k); }
    // The step's count (2 / 3) under the pips, and a tick across the card when it is done.
    if (o.prog) label(ctx, o.prog, x + w - 14 * k, y + 30 * k, 12 * k, '#ffffff', 'right', 1, 700);
    if (o.done) label(ctx, '✓  DONE', x + w - 14 * k, y + 30 * k, 13 * k, '#9af0b8', 'right', 2, 700);
    ctx.restore();
  };
  // The trial's guides: a glowing circle on the ground to walk to (with chevrons leading there), a
  // bouncing arrow over each foe or barrel of the step, and the button to press pulsing on a touch screen.
  R.tutGuide = function (ctx, s, g) {
    const Sh = R.Sh(), t = R.t, BLUE = '#8ad0ff', h = s.hero;
    const arrow = (x, y, z) => { const q = R.P(x, y, z + 6 + Math.sin(t * 6) * 4), a = 7 * Sh; ctx.save(); ctx.fillStyle = BLUE; ctx.strokeStyle = 'rgba(6,10,20,0.85)'; ctx.lineWidth = 2 * R.dpr; ctx.beginPath(); ctx.moveTo(q.x - a, q.y - a * 1.2); ctx.lineTo(q.x + a, q.y - a * 1.2); ctx.lineTo(q.x, q.y); ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore(); };
    if (g.mark) {
      const q = R.P(g.mark.x, g.mark.y), r = 26 * Sh, p = 0.5 + 0.5 * Math.sin(t * 4);
      ctx.save(); ctx.translate(q.x, q.y); ctx.scale(1, R.HELI.pitch);
      ctx.strokeStyle = R.rgba(BLUE, 0.9); ctx.lineWidth = 3 * R.dpr; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke();
      ctx.strokeStyle = R.rgba(BLUE, 0.5 * (1 - p)); ctx.beginPath(); ctx.arc(0, 0, r * (1 + p * 0.6), 0, 7); ctx.stroke();
      ctx.fillStyle = R.rgba(BLUE, 0.16); ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.restore();
      const gr = ctx.createLinearGradient(0, q.y - 120 * Sh, 0, q.y); gr.addColorStop(0, R.rgba(BLUE, 0)); gr.addColorStop(1, R.rgba(BLUE, 0.35)); ctx.fillStyle = gr; ctx.fillRect(q.x - 10 * Sh, q.y - 120 * Sh, 20 * Sh, 120 * Sh);
      arrow(g.mark.x, g.mark.y, 60);
      // Chevrons on the ground from the hero toward the circle (round the props).
      const d = Math.hypot(g.mark.x - h.x, g.mark.y - h.y);
      if (d > 60) { const w = VS.steer(VS.arenaOf(s), h.x, h.y, g.mark.x, g.mark.y), an = Math.atan2(w[1], w[0]);
        for (let i = 0; i < 3; i++) { const o = 34 + i * 18 + (t * 40) % 18, px = h.x + Math.cos(an) * o, py = h.y + Math.sin(an) * o, c = R.P(px, py), sa = R.screenAng(an), L = 7 * Sh;
          ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(sa); ctx.strokeStyle = R.rgba(BLUE, 0.75 - i * 0.2); ctx.lineWidth = 2.5 * R.dpr; ctx.beginPath(); ctx.moveTo(-L * 0.6, -L * 0.6); ctx.lineTo(0, 0); ctx.lineTo(-L * 0.6, L * 0.6); ctx.stroke(); ctx.restore(); } }
    }
    for (const u of g.targets || []) if (u.alive && u.state !== 'spawn') arrow(u.x, u.y, 52 * (u.scale || 1));
    if (g.barrel) arrow(g.barrel.x, g.barrel.y, 40);
    if (g.btn && g.touch) {
      const L = R.touchLayout(), b = g.btn === 'stick' ? L.stick : L.buttons.find((x) => x.id === g.btn);
      if (b) { const p = (t * 1.6) % 1; ctx.save(); ctx.strokeStyle = R.rgba(BLUE, 1 - p); ctx.lineWidth = 3 * R.dpr; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (1.1 + p * 0.6), 0, 7); ctx.stroke(); ctx.strokeStyle = BLUE; ctx.lineWidth = 2 * R.dpr; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 1.08, 0, 7); ctx.stroke(); ctx.restore(); }
    }
  };
  R.hint = function (ctx, text, a) { ctx.save(); ctx.globalAlpha = a; label(ctx, text, R.W / 2, R.H - 20 * R.k, 11 * R.k, '#d8c8d0', 'center', 2, 500); ctx.restore(); };

  // The stage drawn behind menus and scenes, with a figure standing on it.
  R.drawBackdrop = function (ctx, st, cam, dt) {
    R.cam = cam; R.drawArena(ctx, st, cam); R.drawWeather(ctx, st, cam, R.t);
  };
  R.drawFigure = function (ctx, setId, clip, frame, face, x, y, scale, opts) {
    const sc = R.S * (scale || 1), sx = Math.round(R.sx(x)), sy = Math.round(R.sy(y || 0));
    ctx.save(); ctx.translate(0, 2 * sy); ctx.scale(1, -1); A.actor(ctx, setId, clip, frame, face, sx, sy, sc, Object.assign({}, opts, { alpha: 0.13 })); ctx.restore();
    const sw = 26 * sc; ctx.drawImage(shadowImg(), sx - sw / 2, sy - sw * 0.12, sw, sw * 0.25);
    A.actor(ctx, setId, clip, frame, face, sx, sy, sc, opts);
    return { x: sx, y: sy - 46 * sc };
  };
  R.present = function () {
    const st = R.canvas.style;
    if (R.shake > 0.3) { const d = R.shake * 0.6; st.transform = `translate(${Math.round((Math.random() - 0.5) * d)}px,${Math.round((Math.random() - 0.5) * d)}px)`; R.shook = true; }
    else if (R.shook) { st.transform = ''; R.shook = false; }
  };
})();
