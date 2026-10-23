/*
 * Tower of Wishes — the menu's campfire at night (js/render/cinema.js), 2026-10-23.
 *
 *   camp   a clearing in the woods at night: a campfire in a ring of stones, two tents, a
 *          training post, a log, an old tree with a low branch; pines all round; the moon, and
 *          far off on the horizon the Tower's thin light. Lit by the fire (warm, falling off with
 *          distance) and the moon (cold, faint).
 *
 * The author's direction (2026-10-23): the party round the fire, each doing what fits them —
 * Kael practising with his sword, Eiryn working magic, Nox crouched in the tree; heroes not yet
 * met are drawn as shadows. TowCinemaMenu.camp(met) builds the scene for the heroes met so far
 * (keys: kael, eiryn, aerys, eloryn, braxen, nox); main.js loops its one beat.
 *
 * World: x east, y up, z north (metres). The fire is at (0, 0, 8).
 */
(function () {
  'use strict';
  const K = window.TowCinemaKit;
  if (!K) return;
  const { INK, rng, block, glow, sprite3, dist3 } = K;
  const SETS = (window.TowCinemaSets = window.TowCinemaSets || {});
  const FIRE = [0, 0, 8];
  // night colour: a cold moonlit base, warmed by the fire where it reaches
  function lit(rgb, n, x, y, z) {
    const dx = FIRE[0] - x, dy = 0.8 - y, dz = FIRE[2] - z, d = Math.hypot(dx, dy, dz) || 1;
    const facing = n ? Math.max(0, (n[0] * dx + n[1] * dy + n[2] * dz) / d / (Math.hypot(n[0], n[1], n[2]) || 1)) : 0.6;
    const f = (0.25 + 0.75 * facing) * 1.5 / (1 + (d * d) / 16);
    const moon = 0.2 + (n && n[1] > 0.5 ? 0.06 : 0);
    const c = [rgb[0] * moon + 255 * 0.55 * f * (rgb[0] / 255 + 0.35), rgb[1] * moon + 140 * 0.55 * f * (rgb[1] / 255 + 0.3), rgb[2] * (moon + 0.08) + 60 * 0.5 * f * (rgb[2] / 255 + 0.2)];
    return `rgb(${Math.min(255, c[0]) | 0},${Math.min(255, c[1]) | 0},${Math.min(255, c[2]) | 0})`;
  }
  function box(v, b, rgb, ink) {
    const [x0, x1, y0, y1, z0, z1] = b, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2, e = ink ? INK : null;
    v.face([[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]], [0, 0, -1], lit(rgb, [0, 0, -1], cx, cy, z0), e);
    v.face([[x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [x0, y0, z1]], [0, 0, 1], lit(rgb, [0, 0, 1], cx, cy, z1), e);
    v.face([[x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0]], [-1, 0, 0], lit(rgb, [-1, 0, 0], x0, cy, cz), e);
    v.face([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], [1, 0, 0], lit(rgb, [1, 0, 0], x1, cy, cz), e);
    v.face([[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]], [0, 1, 0], lit(rgb, [0, 1, 0], cx, y1, cz), e);
  }
  // pines as billboards: a trunk and three stacked boughs, the fire side warmer
  const PINES = (() => {
    const r = rng(19), out = [];
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2 + r() * 0.1, d = 15 + r() * 16;
      const x = FIRE[0] + Math.sin(a) * d, z = FIRE[2] + Math.cos(a) * d;
      if (z < -6 && Math.abs(x) < 16) continue; // the way the camera looks in
      out.push({ x, z, h: 7 + r() * 7, w: 1.8 + r() * 1.4 });
    }
    return out;
  })();
  function pine(v, P) {
    const { ctx } = v, b = v.project(P.x, 0, P.z), t = v.project(P.x, P.h, P.z);
    if (!b || !t) return;
    const k = b.s, side = Math.sign((P.x - FIRE[0]) * Math.cos(v.cam.yaw) - (P.z - FIRE[2]) * Math.sin(v.cam.yaw));
    ctx.fillStyle = lit([46, 30, 26], null, P.x, 1, P.z);
    ctx.fillRect(b.x - 0.18 * k, t.y + (b.y - t.y) * 0.6, 0.36 * k, (b.y - t.y) * 0.4);
    for (let i = 0; i < 3; i++) {
      const y0 = P.h * (0.25 + i * 0.22), y1 = Math.min(P.h, y0 + P.h * 0.42), w = P.w * (1 - i * 0.25);
      const p0 = v.project(P.x, y0, P.z), p1 = v.project(P.x, y1, P.z);
      if (!p0 || !p1) continue;
      ctx.fillStyle = lit([24, 40, 36], null, P.x, y0, P.z);
      ctx.beginPath(); ctx.moveTo(p0.x - w * k, p0.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(p0.x + w * k, p0.y); ctx.closePath(); ctx.fill();
      // the side toward the fire catches a little of it
      ctx.fillStyle = 'rgba(255,140,70,0.08)';
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(p0.x - side * w * k, p0.y); ctx.closePath(); ctx.fill();
    }
  }
  // the old tree: a thick trunk, a low branch reaching over the camp, a dark crown
  const TREE = { x: -5.6, z: 13.2 };
  // the hearth's ruins: [x0, x1, y0, y1, z0, z1]
  const RUINS = [[-7.5, -6.8, 0, 2.6, 9, 14], [-7.5, -4.5, 0, 1.4, 14, 14.6], [5.6, 6.3, 0, 3.2, 12, 16.5], [3.2, 6.3, 0, 1.1, 16, 16.6], [6.4, 9.8, 0, 2.0, 5, 5.6], [-2.4, 0.6, 0, 0.5, 13.4, 14.0]];
  function tree(v) {
    const { x, z } = TREE;
    box(v, [x - 0.55, x + 0.55, 0, 6.5, z - 0.55, z + 0.55], [70, 50, 42], true);
    box(v, [x + 0.4, x + 2.7, 3.0, 3.35, z - 0.2, z + 0.2], [70, 50, 42], true); // the branch
    box(v, [x - 1.8, x - 0.4, 4.2, 4.5, z - 0.2, z + 0.2], [70, 50, 42], true);
    const r = rng(7);
    for (let i = 0; i < 14; i++) sprite3(v, i % 2 ? 'smoke_07' : 'smoke_04', i % 3 ? '20,34,30' : '30,44,36', x + (r() - 0.5) * 6, 6.2 + r() * 3.2, z + (r() - 0.5) * 3, 3.4 + r() * 2, 0.95, r() * 6);
  }
  function tent(v, x, z, w, d, rot) {
    const c = Math.cos(rot), s = Math.sin(rot), P = (u, y, wv) => [x + u * c + wv * s, y, z - u * s + wv * c];
    const h = 1.6, col = [116, 96, 70];
    const L = [P(-d, 0, -w), P(-d, h, 0), P(d, h, 0), P(d, 0, -w)], R = [P(d, 0, w), P(d, h, 0), P(-d, h, 0), P(-d, 0, w)];
    v.face(L, [-s * 0 - s * 1, 0.6, -c], lit(col, [0, 0.6, -1], x, 0.8, z), INK);
    v.face(R, [s, 0.6, c], lit(col, [0, 0.6, 1], x, 0.8, z), INK);
    v.poly([P(-d, 0, -w), P(-d, h, 0), P(-d, 0, w)], lit([40, 30, 26], null, x, 0.6, z), INK);
  }
  function campfire(v) {
    const [x, , z] = FIRE, fl = 0.85 + 0.15 * Math.sin(v.t * 13) * Math.sin(v.t * 7.3);
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2, sx = x + Math.cos(a) * 0.75, sz = z + Math.sin(a) * 0.75; box(v, [sx - 0.16, sx + 0.16, 0, 0.18, sz - 0.12, sz + 0.12], [96, 90, 96]); }
    box(v, [x - 0.5, x + 0.5, 0.05, 0.18, z - 0.08, z + 0.08], [60, 36, 26]);
    box(v, [x - 0.08, x + 0.08, 0.05, 0.18, z - 0.5, z + 0.5], [60, 36, 26]);
    glow(v, x, 0.9, z, 7 * fl, '255,130,50', 0.22);
    glow(v, x, 0.5, z, 1.6, '255,200,120', 0.3 * fl);
    if (v.fx) { v.fx('campfire', x, 0.05, z, { scale: 1.0 }); v.fx('embers', x, 1.0, z, { scale: 1.0, add: true }); }
  }
  SETS.camp = {
    grade: [255, 150, 90, 0.08],
    // heroes not yet met are shadows; the rest are lit by the fire
    look: (u) => u.sil ? { ink: 0.6, inkCol: '#4a3a5a', shade: 0.93, shadeCol: '#0a0812' } : { ink: 1.2, shade: 0.18, shadeCol: '#1a0d10' },
    back(v) {
      const { ctx, W, H } = v, hz = v.hz;
      const g = ctx.createLinearGradient(0, Math.min(hz - H, 0), 0, hz + 2);
      g.addColorStop(0, '#03040b'); g.addColorStop(0.7, '#0c1028'); g.addColorStop(1, '#1c1f3c');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, Math.max(0, hz + 2));
      ctx.fillStyle = '#0a0a12'; ctx.fillRect(0, Math.max(0, hz), W, H);
      // stars and the moon
      const r = rng(5), F = H * v.cam.F;
      for (let i = 0; i < 140; i++) {
        const a = r() * Math.PI * 2, el = 0.08 + r() * 0.9, sx = W / 2 + K.wrap(a - v.cam.yaw) * F, sy = hz - Math.tan(el) * F * 0.7;
        if (sx < 0 || sx > W || sy < 0) continue;
        ctx.fillStyle = `rgba(230,230,255,${(0.3 + 0.6 * Math.abs(Math.sin(v.t * 0.6 + i))) * (0.4 + r() * 0.6)})`; ctx.fillRect(sx | 0, sy | 0, 1, 1);
      }
      const m = v.project(v.cam.x - 700, v.cam.y + 520, v.cam.z + 900);
      if (m) { glow(v, v.cam.x - 700, v.cam.y + 520, v.cam.z + 900, 140, '200,210,255', 0.25); ctx.fillStyle = '#e8e6f4'; ctx.beginPath(); ctx.arc(m.x, m.y, Math.max(2, 22 * m.s), 0, Math.PI * 2); ctx.fill(); }
      // far hills, and the Tower's thread of light on the horizon (north-east)
      K.ridge(v, 0, 0, '#0e1020');
      const tb = v.project(1400, 0, 2600), tt = v.project(1400, 2400, 2600);
      if (tb && tt) {
        ctx.fillStyle = '#141428'; ctx.fillRect(tb.x - 1, tt.y, 2, tb.y - tt.y);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(190,150,255,0.35)'; ctx.fillRect(tb.x, 0, 1, tb.y); ctx.restore();
        glow(v, 1400, 900, 2600, 260, '190,150,255', 0.18);
      }
      // the ground: dark grass, the trodden circle round the fire
      v.poly([[-80, 0, -60], [-80, 0, 90], [80, 0, 90], [80, 0, -60]], '#10140f');
      const pts = []; for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; pts.push([FIRE[0] + Math.cos(a) * 7.5, 0.01, FIRE[2] + Math.sin(a) * 6.5]); }
      v.poly(pts, '#1e1612');
      glow(v, FIRE[0], 0.05, FIRE[2], 8, '255,120,50', 0.16);
    },
    pieces(v) {
      const out = [];
      for (const P of PINES) out.push({ p: [P.x, 0, P.z], f: () => pine(v, P) });
      out.push({ box: [TREE.x - 2, TREE.x + 2.7, 0, 9, TREE.z - 1.5, TREE.z + 1.5], f: () => tree(v) });
      out.push({ box: [-0.9, 0.9, 0, 0.3, FIRE[2] - 0.9, FIRE[2] + 0.9], f: () => campfire(v) });
      if (v.vars.hearth) {
        // a settlement built from older ruins: broken walls round the fire, a shelter of salvaged stone
        for (const B of RUINS) out.push({ box: B, f: () => box(v, B, [92, 84, 92], true) });
      } else {
        // Kael's training post, Braxen's log, the tents
        out.push({ box: [4.65, 4.95, 0, 1.75, 9.25, 9.55], f: () => { box(v, [4.65, 4.95, 0, 1.75, 9.25, 9.55], [96, 70, 50], true); box(v, [4.6, 5.0, 1.2, 1.32, 8.9, 9.9], [96, 70, 50], true); } });
        out.push({ box: [1.5, 3.7, 0, 0.45, 12.1, 12.6], f: () => box(v, [1.5, 3.7, 0, 0.45, 12.1, 12.6], [84, 60, 46], true) });
        out.push({ box: [-9, -5.6, 0, 1.6, 4, 7], f: () => tent(v, -7.3, 5.6, 1.5, 1.3, 0.5) });
        out.push({ box: [7.2, 10.4, 0, 1.6, 13.4, 16.4], f: () => tent(v, 8.8, 14.9, 1.5, 1.3, -0.4) });
      }
      // fireflies at the edge of the light
      for (const [x, y, z, ph] of [[-8, 1.4, 11, 0], [9, 1.8, 9, 0.7], [-3, 2.4, 17, 1.3], [5, 1.2, 18, 2.1]]) out.push({ p: [x, y, z], on: false, f: () => v.fx && v.fx('fireflies', x, y, z, { scale: 1.2, add: true, phase: ph }) });
      return out;
    },
    front(v) {
      // sparks rising from the fire
      for (let i = 0; i < 8; i++) {
        const age = (v.t * 0.45 + i / 8) % 1, sx = FIRE[0] + Math.sin(i * 2.3 + v.t) * 0.3 * age, sz = FIRE[2] + Math.cos(i * 1.7) * 0.2;
        const p = v.project(sx, 0.6 + age * 3.2, sz);
        if (p && dist3(v, sx, 1, sz) < 40) { v.ctx.fillStyle = `rgba(255,${(180 - age * 100) | 0},80,${(1 - age).toFixed(2)})`; v.ctx.fillRect(p.x | 0, p.y | 0, 1, 1); }
      }
    },
  };

  // ------------------------------------------------------------ the scene for the menu
  // [key, set, x, z, dir, y]: where each hero is; what each does is in the beat below.
  const SPOTS = {
    kael: ['kael_sword', 3.7, 9.4, 'E'], eiryn: ['eiryn', -1.7, 11.6, 'SE'], eloryn: ['eloryn', -1.4, 6.5, 'NE'],
    braxen: ['braxen', 2.6, 12.0, 'SW'], aerys: ['aerys_spear', 7.6, 11.2, 'E'], nox: ['nox', TREE.x + 1.9, TREE.z, 'SE', 3.35],
  };
  function camp(met) {
    const has = (k) => !!(met && (met.has ? met.has(k) : met.includes(k)));
    const actors = Object.entries(SPOTS).map(([k, [set, x, z, dir, y]]) => ({ id: k, set, x, y: y || 0, z, dir, sil: !has(k), noShadow: !!y }));
    // one cycle (main.js plays it again when it ends): Kael's drills, Eiryn's spell, Eloryn
    // tending, Braxen by the fire, Aerys on watch, Nox in the tree; the camera drifts
    const doo = [
      { cam: { x: -2.6, y: 1.6, z: 0.6, yaw: 0.16, pitch: -0.05, cut: true } },
      { at: 0.1, cam: { x: -1.9, y: 1.75, z: 1.6, yaw: 0.13, pitch: -0.06, ease: 22 } },
      { who: 'eloryn', pose: 'kneel' }, { who: 'braxen', pose: 'kneel' }, { who: 'nox', pose: 'brace' },
      { who: 'aerys', anim: 'idle' }, { who: 'eiryn', anim: 'idle' }, { who: 'kael', anim: 'idle_combat' },
    ];
    for (let t = 0.8; t < 39; t += 3.2) {
      doo.push({ at: t, who: 'kael', anim: 'attack' }, { at: t + 1.0, who: 'kael', anim: 'attack2' }, { at: t + 2.1, who: 'kael', anim: 'idle_combat' });
    }
    for (const t of [2.5, 10.5, 18.5, 26.5, 34.5]) {
      doo.push({ at: t, who: 'eiryn', anim: 'cast' }, { at: t, who: 'eiryn', pfx: [{ name: 'spell_cast', scale: 0.8, add: true, h: 1.0 }, { name: 'arcane_orb', scale: 0.7, add: true, h: 1.6, life: 3.6 }] });
      doo.push({ at: t + 1.2, who: 'eiryn', anim: 'idle' }, { at: t + 1.4, who: 'eiryn', pfx: { name: 'sparkles', scale: 0.8, add: true, h: 1.2, life: 2.4 } });
    }
    for (const t of [1.5, 9, 16.5, 24, 31.5]) doo.push({ at: t, who: 'eloryn', pfx: { name: 'heal_loop', scale: 0.7, add: true, h: 0.3, life: 3 } });
    for (const t of [7, 27]) doo.push({ at: t, who: 'aerys', dir: 'NE' }, { at: t + 5, who: 'aerys', anim: 'idle_alt' }, { at: t + 8, who: 'aerys', dir: 'E', anim: 'idle' });
    doo.push({ at: 23.5, cam: { x: -2.6, y: 1.6, z: 0.6, yaw: 0.16, pitch: -0.05, ease: 18 } }, { at: 41, who: 'kael', anim: 'idle_combat' });
    return { set: 'camp', fadeIn: true, actors, cam: { x: -2.6, y: 1.6, z: 0.6, yaw: 0.16, pitch: -0.05 }, beats: [{ do: doo }] };
  }
  window.TowCinemaMenu = Object.assign(window.TowCinemaMenu || {}, { camp, HEROES: Object.keys(SPOTS) });
})();
