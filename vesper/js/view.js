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
    const mid = document.createElement('canvas'); mid.width = Math.ceil(W + D.ARENA.w * S * 0.38 + 40); mid.height = BAND;
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

  // ---- effects ------------------------------------------------------------------------------------
  const P = (o) => R.parts.push(Object.assign({ t: 0, vx: 0, vy: 0, g: 0, size: 2, col: '#fff', shape: 'sq', life: 0.4 }, o));
  const FX = (o) => R.fx.push(Object.assign({ t: 0 }, o));
  R.float = function (text, x, y, col, big, label) { R.floaters.push({ text, x, y, t: 0, col, big, label }); };
  function sparks(x, y, n, col, speed, size) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random()); P({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0, life: 0.18 + Math.random() * 0.15, size: size || 1.2, col, shape: 'line' }); }
  }
  R.consume = function (s) {
    const yOf = (u, up) => (u ? u.y * 0.6 - up * u.scale : -up);
    for (const e of s.events) {
      const u = e.id != null ? s.units.find((o) => o.id === e.id) : null;
      switch (e.type) {
        case 'hit': {
          const y = yOf(u, 22);
          FX({ kind: 'spark', x: e.x, y, life: 0.2, col: e.art ? RED : '#ffffff', r: e.heavy ? 26 : 18 });
          sparks(e.x, y, e.heavy ? 12 : 7, e.heavy ? '#ffd9a0' : '#ffffff', e.heavy ? 160 : 110);
          R.float(String(e.dmg), e.x, y - 12, e.art ? RED : e.heavy ? '#ffd9a0' : '#ffffff', e.heavy);
          R.shake = Math.max(R.shake, e.art ? 8 : e.heavy ? 3.5 : 1.6); if (e.heavy) R.punch = Math.max(R.punch, 0.02);
          break;
        }
        case 'hurt': { const y = yOf(u, 22); sparks(e.x, y, 9, RED, 130, 1.6); R.float(String(e.dmg), e.x, y - 14, '#ff5a6e', e.big); R.flash = 0.35; R.flashCol = '255,30,50'; R.shake = Math.max(R.shake, e.big ? 6 : 4); break; }
        case 'parry': { const y = (e.y || 0) * 0.6 - 22; FX({ kind: 'ring', x: e.x, y, life: 0.35, col: '#cfeeff', r0: 4, r1: 46, w: 3 }); FX({ kind: 'star', x: e.x, y, life: 0.28, col: '#ffffff', r: 34 }); sparks(e.x, y, 14, '#cfeeff', 200, 1.6); R.float('PARRY', e.x, y - 24, '#cfeeff', true, true); R.flash = 0.45; R.flashCol = '210,235,255'; R.shake = 5; R.punch = 0.05; break; }
        case 'perfect': R.float('PERFECT', e.x, -50, '#8ef0ff', true, true); FX({ kind: 'ring', x: e.x, y: -20, life: 0.5, col: '#8ef0ff', r0: 10, r1: 70, w: 2 }); break;
        case 'riposte': R.float('RIPOSTE', e.x, -58, '#ff9aa8', true, true); break;
        case 'break': { const y = yOf(u, 24); FX({ kind: 'ring', x: e.x, y, life: 0.45, col: '#ffd060', r0: 6, r1: 60, w: 3 }); for (let i = 0; i < 14; i++) { const a = Math.random() * Math.PI * 2, v = 90 + Math.random() * 120; P({ x: e.x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, g: 380, life: 0.6, size: 3, col: '#ffd060', shape: 'tri', rot: Math.random() * 6 }); } R.float('BREAK', e.x, y - 26, '#ffd060', true, true); R.shake = 7; R.punch = 0.04; break; }
        case 'kill': {
          const col = (u && u.def.color) || '#ffffff', y = yOf(u, 18);
          for (let i = 0; i < (e.boss ? 60 : 22); i++) P({ x: e.x + (Math.random() - 0.5) * 18 * (u ? u.scale : 1), y: y + (Math.random() - 0.5) * 30 * (u ? u.scale : 1), vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 60, g: -10, life: 0.7 + Math.random() * 0.6, size: 1.5 + Math.random() * 1.5, col, shape: 'sq' });
          if (e.boss) { R.flash = 0.9; R.flashCol = '255,255,255'; R.shake = 12; R.punch = 0.08; }
          break;
        }
        case 'blink': FX({ kind: 'ring', x: e.x, y: (e.y || 0) * 0.6 - 20, life: 0.3, col: '#c070ff', r0: 40, r1: 2, w: 2 }); sparks(e.x, -20, 10, '#c070ff', 90); break;
        case 'dodge': for (let i = 0; i < 6; i++) P({ x: e.x, y: 0, vx: (Math.random() - 0.5) * 60, vy: -Math.random() * 25, g: 40, life: 0.35, size: 2 + Math.random() * 2, col: 'rgba(200,190,200,0.35)', shape: 'circle' }); break;
        case 'boltHit': FX({ kind: 'ring', x: e.x, y: (e.y || 0) * 0.6 - 16, life: 0.25, col: '#e0b0ff', r0: 3, r1: 22, w: 2 }); sparks(e.x, -16, 8, '#e0b0ff', 120); break;
        case 'swing': { const h = s.hero, c = e.clip; FX({ kind: 'slash', x: h.x, y: h.y * 0.6, face: h.face, life: 0.16, dir: c === 'Attack2' ? 1 : c === 'Attack1' ? 0 : 2, big: c === 'Attack3' || c === 'Attack6' }); break; }
        case 'dashCut': { const h = s.hero; FX({ kind: 'slash', x: h.x, y: h.y * 0.6, face: h.face, life: 0.2, dir: 2, big: true, long: true }); break; }
        case 'phase': if (!e.quiet) { R.flash = 0.6; R.flashCol = '255,40,60'; R.shake = 8; } break;
        case 'artEnd': R.flash = 1; R.flashCol = '255,255,255'; R.shake = 12; break;
      }
    }
  };
  function drawFx(ctx, dt) {
    const S = R.S, F = R.floorY;
    R.fx = R.fx.filter((f) => {
      f.t += dt; const k = f.t / f.life; if (k >= 1) return false;
      const x = R.sx(f.x), y = F + f.y * S;
      ctx.save();
      if (f.kind === 'ring') { ctx.globalAlpha = 1 - k; ctx.strokeStyle = f.col; ctx.lineWidth = f.w * R.dpr * (1 - k * 0.5); ctx.beginPath(); ctx.arc(x, y, (f.r0 + (f.r1 - f.r0) * (1 - Math.pow(1 - k, 2))) * S * 0.5, 0, 7); ctx.stroke(); }
      else if (f.kind === 'spark') { ctx.globalAlpha = 1 - k; R.glowAt(ctx, f.col, x, y, f.r * S * 0.6 * (0.6 + k), 0.9); ctx.fillStyle = '#ffffff'; const r = f.r * S * 0.18 * (1 - k); ctx.beginPath(); ctx.moveTo(x - r * 3, y); ctx.lineTo(x, y - r * 0.4); ctx.lineTo(x + r * 3, y); ctx.lineTo(x, y + r * 0.4); ctx.fill(); ctx.beginPath(); ctx.moveTo(x, y - r * 3); ctx.lineTo(x + r * 0.4, y); ctx.lineTo(x, y + r * 3); ctx.lineTo(x - r * 0.4, y); ctx.fill(); }
      else if (f.kind === 'star') { ctx.globalAlpha = 1 - k; ctx.fillStyle = f.col; const r = f.r * S * 0.5 * (0.4 + k); ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * 0.18 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.fill(); }
      else if (f.kind === 'slash') {
        // A crescent of light in front of the blade, white at the core with a red rim.
        const big = f.big ? 1.3 : 1, r = (f.long ? 34 : 24) * big * S, cx = x + f.face * 8 * S, cy = F + (f.y - 20) * S;
        const span = f.dir === 2 ? [-0.9, 0.9] : f.dir === 0 ? [-1.9, 0.5] : [1.9, -0.5];
        let a0 = span[0], a1 = span[1]; if (f.face < 0) { a0 = Math.PI - a0; a1 = Math.PI - a1; }
        const prog = Math.min(1, k * 2.2), am = a0 + (a1 - a0) * prog, ccw = (a1 < a0);
        ctx.globalAlpha = (1 - k) * 0.95;
        ctx.beginPath(); ctx.arc(cx, cy, r, a0, am, ccw); ctx.arc(cx + f.face * r * 0.16, cy, r * 0.8, am, a0, !ccw); ctx.closePath();
        ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.strokeStyle = RED; ctx.lineWidth = 2 * R.dpr; ctx.beginPath(); ctx.arc(cx, cy, r + R.dpr, a0, am, ccw); ctx.stroke();
        if (f.long) { ctx.globalAlpha = (1 - k) * 0.6; ctx.fillStyle = '#ffffff'; ctx.fillRect(f.face > 0 ? cx - r * 2.2 : cx, cy - R.dpr, r * 2.2, 2 * R.dpr); }
      }
      ctx.restore(); return true;
    });
    R.parts = R.parts.filter((p) => {
      p.t += dt; if (p.t >= p.life) return false;
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      const k = p.t / p.life, x = R.sx(p.x), y = F + p.y * S, sz = p.size * R.dpr * (p.shape === 'sq' ? 1 : 1) * (1 - k * 0.5);
      ctx.globalAlpha = 1 - k; ctx.fillStyle = p.col; ctx.strokeStyle = p.col;
      if (p.shape === 'line') { ctx.lineWidth = sz; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - p.vx * 0.05 * S, y - p.vy * 0.05 * S); ctx.stroke(); }
      else if (p.shape === 'circle') { ctx.beginPath(); ctx.arc(x, y, sz * 2, 0, 7); ctx.fill(); }
      else if (p.shape === 'tri') { ctx.save(); ctx.translate(x, y); ctx.rotate((p.rot || 0) + p.t * 8); ctx.beginPath(); ctx.moveTo(0, -sz * 2); ctx.lineTo(sz * 1.6, sz * 1.4); ctx.lineTo(-sz * 1.6, sz * 1.4); ctx.fill(); ctx.restore(); }
      else ctx.fillRect(x - sz, y - sz, sz * 2, sz * 2);
      ctx.globalAlpha = 1; return true;
    });
  }

  // ---- fighters -------------------------------------------------------------------------------------
  const ang = (u) => (u.face > 0 ? 0 : Math.PI);
  function drawUnit(ctx, s, u, pass) {
    const S = R.S, sc = S * u.scale, x = Math.round(R.sx(u.x)), y = Math.round(R.sy(u.y));
    let alpha = 1;
    if (u.state === 'dead' && u.team === 'foe') alpha = Math.max(0, 1 - Math.max(0, u.deadT - 0.5) / 0.6);
    if (alpha <= 0) return;
    if (pass === 'reflect') {
      ctx.save(); ctx.translate(0, 2 * y); ctx.scale(1, -1);
      A.actor(ctx, u.set, u.clip, u.frame, ang(u), x, y, sc, { alpha: 0.13 * alpha });
      ctx.restore(); return;
    }
    const sh = shadowImg(), sw = 26 * sc; ctx.globalAlpha = alpha; ctx.drawImage(sh, x - sw / 2, y - sw * 0.12, sw, sw * 0.25); ctx.globalAlpha = 1;
    R.glowAt(ctx, u.team === 'hero' ? RED : '#c8c0e0', x, y - 22 * sc, 34 * sc, u.team === 'hero' ? 0.16 : 0.07);
    const winding = u.state === 'attack' && u.team === 'foe' && u.st < u.atk.wind * u.windMul;
    const opts = { alpha, flash: u.flash * 0.55 };
    if (winding && u.atk.unparry) { opts.flash = 0.3 + 0.25 * Math.sin(R.t * 30); opts.flashCol = '#ff2040'; }
    if (u.team === 'hero' && u.iframes > 0 && u.state !== 'dodge' && u.state !== 'hurt' && Math.floor(R.t * 20) % 2) opts.alpha = 0.55;
    if (u.state === 'dodge') for (let i = 1; i <= 4; i++) A.actor(ctx, u.set, u.clip, Math.max(0, u.frame - i * 2), ang(u), x - u.dodgeDir[0] * i * 10 * S, y, sc, { shade: RED, alpha: 0.32 - i * 0.07 });
    A.actor(ctx, u.set, u.clip, u.frame, ang(u), x, y, sc, opts);
    // The wind-up: a ring closing above the head; white can be parried, red must be dodged.
    if (winding) {
      const k = Math.min(1, u.st / (u.atk.wind * u.windMul)), hy = y - (48 * u.scale + 10) * S, col = u.atk.unparry ? RED : '#ffffff';
      ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2 * R.dpr; ctx.globalAlpha = 0.35 + 0.65 * k;
      ctx.beginPath(); ctx.arc(x, hy, (4 + 12 * (1 - k)) * S * 0.5, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, hy, 1.6 * R.dpr * (1 + k), 0, 7); ctx.fill();
      if (k > 0.75) { R.glowAt(ctx, col, x, hy, 14 * S * 0.5, 0.6); }
      ctx.restore();
    }
    if (u.state === 'parry' && u.st <= s.mods.parryWin) {
      ctx.save(); ctx.strokeStyle = '#cfeeff'; ctx.lineWidth = 2.5 * R.dpr; ctx.globalAlpha = 0.9;
      const cx = x + u.face * 6 * S, cy = y - 22 * S; ctx.beginPath(); ctx.arc(cx, cy, 15 * S, u.face > 0 ? -1.1 : Math.PI - 1.1, u.face > 0 ? 1.1 : Math.PI + 1.1); ctx.stroke();
      R.glowAt(ctx, '#cfeeff', cx + u.face * 12 * S, cy, 18 * S, 0.35); ctx.restore();
    }
  }

  R.follow = function (s, dt) {
    const h = s.hero, vw = R.viewW();
    const f = VS.sim.foes(s).sort((a, b) => Math.abs(a.x - h.x) - Math.abs(b.x - h.x))[0];
    let want = h.x - vw / 2 + h.face * 18; if (f && Math.abs(f.x - h.x) < vw * 0.7) want = (h.x + f.x) / 2 - vw / 2;
    want = vw >= D.ARENA.w ? (D.ARENA.w - vw) / 2 : clamp(want, 0, D.ARENA.w - vw);
    R.cam += (want - R.cam) * Math.min(1, dt * 4.5);
  };
  R.drawFight = function (ctx, s, dt) {
    const h = s.hero;
    R.follow(s, dt);
    ctx.save();
    if (R.punch > 0) { const z = 1 + R.punch, hx = R.sx(h.x), hy = R.floorY - 20 * R.S; ctx.translate(hx, hy); ctx.scale(z, z); ctx.translate(-hx, -hy); R.punch = Math.max(0, R.punch - dt * 0.4); }
    R.drawArena(ctx, s.def, R.cam);
    const list = s.units.slice().sort((a, b) => a.y - b.y);
    for (const u of list) drawUnit(ctx, s, u, 'reflect');
    for (const u of list) drawUnit(ctx, s, u);
    // Bolts: a glowing orb with a tail.
    for (const b of s.bolts) {
      if (b.delay > 0) continue;
      const x = R.sx(b.x), y = R.sy(b.y) - 16 * R.S, col = b.reflected ? '#ffffff' : b.fx === 'wind_gust' ? '#dfe8ff' : b.fx === 'dark_slash' ? RED : '#c070ff';
      const tg = ctx.createLinearGradient(x - Math.sign(b.vx) * 30 * R.S, 0, x, 0); tg.addColorStop(0, rgba(col, 0)); tg.addColorStop(1, rgba(col, 0.7));
      ctx.fillStyle = tg; ctx.fillRect(Math.min(x, x - Math.sign(b.vx) * 30 * R.S), y - 2 * R.S, 30 * R.S, 4 * R.S);
      R.glowAt(ctx, col, x, y, 12 * R.S, 0.9); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, 2.4 * R.S, 0, 7); ctx.fill();
    }
    drawFx(ctx, dt);
    R.drawWeather(ctx, s.def, R.cam, R.t);
    ctx.restore();
    // Floaters.
    R.floaters = R.floaters.filter((fl) => {
      fl.t += dt; const k = fl.t / (fl.label ? 1.0 : 0.8); if (k >= 1) return false;
      const pop = fl.t < 0.08 ? 1.5 - fl.t / 0.08 * 0.5 : 1, size = (fl.label ? 15 : fl.big ? 20 : 14) * R.k * pop;
      const x = R.sx(fl.x), y = R.floorY + (fl.y - k * 14) * R.S;
      ctx.save(); ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      ctx.font = R.fd(size, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.lineWidth = 4 * R.dpr; ctx.strokeStyle = 'rgba(8,4,10,0.85)'; ctx.strokeText(fl.text, x, y); ctx.fillStyle = fl.col; ctx.fillText(fl.text, x, y);
      ctx.restore(); return true;
    });
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

  // ---- the cinematic over the game ----------------------------------------------------------------
  // The cinematic has its own canvas over the game: the 180 px pixel buffer, stretched to the screen
  // by CSS with pixelated sampling (the browser's compositor does the enlargement).
  R.drawCine = function (ctx, s) {
    const h = s.hero, c = PX.ctx, el = PX.buf;
    if (!el.parentNode) {
      el.id = 'cine'; Object.assign(el.style, { position: 'fixed', left: '0', top: '0', width: '100%', height: '100%', imageRendering: 'pixelated', zIndex: '4', pointerEvents: 'none', display: 'none' });
      document.body.appendChild(el);
    }
    PX.fit(R.W / R.H);
    PX.heroAt = { x: R.sx(h.x) / R.W * PX.W, y: R.sy(h.y) / R.H * PX.H, k: R.S * h.scale * PX.H / R.H };
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, PX.W, PX.H); c.globalAlpha = 1; c.imageSmoothingEnabled = false;
    VS.cine.draw(c, s);
    if (el.style.display !== 'block') el.style.display = 'block';
    if (PX.shake > 0) { R.shake = Math.max(R.shake, PX.shake * 1.5); PX.shake = 0; }
    el.style.transform = R.canvas.style.transform;
  };
  R.hideCine = function () { if (PX.buf.parentNode && PX.buf.style.display !== 'none') PX.buf.style.display = 'none'; };
  // Opaque beats cover the whole screen, so the game under them need not be drawn.
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
    const kx = st.stick ? st.stick.dx * L.stick.r * 0.6 : 0;
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.beginPath(); ctx.arc(L.stick.x + kx, L.stick.y, L.stick.r * 0.42, 0, 7); ctx.fill();
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
    R.cam = cam; R.drawArena(ctx, st, cam); R.drawWeather(ctx, st, cam, R.t); drawFx(ctx, dt || 0);
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
