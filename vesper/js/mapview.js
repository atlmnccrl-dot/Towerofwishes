// VESPER — the campaign map: the Spire, climbed act by act from the bottom of the screen to the
// moon at the top. Each act is a band in its hour's colours, divided from the next by a bank of
// cloud; nodes sit on its ledges joined by paths that light up as you clear them. Guardians stand
// at their nodes, your hero stands where you last fought. Drag or scroll to climb; click a node.
(function () {
  const VS = window.VS, D = VS.DATA, A = VS.A, R = VS.R, P = VS.PROG;
  const MAP = VS.MAP = { camY: 0, target: 0, sel: null, hover: null, drag: null, t: 0 };
  const AH = 760, BOTTOM = 160, TOP = 520, XS = 380, RED = '#ff2a44';
  const ease = (k) => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3);
  const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const ECHO_LOOK = { sky: ['#120e1c', '#2e2238', '#5a3e52'], moonCol: '#f4f0ec', fog: '#2e2234' };
  const lookOf = (a) => (P.ACTS[a].echoes ? ECHO_LOOK : D.STAGES[P.ACTS[a].stage].look);
  const TOTAL = BOTTOM + P.ACTS.length * AH + TOP;
  const wyOf = (n) => BOTTOM + n.act * AH + n.y * AH;

  // ---- layout on screen -----------------------------------------------------------------------
  // The map fills the space left of the details panel; k is device px per map unit.
  MAP.panelW = () => Math.min(380, window.innerWidth * 0.38) * R.dpr;
  function frame() {
    const pw = MAP.panelW(), aw = R.W - pw, k = Math.min(aw / (XS * 2 + 260), R.H / 720);
    return { k, cx: aw / 2, cy: R.H * 0.55 };
  }
  MAP.toScreen = (wx, wy, F) => { F = F || frame(); return { x: F.cx + wx * F.k, y: F.cy - (wy - MAP.camY) * F.k }; };
  const nodePos = (n, F) => MAP.toScreen(n.x * XS, wyOf(n), F);
  const radius = (n, F) => F.k * ({ boss: 34, echo: 30, shrine: 19, trial: 22 }[n.type] || 23);
  MAP.focus = function (id, snap) { const n = P.node(id); if (!n) return; MAP.target = clampCam(wyOf(n) + 120); if (snap) MAP.camY = MAP.target; };
  function clampCam(y) { const F = frame(), half = R.H / F.k / 2; return Math.max(half * 0.8, Math.min(TOTAL - half * 0.6, y)); }

  // ---- input ------------------------------------------------------------------------------------
  MAP.down = (x, y) => { MAP.drag = { x, y, y0: MAP.target, moved: false }; };
  MAP.move = (x, y) => {
    MAP.mouse = { x, y };
    if (MAP.drag) { const F = frame(), dy = y - MAP.drag.y; if (Math.abs(dy) > 6 * R.dpr) MAP.drag.moved = true; if (MAP.drag.moved) { MAP.target = clampCam(MAP.drag.y0 + dy / F.k); MAP.camY = MAP.target; } }
    MAP.hover = hit(x, y);
  };
  MAP.up = (x, y) => { const d = MAP.drag; MAP.drag = null; if (d && !d.moved) { const id = hit(x, y); if (id && MAP.onSelect) MAP.onSelect(id); } };
  MAP.wheel = (dy) => { MAP.target = clampCam(MAP.target - dy * 0.9 / frame().k * R.dpr); };
  function hit(x, y) {
    const F = frame(); let best = null, bd = 1e9;
    for (const n of P.NODES) { const q = nodePos(n, F), r = radius(n, F) * 1.35, d = Math.hypot(q.x - x, q.y - y); if (d < r && d < bd) { bd = d; best = n.id; } }
    return best;
  }

  // ---- pieces --------------------------------------------------------------------------------------
  let starC = null, starKey = '';
  function stars() {
    const key = R.W + 'x' + R.H; if (starC && starKey === key) return starC;
    starC = document.createElement('canvas'); starC.width = R.W; starC.height = R.H * 2; starKey = key; const g = starC.getContext('2d');
    for (let i = 0; i < 260; i++) { const a = 0.2 + hash(i, 3) * 0.7; g.fillStyle = `rgba(255,240,244,${a})`; const r = (hash(i, 4) < 0.92 ? 0.7 : 1.5) * R.dpr; g.beginPath(); g.arc(hash(i, 1) * R.W, hash(i, 2) * R.H * 2, r, 0, 7); g.fill(); }
    return starC;
  }
  // The colour of the sky at a height: the acts' palettes blended across the cloud banks.
  function skyAt(wy) {
    const f = (wy - BOTTOM) / AH, a = Math.max(0, Math.min(P.ACTS.length - 1, Math.floor(f))), b = Math.min(P.ACTS.length - 1, a + 1), m = Math.max(0, Math.min(1, (f - a - 0.8) / 0.4));
    const L1 = lookOf(a), L2 = lookOf(b);
    return [0, 1, 2].map((i) => R.mix(L1.sky[i], L2.sky[i], m));
  }
  function spireW(wy) { return 300 - 230 * Math.min(1, wy / (TOTAL - TOP * 0.4)); }
  function drawSpire(ctx, F) {
    const top = TOTAL - TOP * 0.55, y0 = MAP.camY - R.H / F.k, y1 = MAP.camY + R.H / F.k;
    // Body: a tapering tower, darker at its edges, with a lit seam up the middle.
    ctx.save();
    const steps = 40; ctx.beginPath();
    for (let i = 0; i <= steps; i++) { const wy = y0 + (Math.min(y1, top) - y0) * i / steps, q = MAP.toScreen(-spireW(wy), wy, F); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }
    for (let i = steps; i >= 0; i--) { const wy = y0 + (Math.min(y1, top) - y0) * i / steps, q = MAP.toScreen(spireW(wy), wy, F); ctx.lineTo(q.x, q.y); }
    if (y1 > top) { const q = MAP.toScreen(0, top + 120, F); ctx.lineTo(q.x, q.y); }
    ctx.closePath();
    const g = ctx.createLinearGradient(F.cx - 300 * F.k, 0, F.cx + 300 * F.k, 0); g.addColorStop(0, 'rgba(4,2,6,0.95)'); g.addColorStop(0.5, 'rgba(18,10,20,0.92)'); g.addColorStop(1, 'rgba(4,2,6,0.95)');
    ctx.fillStyle = g; ctx.fill(); ctx.clip();
    // Courses of stone and lit windows.
    ctx.strokeStyle = 'rgba(255,255,255,0.035)'; ctx.lineWidth = R.dpr;
    for (let wy = Math.floor(y0 / 40) * 40; wy < Math.min(y1, top); wy += 40) { const a = MAP.toScreen(-400, wy, F), b = MAP.toScreen(400, wy, F); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    for (let i = 0; i < 160; i++) {
      const wy = BOTTOM * 0.5 + i * (TOTAL - TOP) / 160; if (wy < y0 - 50 || wy > y1 + 50) continue;
      const w = spireW(wy), wx = (hash(i, 7) - 0.5) * w * 1.5, q = MAP.toScreen(wx, wy, F), act = Math.max(0, Math.min(P.ACTS.length - 1, Math.floor((wy - BOTTOM) / AH))), col = lookOf(act).moonCol;
      const flick = 0.55 + 0.45 * Math.sin(MAP.t * (1 + hash(i, 9) * 2) + i);
      ctx.fillStyle = R.rgba(col, 0.35 * flick); ctx.fillRect(q.x - 2 * F.k, q.y - 7 * F.k, 4 * F.k, 9 * F.k);
    }
    const seam = ctx.createLinearGradient(F.cx - 8 * F.k, 0, F.cx + 8 * F.k, 0); seam.addColorStop(0, 'rgba(255,42,68,0)'); seam.addColorStop(0.5, 'rgba(255,42,68,0.08)'); seam.addColorStop(1, 'rgba(255,42,68,0)');
    ctx.fillStyle = seam; ctx.fillRect(F.cx - 8 * F.k, 0, 16 * F.k, R.H);
    ctx.restore();
  }
  function drawMoon(ctx, F) {
    const wy = TOTAL - TOP * 0.25, q = MAP.toScreen(0, wy, F), r = 120 * F.k; if (q.y < -r * 4 || q.y > R.H + r * 3) return;
    const done = P.cleared(MAP.p, 'a5-b'), col = done ? '#f4f0ec' : RED;
    A.tex(ctx, 'light_01', q.x, q.y, r * 7, r * 7, col, 0.35, 0, true);
    const m = ctx.createLinearGradient(q.x - r, q.y - r, q.x + r, q.y + r); m.addColorStop(0, R.mix(col, '#ffffff', 0.3)); m.addColorStop(1, R.mix(col, '#000000', 0.2));
    ctx.fillStyle = m; ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, 7); ctx.fill();
    if (!done) { ctx.strokeStyle = 'rgba(60,0,10,0.9)'; ctx.lineWidth = 4 * F.k; ctx.beginPath(); ctx.moveTo(q.x - r * 0.95, q.y + r * 0.35); ctx.lineTo(q.x + r * 0.95, q.y - r * 0.35); ctx.stroke(); }
    R.label(ctx, done ? 'THE MOON IS WHOLE' : 'THE WOUND', q.x, q.y + r + 30 * F.k, 13 * F.k, done ? '#f4f0ec' : '#ff8a9a', 'center', 6, 700);
  }
  function drawBands(ctx, F) {
    for (let a = 0; a < P.ACTS.length; a++) {
      const L = lookOf(a), y0 = BOTTOM + a * AH, q0 = MAP.toScreen(0, y0, F), q1 = MAP.toScreen(0, y0 + AH, F);
      if (q0.y < -50 || q1.y > R.H + 50) continue;
      // A wash of the act's fog colour over its band.
      const g = ctx.createLinearGradient(0, q1.y, 0, q0.y); g.addColorStop(0, R.rgba(L.fog, 0)); g.addColorStop(0.5, R.rgba(L.fog, 0.28)); g.addColorStop(1, R.rgba(L.fog, 0));
      ctx.fillStyle = g; ctx.fillRect(0, q1.y, R.W, q0.y - q1.y);
    }
  }
  function drawClouds(ctx, F) {
    for (let a = 1; a <= P.ACTS.length; a++) {
      const wy = BOTTOM + a * AH - 10, q = MAP.toScreen(0, wy, F); if (q.y < -120 * F.k || q.y > R.H + 120 * F.k) continue;
      const L = lookOf(Math.min(P.ACTS.length - 1, a - 1));
      for (let i = 0; i < 9; i++) {
        const x = ((hash(a, i) * 1400 + MAP.t * (8 + 6 * hash(i, a))) % 1400) - 700, s = (150 + 90 * hash(i, a + 3)) * F.k;
        A.tex(ctx, i % 2 ? 'smoke_07' : 'smoke_04', F.cx + x * F.k, q.y + (hash(i, a + 9) - 0.5) * 40 * F.k, s * 1.8, s, R.mix(L.fog, '#ffffff', 0.12), 0.4, i, false);
      }
    }
  }
  function drawActTitles(ctx, F) {
    for (let a = 0; a < P.ACTS.length; a++) {
      const Ac = P.ACTS[a], L = lookOf(a), q = MAP.toScreen(-XS - 70, BOTTOM + a * AH + AH * 0.5, F); if (q.y < -200 || q.y > R.H + 200) continue;
      const open = P.actOpen(MAP.p, a), x = Math.max(20 * R.dpr, F.cx - (XS + 150) * F.k), qTop = MAP.toScreen(0, BOTTOM + (a + 1) * AH, F).y, qBot = MAP.toScreen(0, BOTTOM + a * AH, F).y;
      q.y = Math.max(q.y, Math.min(qBot - 120 * F.k, 130 * R.dpr), qTop + 60 * F.k); if (q.y > qBot - 60 * F.k) continue;
      ctx.save(); ctx.globalAlpha = open ? 1 : 0.5;
      R.label(ctx, 'ACT ' + Ac.num, x, q.y - 26 * F.k, 13 * F.k, L.moonCol, 'left', 6, 700);
      ctx.font = R.fd(28 * F.k, 700); ctx.textAlign = 'left'; ctx.fillStyle = '#f3eef0'; if ('letterSpacing' in ctx) ctx.letterSpacing = 2 * R.dpr + 'px';
      const words = Ac.name.toUpperCase().split(' '); let line = '', ly = q.y + 4 * F.k;
      for (const w of words) { if (ctx.measureText(line + ' ' + w).width > 190 * F.k && line) { ctx.fillText(line, x, ly); ly += 30 * F.k; line = w; } else line = line ? line + ' ' + w : w; }
      ctx.fillText(line, x, ly); if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      R.label(ctx, Ac.hour, x, ly + 20 * F.k, 11 * F.k, '#a99aa2', 'left', 4, 600);
      const nodes = P.NODES.filter((n) => n.act === a), done = nodes.filter((n) => P.cleared(MAP.p, n.id)).length, st = nodes.reduce((s, n) => s + P.starsOf(MAP.p, n.id), 0), mx = nodes.reduce((s, n) => s + P.goals(n).length, 0);
      R.label(ctx, `${done}/${nodes.length} CLEARED  ·  ★ ${st}/${mx}`, x, ly + 38 * F.k, 10 * F.k, open ? '#d8ccd2' : '#7a6a72', 'left', 2, 600);
      ctx.restore();
    }
  }
  // Paths: a curve from each node up to the ones it opens.
  function drawPaths(ctx, F) {
    for (const n of P.NODES) for (const m of n.next) {
      const N2 = P.node(m), a = nodePos(n, F), b = nodePos(N2, F); if (Math.max(a.y, b.y) < -40 || Math.min(a.y, b.y) > R.H + 40) continue;
      const sa = P.state(MAP.p, n.id), sb = P.state(MAP.p, m), my = (a.y + b.y) / 2;
      const path = new Path2D(); path.moveTo(a.x, a.y); path.bezierCurveTo(a.x, my, b.x, my, b.x, b.y);
      ctx.save(); ctx.lineCap = 'round';
      if (sa === 'cleared' && sb === 'cleared') { ctx.strokeStyle = 'rgba(255,208,96,0.25)'; ctx.lineWidth = 9 * F.k; ctx.stroke(path); ctx.strokeStyle = 'rgba(255,224,160,0.85)'; ctx.lineWidth = 2.5 * F.k; ctx.stroke(path); }
      else if (sa === 'cleared') { ctx.strokeStyle = 'rgba(255,42,68,0.25)'; ctx.lineWidth = 10 * F.k; ctx.stroke(path); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5 * F.k; ctx.setLineDash([10 * F.k, 8 * F.k]); ctx.lineDashOffset = -MAP.t * 30 * F.k; ctx.stroke(path); }
      else { ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2 * F.k; ctx.setLineDash([3 * F.k, 7 * F.k]); ctx.stroke(path); }
      ctx.restore();
    }
  }
  // Icons, drawn as clean shapes inside the medallion.
  function icon(ctx, type, x, y, r, col) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = Math.max(1.5, r * 0.11); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const s = r * 0.5;
    if (type === 'battle') { for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-s * sg, -s); ctx.lineTo(s * 0.7 * sg, s * 0.7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(s * 0.35 * sg, s * 0.9); ctx.lineTo(s * 0.95 * sg, s * 0.3); ctx.stroke(); } }
    else if (type === 'elite') { ctx.beginPath(); ctx.arc(0, -s * 0.1, s * 0.62, Math.PI * 0.95, Math.PI * 0.05, false); ctx.lineTo(s * 0.45, s * 0.75); ctx.lineTo(-s * 0.45, s * 0.75); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.arc(-s * 0.25, -s * 0.05, s * 0.13, 0, 7); ctx.arc(s * 0.25, -s * 0.05, s * 0.13, 0, 7); ctx.fill(); for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sg * s * 0.5, -s * 0.5); ctx.quadraticCurveTo(sg * s * 1.05, -s * 0.8, sg * s * 0.85, -s * 1.15); ctx.stroke(); } }
    else if (type === 'boss' || type === 'echo') { ctx.beginPath(); ctx.moveTo(-s, s * 0.55); ctx.lineTo(-s, -s * 0.45); ctx.lineTo(-s * 0.5, s * 0.05); ctx.lineTo(0, -s * 0.8); ctx.lineTo(s * 0.5, s * 0.05); ctx.lineTo(s, -s * 0.45); ctx.lineTo(s, s * 0.55); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-s, s * 0.8); ctx.lineTo(s, s * 0.8); ctx.stroke(); }
    else if (type === 'challenge') { ctx.beginPath(); ctx.moveTo(s * 0.2, -s); ctx.lineTo(-s * 0.45, s * 0.1); ctx.lineTo(s * 0.05, s * 0.1); ctx.lineTo(-s * 0.2, s); ctx.lineTo(s * 0.5, -s * 0.15); ctx.lineTo(0, -s * 0.15); ctx.closePath(); ctx.fill(); }
    else if (type === 'shrine') { ctx.beginPath(); ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * 0.8, -s * 0.1, s * 0.45, s * 0.55); ctx.quadraticCurveTo(0, s * 0.95, -s * 0.45, s * 0.55); ctx.quadraticCurveTo(-s * 0.8, -s * 0.1, 0, -s); ctx.fill(); }
    else if (type === 'trial') { ctx.beginPath(); ctx.arc(0, 0, s * 0.85, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, s * 0.4, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, s * 0.1, 0, 7); ctx.fill(); }
    else if (type === 'lock') { ctx.strokeRect(-s * 0.55, -s * 0.05, s * 1.1, s * 0.85); ctx.beginPath(); ctx.arc(0, -s * 0.05, s * 0.38, Math.PI, 0); ctx.stroke(); }
    ctx.restore();
  }
  function drawNodes(ctx, F) {
    for (const n of P.NODES) {
      const q = nodePos(n, F); if (q.y < -80 || q.y > R.H + 80) continue;
      const st = P.state(MAP.p, n.id), T = P.TYPES[n.type], sel = MAP.sel === n.id, hov = MAP.hover === n.id;
      const r = radius(n, F) * (sel ? 1.18 : hov ? 1.08 : 1), col = st === 'locked' ? '#4a3a44' : T.col;
      if (sel) A.tex(ctx, 'magic_02', q.x, q.y, r * 4.4, r * 4.4, st === 'locked' ? '#888888' : T.col, 0.8, MAP.t * 0.7, true);
      if (st === 'open') A.tex(ctx, 'light_01', q.x, q.y, r * (4.6 + 0.6 * Math.sin(MAP.t * 4)), r * (4.6 + 0.6 * Math.sin(MAP.t * 4)), T.col, 0.55, 0, true);
      if (st === 'cleared') A.tex(ctx, 'light_01', q.x, q.y, r * 3.4, r * 3.4, '#ffd060', 0.28, 0, true);
      // The medallion: a dark disc, a ring in the node's colour, a second ring when cleared.
      ctx.fillStyle = st === 'locked' ? 'rgba(10,6,10,0.92)' : 'rgba(14,8,14,0.96)'; ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, 7); ctx.fill();
      ctx.lineWidth = (st === 'open' ? 3 : 2) * F.k; ctx.strokeStyle = st === 'cleared' ? '#ffd060' : col; ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, 7); ctx.stroke();
      if (st === 'cleared') { ctx.lineWidth = 1 * F.k; ctx.strokeStyle = 'rgba(255,208,96,0.5)'; ctx.beginPath(); ctx.arc(q.x, q.y, r + 4 * F.k, 0, 7); ctx.stroke(); }
      if (n.type === 'boss' || n.type === 'echo') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(Math.PI / 4); ctx.strokeStyle = R.rgba(col, 0.7); ctx.lineWidth = 1.5 * F.k; ctx.strokeRect(-r * 1.08, -r * 1.08, r * 2.16, r * 2.16); ctx.restore(); }
      icon(ctx, st === 'locked' ? 'lock' : n.type, q.x, q.y, r, st === 'locked' ? '#6a5a64' : st === 'cleared' ? '#ffe0a0' : '#ffffff');
      // Stars under it, and its name when it is open, chosen or hovered.
      const goals = P.goals(n).length, got = P.starsOf(MAP.p, n.id);
      if (goals && st !== 'locked') for (let i = 0; i < goals; i++) star(ctx, q.x + (i - (goals - 1) / 2) * 13 * F.k, q.y + r + 11 * F.k, 5 * F.k, i < got);
      if (st !== 'locked' || sel || hov) R.label(ctx, n.name.toUpperCase(), q.x, q.y - r - 10 * F.k, (n.type === 'boss' ? 13 : 11) * F.k, st === 'locked' ? '#7a6a72' : st === 'open' ? '#ffffff' : '#e8dcc0', 'center', 2, 700);
      if (st === 'open' && !sel) R.label(ctx, n.type === 'shrine' ? 'CLAIM' : 'NEW', q.x + r * 0.9, q.y - r * 0.8, 9 * F.k, RED, 'left', 2, 700);
    }
  }
  function star(ctx, x, y, r, on) {
    ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath();
    ctx.fillStyle = on ? '#ffd060' : 'rgba(255,255,255,0.12)'; ctx.fill(); if (!on) { ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = R.dpr; ctx.stroke(); }
  }
  // Guardians stand beside their nodes: dark until reached, grey once beaten.
  function drawFigures(ctx, F) {
    const BK = { 'a0-b': 'warden', 'a1-b': 'twinB', 'a2-b': 'umbral', 'a3-b': 'nightHunger', 'a4-b': 'wing', 'a5-b': 'firstCut' };
    for (const n of P.NODES) {
      if (n.type !== 'boss' && !(n.type === 'echo')) continue;
      const key = n.type === 'echo' ? ({ warden: 'warden', twins: 'twinA', umbral: 'umbral', hunger: 'hunger', wing: 'wing', firstCut: 'firstCut' }[n.echo]) : (BK[n.id] === 'nightHunger' ? 'hunger' : BK[n.id]);
      const f = D.FOES[key]; if (!f) continue;
      const q = nodePos(n, F); if (q.y < -150 || q.y > R.H + 150) continue;
      const st = P.state(MAP.p, n.id), sc = F.k * 2.3 / Math.max(1, (f.scale || 1) * 0.8), x = q.x + radius(n, F) * 2.2, y = q.y + radius(n, F) * 0.9;
      ctx.save(); ctx.globalAlpha = st === 'cleared' ? 0.55 : 1;
      A.tex(ctx, 'light_01', x, y - 30 * sc, 90 * sc, 90 * sc, st === 'locked' ? '#000000' : f.color || RED, st === 'locked' ? 0 : 0.35, 0, true);
      A.actor(ctx, f.set, 'Idle4', Math.floor(MAP.t * 7 + n.act) % 15, Math.PI * 0.85, Math.round(x), Math.round(y), sc * (f.scale || 1), st === 'locked' ? { shade: '#05030a' } : st === 'cleared' ? { grey: true } : {});
      ctx.restore();
    }
    // Champions stand beside the elite fights they lead.
    MAP.champ = MAP.champ || {}; for (const n of P.NODES) if (n.type === 'elite') {
      const key = MAP.champ[n.id] || (MAP.champ[n.id] = P.build(n).champion), f = D.FOES[key]; if (!f || !A.hasSet(f.set)) continue;
      const q = nodePos(n, F); if (q.y < -150 || q.y > R.H + 150) continue;
      const st = P.state(MAP.p, n.id), sc = F.k * 1.7, x = q.x + radius(n, F) * 2.1 * (n.x > 0 ? -1 : 1), y = q.y + radius(n, F) * 0.9;
      ctx.save(); ctx.globalAlpha = st === 'cleared' ? 0.55 : 1;
      A.actor(ctx, f.set, 'Idle4', Math.floor(MAP.t * 7 + n.act * 3) % 15, n.x > 0 ? Math.PI * 0.15 : Math.PI * 0.85, Math.round(x), Math.round(y), sc, st === 'locked' ? { shade: '#05030a' } : st === 'cleared' ? { grey: true } : {});
      ctx.restore();
    }
    // Your hero, at the node you last fought (or the one you have chosen).
    const at = P.node(MAP.sel || MAP.p.last) || P.NODES[0], H = D.HEROES[MAP.p.hero] || D.HEROES.vesper, q = nodePos(at, F), x = q.x - radius(at, F) * 2.3, y = q.y + radius(at, F) * 0.8;
    A.tex(ctx, 'light_01', x, y - 26 * F.k, 70 * F.k, 70 * F.k, H.color, 0.35, 0, true);
    A.actor(ctx, H.set, 'Idle4', Math.floor(MAP.t * 8) % 15, Math.PI * 0.15, Math.round(x), Math.round(y), F.k * 2.4, {});
  }
  // Embers, snow or ash rising through the visible bands.
  function drawMotes(ctx, F) {
    for (let i = 0; i < 70; i++) {
      const wy = MAP.camY + ((hash(i, 5) * 1000 + MAP.t * (12 + 20 * hash(i, 6))) % 1000) - 500, wx = (hash(i, 7) - 0.5) * 1200 + Math.sin(MAP.t + i) * 14;
      const act = Math.max(0, Math.min(P.ACTS.length - 1, Math.floor((wy - BOTTOM) / AH))), L = lookOf(act), q = MAP.toScreen(wx, wy, F);
      ctx.fillStyle = R.rgba(act === 1 ? '#ffffff' : act === 3 ? '#a09a9a' : L.moonCol, 0.35 + 0.3 * hash(i, 8)); ctx.fillRect(q.x, q.y, 2 * F.k, 2 * F.k);
    }
  }
  function drawLocks(ctx, F) {
    for (let a = 0; a < P.ACTS.length; a++) {
      if (P.actOpen(MAP.p, a)) continue;
      const q0 = MAP.toScreen(0, BOTTOM + a * AH + 20, F), q1 = MAP.toScreen(0, BOTTOM + (a + 1) * AH - 20, F); if (q0.y < 0 || q1.y > R.H) { if (q0.y < 0 && q1.y < 0) continue; if (q0.y > R.H && q1.y > R.H) continue; }
      const g = ctx.createLinearGradient(0, q1.y, 0, q0.y); g.addColorStop(0, 'rgba(4,2,6,0.55)'); g.addColorStop(0.5, 'rgba(4,2,6,0.72)'); g.addColorStop(1, 'rgba(4,2,6,0.55)');
      ctx.fillStyle = g; ctx.fillRect(0, q1.y, R.W - MAP.panelW(), q0.y - q1.y);
      const prevBoss = P.NODES.find((n) => n.act === a - 1 && n.type === 'boss'), mid = (q0.y + q1.y) / 2;
      icon(ctx, 'lock', F.cx, mid - 30 * F.k, 40 * F.k, '#a99aa2');
      R.label(ctx, 'SEALED', F.cx, mid + 10 * F.k, 16 * F.k, '#d8ccd2', 'center', 8, 700);
      R.label(ctx, prevBoss ? 'DEFEAT ' + prevBoss.name.toUpperCase() + ' TO CLIMB HIGHER' : 'DEFEAT THE FIRST CUT TO HEAR THE ECHOES', F.cx, mid + 30 * F.k, 10 * F.k, '#a99aa2', 'center', 3, 600);
    }
  }

  // ---- frame ----------------------------------------------------------------------------------------
  MAP.open = function (p, sel) { MAP.p = p; MAP.sel = sel || null; MAP.focus(sel || P.nextNode(p), true); };
  MAP.draw = function (ctx, dt) {
    MAP.t += dt; MAP.camY += (MAP.target - MAP.camY) * Math.min(1, dt * 7);
    const F = frame(), sky = skyAt(MAP.camY), g = ctx.createLinearGradient(0, 0, 0, R.H);
    g.addColorStop(0, sky[0]); g.addColorStop(0.6, sky[1]); g.addColorStop(1, R.mix(sky[2], '#000000', 0.35));
    ctx.fillStyle = g; ctx.fillRect(0, 0, R.W, R.H);
    const sc = stars(), off = ((MAP.camY * F.k * 0.25) % R.H + R.H) % R.H; ctx.drawImage(sc, 0, off - R.H); ctx.drawImage(sc, 0, off - R.H * 2 + R.H);
    drawMoon(ctx, F); drawBands(ctx, F); drawSpire(ctx, F); drawPaths(ctx, F); drawFigures(ctx, F); drawNodes(ctx, F); drawMotes(ctx, F); drawClouds(ctx, F); drawLocks(ctx, F); drawActTitles(ctx, F);
    // Vignette and a hint.
    const v = ctx.createLinearGradient(0, 0, 0, R.H); v.addColorStop(0, 'rgba(4,2,6,0.55)'); v.addColorStop(0.12, 'rgba(4,2,6,0)'); v.addColorStop(0.88, 'rgba(4,2,6,0)'); v.addColorStop(1, 'rgba(4,2,6,0.6)'); ctx.fillStyle = v; ctx.fillRect(0, 0, R.W, R.H);
  };
  MAP.TOTAL = TOTAL;
})();
