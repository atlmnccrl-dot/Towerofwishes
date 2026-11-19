// BLACKLINE — canvas, camera, palette, line helpers, grain and vignette.
(function () {
  const BL = window.BL;
  const { clamp, lerp } = BL;

  const PAL = {
    bg: '#030303',
    ink: '#ebe4d2',        // off-white line
    inkDim: 'rgba(235,228,210,0.55)',
    inkFaint: 'rgba(235,228,210,0.22)',
    cream: '#e7dfc9',      // friendly vehicle fill
    foe: '#b9b2a4',        // enemy line
    red: '#b8433a',        // the one colour
    redDim: 'rgba(184,67,58,0.55)',
    black: '#040404',
  };

  const R = {
    cv: null, ctx: null, dpr: 1, W: 0, H: 0,
    cam: { x: 600, y: 300, z: 1.2, tx: 600, tz: 1.2, vx: 0, yOff: 0, follow: null, shake: 0, sx: 0, sy: 0, auto: false },
    time: 0, boil: 0, quality: 1, mobile: false,
    PAL,
  };

  function init(canvas) {
    R.cv = canvas;
    R.ctx = canvas.getContext('2d', { alpha: false });
    R.mobile = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    R.quality = R.mobile ? 0.7 : 1;
    resize();
    window.addEventListener('resize', resize);
    buildGrain();
  }

  function resize() {
    const dprCap = R.mobile ? 2 : 2;
    R.dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    R.W = window.innerWidth;
    R.H = window.innerHeight;
    R.cv.width = Math.round(R.W * R.dpr);
    R.cv.height = Math.round(R.H * R.dpr);
    R.cv.style.width = R.W + 'px';
    R.cv.style.height = R.H + 'px';
    R.vignette = null;
  }

  // ---------------------------------------------------------------- camera

  function zoomLimits(field) {
    return { min: R.W / (field.W + 300), max: 4.2 };
  }

  function groundAvg(field, x, halfW) {
    let s = 0, n = 0;
    const step = Math.max(8, halfW / 12);
    for (let xx = x - halfW; xx <= x + halfW; xx += step) { s += BL.heightAt(field, xx); n++; }
    return s / n;
  }

  function updateCamera(field, dt) {
    const c = R.cam;
    const lim = zoomLimits(field);
    c.tz = clamp(c.tz, lim.min, lim.max);
    c.z += (c.tz - c.z) * Math.min(1, dt * 9);
    if (c.follow) {
      const fx = c.follow();
      if (fx != null) c.tx = fx;
    }
    c.tx += c.vx * dt;
    c.vx *= Math.pow(0.04, dt);
    const half = R.W / 2 / c.z;
    const lo = -100 + half, hi = field.W + 100 - half;
    c.tx = lo > hi ? field.W / 2 : clamp(c.tx, lo, hi);
    c.x += (c.tx - c.x) * Math.min(1, dt * 10);
    // vertical framing: ground sits low in the frame, more sky when zoomed out
    const g = groundAvg(field, c.x, half);
    const zt = clamp((c.z - lim.min) / (1.2 - lim.min), 0, 1);
    const frac = lerp(0.24, 0.17, zt);
    const ty = g + (R.H * frac) / c.z + c.yOff;
    c.y += (ty - c.y) * Math.min(1, dt * 6);
    c.yOff = clamp(c.yOff, -R.H * 0.25 / c.z, R.H * 0.4 / c.z);
    // shake
    c.shake = Math.max(0, c.shake - dt * 1.8);
    const s = c.shake * c.shake * 9;
    c.sx = (Math.random() * 2 - 1) * s;
    c.sy = (Math.random() * 2 - 1) * s;
  }

  function sx(x) { return (x - R.cam.x) * R.cam.z + R.W / 2 + R.cam.sx; }
  function sy(y) { return R.H / 2 - (y - R.cam.y) * R.cam.z + R.cam.sy; }
  function wx(px) { return (px - R.W / 2) / R.cam.z + R.cam.x; }
  function wy(py) { return (R.H / 2 - py) / R.cam.z + R.cam.y; }
  function viewX0() { return wx(-40); }
  function viewX1() { return wx(R.W + 40); }

  function addShake(amount) { R.cam.shake = Math.min(1, R.cam.shake + amount); }

  // ---------------------------------------------------------------- line helpers

  function hash(n) {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  // A polyline with seeded wobble that changes a few times a second ("boil").
  function jpath(ctx, pts, seed, amp, close) {
    const b = R.boil * 101;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i += 2) {
      const jx = (hash(seed + i * 7.3 + b) - 0.5) * amp;
      const jy = (hash(seed + i * 3.1 + b + 50) - 0.5) * amp;
      if (i === 0) ctx.moveTo(pts[i] + jx, pts[i + 1] + jy);
      else ctx.lineTo(pts[i] + jx, pts[i + 1] + jy);
    }
    if (close) ctx.closePath();
  }

  // ---------------------------------------------------------------- post

  function buildGrain() {
    const n = 160;
    const g = document.createElement('canvas');
    g.width = n; g.height = n;
    const x = g.getContext('2d');
    const img = x.createImageData(n, n);
    for (let i = 0; i < n * n; i++) {
      const r = Math.random();
      const v = r < 0.5 ? 255 : 0;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = Math.random() < 0.35 ? Math.floor(Math.random() * 120) : 0;
    }
    x.putImageData(img, 0, 0);
    R.grain = g;
  }

  function post(ctx) {
    // grain
    ctx.save();
    ctx.globalAlpha = 0.07;
    const g = R.grain;
    const ox = -Math.floor(Math.random() * g.width), oy = -Math.floor(Math.random() * g.height);
    for (let y = oy; y < R.H; y += g.height) for (let x = ox; x < R.W; x += g.width) ctx.drawImage(g, x, y);
    ctx.restore();
    // vignette
    if (!R.vignette) {
      const v = document.createElement('canvas');
      v.width = 256; v.height = 256;
      const vx = v.getContext('2d');
      const grd = vx.createRadialGradient(128, 128, 60, 128, 128, 182);
      grd.addColorStop(0, 'rgba(0,0,0,0)');
      grd.addColorStop(1, 'rgba(0,0,0,0.75)');
      vx.fillStyle = grd;
      vx.fillRect(0, 0, 256, 256);
      R.vignette = v;
    }
    ctx.drawImage(R.vignette, 0, 0, R.W, R.H);
  }

  BL.R = R;
  BL.PAL = PAL;
  BL.render = { init, resize, updateCamera, zoomLimits, sx, sy, wx, wy, viewX0, viewX1, addShake, hash, jpath, post };
})();
