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
    const r = MAP.dioRect; if (MAP.sel && r && x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h) return MAP.sel;
    const F = frame(); let best = null, bd = 1e9;
    for (const n of P.NODES) { const q = nodePos(n, F), r = (big(n) ? 150 : 110) * F.k, d = Math.hypot(q.x - x, q.y - bob(n) * F.k - 20 * F.k - y); if (d < r && d < bd) { bd = d; best = n.id; } }
    return best;
  }

  // ---- the islands -----------------------------------------------------------------------------------
  // Each island is a piece of the very arena its mission opens in (the guardian's lair for a guardian),
  // built as the fight builds it: its ground tiles, walls, props, torches and chests, cut out around the
  // middle and floating in the night with a cliff under it. The chosen mission opens out into a larger
  // piece of that arena with the foes standing in it.
  const S2 = Math.SQRT1_2, LIP = 16, STACK = 5, mp = (x, y) => [(x + y) * S2, (y - x) * S2 * 0.5];
  const arenas = new Map();
  function arenaFor(n) {
    let a = arenas.get(n.id); if (a) return a;
    const b = P.build(n), st = D.STAGES[b.stage], kinds = b.node.arenas || st.arenas, i = big(n) || (n.type === 'challenge' && n.echo) ? kinds.length - 1 : 0;
    a = { Ar: VS.ARENA.build(st.id || 'gate', kinds[i], (b.node.arenaSeed || 1) * 7 + i * 131 + b.stage), b, look: st.look };
    arenas.set(n.id, a); return a;
  }
  // Bake the cells inside an oval (RX by RY tile pixels on screen) round the arena's middle into a canvas.
  function bakeCrop(Ar, RX, RY, locked) {
    if (!A.isoReady(['w', 'a', 'd', 'i'])) return null;
    const T = Ar.T, w = Ar.w, h = Ar.h, ccx = Math.floor(w / 2), ccy = Math.floor(h / 2), inC = new Uint8Array(w * h), list = [];
    for (let cy = 0; cy < h; cy++) for (let cx = 0; cx < w; cx++) { const dx = cx - ccx, dy = cy - ccy, sx = (dx + dy) * 64, sy = (dy - dx) * 32; if (Ar.cells[cy * w + cx] && (sx / RX) ** 2 + (sy / RY) ** 2 <= 1) { inC[cy * w + cx] = 1; list.push([cx, cy]); } }
    if (!list.length) return null;
    const wx0 = Ar.x0 + (ccx + 0.5) * T, wy0 = Ar.y0 + (ccy + 0.5) * T, [mx0, my0] = mp(wx0, wy0);
    const W = 2 * RX + 192, OX = W / 2, OY = RY + 250, H = OY + RY + 64 + LIP * STACK + 40;
    const at = (x, y) => { const q = mp(x, y); return [OX + q[0] - mx0, OY + q[1] - my0]; };
    const cellOf = (x, y) => { const cx = Math.floor((x - Ar.x0) / T), cy = Math.floor((y - Ar.y0) / T); return cx >= 0 && cy >= 0 && cx < w && cy < h ? cy * w + cx : -1; };
    const isIn = (cx, cy) => cx >= 0 && cy >= 0 && cx < w && cy < h && inC[cy * w + cx];
    list.sort((p, q) => (p[1] - p[0]) - (q[1] - q[0]) || (p[0] + p[1]) - (q[0] + q[1]));
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    // The cliff under the open front edges, darkening down into the night.
    const cl = document.createElement('canvas'); cl.width = W; cl.height = H; const gc = cl.getContext('2d'); gc.imageSmoothingEnabled = false;
    for (const [cx, cy] of list) if (!isIn(cx - 1, cy) || !isIn(cx, cy + 1)) { const key = Ar.ground[cy * w + cx]; if (!key) continue; const [x, y] = at(Ar.x0 + (cx + 0.5) * T, Ar.y0 + (cy + 0.5) * T); for (let k = STACK; k >= 1; k--) A.iso(gc, key, x, y + k * LIP, 1); }
    gc.globalCompositeOperation = 'source-atop'; const dg = gc.createLinearGradient(0, OY - RY, 0, H); dg.addColorStop(0, 'rgba(6,4,10,0.5)'); dg.addColorStop(1, 'rgba(6,4,10,0.97)'); gc.fillStyle = dg; gc.fillRect(0, 0, W, H);
    g.drawImage(cl, 0, 0);
    const overBy = {}; for (const o of Ar.over) (overBy[o.cy * w + o.cx] || (overBy[o.cy * w + o.cx] = [])).push(o.key);
    for (const [cx, cy] of list) { const i = cy * w + cx, key = Ar.ground[i]; if (!key) continue; const [x, y] = at(Ar.x0 + (cx + 0.5) * T, Ar.y0 + (cy + 0.5) * T); A.iso(g, key, x, y, 1); if (overBy[i]) for (const k of overBy[i]) A.iso(g, k, x, y, 1); }
    // The walls behind, then the props and low walls by depth.
    const live = [], items = [];
    for (const wl of Ar.walls) if (inC[wl.cy * w + wl.cx]) { const [x, y] = at(wl.x, wl.y); items.push({ key: wl.key, x, y, d: wl.low ? y - 30 : y - 1e5 }); }
    for (const o of Ar.objs) {
      const ci = cellOf(o.x, o.y); if (ci < 0 || !inC[ci]) continue;
      const [x, y] = at(o.x, o.y); let key = o.key;
      if (o.kind === 'break' && !key) { const fr = A.isoAnim(o.anim); key = fr && fr[0]; }
      if (key) items.push({ key, x, y, d: y });
      if (o.kind === 'light') live.push({ kind: 'fire', x, y }); else if (o.kind === 'torch') live.push({ kind: 'torch', x, y });
    }
    items.sort((p, q) => p.d - q.d);
    for (const it of items) A.iso(g, it.key, Math.round(it.x), Math.round(it.y), 1);
    // The hour's light over everything drawn (dark when sealed), a warm pool at each fire.
    const out = document.createElement('canvas'); out.width = W; out.height = H; const o = out.getContext('2d');
    o.drawImage(c, 0, 0); o.globalCompositeOperation = 'multiply'; o.fillStyle = locked ? '#4a4058' : Ar.tint; o.fillRect(0, 0, W, H);
    o.globalCompositeOperation = 'destination-in'; o.drawImage(c, 0, 0);
    if (!locked) {
      o.globalCompositeOperation = 'source-atop'; if (Ar.frost) { o.fillStyle = 'rgba(225,238,255,0.16)'; o.fillRect(0, 0, W, H); }
      for (const l of Ar.lights) { const ci = cellOf(l.x, l.y); if (ci < 0 || !inC[ci]) continue; const [lx, ly] = at(l.x, l.y), r = l.r * S2 * 1.4; o.save(); o.translate(lx, ly); o.scale(1, 0.5); const gr = o.createRadialGradient(0, 0, 0, 0, 0, r); gr.addColorStop(0, 'rgba(255,150,70,0.42)'); gr.addColorStop(1, 'rgba(255,120,50,0)'); o.fillStyle = gr; o.fillRect(-r, -r, r * 2, r * 2); o.restore(); }
    }
    return { c: out, W, H, OX, OY, live, at, inC, Ar, ccx, ccy, wx0, wy0, cellOf, RY };
  }
  const hashStr = (s) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h >>> 0; };
  const islands = new Map(), MAXI = 30, dioramas = new Map();
  function island(n, state) {
    const key = n.id + '|' + (state === 'locked' ? 'L' : 'O'); let I = islands.get(key);
    if (!I) { I = bakeCrop(arenaFor(n).Ar, big(n) ? 290 : 210, big(n) ? 145 : 105, state === 'locked'); if (!I) return null; islands.set(key, I); if (islands.size > MAXI) islands.delete(islands.keys().next().value); }
    return I;
  }
  function diorama(n, state) {
    const key = n.id + '|' + (state === 'locked' ? 'L' : 'O'); let I = dioramas.get(key);
    if (!I) { I = bakeCrop(arenaFor(n).Ar, 600, 175, state === 'locked'); if (!I) return null; I.cast = castOf(n, I); MAP.lastDio = I; dioramas.set(key, I); if (dioramas.size > 4) dioramas.delete(dioramas.keys().next().value); }
    return I;
  }
  // Who stands in the chosen arena: the guardian or champion in the middle, the kinds of foe the
  // mission brings around it (in the looks they will wear), all in open ground.
  function castOf(n, I) {
    const { b } = arenaFor(n), Ar = I.Ar, T = Ar.T, seen = new Set(), list = [];
    for (const wv of b.node.waves) for (const k of wv) if (k !== '+' && !seen.has(k) && D.FOES[k] && !D.FOES[k].god) { seen.add(k); list.push(k); }
    for (const k of b.node.preload || []) if (!seen.has(k) && D.FOES[k] && list.length < 4) { seen.add(k); list.push(k); }
    list.sort((x, y) => (D.FOES[y].boss ? 1 : 0) - (D.FOES[x].boss ? 1 : 0));
    const open = (x, y, taken) => { const ci = I.cellOf(x, y); if (ci < 0 || !I.inC[ci] || Ar.solid[ci]) return false; if (Ar.objs.some((o) => o.r > 0 && Math.hypot(o.x - x, o.y - y) < o.r + 26)) return false; return !taken.some((t) => Math.hypot(t.x - x, t.y - y) < 46); };
    const out = [], rnd = (k) => hash(hashStr(n.id), k);
    list.slice(0, 6).forEach((k, i) => {
      const f = D.FOES[k], set = ((b.node.variants || {})[k] || [f.set])[0], lead = i === 0 && f.boss;
      for (let tries = 0; tries < 24; tries++) {
        const a = rnd(i * 31 + tries) * Math.PI * 2, d = lead ? tries * 14 : (1.4 + rnd(i * 17 + tries + 5) * 1.6) * T, x = I.wx0 + Math.cos(a) * d + T * 0.6, y = I.wy0 + Math.sin(a) * d;
        if (open(x, y, out)) { out.push({ k, set, x, y, f, lead }); break; }
      }
    });
    // Your hero at the near edge, facing them.
    for (let tries = 0; tries < 20; tries++) { const x = I.wx0 - (2.4 + tries * 0.1) * T + (rnd(90 + tries) - 0.5) * T, y = I.wy0 + (rnd(95 + tries) - 0.2) * T; if (open(x, y, out)) { out.push({ hero: true, x, y }); break; } }
    return out;
  }
  // Island art is at tile pixels; on the map a tile is drawn this many device px per tile px.
  const iscale = (F, n) => F.k * (big(n) ? 0.5 : 0.62);

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
        A.tex(ctx, i % 2 ? 'smoke_07' : 'smoke_04', F.cx + (x - MAP.camX * (front ? 1.2 : 0.8)) * F.k, q.y + (hash(i, a + 9) - 0.5) * 60 * F.k, s * 1.9, s, R.mix(L.fog, '#ffffff', 0.15), front ? 0.14 : 0.35, i, false);
      }
    }
  }
  function drawMotes(ctx, F) {
    for (let i = 0; i < 40; i++) {
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
      if (!lit && !live) continue;   // paths not yet reached stay hidden
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
    const st = P.state(MAP.p, n.id), sel = MAP.sel === n.id, hov = MAP.hover === n.id, other = n.act !== actAt(MAP.camY - 60);
    if (sel && MAP.dio && MAP.dio.k > 0.98) return;   // the chosen one is drawn opened out (drawDiorama)
    const I = island(n, st);
    ctx.save(); if (other && !sel) ctx.globalAlpha = 0.5; if (sel && MAP.dio) ctx.globalAlpha *= 1 - MAP.dio.k;
    const s = iscale(F, n) * (hov ? 1.04 : 1), y = q.y - bob(n) * F.k, T = P.TYPES[n.type], RY = big(n) ? 145 : 105;
    // Under it: the chosen island's rune ring and light; an open one's pulse.
    if (sel) { A.tex(ctx, 'magic_02', q.x, y + 8 * F.k, 230 * s, 115 * s, st === 'locked' ? '#888888' : T.col, 0.75, MAP.t * 0.6, true); A.tex(ctx, 'light_01', q.x, y - 40 * F.k, 260 * s, 300 * s, T.col, 0.25, 0, true); }
    else if (st === 'open') A.tex(ctx, 'light_01', q.x, y, (200 + 20 * Math.sin(MAP.t * 3)) * s, (120 + 12 * Math.sin(MAP.t * 3)) * s, T.col, 0.35, 0, true);
    if (I) {
      const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = s < 0.9;
      ctx.drawImage(I.c, Math.round(q.x - I.OX * s), Math.round(y - I.OY * s), Math.round(I.W * s), Math.round(I.H * s));
      ctx.imageSmoothingEnabled = sm;
      if (st !== 'locked') drawLive(ctx, I, q.x, y, s);
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
    const ly = y - (RY + 120) * s, col = st === 'locked' ? '#7a6a72' : st === 'open' ? '#ffffff' : '#f0dcb0';
    if (st === 'open' || sel || hov || (big(n) && st !== 'locked')) R.label(ctx, n.name, q.x, ly, (big(n) ? 20 : 15) * F.k, col, 'center', 1);
    const goals = P.goals(n).length, got = P.starsOf(MAP.p, n.id);
    if (goals && st !== 'locked' && (sel || hov)) for (let i = 0; i < goals; i++) star(ctx, q.x + (i - (goals - 1) / 2) * 17 * F.k, y + (RY + 110) * s, 6.5 * F.k, i < got);
    if (st === 'open' && !sel) { const by = ly - 18 * F.k + Math.sin(MAP.t * 4) * 3 * F.k; R.label(ctx, n.type === 'shrine' ? 'CLAIM' : 'NEW', q.x, by, 11 * F.k, RED, 'center', 1); }
    if (st === 'locked' && (sel || hov)) lock(ctx, q.x, y - 40 * s, 14 * F.k);
    ctx.restore();
  }
  // The fires and torches on a baked piece of arena, flickering.
  function drawLive(ctx, I, x0, y0, s) {
    const fire = A.isoAnim('Fire2'), torch = A.isoAnim('Torch 1');
    for (const l of I.live) {
      const x = Math.round(x0 + (l.x - I.OX) * s), y = Math.round(y0 + (l.y - I.OY) * s);
      if (l.kind === 'fire' && fire) A.iso(ctx, fire[Math.floor(MAP.t * 12 + l.x) % fire.length], x, Math.round(y - 30 * s), s * 0.6);
      if (l.kind === 'torch' && torch) A.iso(ctx, torch[Math.floor(MAP.t * 12 + l.x) % torch.length], x, y, s);
      R.glowAt(ctx, '#ff8a3a', x, y - 40 * s, 50 * s, 0.22);
    }
  }
  // The chosen mission opened out: a larger piece of its arena with the foes standing in it, your hero
  // at the near edge. It grows out of the island when chosen and fits the space above the card.
  function drawDiorama(ctx, F, dt) {
    const n = MAP.sel && P.node(MAP.sel);
    if (!n) { MAP.dio = null; return; }
    if (!MAP.dio || MAP.dio.id !== n.id) MAP.dio = { id: n.id, k: 0 };
    const st = P.state(MAP.p, n.id), I = diorama(n, st); if (!I) return;
    const D0 = MAP.dio; D0.k = Math.min(1, D0.k + dt * 3.2); const e = 1 - Math.pow(1 - D0.k, 3);
    const top = 78 * R.dpr, bottom = R.H - MAP.cardH() - 16 * R.dpr, availH = bottom - top, availW = R.W * 0.9;
    const s1 = Math.min(F.k * 1.1, availW / I.W, availH / (I.H - 170)), s = s1 * (0.55 + 0.45 * e);
    const q = nodePos(n, F), by = bob(n) * F.k * 0.4;
    // Centre it on its island, kept inside the space above the card.
    let x = q.x, y = q.y - by;
    const halfW = I.W * s1 / 2; x = Math.max(halfW + 8 * R.dpr, Math.min(R.W - halfW - 8 * R.dpr, x));
    const topY = y - (I.OY - 170) * s1, botY = y + (I.H - I.OY) * s1; if (topY < top) y += top - topY; else if (botY > bottom) y -= botY - bottom;
    x = q.x + (x - q.x) * e; y = (q.y - by) + (y - (q.y - by)) * e;
    const T = P.TYPES[n.type], locked = st === 'locked';
    // The rest of the map steps back.
    ctx.fillStyle = `rgba(4,2,6,${0.45 * e})`; ctx.fillRect(0, 0, R.W, R.H);
    ctx.save(); ctx.globalAlpha = e;
    // The rune ring under it and a light behind.
    A.tex(ctx, 'light_01', x, y - 40 * s, I.W * s * 0.9, I.H * s * 0.8, locked ? '#777777' : T.col, 0.22, 0, true);
    // The last summit: the god himself looms behind it.
    if (arenaFor(n).b.node.waves.some((w) => w.indexOf('godCut') >= 0) && VS.INTRO && VS.INTRO.kit) { const K = VS.INTRO.kit, gu = 4.5 * R.dpr * e, gy = Math.max(top + 30 * R.dpr, y - (I.RY + 40) * s); A.tex(ctx, 'light_01', x, gy + 20 * gu, I.W * s, I.H * s * 1.2, '#ff3048', 0.35, 0, true); K.colossus(ctx, null, x, gy, gu * 2, MAP.t, { flat: true, col: '#0a0306' }); K.burningEyes(ctx, x, gy, gu * 2, 1, MAP.t); }
    A.tex(ctx, 'magic_02', x, y + 10 * s, I.W * s * 0.85, I.W * s * 0.42, locked ? '#888888' : T.col, 0.55, MAP.t * 0.4, true);
    const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = s < 0.95;
    ctx.drawImage(I.c, Math.round(x - I.OX * s), Math.round(y - I.OY * s), Math.round(I.W * s), Math.round(I.H * s));
    ctx.imageSmoothingEnabled = sm;
    if (!locked) drawLive(ctx, I, x, y, s);
    // The cast, back to front.
    const H = D.HEROES[MAP.p.hero] || D.HEROES.vesper, hero = I.cast.find((c) => c.hero), lead = I.cast.find((c) => c.lead) || I.cast.find((c) => !c.hero);
    const scr = (c) => { const p = I.at(c.x, c.y); return [x + (p[0] - I.OX) * s, y + (p[1] - I.OY) * s]; };
    const order = I.cast.slice().sort((a, b) => scr(a)[1] - scr(b)[1]);
    for (const c of order) {
      const [cx, cy] = scr(c), set = c.hero ? H.set : A.hasSet(c.set) ? c.set : c.f.set; if (!A.hasSet(set)) continue;
      const other = c.hero ? lead : hero, [ox, oy] = other ? scr(other) : [cx + 10, cy], ang = Math.atan2(oy - cy, ox - cx);
      const sc = s * 1.75 * (c.hero ? 1 : Math.min(1.5, c.f.scale || 1)) * (c.lead ? 1.1 : 1);   // a little larger than life, to read at map size
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(cx, cy + 1, 15 * sc, 5.5 * sc, 0, 0, 7); ctx.fill();
      if (!c.hero) { ctx.strokeStyle = c.lead ? 'rgba(255,60,80,0.8)' : 'rgba(255,60,80,0.45)'; ctx.lineWidth = Math.max(1, sc * 1.2); ctx.beginPath(); ctx.ellipse(cx, cy + 1, 15 * sc, 5.5 * sc, 0, 0, 7); ctx.stroke(); }
      if (c.lead) A.tex(ctx, 'light_01', cx, cy - 30 * sc, 110 * sc, 110 * sc, c.f.color || RED, 0.3, 0, true);
      if (c.hero) A.tex(ctx, 'light_01', cx, cy - 24 * sc, 80 * sc, 80 * sc, H.color, 0.3, 0, true);
      const fr = Math.floor(MAP.t * 8 + (c.x + c.y) * 0.01) % 15, opts = st === 'cleared' && !c.hero ? { grey: true } : {};
      A.actor(ctx, set, 'Idle4', fr, ang, Math.round(cx), Math.round(cy), sc, opts);
    }
    // Its name over it, the stars under it.
    const goals = P.goals(n).length, got = P.starsOf(MAP.p, n.id);
    if (goals && !locked) for (let i = 0; i < goals; i++) star(ctx, x + (i - (goals - 1) / 2) * 20 * F.k, Math.min(bottom - 6 * R.dpr, y + (I.RY + 110) * s), 7.5 * F.k, i < got);
    ctx.restore();
    MAP.dioRect = { x: x - I.W * s / 2, y: y - (I.OY - 120) * s, w: I.W * s, h: (I.H - 120) * s };
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
    const Ac = P.ACTS[c.a], L = lookOf(c.a), al = Math.min(1, c.t * 2.5, (life - c.t) * 1.6), rise = (1 - Math.min(1, c.t * 2)) * 14 * R.k, x = R.W / 2, y = Math.max(R.H * 0.22, 118 * R.dpr) + rise, k = R.k;
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
    drawDiorama(ctx, F, dt);
    drawMotes(ctx, F); drawClouds(ctx, F, true); drawSeals(ctx, F);
    // Letterbox and vignette: the frame of a film.
    const v = ctx.createRadialGradient(R.W / 2, R.H * 0.45, R.H * 0.3, R.W / 2, R.H * 0.45, R.W * 0.75); v.addColorStop(0, 'rgba(4,2,6,0)'); v.addColorStop(1, 'rgba(4,2,6,0.7)'); ctx.fillStyle = v; ctx.fillRect(0, 0, R.W, R.H);
    const lb = Math.round(R.H * 0.035); ctx.fillStyle = '#050307'; ctx.fillRect(0, 0, R.W, lb);
    drawActCard(ctx, F, dt);
  };
  MAP.TOTAL = TOTAL;
})();
