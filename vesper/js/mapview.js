// VESPER — the campaign map: the climb up the Spire as floating islands in the night, each made from
// its act's own tiles (the courtyard at the Black Gate, the frozen cloister, the sandstone stair...),
// each mission an island with its landmark (a banner and brazier for a battle, the champion for an
// elite, the guardian standing in its lair), joined by stepping stones that light up as you clear
// them. The red moon hangs over it all. The camera glides to what you choose and leans in; an act's
// title rises as you climb into it. Drag or scroll to climb; click an island.
(function () {
  const VS = window.VS, D = VS.DATA, A = VS.A, R = VS.R, P = VS.PROG;
  const MAP = VS.MAP = { camY: 0, camX: 0, z: 1, target: 0, targetX: 0, targetZ: 1, sel: null, hover: null, drag: null, t: 0, card: null, act: -1 };
  const AH = 1150, BOTTOM = 200, TOP = 600, XS = 600, RED = '#ff2a44';
  const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const ECHO_LOOK = { sky: ['#120e1c', '#2e2238', '#5a3e52'], moonCol: '#f4f0ec', fog: '#2e2234' };
  const lookOf = (a) => (P.ACTS[a].echoes ? ECHO_LOOK : D.STAGES[P.ACTS[a].stage].look);
  const themeOf = (a) => VS.ARENA.THEMES[D.STAGES[P.ACTS[a].stage].id] || VS.ARENA.THEMES.gate;
  const TOTAL = BOTTOM + P.ACTS.length * AH + TOP;
  const wyOf = (n) => BOTTOM + n.act * AH + n.y * AH;
  const big = (n) => n.type === 'boss' || n.type === 'echo';

  // ---- layout ------------------------------------------------------------------------------------
  // The map fills the screen above the mission card; k is device px per map unit.
  MAP.cardH = () => Math.min(R.H * 0.36, 250 * R.dpr * Math.max(0.75, Math.min(1.2, R.H / R.dpr / 720)));
  MAP.panelW = () => 0;
  function frame() { const ch = MAP.cardH(), k = Math.min(R.W / (XS * 2 + 420), (R.H - ch) / 620) * MAP.z; return { k, cx: R.W / 2, cy: (R.H - ch) * 0.56 }; }
  MAP.toScreen = (wx, wy, F) => { F = F || frame(); return { x: F.cx + (wx - MAP.camX) * F.k, y: F.cy - (wy - MAP.camY) * F.k }; };
  const nodePos = (n, F) => MAP.toScreen(n.x * XS, wyOf(n), F);
  const bob = (n) => Math.sin(MAP.t * 1.1 + n.act * 1.7 + n.x * 3 + n.y * 5) * 4;
  MAP.focus = function (id, snap) {
    const n = P.node(id); if (!n) return;
    MAP.target = clampCam(wyOf(n) + 40); MAP.targetX = n.x * XS * 0.45;
    if (snap) { MAP.camY = MAP.target; MAP.camX = MAP.targetX; }
  };
  function clampCam(y) { const F = frame(), half = R.H / F.k / 2; return Math.max(half * 0.6, Math.min(TOTAL - half * 0.5, y)); }
  const actAt = (wy) => Math.max(0, Math.min(P.ACTS.length - 1, Math.floor((wy - BOTTOM) / AH)));

  // ---- input ---------------------------------------------------------------------------------------
  MAP.down = (x, y) => { MAP.drag = { x, y, y0: MAP.target, x0: MAP.targetX, moved: false }; };
  MAP.move = (x, y) => {
    MAP.mouse = { x, y };
    if (MAP.drag) { const F = frame(), dy = y - MAP.drag.y, dx = x - MAP.drag.x; if (Math.hypot(dx, dy) > 6 * R.dpr) MAP.drag.moved = true; if (MAP.drag.moved) { MAP.target = clampCam(MAP.drag.y0 + dy / F.k); MAP.camY = MAP.target; MAP.targetX = Math.max(-XS * 0.5, Math.min(XS * 0.5, MAP.drag.x0 - dx / F.k)); MAP.camX = MAP.targetX; } }
    const h = hit(x, y); if (h !== MAP.hover) { MAP.hover = h; if (h && VS.audio) VS.audio.sfx('step_0', 0.25); }
  };
  MAP.up = (x, y) => { const d = MAP.drag; MAP.drag = null; if (d && !d.moved) { const id = hit(x, y); if (id && MAP.onSelect) MAP.onSelect(id); } };
  MAP.wheel = (dy) => { MAP.target = clampCam(MAP.target - dy * 0.9 / frame().k * R.dpr); };
  function hit(x, y) {
    const F = frame(); let best = null, bd = 1e9;
    for (const n of P.NODES) { const q = nodePos(n, F), r = (big(n) ? 150 : 110) * F.k, d = Math.hypot(q.x - x, q.y - bob(n) * F.k - 20 * F.k - y); if (d < r && d < bd) { bd = d; best = n.id; } }
    return best;
  }

  // ---- the islands -----------------------------------------------------------------------------------
  // Each mission's island is baked once (per state) from the act's tiles into a small canvas: a few
  // ground tiles, their cliff falling into the night, overlays, and the landmark of its kind. The
  // figures on it (champions, guardians, your hero) are drawn live.
  const islands = new Map(), MAXI = 28;
  function landmark(n, th, t) {
    const L = { trial: [[t + ':Misc B15', 0, 0]], battle: [[t + ':Misc B44', -0.35, -0.3], [t + ':Misc C8', 0.4, 0.15, 'fire']], elite: [[t + ':Misc B45', -0.4, -0.35], [t + ':Misc C8', 0.45, 0.2, 'fire']],
      challenge: [[t + ':Misc C14', 0, -0.2], [t + ':Misc B53', 0.5, 0.35]], shrine: [[th.statue[0], 0, -0.1], [t + ':Misc C8', 0.55, 0.4, 'fire']],
      boss: [[th.pillar[0], -0.95, -0.7], [th.pillar[0], 0.95, -0.7], [th.statue[0], 0, -1.05], [t + ':Misc C8', -0.9, 0.55, 'fire'], [t + ':Misc C8', 0.9, 0.55, 'fire']],
      echo: [[t + ':Misc C14', 0, -0.55], [th.pillar[0], -0.9, 0.2], [th.pillar[0], 0.9, 0.2]] };
    return L[n.type] || [];
  }
  function bakeIsland(n, state) {
    if (!A.isoReady(['w', 'a', 'd', 'i'])) return null;
    const th = themeOf(n.act), t = th.set === 'i' ? 'i' : 'd', g = big(n) ? 3 : 2, rnd = (k) => hash(hashStr(n.id), k);
    const W = (g * 2) * 64 + 96, OY = 230, H = OY + (g * 2 - 2) * 32 + 64 + 4 * 16 + 30, OX = W / 2;
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    const cells = []; for (let i = 0; i < g; i++) for (let j = 0; j < g; j++) cells.push([i, j]);
    cells.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));
    const at = (i, j) => [OX + (i - j) * 64, OY + (i + j) * 32 - (g - 1) * 32];
    const base = (i, j) => { const b = th.base[Math.floor(rnd(i * 7 + j) * th.base.length)][0], floor = (big(n) || n.type === 'shrine') && th.floor ? th.floor[Math.floor(rnd(30 + i + j) * th.floor.length)] : b; return floor + '_' + ['E', 'N', 'S', 'W'][Math.floor(rnd(50 + i * 3 + j) * 4)]; };
    // The cliff under the two front edges, darkened.
    for (const [i, j] of cells) if (i === g - 1 || j === g - 1) { const [px, py] = at(i, j), k0 = base(i, j); for (let s = 4; s >= 1; s--) A.iso(x, k0, px, py + s * 16, 1); }
    x.globalCompositeOperation = 'source-atop'; const dg = x.createLinearGradient(0, OY, 0, H); dg.addColorStop(0, 'rgba(6,4,10,0.55)'); dg.addColorStop(1, 'rgba(6,4,10,0.95)'); x.fillStyle = dg; x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'source-over';
    for (const [i, j] of cells) { const [px, py] = at(i, j); A.iso(x, base(i, j), px, py, 1); if (th.over && rnd(90 + i * 5 + j) < 0.35) A.iso(x, th.over[Math.floor(rnd(70 + i + j) * th.over.length)] + '_E', px, py, 1); }
    // The landmark and a little decor, back to front.
    const props = landmark(n, th, t).map(([k, ox, oy, kind]) => ({ k, x: OX + (ox - oy) * 64 * (g / 2), y: OY + (ox + oy) * 32 * (g / 2), kind }));
    if (th.decor && th.decor.length) for (let q = 0; q < 2; q++) { const d = th.decor[Math.floor(rnd(200 + q) * th.decor.length)]; if (!d.endsWith('!')) props.push({ k: d, x: OX + (rnd(210 + q) - 0.5) * 64 * g, y: OY + (rnd(220 + q) - 0.2) * 32 * g * 0.6 }); }
    props.sort((a, b) => a.y - b.y);
    for (const pr of props) { const dir = pr.k.startsWith('d:Wall') ? '_N' : '_E'; A.iso(x, pr.k + dir, pr.x, pr.y, 1); }
    // The hour's light (or the dark of a sealed island), only over the pixels drawn.
    const tint = state === 'locked' ? '#4a4058' : th.tint, out = document.createElement('canvas'); out.width = W; out.height = H; const o = out.getContext('2d');
    o.drawImage(c, 0, 0); o.globalCompositeOperation = 'multiply'; o.fillStyle = tint; o.fillRect(0, 0, W, H);
    o.globalCompositeOperation = 'destination-in'; o.drawImage(c, 0, 0);
    return { c: out, W, H, OX, OY, g, fires: props.filter((p) => p.kind === 'fire') };
  }
  const hashStr = (s) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h >>> 0; };
  function island(n, state) {
    const key = n.id + '|' + (state === 'locked' ? 'L' : 'O'); let I = islands.get(key);
    if (!I) { I = bakeIsland(n, state); if (!I) return null; islands.set(key, I); if (islands.size > MAXI) islands.delete(islands.keys().next().value); }
    return I;
  }
  // Island art is at tile pixels; on the map a tile is drawn this many device px per tile px.
  const iscale = (F) => F.k * 0.78;

  // ---- the sky ----------------------------------------------------------------------------------------
  let starC = null, starKey = '';
  function stars() {
    const key = R.W + 'x' + R.H; if (starC && starKey === key) return starC;
    starC = document.createElement('canvas'); starC.width = R.W; starC.height = R.H * 2; starKey = key; const g = starC.getContext('2d');
    for (let i = 0; i < 300; i++) { const a = 0.2 + hash(i, 3) * 0.7; g.fillStyle = `rgba(255,240,244,${a})`; const r = Math.max(1, Math.round((hash(i, 4) < 0.92 ? 1 : 2) * R.dpr)); g.fillRect(Math.round(hash(i, 1) * R.W), Math.round(hash(i, 2) * R.H * 2), r, r); }
    return starC;
  }
  function skyAt(wy) {
    const f = (wy - BOTTOM) / AH, a = Math.max(0, Math.min(P.ACTS.length - 1, Math.floor(f))), b = Math.min(P.ACTS.length - 1, a + 1), m = Math.max(0, Math.min(1, (f - a - 0.8) / 0.4));
    const L1 = lookOf(a), L2 = lookOf(b);
    return [0, 1, 2].map((i) => R.mix(L1.sky[i], L2.sky[i], m));
  }
  // The red moon, large and low behind the islands, rising slowly as you climb.
  function drawMoon(ctx, F) {
    const done = P.cleared(MAP.p, 'a5-b'), col = done ? '#f4f0ec' : RED, prog = MAP.camY / TOTAL;
    const r = Math.min(R.W, R.H) * 0.2, x = R.W * 0.78 - MAP.camX * F.k * 0.05, y = R.H * (0.42 - prog * 0.18);
    A.tex(ctx, 'light_01', x, y, r * 6, r * 6, col, 0.3, 0, true);
    const m = ctx.createLinearGradient(x - r, y - r, x + r, y + r); m.addColorStop(0, R.mix(col, '#ffffff', 0.25)); m.addColorStop(1, R.mix(col, '#000000', 0.25));
    ctx.fillStyle = m; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(x + (hash(i, 3) - 0.5) * r * 1.2, y + (hash(i, 4) - 0.5) * r * 1.2, r * (0.08 + hash(i, 5) * 0.14), 0, 7); ctx.fill(); }
    if (!done) { ctx.strokeStyle = 'rgba(60,0,10,0.85)'; ctx.lineWidth = Math.max(2, r * 0.035); ctx.beginPath(); ctx.moveTo(x - r * 0.95, y + r * 0.35); ctx.lineTo(x + r * 0.95, y - r * 0.35); ctx.stroke(); }
  }
  // The Spire: a far dark tower behind the islands, with lit windows.
  function drawSpire(ctx, F) {
    const k = F.k * 0.5, cx = R.W / 2 - MAP.camX * F.k * 0.3, w0 = 230 * k, w1 = 60 * k, sy = F.cy - (TOTAL * 0.98 - MAP.camY) * k, by = F.cy + (MAP.camY) * k + R.H;
    ctx.save(); ctx.beginPath(); ctx.moveTo(cx - w0, by); ctx.lineTo(cx - w1, sy + 80 * k); ctx.lineTo(cx, sy); ctx.lineTo(cx + w1, sy + 80 * k); ctx.lineTo(cx + w0, by); ctx.closePath();
    const g = ctx.createLinearGradient(cx - w0, 0, cx + w0, 0); g.addColorStop(0, 'rgba(4,2,6,0.0)'); g.addColorStop(0.3, 'rgba(8,4,10,0.75)'); g.addColorStop(0.5, 'rgba(14,8,16,0.85)'); g.addColorStop(0.7, 'rgba(8,4,10,0.75)'); g.addColorStop(1, 'rgba(4,2,6,0.0)');
    ctx.fillStyle = g; ctx.fill(); ctx.clip();
    for (let i = 0; i < 90; i++) {
      const wy = i / 90 * TOTAL, y = F.cy - (wy - MAP.camY) * k; if (y < -20 || y > R.H + 20) continue;
      const x = cx + (hash(i, 7) - 0.5) * (w0 - (w0 - w1) * wy / TOTAL) * 1.4, col = lookOf(actAt(wy)).moonCol, fl = 0.5 + 0.5 * Math.sin(MAP.t * (1 + hash(i, 9) * 2) + i);
      ctx.fillStyle = R.rgba(col, 0.28 * fl); ctx.fillRect(Math.round(x), Math.round(y), Math.max(2, Math.round(3 * k)), Math.max(3, Math.round(7 * k)));
    }
    ctx.restore();
  }
  // Fog banks drifting between the acts, and a low mist at the bottom of the screen.
  function drawClouds(ctx, F, front) {
    for (let a = 1; a <= P.ACTS.length; a++) {
      const q = MAP.toScreen(0, BOTTOM + a * AH - 40, F); if (q.y < -200 * F.k || q.y > R.H + 200 * F.k) continue;
      const L = lookOf(Math.min(P.ACTS.length - 1, a - 1));
      for (let i = front ? 0 : 5; i < (front ? 5 : 11); i++) {
        const x = ((hash(a, i) * 1600 + MAP.t * (10 + 8 * hash(i, a)) * (front ? 1.6 : 1)) % 1600) - 800, s = (200 + 120 * hash(i, a + 3)) * F.k * (front ? 1.3 : 1);
        A.tex(ctx, i % 2 ? 'smoke_07' : 'smoke_04', F.cx + (x - MAP.camX * (front ? 1.2 : 0.8)) * F.k, q.y + (hash(i, a + 9) - 0.5) * 60 * F.k, s * 1.9, s, R.mix(L.fog, '#ffffff', 0.15), front ? 0.28 : 0.45, i, false);
      }
    }
  }
  function drawMotes(ctx, F) {
    for (let i = 0; i < 80; i++) {
      const wy = MAP.camY + ((hash(i, 5) * 1100 + MAP.t * (14 + 22 * hash(i, 6))) % 1100) - 550, wx = (hash(i, 7) - 0.5) * 1400 + Math.sin(MAP.t + i) * 14;
      const act = actAt(wy), L = lookOf(act), q = MAP.toScreen(wx, wy, F), s = Math.max(2, Math.round(2 * F.k));
      ctx.fillStyle = R.rgba(act === 1 ? '#ffffff' : act === 3 ? '#a09a9a' : L.moonCol, 0.3 + 0.35 * hash(i, 8)); ctx.fillRect(Math.round(q.x), Math.round(q.y), s, s);
    }
  }

  // ---- paths: stepping stones floating between the islands -----------------------------------------------
  function drawPaths(ctx, F) {
    for (const n of P.NODES) for (const m of n.next) {
      const N2 = P.node(m), a = nodePos(n, F), b = nodePos(N2, F); if (Math.max(a.y, b.y) < -60 || Math.min(a.y, b.y) > R.H + 60) continue;
      a.y -= bob(n) * F.k; b.y -= bob(N2) * F.k;
      const sa = P.state(MAP.p, n.id), sb = P.state(MAP.p, m), lit = sa === 'cleared' && sb === 'cleared', live = sa === 'cleared' && sb !== 'cleared';
      const len = Math.hypot(b.x - a.x, b.y - a.y), steps = Math.max(2, Math.floor(len / (34 * F.k))), r0 = (big(n) ? 120 : 84) * F.k, r1 = (big(N2) ? 120 : 84) * F.k;
      for (let i = 1; i < steps; i++) {
        const f = i / steps, x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f + Math.sin(f * Math.PI) * -18 * F.k + Math.sin(MAP.t * 1.5 + i) * 1.5 * F.k;
        if (Math.hypot(x - a.x, y - a.y) < r0 || Math.hypot(x - b.x, y - b.y) < r1) continue;
        const w = 11 * F.k, h = 5.5 * F.k, d = 4 * F.k, pulse = live ? Math.max(0, Math.sin(MAP.t * 4 - f * 8)) : 0;
        const top = lit ? '#b8a48a' : live ? R.mix('#8a7a86', '#ffffff', pulse * 0.7) : '#3a2e38', side = lit ? '#5a4a3c' : live ? '#4a3a46' : '#1a1218';
        if (lit) R.glowAt(ctx, '#ffd060', x, y, 16 * F.k, 0.18); if (live) R.glowAt(ctx, RED, x, y, 18 * F.k, 0.15 + pulse * 0.35);
        ctx.fillStyle = side; ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x, y + h); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + d); ctx.lineTo(x, y + h + d); ctx.lineTo(x - w, y + d); ctx.closePath(); ctx.fill();
        ctx.fillStyle = top; ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x, y - h); ctx.lineTo(x + w, y); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
      }
    }
  }

  // ---- islands, figures and labels ----------------------------------------------------------------------
  const BK = { 'a0-b': 'warden', 'a1-b': 'twinB', 'a2-b': 'umbral', 'a3-b': 'hunger', 'a4-b': 'wing', 'a5-b': 'firstCut' };
  const ECHO = { warden: 'warden', twins: 'twinA', umbral: 'umbral', hunger: 'hunger', wing: 'wing', firstCut: 'firstCut' };
  MAP.champ = {};
  function figureOf(n) {
    if (n.type === 'boss') return D.FOES[BK[n.id]];
    if (n.type === 'echo') return D.FOES[ECHO[n.echo]];
    if (n.type === 'elite') { const k = MAP.champ[n.id] || (MAP.champ[n.id] = P.build(n).champion); return D.FOES[k]; }
    return null;
  }
  function drawIsland(ctx, F, n) {
    const q = nodePos(n, F); if (q.y < -260 * F.k || q.y > R.H + 160 * F.k || q.x < -260 * F.k || q.x > R.W + 260 * F.k) return;
    const st = P.state(MAP.p, n.id), sel = MAP.sel === n.id, hov = MAP.hover === n.id, I = island(n, st), s = iscale(F) * (sel ? 1.08 : hov ? 1.04 : 1), y = q.y - bob(n) * F.k, T = P.TYPES[n.type];
    // Under it: the chosen island's rune ring and light; an open one's pulse.
    if (sel) { A.tex(ctx, 'magic_02', q.x, y + 8 * F.k, 230 * s, 115 * s, st === 'locked' ? '#888888' : T.col, 0.75, MAP.t * 0.6, true); A.tex(ctx, 'light_01', q.x, y - 40 * F.k, 260 * s, 300 * s, T.col, 0.25, 0, true); }
    else if (st === 'open') A.tex(ctx, 'light_01', q.x, y, (200 + 20 * Math.sin(MAP.t * 3)) * s, (120 + 12 * Math.sin(MAP.t * 3)) * s, T.col, 0.35, 0, true);
    if (I) {
      const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = s < 0.9;
      ctx.drawImage(I.c, Math.round(q.x - I.OX * s), Math.round(y - I.OY * s), Math.round(I.W * s), Math.round(I.H * s));
      ctx.imageSmoothingEnabled = sm;
      if (st !== 'locked') { const fire = A.isoAnim('Fire2'); if (fire) for (const f of I.fires) A.iso(ctx, fire[Math.floor(MAP.t * 12 + f.x) % fire.length], Math.round(q.x + (f.x - I.OX) * s), Math.round(y + (f.y - I.OY) * s - 30 * s), s * 0.6); for (const f of I.fires) R.glowAt(ctx, '#ff8a3a', q.x + (f.x - I.OX) * s, y + (f.y - I.OY) * s - 40 * s, 50 * s, 0.25); }
    }
    // Who waits there: the champion or the guardian; your hero on the island you stand on.
    const f = figureOf(n);
    if (f && A.hasSet(f.set)) {
      const sc = F.k * 1.9 * Math.min(1.4, f.scale || 1) * (big(n) ? 1.35 : 1), fx = q.x + (big(n) ? 0 : 30 * F.k), fy = y + (big(n) ? -10 : 6) * F.k;
      if (st !== 'locked') A.tex(ctx, 'light_01', fx, fy - 30 * sc, 90 * sc, 90 * sc, f.color || RED, 0.3, 0, true);
      A.actor(ctx, f.set, 'Idle4', Math.floor(MAP.t * 7 + n.act) % 15, Math.PI * 0.75, Math.round(fx), Math.round(fy), sc, st === 'locked' ? { shade: '#07040a' } : st === 'cleared' ? { grey: true } : {});
    }
    const here = P.node(MAP.sel || MAP.p.last) || P.NODES[0];
    if (here.id === n.id) {
      const H = D.HEROES[MAP.p.hero] || D.HEROES.vesper, hx = q.x - (f ? 34 : 0) * F.k, hy = y + 8 * F.k;
      A.tex(ctx, 'light_01', hx, hy - 24 * F.k, 70 * F.k, 70 * F.k, H.color, 0.35, 0, true);
      A.actor(ctx, H.set, 'Idle4', Math.floor(MAP.t * 8) % 15, Math.PI * 0.25, Math.round(hx), Math.round(hy), F.k * 1.9, {});
    }
    // The name over it, the stars under it, a mark on what is new.
    const ly = y - (big(n) ? 150 : 104) * s, col = st === 'locked' ? '#7a6a72' : st === 'open' ? '#ffffff' : '#f0dcb0';
    if (st !== 'locked' || sel || hov) R.label(ctx, n.name, q.x, ly, (big(n) ? 20 : 15) * F.k, col, 'center', 1);
    const goals = P.goals(n).length, got = P.starsOf(MAP.p, n.id);
    if (goals && st !== 'locked') for (let i = 0; i < goals; i++) star(ctx, q.x + (i - (goals - 1) / 2) * 17 * F.k, y + (big(n) ? 92 : 64) * s, 6.5 * F.k, i < got);
    if (st === 'open' && !sel) { const by = ly - 18 * F.k + Math.sin(MAP.t * 4) * 3 * F.k; R.label(ctx, n.type === 'shrine' ? 'CLAIM' : 'NEW', q.x, by, 11 * F.k, RED, 'center', 1); }
    if (st === 'locked' && (sel || hov)) lock(ctx, q.x, y - 40 * s, 14 * F.k);
  }
  function star(ctx, x, y, r, on) {
    ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath();
    ctx.fillStyle = '#050307'; ctx.save(); ctx.translate(Math.max(1, r * 0.25), Math.max(1, r * 0.25)); ctx.fill(); ctx.restore();
    ctx.fillStyle = on ? '#ffd060' : '#3a2e38'; ctx.fill();
  }
  function lock(ctx, x, y, s) { ctx.save(); ctx.strokeStyle = '#d8ccd2'; ctx.fillStyle = '#d8ccd2'; ctx.lineWidth = Math.max(2, s * 0.18); ctx.fillRect(x - s * 0.6, y - s * 0.1, s * 1.2, s * 0.9); ctx.beginPath(); ctx.arc(x, y - s * 0.1, s * 0.42, Math.PI, 0); ctx.stroke(); ctx.restore(); }
  // A sealed act: a veil over its islands and what opens it.
  function drawSeals(ctx, F) {
    for (let a = 0; a < P.ACTS.length; a++) {
      if (P.actOpen(MAP.p, a)) continue;
      const q0 = MAP.toScreen(0, BOTTOM + a * AH + 40, F), q1 = MAP.toScreen(0, BOTTOM + (a + 1) * AH - 40, F); if (q0.y < 0 && q1.y < 0) continue; if (q0.y > R.H && q1.y > R.H) continue;
      const g = ctx.createLinearGradient(0, q1.y, 0, q0.y); g.addColorStop(0, 'rgba(4,2,6,0)'); g.addColorStop(0.3, 'rgba(4,2,6,0.55)'); g.addColorStop(0.7, 'rgba(4,2,6,0.55)'); g.addColorStop(1, 'rgba(4,2,6,0)');
      ctx.fillStyle = g; ctx.fillRect(0, q1.y, R.W, q0.y - q1.y);
      const prevBoss = P.NODES.find((n) => n.act === a - 1 && n.type === 'boss'), mid = (q0.y + q1.y) / 2;
      lock(ctx, F.cx, mid - 34 * F.k, 22 * F.k);
      R.label(ctx, 'Sealed', F.cx, mid + 6 * F.k, 22 * F.k, '#f3e8ec', 'center', 1);
      R.label(ctx, prevBoss ? 'Defeat ' + prevBoss.name + ' to climb higher' : 'Defeat the First Cut to hear the echoes', F.cx, mid + 28 * F.k, 13 * F.k, '#c8b8c0', 'center', 1);
    }
  }
  // The act's title rises as you climb into it, like a stage card.
  function drawActCard(ctx, F, dt) {
    const a = actAt(MAP.camY - 60);
    if (a !== MAP.act) { MAP.act = a; MAP.card = { a, t: 0 }; }
    const c = MAP.card; if (!c) return; c.t += dt; const life = 3.2; if (c.t > life) return;
    const Ac = P.ACTS[c.a], L = lookOf(c.a), al = Math.min(1, c.t * 2.5, (life - c.t) * 1.6), rise = (1 - Math.min(1, c.t * 2)) * 14 * R.k, x = R.W / 2, y = R.H * 0.2 + rise, k = R.k;
    ctx.save(); ctx.globalAlpha = al;
    const bw = Math.min(R.W * 0.7, 560 * k); const gr = ctx.createLinearGradient(x - bw, 0, x + bw, 0); gr.addColorStop(0, 'rgba(5,3,7,0)'); gr.addColorStop(0.5, 'rgba(5,3,7,0.65)'); gr.addColorStop(1, 'rgba(5,3,7,0)'); ctx.fillStyle = gr; ctx.fillRect(x - bw, y - 46 * k, bw * 2, 96 * k);
    R.label(ctx, 'Act ' + Ac.num + '  ·  ' + Ac.hour.toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase()), x, y - 20 * k, 14 * k, L.moonCol, 'center', 1);
    R.label(ctx, Ac.name, x, y + 14 * k, 34 * k, '#fff4f6', 'center', 1);
    const dv = R.uiImg && R.uiImg('divider'); if (dv) { const ps = R.px(), sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false; ctx.drawImage(dv, Math.round(x - dv.naturalWidth * ps / 2), Math.round(y + 26 * k), dv.naturalWidth * ps, dv.naturalHeight * ps); ctx.imageSmoothingEnabled = sm; }
    ctx.restore();
  }
  // The act you are in, small, at the left under the bar.
  function drawActTag(ctx, F) {
    const a = actAt(MAP.camY - 60), Ac = P.ACTS[a], L = lookOf(a), k = R.k, x = 20 * R.dpr, y = 96 * k;
    const nodes = P.NODES.filter((n) => n.act === a), done = nodes.filter((n) => P.cleared(MAP.p, n.id)).length;
    R.label(ctx, 'Act ' + Ac.num, x, y, 13 * k, L.moonCol, 'left', 1);
    R.label(ctx, Ac.name, x, y + 22 * k, 20 * k, '#f3eef0', 'left', 1);
    R.label(ctx, done + ' / ' + nodes.length + ' cleared', x, y + 40 * k, 12 * k, '#c8b8c0', 'left', 1);
  }

  // ---- frame -------------------------------------------------------------------------------------------
  MAP.open = function (p, sel) { MAP.p = p; MAP.sel = sel || null; MAP.focus(sel || P.nextNode(p), true); MAP.z = MAP.targetZ = 1.0; MAP.act = -1; A.loadIso(['w', 'a', 'd', 'i']).catch(() => {}); };
  MAP.draw = function (ctx, dt) {
    MAP.t += dt; const e = Math.min(1, dt * 5);
    // The camera glides to what is chosen and leans in a little.
    MAP.targetZ = MAP.sel ? 1.12 : 1.0;
    MAP.camY += (MAP.target - MAP.camY) * e; MAP.camX += (MAP.targetX - MAP.camX) * e; MAP.z += (MAP.targetZ - MAP.z) * Math.min(1, dt * 3);
    const F = frame(), sky = skyAt(MAP.camY), g = ctx.createLinearGradient(0, 0, 0, R.H);
    g.addColorStop(0, sky[0]); g.addColorStop(0.55, sky[1]); g.addColorStop(1, R.mix(sky[2], '#000000', 0.45));
    ctx.fillStyle = g; ctx.fillRect(0, 0, R.W, R.H);
    const sc = stars(), off = ((MAP.camY * F.k * 0.15) % R.H + R.H) % R.H; ctx.drawImage(sc, 0, off - R.H); ctx.drawImage(sc, 0, off);
    drawMoon(ctx, F); drawSpire(ctx, F); drawClouds(ctx, F, false);
    drawPaths(ctx, F);
    const vis = P.NODES.slice().sort((a, b) => wyOf(b) - wyOf(a));
    for (const n of vis) drawIsland(ctx, F, n);
    drawMotes(ctx, F); drawClouds(ctx, F, true); drawSeals(ctx, F);
    // Letterbox and vignette: the frame of a film.
    const v = ctx.createRadialGradient(R.W / 2, R.H * 0.45, R.H * 0.3, R.W / 2, R.H * 0.45, R.W * 0.75); v.addColorStop(0, 'rgba(4,2,6,0)'); v.addColorStop(1, 'rgba(4,2,6,0.7)'); ctx.fillStyle = v; ctx.fillRect(0, 0, R.W, R.H);
    const lb = Math.round(R.H * 0.035); ctx.fillStyle = '#050307'; ctx.fillRect(0, 0, R.W, lb);
    drawActTag(ctx, F); drawActCard(ctx, F, dt);
  };
  MAP.TOTAL = TOTAL;
})();
