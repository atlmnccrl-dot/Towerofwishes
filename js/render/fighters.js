/*
 * Tower of Wishes — fighters layer: cel-shaded anime figures.
 *
 * API (called by core.js):
 *   update(s, dt)       hair and cloth springs
 *   drawUnit(u, s)      draw one fighter at its depth slot
 *   LOOK                per-character appearance table
 *
 * Each figure is a 3D skeleton (metres) projected through V.P, then drawn
 * as tapered shapes in three passes per layer: ink outline, flat base
 * colour, hard-edged shadow on the side away from the light, then a thin
 * rim light. Detail (faces, hair strands) scales with zoom.
 *
 * Canon from the manuscript: Eiryn's long silver-white hair, dark travel-worn
 * outfit with green at the collar; Kael's armour with a shoulder plate and his
 * sword; the broad man's fists; the third man unarmed. Everything else here
 * is a placeholder design (see docs/ART_DIRECTION.md).
 */
(function () {
  'use strict';
  const NS = (window.TowRender = window.TowRender || {});

  const INK = '#0c0808';
  // tone = [base, shadow]
  const LOOK = {
    kael: {
      h: 1.0, w: 1.0, build: 1.0, weapon: 'sword', hair: 'spiky',
      skin: ['#e9c6b0', '#a97f78'], hairC: ['#2b2327', '#141012'],
      body: ['#262a36', '#15171f'], legs: ['#1f2129', '#111217'], boots: ['#3a2d26', '#1d1613'],
      armor: ['#5b6772', '#2d343c'], accent: '#9cc3dd', coat: ['#2a2f3d', '#151820'], eye: '#9cc3dd',
    },
    eiryn: {
      h: 0.94, w: 0.86, build: 0.85, weapon: 'branch', hair: 'long',
      skin: ['#f4dccf', '#c29e98'], hairC: ['#f3eef2', '#a99abb'],
      body: ['#25222c', '#131118'], legs: ['#1d1a22', '#0f0d12'], boots: ['#3b2f2a', '#1c1513'],
      accent: '#4fae7a', skirt: ['#2a2631', '#141218'], eye: '#a98bff',
    },
    brute: {
      h: 1.12, w: 1.5, build: 1.45, weapon: 'fists', hair: 'bald',
      skin: ['#c3906f', '#7f5444'], hairC: ['#3a2a22', '#1c1410'],
      body: ['#4d3326', '#2a1b14'], legs: ['#2e2622', '#171310'], boots: ['#2a201b', '#140f0c'],
      wraps: ['#d9c8b4', '#8f7f70'], accent: '#8e1621', eye: '#e3263a',
    },
    knife: {
      h: 0.98, w: 0.84, build: 0.82, weapon: 'knife', hair: 'messy',
      skin: ['#d8ab8c', '#94675a'], hairC: ['#171214', '#0a0708'],
      body: ['#3a2e2c', '#1d1616'], legs: ['#26201f', '#131010'], boots: ['#2a201c', '#140f0d'],
      scarf: ['#a3192a', '#5a0d17'], accent: '#e3263a', eye: '#e3263a',
    },
    grabber: {
      h: 1.0, w: 1.05, build: 1.05, weapon: 'fists', hair: 'hood',
      skin: ['#d2a283', '#8d6253'], hairC: ['#232019', '#100f0b'],
      body: ['#3e4635', '#20251b'], legs: ['#272820', '#131410'], boots: ['#2a221c', '#15110e'],
      hood: ['#353d2e', '#1a1e16'], accent: '#8e1621', eye: '#e3263a',
    },
    lookout: {
      h: 0.95, w: 0.9, build: 0.9, weapon: 'none', hair: 'short',
      skin: ['#d9b391', '#94705d'], hairC: ['#4a3426', '#22170f'],
      body: ['#4a4d52', '#26282b'], legs: ['#2d2c2c', '#161515'], boots: ['#2d241d', '#15110d'],
      accent: '#8e1621', eye: '#c9b6a6',
    },
  };

  // ------------------------------------------------------------------ pose
  // rel: weapon angle from facing; pitch: weapon elevation; lean; crouch;
  // off: off-hand mode; stance: foot spread multiplier.
  function pose(u, V) {
    const L = LOOK[u.key] || LOOK.kael; // unknown keys draw with a default look
    let rel = 0.75, pitch = 0.5, lean = 0, crouch = 0.03, off = 'guard', stance = 1, twist = 0;
    const a = u.act;
    const intro = V.introPhase;
    switch (u.state) {
      case 'attack':
        if (a.phase === 'windup' || a.phase === 'feint') {
          const k = a.phase === 'feint' ? 1 : Math.min(1, a.t / a.wind);
          const e = k * k * (3 - 2 * k);
          rel = 0.75 + e * 1.75; pitch = 0.5 + e * 0.6; lean = -0.16 * e; crouch = 0.03 + 0.1 * e; twist = -0.5 * e; stance = 1.3;
        } else if (a.phase === 'strike') {
          const k = Math.min(1, a.t / Math.max(0.05, a.A.active));
          rel = 2.5 - k * 4.1; pitch = 0.15; lean = 0.32; crouch = 0.12; twist = 0.6; stance = 1.55;
        } else {
          const k = Math.min(1, a.t / Math.max(0.05, a.A.recover));
          const e = 1 - Math.pow(1 - k, 2);
          rel = -1.6 + e * 2.35; pitch = 0.05 + e * 0.45; lean = 0.28 * (1 - e); crouch = 0.12 - 0.09 * e; twist = 0.6 * (1 - e); stance = 1.5 - 0.5 * e;
        }
        break;
      case 'parry': rel = 0.1; pitch = 1.1; lean = -0.06; crouch = 0.1; stance = 1.4; break;
      case 'dodge': lean = 0.35; crouch = 0.2; stance = 1.6; off = 'out'; break;
      case 'hurt': case 'stagger': rel = 1.8; pitch = -0.3; lean = -0.3; crouch = 0.05; off = 'flail'; break;
      case 'recover': rel = -0.7; pitch = 0.1; lean = 0.18; crouch = 0.08; break;
      case 'circle': rel = 0.6; pitch = 0.6; crouch = 0.1; stance = 1.3; break;
      case 'opener': lean = 0.38; crouch = 0.14; stance = 1.5; rel = 1.6; pitch = 0.2; off = 'back'; break;
      case 'distracted': twist = 1.1; rel = 0.4; pitch = 0.3; break;
      case 'cast': off = 'cast'; lean = 0.1; crouch = 0.05; stance = 1.2; break;
      case 'pickup': crouch = 0.32; lean = 0.25; off = 'down'; break;
    }
    if (u.fleeing || u.beaten) { rel = 2.9; pitch = 1.2; lean = 0.32; crouch = 0.08; off = 'flail'; }
    if (u.drained > 0) { pitch -= 0.6; lean = 0.24; crouch = 0.14; off = 'knee'; }
    if (intro) {
      // Face-off: a signature pose, stronger in the spotlight.
      const k = V.spotlight === u.id ? 1 : 0.55;
      switch (u.key) {
        case 'kael': rel = 0.25; pitch = 1.25 * k + 0.2; crouch = 0.12 * k; stance = 1.5; lean = 0.05; break;
        case 'eiryn': off = 'cast'; lean = -0.12; crouch = 0.04; break;
        case 'brute': off = 'fistup'; rel = 0.6; pitch = 1.0; stance = 1.6; crouch = 0.08 * k; twist = -0.2; break;
        case 'knife': rel = -0.4 + Math.sin(V.time * 9) * 0.5 * k; pitch = 0.3; crouch = 0.2 * k; stance = 1.5; lean = 0.12; break;
        case 'grabber': crouch = 0.24 * k; lean = 0.3; off = 'reach'; rel = 0.3; pitch = 0.1; stance = 1.4; break;
        case 'lookout': twist = 1.3; crouch = 0.06; lean = -0.05; break;
      }
    }
    if (L.weapon === 'fists' && off === 'guard') off = 'fistup';
    return { rel, pitch, lean, crouch, off, stance, twist };
  }

  function create(V) {
    const { ctx } = V;
    const P = V.P;
    const springs = new WeakMap(); // per unit: hair/cloth lag

    function spring(u) {
      let sp = springs.get(u);
      if (!sp) { sp = { hx: 0, hy: 0, cx: 0, cy: 0 }; springs.set(u, sp); }
      return sp;
    }

    function update(s, dt) {
      if (!dt) return;
      for (const u of s.units) {
        const sp = spring(u);
        // Hair and cloth trail opposite to motion, with a little sway.
        const tx = -u.vx * 0.09 - u.kx * 0.05, ty = -u.vy * 0.09 - u.ky * 0.05;
        const k = 1 - Math.pow(0.0008, dt);
        sp.hx += (tx - sp.hx) * k; sp.hy += (ty - sp.hy) * k;
        sp.cx += (tx * 1.3 - sp.cx) * k * 0.8; sp.cy += (ty * 1.3 - sp.cy) * k * 0.8;
      }
    }

    // ---------------------------------------------------------------- shapes
    let lx = -0.55, ly = -0.835, inkW = 2;

    // Tapered segment between two screen points.
    function seg(a, b, wa, wb) {
      const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
      const nx = -dy / l, ny = dx / l;
      return { a, b, wa, wb, nx, ny, kind: 'seg' };
    }
    function pathSeg(sh) {
      const { a, b, wa, wb, nx, ny } = sh;
      ctx.moveTo(a.x + nx * wa, a.y + ny * wa);
      ctx.lineTo(b.x + nx * wb, b.y + ny * wb);
      ctx.arc(b.x, b.y, wb, Math.atan2(ny, nx), Math.atan2(-ny, -nx), false);
      ctx.lineTo(a.x - nx * wa, a.y - ny * wa);
      ctx.arc(a.x, a.y, wa, Math.atan2(-ny, -nx), Math.atan2(ny, nx), false);
      ctx.closePath();
    }
    function pathPoly(pts) {
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
    }
    function pathShape(sh) {
      if (sh.kind === 'seg') pathSeg(sh);
      else if (sh.kind === 'poly') pathPoly(sh.pts);
      else if (sh.kind === 'ell') ctx.ellipse(sh.x, sh.y, sh.rx, sh.ry, sh.rot || 0, 0, Math.PI * 2);
    }
    // The half of a shape that faces away from the light, as a hard cel shadow.
    function pathShadow(sh) {
      if (sh.kind === 'seg') {
        const { a, b, wa, wb } = sh;
        let { nx, ny } = sh;
        if (nx * lx + ny * ly > 0) { nx = -nx; ny = -ny; }
        const f = 0.12;
        ctx.moveTo(a.x + nx * wa * f, a.y + ny * wa * f);
        ctx.lineTo(b.x + nx * wb * f, b.y + ny * wb * f);
        ctx.lineTo(b.x + nx * wb, b.y + ny * wb);
        ctx.lineTo(a.x + nx * wa, a.y + ny * wa);
        ctx.closePath();
      } else if (sh.kind === 'ell') {
        const off = Math.min(sh.rx, sh.ry) * 0.38;
        ctx.save(); ctx.beginPath();
        ctx.ellipse(sh.x, sh.y, sh.rx, sh.ry, sh.rot || 0, 0, Math.PI * 2); ctx.clip();
        ctx.beginPath();
        ctx.ellipse(sh.x - lx * off * 2.2, sh.y - ly * off * 2.2, sh.rx * 1.05, sh.ry * 1.05, sh.rot || 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.beginPath();
      } else if (sh.kind === 'poly' && sh.shadeFrom != null) {
        // shadeFrom: polygon split; first half of points is the lit side
        const pts = sh.pts;
        ctx.moveTo(pts[sh.shadeFrom[0]].x, pts[sh.shadeFrom[0]].y);
        for (const i of sh.shadeFrom.slice(1)) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
      }
    }
    function pathRim(sh) {
      if (sh.kind !== 'seg') return;
      const { a, b, wa, wb } = sh;
      let { nx, ny } = sh;
      if (nx * lx + ny * ly < 0) { nx = -nx; ny = -ny; }
      ctx.moveTo(a.x + nx * wa * 0.78, a.y + ny * wa * 0.78);
      ctx.lineTo(b.x + nx * wb * 0.78, b.y + ny * wb * 0.78);
    }

    // Hit flash: the base colour pushed most of the way to white.
    const lightCache = {};
    function lighten(hex) {
      if (lightCache[hex]) return lightCache[hex];
      const n = parseInt(hex.slice(1), 16);
      const m = (c) => Math.round(c + (255 - c) * 0.7);
      return (lightCache[hex] = `rgb(${m(n >> 16)},${m((n >> 8) & 255)},${m(n & 255)})`);
    }

    // Draw a layer of shapes: ink outline under everything, then fills,
    // shadows and rim light. Shapes: {…geometry, c: [base, shadow], rim}
    function layer(shapes, flash) {
      if (!shapes.length) return;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = inkW * 2;
      for (const sh of shapes) { ctx.beginPath(); pathShape(sh); ctx.stroke(); ctx.fill(); }
      for (const sh of shapes) {
        ctx.fillStyle = flash ? lighten(sh.c[0]) : sh.c[0];
        ctx.beginPath(); pathShape(sh); ctx.fill();
        if (!flash && sh.c[1]) {
          ctx.fillStyle = sh.c[1];
          ctx.beginPath(); pathShadow(sh); ctx.fill();
        }
      }
      if (!flash) {
        ctx.strokeStyle = 'rgba(246,236,232,0.55)'; ctx.lineWidth = Math.max(0.8, inkW * 0.55);
        ctx.beginPath();
        for (const sh of shapes) if (sh.rim !== false) pathRim(sh);
        ctx.stroke();
      }
    }

    // ---------------------------------------------------------------- figure
    function drawUnit(u, s) {
      if (u.fled) return;
      const L = LOOK[u.key] || LOOK.kael; // unknown keys draw with a default look
      const sc = V.cam.sc;
      lx = V.light.sx; ly = V.light.sy;
      inkW = Math.max(1, sc * 0.022);
      V.introPhase = s.phase === 'intro';
      const lying = u.state === 'down' || u.state === 'out';
      V.shadow(u.x, u.y, u.r * 1.3 * (lying ? 1.7 : 1) * L.build ** 0.5, 0.42);
      ctx.globalAlpha = u.state === 'out' ? 0.6 : 1;
      if (lying) drawLying(u, L, sc);
      else drawStanding(u, L, sc);
      ctx.globalAlpha = 1;
    }

    function drawLying(u, L, sc) {
      const f = u.facing, F = [Math.cos(f), Math.sin(f)], Rt = [-F[1], F[0]];
      const H = 1.75 * L.h;
      const W = (x, y, z) => P(u.x + F[0] * x + Rt[0] * y, u.y + F[1] * x + Rt[1] * y, z);
      const head = W(-H * 0.42, 0, 0.14), chest = W(-H * 0.2, 0, 0.16), hip = W(0.05, 0, 0.14);
      const k1 = W(0.3, 0.12, 0.14), k2 = W(0.3, -0.12, 0.24), f1 = W(0.55, 0.15, 0.08), f2 = W(0.5, -0.2, 0.08);
      const hand1 = W(-H * 0.18, 0.4, 0.08), hand2 = W(-H * 0.1, -0.38, 0.08);
      const px = sc * 0.06 * L.build;
      layer([
        { ...seg(hip, k1, px * 1.1, px * 0.9), c: L.legs }, { ...seg(k1, f1, px * 0.9, px * 0.75), c: L.boots },
        { ...seg(hip, k2, px * 1.1, px * 0.9), c: L.legs }, { ...seg(k2, f2, px * 0.9, px * 0.75), c: L.boots },
        { ...seg(chest, hand1, px * 0.7, px * 0.6), c: L.skin }, { ...seg(chest, hand2, px * 0.7, px * 0.6), c: L.skin },
        { ...seg(hip, chest, px * 1.5, px * 1.8), c: L.body },
        { kind: 'ell', x: head.x, y: head.y, rx: sc * 0.12, ry: sc * 0.12, c: L.hair === 'bald' ? L.skin : L.hairC },
      ], false);
    }

    function drawStanding(u, L, sc) {
      const ps = pose(u, V);
      const sp = spring(u);
      const H = 1.78 * L.h;
      const f = u.facing + ps.twist * 0.35;
      const F = [Math.cos(f), Math.sin(f)], Rt = [-F[1], F[0]];
      const W = (x, y, z) => ({ x: u.x + F[0] * x + Rt[0] * y, y: u.y + F[1] * x + Rt[1] * y, z });
      const bob = u.state === 'move' || u.fleeing ? Math.abs(Math.sin(u.walk * 3.2)) * 0.05 : Math.sin((u.walk + u.x) * 0.5 + V.time * 2.2) * 0.008;
      const jitter = u.state === 'hurt' || u.state === 'stagger' ? Math.sin(u.st * 70) * 0.03 : 0;
      const cz = 1 - ps.crouch;
      const bw = 0.215 * L.w;

      // Skeleton (world metres, relative to facing)
      const lean = ps.lean;
      const pelvis = W(0, 0, H * 0.5 * cz + bob);
      const chest = W(lean * 0.55, jitter, H * 0.71 * cz + bob);
      const neck = W(lean * 0.8, jitter, H * 0.82 * cz + bob);
      const headC = W(lean * 0.9 + 0.02, jitter, H * 0.905 * cz + bob);
      const twist = ps.twist * 0.25;
      const shR = W(lean * 0.75 - twist * bw, bw, H * 0.79 * cz + bob);
      const shL = W(lean * 0.75 + twist * bw, -bw, H * 0.79 * cz + bob);
      const hipR = W(0, bw * 0.55, H * 0.5 * cz + bob), hipL = W(0, -bw * 0.55, H * 0.5 * cz + bob);
      // Feet: stride when moving, wide stance when fighting.
      const stride = u.state === 'move' || u.fleeing || u.state === 'opener' ? Math.sin(u.walk * 3.2) * 0.34 : u.state === 'circle' ? Math.sin(u.walk * 3.2) * 0.16 : 0;
      const spread = 0.13 * L.w * ps.stance;
      const footR = W(stride + (ps.stance > 1.2 ? 0.18 : 0), spread, 0);
      const footL = W(-stride - (ps.stance > 1.2 ? 0.16 : 0), -spread, 0);
      const knee = (hip, foot, side) => ({
        x: (hip.x + foot.x) / 2 + F[0] * (0.1 + ps.crouch * 0.5) + Rt[0] * side * 0.03,
        y: (hip.y + foot.y) / 2 + F[1] * (0.1 + ps.crouch * 0.5) + Rt[1] * side * 0.03,
        z: (hip.z + foot.z) / 2 + 0.02,
      });
      const kneeR = knee(hipR, footR, 1), kneeL = knee(hipL, footL, -1);

      // Weapon hand from the attack arc.
      const wa = f + ps.rel, cp = Math.cos(ps.pitch);
      const reach = L.weapon === 'fists' || L.weapon === 'none' ? 0.5 : 0.42;
      const handR = {
        x: shR.x + Math.cos(f + ps.rel * 0.6) * reach + Rt[0] * 0.05,
        y: shR.y + Math.sin(f + ps.rel * 0.6) * reach + Rt[1] * 0.05,
        z: shR.z - 0.22 + ps.pitch * 0.2,
      };
      if (u.state === 'parry') Object.assign(handR, W(0.38, 0.08, H * 0.74 * cz));
      let handL;
      switch (ps.off) {
        case 'fistup': handL = W(0.32, -0.12, H * 0.76 * cz); break;
        case 'cast': handL = W(0.62, -0.1, H * 0.8 * cz); break;
        case 'reach': handL = W(0.6, -0.15, H * 0.6 * cz); break;
        case 'flail': handL = W(-0.1, -0.42, H * (0.8 + Math.sin(V.time * 14) * 0.08) * cz); break;
        case 'back': handL = W(-0.42, -0.22, H * 0.55 * cz); break;
        case 'out': handL = W(0.05, -0.5, H * 0.66 * cz); break;
        case 'down': handL = W(0.5, -0.12, 0.25); break;
        case 'knee': handL = W(0.18, -0.15, H * 0.42 * cz); break;
        default: handL = W(0.26, -0.16, H * 0.6 * cz);
      }
      if (u.state === 'pickup') Object.assign(handR, W(0.45, 0.1, 0.18));
      if (L.weapon === 'fists' && u.state === 'attack' && u.act && u.act.phase !== 'windup' && u.act.phase !== 'feint') {
        // a punch: the fist drives straight along the facing
        const k = u.act.phase === 'strike' ? 1 : Math.max(0, 1 - u.act.t / 0.3);
        Object.assign(handR, W(0.25 + 0.55 * k, 0.05, H * 0.74 * cz));
      }
      const elbow = (sh, hand, side) => ({
        x: (sh.x + hand.x) / 2 + Rt[0] * side * 0.12,
        y: (sh.y + hand.y) / 2 + Rt[1] * side * 0.12,
        z: (sh.z + hand.z) / 2 - 0.08,
      });
      const elR = elbow(shR, handR, 1), elL = elbow(shL, handL, -1);

      const p = (q) => P(q.x, q.y, q.z);
      const S = {
        pelvis: p(pelvis), chest: p(chest), neck: p(neck), head: p(headC),
        shR: p(shR), shL: p(shL), hipR: p(hipR), hipL: p(hipL),
        kneeR: p(kneeR), kneeL: p(kneeL), footR: p(footR), footL: p(footL),
        elR: p(elR), elL: p(elL), handR: p(handR), handL: p(handL),
      };
      const px = sc * 0.082 * L.build; // limb half-width unit
      const headR = sc * H * 0.068;

      // Which side is nearer the camera decides the drawing order.
      const rightNear = S.shR.d > S.shL.d;
      const near = rightNear ? 'R' : 'L', far = rightNear ? 'L' : 'R';
      const leg = (side) => [
        { ...seg(S['hip' + side], S['knee' + side], px * 1.25, px * 0.85), c: L.legs, rim: false },
        { ...seg(S['knee' + side], S['foot' + side], px * 0.85, px * 0.55), c: L.legs, rim: false },
        { ...seg(S['foot' + side], P(...footTip(side)), px * 0.6, px * 0.45), c: L.boots },
      ];
      function footTip(side) {
        const ft = side === 'R' ? footR : footL;
        return [ft.x + F[0] * 0.14, ft.y + F[1] * 0.14, 0.02];
      }
      const armColor = L.coat || L.body;
      const arm = (side) => {
        const hand = S['hand' + side];
        const out = [
          { ...seg(S['sh' + side], S['el' + side], px * 0.8, px * 0.65), c: u.key === 'brute' ? L.skin : armColor, rim: false },
          { ...seg(S['el' + side], hand, px * 0.65, px * 0.5), c: L.wraps ? L.wraps : u.key === 'brute' ? L.skin : armColor, rim: false },
          { kind: 'ell', x: hand.x, y: hand.y, rx: px * (L.weapon === 'fists' ? 0.95 : 0.55), ry: px * (L.weapon === 'fists' ? 0.9 : 0.5), c: L.wraps || L.skin, rim: false },
        ];
        return out;
      };

      // Back layer: far leg, far arm, hair behind, cloth behind.
      const back = [];
      const hairTail = hairTailPoints(u, L, S, F, headC, sp, H, cz);
      if (L.hair === 'long') back.push(hairTail.shape);
      if (L.coat) back.push(coatTail(L, pelvis, F, Rt, sp, H, cz, px));
      back.push(...leg(far));
      back.push(...arm(far));
      layer(back, u.flash > 0);
      if (far === 'R') drawWeapon(u, L, S, f, ps, handR, wa, cp, sc, px);

      // Body layer: near leg, torso, head.
      const body = [];
      body.push(...leg(near));
      if (L.skirt) body.push(skirt(L, pelvis, F, Rt, sp, H, cz));
      // Torso: wide at the shoulders, narrow at the waist.
      const torso = [S.shL, S.shR, P((hipR.x + pelvis.x) / 2 + Rt[0] * 0.05, (hipR.y + pelvis.y) / 2 + Rt[1] * 0.05, pelvis.z + 0.04), P((hipL.x + pelvis.x) / 2 - Rt[0] * 0.05, (hipL.y + pelvis.y) / 2 - Rt[1] * 0.05, pelvis.z + 0.04)];
      const lightRight = (S.shR.x - S.shL.x) * lx + (S.shR.y - S.shL.y) * ly > 0;
      const midTop = { x: (S.shL.x + S.shR.x) / 2, y: (S.shL.y + S.shR.y) / 2 }, midBot = { x: (torso[2].x + torso[3].x) / 2, y: (torso[2].y + torso[3].y) / 2 };
      body.push({ kind: 'poly', pts: torso, c: L.body });
      body.push({ ...seg(S.pelvis, S.chest, px * 1.25, px * 1.55), c: L.body, rim: true });
      layer(body, u.flash > 0);
      // Torso cel shadow: the half away from the light.
      if (!(u.flash > 0)) {
        ctx.fillStyle = L.body[1];
        ctx.beginPath();
        if (lightRight) pathPoly([midTop, torso[0], torso[3], midBot]); else pathPoly([midTop, torso[1], torso[2], midBot]);
        ctx.fill();
      }
      drawCostume(u, L, S, F, Rt, sc, px, shR, shL, pelvis, chest, H, cz, lightRight);
      drawHead(u, L, S, F, sc, headR, hairTail, lightRight);

      // Front layer: near arm and the weapon.
      if (far === 'L') drawWeapon(u, L, S, f, ps, handR, wa, cp, sc, px);
      layer(arm(near), u.flash > 0);
    }

    function hairTailPoints(u, L, S, F, headC, sp, H, cz) {
      // Long hair hangs from the back of the head and trails behind motion.
      const back = { x: headC.x - F[0] * 0.08, y: headC.y - F[1] * 0.08, z: headC.z + 0.02 };
      const tip = { x: back.x - F[0] * 0.16 + sp.hx * 1.6, y: back.y - F[1] * 0.16 + sp.hy * 1.6, z: H * 0.46 * cz };
      const mid = { x: (back.x + tip.x) / 2 - F[0] * 0.06, y: (back.y + tip.y) / 2 - F[1] * 0.06, z: (back.z + tip.z) / 2 };
      const pb = P(back.x, back.y, back.z), pm = P(mid.x, mid.y, mid.z), pt = P(tip.x, tip.y, tip.z);
      const w = V.cam.sc * 0.17;
      const shape = { kind: 'poly', pts: [
        { x: pb.x - w, y: pb.y }, { x: pm.x - w * 0.95, y: pm.y }, { x: pt.x - w * 0.25, y: pt.y }, { x: pt.x + w * 0.25, y: pt.y + 2 },
        { x: pm.x + w * 0.95, y: pm.y }, { x: pb.x + w, y: pb.y },
      ], c: L.hairC, shadeFrom: [0, 1, 2, 3] };
      return { shape, pb, pm, pt };
    }

    function coatTail(L, pelvis, F, Rt, sp, H, cz, px) {
      const top = (side) => P(pelvis.x + Rt[0] * side * 0.16 - F[0] * 0.05, pelvis.y + Rt[1] * side * 0.16 - F[1] * 0.05, pelvis.z + 0.05);
      const bot = (side) => P(pelvis.x + Rt[0] * side * 0.2 - F[0] * 0.2 + sp.cx, pelvis.y + Rt[1] * side * 0.2 - F[1] * 0.2 + sp.cy, H * 0.16 * cz);
      return { kind: 'poly', pts: [top(-1), top(1), bot(1), bot(-1)], c: L.coat, shadeFrom: [1, 2, 3] };
    }

    function skirt(L, pelvis, F, Rt, sp, H, cz) {
      const at = (side, fwd, z, lag) => P(pelvis.x + Rt[0] * side + F[0] * fwd + sp.cx * lag, pelvis.y + Rt[1] * side + F[1] * fwd + sp.cy * lag, z);
      return { kind: 'poly', pts: [at(-0.15, 0, pelvis.z + 0.06, 0), at(0.15, 0, pelvis.z + 0.06, 0), at(0.24, 0.05, H * 0.27 * cz, 1), at(-0.24, 0.05, H * 0.27 * cz, 1)], c: L.skirt, shadeFrom: [1, 2, 3] };
    }

    function drawCostume(u, L, S, F, Rt, sc, px, shR, shL, pelvis, chest, H, cz, lightRight) {
      const big = sc > 70;
      // Belt line
      ctx.strokeStyle = INK; ctx.lineWidth = inkW;
      const bl = P(pelvis.x - Rt[0] * 0.17, pelvis.y - Rt[1] * 0.17, pelvis.z + 0.07), br = P(pelvis.x + Rt[0] * 0.17, pelvis.y + Rt[1] * 0.17, pelvis.z + 0.07);
      ctx.beginPath(); ctx.moveTo(bl.x, bl.y); ctx.lineTo(br.x, br.y); ctx.stroke();
      if (u.key === 'kael') {
        // Shoulder plate on the left shoulder, chest plate edge.
        const sp0 = P(shL.x, shL.y, shL.z + 0.05);
        layer([{ kind: 'ell', x: sp0.x, y: sp0.y, rx: px * 2.0, ry: px * 1.5, rot: -0.3, c: L.armor }], u.flash > 0);
        const c1 = P(chest.x + F[0] * 0.1, chest.y + F[1] * 0.1, chest.z + 0.02);
        ctx.strokeStyle = L.accent; ctx.lineWidth = Math.max(1, inkW * 0.9);
        ctx.beginPath(); ctx.moveTo(S.shL.x, S.shL.y + px); ctx.lineTo(c1.x, c1.y); ctx.lineTo(S.shR.x, S.shR.y + px); ctx.stroke();
        // Sword strap across the chest.
        ctx.strokeStyle = '#3a2d26'; ctx.lineWidth = Math.max(1.5, px * 0.5);
        ctx.beginPath(); ctx.moveTo(S.shL.x, S.shL.y); ctx.lineTo(br.x, br.y); ctx.stroke();
      } else if (u.key === 'eiryn') {
        // Green ornamentation at the collar, and the ornament itself.
        const n = S.neck;
        ctx.strokeStyle = L.accent; ctx.lineWidth = Math.max(1.2, px * 0.45);
        ctx.beginPath(); ctx.moveTo(S.shL.x * 0.6 + n.x * 0.4, S.shL.y * 0.6 + n.y * 0.4 + px * 0.3); ctx.lineTo(n.x, n.y + px * 1.1); ctx.lineTo(S.shR.x * 0.6 + n.x * 0.4, S.shR.y * 0.6 + n.y * 0.4 + px * 0.3); ctx.stroke();
        ctx.fillStyle = '#7fe0a8'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.8, inkW * 0.6);
        ctx.beginPath(); ctx.arc(n.x, n.y + px * 1.3, Math.max(1.5, px * 0.38), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      } else if (u.key === 'knife') {
        // Red scarf with a tail that trails.
        const sp = spring(u);
        const n = S.neck, tail = P(chest.x - F[0] * 0.25 + sp.hx * 2, chest.y - F[1] * 0.25 + sp.hy * 2, H * 0.62 * cz);
        layer([{ ...seg(n, tail, px * 1.1, px * 0.4), c: L.scarf }, { kind: 'ell', x: n.x, y: n.y + px * 0.5, rx: px * 1.5, ry: px * 0.9, c: L.scarf, rim: false }], u.flash > 0);
      } else if (u.key === 'brute') {
        // Bare, heavy arms are drawn in the arm pass; a red sash marks him as a bandit.
        ctx.strokeStyle = L.accent; ctx.lineWidth = Math.max(1.5, px * 0.7);
        ctx.beginPath(); ctx.moveTo(bl.x, bl.y); ctx.lineTo(br.x, br.y); ctx.stroke();
      } else if (u.key === 'grabber' || u.key === 'lookout') {
        ctx.strokeStyle = L.accent; ctx.lineWidth = Math.max(1, px * 0.4);
        ctx.beginPath(); ctx.moveTo(bl.x, bl.y); ctx.lineTo(br.x, br.y); ctx.stroke();
      }
      if (big) {
        // Cloth fold lines at close zoom.
        ctx.strokeStyle = 'rgba(12,8,8,0.55)'; ctx.lineWidth = Math.max(1, inkW * 0.6);
        ctx.beginPath();
        ctx.moveTo(S.chest.x, S.chest.y); ctx.lineTo(S.pelvis.x + (lightRight ? -px : px), S.pelvis.y);
        ctx.stroke();
      }
    }

    function drawHead(u, L, S, F, sc, r, hairTail, lightRight) {
      const h = S.head;
      // Facing on screen: a point ahead of the head.
      const ahead = P(u.x + F[0] * 0.3, u.y + F[1] * 0.3, 0), base = P(u.x, u.y, 0);
      let fx = ahead.x - base.x, fy = ahead.y - base.y;
      const fl = Math.hypot(fx, fy) || 1; fx /= fl; fy /= fl;
      const towardCam = ahead.d > base.d; // face visible
      const flash = u.flash > 0;
      // Neck
      layer([{ ...seg(S.neck, { x: h.x, y: h.y + r * 0.4 }, r * 0.32, r * 0.3), c: L.skin, rim: false }], flash);
      // Head: slightly tall, chin toward the facing side.
      const chin = { x: h.x + fx * r * 0.35, y: h.y + r * 0.95 };
      ctx.lineJoin = 'round';
      const headPath = () => {
        ctx.beginPath();
        ctx.ellipse(h.x, h.y, r * 0.92, r, 0, 0, Math.PI * 2);
        ctx.moveTo(h.x - r * 0.6, h.y + r * 0.45);
        ctx.quadraticCurveTo(chin.x - r * 0.3, chin.y, chin.x, chin.y);
        ctx.quadraticCurveTo(chin.x + r * 0.3, chin.y - r * 0.1, h.x + r * 0.62, h.y + r * 0.45);
      };
      ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = inkW * 2;
      headPath(); ctx.stroke(); ctx.fill();
      ctx.fillStyle = flash ? lighten(L.skin[0]) : L.skin[0]; headPath(); ctx.fill();
      if (!flash) {
        // Face shadow on the side away from the light.
        ctx.save(); headPath(); ctx.clip();
        ctx.fillStyle = L.skin[1];
        ctx.beginPath(); ctx.ellipse(h.x - lx * r * 0.95, h.y - ly * r * 0.5, r * 0.85, r * 1.2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      // Eyes at close zoom when the face is toward us.
      if (towardCam && sc > 55 && !flash) {
        const ex = h.x + fx * r * 0.42, ey = h.y + r * 0.12;
        const gap = r * 0.36, ew = Math.max(1.5, r * 0.2), eh = Math.max(1, r * 0.1);
        ctx.fillStyle = INK;
        for (const sgn of [-1, 1]) {
          const x = ex + sgn * gap * Math.abs(fy) * 0.9;
          ctx.beginPath(); ctx.ellipse(x, ey, ew, eh, sgn * -0.25, 0, Math.PI * 2); ctx.fill();
          if (sc > 90) {
            ctx.fillStyle = L.eye; ctx.beginPath(); ctx.ellipse(x + fx * ew * 0.2, ey, ew * 0.45, eh * 0.95, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + fx * ew * 0.35, ey - eh * 0.35, Math.max(0.8, eh * 0.35), 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = INK;
          }
        }
        // brows
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, r * 0.08);
        ctx.beginPath();
        ctx.moveTo(ex - gap - ew, ey - eh * 3.2); ctx.lineTo(ex - gap * 0.3, ey - eh * 2.2);
        ctx.moveTo(ex + gap + ew, ey - eh * 3.2); ctx.lineTo(ex + gap * 0.3, ey - eh * 2.2);
        ctx.stroke();
      }
      drawHair(u, L, h, r, fx, fy, towardCam, flash, hairTail);
    }

    function drawHair(u, L, h, r, fx, fy, towardCam, flash, hairTail) {
      if (L.hair === 'bald') {
        if (!flash) { ctx.fillStyle = 'rgba(20,14,12,0.35)'; ctx.beginPath(); ctx.ellipse(h.x - fx * r * 0.2, h.y - r * 0.35, r * 0.8, r * 0.5, 0, Math.PI, 0); ctx.fill(); }
        return;
      }
      const c = flash ? [lighten(L.hairC[0]), lighten(L.hairC[0])] : L.hairC;
      // Hair mass sits on top and toward the back of the head (away from the face).
      const bx = h.x - fx * r * 0.25, by = h.y - r * 0.28;
      const spikes = L.hair === 'spiky' ? 7 : L.hair === 'messy' ? 8 : L.hair === 'long' ? 9 : 6;
      const hood = L.hair === 'hood';
      const pts = [];
      for (let i = 0; i <= spikes; i++) {
        const a = Math.PI + (i / spikes) * Math.PI; // across the top
        const spike = L.hair === 'short' || L.hair === 'long' || hood ? 1.0 : i % 2 ? 1.0 : 1.32;
        const rr = r * (hood ? 1.2 : 1.05) * spike;
        pts.push({ x: bx + Math.cos(a) * rr, y: by + Math.sin(a) * rr * 0.95 });
      }
      // Bangs falling over the forehead on the face side.
      const bangs = [];
      if (!hood) {
        const n = 4;
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n;
          const x = h.x - r * 0.95 + t * r * 1.9 + fx * r * 0.2;
          bangs.push({ x, y: h.y - r * 0.6 }, { x: x + fx * r * 0.18 + (i % 2 ? 2 : -2), y: h.y + (towardCam ? -r * 0.05 : r * 0.2) + (i % 2) * r * 0.15 });
        }
      }
      ctx.lineJoin = 'miter';
      const massPath = () => {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y + r * (hood ? 0.9 : 0.35));
        for (const q of pts) ctx.lineTo(q.x, q.y);
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y + r * (hood ? 0.9 : 0.35));
        if (!hood) for (let i = bangs.length - 1; i >= 0; i -= 2) { ctx.lineTo(bangs[i].x, bangs[i].y); ctx.lineTo(bangs[i - 1].x, bangs[i - 1].y); }
        ctx.closePath();
      };
      ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = inkW * 2;
      massPath(); ctx.stroke(); ctx.fill();
      ctx.fillStyle = c[0]; massPath(); ctx.fill();
      if (!flash) {
        ctx.save(); massPath(); ctx.clip();
        ctx.fillStyle = c[1];
        ctx.beginPath(); ctx.ellipse(bx - lx * r * 1.1, by - ly * r * 0.6 + r * 0.3, r * 1.1, r * 1.0, 0, 0, Math.PI * 2); ctx.fill();
        // A glossy highlight band, anime style.
        if (V.cam.sc > 45) {
          ctx.strokeStyle = L.hair === 'long' ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.22)';
          ctx.lineWidth = Math.max(1, r * 0.12);
          ctx.beginPath(); ctx.arc(bx + lx * r * 0.2, by + r * 0.05, r * 0.7, Math.PI * 1.15, Math.PI * 1.55); ctx.stroke();
        }
        ctx.restore();
      }
      if (L.hair === 'long' && V.cam.sc > 45 && !flash) {
        // Strand lines down the long hair.
        const t = hairTail;
        ctx.strokeStyle = 'rgba(120,104,140,0.7)'; ctx.lineWidth = Math.max(0.8, r * 0.07);
        ctx.beginPath();
        for (const o of [-0.5, 0, 0.5]) {
          ctx.moveTo(t.pb.x + o * r, t.pb.y); ctx.quadraticCurveTo(t.pm.x + o * r * 1.1, t.pm.y, t.pt.x + o * r * 0.3, t.pt.y);
        }
        ctx.stroke();
      }
    }

    function drawWeapon(u, L, S, f, ps, handR, wa, cp, sc, px) {
      if (L.weapon === 'fists' || L.weapon === 'none') return;
      if (L.weapon === 'branch' && !u.armed) return;
      const len = { sword: 1.1, branch: 1.05, knife: 0.36 }[L.weapon];
      let tip = { x: handR.x + Math.cos(wa) * len * cp, y: handR.y + Math.sin(wa) * len * cp, z: handR.z + Math.sin(ps.pitch) * len };
      if (u.state === 'parry') {
        const Rt = [-Math.sin(f), Math.cos(f)];
        tip = { x: handR.x - Rt[0] * len * 0.9, y: handR.y - Rt[1] * len * 0.9, z: handR.z + 0.38 };
      }
      const h = S.handR, t = P(tip.x, tip.y, tip.z);
      if (L.weapon === 'branch') {
        layer([{ ...seg(h, t, px * 0.55, px * 0.32), c: ['#6b4c33', '#3a281a'] }], u.flash > 0);
        // a twig
        const m = { x: h.x + (t.x - h.x) * 0.6, y: h.y + (t.y - h.y) * 0.6 };
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, px * 0.3);
        ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x + (t.y - h.y) * 0.12, m.y - (t.x - h.x) * 0.12); ctx.stroke();
        return;
      }
      // Blade: a long tapered sliver with a bright edge.
      const dx = t.x - h.x, dy = t.y - h.y, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      const bw = Math.max(1.5, px * (L.weapon === 'sword' ? 0.42 : 0.38));
      const g = { x: h.x + dx * 0.1, y: h.y + dy * 0.1 };
      ctx.lineJoin = 'miter';
      const blade = () => { ctx.beginPath(); ctx.moveTo(g.x + nx * bw, g.y + ny * bw); ctx.lineTo(t.x, t.y); ctx.lineTo(g.x - nx * bw, g.y - ny * bw); ctx.closePath(); };
      ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = inkW * 1.6; blade(); ctx.stroke(); ctx.fill();
      ctx.fillStyle = '#c9d2da'; blade(); ctx.fill();
      ctx.fillStyle = '#6d7782';
      ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(t.x, t.y); ctx.lineTo(g.x - nx * bw, g.y - ny * bw); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(0.8, bw * 0.3);
      ctx.beginPath(); ctx.moveTo(g.x + nx * bw * 0.5, g.y + ny * bw * 0.5); ctx.lineTo(t.x, t.y); ctx.stroke();
      if (L.weapon === 'sword') {
        // cross-guard and grip
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, px * 0.75); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(g.x + nx * bw * 3, g.y + ny * bw * 3); ctx.lineTo(g.x - nx * bw * 3, g.y - ny * bw * 3); ctx.stroke();
        ctx.strokeStyle = '#8a8f96'; ctx.lineWidth = Math.max(1, px * 0.4);
        ctx.beginPath(); ctx.moveTo(g.x + nx * bw * 2.6, g.y + ny * bw * 2.6); ctx.lineTo(g.x - nx * bw * 2.6, g.y - ny * bw * 2.6); ctx.stroke();
      }
    }

    return { update, drawUnit, LOOK };
  }

  NS.fighters = { create, LOOK, pose };
})();
