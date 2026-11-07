// VESPER — the game drawn at the screen's full resolution: clean layered arenas under the red moon,
// a glossy floor that reflects the fighters, crisp pixel characters, drawn (vector) effects, a slim
// HUD, touch controls with icons, dialogue beside the speaker, the boss card, and the cinematic
// pixel buffer laid over everything when a moon art plays.
(function () {
  const VS = window.VS, D = VS.DATA, A = VS.A, PX = VS.PX;
  const R = VS.R = { t: 0, cam: 0, shake: 0, flash: 0, flashCol: '255,255,255', fx: [], parts: [], floaters: [], touch: false, punch: 0 };
  const FD = '"Chakra Petch", "Barlow Condensed", "Arial Narrow", system-ui, sans-serif', FB = '"Barlow", "Segoe UI", system-ui, sans-serif';
  R.fd = (px, w) => `${w || 700} ${Math.round(px)}px ${FD}`;
  R.fb = (px, w) => `${w || 600} ${Math.round(px)}px ${FB}`;
  const RED = '#ff2a44', INK = '#07060a';
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
    R.k = dpr * clamp(h / 420, 0.85, 1.5);              // UI unit
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
  const HELI = R.HELI = { ang: -0.3, pitch: 0.72 };
  const hc = Math.cos(HELI.ang), hs = Math.sin(HELI.ang);
  R.hcam = { x: 0, y: 0 };
  R.Sh = () => R.H / 215;
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
  function ground(ctx) {
    const Sh = R.Sh(), p = HELI.pitch, cx = R.hcam.x, cy = R.hcam.y;
    ctx.setTransform(Sh * hc, Sh * p * hs, -Sh * hs, Sh * p * hc, R.W / 2 - Sh * (hc * cx - hs * cy), R.H * 0.56 - Sh * p * (hs * cx + hc * cy));
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
    // Low clouds drifting past below the platform.
    for (let i = 0; i < 9; i++) { const cx = hash(i, 31) * W, cy = H * (0.55 + hash(i, 32) * 0.4), rw = R.H * (0.3 + hash(i, 33) * 0.4); g.save(); g.translate(cx, cy); g.scale(1, 0.22); const cg = g.createRadialGradient(0, 0, 0, 0, 0, rw); cg.addColorStop(0, rgba(L.fog, 0.35)); cg.addColorStop(1, rgba(L.fog, 0)); g.fillStyle = cg; g.fillRect(-rw, -rw, rw * 2, rw * 2); g.restore(); }
    return (cache[key] = c);
  }
  // The arena's outline as a path in ground coordinates, grown outward by g.
  const extOf = (A) => A.shape === 'rect' ? Math.max(A.hw, A.hh) : A.shape === 'cross' ? A.arm : A.r;
  function shapePath(g, A, grow) {
    g.beginPath();
    if (A.shape === 'rect') { const w = A.hw + grow, h = A.hh + grow, r = Math.min(14 + grow * 0.5, h); g.moveTo(-w + r, -h); g.arcTo(w, -h, w, h, r); g.arcTo(w, h, -w, h, r); g.arcTo(-w, h, -w, -h, r); g.arcTo(-w, -h, w, -h, r); g.closePath(); }
    else if (A.shape === 'cross') { const a = A.arm + grow, w = A.hw + grow; const pts = [[-w, -a], [w, -a], [w, -w], [a, -w], [a, w], [w, w], [w, a], [-w, a], [-w, w], [-a, w], [-a, -w], [-w, -w]]; pts.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath(); }
    else g.arc(0, 0, A.r + grow, 0, Math.PI * 2);
  }
  // The arena in ground coordinates, projected once per area to screen pixels (only its position
  // changes with the camera, so each frame is a plain copy).
  function platform(st, area, last, A) {
    const key = 'plat' + st.id + '|' + area + (last ? 'L' : ''); if (cache[key]) return cache[key];
    for (const k in cache) if (k.startsWith('plat')) delete cache[k];   // one arena in memory at a time
    const L = st.look, X = extOf(A), E = X + 80, res = Math.min(2048 / (E * 2), R.Sh()), size = Math.ceil(E * 2 * res);
    const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
    g.translate(size / 2, size / 2); g.scale(res, res);
    const stone = mix(L.sky[2], '#000000', 0.42), deep = mix(L.sky[0], '#000000', 0.4);
    // The apron, falling away into the night in two steps.
    g.fillStyle = mix(stone, '#000000', 0.35); shapePath(g, A, 34); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 1; shapePath(g, A, 34); g.stroke();
    // The floor: lighter at the centre so the fighters stand out against it.
    let gr = g.createRadialGradient(0, -X * 0.15, 0, 0, 0, X * 1.1); gr.addColorStop(0, mix(stone, '#ffffff', 0.12)); gr.addColorStop(1, mix(stone, '#000000', 0.15));
    g.fillStyle = gr; shapePath(g, A, 0); g.fill();
    g.save(); shapePath(g, A, 0); g.clip();
    // The moon in the floor.
    const mx = X * 0.22, my = -X * 0.4;
    gr = g.createRadialGradient(mx, my, 0, mx, my, X * 0.7); gr.addColorStop(0, rgba(L.moonCol, last ? 0.42 : 0.24)); gr.addColorStop(0.4, rgba(L.moonCol, last ? 0.16 : 0.09)); gr.addColorStop(1, rgba(L.moonCol, 0));
    g.fillStyle = gr; g.fillRect(-E, -E, E * 2, E * 2);
    // Faint seams: rings and spokes on round floors, a grid of flagstones elsewhere.
    g.strokeStyle = 'rgba(255,255,255,0.045)'; g.lineWidth = 1;
    if (A.shape === 'circle' || A.shape === 'donut') {
      const rot = area * 0.37;
      for (const f of [0.34, 0.68]) { g.beginPath(); g.arc(0, 0, A.r * f, 0, 7); g.stroke(); }
      for (let i = 0; i < 16; i++) { const a = rot + i / 16 * Math.PI * 2; g.beginPath(); g.moveTo(Math.cos(a) * A.r * 0.34, Math.sin(a) * A.r * 0.34); g.lineTo(Math.cos(a) * A.r, Math.sin(a) * A.r); g.stroke(); }
    } else { g.beginPath(); for (let x = -E; x <= E; x += 40) { g.moveTo(x, -E); g.lineTo(x, E); } for (let y = -E; y <= E; y += 40) { g.moveTo(-E, y + (Math.abs(y / 40) % 2) * 0); g.lineTo(E, y); } g.stroke(); }
    // Flagstones a shade lighter or darker each, cracks, a few rune circles, and the hour's own marks.
    const rnd = (i, j) => hash(i + area * 13 + st.id.length * 7, j);
    if (A.shape === 'circle' || A.shape === 'donut') {
      for (let ring = 0; ring < 3; ring++) for (let i = 0; i < 16; i++) { const a0 = area * 0.37 + i / 16 * Math.PI * 2, r0 = A.r * [0, 0.34, 0.68][ring], r1 = A.r * [0.34, 0.68, 1][ring]; g.fillStyle = rnd(i, ring) < 0.5 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.06)'; g.beginPath(); g.arc(0, 0, r1, a0, a0 + Math.PI / 8); g.arc(0, 0, r0, a0 + Math.PI / 8, a0, true); g.fill(); }
    } else for (let x = -E; x < E; x += 40) for (let y = -E; y < E; y += 40) { const v = rnd(x, y); if (v < 0.3) { g.fillStyle = 'rgba(255,255,255,0.03)'; g.fillRect(x + 1, y + 1, 38, 38); } else if (v > 0.75) { g.fillStyle = 'rgba(0,0,0,0.07)'; g.fillRect(x + 1, y + 1, 38, 38); } }
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1;
    for (let i = 0; i < 16; i++) { let x = (rnd(i, 51) - 0.5) * X * 1.8, y = (rnd(i, 52) - 0.5) * X * 1.8, a = rnd(i, 53) * 6.28; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 6; j++) { a += (rnd(i, 60 + j) - 0.5) * 1.4; x += Math.cos(a) * 9; y += Math.sin(a) * 9; g.lineTo(x, y); } g.stroke(); }
    for (let i = 0; i < 3; i++) { const x = (rnd(i, 71) - 0.5) * X * 1.3, y = (rnd(i, 72) - 0.5) * X * 1.3; if (!VS.inside(A, x, y, 30)) continue; g.strokeStyle = rgba(L.moonCol, 0.16); g.lineWidth = 1; g.beginPath(); g.arc(x, y, 16, 0, 7); g.stroke(); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; g.beginPath(); g.moveTo(x + Math.cos(a) * 16, y + Math.sin(a) * 16); g.lineTo(x + Math.cos(a) * 21, y + Math.sin(a) * 21); g.stroke(); } }
    const blob = (col, n, size, edge) => { for (let i = 0; i < n; i++) { let x = (rnd(i, 81) - 0.5) * X * 2, y = (rnd(i, 82) - 0.5) * X * 2; if (edge) { const c = VS.clampTo(A, x * 3, y * 3, 6); x = c[0]; y = c[1]; } const r = size * (0.6 + rnd(i, 83)); const bg = g.createRadialGradient(x, y, 0, x, y, r); bg.addColorStop(0, col); bg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = bg; g.beginPath(); g.ellipse(x, y, r * 1.4, r, rnd(i, 84) * 3, 0, 7); g.fill(); } };
    ({ gate: () => blob('rgba(90,110,80,0.18)', 9, 22, true), cloister: () => blob('rgba(235,242,255,0.3)', 16, 26, true), stair: () => { g.strokeStyle = 'rgba(230,190,110,0.18)'; g.lineWidth = 1.5; for (const f of [0.5, 0.82]) { g.beginPath(); g.arc(0, 0, X * f, 0, 7); g.stroke(); } },
      waste: () => { blob('rgba(150,140,140,0.22)', 12, 24, false); blob('rgba(0,0,0,0.3)', 5, 18, false); }, throat: () => { g.strokeStyle = 'rgba(220,230,255,0.08)'; g.lineWidth = 1.2; for (let i = 0; i < 12; i++) { const y = (rnd(i, 91) - 0.5) * X * 1.8, x = (rnd(i, 92) - 0.5) * X; g.beginPath(); g.moveTo(x - 50, y); g.quadraticCurveTo(x, y - 8, x + 60, y + 4); g.stroke(); } },
      shadow: () => blob('rgba(120,0,16,0.35)', 8, 22, false) })[st.id]();
    // An emblem at the centre: two thin rings of red.
    g.strokeStyle = rgba(L.moonCol, 0.2); g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, 36, 0, 7); g.stroke(); g.beginPath(); g.arc(0, 0, 22, 0, 7); g.stroke();
    g.restore();
    // The pit: a hole into the night with a lit lip.
    if (A.shape === 'donut') {
      gr = g.createRadialGradient(0, 0, 0, 0, 0, A.inner); gr.addColorStop(0, '#000000'); gr.addColorStop(0.8, '#05030a'); gr.addColorStop(1, mix(deep, '#000000', 0.3));
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, A.inner, 0, 7); g.fill();
      g.strokeStyle = rgba(L.moonCol, 0.75); g.lineWidth = 2; g.beginPath(); g.arc(0, 0, A.inner, 0, 7); g.stroke();
      g.strokeStyle = rgba(L.moonCol, 0.15); g.lineWidth = 8; g.beginPath(); g.arc(0, 0, A.inner + 3, 0, 7); g.stroke();
    }
    // Warm light from the braziers and lanterns, baked into the floor.
    for (const pr of propsOf(st, area, A)) if (pr.kind === 'brazier' || pr.kind === 'lantern') { const lg = g.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, 75); lg.addColorStop(0, 'rgba(255,130,50,0.22)'); lg.addColorStop(1, 'rgba(255,130,50,0)'); g.fillStyle = lg; g.beginPath(); g.arc(pr.x, pr.y, 75, 0, 7); g.fill(); }
    // The rim: a line of red light.
    g.strokeStyle = rgba(L.moonCol, 0.16); g.lineWidth = 9; shapePath(g, A, 0); g.stroke();
    g.strokeStyle = rgba(L.moonCol, last ? 0.95 : 0.75); g.lineWidth = last ? 3 : 2; shapePath(g, A, 0); g.stroke();
    // Project it once.
    // Project it once, standing on cliffs: the outline extruded downward, darkening into the night.
    const Sh = R.Sh(), p = HELI.pitch, pw = Math.ceil(2 * E * Sh * (Math.abs(hc) + Math.abs(hs))) + 4, top = Math.ceil(2 * E * Sh * p * (Math.abs(hs) + Math.abs(hc))) + 4, depth = Math.round(64 * Sh), ph = top + depth;
    const out = document.createElement('canvas'); out.width = pw; out.height = ph; const o = out.getContext('2d');
    const rock = mix(L.sky[0], '#000000', 0.35), step = Math.max(2, Math.round(R.dpr * 3));
    for (let d = depth; d >= 0; d -= step) {
      const f = d / depth; o.setTransform(Sh * hc, Sh * p * hs, -Sh * hs, Sh * p * hc, pw / 2, top / 2 + d);
      o.fillStyle = rgba(mix(rock, '#000000', 0.15 + 0.6 * f), Math.max(0, 1 - f * f * 0.9)); shapePath(o, A, 34); o.fill();
      if (d % (step * 10) === 0) { o.strokeStyle = 'rgba(255,255,255,0.025)'; o.lineWidth = 1 / Sh; o.stroke(); }
    }
    o.setTransform(Sh * hc, Sh * p * hs, -Sh * hs, Sh * p * hc, pw / 2, top / 2 + 2);
    o.strokeStyle = rgba(L.moonCol, 0.35); o.lineWidth = 2 / Sh * R.dpr; shapePath(o, A, 34); o.stroke();
    o.imageSmoothingEnabled = true; o.setTransform(Sh * hc, Sh * p * hs, -Sh * hs, Sh * p * hc, pw / 2, top / 2);
    o.drawImage(c, -E, -E, E * 2, E * 2);
    return (cache[key] = { c: out, E, pw, ph, cy: top / 2 });
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
  // Props around the ring, drawn upright and sorted with the fighters.
  const PROPS = {
    gate: ['pillar', 'banner', 'brazier', 'wall', 'statue', 'tree', 'pillar', 'brazier'], cloister: ['crystal', 'statue', 'pine', 'crystal', 'banner', 'lantern', 'crystal', 'pillar'],
    stair: ['broken', 'statue', 'brazier', 'wall', 'pillar', 'banner', 'brazier', 'broken'], waste: ['rock', 'tree', 'wall', 'rock', 'lantern', 'tree', 'rock', 'broken'],
    throat: ['needle', 'rock', 'banner', 'needle', 'rock', 'needle', 'wall', 'needle'], shadow: ['broken', 'brazier', 'statue', 'banner', 'brazier', 'wall', 'pillar', 'statue'],
  };
  function propsOf(st, area, A) {
    const key = 'props' + st.id + '|' + area; if (cache[key]) return cache[key];
    const list = PROPS[st.id] || PROPS.gate, out = [], X = extOf(A);
    for (let i = 0; i < 18; i++) {
      // A point just outside the outline, found by walking out from the centre.
      const a = i / 18 * Math.PI * 2 + hash(i + area * 7, 41) * 0.2 + area * 0.21; let rr = 0;
      while (rr < 420 && !VS.inside(A, Math.cos(a) * rr, Math.sin(a) * rr, 0)) rr += 6;   // out of a pit first
      while (rr < 420 && VS.inside(A, Math.cos(a) * rr, Math.sin(a) * rr, 0)) rr += 6;
      rr += 22 + hash(i + area * 7, 42) * 26;
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr, ry = x * hs + y * hc;
      if (ry > X * 0.35) continue;   // keep the near side clear: nothing stands between the camera and the fight
      out.push({ kind: list[(i + area * 2) % list.length], x, y, h: 0.8 + hash(i + area * 7, 43) * 0.5, seed: i + area * 7 });
    }
    return (cache[key] = out);
  }
  function drawProp(ctx, st, p) {
    const L = st.look, q = R.P(p.x, p.y), Sh = R.Sh(), k = Sh * p.h, dark = mix(L.sky[0], '#000000', 0.55), rim = rgba(L.moonCol, 0.55);
    ctx.save(); ctx.translate(q.x, q.y);
    const shadow = () => { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(0, 0, 14 * k, 14 * k * HELI.pitch * 0.5, 0, 0, 7); ctx.fill(); };
    if (p.kind === 'pillar' || p.kind === 'broken') {
      shadow(); const w = 11 * k, h = (p.kind === 'pillar' ? 70 : 44) * k;
      const gr = ctx.createLinearGradient(-w, 0, w, 0); gr.addColorStop(0, mix(dark, '#ffffff', 0.08)); gr.addColorStop(0.6, dark); gr.addColorStop(1, mix(dark, '#000000', 0.4));
      ctx.fillStyle = gr; ctx.fillRect(-w, -h, w * 2, h);
      ctx.fillStyle = mix(dark, '#ffffff', 0.12); ctx.beginPath(); ctx.ellipse(0, -h, w * 1.15, w * 0.45, 0, 0, 7); ctx.fill();
      if (p.kind === 'broken') { ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(-w, -h); ctx.lineTo(-w * 0.2, -h - 10 * k); ctx.lineTo(w * 0.4, -h - 3 * k); ctx.lineTo(w, -h - 7 * k); ctx.lineTo(w, -h); ctx.fill(); }
      ctx.fillStyle = rim; ctx.fillRect(w - 1.5 * R.dpr, -h, 1.5 * R.dpr, h);
    } else if (p.kind === 'brazier') {
      shadow(); const t = R.t * 9 + p.seed;
      R.glowAt(ctx, '#ff5a30', 0, -26 * k, 60 * k, 0.28 + 0.05 * Math.sin(t));
      ctx.fillStyle = dark; ctx.fillRect(-2 * k, -18 * k, 4 * k, 18 * k);
      ctx.beginPath(); ctx.moveTo(-9 * k, -22 * k); ctx.lineTo(9 * k, -22 * k); ctx.lineTo(6 * k, -16 * k); ctx.lineTo(-6 * k, -16 * k); ctx.fill();
      for (let i = 0; i < 3; i++) { const fh = (10 + 4 * Math.sin(t + i * 2)) * k; ctx.fillStyle = i === 2 ? '#ffe0a0' : i ? '#ff8a40' : '#ff3a30'; ctx.beginPath(); ctx.moveTo((-6 + i * 2) * k, -22 * k); ctx.quadraticCurveTo(0, -22 * k - fh * 1.6 * (1 - i * 0.25), (6 - i * 2) * k, -22 * k); ctx.fill(); }
    } else if (p.kind === 'tree' || p.kind === 'pine') {
      shadow(); ctx.fillStyle = dark; ctx.strokeStyle = dark;
      if (p.kind === 'pine') SH.pine(ctx, 0, 0, 34 * k, 70 * k); else SH.deadTree(ctx, 0, 0, 52 * k, 72 * k, p.seed);
    } else if (p.kind === 'rock' || p.kind === 'needle') {
      shadow(); ctx.fillStyle = dark;
      if (p.kind === 'needle') SH.needle(ctx, 0, 0, 22 * k, 80 * k, p.seed); else SH.rock(ctx, 0, 2 * k, 40 * k, 26 * k, p.seed);
      ctx.fillStyle = rim; ctx.globalAlpha = 0.5; if (p.kind === 'needle') ctx.fillRect(2 * k, -70 * k, 1.5 * R.dpr, 66 * k); ctx.globalAlpha = 1;
    } else if (p.kind === 'banner') {
      shadow(); const h = 84 * k, w = 18 * k, t = R.t * 2 + p.seed;
      ctx.fillStyle = dark; ctx.fillRect(-1.5 * k, -h, 3 * k, h); ctx.fillRect(-w * 0.6, -h, w * 1.2, 2.5 * k);
      ctx.fillStyle = mix(L.moonCol, '#000000', 0.25); ctx.beginPath(); ctx.moveTo(-w * 0.5, -h + 2 * k);
      for (let i = 0; i <= 6; i++) { const yy = -h + 2 * k + i / 6 * h * 0.62; ctx.lineTo(w * 0.5 + Math.sin(t + i * 0.8) * 2.5 * k, yy); }
      ctx.lineTo(0, -h + h * 0.72); ctx.lineTo(-w * 0.5 + Math.sin(t + 5) * 2.5 * k, -h + h * 0.64); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-w * 0.5, -h + 6 * k, w, 1.5 * k);
      ctx.strokeStyle = 'rgba(255,220,120,0.6)'; ctx.lineWidth = R.dpr; ctx.beginPath(); ctx.arc(0, -h + h * 0.32, 4 * k, 0, 7); ctx.stroke();
    } else if (p.kind === 'statue') {
      shadow(); const ph = 16 * k, stoneC = mix(dark, '#ffffff', 0.12);
      ctx.fillStyle = mix(dark, '#ffffff', 0.05); ctx.fillRect(-14 * k, -ph, 28 * k, ph); ctx.fillStyle = mix(dark, '#ffffff', 0.15); ctx.fillRect(-15 * k, -ph - 2 * k, 30 * k, 3 * k);
      A.actor(ctx, ['master_knight', 'black_knight', 'frost_knight_a'][p.seed % 3], 'Idle4', 0, Math.PI * 0.5, 0, -ph, k * 1.25, { shade: stoneC });
      ctx.fillStyle = rim; ctx.fillRect(13 * k, -ph, 1.5 * R.dpr, ph);
    } else if (p.kind === 'wall') {
      shadow(); const w = 34 * k, h = 40 * k;
      const gr = ctx.createLinearGradient(-w, 0, w, 0); gr.addColorStop(0, mix(dark, '#ffffff', 0.07)); gr.addColorStop(1, mix(dark, '#000000', 0.3));
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(-w, -h * 0.7); ctx.lineTo(-w * 0.5, -h); ctx.lineTo(-w * 0.1, -h * 0.82); ctx.lineTo(w * 0.3, -h * 0.95); ctx.lineTo(w * 0.6, -h * 0.55); ctx.lineTo(w, -h * 0.4); ctx.lineTo(w, 0); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = R.dpr; for (let r = 1; r < 4; r++) { ctx.beginPath(); ctx.moveTo(-w, -h * r * 0.2); ctx.lineTo(w, -h * r * 0.2); ctx.stroke(); }
      ctx.fillStyle = rim; ctx.globalAlpha = 0.6; ctx.fillRect(-w, -h * 0.7, w * 0.5, 1.5 * R.dpr); ctx.globalAlpha = 1;
    } else if (p.kind === 'lantern') {
      shadow(); const h = 64 * k, t = R.t * 6 + p.seed;
      ctx.fillStyle = dark; ctx.fillRect(-1.5 * k, -h, 3 * k, h); ctx.fillRect(0, -h, 12 * k, 2 * k);
      R.glowAt(ctx, '#ffb060', 11 * k, -h + 10 * k, 30 * k, 0.5 + 0.08 * Math.sin(t));
      ctx.fillStyle = '#ffd890'; ctx.fillRect(8 * k, -h + 5 * k, 6 * k, 8 * k); ctx.fillStyle = dark; ctx.fillRect(7.5 * k, -h + 4 * k, 7 * k, 1.5 * k);
    } else if (p.kind === 'crystal') {
      shadow();
      for (let i = 0; i < 3; i++) {
        const ox = (i - 1) * 7 * k, h = (40 + 18 * hash(p.seed, i)) * k * (i === 1 ? 1.3 : 1);
        ctx.fillStyle = 'rgba(170,210,255,0.28)'; ctx.beginPath(); ctx.moveTo(ox - 5 * k, 0); ctx.lineTo(ox, -h); ctx.lineTo(ox + 5 * k, 0); ctx.fill();
        ctx.strokeStyle = 'rgba(220,240,255,0.7)'; ctx.lineWidth = R.dpr; ctx.beginPath(); ctx.moveTo(ox, -h); ctx.lineTo(ox + 5 * k, 0); ctx.stroke();
      }
      R.glowAt(ctx, '#a8d8ff', 0, -30 * k, 40 * k, 0.15);
    }
    ctx.restore();
  }

  // ---- effects (fights) -----------------------------------------------------------------------------
  R.pfx = [];
  // A pack effect (the pixel effect atlas) at a point in the world, height z.
  const PK = (name, x, y, z, scale, o) => R.pfx.push(Object.assign({ name, x, y, z: z || 0, t: 0, scale: scale || 1 }, o || {}));
  R.spawns = {};
  const P = (o) => R.parts.push(Object.assign({ t: 0, vx: 0, vy: 0, vz: 0, g: 0, z: 0, size: 2, col: '#fff', shape: 'sq', life: 0.4 }, o));
  const FX = (o) => R.fx.push(Object.assign({ t: 0 }, o));
  R.float = function (text, x, y, z, col, big, label) { R.floaters.push({ text, x, y, z, t: 0, col, big, label }); };
  function sparks(x, y, z, n, col, speed, size) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, e = (Math.random() - 0.3) * 1.2, v = speed * (0.4 + Math.random()); P({ x, y, z, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6, vz: Math.sin(e) * v, life: 0.18 + Math.random() * 0.15, size: size || 1.2, col, shape: 'line' }); }
  }
  R.consume = function (s) {
    for (const e of s.events) {
      const u = e.id != null ? s.units.find((o) => o.id === e.id) : null, sc = u ? u.scale : 1;
      switch (e.type) {
        case 'hit': {
          const z = 22 * sc, sa = R.screenAng(e.ang || 0);
          // Pack effects only on the blows that matter; light cuts get clean sparks alone.
          if (e.fx === 'finisher') { PK('cross_slash', e.x, e.y, z, 1.4); R.punch = 0.03; }
          else if (e.fx === 'dash') PK('katana', e.x, e.y, z, 1.5, { angle: sa });
          else if (e.art) PK('hit_crit', e.x, e.y, z, 2);
          FX({ kind: 'spark', x: e.x, y: e.y, z, life: 0.2, col: e.art ? RED : '#ffffff', r: e.heavy ? 26 : 18 });
          sparks(e.x, e.y, z, e.heavy ? 12 : 7, e.heavy ? '#ffd9a0' : '#ffffff', e.heavy ? 160 : 110);
          if (e.heavy || e.art) R.float(String(e.dmg), e.x, e.y, z + 14, e.art ? RED : '#ffd9a0', true);
          R.shake = Math.max(R.shake, e.art ? 8 : e.heavy ? 3.5 : 1.6);
          break;
        }
        case 'hurt': sparks(e.x, e.y, 22, 9, RED, 130, 1.6); R.float(String(e.dmg), e.x, e.y, 38, '#ff5a6e', e.big); R.flash = 0.35; R.flashCol = '255,30,50'; R.shake = Math.max(R.shake, e.big ? 6 : 4); break;
        case 'parry': PK('parry', e.x, e.y, 22, 1.5); FX({ kind: 'ring', x: e.x, y: e.y, z: 22, life: 0.35, col: '#cfeeff', r0: 4, r1: 46, w: 3 }); FX({ kind: 'star', x: e.x, y: e.y, z: 22, life: 0.28, col: '#ffffff', r: 34 }); sparks(e.x, e.y, 22, 14, '#cfeeff', 200, 1.6); R.float('PARRY', e.x, e.y, 50, '#cfeeff', true, true); R.flash = 0.45; R.flashCol = '210,235,255'; R.shake = 5; break;
        case 'perfect': R.float('PERFECT', e.x, e.y, 56, '#8ef0ff', true, true); FX({ kind: 'gring', x: e.x, y: e.y, life: 0.5, col: '#8ef0ff', r0: 6, r1: 60, w: 2 }); break;
        case 'riposte': R.float('RIPOSTE', e.x, e.y, 64, '#ff9aa8', true, true); break;
        case 'break': { PK('hit_big', e.x, e.y, 24 * sc, 1.8); FX({ kind: 'ring', x: e.x, y: e.y, z: 24 * sc, life: 0.45, col: '#ffd060', r0: 6, r1: 60, w: 3 }); for (let i = 0; i < 14; i++) { const a = Math.random() * Math.PI * 2, v = 90 + Math.random() * 120; P({ x: e.x, y: e.y, z: 24 * sc, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6, vz: 60 + Math.random() * 80, g: -380, life: 0.6, size: 3, col: '#ffd060', shape: 'tri', rot: Math.random() * 6 }); } R.float('BREAK', e.x, e.y, 56 * sc, '#ffd060', true, true); R.shake = 7; break; }
        case 'kill': {
          const col = (u && u.def.color) || '#ffffff';
          for (let i = 0; i < (e.boss ? 60 : 22); i++) P({ x: e.x + (Math.random() - 0.5) * 16 * sc, y: e.y + (Math.random() - 0.5) * 8 * sc, z: Math.random() * 36 * sc, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 16, vz: 20 + Math.random() * 60, g: 10, life: 0.7 + Math.random() * 0.6, size: 1.5 + Math.random() * 1.5, col, shape: 'sq' });
          PK(e.hero ? 'smoke_dark' : 'dissipate', e.x, e.y, 16 * sc, 1.3 * sc);
          if (e.boss) { R.flash = 0.9; R.flashCol = '255,255,255'; R.shake = 12; PK('blast', e.x, e.y, 20 * sc, 3); PK('smoke_dark', e.x, e.y, 10, 3); }
          break;
        }
        case 'blink': PK('teleport', e.x, e.y, 0, 1.6); FX({ kind: 'ring', x: e.x, y: e.y, z: 20, life: 0.3, col: '#c070ff', r0: 40, r1: 2, w: 2 }); sparks(e.x, e.y, 20, 10, '#c070ff', 90); break;
        case 'dodge': for (let i = 0; i < 6; i++) P({ x: e.x, y: e.y, z: 1, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 40, vz: Math.random() * 25, g: -40, life: 0.35, size: 2 + Math.random() * 2, col: 'rgba(200,190,200,0.35)', shape: 'circle' }); break;
        case 'boltHit': FX({ kind: 'ring', x: e.x, y: e.y, z: 16, life: 0.25, col: '#e0b0ff', r0: 3, r1: 22, w: 2 }); sparks(e.x, e.y, 16, 8, '#e0b0ff', 120); break;
        case 'slam': PK('shockwave', e.x, e.y, 0, 2.2); FX({ kind: 'gring', x: e.x, y: e.y, life: 0.45, col: '#ff6a5a', r0: e.r * 0.3, r1: e.r * 1.2, w: 3 }); for (let i = 0; i < 16; i++) { const a = Math.random() * Math.PI * 2; P({ x: e.x + Math.cos(a) * e.r * 0.6, y: e.y + Math.sin(a) * e.r * 0.6, z: 1, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, vz: 40 + Math.random() * 60, g: -200, life: 0.5, size: 2.5, col: 'rgba(160,140,140,0.8)', shape: 'sq' }); } R.shake = Math.max(R.shake, 6); break;
        case 'swing': { const h = s.hero, c = e.clip; FX({ kind: 'slash', x: h.x, y: h.y, ang: h.ang, life: 0.16, dir: c === 'Attack2' ? 1 : c === 'Attack1' ? 0 : 2, big: c === 'Attack3' || c === 'Attack6' || c === 'Attack4', long: c === 'Attack4' }); break; }
        case 'spin': { const h = s.hero; PK('spin_slash', h.x, h.y, 18, 2.2); FX({ kind: 'gring', x: h.x, y: h.y, life: 0.35, col: '#ffffff', r0: 8, r1: 46, w: 3 }); FX({ kind: 'spin', x: h.x, y: h.y, life: 0.3 }); R.shake = Math.max(R.shake, 4); break; }
        case 'spawn': break;
        case 'landed': if (e.boss) { PK('shockwave', e.x, e.y, 0, 3.2); FX({ kind: 'gring', x: e.x, y: e.y, life: 0.6, col: '#ffffff', r0: 10, r1: 110, w: 4 }); R.shake = 14; } else { const u2 = s.units.find((o) => o.id === e.id); if (u2 && u2.mode === 'drop') { FX({ kind: 'gring', x: e.x, y: e.y, life: 0.4, col: '#ffffff', r0: 4, r1: 34, w: 2 }); R.shake = Math.max(R.shake, 2.5); } else if (u2 && u2.mode === 'rift') PK('smoke_burst', e.x, e.y, 6, 1.0); } break;
        case 'portal': FX({ kind: 'gring', x: e.x, y: e.y, life: 0.8, col: '#ffffff', r0: 4, r1: 90, w: 3 }); R.flash = 0.4; R.flashCol = '255,220,230'; break;
        case 'impact': R.impactF = { t: 0, dur: e.size === 'big' ? 0.17 : 0.1, x: e.x, y: e.y, big: e.size === 'big' }; R.shake = Math.max(R.shake, e.size === 'big' ? 12 : 6); break;
        case 'launch': { const z = 20 * sc; FX({ kind: 'gring', x: e.x, y: e.y, life: 0.35, col: '#ffffff', r0: 4, r1: 36, w: 2 }); for (let i = 0; i < 8; i++) P({ x: e.x, y: e.y, z: 2, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 20, vz: 160 + Math.random() * 120, life: 0.35, size: 1.4, col: '#ffffff', shape: 'line' }); R.float('LAUNCH', e.x, e.y, z + 40, '#ffd060', true, true); R.shake = Math.max(R.shake, 4); break; }
        case 'juggle': sparks(e.x, e.y, (u ? u.z : 0) + 22, 6, '#ffd9a0', 120); break;
        case 'land': FX({ kind: 'gring', x: e.x, y: e.y, life: 0.4, col: 'rgba(220,210,220,0.8)', r0: 6, r1: 40, w: 2 }); for (let i = 0; i < 10; i++) { const a = Math.random() * 6.28; P({ x: e.x, y: e.y, z: 1, vx: Math.cos(a) * 50, vy: Math.sin(a) * 30, vz: 20 + Math.random() * 30, g: -120, life: 0.45, size: 2.2, col: 'rgba(200,190,200,0.5)', shape: 'circle' }); } R.shake = Math.max(R.shake, 3.5); break;
        case 'wall': FX({ kind: 'star', x: e.x, y: e.y, z: 20, life: 0.25, col: '#ffffff', r: 30 }); sparks(e.x, e.y, 20, 14, '#ffffff', 180, 1.6); R.float('WALL ' + e.dmg, e.x, e.y, 50, '#ffffff', true, true); R.shake = Math.max(R.shake, 6); break;
        case 'phase': if (!e.quiet) { R.flash = 0.6; R.flashCol = '255,40,60'; R.shake = 8; } break;
        case 'artEnd': R.flash = 1; R.flashCol = '255,255,255'; R.shake = 12; break;
      }
    }
  };
  function drawFx(ctx, dt) {
    const Sh = R.Sh();
    R.fx = R.fx.filter((f) => {
      f.t += dt; const k = f.t / f.life; if (k >= 1) return false;
      ctx.save();
      if (f.kind === 'gring') {
        ground(ctx); ctx.globalAlpha = 1 - k; ctx.strokeStyle = f.col; ctx.lineWidth = f.w * (1 - k * 0.5);
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r0 + (f.r1 - f.r0) * (1 - Math.pow(1 - k, 2)), 0, 7); ctx.stroke();
        ctx.restore(); return true;
      }
      const q = R.P(f.x, f.y, f.z || 0), x = q.x, y = q.y;
      if (f.kind === 'ring') { ctx.globalAlpha = 1 - k; ctx.strokeStyle = f.col; ctx.lineWidth = f.w * R.dpr * (1 - k * 0.5); ctx.beginPath(); ctx.arc(x, y, (f.r0 + (f.r1 - f.r0) * (1 - Math.pow(1 - k, 2))) * Sh * 0.5, 0, 7); ctx.stroke(); }
      else if (f.kind === 'spark') { ctx.globalAlpha = 1 - k; R.glowAt(ctx, f.col, x, y, f.r * Sh * 0.6 * (0.6 + k), 0.9); ctx.fillStyle = '#ffffff'; const r = f.r * Sh * 0.18 * (1 - k); ctx.beginPath(); ctx.moveTo(x - r * 3, y); ctx.lineTo(x, y - r * 0.4); ctx.lineTo(x + r * 3, y); ctx.lineTo(x, y + r * 0.4); ctx.fill(); ctx.beginPath(); ctx.moveTo(x, y - r * 3); ctx.lineTo(x + r * 0.4, y); ctx.lineTo(x, y + r * 3); ctx.lineTo(x - r * 0.4, y); ctx.fill(); }
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
      return alive && e.t < 3;
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
  // the cone of a swing. White can be parried, red must be dodged.
  function telegraphs(ctx, s) {
    ground(ctx);
    for (const u of s.units) {
      if (u.team !== 'foe' || u.state !== 'attack' || u.atk.blink || u.atk.bolt) continue;
      const k = u.atk, w = k.wind * u.windMul; if (u.st >= w + 0.05) continue;
      const t = Math.min(1, u.st / w), col = k.unparry ? '#ff2a44' : '#ffffff';
      ctx.save();
      if (k.aoe) { const c = VS.aoeAt(u, k); ctx.fillStyle = rgba(col, 0.1 + 0.18 * t); ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, 7); ctx.fill(); ctx.fillStyle = rgba(col, 0.25); ctx.beginPath(); ctx.arc(c.x, c.y, c.r * t, 0, 7); ctx.fill(); ctx.strokeStyle = rgba(col, 0.75); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, 7); ctx.stroke(); }
      else if (k.lunge) { const L = k.lunge + k.reach * u.scale, hw = (u.rad + 6); ctx.translate(u.x, u.y); ctx.rotate(u.ang); ctx.fillStyle = rgba(col, 0.08 + 0.16 * t); ctx.fillRect(0, -hw, L, hw * 2); ctx.fillStyle = rgba(col, 0.28); ctx.fillRect(0, -hw, L * t, hw * 2); ctx.strokeStyle = rgba(col, 0.6); ctx.lineWidth = 1.2; ctx.strokeRect(0, -hw, L, hw * 2); }
      else { const r = k.reach * u.scale + 8, half = (k.arc || 1.5) / 2 + 0.2; ctx.translate(u.x, u.y); ctx.fillStyle = rgba(col, 0.06 + 0.14 * t); ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, u.ang - half, u.ang + half); ctx.closePath(); ctx.fill(); ctx.strokeStyle = rgba(col, 0.45 * t); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, r, u.ang - half, u.ang + half); ctx.stroke(); }
      ctx.restore();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  function drawUnit(ctx, s, u, pass) {
    const Sh = R.Sh(), sc = Sh * u.scale, q = R.P(u.x, u.y), x = Math.round(q.x), y0 = Math.round(q.y), lift = Math.round((u.z || 0) * Sh), y = y0 - lift, sa = R.screenAng(u.ang);
    let alpha = 1;
    if (u.state === 'dead' && u.team === 'foe') alpha = Math.max(0, 1 - Math.max(0, u.deadT - 0.5) / 0.6);
    if (alpha <= 0) return;
    if (u.state === 'spawn') { if (pass !== 'reflect') drawSpawn(ctx, u, x, y, sc, sa); return; }
    if (pass === 'reflect') { ctx.save(); ctx.translate(0, 2 * y0 + lift); ctx.scale(1, -1); A.actor(ctx, u.set, u.clip, u.frame, sa, x, y, sc, { alpha: 0.11 * alpha }); ctx.restore(); return; }
    if (u.aura && u.alive) { R.glowAt(ctx, RED, x, y - 22 * sc, 46 * sc, 0.3 + 0.12 * Math.sin(R.t * 7)); if (Math.random() < 0.4) P({ x: u.x + (Math.random() - 0.5) * 20 * u.scale, y: u.y, z: 4, vz: 50 + Math.random() * 40, life: 0.7, size: 1.6, col: 'rgba(255,60,90,0.9)', shape: 'sq' }); }

    const sw = 26 * sc * Math.max(0.45, 1 - (u.z || 0) / 160); ctx.globalAlpha = alpha * Math.max(0.35, 1 - (u.z || 0) / 200); ctx.drawImage(shadowImg(), x - sw / 2, y0 - sw * 0.12, sw, sw * 0.25); ctx.globalAlpha = 1;
    R.glowAt(ctx, u.team === 'hero' ? RED : '#c8c0e0', x, y - 22 * sc, 34 * sc, u.team === 'hero' ? 0.16 : 0.07);
    // A ring under each fighter: red for the knight, white for foes, red and white for a boss.
    if (u.alive) { const rw = 13 * sc, rh = rw * HELI.pitch * 0.9; ctx.save(); ctx.lineWidth = (u.def.boss ? 2.4 : 1.6) * R.dpr; ctx.strokeStyle = u.team === 'hero' ? 'rgba(255,42,68,0.95)' : u.def.boss ? 'rgba(255,120,140,0.8)' : 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(x, y0, rw, rh, 0, 0, 7); ctx.stroke(); if (u.team === 'hero') { ctx.fillStyle = 'rgba(255,42,68,0.12)'; ctx.fill(); } ctx.restore(); }
    const winding = u.state === 'attack' && u.team === 'foe' && u.st < u.atk.wind * u.windMul;
    const opts = { alpha, flash: u.flash * 0.55 };
    if (winding && u.atk.unparry) { opts.flash = 0.3 + 0.25 * Math.sin(R.t * 30); opts.flashCol = '#ff2040'; }
    if (u.team === 'hero' && u.iframes > 0 && u.state !== 'dodge' && u.state !== 'hurt' && Math.floor(R.t * 20) % 2) opts.alpha = 0.55;
    if (u.state === 'dodge') for (let i = 1; i <= 4; i++) { const g = R.P(u.x - u.dodgeDir[0] * i * 10, u.y - u.dodgeDir[1] * i * 10); A.actor(ctx, u.set, u.clip, Math.max(0, u.frame - i * 2), sa, g.x, g.y, sc, { shade: RED, alpha: 0.32 - i * 0.07 }); }
    A.actor(ctx, u.set, u.clip, u.frame, sa, x, y, sc, opts);
    if (winding) {
      const k = Math.min(1, u.st / (u.atk.wind * u.windMul)), hy = y - (48 * u.scale + 10) * Sh, col = u.atk.unparry ? RED : '#ffffff';
      ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2 * R.dpr; ctx.globalAlpha = 0.35 + 0.65 * k;
      ctx.beginPath(); ctx.arc(x, hy, (4 + 12 * (1 - k)) * Sh * 0.5, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, hy, 1.6 * R.dpr * (1 + k), 0, 7); ctx.fill();
      if (k > 0.75) R.glowAt(ctx, col, x, hy, 14 * Sh * 0.5, 0.6);
      ctx.restore();
    }
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
      drawSideGate(ctx, u.from.x, u.from.y, 1 - Math.max(0, (k - 0.7) / 0.3));
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
    const g = ctx.createRadialGradient(x, y, 0, x, y, rw); g.addColorStop(0, 'rgba(10,0,16,0.95)'); g.addColorStop(0.7, 'rgba(70,10,60,0.8)'); g.addColorStop(1, 'rgba(255,42,68,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rw, rw * HELI.pitch * 0.6, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,60,90,0.8)'; ctx.lineWidth = 1.5 * R.dpr; ctx.beginPath(); ctx.ellipse(x, y, rw, rw * HELI.pitch * 0.6, 0, 0, 7); ctx.stroke();
    A.fx(ctx, 'portal', R.t + u.id, x, y - 4 * sc, sc * 0.9, 0.8 * open);
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
  function raysImg(col) {
    const key = 'rays' + col; if (cache[key]) return cache[key];
    const W = 512, H = 288, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    for (let i = 0; i < 11; i++) {
      const a = -Math.PI / 2 + (i - 5) * 0.27, w = 0.05 + 0.035 * hash(i, 3), L = H * (0.75 + 0.25 * hash(i, 4));
      const gr = g.createLinearGradient(W / 2, H, W / 2 + Math.cos(a) * L, H + Math.sin(a) * L); gr.addColorStop(0, rgba(i % 2 ? '#ffffff' : col, 0.24)); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(W / 2, H); g.lineTo(W / 2 + Math.cos(a - w) * L * 1.2, H + Math.sin(a - w) * L * 1.2); g.lineTo(W / 2 + Math.cos(a + w) * L * 1.2, H + Math.sin(a + w) * L * 1.2); g.closePath(); g.fill();
    }
    return (cache[key] = c);
  }
  function drawSideGate(ctx, x, y, a) {
    if (a <= 0) return;
    const q = R.P(x, y), Sh = R.Sh(), w = 16 * Sh, h = 40 * Sh;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(q.x, q.y);
    R.glowAt(ctx, '#c070ff', 0, -h * 0.45, h, 0.45);
    const lg = ctx.createLinearGradient(0, -h, 0, 0); lg.addColorStop(0, 'rgba(255,255,255,0.9)'); lg.addColorStop(1, 'rgba(192,112,255,0.5)');
    ctx.fillStyle = lg; ctx.fillRect(-w * 0.6, -h, w * 1.2, h);
    ctx.fillStyle = '#120c18'; ctx.fillRect(-w, -h - 4 * Sh, w * 0.4, h + 4 * Sh); ctx.fillRect(w * 0.6, -h - 4 * Sh, w * 0.4, h + 4 * Sh); ctx.fillRect(-w * 1.1, -h - 7 * Sh, w * 2.2, 5 * Sh);
    ctx.restore();
  }
  // The way on: a gate of light, a stairway into the sky, or a rift.
  function drawPortal(ctx, st, p) {
    // It rises out of the floor (0 to 1 s), its runes light one by one, then it opens (0.9 to 1.5 s)
    // and throws a pillar of light into the sky. An arrival door (p.closing) plays this backwards.
    const Sh = R.Sh(), L = st.look, t = R.t, q = R.P(p.x, p.y);
    // An arrival door bursts open with light, dims, then crumbles away (from 1.0 s).
    const rise = p.closing ? 1 : Math.min(1, p.t / 1.0);
    const open = p.closing ? (p.t < 0.15 ? p.t / 0.15 : Math.max(0, 1 - (p.t - 0.15) / 0.8)) : Math.max(0, Math.min(1, (p.t - 0.9) / 0.6));
    const fade = p.closing && p.t > 1.0 ? Math.max(0, 1 - (p.t - 1.0) / 0.6) : 1;
    if (fade <= 0) return;
    if (!p.boomed && open > 0.05) {
      // The doors burst: a flash of an impact frame, rings, debris flung out, the camera kicked.
      p.boomed = true;
      FX({ kind: 'gring', x: p.x, y: p.y, life: 0.7, col: '#ffffff', r0: 8, r1: 150, w: 5 }); FX({ kind: 'gring', x: p.x, y: p.y, life: 1.0, col: '#ff2a44', r0: 4, r1: 100, w: 2 }); FX({ kind: 'gring', x: p.x, y: p.y, life: 1.3, col: '#ffffff', r0: 20, r1: 200, w: 1.5 });
      for (let i = 0; i < 26; i++) { const a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 160; P({ x: p.x, y: p.y, z: 10 + Math.random() * 50, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7, vz: 60 + Math.random() * 120, g: -420, life: 0.9, size: 2.4 + Math.random() * 2, col: i % 3 ? mix(L.sky[0], '#ffffff', 0.25) : '#ffffff', shape: 'tri', rot: Math.random() * 6 }); }
      if (!p.closing) { R.impactF = { t: 0, dur: 0.09, x: p.x, y: p.y, big: false }; R.punch = 0.05; }
      R.shake = Math.max(R.shake, p.closing ? 5 : 10); R.flash = p.closing ? 0.6 : 0.5; R.flashCol = '255,235,240';
    }
    if (p.closing && !p.crumbled && p.t > 1.0) { p.crumbled = true; for (let i = 0; i < 30; i++) P({ x: p.x + (Math.random() - 0.5) * 40, y: p.y + (Math.random() - 0.5) * 8, z: Math.random() * 90, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 10, vz: -20 - Math.random() * 40, g: 300, life: 0.8, size: 2 + Math.random() * 2.5, col: mix(L.sky[0], '#ffffff', 0.2), shape: 'tri', rot: Math.random() * 6 }); for (let i = 0; i < 10; i++) P({ x: p.x + (Math.random() - 0.5) * 50, y: p.y, z: 2, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 30, vz: 10 + Math.random() * 20, g: -20, life: 0.9, size: 3, col: 'rgba(200,190,200,0.4)', shape: 'circle' }); }
    // Energy spiralling in from all around while it stands open.
    p.motes = p.motes || [];
    if (!p.closing && rise > 0.5) p.motes.push({ a: Math.random() * Math.PI * 2, r: 70 + Math.random() * 60, z: Math.random() * 20, life: 0 });
    const dtm = R.realDt || 0.016, paths = [new Path2D(), new Path2D()];
    p.motes = p.motes.filter((m, i) => {
      const pa = m.a, pr = m.r; m.life += dtm; m.r -= (50 + m.life * 90) * dtm; m.a += (2.4 + 60 / Math.max(10, m.r)) * dtm; m.z += (45 - m.z) * dtm * 2;
      if (m.r < 6) return false;
      const a1 = R.P(p.x + Math.cos(m.a) * m.r, p.y + Math.sin(m.a) * m.r, m.z), a0 = R.P(p.x + Math.cos(pa) * pr, p.y + Math.sin(pa) * pr, m.z), path = paths[i % 2];
      path.moveTo(a0.x, a0.y); path.lineTo(a1.x + (a1.x - a0.x) * 2, a1.y + (a1.y - a0.y) * 2);
      return true;
    });
    ctx.lineWidth = 1.6 * R.dpr; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.stroke(paths[0]); ctx.strokeStyle = rgba(L.moonCol, 0.9); ctx.stroke(paths[1]);
    ctx.save(); ctx.globalAlpha = fade; ctx.translate(q.x, q.y);
    // A rune circle on the floor beneath it.
    ctx.save(); ctx.scale(1, HELI.pitch); const rr = 46 * Sh * rise;
    ctx.strokeStyle = rgba(L.moonCol, 0.7 * rise); ctx.lineWidth = 2 * R.dpr; ctx.beginPath(); ctx.arc(0, 0, rr, 0, 7); ctx.stroke();
    ctx.setLineDash([6 * R.dpr, 8 * R.dpr]); ctx.lineDashOffset = -t * 30; ctx.beginPath(); ctx.arc(0, 0, rr * 0.8, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + t * 0.4, lit = Math.max(0, Math.min(1, rise * 9 - i)) * (0.5 + 0.5 * Math.sin(t * 5 - i * 0.8)), rx = Math.cos(a) * rr * 1.15, ry = Math.sin(a) * rr * 1.15, sz = 4 * Sh; ctx.fillStyle = rgba(L.moonCol, 0.25 + 0.75 * lit); ctx.beginPath(); ctx.moveTo(rx, ry - sz); ctx.lineTo(rx + sz * 0.6, ry); ctx.lineTo(rx, ry + sz); ctx.lineTo(rx - sz * 0.6, ry); ctx.fill(); }
    ctx.restore();
    // God rays fanning out of the door once it opens (one cached fan, breathing).
    if (open > 0.1) {
      const fan = raysImg(L.moonCol), w = R.H * 1.6 * (0.96 + 0.04 * Math.sin(t * 2)), h = R.H * 0.9;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (0.75 + 0.25 * Math.sin(t * 3)) * open;
      ctx.drawImage(fan, -w / 2, -46 * Sh - h, w, h); ctx.restore();
    }
    R.glowAt(ctx, L.moonCol, 0, -30 * Sh, 110 * Sh * Math.max(rise * 0.5, open), 0.4);
    if (open > 0.3) {
      // The pillar of light.
      const bw = (10 + 4 * Math.sin(t * 9)) * Sh * open, bg = ctx.createLinearGradient(0, -R.H, 0, 0); bg.addColorStop(0, rgba('#ffffff', 0)); bg.addColorStop(0.6, rgba(L.moonCol, 0.35 * open)); bg.addColorStop(1, rgba('#ffffff', 0.7 * open));
      ctx.fillStyle = bg; ctx.fillRect(-bw, -R.H, bw * 2, R.H - 40 * Sh);
    }
    if (p.kind === 'gate') {
      const w = 44 * Sh, h = 96 * Sh, dark = mix(L.sky[0], '#000000', 0.55);
      ctx.save(); ctx.beginPath(); ctx.rect(-w * 2, -h * 2, w * 4, h * 2); ctx.clip(); ctx.translate(0, (1 - rise) * h * 1.1);
      // Light inside the arch, behind the doors.
      const lg = ctx.createLinearGradient(0, -h, 0, 0); lg.addColorStop(0, '#ffffff'); lg.addColorStop(1, rgba(L.moonCol, 0.9));
      ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(-w * 0.6, 0); ctx.lineTo(-w * 0.6, -h * 0.6); ctx.arc(0, -h * 0.6, w * 0.6, Math.PI, 0); ctx.lineTo(w * 0.6, 0); ctx.closePath(); ctx.fill();
      // The doors, sliding apart.
      ctx.save(); ctx.clip(); const dw = w * 0.6 * (1 - open);
      ctx.fillStyle = mix(dark, '#ffffff', 0.06); ctx.fillRect(-w * 0.6, -h * 1.3, dw, h * 1.3); ctx.fillRect(w * 0.6 - dw, -h * 1.3, dw, h * 1.3);
      ctx.fillStyle = rgba(L.moonCol, 0.8); ctx.fillRect(-w * 0.6 + dw - 2 * R.dpr, -h * 1.3, 2 * R.dpr, h * 1.3); ctx.fillRect(w * 0.6 - dw, -h * 1.3, 2 * R.dpr, h * 1.3);
      ctx.restore();
      // The frame: pillars with runes that light one by one, a lintel with a red stone.
      ctx.fillStyle = dark; ctx.fillRect(-w, -h, w * 0.4, h); ctx.fillRect(w * 0.6, -h, w * 0.4, h); ctx.fillRect(-w * 1.15, -h - 12 * Sh, w * 2.3, 13 * Sh);
      for (let i = 0; i < 6; i++) { const lit = Math.max(0, Math.min(1, rise * 7 - i - 0.5)); ctx.fillStyle = rgba(L.moonCol, 0.2 + 0.8 * lit); const ry = -h * (0.15 + i * 0.13); ctx.fillRect(-w * 0.82, ry, w * 0.06, 6 * Sh); ctx.fillRect(w * 0.76, ry, w * 0.06, 6 * Sh); }
      ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(0, -h - 6 * Sh, 4 * Sh, 0, 7); ctx.fill(); R.glowAt(ctx, RED, 0, -h - 6 * Sh, 16 * Sh, 0.6);
      ctx.restore();
    } else if (p.kind === 'stairs') {
      // Steps of light set down one after another, climbing away into the sky.
      const n = 11;
      for (let i = n - 1; i >= 0; i--) {
        const a = Math.max(0, Math.min(1, rise * (n + 2) * 0.6 - i * 0.6 + (open > 0 ? 9 : 0) * 0)); if (a <= 0) continue;
        const sx = i * 8 * Sh, sy = -i * 15 * Sh - (1 - a) * 30 * Sh, w = 44 * Sh;
        ctx.globalAlpha = a; ctx.fillStyle = mix(L.sky[0], '#000000', 0.45); ctx.fillRect(sx - w / 2, sy - 6 * Sh, w, 7 * Sh);
        ctx.fillStyle = rgba(L.moonCol, 0.95); ctx.fillRect(sx - w / 2, sy - 6 * Sh, w, 2 * R.dpr);
        if (a < 1) { ctx.fillStyle = `rgba(255,255,255,${1 - a})`; ctx.fillRect(sx - w / 2, sy - 6 * Sh, w, 7 * Sh); }
        R.glowAt(ctx, L.moonCol, sx, sy - 3 * Sh, 26 * Sh, 0.25 + 0.3 * open);
      }
      ctx.globalAlpha = open; const top = { x: (n - 1) * 8 * Sh, y: -(n - 1) * 15 * Sh };
      const lg = ctx.createLinearGradient(0, top.y - 50 * Sh, 0, top.y); lg.addColorStop(0, '#ffffff'); lg.addColorStop(1, rgba(L.moonCol, 0.8));
      ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(top.x - 16 * Sh, top.y - 6 * Sh); ctx.lineTo(top.x - 16 * Sh, top.y - 40 * Sh); ctx.arc(top.x, top.y - 40 * Sh, 16 * Sh, Math.PI, 0); ctx.lineTo(top.x + 16 * Sh, top.y - 6 * Sh); ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      // A tear down the air that splits into a vortex, with lightning around its edge.
      const rh = 56 * Sh, rw = 34 * Sh * Math.max(0.06, open);
      const crack = Math.min(1, rise * 1.2);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2 * R.dpr; ctx.beginPath(); ctx.moveTo(0, -rh * (1 - crack)); for (let i = 1; i <= 8; i++) ctx.lineTo((hash(i, Math.floor(t * 12)) - 0.5) * 6 * Sh, -rh * (1 - crack) - rh * 2 * crack * i / 8); ctx.stroke();
      if (open > 0) {
        const g = ctx.createRadialGradient(0, -rh, 0, 0, -rh, rh * 1.1); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.3, rgba(L.moonCol, 0.9)); g.addColorStop(0.75, 'rgba(60,0,40,0.85)'); g.addColorStop(1, 'rgba(20,0,20,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -rh, rw, rh, 0, 0, 7); ctx.fill();
        ctx.lineWidth = 2 * R.dpr;
        for (let i = 0; i < 4; i++) { ctx.strokeStyle = i % 2 ? rgba(L.moonCol, 0.9) : 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.ellipse(0, -rh, rw * (1 - i * 0.18), rh * (1 - i * 0.18), 0, t * (3 + i) + i, t * (3 + i) + i + 2.2); ctx.stroke(); }
        if (Math.floor(t * 8) % 3 === 0) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5 * R.dpr; ctx.beginPath(); const a0 = hash(Math.floor(t * 8), 3) * 6.28; let lx = Math.cos(a0) * rw, ly = -rh + Math.sin(a0) * rh; ctx.moveTo(lx, ly); for (let i = 0; i < 5; i++) { lx += Math.cos(a0) * 8 * Sh + (hash(i, Math.floor(t * 8)) - 0.5) * 10 * Sh; ly += Math.sin(a0) * 8 * Sh + (hash(i + 9, Math.floor(t * 8)) - 0.5) * 10 * Sh; ctx.lineTo(lx, ly); } ctx.stroke(); }
      }
    }
    ctx.restore();
    if (!p.closing && rise > 0.3 && Math.random() < 0.8) P({ x: p.x + (Math.random() - 0.5) * 50, y: p.y + (Math.random() - 0.5) * 16, z: 2, vz: 50 + Math.random() * 70, life: 1.0, size: 1.6, col: Math.random() < 0.5 ? 'rgba(255,255,255,0.9)' : rgba(L.moonCol, 0.9), shape: 'sq' });
  }
  // Chevrons on the floor from the hero toward the way on.
  function guide(ctx, s) {
    const p = s.portal, h = s.hero; if (!p || s.transit) return;
    const dx = p.x - h.x, dy = p.y - h.y, d = Math.hypot(dx, dy); if (d < 30) return;
    ground(ctx); ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(Math.atan2(dy, dx));
    for (let i = 0; i < 3; i++) { const o = 26 + i * 14 + (R.t * 30) % 14, a = 0.55 - i * 0.15; ctx.strokeStyle = rgba('#ffffff', a); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(o - 5, -6); ctx.lineTo(o, 0); ctx.lineTo(o - 5, 6); ctx.stroke(); }
    ctx.restore(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  // An impact frame, as in the moon arts: white with black silhouettes, then black with white ones.
  function impactFrame(ctx, s, dt) {
    const f = R.impactF; if (!f) return; f.t += dt; if (f.t >= f.dur) { R.impactF = null; return; }
    const first = f.t < f.dur * 0.6, bg = first ? '#ffffff' : '#050307', fg = first ? '#000000' : '#ffffff';
    ctx.fillStyle = bg; ctx.fillRect(0, 0, R.W, R.H);
    const c = R.P(f.x, f.y, 24);
    ctx.strokeStyle = first ? '#000000' : RED; ctx.lineWidth = 2 * R.dpr;
    ctx.beginPath(); for (let i = 0; i < (f.big ? 48 : 30); i++) { const a = hash(i, 77) * Math.PI * 2, r0 = R.H * (0.12 + hash(i, 78) * 0.2), r1 = r0 + R.H * (0.3 + hash(i, 79) * 0.6); ctx.moveTo(c.x + Math.cos(a) * r0, c.y + Math.sin(a) * r0); ctx.lineTo(c.x + Math.cos(a) * r1, c.y + Math.sin(a) * r1); } ctx.stroke();
    for (const u of s.units) { if (u.state === 'dead' && u.deadT > 0.5) continue; const q = R.P(u.x, u.y, u.z || 0); A.actor(ctx, u.set, u.clip, u.frame, R.screenAng(u.ang), Math.round(q.x), Math.round(q.y), R.Sh() * u.scale, { shade: fg }); }
    if (f.big) { ctx.strokeStyle = fg; ctx.lineWidth = 3 * R.dpr; ctx.beginPath(); ctx.moveTo(c.x - R.W * 0.6, c.y + R.H * 0.3); ctx.lineTo(c.x + R.W * 0.6, c.y - R.H * 0.3); ctx.stroke(); }
  }
  R.follow = function (s, dt) {
    const h = s.hero, f = VS.sim.foes(s).sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y))[0];
    let tx = h.x, ty = h.y;
    if (f && Math.hypot(f.x - h.x, f.y - h.y) < 180) { tx = h.x * 0.65 + f.x * 0.35; ty = h.y * 0.65 + f.y * 0.35; }
    // While a door opens the camera turns to it, then keeps it in view as the hero walks over.
    if (s.portal) { const k = Math.min(1, s.portal.t / 1.2), w = s.portal.t < 1.9 ? 0.75 * k : 0.4; tx += (s.portal.x - tx) * w; ty += (s.portal.y - ty) * w; }
    const A = VS.arenaOf(s), lx = A.shape === 'rect' ? A.hw * 0.62 : A.shape === 'cross' ? A.arm * 0.6 : A.r * 0.45, ly = A.shape === 'rect' ? A.hh * 0.55 : lx;
    tx = clamp(tx, -lx, lx); ty = clamp(ty, -ly, ly);
    const k = Math.min(1, dt * 4); R.hcam.x += (tx - R.hcam.x) * k; R.hcam.y += (ty - R.hcam.y) * k;
  };
  R.snapCam = function (s) { R.hcam.x = s.hero.x * 0.6; R.hcam.y = s.hero.y * 0.6; };
  R.drawFight = function (ctx, s, dt) {
    const st = s.def;
    R.follow(s, dt);
    // Inside the warp tunnel nothing of the arena shows: draw only the tunnel.
    if (s.transit && s.transit.t > VS.TRANSIT.into + 0.05 && s.transit.t < VS.TRANSIT.swap) { transitOverlay(ctx, s); R.shake = Math.max(0, R.shake - dt * 22); return; }
    // Arriving: the door he came through seals behind him.
    if (s.entry && s.entry !== R.entrySeen) { R.entrySeen = s.entry; const en = s.entry, n = Math.hypot(en.x, en.y) || 1; R.entryDoor = { x: en.x + en.x / n * 26, y: en.y + en.y / n * 26, t: 0, kind: s.entry.kind === 'stairs' ? 'gate' : s.entry.kind, closing: true }; }
    if (R.entryDoor) { R.entryDoor.t += dt; if (R.entryDoor.t > 1.8) R.entryDoor = null; }
    const zoomIn = s.transit && s.transit.t < VS.TRANSIT.swap && s.transit.p ? Math.pow(Math.min(1, s.transit.t / VS.TRANSIT.swap), 2) * 0.7 : 0;
    ctx.save();
    if (zoomIn) { const c = R.P(s.transit.p.x, s.transit.p.y, 40), z = 1 + zoomIn; ctx.translate(c.x, c.y); ctx.scale(z, z); ctx.translate(-c.x, -c.y); }
    // The sky and the moon behind the platform, drifting a little with the camera.
    const sky = heliSky(st); ctx.drawImage(sky, -40 - Math.round(R.hcam.x * 0.06 * R.dpr), 0);
    // The platform.
    const area = s.area || 0, AR = VS.arenaOf(s), last = area === s.waves.length - 1, pl = platform(st, area, last, AR), o = R.P(0, 0);
    ctx.drawImage(pl.c, Math.round(o.x - pl.pw / 2), Math.round(o.y - pl.cy));
    // Warm light from the braziers on the floor, and fog drifting across it.
    fog(ctx, st);
    telegraphs(ctx, s);
    guide(ctx, s);
    // Reflections in the glossy floor, then everything upright sorted by depth.
    const units = s.units.slice();
    for (const u of units) if (u.state !== 'spawn') drawUnit(ctx, s, u, 'reflect');
    const items = units.map((u) => ({ d: R.P(u.x, u.y).d, u })).concat(propsOf(st, area, AR).map((p) => ({ d: R.P(p.x, p.y).d, p })));
    if (s.portal) items.push({ d: R.P(s.portal.x, s.portal.y).d - 1, portal: s.portal });
    if (R.entryDoor) items.push({ d: R.P(R.entryDoor.x, R.entryDoor.y).d - 1, portal: R.entryDoor });
    items.sort((a, b) => a.d - b.d);
    for (const it of items) { if (it.u) drawUnit(ctx, s, it.u); else if (it.portal) drawPortal(ctx, st, it.portal); else drawProp(ctx, st, it.p); }
    // Bolts: a glowing orb with a tail.
    for (const b of s.bolts) {
      const q = R.P(b.x, b.y, 16), t = R.P(b.x - b.vx * 0.12, b.y - b.vy * 0.12, 16), col = b.reflected ? '#ffffff' : b.fx === 'wind_gust' ? '#dfe8ff' : b.fx === 'dark_slash' ? RED : '#c070ff';
      ctx.save(); ctx.strokeStyle = rgba(col, 0.55); ctx.lineWidth = 4 * R.Sh() * 0.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(q.x, q.y); ctx.stroke(); ctx.restore();
      R.glowAt(ctx, col, q.x, q.y, 12 * R.Sh(), 0.9); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(q.x, q.y, 2.4 * R.Sh(), 0, 7); ctx.fill();
    }
    drawFx(ctx, dt);
    R.drawWeather(ctx, st, R.hcam.x * 0.5, R.t, 0.45);
    ctx.restore();
    // Floaters.
    R.floaters = R.floaters.filter((fl) => {
      fl.t += dt; const k = fl.t / (fl.label ? 1.0 : 0.8); if (k >= 1) return false;
      const pop = fl.t < 0.08 ? 1.5 - fl.t / 0.08 * 0.5 : 1, size = (fl.label ? 15 : fl.big ? 20 : 14) * R.k * pop, q = R.P(fl.x, fl.y, fl.z + k * 14);
      ctx.save(); ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      ctx.font = R.fd(size, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.lineWidth = 4 * R.dpr; ctx.strokeStyle = 'rgba(8,4,10,0.85)'; ctx.strokeText(fl.text, q.x, q.y); ctx.fillStyle = fl.col; ctx.fillText(fl.text, q.x, q.y);
      ctx.restore(); return true;
    });
    const h = s.hero;
    if (s.slowT > 0) { ctx.fillStyle = 'rgba(140,230,255,0.07)'; ctx.fillRect(0, 0, R.W, R.H); }
    if (h.alive && h.hp / h.maxHp <= s.mods.ldx) vignette(ctx, 0.35 + 0.15 * Math.sin(R.t * 5));
    if (R.flash > 0) { ctx.fillStyle = `rgba(${R.flashCol},${R.flash * 0.45})`; ctx.fillRect(0, 0, R.W, R.H); R.flash = Math.max(0, R.flash - dt * 2.8); }
    impactFrame(ctx, s, R.realDt || dt);
    transitOverlay(ctx, s);
    R.shake = Math.max(0, R.shake - dt * 22);
  };
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
        // Streaks, batched by distance (near ones thicker and brighter) and colour.
        ctx.lineCap = 'round'; const bands = [0, 1, 2].map(() => [new Path2D(), new Path2D()]);
        for (let i = 0; i < 110; i++) {
          const an = hash(i, 101) * Math.PI * 2, sp = 0.6 + hash(i, 102) * 1.2, ph = (hash(i, 103) + t * sp * 1.6) % 1, r0 = D * Math.pow(ph, 2.2), r1 = r0 + D * 0.08 * (0.3 + ph * 2);
          const path = bands[Math.min(2, Math.floor(ph * 3))][i % 4 ? 0 : 1]; path.moveTo(cx + Math.cos(an) * r0, cy + Math.sin(an) * r0); path.lineTo(cx + Math.cos(an) * r1, cy + Math.sin(an) * r1);
        }
        bands.forEach((b, j) => { ctx.lineWidth = (1 + j * 1.3) * R.dpr; ctx.strokeStyle = `rgba(255,255,255,${0.35 + j * 0.3})`; ctx.stroke(b[0]); ctx.strokeStyle = `rgba(255,42,68,${0.5 + j * 0.25})`; ctx.stroke(b[1]); });
        for (let i = 0; i < 4; i++) { const rr = ((t * 1.4 + i / 4) % 1); ctx.strokeStyle = `rgba(255,42,68,${0.5 * rr})`; ctx.lineWidth = 2 * R.dpr; ctx.beginPath(); ctx.ellipse(cx, cy, D * rr * rr, D * rr * rr * 0.62, 0, 0, 7); ctx.stroke(); }
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
  R.drawCine = function (ctx, s) {
    const h = s.hero, c = PX.ctx, el = PX.buf;
    if (!el.parentNode) {
      el.id = 'cine'; Object.assign(el.style, { position: 'fixed', left: '0', top: '0', width: '100%', height: '100%', imageRendering: 'pixelated', zIndex: '4', pointerEvents: 'none', display: 'none' });
      document.body.appendChild(el);
    }
    PX.fit(R.W / R.H);
    const q = R.P(h.x, h.y);
    PX.heroAt = { x: q.x / R.W * PX.W, y: q.y / R.H * PX.H, k: R.Sh() * h.scale * PX.H / R.H };
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, PX.W, PX.H); c.globalAlpha = 1; c.imageSmoothingEnabled = false;
    VS.cine.draw(c, s);
    if (el.style.display !== 'block') el.style.display = 'block';
    if (PX.shake > 0) { R.shake = Math.max(R.shake, PX.shake * 1.5); PX.shake = 0; }
  };
  // A story scene on the same overlay.
  R.drawScene = function (sc) {
    const el = PX.buf;
    if (!el.parentNode) { el.id = 'cine'; Object.assign(el.style, { position: 'fixed', left: '0', top: '0', width: '100%', height: '100%', imageRendering: 'pixelated', zIndex: '4', pointerEvents: 'none', display: 'none' }); document.body.appendChild(el); }
    PX.fit(R.W / R.H); const c = PX.ctx; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, PX.W, PX.H);
    VS.SC.draw(c, sc);
    if (el.style.display !== 'block') el.style.display = 'block';
    if (PX.shake > 0) { const d = PX.shake * R.k; el.style.transform = `translate(${Math.round((Math.random() - 0.5) * d)}px,${Math.round((Math.random() - 0.5) * d)}px)`; PX.shake = Math.max(0, PX.shake - 1); } else el.style.transform = '';
  };
  R.hideCine = function () { if (PX.buf.parentNode && PX.buf.style.display !== 'none') PX.buf.style.display = 'none'; };
  R.cineCovers = (s) => s.cine && VS.cine.beatAt(s.cine)[0] !== 'snap';

  // ---- HUD --------------------------------------------------------------------------------------------
  function slantBar(ctx, x, y, w, h, frac, trail, col) {
    const sk = h * 0.9, path = (ww) => { ctx.beginPath(); ctx.moveTo(x + sk, y); ctx.lineTo(x + ww, y); ctx.lineTo(x + ww - sk, y + h); ctx.lineTo(x, y + h); ctx.closePath(); };
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; path(w); ctx.fill();
    if (trail > frac) { ctx.fillStyle = 'rgba(255,255,255,0.75)'; path(Math.max(sk, w * trail)); ctx.fill(); }
    if (frac > 0) { const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, mix(col, '#000000', 0.25)); g.addColorStop(1, col); ctx.fillStyle = g; path(Math.max(sk, w * frac)); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = R.dpr; path(w); ctx.stroke();
  }
  const trails = {};
  function trailOf(id, v, dt) { const t = trails[id] == null ? v : trails[id]; trails[id] = v < t ? Math.max(v, t - dt * 0.5) : v; return trails[id]; }
  function label(ctx, text, x, y, size, col, align, spacing, weight) {
    ctx.font = R.fd(size, weight || 600); ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
    if ('letterSpacing' in ctx) ctx.letterSpacing = (spacing || 0) * R.dpr + 'px';
    ctx.fillStyle = col; ctx.fillText(text, x, y);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }
  R.label = label;
  R.drawHud = function (ctx, s, dt, opts) {
    const h = s.hero, k = R.k, m = 18 * k, W = R.W;
    // The knight.
    label(ctx, 'VESPER', m, m + 10 * k, 12 * k, '#f3eef0', 'left', 3);
    const bw = Math.min(W * 0.3, 250 * k), hf = h.hp / h.maxHp;
    slantBar(ctx, m, m + 17 * k, bw, 9 * k, hf, trailOf('hero', hf, dt), RED);
    label(ctx, `${Math.ceil(h.hp)}`, m + bw + 8 * k, m + 25 * k, 12 * k, '#f3eef0', 'left', 0, 700);
    // The moon gauge.
    const gx = m + 16 * k, gy = m + 52 * k, gr = 14 * k, mk = s.moon / 100, full = mk >= 1;
    ctx.lineWidth = 3 * k * 0.8; ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.arc(gx, gy, gr, 0, 7); ctx.stroke();
    ctx.strokeStyle = full ? RED : '#c8203a'; ctx.beginPath(); ctx.arc(gx, gy, gr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * mk); ctx.stroke();
    if (full) R.glowAt(ctx, RED, gx, gy, gr * 2.6, 0.45 + 0.25 * Math.sin(R.t * 6));
    ctx.fillStyle = full ? RED : 'rgba(200,32,58,0.45)'; ctx.beginPath(); ctx.arc(gx, gy, gr * 0.62 * (full ? 1 : 0.4 + 0.6 * mk), 0, 7); ctx.fill();
    if (full) {
      const ldx = VS.ldxReady(s);
      label(ctx, ldx ? 'LAST DITCH EFFORT' : 'RED MOON', gx + gr + 10 * k, gy + 1 * k, (ldx ? 15 : 13) * k, ldx ? (Math.sin(R.t * 10) > 0 ? RED : '#ffffff') : '#ff8a9a', 'left', 2, 700);
      label(ctx, opts.touch ? 'TAP MOON' : 'PRESS L', gx + gr + 10 * k, gy + 14 * k, 9 * k, '#a99aa2', 'left', 2);
    } else label(ctx, `MOON ${Math.floor(s.moon)}%`, gx + gr + 10 * k, gy + 4 * k, 10 * k, '#a99aa2', 'left', 2);
    // Bosses.
    const bosses = s.units.filter((u) => u.def.boss && (u.alive || u.deadT < 1));
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
    if (!bosses.length) label(ctx, `AREA ${(s.area || 0) + 1} / ${s.waves.length}`, W - m - (opts.touch ? 44 * k : 0), m + 12 * k, 11 * k, '#c8b8c0', 'right', 3);
    if (s.combo >= 3) {
      const c = s.combo, x = W - m - (opts.touch ? 6 * k : 0), y = R.H * 0.36;
      ctx.save(); ctx.font = R.fd((30 + Math.min(14, c * 0.4)) * k, 700); ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
      ctx.lineWidth = 4 * R.dpr; ctx.strokeStyle = 'rgba(8,4,10,0.8)'; ctx.strokeText(String(c), x, y); ctx.fillStyle = c >= 20 ? RED : '#ffffff'; ctx.fillText(String(c), x, y); ctx.restore();
      label(ctx, 'HITS', x, y + 14 * k, 10 * k, '#ff8a9a', 'right', 3);
    }
    if (opts.auto) label(ctx, 'AUTO', W - m - (opts.touch ? 44 * k : 0), m + 12 * k + (bosses.length ? 0 : 16 * k), 10 * k, '#ff8a9a', 'right', 3);
  };

  // Touch controls: a stick bottom left; CUT, DASH, PARRY and MOON bottom right; pause top right.
  R.touchLayout = function () {
    const k = R.k, m = 18 * k, W = R.W, H = R.H;
    return { stick: { x: m + 64 * k, y: H - m - 60 * k, r: 50 * k },
      buttons: [{ id: 'atk', x: W - m - 58 * k, y: H - m - 56 * k, r: 42 * k }, { id: 'dodge', x: W - m - 146 * k, y: H - m - 30 * k, r: 28 * k },
        { id: 'parry', x: W - m - 136 * k, y: H - m - 110 * k, r: 28 * k }, { id: 'heavy', x: W - m - 48 * k, y: H - m - 150 * k, r: 28 * k },
        { id: 'art', x: W - m - 128 * k, y: H - m - 186 * k, r: 26 * k },
        { id: 'pause', x: W - m - 18 * k, y: m + 18 * k, r: 18 * k }] };
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
  R.drawTouch = function (ctx, s, st) {
    const L = R.touchLayout(), k = R.k;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1.5 * R.dpr; ctx.fillStyle = 'rgba(10,6,12,0.28)';
    ctx.beginPath(); ctx.arc(L.stick.x, L.stick.y, L.stick.r, 0, 7); ctx.fill(); ctx.stroke();
    const kx = st.stick ? st.stick.dx * L.stick.r * 0.6 : 0, ky = st.stick ? st.stick.dy * L.stick.r * 0.6 : 0;
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.beginPath(); ctx.arc(L.stick.x + kx, L.stick.y + ky, L.stick.r * 0.42, 0, 7); ctx.fill();
    for (const b of L.buttons) {
      const ready = b.id !== 'art' || s.moon >= 100, held = st.held[b.id];
      ctx.globalAlpha = ready ? 1 : 0.4;
      if (b.id === 'art' && ready) R.glowAt(ctx, RED, b.x, b.y, b.r * 2.2, 0.5 + 0.2 * Math.sin(R.t * 6));
      ctx.fillStyle = held ? 'rgba(255,42,68,0.45)' : b.id === 'art' && ready ? 'rgba(255,42,68,0.3)' : 'rgba(10,6,12,0.35)';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
      ctx.strokeStyle = b.id === 'art' && ready ? RED : 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5 * R.dpr; ctx.stroke();
      icon(ctx, b.id, b.x, b.y, b.r, b.id === 'art' ? (ready ? '#ffffff' : RED) : 'rgba(255,255,255,0.9)');
    }
    ctx.restore();
  };

  R.drawReticle = function (ctx, x, y) {
    const r = 9 * R.k; ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.5 * R.dpr;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke(); ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(x, y, 2 * R.dpr, 0, 7); ctx.fill();
    for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) { ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 1.3, y + Math.sin(a) * r * 1.3); ctx.lineTo(x + Math.cos(a) * r * 1.9, y + Math.sin(a) * r * 1.9); ctx.stroke(); }
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
  R.banner = function (ctx, text, t, col, sub) {
    const k = R.k, a = Math.min(1, t * 4, (1.6 - t) * 3); if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; const y = R.H * 0.3, lw = (60 + 80 * Math.min(1, t * 3)) * k;
    ctx.fillStyle = rgba(col === RED ? '#ff2a44' : '#ffffff', 0.5); ctx.fillRect(R.W / 2 - lw - 120 * k, y - 6 * k, lw, Math.max(1, R.dpr)); ctx.fillRect(R.W / 2 + 120 * k, y - 6 * k, lw, Math.max(1, R.dpr));
    label(ctx, text, R.W / 2, y, 22 * k, col, 'center', 6, 700); if (sub) label(ctx, sub, R.W / 2, y + 18 * k, 10 * k, '#d8c8d0', 'center', 4, 600); ctx.restore();
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
