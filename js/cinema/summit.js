/*
 * Tower of Wishes — the cinema's summit (js/render/cinema.js), 2026-10-23.
 *
 *   summit   the last floor of the Tower, above the cloud sea: a broken ring of pillars round a
 *            stone floor cut with red glyphs; the stairs the climber comes up (south); the final
 *            steps to the brightness (north, vars.light). Seen from outside, the Tower's body falls
 *            away into the clouds.
 *
 * World: x east, y up, z north (metres). The floor is a disc of radius 16 at y 0.
 */
(function () {
  'use strict';
  const K = window.TowCinemaKit;
  if (!K) return;
  const { INK, rng, hex, shade, setHaze, sky, glow, block, sprite3 } = K;
  const SETS = (window.TowCinemaSets = window.TowCinemaSets || {});
  const NIGHT_RED = { top: '#08050f', mid: '#2a0f2c', low: '#7a2c3c', ground: '#140a16', glow: ['255,120,110', '170,60,90'] };
  const RAD = 16;
  const PILLARS = (() => { const r = rng(91), out = []; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + 0.13; if (Math.abs(Math.cos(a)) > 0.95) continue; /* none in front of the stairs */ out.push({ x: Math.sin(a) * 13.5, z: Math.cos(a) * 13.5, h: 2 + r() * 7, w: 0.7 + r() * 0.4 }); } return out; })();
  const RUBBLE = (() => { const r = rng(17), out = []; for (let i = 0; i < 9; i++) { const a = r() * Math.PI * 2, d = 6 + r() * 8; out.push([Math.sin(a) * d, Math.cos(a) * d, 0.3 + r() * 0.5, 0.25 + r() * 0.35]); } return out; })();
  // the octagonal body of the Tower under the floor, falling into the clouds
  function body(v) {
    const n = 8, R = RAD + 0.5, d = Math.hypot(v.cam.x, v.cam.z);
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, am = (a0 + a1) / 2;
      const nx = Math.sin(am), nz = Math.cos(am);
      const p0 = [Math.sin(a0) * R, Math.cos(a0) * R], p1 = [Math.sin(a1) * R, Math.cos(a1) * R];
      const P = v.face([[p0[0], -700, p0[1]], [p0[0], 0, p0[1]], [p1[0], 0, p1[1]], [p1[0], -700, p1[1]]], [nx, 0, nz], shade([70, 54, 88], [nx, 0.1, nz], d), INK);
      if (!P) continue;
      // a few lit slits climbing it
      for (let y = -6; y > -400; y -= 14) {
        const q = v.project((p0[0] + p1[0]) / 2 + nx * 0.1, y, (p0[1] + p1[1]) / 2 + nz * 0.1);
        if (q && q.s > 0.05) { v.ctx.fillStyle = (y / 14) % 3 ? 'rgba(255,190,140,0.7)' : 'rgba(190,150,255,0.8)'; v.ctx.fillRect(q.x - Math.max(1, q.s * 0.3), q.y - Math.max(1, q.s), Math.max(1.5, q.s * 0.6), Math.max(2, q.s * 2)); }
      }
    }
  }
  function floor(v) {
    const n = 24, pts = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; pts.push([Math.sin(a) * RAD, 0, Math.cos(a) * RAD]); }
    v.poly(pts, shade([62, 50, 70], [0, 1, 0], 0), INK);
    // flagstones
    const { ctx } = v; ctx.strokeStyle = 'rgba(20,12,24,0.5)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = -RAD; x <= RAD; x += 2) { const zz = Math.sqrt(Math.max(0, RAD * RAD - x * x)); const a = v.project(x, 0, -zz), b = v.project(x, 0, zz); if (a && b) { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); } }
    for (let z = -RAD; z <= RAD; z += 2) { const xx = Math.sqrt(Math.max(0, RAD * RAD - z * z)); const a = v.project(-xx, 0, z), b = v.project(xx, 0, z); if (a && b) { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); } }
    ctx.stroke();
    // red glyphs cut into the floor, glowing
    const pulse = 0.55 + 0.25 * Math.sin(v.t * 1.7);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,70,70,${pulse * 0.7})`; ctx.lineWidth = 1.5;
    for (const r of [4, 7.5, 11]) {
      ctx.beginPath();
      for (let i = 0; i <= 48; i++) { const a = (i / 48) * Math.PI * 2, p = v.project(Math.sin(a) * r, 0.02, Math.cos(a) * r); if (!p) continue; if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }
      ctx.stroke();
    }
    ctx.beginPath();
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 + v.t * 0.03, p0 = v.project(Math.sin(a) * 4, 0.02, Math.cos(a) * 4), p1 = v.project(Math.sin(a) * 11, 0.02, Math.cos(a) * 11); if (p0 && p1) { ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); } }
    ctx.stroke(); ctx.restore();
  }
  // steps leaving the floor's edge, one piece each (so the climber on a step draws over it):
  // dir -1 down (south, the way up), +1 up (north, to the light)
  function stairs(v, z0, dir, n, rise, w, col) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const y = dir < 0 ? -rise * (i + 1) : rise * i, z = z0 + dir * i * 0.9;
      const B = [-w, w, dir < 0 ? y - 6 : 0, y + rise, Math.min(z, z + dir * 0.9), Math.max(z, z + dir * 0.9)];
      out.push({ box: B, f: () => {
        if (dir > 0) return block(v, B, col, true);
        // going down: no face toward the floor (it lies under the floor, and is drawn after it)
        const [x0, x1, y0, y1, za, zb] = B, d = Math.hypot(v.cam.x, v.cam.y - y, v.cam.z - z);
        v.face([[x0, y0, za], [x0, y1, za], [x1, y1, za], [x1, y0, za]], [0, 0, -1], shade(col, [0, 0, -1], d), INK);
        v.face([[x0, y0, zb], [x0, y1, zb], [x0, y1, za], [x0, y0, za]], [-1, 0, 0], shade(col, [-1, 0, 0], d), INK);
        v.face([[x1, y0, za], [x1, y1, za], [x1, y1, zb], [x1, y0, zb]], [1, 0, 0], shade(col, [1, 0, 0], d), INK);
        v.face([[x0, y1, za], [x0, y1, zb], [x1, y1, zb], [x1, y1, za]], [0, 1, 0], shade(col, [0, 1, 0], d), INK);
      } });
    }
    return out;
  }
  SETS.summit = {
    grade: [255, 120, 140, 0.1],
    look: (u, V) => u.sil ? { ink: 0.6, shade: 0.9, shadeCol: u.silCol || '#0c0614' } : { ink: 1.4, shade: 0.14, shadeCol: '#3a0e22' },
    back(v) {
      setHaze([60, 30, 60]);
      v.cloud = '70,30,60';
      sky(v, NIGHT_RED, 2.4);
      K.ceiling(v);
      // the cloud sea far below, and soft banks of it drifting
      v.poly([[-6000, -90, -6000], [-6000, -90, 6000], [6000, -90, 6000], [6000, -90, -6000]], '#2c1830');
      for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2 + v.t * 0.004, d = 120 + (i % 5) * 70; sprite3(v, i % 2 ? 'smoke_04' : 'smoke_07', '120,70,110', Math.sin(a) * d, -84, Math.cos(a) * d, 90 + (i % 3) * 40, 0.55, a); }
      body(v);
      floor(v);
      const L = v.vars.light || 0;
      if (L > 0.01) { glow(v, 0, 6, 19, 14 * L, '255,250,240', 0.7 * L); sprite3(v, 'light_01', '255,248,235', 0, 7, 19.5, 16 * L, 0.9 * L, 0, true); }
    },
    pieces(v) {
      const out = [];
      for (const p of PILLARS) out.push({ box: [p.x - p.w, p.x + p.w, 0, p.h, p.z - p.w, p.z + p.w], f: () => block(v, [p.x - p.w, p.x + p.w, 0, p.h, p.z - p.w, p.z + p.w], [84, 70, 96], true) });
      for (const [x, z, s, h] of RUBBLE) out.push({ box: [x - s, x + s, 0, h, z - s, z + s], f: () => block(v, [x - s, x + s, 0, h, z - s, z + s], [74, 62, 84], true) });
      out.push(...stairs(v, -15.6, -1, 11, 0.45, 2.2, [70, 58, 82]), ...stairs(v, 15.6, 1, 7, 0.45, 1.6, [96, 84, 110]));
      return out;
    },
    front(v) {},
  };
})();
