/*
 * Tower of Wishes — the cinema's Chapter One places (js/render/cinema.js), 2026-10-22.
 *
 *   tavern   the tavern by the Guild office, inside: warm room, tables, the bar, three windows
 *            on the north wall (they fill with purple light as the formation rises: vars.glow)
 *   ashgate  the street outside, at dusk: it runs north out of town, over the fields to the
 *            treeline, and above the trees the formation (TW-039–042): ring inside ring, turning
 *            against one another; one inner ring stops (vars.stop), it shudders (vars.shudder),
 *            holds, and comes apart (vars.fail). No explosion: the spell simply runs out.
 *
 * World: x east, y up, z north (metres). The tavern's door opens east onto the street at z 0.
 */
(function () {
  'use strict';
  const K = window.TowCinemaKit;
  if (!K) return;
  const { INK, rng, hex, shade, setHaze, sky, ceiling, farWorld, glow, dist3, house, block, lantern } = K;
  const SETS = (window.TowCinemaSets = window.TowCinemaSets || {});
  const lerp = (a, b, k) => a + (b - a) * k;
  const mix = (c0, c1, k) => `rgb(${lerp(c0[0], c1[0], k) | 0},${lerp(c0[1], c1[1], k) | 0},${lerp(c0[2], c1[2], k) | 0})`;
  const NIGHT = { top: '#0b0d22', mid: '#262650', low: '#5e4a78', ground: '#1c1a2a', glow: ['200,150,190', '120,90,160'] };

  // ------------------------------------------------------------------ the formation
  const GLYPH = { c: [10, 150, 470], R: 120 };
  const RINGS = [0.2, 0.38, 0.56, 0.76, 1.0], SPEEDS = [0.55, -0.4, 0.26, -0.18, 0.11];
  function formation(v) {
    const V = v.vars, g = V.glyph || 0, fail = V.fail || 0;
    if (g < 0.01) return;
    const { ctx, t } = v, R = GLYPH.R, sh = V.shudder || 0;
    const r = rng(Math.floor(t * 30));
    const cx = GLYPH.c[0] + (r() - 0.5) * sh * 6, cy = GLYPH.c[1] + (r() - 0.5) * sh * 6, cz = GLYPH.c[2];
    const a = g * (1 - fail);
    const P = (x, y) => v.project(x, y, cz);
    const c = P(cx, cy);
    if (!c) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // the light it throws on the cloud ceiling and the sky
    const sky = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, R * 2.6 * c.s);
    sky.addColorStop(0, `rgba(170,110,255,${0.42 * a})`); sky.addColorStop(0.5, `rgba(120,70,220,${0.16 * a})`); sky.addColorStop(1, 'rgba(120,70,220,0)');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, v.W, v.H);
    // the core
    const core = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, R * 0.3 * c.s);
    const pulse = 0.8 + 0.2 * Math.sin(t * 3.1);
    core.addColorStop(0, `rgba(255,240,255,${0.9 * a * pulse})`); core.addColorStop(0.4, `rgba(200,150,255,${0.55 * a})`); core.addColorStop(1, 'rgba(160,100,255,0)');
    ctx.fillStyle = core; ctx.fillRect(c.x - R * 0.3 * c.s, c.y - R * 0.3 * c.s, R * 0.6 * c.s, R * 0.6 * c.s);
    // rune circles turning at its heart (assets/vfx/ magic textures)
    K.sprite3(v, 'magic_02', '200,160,255', cx, cy, cz, R * 0.75 * (1 + fail * 0.3), a * 0.9, t * 0.25 * (1 - (V.stop || 0) * 0.6), true);
    K.sprite3(v, 'magic_01', '230,210,255', cx, cy, cz, R * 0.42, a * 0.8, -t * 0.4, true);
    ctx.lineCap = 'round';
    const lw = Math.max(1, 1.6 * c.s);
    RINGS.forEach((k, i) => {
      const stop = i === 1 ? V.stop || 0 : 0;
      const ang = t * SPEEDS[i] * (1 - stop) + i * 0.7 + (r() - 0.5) * sh * 0.08;
      const rad = k * R, n = 6, gap = fail * 0.4;
      const alpha = a * (0.55 + 0.45 * Math.sin(t * 2 + i));
      ctx.strokeStyle = `rgba(206,166,255,${alpha})`; ctx.lineWidth = lw * (i === 4 ? 1.4 : 1);
      // the ring, in six arcs that part and drift outward when it fails
      for (let j = 0; j < n; j++) {
        const a0 = ang + (j / n) * Math.PI * 2 + gap, a1 = ang + ((j + 1) / n) * Math.PI * 2 - gap, am = (a0 + a1) / 2;
        const off = fail * R * 0.35 * (0.5 + i * 0.2), dx = Math.cos(am) * off, dy = Math.sin(am) * off - fail * fail * 60;
        ctx.beginPath();
        for (let s = 0; s <= 10; s++) {
          const u = a0 + ((a1 - a0) * s) / 10, p = P(cx + dx + Math.cos(u) * rad, cy + dy + Math.sin(u) * rad);
          if (!p) continue;
          if (s) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y);
        }
        ctx.stroke();
      }
      // glyph marks along it, turning with it
      const m = 10 + i * 6;
      ctx.lineWidth = lw * 0.8; ctx.beginPath();
      for (let j = 0; j < m; j++) {
        const u = ang + (j / m) * Math.PI * 2, off = fail * R * 0.35 * (0.5 + i * 0.2);
        const ox = Math.cos(u) * off, oy = Math.sin(u) * off - fail * fail * 60;
        const p0 = P(cx + ox + Math.cos(u) * (rad - R * 0.035), cy + oy + Math.sin(u) * (rad - R * 0.035)), p1 = P(cx + ox + Math.cos(u) * (rad + R * (j % 3 ? 0.03 : 0.07)), cy + oy + Math.sin(u) * (rad + R * (j % 3 ? 0.03 : 0.07)));
        if (p0 && p1) { ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); }
      }
      ctx.stroke();
    });
    // spokes between the rings, slowly turning
    ctx.strokeStyle = `rgba(190,150,255,${0.35 * a})`; ctx.lineWidth = lw * 0.6; ctx.beginPath();
    for (let j = 0; j < 8; j++) {
      const u = -t * 0.07 + (j / 8) * Math.PI * 2, p0 = P(cx + Math.cos(u) * R * 0.2, cy + Math.sin(u) * R * 0.2), p1 = P(cx + Math.cos(u) * R * (1 - fail * 0.6), cy + Math.sin(u) * R * (1 - fail * 0.6));
      if (p0 && p1) { ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); }
    }
    ctx.stroke();
    // motes of light falling away as it comes apart
    if (fail > 0.02) {
      const q = rng(5);
      for (let i = 0; i < 70; i++) {
        const u = q() * Math.PI * 2, rr = R * (0.2 + q() * 0.9) * (1 + fail * 0.4), p = P(cx + Math.cos(u) * rr, cy + Math.sin(u) * rr - fail * (40 + q() * 90));
        if (!p) continue;
        ctx.fillStyle = `rgba(220,190,255,${g * (1 - fail) * 0.9})`; ctx.fillRect(p.x, p.y, 2, 2);
      }
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------ the street (Ashgate, dusk)
  const RUSTIC = ['#7a6a5a', '#6e5e50', '#86745e', '#5e5464', '#7c6656'].map(hex);
  const THATCH = ['#3a3038', '#4a3a30', '#2e2a34', '#43342c'].map(hex);
  const TAVERN = { b: [-13, -5.5, 0, 6.8, -6, 6], roof: 'z', rh: 3.2, wall: hex('#8a6c52'), roofCol: hex('#3e2e2a'), seed: 7, lit: 0.85 };
  const STREET = (() => {
    const r = rng(17), out = [TAVERN];
    const add = (b, extra) => out.push(Object.assign({ b, roof: 'z', rh: 2.2 + r() * 1.6, wall: RUSTIC[Math.floor(r() * RUSTIC.length)], roofCol: THATCH[Math.floor(r() * THATCH.length)], seed: out.length + 90, lit: 0.4 + r() * 0.35 }, extra));
    for (let z = -36; z < 44;) { const l = 6 + r() * 4; if (!(z + l > -6.5 && z < 6.5)) add([-12 - r() * 1.5, -5.5, 0, 4.8 + r() * 2.6, z, z + l]); z = z + l > -6.5 && z < 6.5 ? 6.6 : z + l + 0.4 + r() * 1.2; }
    for (let z = -36; z < 44;) { const l = 6 + r() * 4; add([5.5, 12 + r() * 1.5, 0, 4.8 + r() * 2.6, z, z + l]); z += l + 0.4 + r() * 1.2; }
    // a second row behind, glimpsed between the roofs
    for (let z = -36; z < 40; z += 9 + r() * 4) { add([-24, -15, 0, 6 + r() * 3, z, z + 7], { roof: 'x' }); add([15, 24, 0, 6 + r() * 3, z, z + 7], { roof: 'x' }); }
    return out;
  })();
  const TREES = (() => { const r = rng(3), t = []; for (let i = 0; i < 260; i++) t.push([(r() - 0.5) * 1400, 360 + r() * 90, 9 + r() * 14, 3 + r() * 3]); return t.sort((a, b) => b[1] - a[1]); })();
  function treeline(v) {
    const { ctx } = v;
    for (const [col, z0, z1] of [['#22233c', 410, 460], ['#15162a', 340, 410]]) {
      ctx.beginPath();
      for (const [x, z, h, w] of TREES) if (z >= z0 && z < z1) v.addPoly([[x - w, 0, z], [x, h, z], [x + w, 0, z]]);
      ctx.fillStyle = col; ctx.fill();
    }
  }
  function lampPost(v, x, z) {
    block(v, [x - 0.07, x + 0.07, 0, 3, z - 0.07, z + 0.07], [30, 22, 26]);
    lantern(v, x, 3.25, z);
  }
  SETS.ashgate = {
    grade: [180, 150, 255, 0.08],
    look: (u, V) => { const g = (V && V.glyph) || 0, f = (V && V.fail) || 0; return { ink: 1.6, shade: 0.1 + 0.16 * g * (1 - f), shadeCol: g * (1 - f) > 0.2 ? '#6a3ab0' : '#16142a' }; },
    back(v) {
      setHaze([44, 40, 74]);
      v.cloud = '40,34,70';
      sky(v, NIGHT, -1.6);
      farWorld(v, 0, 0, { city: false, hills: '#2a2a48' });
      // the fields north of town, the treeline, and the formation over it
      v.poly([[-3000, 0, 44], [-3000, 0, 3000], [3000, 0, 3000], [3000, 0, 44]], '#1e2230');
      treeline(v);
      formation(v);
      // the street and its yards
      v.poly([[-30, 0, -40], [-30, 0, 44], [30, 0, 44], [30, 0, -40]], '#2a2632');
      v.poly([[-5.5, 0.01, -40], [-5.5, 0.01, 44], [5.5, 0.01, 44], [5.5, 0.01, -40]], shade([84, 74, 78], [0, 1, 0], 0));
      const g = v.vars.glyph || 0;
      for (const z of [-14, 2, 18, 34]) glow(v, z % 4 ? 4.6 : -4.6, 0.05, z, 4, '255,170,90', 0.3);
      // the tavern's open door throws its light across the street
      glow(v, -4.6, 0.05, 0, 3.2, '255,190,110', 0.5);
      if (g > 0.01) glow(v, 0, 0.05, 10, 30, '150,100,255', 0.12 * g * (1 - (v.vars.fail || 0)));
    },
    pieces(v) {
      const out = [];
      for (const h of STREET) {
        const B = h.b, c = v.toCam((B[0] + B[1]) / 2, B[3], (B[4] + B[5]) / 2);
        if (c[2] < -Math.max(B[1] - B[0], B[5] - B[4])) continue;
        out.push({ box: [B[0], B[1], 0, B[3] + h.rh, B[4], B[5]], f: () => {
          house(v, h);
          if (h === TAVERN) {
            // the open door, warm light inside, and the sign
            const dp = v.face([[-5.49, 0, -0.7], [-5.49, 2.3, -0.7], [-5.49, 2.3, 0.7], [-5.49, 0, 0.7]], [1, 0, 0], '#5a3a26', INK);
            if (dp) v.poly([[-5.48, 0, -0.55], [-5.48, 2.15, -0.55], [-5.48, 2.15, 0.55], [-5.48, 0, 0.55]], '#d89a50');
            block(v, [-5.5, -4.2, 3.3, 3.42, -1.6, -1.5], [40, 28, 24]);
            block(v, [-4.9, -4.3, 2.5, 3.2, -1.62, -1.48], [120, 70, 40], true);
          }
        } });
      }
      for (const z of [-14, 2, 18, 34]) { const x = z % 4 ? 4.8 : -4.8; out.push({ p: [x, 0, z], f: () => lampPost(v, x, z) }); }
      return out;
    },
    front(v) {},
    GLYPH,
  };

  // ------------------------------------------------------------------ the tavern, inside
  // The room: x -5..5, z -4..6, 3.6 high. The windows are on the north wall, the door on the
  // east wall at z 3..4.2, the bar along the west wall, the hearth on the south wall.
  const RX0 = -5, RX1 = 5, RZ0 = -4, RZ1 = 6, RH = 3.6;
  const TABLES = [[1.95, 1.0], [-1.25, 1.5], [2.9, -1.7], [-2.1, -1.8], [0.2, 3.7], [3.5, 3.5]];
  function room(v) {
    const V = v.vars, g = V.glow || 0, d = 6;
    const wall = [150, 112, 82], wood = [92, 60, 40];
    const wf = (n, top, bot) => K.wallFill(v, wall, n, d, top, bot);
    v.face([[RX0, 0, RZ0], [RX0, 0, RZ1], [RX1, 0, RZ1], [RX1, 0, RZ0]], [0, 1, 0], shade([110, 74, 50], [0, 1, 0], 0));
    v.face([[RX0, RH, RZ1], [RX0, RH, RZ0], [RX1, RH, RZ0], [RX1, RH, RZ1]], [0, -1, 0], '#2a1c18');
    v.face([[RX0, 0, RZ1], [RX0, RH, RZ1], [RX1, RH, RZ1], [RX1, 0, RZ1]], [0, 0, -1], wf([0, 0, -1], [0, RH, RZ1], [0, 0, RZ1]), INK);
    v.face([[RX1, 0, RZ0], [RX1, RH, RZ0], [RX0, RH, RZ0], [RX0, 0, RZ0]], [0, 0, 1], wf([0, 0, 1], [0, RH, RZ0], [0, 0, RZ0]), INK);
    v.face([[RX0, 0, RZ0], [RX0, RH, RZ0], [RX0, RH, RZ1], [RX0, 0, RZ1]], [1, 0, 0], wf([1, 0, 0], [RX0, RH, 1], [RX0, 0, 1]), INK);
    v.face([[RX1, 0, RZ1], [RX1, RH, RZ1], [RX1, RH, RZ0], [RX1, 0, RZ0]], [-1, 0, 0], wf([-1, 0, 0], [RX1, RH, 1], [RX1, 0, 1]), INK);
    const { ctx } = v;
    // floorboards
    ctx.strokeStyle = 'rgba(40,24,16,0.45)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = RX0; x <= RX1; x += 0.5) { const a = v.project(x, 0, Math.max(RZ0, v.cam.z + 0.3)), b = v.project(x, 0, RZ1); if (a && b) { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); } }
    ctx.stroke();
    // wainscot and ceiling beams
    const ws = shade(wood, [0, 0, -1], 0);
    v.poly([[RX0, 0, RZ1 - 0.01], [RX0, 1.0, RZ1 - 0.01], [RX1, 1.0, RZ1 - 0.01], [RX1, 0, RZ1 - 0.01]], ws);
    v.poly([[RX0 + 0.01, 0, RZ0], [RX0 + 0.01, 1.0, RZ0], [RX0 + 0.01, 1.0, RZ1], [RX0 + 0.01, 0, RZ1]], shade(wood, [1, 0, 0], 0));
    v.poly([[RX1 - 0.01, 0, RZ1], [RX1 - 0.01, 1.0, RZ1], [RX1 - 0.01, 1.0, RZ0], [RX1 - 0.01, 0, RZ0]], shade(wood, [-1, 0, 0], 0));
    for (let z = RZ0 + 1; z < RZ1; z += 1.8) block(v, [RX0, RX1, RH - 0.25, RH, z, z + 0.25], [58, 38, 28]);
    for (const x of [RX0 + 0.1, RX1 - 0.3]) for (const z of [RZ0 + 0.1, RZ1 - 0.3]) block(v, [x, x + 0.2, 0, RH, z, z + 0.2], [58, 38, 28]);
    // the windows on the north wall: dusk blue, then purple as the formation rises
    const pane = mix([42, 52, 96], [200, 156, 255], g), ins = [];
    for (const x of [-3.1, 0, 3.1]) {
      v.poly([[x - 0.85, 1.05, RZ1 - 0.02], [x - 0.85, 2.65, RZ1 - 0.02], [x + 0.85, 2.65, RZ1 - 0.02], [x + 0.85, 1.05, RZ1 - 0.02]], '#3a2418');
      v.poly([[x - 0.75, 1.15, RZ1 - 0.03], [x - 0.75, 2.55, RZ1 - 0.03], [x + 0.75, 2.55, RZ1 - 0.03], [x + 0.75, 1.15, RZ1 - 0.03]], pane);
      ctx.strokeStyle = '#2a1810'; ctx.lineWidth = Math.max(1, 2 * ((v.project(x, 1.8, RZ1) || { s: 1 }).s / 60)); ctx.beginPath();
      for (const [p0, p1] of [[[x, 1.15], [x, 2.55]], [[x - 0.75, 1.85], [x + 0.75, 1.85]]]) { const a = v.project(p0[0], p0[1], RZ1 - 0.04), b = v.project(p1[0], p1[1], RZ1 - 0.04); if (a && b) { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); } }
      ctx.stroke();
      ins.push(x);
    }
    // the door on the east wall, opening onto the street
    const door = V.door || 0;
    v.poly([[RX1 - 0.02, 0, 3.0], [RX1 - 0.02, 2.25, 3.0], [RX1 - 0.02, 2.25, 4.2], [RX1 - 0.02, 0, 4.2]], door > 0.05 ? mix([40, 30, 40], [170, 130, 240], door * Math.max(0.4, g)) : '#4a2c1c', INK);
    // the bar along the west wall, and the shelves of bottles behind it
    block(v, [RX0, RX0 + 1.1, 0, 1.1, -2.5, 3.5], [88, 56, 36], true);
    block(v, [RX0, RX0 + 1.25, 1.1, 1.18, -2.6, 3.6], [110, 72, 46], true);
    for (const y of [1.55, 2.15]) {
      block(v, [RX0, RX0 + 0.3, y - 0.05, y, -2, 3], [70, 46, 30]);
      const r = rng(y * 100);
      for (let z = -1.9; z < 2.9; z += 0.22) { const h = 0.22 + r() * 0.12, c = ['#5a8a5a', '#8a3a3a', '#c8a050', '#4a5a8a'][Math.floor(r() * 4)]; v.poly([[RX0 + 0.08, y, z], [RX0 + 0.08, y + h, z], [RX0 + 0.08, y + h, z + 0.12], [RX0 + 0.08, y, z + 0.12]], c); }
    }
    // the hearth
    block(v, [-1.0, 1.0, 0, 1.3, RZ0, RZ0 + 0.5], [90, 84, 80], true);
    v.poly([[-0.6, 0.1, RZ0 + 0.51], [-0.6, 0.9, RZ0 + 0.51], [0.6, 0.9, RZ0 + 0.51], [0.6, 0.1, RZ0 + 0.51]], '#ff9a4a');
    glow(v, 0, 0.6, RZ0 + 0.8, 3.5, '255,150,70', 0.4 + 0.08 * Math.sin(v.t * 7));
    // purple light falling through the windows onto the floor and the faces
    if (g > 0.02) for (const x of ins) { glow(v, x, 1.9, RZ1 - 0.2, 2.8, '190,140,255', 0.3 * g); glow(v, x, 0.05, RZ1 - 1.8, 2.6, '170,120,255', 0.22 * g); }
  }
  function table(v, x, z) {
    block(v, [x - 0.75, x + 0.75, 0.74, 0.82, z - 0.42, z + 0.42], [104, 68, 44], true);
    for (const [dx, dz] of [[-0.65, -0.32], [0.6, -0.32], [-0.65, 0.27], [0.6, 0.27]]) block(v, [x + dx, x + dx + 0.06, 0, 0.74, z + dz, z + dz + 0.06], [70, 46, 30]);
    const r = rng((x * 31 + z * 17) * 10);
    for (let i = 0; i < 3; i++) { const mx = x - 0.5 + r() * 1.0, mz = z - 0.25 + r() * 0.5; block(v, [mx - 0.06, mx + 0.06, 0.82, 0.98, mz - 0.06, mz + 0.06], i ? [150, 120, 80] : [120, 120, 130]); }
  }
  SETS.tavern = {
    grade: [255, 170, 110, 0.1],
    look: (u, V) => { const g = (V && V.glow) || 0; return { ink: 1.4, shade: 0.06 + 0.12 * g, shadeCol: g > 0.3 ? '#5a2aa0' : '#3a1a10' }; },
    back(v) {
      setHaze([60, 40, 30]);
      v.ctx.fillStyle = '#120c0c'; v.ctx.fillRect(0, 0, v.W, v.H);
      room(v);
    },
    pieces(v) {
      const out = [];
      for (const [x, z] of TABLES) out.push({ box: [x - 0.75, x + 0.75, 0, 0.98, z - 0.42, z + 0.42], f: () => table(v, x, z) });
      for (const [x, z] of [[-1.2, 0.2], [2.2, 2.2], [-2.2, 3.6], [1.6, -2.6]]) out.push({ p: [x, 2.7, z], on: false, f: () => {
        const a = v.project(x, RH, z), b = v.project(x, 2.85, z);
        if (a && b) { v.ctx.strokeStyle = '#1a100c'; v.ctx.lineWidth = 1; v.ctx.beginPath(); v.ctx.moveTo(a.x, a.y); v.ctx.lineTo(b.x, b.y); v.ctx.stroke(); }
        lantern(v, x, 2.75, z);
      } });
      return out;
    },
    front(v) {},
  };
  void dist3;
})();
