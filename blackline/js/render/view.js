// BLACKLINE — canvas, camera and the angled top-down projection; line helpers, grain, vignette.
// Ground point (x, y) at height h lands on screen at
//   sx = (x - cam.x) * z + W/2,   sy = ((y - cam.y) * K - h * HZ) * z + H/2
(function () {
  const BL = window.BL;
  const { clamp } = BL;

  const K = 0.62;   // depth foreshortening: the camera looks down at the field at an angle
  const HZ = 0.85;  // how far height lifts a point up the screen

  const PAL = {
    bg: '#040404',
    ink: '#ebe4d2',
    inkDim: 'rgba(235,228,210,0.55)',
    inkFaint: 'rgba(235,228,210,0.22)',
    cream: '#e7dfc9',
    foe: '#bdb6a8',
    red: '#b8433a',
    redDim: 'rgba(184,67,58,0.55)',
    panel: 'rgba(6,6,6,0.78)',
    line: 'rgba(235,228,210,0.22)',
  };
  const FONT = '"Barlow Condensed", "Arial Narrow", "Roboto Condensed", sans-serif';

  const R = {
    cv: null, ctx: null, dpr: 1, W: 0, H: 0,
    cam: { x: 600, y: 900, z: 1, tx: 600, ty: 900, tz: 1, vx: 0, vy: 0, follow: null, shake: 0, sx: 0, sy: 0 },
    time: 0, boil: 0, quality: 1, mobile: false, PAL, FONT, K, HZ,
  };

  function init(canvas) {
    R.cv = canvas;
    R.ctx = canvas.getContext('2d', { alpha: false });
    R.mobile = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    R.quality = R.mobile ? 0.7 : 1;
    resize();
    window.addEventListener('resize', resize);
    buildGrain();
  }

  function resize() {
    R.dpr = Math.min(window.devicePixelRatio || 1, 2);
    R.W = window.innerWidth; R.H = window.innerHeight;
    R.cv.width = Math.round(R.W * R.dpr); R.cv.height = Math.round(R.H * R.dpr);
    R.cv.style.width = R.W + 'px'; R.cv.style.height = R.H + 'px';
    R.vignette = null;
  }

  // ---------------------------------------------------------------- camera

  function zoomLimits(field) {
    return { min: Math.min(R.W / (field.W * 1.02), R.H / (field.H * K * 1.15)), max: 3.2 };
  }

  function updateCamera(field, dt) {
    const c = R.cam;
    const lim = zoomLimits(field);
    c.tz = clamp(c.tz, lim.min, lim.max);
    c.z += (c.tz - c.z) * Math.min(1, dt * 9);
    if (c.follow) { const p = c.follow(); if (p) { c.tx = p.x; c.ty = p.y; } }
    c.tx += c.vx * dt; c.ty += c.vy * dt;
    const damp = Math.pow(0.04, dt);
    c.vx *= damp; c.vy *= damp;
    c.tx = clamp(c.tx, 0, field.W); c.ty = clamp(c.ty, 0, field.H);
    c.x += (c.tx - c.x) * Math.min(1, dt * 10);
    c.y += (c.ty - c.y) * Math.min(1, dt * 10);
    c.shake = Math.max(0, c.shake - dt * 1.8);
    const s = c.shake * c.shake * 9;
    c.sx = (Math.random() * 2 - 1) * s; c.sy = (Math.random() * 2 - 1) * s;
  }

  function sx(x) { return (x - R.cam.x) * R.cam.z + R.W / 2 + R.cam.sx; }
  function sy(y, h) { return ((y - R.cam.y) * K - (h || 0) * HZ) * R.cam.z + R.H / 2 + R.cam.sy; }
  // screen → ground, settling on the terrain height
  function toGround(px, py, field) {
    const x = (px - R.W / 2) / R.cam.z + R.cam.x;
    let y = (py - R.H / 2) / (R.cam.z * K) + R.cam.y;
    if (field) for (let i = 0; i < 3; i++) { const h = BL.heightAt(field, x, y); y = ((py - R.H / 2) / R.cam.z + h * HZ) / K + R.cam.y; }
    return { x, y };
  }
  function viewRect(pad) {
    pad = pad || 80;
    return { x0: R.cam.x - (R.W / 2 + pad) / R.cam.z, x1: R.cam.x + (R.W / 2 + pad) / R.cam.z, y0: R.cam.y - (R.H / 2 + pad) / (R.cam.z * K), y1: R.cam.y + (R.H / 2 + pad + 120) / (R.cam.z * K) };
  }
  function addShake(a) { R.cam.shake = Math.min(1, R.cam.shake + a); }

  // ---------------------------------------------------------------- line helpers

  function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

  // A polyline with seeded wobble that switches a few times a second ("boil").
  function jpath(ctx, pts, seed, amp, close) {
    const b = R.boil * 101;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i += 2) {
      const jx = (hash(seed + i * 7.3 + b) - 0.5) * amp, jy = (hash(seed + i * 3.1 + b + 50) - 0.5) * amp;
      if (i === 0) ctx.moveTo(pts[i] + jx, pts[i + 1] + jy); else ctx.lineTo(pts[i] + jx, pts[i + 1] + jy);
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
      const v = Math.random() < 0.5 ? 255 : 0;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = Math.random() < 0.35 ? Math.floor(Math.random() * 120) : 0;
    }
    x.putImageData(img, 0, 0);
    R.grain = g;
  }

  function post(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.06;
    const g = R.grain;
    const ox = -Math.floor(Math.random() * g.width), oy = -Math.floor(Math.random() * g.height);
    for (let y = oy; y < R.H; y += g.height) for (let x = ox; x < R.W; x += g.width) ctx.drawImage(g, x, y);
    ctx.restore();
    if (!R.vignette) {
      const v = document.createElement('canvas');
      v.width = 256; v.height = 256;
      const vx = v.getContext('2d');
      const grd = vx.createRadialGradient(128, 128, 70, 128, 128, 182);
      grd.addColorStop(0, 'rgba(0,0,0,0)');
      grd.addColorStop(1, 'rgba(0,0,0,0.7)');
      vx.fillStyle = grd; vx.fillRect(0, 0, 256, 256);
      R.vignette = v;
    }
    ctx.drawImage(R.vignette, 0, 0, R.W, R.H);
  }

  BL.R = R;
  BL.PAL = PAL;
  BL.render = { init, resize, updateCamera, zoomLimits, sx, sy, toGround, viewRect, addShake, hash, jpath, post, K, HZ };
})();
