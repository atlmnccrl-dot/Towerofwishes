// BLACKLINE — the ground in line art, seen from above at an angle: stippled relief lit from
// the north-west, dotted contour lines, roads, a stream, trenches, wire, rocks, extruded ruins
// and woods (a canopy layer drawn over the units). Pre-rendered once per battle; craters are
// stamped in as they happen. Also the weather: rain, drifting dot clouds, lightning, wind loops.
(function () {
  const BL = window.BL;
  const { R, PAL, clamp, heightAt } = BL;
  const { sx, sy, hash, K, HZ } = BL.render;
  const F = BL.MAPF;

  const T = { field: null, ground: null, canopy: null, s: 0.8, oy: 0, wx: null };
  const WX = {
    wind: 0.4, gust: 0, gustT: 3, gustTarget: 0, flash: 0, bolt: null, boltT: 0, nextBolt: 5,
    drops: [], splashes: [], loops: [], rainMul: 1, windBase: 0.32, bolts: [5, 15], onThunder: null, clouds: null,
  };

  // ---------------------------------------------------------------- build

  function build(field) {
    T.field = field;
    T.s = R.mobile ? 0.62 : 0.8;
    let hmax = 0;
    for (const h of field.hgt) hmax = Math.max(hmax, h);
    T.oy = hmax * HZ + 30;
    const s = T.s;
    const cw = Math.ceil(field.W * s), ch = Math.ceil((field.H * K + T.oy + 20) * s);
    T.ground = canvas(cw, ch);
    T.canopy = canvas(cw, ch);
    const g = T.ground.getContext('2d');
    const c = T.canopy.getContext('2d');
    g.fillStyle = PAL.bg; g.fillRect(0, 0, cw, ch);
    const P = (x, y, h) => [x * s, (y * K - (h == null ? heightAt(field, x, y) : h) * HZ + T.oy) * s];
    const rnd = BL.rng(field.spec.seed * 5 + 3);

    stipple(g, field, P, rnd);
    contours(g, field, P);
    for (const rd of field.spec.roads || []) road(g, field, P, rd.pts);
    if (field.spec.stream) stream(g, field, P, field.spec.stream);
    for (const t of field.spec.trenches || []) trench(g, field, P, t.pts);
    for (const w of field.spec.wire || []) wire(g, field, P, w.pts);
    for (const r of field.rocks) rock(g, field, P, r);
    bases(g, field, P);
    woods(g, c, field, P, rnd);
    const ruins = field.ruins.slice().sort((a, b) => a.y - b.y);
    for (const ru of ruins) ruin(g, field, P, ru);
    T.P = P;
    T.stamped = 0;
    if (!WX.clouds) WX.clouds = buildClouds(17, 640, 360);
    WX.drops = []; WX.loops = [];
  }

  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  // Relief as halftone: slopes facing the light get dots, slopes facing away stay black.
  function stipple(g, f, P, rnd) {
    const C = BL.CELL, s = T.s;
    const lx = -0.7071, ly = -0.7071;
    const buckets = [[], [], []];
    for (let j = 1; j < f.ny - 1; j++) for (let i = 1; i < f.nx - 1; i++) {
      const gx = (f.hgt[j * f.nx + i + 1] - f.hgt[j * f.nx + i - 1]) / (2 * C);
      const gy = (f.hgt[(j + 1) * f.nx + i] - f.hgt[(j - 1) * f.nx + i]) / (2 * C);
      const lit = -(gx * lx + gy * ly);
      const slope = Math.hypot(gx, gy);
      let dens = 0.14 + lit * 9 + slope * 1.6;
      if (f.flag[j * f.nx + i] & F.WATER) dens = 0.02;
      dens = clamp(dens, 0, 1.2);
      const n = Math.floor(dens * 5 * s * s * 2.2 + rnd());
      for (let k = 0; k < n; k++) {
        const x = (i + rnd() - 0.5) * C, y = (j + rnd() - 0.5) * C;
        const b = dens > 0.75 ? 2 : dens > 0.35 ? 1 : 0;
        buckets[b].push(P(x, y));
      }
    }
    const al = [0.34, 0.52, 0.75];
    buckets.forEach((pts, b) => {
      g.fillStyle = `rgba(235,228,210,${al[b]})`;
      for (const p of pts) g.fillRect(Math.round(p[0]), Math.round(p[1]), 1, 1);
    });
  }

  // Dotted contour lines by marching squares; every third line is brighter.
  function contours(g, f, P) {
    const C = BL.CELL;
    let hmin = 1e9, hmax = -1e9;
    for (const h of f.hgt) { hmin = Math.min(hmin, h); hmax = Math.max(hmax, h); }
    const step = 9;
    for (let lev = Math.ceil(hmin / step) * step, li = 0; lev < hmax; lev += step, li++) {
      const major = Math.round(lev / step) % 3 === 0;
      g.fillStyle = major ? 'rgba(235,228,210,0.78)' : 'rgba(235,228,210,0.36)';
      const sz = major ? 1.4 : 1;
      for (let j = 0; j < f.ny - 1; j++) for (let i = 0; i < f.nx - 1; i++) {
        const a = f.hgt[j * f.nx + i], b = f.hgt[j * f.nx + i + 1], c = f.hgt[(j + 1) * f.nx + i + 1], d = f.hgt[(j + 1) * f.nx + i];
        const idx = (a > lev ? 8 : 0) | (b > lev ? 4 : 0) | (c > lev ? 2 : 0) | (d > lev ? 1 : 0);
        if (idx === 0 || idx === 15) continue;
        const x0 = i * C, y0 = j * C;
        const e = {
          t: [x0 + C * (lev - a) / (b - a), y0], r: [x0 + C, y0 + C * (lev - b) / (c - b)],
          b: [x0 + C * (lev - d) / (c - d), y0 + C], l: [x0, y0 + C * (lev - a) / (d - a)],
        };
        const segs = {
          1: ['l', 'b'], 2: ['b', 'r'], 3: ['l', 'r'], 4: ['t', 'r'], 5: ['l', 't', 'b', 'r'], 6: ['t', 'b'], 7: ['l', 't'],
          8: ['l', 't'], 9: ['t', 'b'], 10: ['t', 'r', 'l', 'b'], 11: ['t', 'r'], 12: ['l', 'r'], 13: ['b', 'r'], 14: ['l', 'b'],
        }[idx];
        for (let k = 0; k < segs.length; k += 2) {
          const p = e[segs[k]], q = e[segs[k + 1]];
          const A = P(p[0], p[1], lev), B = P(q[0], q[1], lev);
          const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
          const gap = major ? 2.4 : 3.2;
          for (let t = (hash(i * 7 + j * 13 + lev) * gap); t < L; t += gap) {
            g.fillRect(A[0] + (B[0] - A[0]) * t / L, A[1] + (B[1] - A[1]) * t / L, sz, sz);
          }
        }
      }
    }
  }

  function along(pts, stepU, fn) {
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
      const L = Math.hypot(bx - ax, by - ay);
      const nx = -(by - ay) / L, ny = (bx - ax) / L;
      for (let t = 0; t < L; t += stepU) fn(ax + (bx - ax) * t / L, ay + (by - ay) * t / L, nx, ny, t);
    }
  }

  function road(g, f, P, pts) {
    g.fillStyle = 'rgba(235,228,210,0.42)';
    along(pts, 4, (x, y, nx, ny, t) => {
      if (Math.floor(t / 10) % 3 === 2) return;
      for (const o of [-11, 11]) { const p = P(x + nx * o, y + ny * o); g.fillRect(p[0], p[1], 1.2, 1.2); }
    });
    g.fillStyle = 'rgba(235,228,210,0.14)';
    along(pts, 7, (x, y, nx, ny) => { const o = (hash(x + y) - 0.5) * 16; const p = P(x + nx * o, y + ny * o); g.fillRect(p[0], p[1], 1, 1); });
  }

  function stream(g, f, P, st) {
    // banks as dotted lines, water as long thin flow strokes
    g.fillStyle = 'rgba(235,228,210,0.5)';
    along(st.pts, 3.5, (x, y, nx, ny) => {
      for (const o of [-st.w / 2, st.w / 2]) {
        const near = (st.fords || []).some((fo) => Math.hypot(fo[0] - x, fo[1] - y) < 46);
        if (near) continue;
        const p = P(x + nx * o, y + ny * o); g.fillRect(p[0], p[1], 1.3, 1.3);
      }
    });
    g.strokeStyle = 'rgba(235,228,210,0.22)';
    g.lineWidth = 0.8;
    for (let k = -2; k <= 2; k++) {
      g.beginPath();
      let pen = false;
      along(st.pts, 6, (x, y, nx, ny, t) => {
        const o = k * st.w * 0.17 + Math.sin(t * 0.05 + k) * 2;
        const p = P(x + nx * o, y + ny * o);
        if (Math.floor((t + k * 23) / 26) % 2) { pen = false; return; }
        if (!pen) { g.moveTo(p[0], p[1]); pen = true; } else g.lineTo(p[0], p[1]);
      });
      g.stroke();
    }
    for (const fo of st.fords || []) {
      g.fillStyle = 'rgba(235,228,210,0.3)';
      for (let k = 0; k < 40; k++) { const a = hash(k + fo[0]) * 6.28, r = hash(k * 3 + fo[1]) * 40; const p = P(fo[0] + Math.cos(a) * r, fo[1] + Math.sin(a) * r); g.fillRect(p[0], p[1], 1, 1); }
    }
  }

  function trench(g, f, P, pts) {
    g.strokeStyle = 'rgba(235,228,210,0.75)';
    g.lineWidth = 1;
    for (const side of [-1, 1]) {
      g.beginPath();
      let first = true;
      along(pts, 6, (x, y, nx, ny, t) => {
        const zig = (Math.floor(t / 12) % 2 ? 1 : -1) * 2.5;
        const p = P(x + nx * (side * 5 + zig), y + ny * (side * 5 + zig));
        if (first) { g.moveTo(p[0], p[1]); first = false; } else g.lineTo(p[0], p[1]);
      });
      g.stroke();
    }
    // sandbags along the lip
    g.fillStyle = 'rgba(235,228,210,0.55)';
    along(pts, 5, (x, y, nx, ny) => { const p = P(x + nx * 9, y + ny * 9); g.fillRect(p[0] - 1, p[1] - 1, 2.2, 1.6); });
  }

  function wire(g, f, P, pts) {
    g.strokeStyle = 'rgba(235,228,210,0.45)';
    g.lineWidth = 0.8;
    g.beginPath();
    along(pts, 7, (x, y) => {
      const a = P(x - 3, y - 3), b = P(x + 3, y + 3), c2 = P(x + 3, y - 3), d = P(x - 3, y + 3);
      g.moveTo(a[0], a[1] - 3); g.lineTo(b[0], b[1] - 3); g.moveTo(c2[0], c2[1] - 3); g.lineTo(d[0], d[1] - 3);
    });
    g.stroke();
  }

  function rock(g, f, P, r) {
    const rr = BL.rng(r.seed);
    const pts = [];
    for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283; const k = r.s * (0.7 + rr() * 0.5); pts.push(P(r.x + Math.cos(a) * k, r.y + Math.sin(a) * k * 0.8, heightAt(f, r.x, r.y) + 3 + Math.sin(a) * 2)); }
    g.fillStyle = '#060606';
    g.strokeStyle = 'rgba(235,228,210,0.6)';
    g.lineWidth = 0.9;
    g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill(); g.stroke();
  }

  function bases(g, f, P) {
    f.bases.forEach((b, team) => {
      g.strokeStyle = team === 0 ? 'rgba(235,228,210,0.5)' : 'rgba(184,67,58,0.5)';
      g.lineWidth = 1;
      // a ring of sandbags and three tents
      g.beginPath();
      for (let i = 0; i <= 40; i++) {
        if (i % 5 === 4) continue;
        const a = i / 40 * 6.283;
        const p = P(b.x + Math.cos(a) * 90, b.y + Math.sin(a) * 90);
        i % 5 === 0 ? g.moveTo(p[0], p[1]) : g.lineTo(p[0], p[1]);
      }
      g.stroke();
      for (let k = 0; k < 3; k++) {
        const tx = b.x + (k - 1) * 34, ty = b.y - 30 + (k % 2) * 26;
        const h = heightAt(f, tx, ty);
        const a = P(tx - 10, ty, h), c = P(tx + 10, ty, h), top = P(tx, ty, h + 11);
        g.fillStyle = '#050505';
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(top[0], top[1]); g.lineTo(c[0], c[1]); g.closePath(); g.fill(); g.stroke();
      }
    });
  }

  // Trees: trunk marks on the ground, crowns on the canopy layer (over the units).
  function woods(g, c, f, P, rnd) {
    const C = BL.CELL;
    const trees = [];
    for (let j = 0; j < f.ny; j++) for (let i = 0; i < f.nx; i++) {
      if (!(f.flag[j * f.nx + i] & F.WOOD)) continue;
      if (rnd() > 0.55) continue;
      trees.push({ x: (i + rnd() - 0.5) * C, y: (j + rnd() - 0.5) * C, r: 6 + rnd() * 6, k: rnd() });
    }
    trees.sort((a, b) => a.y - b.y);
    g.fillStyle = 'rgba(235,228,210,0.3)';
    c.lineWidth = 0.9;
    for (const t of trees) {
      const h = heightAt(f, t.x, t.y);
      const base = P(t.x, t.y, h);
      g.fillRect(base[0], base[1], 1.2, 1.2);
      const top = P(t.x, t.y, h + 14 + t.r);
      // crown: an irregular loop with a few dots inside
      c.fillStyle = 'rgba(4,4,4,0.9)';
      c.strokeStyle = `rgba(235,228,210,${0.45 + t.k * 0.3})`;
      c.beginPath();
      const n = 9;
      for (let k = 0; k <= n; k++) {
        const a = k / n * 6.283;
        const rr = t.r * T.s * (0.8 + hash(t.x + k * 3.1) * 0.35);
        const px = top[0] + Math.cos(a) * rr, py = top[1] + Math.sin(a) * rr * 0.8;
        k ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.closePath(); c.fill(); c.stroke();
      c.fillStyle = 'rgba(235,228,210,0.5)';
      for (let k = 0; k < 4; k++) c.fillRect(top[0] + (hash(t.y + k) - 0.6) * t.r * T.s, top[1] + (hash(t.x + k * 2) - 0.6) * t.r * T.s * 0.7, 1, 1);
      // trunk line from the ground up to the crown
      c.strokeStyle = 'rgba(235,228,210,0.35)';
      c.beginPath(); c.moveTo(base[0], base[1]); c.lineTo(top[0], top[1] + t.r * T.s * 0.7); c.stroke();
    }
  }

  // Broken walls standing up from the footprint, lit edges, rubble around.
  function ruin(g, f, P, ru) {
    const rr = BL.rng(ru.seed);
    const h0 = heightAt(f, ru.x, ru.y);
    const cs = ru.corners;
    const walls = [];
    for (let i = 0; i < 4; i++) {
      const a = cs[i], b = cs[(i + 1) % 4];
      const nyv = (b[0] - a[0]);   // outward normal's y component sign tells front/back
      walls.push({ a, b, front: nyv < 0, hTop: 10 + rr() * 8, broken: rr() < 0.4 });
    }
    walls.sort((p, q) => (p.front ? 1 : 0) - (q.front ? 1 : 0));
    for (const w of walls) {
      const steps = 6;
      const top = [], bot = [];
      for (let k = 0; k <= steps; k++) {
        const t = k / steps;
        const x = w.a[0] + (w.b[0] - w.a[0]) * t, y = w.a[1] + (w.b[1] - w.a[1]) * t;
        let hh = w.hTop * (0.6 + 0.4 * hash(ru.seed + k * 7.7));
        if (w.broken && k > 1 && k < 5) hh *= 0.3;
        bot.push(P(x, y, h0)); top.push(P(x, y, h0 + hh));
      }
      g.beginPath();
      bot.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
      for (let k = top.length - 1; k >= 0; k--) g.lineTo(top[k][0], top[k][1]);
      g.closePath();
      g.fillStyle = '#060606';
      g.fill();
      g.strokeStyle = w.front ? 'rgba(235,228,210,0.8)' : 'rgba(235,228,210,0.45)';
      g.lineWidth = 1;
      g.stroke();
      // window gaps on front walls
      if (w.front && !w.broken) {
        g.strokeStyle = 'rgba(235,228,210,0.4)';
        const m = P((w.a[0] + w.b[0]) / 2, (w.a[1] + w.b[1]) / 2, h0 + 5);
        g.strokeRect(m[0] - 2, m[1] - 3, 4, 4);
      }
    }
    g.fillStyle = 'rgba(235,228,210,0.45)';
    for (let k = 0; k < 26; k++) {
      const a = rr() * 6.283, r = Math.max(ru.w, ru.d) * (0.5 + rr() * 0.5);
      const p = P(ru.x + Math.cos(a) * r, ru.y + Math.sin(a) * r * 0.9);
      g.fillRect(p[0], p[1], rr() < 0.3 ? 2 : 1, 1);
    }
  }

  // ---------------------------------------------------------------- craters

  function stamp(S) {
    for (const c of S.craters) {
      if (!c.fresh) continue;
      c.fresh = false;
      const g = T.ground.getContext('2d');
      const P = T.P;
      const h = heightAt(T.field, c.x, c.y);
      const ctr = P(c.x, c.y, h);
      g.fillStyle = 'rgba(2,2,2,0.85)';
      g.beginPath(); g.ellipse(ctr[0], ctr[1], c.r * T.s, c.r * T.s * K, 0, 0, 6.283); g.fill();
      g.fillStyle = 'rgba(235,228,210,0.5)';
      for (let k = 0; k < 18; k++) {
        const a = Math.random() * 6.283, r = c.r * (1 + Math.random() * 0.5);
        g.fillRect(ctr[0] + Math.cos(a) * r * T.s, ctr[1] + Math.sin(a) * r * T.s * K, 1, 1);
      }
    }
  }

  // ---------------------------------------------------------------- draw

  function blit(ctx, img, alpha) {
    const z = R.cam.z, s = T.s;
    // canvas pixel (cx, cy) shows world x = cx/s and projected py0 = cy/s - oy
    const dx = (0 - R.cam.x) * z + R.W / 2 + R.cam.sx;
    const dy = (-T.oy - R.cam.y * K) * z + R.H / 2 + R.cam.sy;
    const k = z / s;
    // only the visible part
    const sx0 = Math.max(0, Math.floor(-dx / k)), sy0 = Math.max(0, Math.floor(-dy / k));
    const sx1 = Math.min(img.width, Math.ceil((R.W - dx) / k)), sy1 = Math.min(img.height, Math.ceil((R.H - dy) / k));
    if (sx1 <= sx0 || sy1 <= sy0) return;
    ctx.save();
    // zoomed out, let the dots average into tone instead of dropping out
    ctx.imageSmoothingEnabled = k < 0.95;
    if (alpha != null) ctx.globalAlpha = alpha;
    ctx.drawImage(img, sx0, sy0, sx1 - sx0, sy1 - sy0, dx + sx0 * k, dy + sy0 * k, (sx1 - sx0) * k, (sy1 - sy0) * k);
    ctx.restore();
  }

  function drawGround(ctx, S) {
    ctx.fillStyle = PAL.bg;
    ctx.fillRect(0, 0, R.W, R.H);
    stamp(S);
    blit(ctx, T.ground);
    if (WX.flash > 0.05) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; blit(ctx, T.ground, WX.flash * 0.7); ctx.restore();
    }
  }

  function drawCanopy(ctx) { blit(ctx, T.canopy, 0.82); }

  // Sector markings on the ground: a dotted ring, a flag, progress around the ring.
  function drawSectors(ctx, S, deploy) {
    const z = R.cam.z;
    const Rr = BL.RULES.captureRadius;
    for (const s of S.field.sectors) {
      const h = heightAt(S.field, s.x, s.y);
      const col = s.owner === 0 ? PAL.ink : s.owner === 1 ? PAL.red : 'rgba(235,228,210,0.5)';
      ctx.fillStyle = col;
      const n = 64;
      for (let i = 0; i < n; i++) {
        const a = i / n * 6.283;
        const x = s.x + Math.cos(a) * Rr, y = s.y + Math.sin(a) * Rr;
        const lit = s.prog >= 0 ? (i / n) < s.prog / 100 : (i / n) < -s.prog / 100;
        ctx.globalAlpha = lit ? 0.9 : 0.3;
        ctx.fillRect(sx(x), sy(y, heightAt(S.field, x, y)), lit ? 2 : 1.4, lit ? 2 : 1.4);
      }
      ctx.globalAlpha = 1;
      // staff and flag
      const bx = sx(s.x), by = sy(s.y, h), ty = sy(s.y, h + 40);
      ctx.strokeStyle = col; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, ty); ctx.stroke();
      const wave = Math.sin(R.time * 6 + s.x) * 2 * Math.min(1.5, z);
      const fw = 16 * Math.min(1.6, Math.max(0.7, z));
      ctx.beginPath(); ctx.moveTo(bx, ty); ctx.lineTo(bx + fw, ty + fw * 0.28 + wave); ctx.lineTo(bx, ty + fw * 0.56); ctx.closePath();
      if (s.owner >= 0) ctx.fill(); else ctx.stroke();
      ctx.font = `600 ${Math.round(clamp(13 * Math.sqrt(z), 11, 18))}px ${R.FONT}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = col;
      ctx.fillText(s.id, bx, ty - 6);
      if (s.contested && Math.sin(R.time * 10) > 0) {
        ctx.strokeStyle = PAL.red;
        ctx.beginPath(); ctx.ellipse(bx, by, Rr * z, Rr * z * K, 0, 0, 6.283); ctx.stroke();
      }
    }
    if (deploy) {
      for (const p of deploy.points) {
        const h = heightAt(S.field, p.x, p.y);
        const pulse = 0.5 + 0.5 * Math.sin(R.time * 6);
        ctx.strokeStyle = `rgba(235,228,210,${0.4 + pulse * 0.5})`;
        ctx.lineWidth = 1.2;
        const r = (40 + pulse * 8) * z;
        ctx.beginPath(); ctx.ellipse(sx(p.x), sy(p.y, h), r, r * K, 0, 0, 6.283); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx(p.x), sy(p.y, h)); ctx.lineTo(sx(p.x), sy(p.y, h + 60)); ctx.stroke();
      }
    }
    for (const st of S.strikes) {
      const h = heightAt(S.field, st.x, st.y);
      ctx.strokeStyle = Math.sin(R.time * 12) > 0 ? PAL.red : PAL.redDim;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.ellipse(sx(st.x), sy(st.y, h), st.spread / 2 * z, st.spread / 2 * z * K, 0, 0, 6.283); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(sx(st.x) - 8, sy(st.y, h) - 5); ctx.lineTo(sx(st.x) + 8, sy(st.y, h) + 5);
      ctx.moveTo(sx(st.x) + 8, sy(st.y, h) - 5); ctx.lineTo(sx(st.x) - 8, sy(st.y, h) + 5);
      ctx.stroke();
    }
  }

  // ---------------------------------------------------------------- weather

  function setWeather(w) {
    w = w || {};
    WX.rainMul = w.rain || 1;
    WX.windBase = w.wind != null ? w.wind : 0.32;
    WX.bolts = w.bolts || [5, 15];
    WX.nextBolt = Math.min(WX.nextBolt, 3);
  }

  function tickWeather(dt) {
    WX.gustT -= dt;
    if (WX.gustT <= 0) { WX.gustT = 3 + Math.random() * 6; WX.gustTarget = Math.random() < 0.4 ? 0.5 + Math.random() * 0.6 : Math.random() * 0.25; }
    WX.gust += (WX.gustTarget - WX.gust) * dt * 0.8;
    WX.wind = WX.windBase + 0.18 * Math.sin(R.time * 0.05) + WX.gust;
    WX.flash = Math.max(0, WX.flash - dt * 2.6);
    WX.nextBolt -= dt;
    if (WX.nextBolt <= 0) { WX.nextBolt = WX.bolts[0] + Math.random() * (WX.bolts[1] - WX.bolts[0]); strike(); }
    if (WX.bolt) { WX.boltT -= dt; if (WX.boltT <= 0) WX.bolt = null; }
    if (WX.gust > 0.45 && WX.loops.length < 3 && Math.random() < dt * 0.8) {
      WX.loops.push({ x: -200 - Math.random() * 200, y: R.H * (0.2 + Math.random() * 0.6), r: 18 + Math.random() * 26, t: 0, life: 4 + Math.random() * 2, sp: 160 + Math.random() * 140, seed: Math.random() * 100 });
    }
    WX.loops.forEach((l) => { l.t += dt; l.x += l.sp * dt * (0.6 + WX.wind); });
    WX.loops = WX.loops.filter((l) => l.t < l.life);
  }

  function strike() {
    const x0 = R.W * (0.1 + Math.random() * 0.8);
    const yEnd = R.H * (0.35 + Math.random() * 0.4);
    const main = [x0, -10];
    const segs = [main];
    let x = x0, y = -10;
    while (y < yEnd) {
      x += (Math.random() - 0.5) * 34; y += 10 + Math.random() * 22; main.push(x, y);
      if (Math.random() < 0.18) {
        const br = [x, y]; let bx = x, by = y; const dir = Math.random() < 0.5 ? -1 : 1;
        for (let k = 0; k < 4 + Math.random() * 5; k++) { bx += dir * (6 + Math.random() * 18); by += 6 + Math.random() * 14; br.push(bx, by); }
        segs.push(br);
      }
    }
    WX.bolt = segs; WX.boltT = 0.32; WX.flash = 1;
    if (WX.onThunder) WX.onThunder(0.4 + Math.random() * 1.8);
  }

  // Dithered cloud texture, tileable: dot bands drifting over the field.
  function buildClouds(seed, w, h) {
    const c = canvas(w, h);
    const x = c.getContext('2d');
    const img = x.createImageData(w, h);
    const P = 10, Q = 6;
    const hash2 = (i, j) => { const q = Math.sin(i * 127.1 + j * 311.7 + seed * 17.3) * 43758.5453; return q - Math.floor(q); };
    function vn(u, v, o) {
      const pu = P * o, pv = Q * o;
      const i = Math.floor(u), j = Math.floor(v), fx = u - i, fy = v - j;
      const a = hash2(((i % pu) + pu) % pu, ((j % pv) + pv) % pv), b = hash2((((i + 1) % pu) + pu) % pu, ((j % pv) + pv) % pv);
      const c2 = hash2(((i % pu) + pu) % pu, (((j + 1) % pv) + pv) % pv), d = hash2((((i + 1) % pu) + pu) % pu, (((j + 1) % pv) + pv) % pv);
      const sx_ = fx * fx * (3 - 2 * fx), sy_ = fy * fy * (3 - 2 * fy);
      return a + (b - a) * sx_ + (c2 - a) * sy_ + (a - b - c2 + d) * sx_ * sy_;
    }
    const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
      const u = px / w * P, v = py / h * Q;
      const n = vn(u, v, 1) * 0.6 + vn(u * 2, v * 2, 2) * 0.28 + vn(u * 4, v * 4, 4) * 0.12;
      const val = (n - 0.5) * 2.6;
      const th = (bayer[(py % 4) * 4 + (px % 4)] + 0.5) / 16;
      if (val > th) { const i = (py * w + px) * 4; img.data[i] = 236; img.data[i + 1] = 230; img.data[i + 2] = 214; img.data[i + 3] = 60 + Math.min(1, val) * 80; }
    }
    x.putImageData(img, 0, 0);
    return c;
  }

  function drawSky(ctx, dt) {
    const W = R.W, H = R.H;
    // dot clouds drift over everything, a little faster than the ground scrolls
    const c = WX.clouds;
    const sc = 2.4;
    const tw = c.width * sc, th = c.height * sc;
    const ox = ((R.cam.x * R.cam.z * 0.25 + R.time * WX.wind * 20) % tw + tw) % tw;
    const oy = ((R.cam.y * R.cam.z * K * 0.25) % th + th) % th;
    ctx.save();
    ctx.globalAlpha = 0.22 + WX.flash * 0.3;
    ctx.imageSmoothingEnabled = false;
    for (let y = -oy; y < H; y += th) for (let x = -ox; x < W; x += tw) ctx.drawImage(c, Math.floor(x), Math.floor(y), tw, th);
    ctx.restore();
    if (WX.bolt && Math.random() > 0.15) {
      ctx.strokeStyle = PAL.ink; ctx.lineWidth = 1.2;
      WX.bolt.forEach((seg, k) => {
        ctx.globalAlpha = k === 0 ? 0.95 : 0.5;
        ctx.beginPath();
        for (let i = 0; i < seg.length; i += 2) i ? ctx.lineTo(seg[i], seg[i + 1]) : ctx.moveTo(seg[i], seg[i + 1]);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }
  }

  function drawRain(ctx, dt) {
    const W = R.W, H = R.H;
    const want = Math.min(560, Math.floor((W * H) / 2300 * R.quality * WX.rainMul));
    while (WX.drops.length < want) WX.drops.push(newDrop(true));
    if (WX.drops.length > want) WX.drops.length = want;
    const ang = 0.12 + WX.wind * 0.35;
    const sa = Math.sin(ang), ca = Math.cos(ang);
    const buckets = [[], [], []];
    for (const d of WX.drops) {
      d.x += sa * d.s * dt; d.y += ca * d.s * dt;
      if (d.y > H + 20 || d.x > W + 60) Object.assign(d, newDrop(false));
      buckets[d.b].push(d);
    }
    const al = [0.14, 0.26, 0.5];
    ctx.lineWidth = 0.8;
    for (let b = 0; b < 3; b++) {
      ctx.strokeStyle = `rgba(235,228,210,${al[b] + WX.flash * 0.2})`;
      ctx.beginPath();
      for (const d of buckets[b]) { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - sa * d.l, d.y - ca * d.l); }
      ctx.stroke();
    }
    // splashes on the ground in view
    for (let i = 0; i < 5 * R.quality; i++) WX.splashes.push({ x: Math.random() * W, y: Math.random() * H, t: 0.18 });
    ctx.strokeStyle = 'rgba(235,228,210,0.32)';
    ctx.beginPath();
    for (const s of WX.splashes) {
      s.t -= dt;
      const k = (0.18 - s.t) * 12;
      ctx.moveTo(s.x - k, s.y - k * 0.5); ctx.lineTo(s.x, s.y); ctx.lineTo(s.x + k, s.y - k * 0.5);
    }
    ctx.stroke();
    WX.splashes = WX.splashes.filter((s) => s.t > 0);
    for (const l of WX.loops) {
      ctx.strokeStyle = `rgba(235,228,210,${Math.sin(Math.PI * l.t / l.life) * 0.35})`;
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) {
        const t = i / 60 * 9;
        const px = l.x + t * 22 - Math.sin(t) * l.r, py = l.y + Math.cos(t) * l.r * 0.45 + Math.sin(t * 0.3 + l.seed) * 8;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
    }
    if (WX.flash > 0.02) { ctx.fillStyle = `rgba(235,228,210,${WX.flash * 0.08})`; ctx.fillRect(0, 0, W, H); }
  }

  function newDrop(anywhere) {
    const b = Math.random() < 0.55 ? 0 : Math.random() < 0.75 ? 1 : 2;
    return {
      x: Math.random() * (R.W + 120) - 90, y: anywhere ? Math.random() * R.H : -Math.random() * 60,
      l: b === 2 ? 14 + Math.random() * 18 : b === 1 ? 8 + Math.random() * 10 : 4 + Math.random() * 6,
      s: b === 2 ? 900 + Math.random() * 300 : b === 1 ? 640 + Math.random() * 200 : 420 + Math.random() * 160, b,
    };
  }

  BL.ground = { build, drawGround, drawCanopy, drawSectors, drawSky, drawRain, tickWeather, setWeather, WX, T };
})();
