// BLACKLINE — the world: storm sky, cloud bands, far hills, the funnel, terrain stipple,
// structures, cover, sector markers, rain, lightning.
(function () {
  const BL = window.BL;
  const { R, PAL, clamp, lerp, heightAt } = BL;
  const { sx, sy, wx, hash, jpath } = BL.render;

  const WX = {
    wind: 0.4, gust: 0, gustT: 3, flash: 0, bolt: null, boltT: 0, nextBolt: 4,
    drops: [], splashes: [], loops: [], prevCamX: null, funnelX: 2700, onThunder: null,
    rainMul: 1, windBase: 0.32, bolts: [5, 15],
  };

  let field = null;
  let stip = null;       // terrain stipple points, three depth buckets
  let far = null;        // far hill layers
  let clouds = null;

  // ---------------------------------------------------------------- setup

  function setup(f) {
    field = f;
    stip = buildStipple(f);
    far = [buildFar(f.seed * 3 + 1, 0.22, 95, 0.32), buildFar(f.seed * 3 + 2, 0.45, 70, 0.48)];
    if (!clouds) clouds = [buildClouds(11, 0.55, 640, 150), buildClouds(23, 0.32, 640, 120)];
    WX.drops = [];
    WX.loops = [];
    WX.prevCamX = null;
  }

  function buildStipple(f) {
    const rnd = BL.rng(f.seed * 77 + 5);
    const buckets = [[], [], []];
    const n = Math.floor(f.W * 2.4);
    for (let i = 0; i < n; i++) {
      const x = rnd() * f.W;
      // depth: mostly near the surface, a long sparse tail below
      const d = 1.5 + -Math.log(1 - rnd() * 0.995) * 26;
      const b = d < 14 ? 0 : d < 45 ? 1 : 2;
      buckets[b].push(x, d, rnd());
    }
    // sort each bucket by x so we can cull fast
    return buckets.map((arr) => {
      const idx = [];
      for (let i = 0; i < arr.length; i += 3) idx.push(i);
      idx.sort((a, b) => arr[a] - arr[b]);
      const out = new Float32Array(arr.length);
      idx.forEach((k, j) => { out[j * 3] = arr[k]; out[j * 3 + 1] = arr[k + 1]; out[j * 3 + 2] = arr[k + 2]; });
      return out;
    });
  }

  function buildFar(seed, par, amp, alpha) {
    const n1 = BL.noise1(seed), n2 = BL.noise1(seed + 9);
    return { par, amp, alpha, h: (X) => (n1(X / 420) * 0.6 + n2(X / 130) * 0.3 + n2(X / 37) * 0.08 + 0.7) * amp };
  }

  // Dithered cloud band texture, tileable in x.
  function buildClouds(seed, density, w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    const img = x.createImageData(w, h);
    const P = 16, Q = 8;
    const hash2 = (i, j) => { const q = Math.sin(i * 127.1 + j * 311.7 + seed * 17.3) * 43758.5453; return q - Math.floor(q); };
    function vnoise(u, v, o) {
      const per = P * o;
      const ix = Math.floor(u), iy = Math.floor(v), fx = u - ix, fy = v - iy;
      const sx_ = fx * fx * (3 - 2 * fx), sy_ = fy * fy * (3 - 2 * fy);
      const w0 = ((ix % per) + per) % per, w1 = (((ix + 1) % per) + per) % per;
      const a = hash2(w0, iy), b = hash2(w1, iy), c2 = hash2(w0, iy + 1), d = hash2(w1, iy + 1);
      return lerp(lerp(a, b, sx_), lerp(c2, d, sx_), sy_);
    }
    const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const u = px / w * P, v = py / h * Q * 1.6;
        const nv = vnoise(u, v, 1) * 0.55 + vnoise(u * 2, v * 2.2, 2) * 0.3 + vnoise(u * 4, v * 4.4, 4) * 0.15;
        // bands: brighter streaks across the sky, fading at the bottom of the texture
        const band = 0.55 + 0.45 * Math.sin(py / h * Math.PI * 3.2 + nv * 3);
        const fade = Math.sin(Math.PI * clamp(py / h, 0, 1));
        let val = (nv - 0.38) * 2.2 * band * fade * density;
        const th = (bayer[(py % 4) * 4 + (px % 4)] + 0.5) / 16;
        const i = (py * w + px) * 4;
        if (val > th) {
          img.data[i] = 236; img.data[i + 1] = 230; img.data[i + 2] = 214;
          img.data[i + 3] = 70 + Math.floor(Math.min(1, val) * 90);
        }
      }
    }
    x.putImageData(img, 0, 0);
    return c;
  }

  // ---------------------------------------------------------------- weather tick

  function tickWeather(dt) {
    WX.gustT -= dt;
    if (WX.gustT <= 0) {
      WX.gustT = 3 + Math.random() * 6;
      WX.gustTarget = Math.random() < 0.4 ? 0.5 + Math.random() * 0.6 : Math.random() * 0.25;
    }
    WX.gust += ((WX.gustTarget || 0) - WX.gust) * dt * 0.8;
    WX.wind = WX.windBase + 0.18 * Math.sin(R.time * 0.05) + WX.gust;
    WX.flash = Math.max(0, WX.flash - dt * 2.6);
    WX.funnelX += dt * 6 * WX.wind;

    WX.nextBolt -= dt;
    if (WX.nextBolt <= 0) {
      WX.nextBolt = WX.bolts[0] + Math.random() * (WX.bolts[1] - WX.bolts[0]);
      strike();
    }
    if (WX.bolt) {
      WX.boltT -= dt;
      if (WX.boltT <= 0) WX.bolt = null;
    }
    // wind loops travel with gusts
    if (WX.gust > 0.45 && WX.loops.length < 3 && Math.random() < dt * 0.8) {
      WX.loops.push({ x: -200 - Math.random() * 200, y: R.H * (0.2 + Math.random() * 0.5), r: 18 + Math.random() * 26, t: 0, life: 4 + Math.random() * 2, sp: 160 + Math.random() * 140, seed: Math.random() * 100 });
    }
    WX.loops.forEach((l) => { l.t += dt; l.x += l.sp * dt * (0.6 + WX.wind); });
    WX.loops = WX.loops.filter((l) => l.t < l.life);
  }

  function strike() {
    const x0 = R.W * (0.1 + Math.random() * 0.8);
    const yEnd = R.H * (0.45 + Math.random() * 0.2);
    const segs = [];
    let x = x0, y = -10;
    const main = [x, y];
    while (y < yEnd) {
      x += (Math.random() - 0.5) * 34;
      y += 10 + Math.random() * 22;
      main.push(x, y);
      if (Math.random() < 0.18) {
        const br = [x, y];
        let bx = x, by = y;
        const dir = Math.random() < 0.5 ? -1 : 1;
        for (let k = 0; k < 4 + Math.random() * 5; k++) { bx += dir * (6 + Math.random() * 18); by += 6 + Math.random() * 14; br.push(bx, by); }
        segs.push(br);
      }
    }
    segs.unshift(main);
    WX.bolt = segs;
    WX.boltT = 0.32;
    WX.flash = 1;
    if (WX.onThunder) WX.onThunder(0.4 + Math.random() * 1.8);
  }

  // ---------------------------------------------------------------- sky

  function drawSky(ctx) {
    const H = R.H, W = R.W;
    ctx.fillStyle = PAL.bg;
    ctx.fillRect(0, 0, W, H);
    const fl = WX.flash;
    // cloud bands
    for (let i = 0; i < clouds.length; i++) {
      const c = clouds[i];
      const scale = i === 0 ? 2 : 2.6;
      const tw = c.width * scale, th = c.height * scale;
      const off = ((R.cam.x * (i === 0 ? 0.06 : 0.12) + R.time * WX.wind * (i === 0 ? 9 : 16)) % tw + tw) % tw;
      const y0 = (i === 0 ? -th * 0.12 : H * 0.12) + (R.cam.y - 400) * R.cam.z * 0.04;
      ctx.globalAlpha = (i === 0 ? 0.55 : 0.4) + fl * 0.45;
      for (let x = -off; x < W; x += tw) ctx.drawImage(c, Math.floor(x), Math.floor(y0), tw, th);
    }
    ctx.globalAlpha = 1;
    // lightning
    if (WX.bolt && Math.random() > 0.15) {
      ctx.strokeStyle = PAL.ink;
      ctx.lineWidth = 1.2;
      WX.bolt.forEach((seg, k) => {
        ctx.globalAlpha = k === 0 ? 0.95 : 0.5;
        ctx.beginPath();
        for (let i = 0; i < seg.length; i += 2) i ? ctx.lineTo(seg[i], seg[i + 1]) : ctx.moveTo(seg[i], seg[i + 1]);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }
  }

  function horizon() {
    return R.H * 0.6 - (R.cam.y - 360) * R.cam.z * 0.25;
  }

  function drawFar(ctx) {
    const W = R.W;
    const hz = horizon();
    // the storm funnel stands between the two far ranges
    for (let li = 0; li < far.length; li++) {
      const L = far[li];
      if (li === 1) drawFunnel(ctx, hz);
      const zL = lerp(0.55, R.cam.z, L.par * 0.6);
      const camX = R.cam.x * L.par;
      const base = hz + li * 26;
      const step = 3;
      ctx.beginPath();
      ctx.moveTo(0, R.H);
      const pts = [];
      for (let px = -step; px <= W + step; px += step) {
        const X = (px - W / 2) / zL + camX;
        const y = base - L.h(X) * zL * 0.9;
        pts.push(px, y, X);
        ctx.lineTo(px, y);
      }
      ctx.lineTo(W, R.H);
      ctx.closePath();
      ctx.fillStyle = WX.flash > 0.05 ? `rgb(${8 + WX.flash * 16},${8 + WX.flash * 16},${8 + WX.flash * 15})` : PAL.bg;
      ctx.fill();
      // dotted crest and sparse halftone below
      ctx.fillStyle = `rgba(235,228,210,${L.alpha + WX.flash * 0.3})`;
      const ds = li === 0 ? 1.2 : 1.4;
      for (let i = 0; i < pts.length; i += 3) {
        const X = pts[i + 2];
        const k = Math.floor(X / 2.2);
        if (hash(k + li * 1000) < 0.55) ctx.fillRect(pts[i], pts[i + 1] + (hash(k + 7) - 0.5) * 1.2, ds, ds);
        if (hash(k * 3 + li * 99) < 0.08) {
          const dd = 4 + hash(k * 5 + 3) * 28;
          ctx.fillRect(pts[i], pts[i + 1] + dd, 1, 1);
        }
      }
    }
  }

  function drawFunnel(ctx, hz) {
    const par = 0.33;
    const zL = lerp(0.55, R.cam.z, par * 0.6);
    const X = ((WX.funnelX % 6400) + 6400) % 6400 - 800;
    const px = (X - R.cam.x * par) * zL + R.W / 2;
    if (px < -260 || px > R.W + 260) return;
    const strength = 0.5 + 0.5 * Math.sin(R.time * 0.03);
    if (strength < 0.15) return;
    const topY = Math.min(R.H * 0.12, hz - 260);
    const botY = hz + 10;
    ctx.save();
    ctx.lineWidth = 0.8;
    const rings = 22;
    for (let i = 0; i < rings; i++) {
      const t = i / (rings - 1);
      const y = lerp(botY, topY, t);
      const sway = Math.sin(R.time * 0.7 + t * 3) * 12 * t + Math.sin(R.time * 1.9 + t * 7) * 4;
      const rx = (6 + t * t * 120) * (0.7 + 0.3 * strength);
      const ry = 2 + t * 9;
      const ph = R.time * (3 - t * 1.5) + i;
      ctx.strokeStyle = `rgba(235,228,210,${(0.12 + 0.3 * (1 - Math.abs(t - 0.45))) * strength})`;
      ctx.beginPath();
      // an open ellipse, like a loop of wind
      ctx.ellipse(px + sway, y, rx, ry, 0, ph % 6.28, ph % 6.28 + 4.6);
      ctx.stroke();
    }
    // dithered core
    ctx.fillStyle = `rgba(235,228,210,${0.18 * strength})`;
    for (let i = 0; i < 220; i++) {
      const t = hash(i * 1.7);
      const y = lerp(botY, topY, t);
      const w = (4 + t * t * 70) * (hash(i * 3.3 + Math.floor(R.time * 6)) - 0.5) * 2;
      const sway = Math.sin(R.time * 0.7 + t * 3) * 12 * t;
      ctx.fillRect(px + sway + w, y, 1.2, 1.2);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- terrain

  function drawTerrain(ctx) {
    const z = R.cam.z;
    const x0 = Math.max(0, wx(-20)), x1 = Math.min(field.W, wx(R.W + 20));
    const step = Math.max(field.STEP, Math.floor(1.5 / z / field.STEP) * field.STEP || field.STEP);
    // fill (occludes sky and far hills)
    ctx.beginPath();
    ctx.moveTo(sx(x0), R.H + 20);
    for (let x = Math.floor(x0 / step) * step; x <= x1 + step; x += step) ctx.lineTo(sx(x), sy(heightAt(field, x)));
    ctx.lineTo(sx(x1), R.H + 20);
    ctx.closePath();
    const fl = WX.flash;
    ctx.fillStyle = fl > 0.05 ? `rgb(${4 + fl * 22},${4 + fl * 22},${4 + fl * 20})` : '#040404';
    ctx.fill();

    // halftone below the surface
    const ds = clamp(z * 1.05, 0.8, 2.2);
    const stride = z < 0.45 ? Math.ceil(0.45 / z) : 1;
    const alphas = [0.55, 0.3, 0.16];
    for (let b = 0; b < 3; b++) {
      const arr = stip[b];
      ctx.fillStyle = `rgba(235,228,210,${Math.min(1, alphas[b] + fl * 0.35)})`;
      let i = lowerBound(arr, x0);
      for (; i < arr.length; i += 3 * stride) {
        const x = arr[i];
        if (x > x1) break;
        const d = arr[i + 1];
        const y = sy(heightAt(field, x) - d);
        if (y > R.H) continue;
        const s = arr[i + 2] > 0.85 ? ds * 1.6 : ds;
        ctx.fillRect(sx(x), y, s, s);
      }
    }

    // inner contour bands, sparse dots
    if (z > 0.35) {
      ctx.fillStyle = `rgba(235,228,210,${0.22 + fl * 0.3})`;
      const cs = Math.max(3, 2.2 / z);
      for (const depth of [20, 52]) {
        for (let x = Math.floor(x0 / cs) * cs; x < x1; x += cs) {
          const k = Math.floor(x / cs) + depth * 13;
          if (hash(k) < 0.45) continue;
          const y = sy(smoothH(x) - depth);
          ctx.fillRect(sx(x), y, ds, ds);
        }
      }
    }

    // the dotted crest
    const rs = Math.max(1.4, 1.25 / z);
    const rds = clamp(z * 1.2, 1, 2.6);
    for (let pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass === 0 ? `rgba(235,228,210,${0.6 + fl * 0.3})` : PAL.ink;
      for (let x = Math.floor(x0 / rs) * rs; x < x1; x += rs) {
        const k = Math.floor(x / rs);
        const h = heightAt(field, x);
        const curv = h - (heightAt(field, x - 40) + heightAt(field, x + 40)) / 2;
        const bright = curv > 1.5 || hash(k * 1.3) < 0.15;
        if ((pass === 1) !== bright) continue;
        if (hash(k) < 0.12) continue; // small gaps, like a broken ink line
        const jy = (hash(k + 0.5) - 0.5) * 0.9;
        const wdt = hash(k * 2.7) > 0.8 ? rds * 2.2 : rds;
        ctx.fillRect(sx(x), sy(h + jy), wdt, rds);
      }
    }

    // grass tufts bending with the wind
    if (z > 0.9) {
      ctx.strokeStyle = PAL.inkDim;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      const gs = 7;
      for (let x = Math.floor(x0 / gs) * gs; x < x1; x += gs) {
        const k = Math.floor(x / gs);
        if (hash(k * 5.1) > 0.22) continue;
        const h = heightAt(field, x);
        const bx = sx(x), by = sy(h);
        const bend = (WX.wind * 1.6 + Math.sin(R.time * 3 + k) * 0.5) * z;
        for (let j = -1; j <= 1; j++) {
          const hh = (2.5 + hash(k + j) * 2) * z;
          ctx.moveTo(bx + j * z, by);
          ctx.quadraticCurveTo(bx + j * z + bend * 0.4, by - hh * 0.6, bx + j * z + bend, by - hh);
        }
      }
      ctx.stroke();
    }
  }

  function smoothH(x) {
    return (heightAt(field, x - 12) + heightAt(field, x) * 2 + heightAt(field, x + 12)) / 4;
  }

  function lowerBound(arr, x) {
    let lo = 0, hi = arr.length / 3;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid * 3] < x) lo = mid + 1; else hi = mid;
    }
    return lo * 3;
  }

  // ---------------------------------------------------------------- structures

  function lw() { return clamp(R.cam.z * 0.55, 0.6, 1.5); }

  function drawStructures(ctx, S) {
    const z = R.cam.z;
    const x0 = wx(-160), x1 = wx(R.W + 160);
    ctx.lineWidth = lw();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = lw();
    for (const s of field.structures) {
      if (s.x < x0 || s.x > x1) continue;
      const g = heightAt(field, s.x);
      ctx.strokeStyle = 'rgba(235,228,210,0.78)';
      ctx.fillStyle = '#040404';
      switch (s.kind) {
        case 'pole': drawPole(ctx, s, g); break;
        case 'tree': drawTree(ctx, s, g); break;
        case 'rock': drawRock(ctx, s, g); break;
        case 'sandbags': drawSandbags(ctx, s); break;
        case 'bunker': drawBunker(ctx, s, g); break;
        case 'farm': drawFarm(ctx, s, g); break;
        case 'mill': drawMill(ctx, s, g); break;
        case 'ruin': drawRuin(ctx, s, g); break;
        case 'mast': drawMast(ctx, s, g); break;
      }
    }
    for (const w of field.wire) if (w.x > x0 && w.x < x1) drawWire(ctx, w);
  }

  // Telegraph wires hang behind the ground so a hill hides them.
  function drawWires(ctx) {
    const x0 = wx(-160), x1 = wx(R.W + 160);
    const poles = field.structures.filter((s) => s.kind === 'pole');
    ctx.strokeStyle = 'rgba(235,228,210,0.35)';
    ctx.lineWidth = 0.7;
    for (let i = 0; i < poles.length - 1; i++) {
      const a = poles[i], b = poles[i + 1];
      if (b.x < x0 || a.x > x1) continue;
      const ax = a.x + a.lean * 32, ay = heightAt(field, a.x) + 31;
      const bx = b.x + b.lean * 32, by = heightAt(field, b.x) + 31;
      const sway = Math.sin(R.time * 1.4 + i) * WX.wind * 3;
      for (let k = 0; k < 2; k++) {
        ctx.beginPath();
        ctx.moveTo(sx(ax - 4 + k * 8), sy(ay));
        ctx.quadraticCurveTo(sx((ax + bx) / 2 + sway), sy((ay + by) / 2 - 14 - k * 2), sx(bx - 4 + k * 8), sy(by));
        ctx.stroke();
      }
    }
  }

  // local helper: world coords to a path
  function L(ctx, pts, seed, close, fill) {
    const sp = [];
    for (let i = 0; i < pts.length; i += 2) sp.push(sx(pts[i]), sy(pts[i + 1]));
    jpath(ctx, sp, seed, 0.9, close);
    if (fill) ctx.fill();
    ctx.stroke();
  }

  function drawPole(ctx, s, g) {
    const tx = s.x + s.lean * 32, ty = g + 33;
    L(ctx, [s.x, g, tx, ty], s.x);
    L(ctx, [tx - 6, ty - 3, tx + 6, ty - 3], s.x + 1);
    L(ctx, [tx - 4, ty - 6, tx + 4, ty - 6], s.x + 2);
  }

  function drawTree(ctx, s, g) {
    const r = BL.rng(s.seed);
    const sway = WX.wind * 0.06 + Math.sin(R.time * 1.6 + s.seed) * 0.03 * (0.5 + WX.wind);
    ctx.beginPath();
    function branch(x, y, ang, len, depth) {
      const a = ang + sway * (4 - depth) * 0.4;
      const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
      ctx.moveTo(sx(x), sy(y));
      ctx.lineTo(sx(ex), sy(ey));
      if (depth <= 0) return;
      const n = depth > 2 ? 2 : r() < 0.6 ? 2 : 1;
      for (let i = 0; i < n; i++) branch(ex, ey, a + (r() - 0.5) * 1.3 + (i ? 0.3 : -0.3), len * (0.6 + r() * 0.18), depth - 1);
    }
    branch(s.x, g - 1, Math.PI / 2 + (r() - 0.5) * 0.2, s.h * 0.42, 4);
    ctx.stroke();
  }

  function drawRock(ctx, s, g) {
    const r = BL.rng(s.seed);
    const pts = [];
    const n = 8;
    for (let i = 0; i <= n; i++) {
      const a = Math.PI * (i / n);
      const rr = s.size * (0.75 + r() * 0.45);
      pts.push(s.x + Math.cos(a) * rr * 1.25, g - 2 + Math.sin(a) * rr);
    }
    L(ctx, pts, s.seed, true, true);
    ctx.beginPath();
    ctx.moveTo(sx(s.x - s.size * 0.3), sy(g + s.size * 0.6));
    ctx.lineTo(sx(s.x + s.size * 0.1), sy(g + s.size * 0.25));
    ctx.stroke();
  }

  function drawSandbags(ctx, s) {
    const g = heightAt(field, s.x);
    const w = 6;
    ctx.beginPath();
    for (let row = 0; row < 2; row++) {
      const n = row === 0 ? Math.min(s.n, 4) : Math.min(s.n, 4) - 1;
      for (let i = 0; i < n; i++) {
        const cx = s.x - s.face * (i * w * 0.9 + row * w * 0.45);
        const cy = g + row * 3.4 + 1.6;
        ctx.moveTo(sx(cx - w / 2), sy(cy - 1.6));
        ctx.quadraticCurveTo(sx(cx), sy(cy + 2.4), sx(cx + w / 2), sy(cy - 1.6));
      }
    }
    ctx.stroke();
  }

  function drawBunker(ctx, s, g) {
    const f = s.face;
    L(ctx, [s.x - 18, g - 2, s.x - 17, g + 13, s.x + 12, g + 14, s.x + 18, g + 9, s.x + 18, g - 2], s.x, false, true);
    ctx.strokeStyle = 'rgba(235,228,210,0.9)';
    L(ctx, [s.x + f * 6, g + 8, s.x + f * 16, g + 8], s.x + 3);
    ctx.strokeStyle = 'rgba(235,228,210,0.45)';
    L(ctx, [s.x - 14, g + 4, s.x - 4, g + 4], s.x + 4);
    L(ctx, [s.x - 10, g + 14, s.x - 10, g + 20, s.x - 7, g + 22], s.x + 5);
  }

  function drawFarm(ctx, s, g) {
    const r = BL.rng(s.seed);
    const x = s.x;
    // walls with broken tops
    const top = [];
    for (let i = 0; i <= 8; i++) top.push(x - 22 + i * 5.5, g + 14 + (i < 3 ? 8 : 0) + r() * (i < 3 ? 6 : 10));
    L(ctx, [x - 22, g - 2].concat(top, [x + 22, g - 2]), s.seed, false, true);
    // window holes and a fallen beam
    ctx.strokeStyle = 'rgba(235,228,210,0.55)';
    L(ctx, [x - 15, g + 8, x - 15, g + 14, x - 10, g + 14, x - 10, g + 8], s.seed + 1, true);
    L(ctx, [x + 4, g + 6, x + 4, g + 12, x + 9, g + 12, x + 9, g + 6], s.seed + 2, true);
    ctx.strokeStyle = 'rgba(235,228,210,0.75)';
    L(ctx, [x - 24, g + 26, x + 6, g + 12], s.seed + 3);
    L(ctx, [x + 12, g - 1, x + 30, g + 9], s.seed + 4);
  }

  function drawMill(ctx, s, g) {
    const x = s.x;
    L(ctx, [x - 7, g - 1, x - 4, g + 44, x + 4, g + 44, x + 7, g - 1], s.seed, false, true);
    L(ctx, [x - 5, g + 44, x, g + 50, x + 5, g + 44], s.seed + 1);
    const hx = x + s.face * 5, hy = g + 42;
    const a0 = R.time * (0.25 + WX.wind * 0.6) * s.face;
    for (let i = 0; i < 4; i++) {
      const a = a0 + i * Math.PI / 2;
      const len = i === 2 ? 11 : 26; // one blade broken
      const ex = hx + Math.cos(a) * len, ey = hy + Math.sin(a) * len;
      L(ctx, [hx, hy, ex, ey], s.seed + 10 + i);
      if (len > 20) {
        const nx = -Math.sin(a) * 4, ny = Math.cos(a) * 4;
        L(ctx, [hx + Math.cos(a) * 8 + nx, hy + Math.sin(a) * 8 + ny, ex + nx, ey + ny, ex, ey], s.seed + 20 + i);
      }
    }
  }

  function drawRuin(ctx, s, g) {
    const x = s.x;
    // two broken pillars and a fallen arch
    L(ctx, [x - 20, g - 2, x - 20, g + 34, x - 15, g + 40, x - 13, g + 30, x - 13, g - 2], s.seed, false, true);
    L(ctx, [x + 10, g - 2, x + 10, g + 22, x + 14, g + 25, x + 17, g + 19, x + 17, g - 2], s.seed + 1, false, true);
    ctx.beginPath();
    ctx.arc(sx(x - 1.5), sy(g + 34), 12 * R.cam.z, Math.PI * 1.05, Math.PI * 1.55);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(235,228,210,0.5)';
    L(ctx, [x - 6, g - 1, x - 2, g + 3, x + 4, g, x + 8, g + 2], s.seed + 2);
    L(ctx, [x - 18, g + 18, x - 15, g + 18], s.seed + 3);
  }

  function drawMast(ctx, s, g) {
    const x = s.x, h = 120;
    ctx.strokeStyle = 'rgba(235,228,210,0.6)';
    L(ctx, [x - 6, g, x - 1, g + h], s.x);
    L(ctx, [x + 6, g, x + 1, g + h], s.x + 1);
    ctx.beginPath();
    for (let y = 0; y < h - 6; y += 9) {
      const w0 = 6 - y / h * 5, w1 = 6 - (y + 9) / h * 5;
      ctx.moveTo(sx(x - w0), sy(g + y));
      ctx.lineTo(sx(x + w1), sy(g + y + 9));
      ctx.moveTo(sx(x + w0), sy(g + y));
      ctx.lineTo(sx(x - w1), sy(g + y + 9));
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(235,228,210,0.25)';
    L(ctx, [x, g + h * 0.7, x - 60, heightAt(field, x - 60)], s.x + 3);
    L(ctx, [x, g + h * 0.7, x + 60, heightAt(field, x + 60)], s.x + 4);
    if (Math.sin(R.time * 3.2) > 0.2) {
      ctx.fillStyle = PAL.red;
      const r = Math.max(1.2, R.cam.z * 1.6);
      ctx.fillRect(sx(x) - r / 2, sy(g + h + 1) - r / 2, r, r);
    }
  }

  function drawWire(ctx, w) {
    ctx.strokeStyle = 'rgba(235,228,210,0.5)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (let x = w.x - w.w / 2; x < w.x + w.w / 2; x += 4) {
      const g = heightAt(field, x);
      ctx.moveTo(sx(x) + 3 * R.cam.z, sy(g + 3));
      ctx.ellipse(sx(x), sy(g + 3), 3 * R.cam.z, 3 * R.cam.z, 0, 0, Math.PI * 2);
    }
    ctx.stroke();
    // stakes
    ctx.beginPath();
    for (let x = w.x - w.w / 2; x <= w.x + w.w / 2; x += w.w / 3) {
      const g = heightAt(field, x);
      ctx.moveTo(sx(x), sy(g));
      ctx.lineTo(sx(x + 1), sy(g + 8));
    }
    ctx.stroke();
    ctx.lineWidth = lw();
  }

  // ---------------------------------------------------------------- sectors

  function drawSectors(ctx, S, deployFor) {
    const z = R.cam.z;
    const Rr = BL.RULES.captureRadius;
    ctx.font = `${clamp(11 * Math.sqrt(z), 9, 16)}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    for (const s of field.sectors) {
      const g = heightAt(field, s.x);
      const col = s.owner === 0 ? PAL.ink : s.owner === 1 ? PAL.red : 'rgba(235,228,210,0.45)';
      // dotted staff
      ctx.fillStyle = col;
      const top = g + 64;
      for (let y = g + 4; y < top; y += Math.max(2.5, 2 / z)) ctx.fillRect(sx(s.x), sy(y), Math.max(1, z * 0.8), Math.max(1, z * 0.8));
      // flag, waving in the wind
      const fx = sx(s.x), fy = sy(top);
      const wave = Math.sin(R.time * 6 + s.x) * 2 * z;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx + (14 + WX.wind * 3) * z, fy + 4 * z + wave);
      ctx.lineTo(fx, fy + 8 * z);
      ctx.closePath();
      if (s.owner >= 0) { ctx.fill(); } else { ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.stroke(); }
      ctx.fillText(s.id, fx, fy - 6 * z - 2);
      // capture zone brackets on the ground
      ctx.strokeStyle = s.contested ? PAL.red : 'rgba(235,228,210,0.35)';
      ctx.lineWidth = 1;
      for (const side of [-1, 1]) {
        const bx = s.x + side * Rr;
        const bg = heightAt(field, bx);
        ctx.beginPath();
        ctx.moveTo(sx(bx - side * 8), sy(bg - 2));
        ctx.lineTo(sx(bx), sy(bg - 2));
        ctx.lineTo(sx(bx), sy(bg + 8));
        ctx.stroke();
      }
      // progress tick under the letter
      if (Math.abs(s.prog) < 100 || s.contested) {
        const w = 26 * Math.sqrt(z);
        const y = fy - 6 * z - 2 + 5;
        ctx.strokeStyle = 'rgba(235,228,210,0.25)';
        ctx.beginPath(); ctx.moveTo(fx - w / 2, y); ctx.lineTo(fx + w / 2, y); ctx.stroke();
        ctx.strokeStyle = s.prog >= 0 ? PAL.ink : PAL.red;
        ctx.beginPath(); ctx.moveTo(fx, y); ctx.lineTo(fx + (s.prog / 100) * w / 2, y); ctx.stroke();
      }
    }
    // deploy beams while choosing where to deploy
    if (deployFor) {
      const pts = deployFor.points;
      for (const x of pts) {
        const g = heightAt(field, x);
        const pulse = 0.5 + 0.5 * Math.sin(R.time * 6);
        ctx.strokeStyle = `rgba(235,228,210,${0.35 + pulse * 0.4})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.moveTo(sx(x), sy(g)); ctx.lineTo(sx(x), sy(g + 240)); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(sx(x) - 8, sy(g) - 10); ctx.lineTo(sx(x), sy(g) - 2); ctx.lineTo(sx(x) + 8, sy(g) - 10);
        ctx.stroke();
      }
    }
    // artillery warnings: red for everyone
    for (const st of S.strikes) {
      const g = heightAt(field, st.x);
      const blink = Math.sin(R.time * 12) > 0;
      ctx.strokeStyle = blink ? PAL.red : PAL.redDim;
      ctx.lineWidth = 1;
      const half = st.spread / 2;
      ctx.setLineDash([2, 5]);
      ctx.beginPath(); ctx.moveTo(sx(st.x - half), sy(heightAt(field, st.x - half) + 2)); ctx.lineTo(sx(st.x + half), sy(heightAt(field, st.x + half) + 2)); ctx.stroke();
      ctx.setLineDash([]);
      for (const side of [-1, 1]) {
        const bx = st.x + side * half;
        ctx.beginPath(); ctx.moveTo(sx(bx), sy(heightAt(field, bx))); ctx.lineTo(sx(bx), sy(heightAt(field, bx) + 30)); ctx.stroke();
      }
      ctx.fillStyle = PAL.red;
      if (st.t > 0) ctx.fillText(st.team === 0 ? 'FIRE MISSION' : 'INCOMING', sx(st.x), sy(g + 40));
    }
  }

  // ---------------------------------------------------------------- rain (screen space)

  function drawRain(ctx, dt) {
    const W = R.W, H = R.H;
    const want = Math.min(560, Math.floor((W * H) / 2300 * R.quality * WX.rainMul));
    while (WX.drops.length < want) WX.drops.push(newDrop(true));
    if (WX.drops.length > want) WX.drops.length = want;
    const ang = 0.12 + WX.wind * 0.35;
    const sa = Math.sin(ang), ca = Math.cos(ang);
    const camDx = WX.prevCamX == null ? 0 : (R.cam.x - WX.prevCamX) * R.cam.z;
    WX.prevCamX = R.cam.x;
    const buckets = [[], [], []];
    for (const d of WX.drops) {
      d.x += sa * d.s * dt - camDx * d.par;
      d.y += ca * d.s * dt;
      if (d.y > H + 20 || d.x > W + 60 || d.x < -60) Object.assign(d, newDrop(false));
      buckets[d.b].push(d);
    }
    const alphas = [0.16, 0.3, 0.55];
    ctx.lineWidth = 0.8;
    for (let b = 0; b < 3; b++) {
      ctx.strokeStyle = `rgba(235,228,210,${alphas[b] + WX.flash * 0.2})`;
      ctx.beginPath();
      for (const d of buckets[b]) {
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - sa * d.l, d.y - ca * d.l);
      }
      ctx.stroke();
    }
    // splashes on the visible ground
    if (R.cam.z > 0.6) {
      for (let i = 0; i < 4 * R.quality; i++) {
        const x = wx(Math.random() * W);
        WX.splashes.push({ x, y: heightAt(field, x), t: 0.18 });
      }
    }
    ctx.strokeStyle = 'rgba(235,228,210,0.4)';
    ctx.beginPath();
    for (const s of WX.splashes) {
      s.t -= dt;
      const px = sx(s.x), py = sy(s.y);
      const k = (0.18 - s.t) * 12;
      ctx.moveTo(px - k, py - k * 0.8); ctx.lineTo(px, py);
      ctx.lineTo(px + k, py - k * 0.8);
    }
    ctx.stroke();
    WX.splashes = WX.splashes.filter((s) => s.t > 0);
    // wind loops
    ctx.lineWidth = 0.8;
    for (const l of WX.loops) {
      const a = Math.sin(Math.PI * l.t / l.life) * 0.4;
      ctx.strokeStyle = `rgba(235,228,210,${a})`;
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) {
        const t = i / 60 * 9;
        const px = l.x + t * 22 - Math.sin(t) * l.r;
        const py = l.y + Math.cos(t) * l.r * 0.45 + Math.sin(t * 0.3 + l.seed) * 8;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
    }
    // lightning flash over everything
    if (WX.flash > 0.02) {
      ctx.fillStyle = `rgba(235,228,210,${WX.flash * 0.1})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function newDrop(anywhere) {
    const b = Math.random() < 0.55 ? 0 : Math.random() < 0.75 ? 1 : 2;
    const W = R.W, H = R.H;
    return {
      x: Math.random() * (W + 120) - 90,
      y: anywhere ? Math.random() * H : -Math.random() * 60,
      l: b === 2 ? 14 + Math.random() * 18 : b === 1 ? 8 + Math.random() * 10 : 4 + Math.random() * 6,
      s: b === 2 ? 900 + Math.random() * 300 : b === 1 ? 640 + Math.random() * 200 : 420 + Math.random() * 160,
      par: b === 2 ? 1.1 : b === 1 ? 0.8 : 0.5,
      b,
    };
  }

  function setWeather(w) {
    w = w || {};
    WX.rainMul = w.rain || 1;
    WX.windBase = w.wind != null ? w.wind : 0.32;
    WX.bolts = w.bolts || [5, 15];
    WX.nextBolt = Math.min(WX.nextBolt, 3);
  }

  BL.world = { setWeather, setup, tickWeather, drawSky, drawFar, drawWires, drawTerrain, drawStructures, drawSectors, drawRain, WX, strike };
})();
