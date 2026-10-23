/*
 * Tower of Wishes — the cinema's Tower gate (js/render/cinema.js), 2026-10-23.
 *
 *   gate   the foot of the Tower at dusk, before the Reset: a plaza of flagstones between houses,
 *          braziers, and steps up to a great arched gate in the Tower's south face, full of a
 *          pale violet light (vars.gate: its brightness). The Tower is an octagon 70 m across
 *          its corners that rises into the cloud ceiling.
 *
 * World: x east, y up, z north (metres). The plaza is round (0, 0, 30); the gate's face at z 85.3.
 * The steps: STEPS (from z 74 to the face, 6 steps of 0.5 m; the landing at y 3 from z 83).
 */
(function () {
  'use strict';
  const K = window.TowCinemaKit;
  if (!K) return;
  const { INK, rng, shade, setHaze, sky, ceiling, farWorld, glow, block, house, sprite3, WALLS, ROOFC } = K;
  const SETS = (window.TowCinemaSets = window.TowCinemaSets || {});
  const DUSK = { top: '#140f2a', mid: '#4e2c58', low: '#d07a58', ground: '#33263a' };
  const TZ = 150, R = 70, FACE = TZ - R * Math.cos(Math.PI / 8), HALF = R * Math.sin(Math.PI / 8);
  const STEP_Z0 = 74, RISE = 0.5, RUN = 1.5, NSTEP = 6, LAND = STEP_Z0 + NSTEP * RUN; // the landing: y 3 from z 83
  // where a walker stands on the approach: y for a given z
  const groundAt = (z) => (z < STEP_Z0 ? 0 : z >= LAND ? NSTEP * RISE : Math.ceil((z - STEP_Z0) / RUN) * RISE);
  // houses round the plaza, the approach open to the north
  const HOUSES = (() => {
    const r = rng(73), out = [];
    const add = (b, roof) => out.push({ b, roof, rh: 2.2 + r() * 2.2, wall: WALLS[Math.floor(r() * WALLS.length)], roofCol: ROOFC[Math.floor(r() * ROOFC.length)], seed: out.length + 300, lit: 0.5 + r() * 0.3 });
    for (const side of [-1, 1]) for (let z = -24; z < 66;) { const l = 7 + r() * 5, x0 = 30 + r() * 3, w = 7 + r() * 3; add(side < 0 ? [-x0 - w, -x0, 0, 9 + r() * 6, z, z + l] : [x0, x0 + w, 0, 9 + r() * 6, z, z + l], 'z'); z += l + 0.6; }
    for (let x = -44; x < 44;) { const w = 7 + r() * 4; add([x, x + w, 0, 10 + r() * 6, -36, -28], 'x'); x += w + 0.4; }
    return out;
  })();
  const PILLARS = []; for (let z = 18; z <= 66; z += 12) for (const x of [-9, 9]) PILLARS.push([x, z]);
  const BRAZIERS = [[-12, 70], [12, 70], [-7, 82.4], [7, 82.4]];

  // The Tower: eight faces from the ground into the clouds; string courses, lit slits, glyph seams.
  function towerBody(v) {
    const { ctx } = v, d = Math.hypot(v.cam.x, v.cam.z - TZ);
    for (let i = 0; i < 8; i++) {
      const a0 = Math.PI + Math.PI / 8 + (i * Math.PI) / 4, a1 = a0 + Math.PI / 4, am = (a0 + a1) / 2;
      const p0 = [Math.sin(a0) * R, TZ + Math.cos(a0) * R], p1 = [Math.sin(a1) * R, TZ + Math.cos(a1) * R], n = [Math.sin(am), 0, Math.cos(am)];
      const P = v.face([[p0[0], 0, p0[1]], [p0[0], 3200, p0[1]], [p1[0], 3200, p1[1]], [p1[0], 0, p1[1]]], n, shade([64, 52, 82], n, d * 0.4), INK);
      if (!P) continue;
      // string courses and lit slits climbing the face
      ctx.strokeStyle = 'rgba(24,14,30,0.55)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let y = 14; y < 900; y += 14) { const a = v.project(p0[0], y, p0[1]), b = v.project(p1[0], y, p1[1]); if (a && b) { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); } }
      ctx.stroke();
      const r = rng(11 + i);
      for (let y = 20; y < 1200; y += 9) {
        if (r() > 0.28) continue;
        const k = 0.15 + r() * 0.7, q = v.project(p0[0] + (p1[0] - p0[0]) * k + n[0] * 0.1, y, p0[1] + (p1[1] - p0[1]) * k + n[2] * 0.1);
        if (!q || q.s < 0.02) continue;
        ctx.fillStyle = r() < 0.75 ? 'rgba(255,196,140,0.85)' : 'rgba(200,160,255,0.9)';
        ctx.fillRect(q.x, q.y, Math.max(1, q.s * 0.5), Math.max(1, q.s * 1.4));
      }
    }
    // two glyph seams of violet light running up from the gate
    const pulse = 0.55 + 0.25 * Math.sin(v.t * 1.3);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(180,140,255,${0.45 * pulse})`; ctx.lineWidth = 1.5;
    for (const x of [-8, 8]) { const a = v.project(x, 18, FACE - 0.05), b = v.project(x * 0.4, 600, FACE - 0.05); if (a && b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } }
    ctx.restore();
  }
  // the gate: a carved frame and an arch full of light
  function gate(v) {
    const z = FACE - 0.06, y0 = NSTEP * RISE, L = v.vars.gate == null ? 1 : v.vars.gate;
    const arch = [[-4, y0, z]]; for (let i = 0; i <= 12; i++) { const a = Math.PI - (i / 12) * Math.PI; arch.push([Math.cos(a) * 4, y0 + 10 + Math.sin(a) * 4, z]); } arch.push([4, y0, z]);
    const frame = [[-5.6, y0, z + 0.02]]; for (let i = 0; i <= 12; i++) { const a = Math.PI - (i / 12) * Math.PI; frame.push([Math.cos(a) * 5.6, y0 + 10 + Math.sin(a) * 5.6, z + 0.02]); } frame.push([5.6, y0, z + 0.02]);
    v.poly(frame, shade([92, 78, 106], [0, 0, -1], 30), INK);
    const c = v.project(0, y0 + 6, z);
    if (c) {
      const g = v.ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, Math.max(4, 10 * c.s));
      g.addColorStop(0, `rgb(${Math.min(255, 200 + 50 * L) | 0},${Math.min(255, 180 + 60 * L) | 0},255)`); g.addColorStop(0.6, `rgb(${120 + 40 * L | 0},${90 + 40 * L | 0},${180 + 40 * L | 0})`); g.addColorStop(1, '#3a2a5a');
      v.poly(arch, g, INK);
    }
    glow(v, 0, y0 + 6, z - 1, 11, '190,160,255', 0.16 + 0.16 * L);
    sprite3(v, 'light_01', '220,200,255', 0, y0 + 6, z - 0.5, 11 * (0.6 + 0.4 * L), 0.22 * L, 0, true);
    // glyphs round the frame
    const pulse = 0.6 + 0.4 * Math.sin(v.t * 2);
    for (let i = 0; i < 9; i++) { const a = Math.PI - (i / 8) * Math.PI; sprite3(v, 'star_06', '200,170,255', Math.cos(a) * 4.8, y0 + 10 + Math.sin(a) * 4.8, z - 0.1, 0.9, 0.5 * pulse, 0, true); }
  }
  function brazier(v, x, z, phase) {
    const y = groundAt(z);
    block(v, [x - 0.18, x + 0.18, y, y + 1.0, z - 0.18, z + 0.18], [44, 34, 40]);
    block(v, [x - 0.6, x + 0.6, y + 1.0, y + 1.35, z - 0.6, z + 0.6], [60, 46, 50], true);
    glow(v, x, y + 1.8, z, 5, '255,150,70', 0.5 + 0.1 * Math.sin(v.t * 9 + phase));
    if (v.fx) v.fx('torch', x, y + 1.35, z, { scale: 2.2, phase });
  }
  function pillar(v, x, z) {
    block(v, [x - 0.45, x + 0.45, 0, 5.5, z - 0.45, z + 0.45], [88, 76, 98], true);
    block(v, [x - 0.6, x + 0.6, 5.5, 5.8, z - 0.6, z + 0.6], [70, 60, 80], true);
    glow(v, x, 6.1, z, 1.6, '190,150,255', 0.35 + 0.15 * Math.sin(v.t * 2 + z));
    sprite3(v, 'star_06', '210,180,255', x, 6.1, z, 0.9, 0.6, 0, true);
  }
  SETS.gate = {
    grade: [255, 150, 140, 0.1],
    look: () => ({ ink: 1.6, shade: 0.12, shadeCol: '#2a1430' }),
    groundAt, FACE, LAND, STEP_Z0,
    back(v) {
      setHaze([96, 66, 104]);
      v.cloud = '74,46,90';
      sky(v, DUSK, -1.3);
      farWorld(v, 0, 0, { clouds: false, open: [0, 0.75] });
      // the plaza
      v.poly([[-60, 0, -40], [-60, 0, FACE], [60, 0, FACE], [60, 0, -40]], shade([88, 70, 76], [0, 1, 0], 0));
      const { ctx } = v; ctx.strokeStyle = 'rgba(36,22,30,0.35)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let z = -20; z < STEP_Z0; z += 2) { if (z < v.cam.z + 0.5) continue; const a = v.project(-28, 0, z), b = v.project(28, 0, z); if (a && b) { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); } }
      for (let x = -28; x <= 28; x += 2) { const a = v.project(x, 0, Math.max(-20, v.cam.z + 0.5)), b = v.project(x, 0, STEP_Z0); if (a && b) { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); } }
      ctx.stroke();
      // the approach: a darker paved way up the middle
      v.poly([[-4, 0.01, Math.max(-20, v.cam.z + 0.5)], [-4, 0.01, STEP_Z0], [4, 0.01, STEP_Z0], [4, 0.01, Math.max(-20, v.cam.z + 0.5)]], shade([72, 58, 70], [0, 1, 0], 0));
      for (const [x, z] of BRAZIERS) glow(v, x, 0.05, z, 6, '255,150,70', 0.22);
      towerBody(v);
      ceiling(v);
      gate(v);
    },
    pieces(v) {
      const out = [];
      for (const h of HOUSES) {
        const B = h.b, c = v.toCam((B[0] + B[1]) / 2, B[3], (B[4] + B[5]) / 2);
        if (c[2] < -Math.max(B[1] - B[0], B[5] - B[4])) continue;
        out.push({ box: [B[0], B[1], 0, B[3] + h.rh, B[4], B[5]], f: () => house(v, h) });
      }
      for (let i = 0; i < NSTEP; i++) out.push({ box: [-11, 11, 0, (i + 1) * RISE, STEP_Z0 + i * RUN, i === NSTEP - 1 ? FACE : STEP_Z0 + (i + 1) * RUN], f: () => block(v, [-11, 11, 0, (i + 1) * RISE, STEP_Z0 + i * RUN, i === NSTEP - 1 ? FACE : STEP_Z0 + (i + 1) * RUN], [96, 84, 104], true) });
      for (const [x, z] of PILLARS) out.push({ box: [x - 0.6, x + 0.6, 0, 5.8, z - 0.6, z + 0.6], f: () => pillar(v, x, z) });
      BRAZIERS.forEach(([x, z], i) => out.push({ p: [x, groundAt(z), z], f: () => brazier(v, x, z, i * 0.37) }));
      return out;
    },
    front(v) {},
  };
})();
