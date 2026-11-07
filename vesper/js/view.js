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
  R.drawWeather = function (ctx, st, cam, t) {
    const L = st.look, W = R.W, H = R.H, d = R.dpr;
    const n = L.snow || L.ash ? 70 : L.embers ? 40 : L.wind ? 34 : 0;
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
  R.Sh = () => R.H / 250;
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
  // The platform in ground coordinates, rendered once per stage at screen resolution.
  function platform(st) {
    const key = 'plat' + st.id; if (cache[key]) return cache[key];
    const L = st.look, Rr = D.ARENA.r, E = Rr + 90, res = Math.min(2048 / (E * 2), R.Sh()), size = Math.ceil(E * 2 * res);
    const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
    g.translate(size / 2, size / 2); g.scale(res, res);
    const stone = mix(L.sky[2], '#000000', 0.6), deep = mix(L.sky[0], '#000000', 0.5);
    // The apron: blocks of stone out to the edge, which falls away into the night.
    let gr = g.createRadialGradient(0, 0, Rr, 0, 0, E); gr.addColorStop(0, mix(stone, '#000000', 0.25)); gr.addColorStop(0.8, rgba(mix(deep, '#000000', 0.2), 0.95)); gr.addColorStop(1, rgba(deep, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, E, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 1.2;
    for (const rr of [Rr + 26, Rr + 58]) { g.beginPath(); g.arc(0, 0, rr, 0, 7); g.stroke(); }
    for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2 + (i % 2) * 0.04; g.beginPath(); g.moveTo(Math.cos(a) * (Rr + 4), Math.sin(a) * (Rr + 4)); g.lineTo(Math.cos(a) * (Rr + (i % 2 ? 58 : 26)), Math.sin(a) * (Rr + (i % 2 ? 58 : 26))); g.stroke(); }
    // The ring floor, glossy and lighter at the centre.
    gr = g.createRadialGradient(0, -Rr * 0.2, 0, 0, 0, Rr); gr.addColorStop(0, mix(stone, '#ffffff', 0.05)); gr.addColorStop(1, mix(stone, '#000000', 0.3));
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, Rr, 0, 7); g.fill();
    // The moon in the floor.
    const mx = Rr * 0.22, my = -Rr * 0.42;
    gr = g.createRadialGradient(mx, my, 0, mx, my, Rr * 0.7); gr.addColorStop(0, rgba(L.moonCol, 0.3)); gr.addColorStop(0.35, rgba(L.moonCol, 0.12)); gr.addColorStop(1, rgba(L.moonCol, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, Rr, 0, 7); g.fill();
    // Engraved rings, seams and a crescent at the centre.
    g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 1;
    for (const f of [0.34, 0.68]) { g.beginPath(); g.arc(0, 0, Rr * f, 0, 7); g.stroke(); }
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; g.beginPath(); g.moveTo(Math.cos(a) * Rr * 0.34, Math.sin(a) * Rr * 0.34); g.lineTo(Math.cos(a) * Rr * 0.985, Math.sin(a) * Rr * 0.985); g.stroke(); }
    g.strokeStyle = rgba(L.moonCol, 0.22); g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, Rr * 0.2, 0, 7); g.stroke();
    g.strokeStyle = rgba(L.moonCol, 0.12); g.beginPath(); g.arc(0, 0, Rr * 0.12, 0, 7); g.stroke();
    // The rim: a line of red light.
    g.strokeStyle = rgba(L.moonCol, 0.14); g.lineWidth = 9; g.beginPath(); g.arc(0, 0, Rr, 0, 7); g.stroke();
    g.strokeStyle = rgba(L.moonCol, 0.7); g.lineWidth = 2; g.beginPath(); g.arc(0, 0, Rr, 0, 7); g.stroke();
    // Project it once: the camera angle never changes, only its position, so each frame is a plain
    // copy of this image (a transformed draw of the big texture every frame was far too slow).
    const Sh = R.Sh(), pw = Math.ceil(E * 2 * Sh) + 4, ph = Math.ceil(E * 2 * Sh * HELI.pitch) + 4;
    const out = document.createElement('canvas'); out.width = pw; out.height = ph; const o = out.getContext('2d');
    o.imageSmoothingEnabled = true; o.setTransform(Sh * hc, Sh * HELI.pitch * hs, -Sh * hs, Sh * HELI.pitch * hc, pw / 2, ph / 2);
    o.drawImage(c, -E, -E, E * 2, E * 2);
    return (cache[key] = { c: out, E, pw, ph });
  }
  // Props around the ring, drawn upright and sorted with the fighters.
  const PROPS = {
    gate: ['pillar', 'pillar', 'brazier', 'tree', 'pillar', 'brazier'], cloister: ['crystal', 'crystal', 'pillar', 'crystal', 'pine', 'crystal'],
    stair: ['broken', 'pillar', 'brazier', 'broken', 'pillar', 'brazier'], waste: ['rock', 'tree', 'rock', 'tree', 'rock', 'tree'],
    throat: ['needle', 'rock', 'needle', 'needle', 'rock', 'needle'], shadow: ['broken', 'brazier', 'broken', 'pillar', 'brazier', 'broken'],
  };
  function propsOf(st) {
    const key = 'props' + st.id; if (cache[key]) return cache[key];
    const list = PROPS[st.id] || PROPS.gate, out = [], Rr = D.ARENA.r;
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * Math.PI * 2 + hash(i, 41) * 0.25, rr = Rr + 26 + hash(i, 42) * 30;
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr, ry = x * hs + y * hc;
      if (ry > Rr * 0.45) continue;   // keep the near side clear: nothing stands between the camera and the fight
      out.push({ kind: list[i % list.length], x, y, h: 0.8 + hash(i, 43) * 0.5, seed: i });
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
          const z = 22 * sc;
          FX({ kind: 'spark', x: e.x, y: e.y, z, life: 0.2, col: e.art ? RED : '#ffffff', r: e.heavy ? 26 : 18 });
          sparks(e.x, e.y, z, e.heavy ? 12 : 7, e.heavy ? '#ffd9a0' : '#ffffff', e.heavy ? 160 : 110);
          R.float(String(e.dmg), e.x, e.y, z + 14, e.art ? RED : e.heavy ? '#ffd9a0' : '#ffffff', e.heavy);
          R.shake = Math.max(R.shake, e.art ? 8 : e.heavy ? 3.5 : 1.6);
          break;
        }
        case 'hurt': sparks(e.x, e.y, 22, 9, RED, 130, 1.6); R.float(String(e.dmg), e.x, e.y, 38, '#ff5a6e', e.big); R.flash = 0.35; R.flashCol = '255,30,50'; R.shake = Math.max(R.shake, e.big ? 6 : 4); break;
        case 'parry': FX({ kind: 'ring', x: e.x, y: e.y, z: 22, life: 0.35, col: '#cfeeff', r0: 4, r1: 46, w: 3 }); FX({ kind: 'star', x: e.x, y: e.y, z: 22, life: 0.28, col: '#ffffff', r: 34 }); sparks(e.x, e.y, 22, 14, '#cfeeff', 200, 1.6); R.float('PARRY', e.x, e.y, 50, '#cfeeff', true, true); R.flash = 0.45; R.flashCol = '210,235,255'; R.shake = 5; break;
        case 'perfect': R.float('PERFECT', e.x, e.y, 56, '#8ef0ff', true, true); FX({ kind: 'gring', x: e.x, y: e.y, life: 0.5, col: '#8ef0ff', r0: 6, r1: 60, w: 2 }); break;
        case 'riposte': R.float('RIPOSTE', e.x, e.y, 64, '#ff9aa8', true, true); break;
        case 'break': { FX({ kind: 'ring', x: e.x, y: e.y, z: 24 * sc, life: 0.45, col: '#ffd060', r0: 6, r1: 60, w: 3 }); for (let i = 0; i < 14; i++) { const a = Math.random() * Math.PI * 2, v = 90 + Math.random() * 120; P({ x: e.x, y: e.y, z: 24 * sc, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6, vz: 60 + Math.random() * 80, g: -380, life: 0.6, size: 3, col: '#ffd060', shape: 'tri', rot: Math.random() * 6 }); } R.float('BREAK', e.x, e.y, 56 * sc, '#ffd060', true, true); R.shake = 7; break; }
        case 'kill': {
          const col = (u && u.def.color) || '#ffffff';
          for (let i = 0; i < (e.boss ? 60 : 22); i++) P({ x: e.x + (Math.random() - 0.5) * 16 * sc, y: e.y + (Math.random() - 0.5) * 8 * sc, z: Math.random() * 36 * sc, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 16, vz: 20 + Math.random() * 60, g: 10, life: 0.7 + Math.random() * 0.6, size: 1.5 + Math.random() * 1.5, col, shape: 'sq' });
          if (e.boss) { R.flash = 0.9; R.flashCol = '255,255,255'; R.shake = 12; }
          break;
        }
        case 'blink': FX({ kind: 'ring', x: e.x, y: e.y, z: 20, life: 0.3, col: '#c070ff', r0: 40, r1: 2, w: 2 }); sparks(e.x, e.y, 20, 10, '#c070ff', 90); break;
        case 'dodge': for (let i = 0; i < 6; i++) P({ x: e.x, y: e.y, z: 1, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 40, vz: Math.random() * 25, g: -40, life: 0.35, size: 2 + Math.random() * 2, col: 'rgba(200,190,200,0.35)', shape: 'circle' }); break;
        case 'boltHit': FX({ kind: 'ring', x: e.x, y: e.y, z: 16, life: 0.25, col: '#e0b0ff', r0: 3, r1: 22, w: 2 }); sparks(e.x, e.y, 16, 8, '#e0b0ff', 120); break;
        case 'slam': FX({ kind: 'gring', x: e.x, y: e.y, life: 0.45, col: '#ff6a5a', r0: e.r * 0.3, r1: e.r * 1.2, w: 3 }); for (let i = 0; i < 16; i++) { const a = Math.random() * Math.PI * 2; P({ x: e.x + Math.cos(a) * e.r * 0.6, y: e.y + Math.sin(a) * e.r * 0.6, z: 1, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, vz: 40 + Math.random() * 60, g: -200, life: 0.5, size: 2.5, col: 'rgba(160,140,140,0.8)', shape: 'sq' }); } R.shake = Math.max(R.shake, 6); break;
        case 'swing': { const h = s.hero, c = e.clip; FX({ kind: 'slash', x: h.x, y: h.y, ang: h.ang, life: 0.16, dir: c === 'Attack2' ? 1 : c === 'Attack1' ? 0 : 2, big: c === 'Attack3' || c === 'Attack6' || c === 'Attack4', long: c === 'Attack4' }); break; }
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
    const Sh = R.Sh(), sc = Sh * u.scale, q = R.P(u.x, u.y), x = Math.round(q.x), y = Math.round(q.y), sa = R.screenAng(u.ang);
    let alpha = 1;
    if (u.state === 'dead' && u.team === 'foe') alpha = Math.max(0, 1 - Math.max(0, u.deadT - 0.5) / 0.6);
    if (alpha <= 0) return;
    if (pass === 'reflect') { ctx.save(); ctx.translate(0, 2 * y); ctx.scale(1, -1); A.actor(ctx, u.set, u.clip, u.frame, sa, x, y, sc, { alpha: 0.11 * alpha }); ctx.restore(); return; }
    const sw = 26 * sc; ctx.globalAlpha = alpha; ctx.drawImage(shadowImg(), x - sw / 2, y - sw * 0.12, sw, sw * 0.25); ctx.globalAlpha = 1;
    R.glowAt(ctx, u.team === 'hero' ? RED : '#c8c0e0', x, y - 22 * sc, 34 * sc, u.team === 'hero' ? 0.16 : 0.07);
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

  R.follow = function (s, dt) {
    const h = s.hero, f = VS.sim.foes(s).sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y))[0];
    let tx = h.x, ty = h.y;
    if (f && Math.hypot(f.x - h.x, f.y - h.y) < 180) { tx = h.x * 0.65 + f.x * 0.35; ty = h.y * 0.65 + f.y * 0.35; }
    const lim = D.ARENA.r * 0.45, d = Math.hypot(tx, ty); if (d > lim) { tx *= lim / d; ty *= lim / d; }
    const k = Math.min(1, dt * 4); R.hcam.x += (tx - R.hcam.x) * k; R.hcam.y += (ty - R.hcam.y) * k;
  };
  R.snapCam = function (s) { R.hcam.x = s.hero.x * 0.6; R.hcam.y = s.hero.y * 0.6; };
  R.drawFight = function (ctx, s, dt) {
    const st = s.def;
    R.follow(s, dt);
    // The sky and the moon behind the platform, drifting a little with the camera.
    const sky = heliSky(st); ctx.drawImage(sky, -40 - Math.round(R.hcam.x * 0.06 * R.dpr), 0);
    // The platform.
    const pl = platform(st), o = R.P(0, 0);
    ctx.drawImage(pl.c, Math.round(o.x - pl.pw / 2), Math.round(o.y - pl.ph / 2));
    telegraphs(ctx, s);
    // Reflections in the glossy floor, then everything upright sorted by depth.
    const units = s.units.slice();
    for (const u of units) if (Math.hypot(u.x, u.y) < D.ARENA.r) drawUnit(ctx, s, u, 'reflect');
    const items = units.map((u) => ({ d: R.P(u.x, u.y).d, u })).concat(propsOf(st).map((p) => ({ d: R.P(p.x, p.y).d, p })));
    items.sort((a, b) => a.d - b.d);
    for (const it of items) { if (it.u) drawUnit(ctx, s, it.u); else drawProp(ctx, st, it.p); }
    // Bolts: a glowing orb with a tail.
    for (const b of s.bolts) {
      const q = R.P(b.x, b.y, 16), t = R.P(b.x - b.vx * 0.12, b.y - b.vy * 0.12, 16), col = b.reflected ? '#ffffff' : b.fx === 'wind_gust' ? '#dfe8ff' : b.fx === 'dark_slash' ? RED : '#c070ff';
      ctx.save(); ctx.strokeStyle = rgba(col, 0.55); ctx.lineWidth = 4 * R.Sh() * 0.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(q.x, q.y); ctx.stroke(); ctx.restore();
      R.glowAt(ctx, col, q.x, q.y, 12 * R.Sh(), 0.9); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(q.x, q.y, 2.4 * R.Sh(), 0, 7); ctx.fill();
    }
    drawFx(ctx, dt);
    R.drawWeather(ctx, st, R.hcam.x * 0.5, R.t);
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
    R.shake = Math.max(0, R.shake - dt * 22);
  };
  function vignette(ctx, a) {
    if (!cache.vig) {
      const c = cache.vig = document.createElement('canvas'); c.width = R.W; c.height = R.H; const g = c.getContext('2d');
      const gr = g.createRadialGradient(R.W / 2, R.H / 2, R.H * 0.38, R.W / 2, R.H / 2, R.W * 0.62); gr.addColorStop(0, 'rgba(210,10,35,0)'); gr.addColorStop(1, 'rgba(210,10,35,1)');
      g.fillStyle = gr; g.fillRect(0, 0, R.W, R.H);
    }
    const ga = ctx.globalAlpha; ctx.globalAlpha = a; ctx.drawImage(cache.vig, 0, 0); ctx.globalAlpha = ga;
  }
  // Where a unit's head is on screen (for lines spoken in a fight).
  R.headOf = (u) => { const q = R.P(u.x, u.y, 50 * u.scale); return { x: q.x, y: q.y }; };

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
    if (!bosses.length && s.wave >= 0 && s.wave < s.waves.length - 1) label(ctx, `WAVE ${s.wave + 1} / ${s.waves.length - 1}`, W - m - (opts.touch ? 44 * k : 0), m + 12 * k, 11 * k, '#c8b8c0', 'right', 3);
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
        { id: 'parry', x: W - m - 136 * k, y: H - m - 110 * k, r: 28 * k }, { id: 'art', x: W - m - 48 * k, y: H - m - 150 * k, r: 28 * k },
        { id: 'pause', x: W - m - 18 * k, y: m + 18 * k, r: 18 * k }] };
  };
  function icon(ctx, id, x, y, r, col) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = Math.max(2, r * 0.11); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const q = r * 0.45;
    if (id === 'atk') { ctx.rotate(-Math.PI / 4); ctx.beginPath(); ctx.moveTo(0, q * 1.1); ctx.lineTo(0, -q * 1.25); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-q * 0.45, q * 0.55); ctx.lineTo(q * 0.45, q * 0.55); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, q * 0.55); ctx.lineTo(0, q * 1.1); ctx.lineWidth *= 1.6; ctx.stroke(); }
    else if (id === 'dodge') { for (const o of [-0.35, 0.3]) { ctx.beginPath(); ctx.moveTo((o - 0.25) * q * 1.6, -q * 0.7); ctx.lineTo((o + 0.25) * q * 1.6, 0); ctx.lineTo((o - 0.25) * q * 1.6, q * 0.7); ctx.stroke(); } }
    else if (id === 'parry') { ctx.beginPath(); ctx.moveTo(0, -q); ctx.lineTo(q * 0.85, -q * 0.6); ctx.lineTo(q * 0.75, q * 0.25); ctx.quadraticCurveTo(q * 0.4, q * 0.85, 0, q * 1.05); ctx.quadraticCurveTo(-q * 0.4, q * 0.85, -q * 0.75, q * 0.25); ctx.lineTo(-q * 0.85, -q * 0.6); ctx.closePath(); ctx.stroke(); }
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
  R.banner = function (ctx, text, t, col) {
    const k = R.k, a = Math.min(1, t * 4, (1.6 - t) * 3); if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; const y = R.H * 0.3, lw = (60 + 80 * Math.min(1, t * 3)) * k;
    ctx.fillStyle = rgba(col === RED ? '#ff2a44' : '#ffffff', 0.5); ctx.fillRect(R.W / 2 - lw - 120 * k, y - 6 * k, lw, Math.max(1, R.dpr)); ctx.fillRect(R.W / 2 + 120 * k, y - 6 * k, lw, Math.max(1, R.dpr));
    label(ctx, text, R.W / 2, y, 22 * k, col, 'center', 6, 700); ctx.restore();
  };
  R.hint = function (ctx, text, a) { ctx.save(); ctx.globalAlpha = a; label(ctx, text, R.W / 2, R.H * 0.2, 11 * R.k, '#d8c8d0', 'center', 2, 500); ctx.restore(); };

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
