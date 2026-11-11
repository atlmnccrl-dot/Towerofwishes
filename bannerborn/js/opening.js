// Bannerborn — the opening, a film of its own. Eleven shots, each in its own manner, none of them the game's camera
// until the tenth:
//   1 the tapestry   the old story stitched in thread as the cloth slides by: nine banners, nine knights
//   2 the oath       the stitched knights from below, a sun of thread turning behind them
//   3 the tear       the cloth rips from top to bottom and something violet looks through
//   4 the gate       from the grass, looking up: the Gravegate, too tall for the frame, waking
//   5 the cantor     a dolly zoom on Vesh Morrow: the world rushes past him while he does not move
//   6 the song       the vale from above, as a map: his song rolls out in rings, the graves answer, the banners fall
//   7 the rising     five cuts: a hand, eyes, marching legs, a shape from below, a ridge under the moon
//   8 nine to one    nine windows of coloured glass; eight break
//   9 the ninth      the real game, slowed: your Captain alone as the dead close in, the blow, the frame held
//  10 raise it       dawn, your banner on the wind, three words
//  11 the name       cut on a blade's line; the letters are struck; the first shot's thread signs it
// The cutscene engine (js/cinema.js) plays it: it gives each shot its time, cues, bars, grain and subtitle.
(function () {
  const BB = window.BB, C = BB.Cinema; if (!C || !C.kit) return;
  const K = C.kit, TAU = Math.PI * 2;
  const lerp = (a, b, k) => a + (b - a) * k, cl = (k) => Math.max(0, Math.min(1, k));
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2), easeOut = (k) => 1 - Math.pow(1 - k, 3), easeIn = (k) => k * k * k;
  const rnd = (i, s) => { const v = Math.sin(i * 127.1 + (s || 0) * 311.7) * 43758.5453; return v - Math.floor(v); };
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
  const DISP = 'Cinzel, "Cormorant Garamond", Georgia, serif', HEAD = 'Outfit, sans-serif';
  const GOLD = '#e8c66a';
  let F = null; // the film's cast and things built once

  // ---------------------------------------------------------------- the cast, as cut-outs
  // The game's people are small pixel figures (about 42 px tall). The film never blows one up to fill the frame: the
  // big shapes (the gate, the Cantor's face, the hand) are drawn for it, and the figures stand in them at a size
  // that keeps them crisp. Foe sheets carry a soft ground shadow; it is cut away here so a figure can stand anywhere.
  const sprC = new Map(); let sprN = 0;
  function spr(a, clip, dir, fr, col) {
    const id = a._oid || (a._oid = ++sprN), key = id + '|' + clip + '|' + dir + '|' + fr + '|' + (col || ''); let c = sprC.get(key); if (c) return c;
    if (sprC.size > 600) sprC.clear();
    c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingEnabled = false;
    K.drawActor(x, a, clip, dir, fr, 64, 90, 1);
    try { const im = x.getImageData(0, 0, 128, 128), d = im.data; for (let i = 3; i < d.length; i += 4) d[i] = d[i] < 200 ? 0 : 255; x.putImageData(im, 0, 0); } catch (e) { /* keep it as drawn */ }
    if (col) { x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, 128, 128); }
    sprC.set(key, c); return c;
  }
  const frAt = (a, clip, t, fps) => Math.floor(t * (fps || 8)) % K.clipLen(a, clip);
  const hold = (a, clip, p) => Math.min(K.clipLen(a, clip) - 1, Math.floor(cl(p) * K.clipLen(a, clip)));
  function put(g, cv, x, y, h, flip) { const m = h / 42; g.save(); g.translate(x, y); if (flip) g.scale(-1, 1); g.drawImage(cv, -64 * m, -90 * m, 128 * m, 128 * m); g.restore(); }
  // the same cut-out seen from below: wide at the feet, narrowing to the head
  function putLow(g, cv, x, y, h, taper) { const m = h / 42; for (let s = 0; s < 16; s++) { const ws = lerp(1 - taper, 1 + taper * 0.35, (s + 0.5) / 16); g.drawImage(cv, 0, s * 8, 128, 8, x - 64 * m * ws, y - 90 * m + s * 8 * m, 128 * m * ws, 8 * m + 1); } }
  // a figure: its own colours (or one flat colour), an edge light, a wash of shade
  function fig(g, a, clip, dir, fr, x, y, h, o) {
    o = o || {}; const d = Math.max(1, h * 0.017), P = o.low ? (cv, xx, yy) => putLow(g, cv, xx, yy, h, o.low) : (cv, xx, yy) => put(g, cv, xx, yy, h, o.flip);
    if (o.rim) { const r = spr(a, clip, dir, fr, o.rim); P(r, x - d, y); P(r, x + d, y); P(r, x, y - d); }
    P(spr(a, clip, dir, fr, o.flat), x, y);
    if (o.shade && !o.flat) { g.save(); g.globalAlpha *= o.shadeA === undefined ? 0.5 : o.shadeA; P(spr(a, clip, dir, fr, o.shade), x, y); g.restore(); }
  }
  const eyesOf = (g, a, clip, dir, fr, x, y, h, col, al) => { const m = h / 42, ey = y - K.headLift(a, clip, dir, fr) * m; g.save(); g.globalCompositeOperation = 'lighter'; for (const s of [-1, 1]) { const ex = x + s * m * 2, gl = g.createRadialGradient(ex, ey, 0, ex, ey, m * 4); gl.addColorStop(0, 'rgba(255,255,255,' + al + ')'); gl.addColorStop(0.35, 'rgba(' + col + ',' + al * 0.7 + ')'); gl.addColorStop(1, 'rgba(' + col + ',0)'); g.fillStyle = gl; g.fillRect(ex - m * 4, ey - m * 4, m * 8, m * 8); } g.restore(); };

  // a figure worked in cross-stitch: a pixel is a stitch. Made once per knight, large, and drawn at any size.
  function stitchOf(a) {
    const src = spr(a, 'Idle', 2, 0), c = document.createElement('canvas'); c.width = 768; c.height = 640; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    x.drawImage(src, 16, 20, 96, 80, 0, 0, 768, 640);
    const cell = (draw) => { const p = document.createElement('canvas'); p.width = p.height = 8; draw(p.getContext('2d')); return x.createPattern(p, 'repeat'); };
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = cell((q) => { q.lineCap = 'round'; q.lineWidth = 1.7; q.strokeStyle = 'rgba(0,0,0,0.2)'; q.beginPath(); q.moveTo(8, 0); q.lineTo(0, 8); q.stroke(); q.strokeStyle = 'rgba(255,255,255,0.3)'; q.beginPath(); q.moveTo(0, 0); q.lineTo(8, 8); q.stroke(); });
    x.fillRect(0, 0, 768, 640);
    x.globalCompositeOperation = 'destination-out';
    x.fillStyle = cell((q) => { q.fillStyle = '#000'; for (const [px, py] of [[4, 0], [4, 8], [0, 4], [8, 4]]) { q.beginPath(); q.moveTo(px, py - 1.5); q.lineTo(px + 1.5, py); q.lineTo(px, py + 1.5); q.lineTo(px - 1.5, py); q.fill(); } });
    x.fillRect(0, 0, 768, 640);
    x.globalCompositeOperation = 'destination-over'; x.globalAlpha = 0.55; x.drawImage(spr(a, 'Idle', 2, 0, '#05050c'), 16, 20, 96, 80, 14, 14, 768, 640); // the shadow the raised work throws on the cloth
    return c;
  }
  function putStitch(g, i, x, y, h) { const m = h / 42 / 8, sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = true; g.drawImage(F.stitch[i], x - 384 * m, y - 560 * m, 768 * m, 640 * m); g.imageSmoothingEnabled = sm; }

  // ---------------------------------------------------------------- thread and cloth
  let weave = null;
  function cloth(g, W, H, ox, top, bot) {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    if (!weave) { weave = document.createElement('canvas'); weave.width = weave.height = 6; const x = weave.getContext('2d'); x.fillStyle = 'rgba(255,255,255,0.07)'; x.fillRect(0, 0, 6, 1); x.fillStyle = 'rgba(0,0,0,0.22)'; x.fillRect(0, 3, 6, 1); x.fillStyle = 'rgba(255,255,255,0.05)'; x.fillRect(0, 0, 1, 6); x.fillStyle = 'rgba(0,0,0,0.16)'; x.fillRect(3, 0, 1, 6); }
    g.save(); g.translate(-(ox % 6), 0); g.fillStyle = g.createPattern(weave, 'repeat'); g.fillRect(0, 0, W + 6, H); g.restore();
  }
  // a line of stitches from the first point toward the last, as far as k of its length; returns where the needle is
  function thread(g, pts, k, col, w, dash) {
    if (k <= 0) return [pts[0], pts[1]];
    let total = 0; for (let i = 2; i < pts.length; i += 2) total += Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]);
    let left = total * Math.min(1, k), hx = pts[0], hy = pts[1];
    g.beginPath(); g.moveTo(hx, hy);
    for (let i = 2; i < pts.length && left > 0; i += 2) { const d = Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]), q = d ? Math.min(1, left / d) : 1; hx = lerp(pts[i - 2], pts[i], q); hy = lerp(pts[i - 1], pts[i + 1], q); g.lineTo(hx, hy); left -= d; }
    g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash(dash || [w * 3.4, w * 1.7]);
    g.save(); g.translate(0, w * 0.45); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = w; g.stroke(); g.restore();
    g.strokeStyle = col; g.lineWidth = w; g.stroke(); g.setLineDash([]);
    return [hx, hy];
  }
  function needle(g, x, y, u, ang) { g.save(); g.translate(x, y); g.rotate(ang || -0.3); g.strokeStyle = '#e9eef6'; g.lineWidth = u * 0.45; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.lineTo(u * 7, 0); g.stroke(); g.fillStyle = '#fff'; g.globalCompositeOperation = 'lighter'; for (const s of [1, 0.5]) { g.globalAlpha = 0.5; g.fillRect(u * 7 - u * 2.2 * s, -u * 0.12, u * 4.4 * s, u * 0.24); g.fillRect(u * 7 - u * 0.12, -u * 2.2 * s, u * 0.24, u * 4.4 * s); } g.restore(); }
  function spaced(g, s, x, y, gap, n, stroke) { // letters with air between them, the first n of them, centred on x
    let w = 0; const ws = []; for (const ch of s) { const cw = g.measureText(ch).width; ws.push(cw); w += cw + gap; } w -= gap;
    let cx = x - w / 2, i = 0; const al = g.textAlign; g.textAlign = 'left';
    for (const ch of s) { if (n !== undefined && i >= n) break; if (stroke) g.strokeText(ch, cx, y); g.fillText(ch, cx, y); cx += ws[i] + gap; i++; }
    g.textAlign = al; return w;
  }
  const pennant = (g, x, y, w, h, t, ph, gust) => { // a swallow-tailed pennant flying right of its pole, its edge alive
    const N = 8, A = h * 0.06 * (1 + (gust || 0) * 1.6), sp = 3 + (gust || 0) * 5; g.beginPath(); g.moveTo(x, y);
    for (let i = 1; i <= N; i++) { const f = i / N; g.lineTo(x + w * f, y + Math.sin(f * 4 - t * sp + ph) * A * f); }
    g.lineTo(x + w * 0.72, y + h * 0.5 + Math.sin(2.9 - t * sp + ph) * A * 0.8);
    for (let i = N; i >= 0; i--) { const f = i / N; g.lineTo(x + w * f, y + h + Math.sin(f * 4 - t * sp + ph + 0.6) * A * f); }
    g.closePath();
  };
  let hatch = null;
  function stitchedPennant(g, x, y, w, h, t, i, b, u, a, gust) { // its colour, laid in slanting stitches, and a gold edge
    if (!hatch) { hatch = document.createElement('canvas'); hatch.width = hatch.height = 6; const q = hatch.getContext('2d'); q.strokeStyle = 'rgba(0,0,0,0.3)'; q.lineWidth = 1.2; q.beginPath(); q.moveTo(-1, 5); q.lineTo(5, -1); q.moveTo(2, 8); q.lineTo(8, 2); q.stroke(); q.strokeStyle = 'rgba(255,255,255,0.12)'; q.beginPath(); q.moveTo(-1, 2); q.lineTo(2, -1); q.moveTo(2, 5); q.lineTo(5, 2); q.moveTo(5, 8); q.lineTo(8, 5); q.stroke(); }
    g.save(); g.globalAlpha *= a; pennant(g, x, y, w, h, t, i, gust); g.fillStyle = b.color; g.fill(); g.fillStyle = g.createPattern(hatch, 'repeat'); g.fill();
    g.setLineDash([u * 1.1, u * 0.7]); g.strokeStyle = i === 8 ? '#fff0c0' : GOLD; g.lineWidth = u * 0.42; g.stroke(); g.setLineDash([]); g.restore();
  }

  // ---------------------------------------------------------------- a skull, drawn (the gate's keystone, the Cantor's face, what looks back from a broken window)
  function skull(g, x, y, s, o) {
    o = o || {}; const jaw = (o.jaw || 0) * 0.46, dark = o.dark || '#020403', G = o.glow || '125,255,176', eye = o.eye === undefined ? 1 : o.eye, lite = o.bone || '#e6fff0';
    g.save(); g.translate(x, y); g.rotate(o.tilt || 0); g.scale(s, s);
    const gr = g.createLinearGradient(0, -1.05, 0, 1.4); gr.addColorStop(0, o.shadow || '#12241a'); gr.addColorStop(0.55, o.mid || '#5f8a70'); gr.addColorStop(1, lite);
    g.save(); g.translate(0, jaw); // the jaw hangs behind the face
    g.beginPath(); g.moveTo(-0.58, 0.42); g.lineTo(-0.48, 1.08); g.lineTo(-0.2, 1.3); g.lineTo(0.2, 1.3); g.lineTo(0.48, 1.08); g.lineTo(0.58, 0.42); g.lineTo(0.42, 0.6); g.lineTo(0.34, 0.97); g.lineTo(-0.34, 0.97); g.lineTo(-0.42, 0.6); g.closePath(); g.fillStyle = gr; g.fill();
    g.fillStyle = dark; g.fillRect(-0.33, 0.84, 0.66, 0.14); g.fillStyle = lite; for (let i = 0; i < 7; i++) g.fillRect(-0.31 + i * 0.09, 0.85, 0.068, 0.12);
    g.restore();
    if (jaw > 0.02) { g.fillStyle = dark; g.fillRect(-0.34, 0.8, 0.68, jaw + 0.06); if (o.sing) { g.globalCompositeOperation = 'lighter'; const m = g.createRadialGradient(0, 0.84 + jaw * 0.5, 0, 0, 0.84 + jaw * 0.5, 0.5); m.addColorStop(0, 'rgba(' + G + ',' + o.sing + ')'); m.addColorStop(1, 'rgba(' + G + ',0)'); g.fillStyle = m; g.fillRect(-0.5, 0.6, 1, jaw + 0.6); g.globalCompositeOperation = 'source-over'; } }
    g.beginPath(); g.moveTo(-0.52, 0.5); g.bezierCurveTo(-1.02, 0.32, -0.96, -1.05, 0, -1.05); g.bezierCurveTo(0.96, -1.05, 1.02, 0.32, 0.52, 0.5); g.lineTo(0.38, 0.84); g.lineTo(-0.38, 0.84); g.closePath(); g.fillStyle = gr; g.fill();
    g.fillStyle = dark;
    for (const d of [-1, 1]) { g.beginPath(); g.moveTo(d * 0.11, -0.08); g.quadraticCurveTo(d * 0.42, -0.36, d * 0.7, -0.33); g.quadraticCurveTo(d * 0.78, -0.12, d * 0.66, 0.04); g.quadraticCurveTo(d * 0.44, 0.24, d * 0.24, 0.16); g.quadraticCurveTo(d * 0.12, 0.1, d * 0.11, -0.08); g.fill(); // sockets, the brow drawn down
      g.beginPath(); g.moveTo(d * 0.7, 0.22); g.lineTo(d * 0.5, 0.62); g.lineTo(d * 0.58, 0.3); g.fill(); }
    g.beginPath(); g.moveTo(0, 0.2); g.lineTo(-0.13, 0.5); g.lineTo(-0.03, 0.45); g.lineTo(0, 0.55); g.lineTo(0.03, 0.45); g.lineTo(0.13, 0.5); g.closePath(); g.fill();
    g.fillRect(-0.37, 0.67, 0.74, 0.19); g.fillStyle = lite; for (let i = 0; i < 8; i++) g.fillRect(-0.355 + i * 0.09, 0.69, 0.07, 0.15 + (i === 2 || i === 5 ? 0.05 : 0));
    g.strokeStyle = dark; g.lineWidth = 0.022; g.lineJoin = 'round'; g.beginPath(); g.moveTo(0.22, -1.02); g.lineTo(0.3, -0.8); g.lineTo(0.2, -0.68); g.lineTo(0.32, -0.5); g.moveTo(-0.5, -0.86); g.lineTo(-0.42, -0.7); g.lineTo(-0.5, -0.6); g.stroke();
    if (eye > 0) { g.globalCompositeOperation = 'lighter'; for (const d of [-1, 1]) { const ex = d * 0.42, ey = -0.08, gl = g.createRadialGradient(ex, ey, 0, ex, ey, 0.62); gl.addColorStop(0, 'rgba(255,255,255,' + eye + ')'); gl.addColorStop(0.16, 'rgba(' + G + ',' + eye * 0.95 + ')'); gl.addColorStop(0.5, 'rgba(' + G + ',' + eye * 0.25 + ')'); gl.addColorStop(1, 'rgba(' + G + ',0)'); g.fillStyle = gl; g.fillRect(ex - 0.62, ey - 0.62, 1.24, 1.24); if (o.streak) { g.fillStyle = 'rgba(' + G + ',' + eye * 0.4 + ')'; g.fillRect(ex - 1.1, ey - 0.014, 2.2, 0.028); } } }
    g.restore();
  }
  function rune(g, x, y, r, q) { // a stave and what hangs on it
    g.beginPath(); g.moveTo(x, y - r); g.lineTo(x, y + r);
    if (q === 0) { g.moveTo(x, y - r * 0.6); g.lineTo(x + r * 0.7, y - r); g.moveTo(x, y); g.lineTo(x + r * 0.7, y - r * 0.4); }
    else if (q === 1) { g.moveTo(x, y - r * 0.7); g.lineTo(x + r * 0.6, y - r * 0.1); g.lineTo(x, y + r * 0.5); g.lineTo(x - r * 0.6, y - r * 0.1); g.closePath(); }
    else if (q === 2) { g.moveTo(x - r * 0.6, y - r * 0.5); g.lineTo(x + r * 0.6, y + r * 0.5); g.moveTo(x + r * 0.6, y - r * 0.5); g.lineTo(x - r * 0.6, y + r * 0.5); }
    else { g.moveTo(x - r * 0.7, y - r * 0.2); g.lineTo(x, y - r); g.lineTo(x + r * 0.7, y - r * 0.2); g.moveTo(x - r * 0.5, y + r * 0.6); g.lineTo(x + r * 0.5, y + r * 0.6); }
    g.stroke(); }

  // ================================================================ 1 · the tapestry
  function drawTapestry(g, W, H, sh, k, t) {
    const u = H / 100, span = W * 2.12, camX = lerp(0, span - W, ease(cl((t - 0.7) / (sh.dur - 1.5)))), gy = H * 0.8;
    cloth(g, W, H, camX * 0.6, '#1b1d38', '#0b0c18');
    g.save(); g.translate(-camX * 0.35, 0); // far hills, sewn in three passes, sliding slower than the cloth in front
    for (let j = 0; j < 3; j++) { const pts = []; for (let x = -W * 0.1; x < span; x += W * 0.03) pts.push(x, H * (0.58 + j * 0.045) - Math.sin(x * 0.0042 * (1 + j * 0.3) + j * 2) * u * (8 - j * 2) - Math.sin(x * 0.012 + j) * u * 2); thread(g, pts, cl(t / 2.6 - j * 0.12), ['#343a66', '#444a80', '#565b98'][j], u * 0.34, [u * 1.3, u * 1.3]); }
    { const a = cl((t - (sh.dur - 4.4)) / 1.6), sx = span * 0.62, sy = H * 0.3; if (a > 0) { g.globalAlpha = a; for (let i = 0; i < 28; i++) { const an = i / 28 * TAU + t * 0.1; thread(g, [sx + Math.cos(an) * u * 7, sy + Math.sin(an) * u * 7, sx + Math.cos(an) * u * (11 + (i % 2) * 4), sy + Math.sin(an) * u * (11 + (i % 2) * 4)], 1, GOLD, u * 0.3, [u, u]); } g.beginPath(); g.arc(sx, sy, u * 5.6, 0, TAU); g.setLineDash([u * 1.2, u * 0.8]); g.strokeStyle = GOLD; g.lineWidth = u * 0.5; g.stroke(); g.setLineDash([]); g.globalAlpha = 1; } }
    g.restore();
    for (const y of [0.145, 0.855]) { const pts = [], o = camX % (u * 6); for (let x = -u * 6; x < W + u * 6; x += u * 3) pts.push(x - o, H * y + (Math.round(x / (u * 3)) % 2 ? u : -u)); thread(g, pts, 1, 'rgba(232,198,106,0.55)', u * 0.3, [u * 1.2, u * 0.9]); } // the border
    g.save(); g.translate(-camX, 0);
    const gk = cl(t / (sh.dur - 1.3)), head = thread(g, [-W * 0.05, gy, span, gy], gk, GOLD, u * 0.62);
    for (let i = 0; i < 9; i++) {
      const x = W * (0.42 + i * 0.19), p = cl((t - sh.at[i]) / 0.8); if (p <= 0) continue;
      const b = F.banners[i], top = gy - H * 0.5, pw = H * 0.14, ph = H * 0.17, mine = i === 8;
      thread(g, [x, gy, x, top - u * 2], cl(p * 2.2), mine ? '#fff0c0' : '#b9a36a', u * 0.5);
      const fa = cl(p * 2.4 - 0.8); if (fa > 0) stitchedPennant(g, x, top, pw, ph, t, i, b, u, fa);
      const ka = cl(p * 3 - 1.7); if (ka > 0) { g.globalAlpha = ka; putStitch(g, i, x + H * 0.1, gy + (1 - easeOut(ka)) * u * 3, H * 0.3); g.globalAlpha = 1; }
      g.globalAlpha = cl(p * 3 - 1.2) * 0.9; g.font = '600 ' + Math.round(u * 3.2) + 'px ' + DISP; g.textAlign = 'right'; g.fillStyle = mine ? '#fff0c0' : '#a8956a'; g.fillText(ROMAN[i], x - u * 1.6, top + ph * 0.62); g.textAlign = 'center'; g.globalAlpha = 1;
      if (mine && p >= 1) { g.globalCompositeOperation = 'lighter'; const gl = g.createRadialGradient(x + pw * 0.5, top + ph, 0, x + pw * 0.5, top + ph, H * 0.42); gl.addColorStop(0, 'rgba(255,220,140,' + (0.22 + Math.sin(t * 3) * 0.05) + ')'); gl.addColorStop(1, 'rgba(255,220,140,0)'); g.fillStyle = gl; g.fillRect(x - H * 0.4, top - H * 0.3, H * 0.9, H * 0.9); g.globalCompositeOperation = 'source-over'; }
    }
    if (gk < 1) needle(g, head[0], head[1], u, -0.28 + Math.sin(t * 9) * 0.05);
    g.restore();
    { // the heading, sewn a letter at a time, then let go
      const s = 'THREE HUNDRED YEARS AGO', a = cl(Math.min(1, (4.6 - t) / 0.7)); if (a > 0) { g.globalAlpha = a; g.font = '800 ' + Math.round(u * 5.4) + 'px ' + DISP; g.textBaseline = 'middle'; g.fillStyle = '#f3e3b6'; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = u * 0.5; spaced(g, s, W / 2, H * 0.215, u * 1.5, Math.floor(cl((t - 0.3) / 1.3) * s.length), true); g.globalAlpha = 1; g.textBaseline = 'alphabetic'; }
    }
  }

  // ================================================================ 2 · the oath (from below)
  function wheelCv() {
    if (F.wheel) return F.wheel; const R = 520, c = F.wheel = document.createElement('canvas'); c.width = c.height = R * 2; const x = c.getContext('2d'); x.translate(R, R);
    for (let i = 0; i < 72; i++) { const an = i / 72 * TAU, r0 = R * (0.2 + (i % 2) * 0.03), r1 = R * (0.55 + rnd(i) * 0.45), cs = Math.cos(an), sn = Math.sin(an); x.globalAlpha = 0.4 + (i % 3) * 0.15; thread(x, [cs * r0, sn * r0, cs * r1, sn * r1], 1, i % 2 ? '#ffd98a' : '#c9963a', 3.2, [14, 9]); }
    x.globalAlpha = 1; for (const r of [0.15, 0.18]) { x.beginPath(); x.arc(0, 0, R * r, 0, TAU); x.setLineDash([9, 6]); x.strokeStyle = '#ffe2a0'; x.lineWidth = 3.6; x.stroke(); } x.setLineDash([]);
    return c;
  }
  function drawOath(g, W, H, sh, k, t) {
    const u = H / 100, cx = W / 2, hy = H * 0.62, gust = cl(1 - Math.abs(t - 2.3) / 0.9);
    cloth(g, W, H, 0, '#402c14', '#140c06');
    const push = 1 + 0.12 * ease(k); g.save(); g.translate(cx, H * 0.92); g.scale(push, push); g.translate(-cx, -H * 0.92);
    { const RR = H * 1.05; g.save(); g.translate(cx, hy); g.rotate(t * 0.1); g.drawImage(wheelCv(), -RR, -RR, RR * 2, RR * 2); g.restore(); }
    { const gl = g.createRadialGradient(cx, hy, 0, cx, hy, H * 0.6); gl.addColorStop(0, 'rgba(255,214,130,0.55)'); gl.addColorStop(1, 'rgba(255,214,130,0)'); g.globalCompositeOperation = 'lighter'; g.fillStyle = gl; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; }
    // the ground, the poles and the nine figures never move: they are worked once, and laid on as one piece
    const spot = (i) => { const d = Math.abs(i - 4), sc = 1.22 - d * 0.14; return { sc, x: cx + (i - 4) * W * 0.113, fy: H * (0.975 - d * 0.068), h: H * 0.37 * sc, lean: -(i - 4) * 0.04 }; };
    let L = F.oathL; if (!L || L.width !== W || L.height !== H) { L = F.oathL = document.createElement('canvas'); L.width = W; L.height = H; const q = L.getContext('2d');
      q.fillStyle = '#0d0805'; q.fillRect(0, H * 0.7, W, H);
      for (let i = -10; i <= 10; i++) thread(q, [cx + i * W * 0.012, H * 0.7, cx + i * W * 0.17, H * 1.1], 1, '#5b4520', u * 0.3, [u * 1.6, u * 1.4]);
      for (let j = 1; j < 6; j++) { const y = H * 0.7 + H * 0.4 * Math.pow(j / 6, 1.8); thread(q, [0, y, W, y], 1, '#4a3819', u * 0.3, [u * 2, u * 1.6]); }
      for (const i of [0, 8, 1, 7, 2, 6, 3, 5, 4]) { const S = spot(i), h = S.h; q.save(); q.translate(S.x, S.fy); q.rotate(S.lean); thread(q, [-h * 0.34, 0, -h * 0.34, -h * 1.72], 1, '#caa860', u * 0.42 * S.sc);
        const gl = q.createRadialGradient(0, -h * 0.5, 0, 0, -h * 0.5, h * 0.7); gl.addColorStop(0, 'rgba(255,226,160,0.3)'); gl.addColorStop(1, 'rgba(255,226,160,0)'); q.fillStyle = gl; q.fillRect(-h * 0.7, -h * 1.2, h * 1.4, h * 1.4);
        putStitch(q, i, 0, 0, h); q.restore(); } }
    g.fillStyle = '#0d0805'; g.fillRect(-W * 0.2, H * 0.7, W * 1.4, H); g.drawImage(L, 0, 0);
    for (let i = 0; i < 9; i++) { const S = spot(i), h = S.h; g.save(); g.translate(S.x, S.fy); g.rotate(S.lean); stitchedPennant(g, -h * 0.34, -h * 1.72 + u, h * 0.42, h * 0.44, t, i, F.banners[i], u * S.sc, 1, gust); g.restore(); } // every upright leans toward a point high over the middle
    g.restore();
  }

  // ================================================================ 3 · the tear
  function drawRip(g, W, H, sh, k, t) {
    const u = H / 100;
    if (!sh._snap || sh._snap.width !== W || sh._snap.height !== H) { const c = sh._snap = document.createElement('canvas'); c.width = W; c.height = H; drawOath(c.getContext('2d'), W, H, { dur: 4.4 }, 0.98, 4.38); }
    g.fillStyle = '#05030a'; g.fillRect(0, 0, W, H); // what is behind the cloth
    const tx = W * 0.52, ty = H * 0.5, gl = g.createRadialGradient(tx, ty, 0, tx, ty, H * 0.9); gl.addColorStop(0, 'rgba(190,140,255,0.95)'); gl.addColorStop(0.35, 'rgba(110,60,210,0.55)'); gl.addColorStop(1, 'rgba(20,8,50,0)'); g.fillStyle = gl; g.fillRect(0, 0, W, H);
    g.save(); g.translate(tx, ty); for (let i = 0; i < 7; i++) { g.rotate(t * (0.5 + i * 0.07) * (i % 2 ? 1 : -1)); g.beginPath(); g.ellipse(0, 0, H * (0.08 + i * 0.06), H * (0.16 + i * 0.1), 0, 0, TAU); g.setLineDash([u * 5, u * 3]); g.strokeStyle = 'rgba(225,200,255,' + (0.5 - i * 0.05) + ')'; g.lineWidth = u * 0.5; g.stroke(); } g.setLineDash([]); g.restore();
    { const a = cl((t - 1.5) / 1.2); if (a > 0) skull(g, tx, ty - u * 2, H * 0.2 * (1 + a * 0.5), { shadow: '#1a0d38', mid: '#5a3aa8', bone: '#e0d0ff', dark: '#05020c', glow: '225,200,255', eye: a }); } // and what looks back through it
    // the tear: a wound that opens behind its tip, then swallows the frame
    const tip = cl(t / 0.85) * 1.2, grow = easeIn(cl((t - 1.9) / 1.5)), N = 26, L = [], Rr = [];
    for (let j = 0; j <= N; j++) { const f = j / N, x = lerp(W * 0.76, W * 0.3, f) + (rnd(j, 3) - 0.5) * W * 0.05, y = f * H, w = Math.pow(cl((tip - f) / 0.7), 0.75) * W * (0.045 + rnd(j, 5) * 0.03) * (1 + grow * 22); L.push([x - w, y]); Rr.push([x + w * (0.8 + rnd(j, 7) * 0.5), y]); }
    g.save(); g.beginPath(); g.rect(0, 0, W, H); g.moveTo(L[0][0], L[0][1] - 2); for (const p of L) g.lineTo(p[0], p[1]); for (let j = N; j >= 0; j--) g.lineTo(Rr[j][0], Rr[j][1]); g.closePath(); g.clip('evenodd');
    g.drawImage(sh._snap, 0, 0); g.fillStyle = 'rgba(8,4,16,' + (0.25 + grow * 0.5) + ')'; g.fillRect(0, 0, W, H); g.restore();
    // the torn edges catch the light; cut threads hang and whip
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineWidth = u * 0.5; g.strokeStyle = 'rgba(230,205,255,0.9)';
    for (const side of [L, Rr]) { g.beginPath(); side.forEach((p, j) => { if (j) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.stroke(); }
    g.lineWidth = u * 0.28; g.strokeStyle = 'rgba(255,232,190,0.75)'; g.beginPath();
    for (let j = 1; j < N; j++) for (const [side, dir] of [[L, 1], [Rr, -1]]) { const p = side[j]; if (Math.abs(Rr[j][0] - L[j][0]) < u) continue; const len = u * (1.5 + rnd(j, dir + 9) * 5), an = Math.sin(t * 9 + j * 1.7) * 0.7 + 0.5; g.moveTo(p[0], p[1]); g.quadraticCurveTo(p[0] + dir * len * 0.6, p[1] + len * 0.2, p[0] + dir * len * Math.cos(an), p[1] + len * Math.sin(an)); }
    g.stroke(); g.restore();
    { const a = cl(Math.min((t - 0.95) / 0.3, (2.4 - t) / 0.4)); if (a > 0) { g.globalAlpha = a; g.font = '800 ' + Math.round(u * 6.4) + 'px ' + DISP; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = u * 0.8; spaced(g, 'THEN, ONE NIGHT', W * 0.27, H * 0.74, u * 1.6, undefined, true); g.globalAlpha = 1; g.textBaseline = 'alphabetic'; } }
  }

  // ================================================================ 4 · the gate, from the grass
  // The eye lies in the grass and looks up. Every upright runs to one point far overhead; as the head tips back
  // that point drops toward the frame and the pillars lean together. Runes light from the ground to the keystone.
  function drawGateUp(g, W, H, sh, k, t) {
    const u = H / 100, cx = W / 2, tilt = ease(cl((t - 0.15) / (sh.burstAt - 0.3))), vy = lerp(-2.6 * H, -0.1 * H, tilt), gy = lerp(0.72 * H, 0.83 * H, tilt), on = cl((t - sh.burstAt) / 0.35), wake = cl(t / sh.burstAt);
    const P = (x, f) => [lerp(x, cx, f), lerp(gy, vy, f)], xo = W * 0.5, xi = W * 0.175, xd = W * 0.128, fTop = 0.7, fArch = 0.6;
    const poly = (pts) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); };
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#05030c'); sky.addColorStop(1, '#170b2c'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    { const vx = cx, vyc = Math.max(vy, -H * 0.3) + H * 0.12; // the storm turns about the point overhead
      for (let i = 0; i < 40; i++) { const an = i * 2.4 + t * 0.14 * (1 + (i % 3) * 0.3), r = H * (0.22 + rnd(i, 41) * 1.05), x = vx + Math.cos(an) * r * 1.4, y = vyc + Math.sin(an) * r * 0.75, R = H * (0.16 + rnd(i, 42) * 0.2), lit = cl(1 - r / (H * 0.9)) * (0.25 + on * 0.5); const gl = g.createRadialGradient(x, y, 0, x, y, R); gl.addColorStop(0, 'rgba(' + Math.round(34 + lit * 150) + ',' + Math.round(20 + lit * 100) + ',' + Math.round(60 + lit * 190) + ',0.55)'); gl.addColorStop(1, 'rgba(20,10,40,0)'); g.fillStyle = gl; g.fillRect(x - R, y - R, R * 2, R * 2); }
      g.globalCompositeOperation = 'lighter'; const gl = g.createRadialGradient(vx, vyc, 0, vx, vyc, H * 0.7); gl.addColorStop(0, 'rgba(200,160,255,' + (0.1 + wake * 0.15 + on * 0.5) * tilt + ')'); gl.addColorStop(1, 'rgba(60,20,120,0)'); g.fillStyle = gl; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; }
    // what stands in the gate: light running up between the pillars
    { poly([P(cx - xd, -0.2), P(cx - xd, fArch + 0.04), P(cx + xd, fArch + 0.04), P(cx + xd, -0.2)]); const y0 = P(0, fArch)[1], gr = g.createLinearGradient(0, gy, 0, y0); gr.addColorStop(0, 'rgba(215,180,255,' + (0.3 + wake * 0.3 + on * 0.4) + ')'); gr.addColorStop(0.5, 'rgba(120,70,220,' + (0.22 + wake * 0.2 + on * 0.4) + ')'); gr.addColorStop(1, 'rgba(40,16,90,' + (0.25 + on * 0.5) + ')'); g.fillStyle = gr; g.fill();
      g.save(); g.clip(); g.strokeStyle = 'rgba(235,215,255,' + (0.12 + wake * 0.18 + on * 0.4) + ')'; for (let p3 = 0; p3 < 3; p3++) { g.lineWidth = u * (0.3 + p3 * 0.18); g.setLineDash([u * (9 - p3 * 2.5), u * (7 + p3 * 6)]); g.lineDashOffset = -t * u * (30 + p3 * 26 + on * 90); g.beginPath(); for (let i = p3; i < 15; i += 3) { const x = cx + (i / 14 - 0.5) * 2 * xd * 0.92, a = P(x, -0.1), b = P(x, fArch + 0.04); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); } g.stroke(); } g.setLineDash([]);
      const c0 = P(cx, 0.1); for (let i = 0; i < 5; i++) { g.save(); g.translate(c0[0], c0[1]); g.rotate(t * (0.6 + i * 0.12) * (i % 2 ? 1 : -1) + i); g.beginPath(); g.ellipse(0, 0, W * (0.02 + i * 0.022), H * (0.05 + i * 0.05), 0, 0, TAU); g.setLineDash([u * (3 + i), u * 2.5]); g.strokeStyle = 'rgba(240,225,255,' + (0.15 + wake * 0.2 + on * 0.3) + ')'; g.lineWidth = u * 0.5; g.stroke(); g.restore(); } g.setLineDash([]);
      if (on > 0) { g.globalCompositeOperation = 'lighter'; const c2 = g.createRadialGradient(c0[0], c0[1], 0, c0[0], c0[1], H * 0.7); c2.addColorStop(0, 'rgba(255,248,255,' + on + ')'); c2.addColorStop(0.3, 'rgba(200,150,255,' + on * 0.6 + ')'); c2.addColorStop(1, 'rgba(120,60,255,0)'); g.fillStyle = c2; g.fillRect(0, 0, W, H); }
      g.restore(); }
    for (const s of [-1, 1]) { // two pillars
      const O = (f) => P(cx + s * xo, f), I = (f) => P(cx + s * xi, f), D = (f) => P(cx + s * xd, f);
      poly([D(-0.3), I(-0.3), I(fTop), D(fTop)]); { const gr = g.createLinearGradient(0, gy, 0, I(fTop)[1]); gr.addColorStop(0, 'rgba(150,105,235,' + (0.5 + on * 0.5) + ')'); gr.addColorStop(1, 'rgba(50,25,110,' + (0.6 + on * 0.4) + ')'); g.fillStyle = '#08050f'; g.fill(); g.fillStyle = gr; g.globalAlpha = 0.35 + wake * 0.3 + on * 0.35; g.fill(); g.globalAlpha = 1; } // the face that looks into the gate
      poly([O(-0.3), I(-0.3), I(fTop), O(fTop)]); { const gr = g.createLinearGradient(0, gy, 0, I(fTop)[1]); gr.addColorStop(0, '#120c20'); gr.addColorStop(1, '#07050d'); g.fillStyle = gr; g.fill(); }
      g.strokeStyle = 'rgba(70,50,112,0.5)'; g.lineWidth = Math.max(1, u * 0.25); g.beginPath(); for (const q of [0.36, 0.5, 0.64, 0.78, 0.92]) { const a = P(cx + s * (xi + (xo - xi) * q), -0.3), b = P(cx + s * (xi + (xo - xi) * q), fTop); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); } g.stroke(); // fluting
      for (let j = 1; j < 13; j++) { const f = j * 0.2 / (j * 0.2 + 1); if (f > fTop) break; const a = O(f), b = I(f), f0 = (j - 1) * 0.2 / ((j - 1) * 0.2 + 1), fm = (f + f0) / 2;
        g.strokeStyle = 'rgba(88,64,136,0.7)'; g.lineWidth = Math.max(1, u * 0.34 * (1 - f)); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
        const lit = cl(t * 4.4 - j + 0.4); if (lit > 0) { const c = P(cx + s * (xi + (xo - xi) * 0.17), fm), r = u * 3.4 * (1 - fm); g.strokeStyle = 'rgba(215,180,255,' + lit * (0.6 + on * 0.4) + ')'; g.lineWidth = Math.max(1.2, u * 0.6 * (1 - fm)); g.shadowColor = '#b48cff'; g.shadowBlur = 10; rune(g, c[0], c[1], r, (j * 3 + (s > 0 ? 1 : 0)) % 4); g.shadowBlur = 0; } }
      { const a = I(-0.3), b = I(fTop); g.strokeStyle = 'rgba(200,160,255,' + (0.35 + on * 0.6) + ')'; g.lineWidth = u * 0.55; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
      poly([P(cx + s * (xo + W * 0.05), fTop - 0.012), P(cx + s * (xd - W * 0.012), fTop - 0.012), P(cx + s * (xd - W * 0.012), fTop + 0.04), P(cx + s * (xo + W * 0.05), fTop + 0.04)]); g.fillStyle = '#0a0713'; g.fill(); g.strokeStyle = 'rgba(170,130,240,' + (0.25 + on * 0.5) + ')'; g.lineWidth = u * 0.3; g.stroke();
    }
    { // the arch that joins them, and its keystone
      const a0 = P(cx - xi, fArch), a1 = P(cx + xi, fArch), b0 = P(cx - xi * 1.25, fTop + 0.04), b1 = P(cx + xi * 1.25, fTop + 0.04), bulge = (gy - vy) * 0.09;
      g.beginPath(); g.moveTo(a0[0], a0[1]); g.quadraticCurveTo(cx, a0[1] - bulge * 1.5, a1[0], a1[1]); g.lineTo(b1[0], b1[1]); g.quadraticCurveTo(cx, b0[1] - bulge * 1.9, b0[0], b0[1]); g.closePath(); g.fillStyle = '#0a0713'; g.fill(); g.strokeStyle = 'rgba(190,150,255,' + (0.25 + on * 0.6) + ')'; g.lineWidth = u * 0.4; g.stroke();
      skull(g, cx, (a0[1] + b0[1]) / 2 - bulge * 0.86, (gy - vy) * 0.03, { shadow: '#0c0818', mid: '#2a1e48', bone: '#6a52a8', dark: '#030208', glow: '215,180,255', eye: Math.max(on, cl(t * 4.4 - 11.5)), streak: on > 0 });
    }
    g.fillStyle = '#06040c'; g.beginPath(); g.moveTo(0, H * 1.3); g.lineTo(0, gy + u * 2); for (let x = 0; x <= W; x += W / 24) g.lineTo(x, gy + u * 2 + Math.sin(x * 0.01) * u * 1.2); g.lineTo(W, H * 1.3); g.closePath(); g.fill();
    { const q0 = t - sh.burstAt - 0.2; if (q0 > 0) for (let i = 0; i < 16; i++) { // they come out of it, toward the eye, and past
      const q = (q0 - i * 0.17) / 1.9; if (q <= 0 || q >= 1) continue; const a = F.dead[i % 3], e = q * q, side = (i % 2 ? 1 : -1) * (0.25 + rnd(i, 55) * 0.75), x = cx + side * lerp(W * 0.05, W * 0.62, e), y = lerp(gy + u, H * 1.34, e), h = lerp(H * 0.055, H * 0.62, e);
      g.globalAlpha = cl(q * 6) * cl((1 - q) * 5); fig(g, a, 'Run', 2, frAt(a, 'Run', t + i * 0.1, 12), x, y, h, { flat: '#030208', rim: '#c9a8ff' }); eyesOf(g, a, 'Run', 2, 0, x, y, h, '201,168,255', 0.8); g.globalAlpha = 1; } }
    if (t > sh.veshAt) { const q = cl((t - sh.veshAt) / 1.3), a = F.vesh, fr = frAt(a, 'Idle', t, 5), y = gy + u * 2 - easeOut(q) * H * 0.13, h = H * lerp(0.2, 0.3, easeOut(q)); g.globalAlpha = cl(q * 2); // and then him, walking out on the light
      g.globalCompositeOperation = 'lighter'; const gl = g.createRadialGradient(cx, y - h * 0.5, 0, cx, y - h * 0.5, h * 1.5); gl.addColorStop(0, 'rgba(125,255,176,0.45)'); gl.addColorStop(1, 'rgba(125,255,176,0)'); g.fillStyle = gl; g.fillRect(cx - h * 1.5, y - h * 2, h * 3, h * 3); g.globalCompositeOperation = 'source-over';
      fig(g, a, 'Idle', 2, fr, cx, y, h, { flat: '#020503', rim: '#7dffb0' }); eyesOf(g, a, 'Idle', 2, fr, cx, y, h, '125,255,176', 1); g.globalAlpha = 1; }
    // the grass and stones by the lens: they drop away as the head tips back
    g.save(); g.translate(0, (gy - 0.72 * H) * 1.9); g.fillStyle = '#010103';
    g.beginPath(); g.moveTo(0, H * 1.5); for (let x = 0; x <= W; x += W / 70) g.lineTo(x, H * 0.92 - Math.abs(Math.sin(x * 0.045)) * u * 5 - rnd(Math.round(x), 2) * u * 7); g.lineTo(W, H * 1.5); g.closePath(); g.fill();
    for (const [fx, s, lean] of [[0.09, 1.5, -0.08], [0.27, 0.9, 0.06], [0.78, 1.2, 0.1], [0.94, 0.85, -0.05]]) { g.save(); g.translate(W * fx, H * 0.98); g.rotate(lean); const w = u * 5 * s, hh = u * 36 * s; g.fillRect(-w / 2, -hh, w, hh); g.fillRect(-w * 1.9, -hh * 0.74, w * 3.8, w * 0.95); g.strokeStyle = 'rgba(180,140,255,' + (0.3 + on * 0.5) + ')'; g.lineWidth = u * 0.35; const e = fx < 0.5 ? w / 2 : -w / 2; g.beginPath(); g.moveTo(e, -hh); g.lineTo(e, -hh * 0.74 - (fx < 0.5 ? 0 : 0)); g.moveTo(-w * 1.9, -hh * 0.74); g.lineTo(w * 1.9, -hh * 0.74); g.stroke(); g.restore(); }
    g.restore();
    g.strokeStyle = 'rgba(200,190,255,0.25)'; g.lineWidth = u * 0.25; g.beginPath(); // rain, falling away from that point toward the eye
    for (let i = 0; i < 90; i++) { const tx = (rnd(i, 1) - 0.5) * W * 2.2 + cx, ph = (rnd(i, 2) + t * (1.1 + rnd(i, 3))) % 1, y0 = lerp(-H * 0.1, H * 1.1, ph), f0 = (gy + H * 0.2 - y0) / (gy + H * 0.2 - vy), x0 = lerp(tx, cx, f0), dy = u * 8, x1 = lerp(tx, cx, f0 - dy / (gy + H * 0.2 - vy)); g.moveTo(x0, y0); g.lineTo(x1, y0 + dy); }
    g.stroke();
  }

  // ================================================================ 5 · the cantor (the world moves, he does not)
  function drawCantor(g, W, H, sh, k, t) {
    const u = H / 100, cx = W / 2, rush = lerp(0.7, 3.3, ease(k)), G = '125,255,176', s = H * 0.15, cy = H * 0.44 + (1 - easeOut(cl(t / 0.7))) * u * 8;
    g.fillStyle = '#020604'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 12; i++) { const r = H * (0.07 + i * 0.085) * rush; if (r > W) break; g.save(); g.translate(cx, cy); g.rotate(i * 0.7 + t * 0.25 * (i % 2 ? 1 : -1)); g.beginPath(); g.ellipse(0, 0, r, r * 1.35, 0, 0, TAU); g.setLineDash([r * 0.5, r * 0.22]); g.strokeStyle = 'rgba(' + G + ',' + cl(0.5 - r / W * 0.5) + ')'; g.lineWidth = u * (0.4 + i * 0.12); g.stroke(); g.restore(); }
    g.setLineDash([]); g.fillStyle = 'rgba(' + G + ',0.1)'; g.beginPath();
    for (let i = 0; i < 64; i++) { const an = i / 64 * TAU + rnd(i) * 0.06, r0 = H * (0.22 + rnd(i, 2) * 0.2) * rush, r1 = Math.max(W, H) * 1.2, w = 0.004 + rnd(i, 3) * 0.008; g.moveTo(cx + Math.cos(an - w) * r1, cy + Math.sin(an - w) * r1); g.lineTo(cx + Math.cos(an) * r0, cy + Math.sin(an) * r0); g.lineTo(cx + Math.cos(an + w) * r1, cy + Math.sin(an + w) * r1); }
    g.fill();
    for (const d of [-1, 1]) { const x = cx + d * W * 0.2 * rush; g.fillStyle = '#010302'; g.beginPath(); g.moveTo(x, -H * 0.1); g.lineTo(x + d * W * 0.14 * rush, -H * 0.1); g.lineTo(x + d * W * 0.3 * rush, H * 1.1); g.lineTo(x + d * W * 0.06 * rush, H * 1.1); g.closePath(); g.fill(); g.strokeStyle = 'rgba(' + G + ',0.35)'; g.lineWidth = u * 0.4; g.beginPath(); g.moveTo(x, -H * 0.1); g.lineTo(x + d * W * 0.06 * rush, H * 1.1); g.stroke(); }
    const eye = cl((t - sh.eyesAt) / 0.2), sing = cl((t - sh.singAt) / 0.3), jaw = easeOut(sing) * (0.9 + Math.sin(t * 40) * 0.06);
    g.save(); g.translate(cx, cy); g.scale(s, s);
    for (let i = 0; i < 9; i++) { const an = -Math.PI / 2 + (i - 4) * 0.3, r0 = 1.4, r1 = 2.2 + (i % 2 ? 0.05 : 0.55) - Math.abs(i - 4) * 0.07, w = 0.09, gr = g.createLinearGradient(0, -r1, 0, -r0 * 0.6); gr.addColorStop(0, '#cfeedd'); gr.addColorStop(1, '#1e3a2a'); g.fillStyle = gr; g.beginPath(); g.moveTo(Math.cos(an - w) * r0, Math.sin(an - w) * r0); g.lineTo(Math.cos(an) * r1, Math.sin(an) * r1 * 1.04); g.lineTo(Math.cos(an + w) * r0, Math.sin(an + w) * r0); g.closePath(); g.fill(); } // a crown of bone
    g.beginPath(); g.moveTo(-3.3, 4.6); g.bezierCurveTo(-2.3, 1.4, -1.95, -1.78, 0, -1.82); g.bezierCurveTo(1.95, -1.78, 2.3, 1.4, 3.3, 4.6); g.closePath(); { const gr = g.createLinearGradient(0, -1.8, 0, 4); gr.addColorStop(0, '#4a0e16'); gr.addColorStop(0.5, '#1c0509'); gr.addColorStop(1, '#070102'); g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(' + G + ',0.6)'; g.lineWidth = 0.035; g.stroke(); } // the hood
    g.lineWidth = 0.03; for (const d of [-1, 1]) for (let f = 0; f < 3; f++) { g.strokeStyle = f % 2 ? 'rgba(0,0,0,0.5)' : 'rgba(' + G + ',0.16)'; g.beginPath(); g.moveTo(d * (1.2 + f * 0.2), -1.0 + f * 0.5); g.bezierCurveTo(d * (1.7 + f * 0.2), 0.4, d * (1.5 + f * 0.3), 2.2, d * (2.1 + f * 0.4), 4.6); g.stroke(); }
    g.beginPath(); g.ellipse(0, 0.25, 1.2, 1.68, 0, 0, TAU); g.fillStyle = '#010201'; g.fill();
    g.lineCap = 'round'; g.strokeStyle = '#9fc7ae'; for (let r = 0; r < 4; r++) for (const d of [-1, 1]) { g.lineWidth = 0.11 - r * 0.012; g.beginPath(); g.moveTo(d * 0.14, 2.25 + r * 0.36); g.quadraticCurveTo(d * 0.95, 2.1 + r * 0.36, d * (1.45 + r * 0.14), 2.75 + r * 0.44); g.stroke(); } // ribs worn as a collar
    g.fillStyle = '#9fc7ae'; for (let r = 0; r < 7; r++) g.fillRect(-0.1, 2.12 + r * 0.36, 0.2, 0.24);
    g.restore();
    skull(g, cx, cy + s * 0.12, s, { jaw, eye, glow: G, streak: true, sing: sing * 0.9 });
    { const x0 = cx + s * 2.9, x1 = cx + s * 2.45, y1 = cy - s * 2.5; g.lineCap = 'round'; g.strokeStyle = 'rgba(' + G + ',0.5)'; g.lineWidth = s * 0.2; g.beginPath(); g.moveTo(x0, H * 1.1); g.lineTo(x1, y1); g.stroke(); g.strokeStyle = '#06100a'; g.lineWidth = s * 0.14; g.beginPath(); g.moveTo(x0, H * 1.1); g.lineTo(x1, y1); g.stroke(); // his staff, and the censer that swings from it
      g.strokeStyle = '#bfe6cf'; g.lineWidth = s * 0.09; g.beginPath(); g.arc(x1, y1 - s * 0.45, s * 0.45, 0.5, Math.PI * 2 - 0.9); g.stroke();
      const sw = Math.sin(t * 2.2) * 0.3, lx = x1 - s * 0.1 + Math.sin(sw) * s * 1.1, ly = y1 - s * 0.1 + Math.cos(sw) * s * 1.1; g.strokeStyle = 'rgba(' + G + ',0.7)'; g.lineWidth = s * 0.03; g.beginPath(); g.moveTo(x1 - s * 0.1, y1 - s * 0.1); g.lineTo(lx, ly); g.stroke(); g.fillStyle = '#0a1a10'; g.beginPath(); g.ellipse(lx, ly + s * 0.2, s * 0.2, s * 0.26, 0, 0, TAU); g.fill();
      g.globalCompositeOperation = 'lighter'; const gl = g.createRadialGradient(lx, ly + s * 0.2, 0, lx, ly + s * 0.2, s * 1.1); gl.addColorStop(0, 'rgba(230,255,240,0.95)'); gl.addColorStop(0.25, 'rgba(' + G + ',0.5)'); gl.addColorStop(1, 'rgba(' + G + ',0)'); g.fillStyle = gl; g.fillRect(lx - s * 1.1, ly - s * 0.9, s * 2.2, s * 2.2); g.globalCompositeOperation = 'source-over'; }
    if (sing > 0) { g.globalCompositeOperation = 'lighter'; const my = cy + s * 1.2; for (let i = 0; i < 4; i++) { const q = ((t - sh.singAt) * 1.5 + i * 0.25) % 1, r = q * W * 0.75; g.strokeStyle = 'rgba(220,255,235,' + (1 - q) * 0.75 + ')'; g.lineWidth = u * (1.8 - q * 1.2); g.beginPath(); g.ellipse(cx, my, r, r * 0.8, 0, 0, TAU); g.stroke(); } g.globalCompositeOperation = 'source-over'; }
    const nk = cl((t - sh.nameAt) / 0.3), out = cl((sh.singAt - 0.1 - t) / 0.2); // his name, struck across the frame
    if (nk > 0 && out > 0) { g.save(); g.translate(cx + (nk < 1 ? (Math.random() - 0.5) * u * 3 : 0), H * 0.78); g.rotate(-0.06); g.globalAlpha = out; g.fillStyle = '#000'; g.fillRect(-W * 0.62, -u * 8.5, W * 1.24 * easeOut(nk), u * 17); g.fillStyle = 'rgb(' + G + ')'; g.fillRect(-W * 0.62, -u * 8.5, W * 1.24 * easeOut(nk), u * 0.5); g.fillRect(-W * 0.62, u * 8, W * 1.24 * easeOut(nk), u * 0.5);
      if (nk > 0.5) { g.font = '800 ' + Math.round(u * 10) + 'px ' + DISP; g.textBaseline = 'middle'; g.fillStyle = '#effff5'; spaced(g, 'VESH MORROW', lerp(-W * 0.2, 0, easeOut(nk * 2 - 1)), -u * 1.2, u * 1.6); g.font = '700 ' + Math.round(u * 2.7) + 'px ' + HEAD; g.fillStyle = 'rgb(' + G + ')'; spaced(g, 'THE BONE CANTOR', lerp(W * 0.2, 0, easeOut(nk * 2 - 1)), u * 5.2, u * 1.5); }
      g.restore(); g.textBaseline = 'alphabetic'; }
  }

  // ================================================================ 6 · the song, on the map
  function buildMap() {
    const M = { gate: [0.2, 0.28], graves: [], veins: [], hills: [], woods: [], pins: [] };
    for (let i = 0; i < 170; i++) M.graves.push([0.04 + rnd(i, 11) * 0.92, 0.07 + rnd(i, 12) * 0.86]);
    for (let i = 0; i < 16; i++) M.hills.push([0.06 + rnd(i, 21) * 0.88, 0.1 + rnd(i, 22) * 0.8, 0.6 + rnd(i, 23) * 0.9]);
    for (let i = 0; i < 46; i++) { const c = i % 5; M.woods.push([[0.52, 0.2], [0.78, 0.3], [0.3, 0.72], [0.62, 0.66], [0.12, 0.55]][c].map((v, q) => v + (rnd(i, 31 + q) - 0.5) * 0.14)); }
    const grow = (x, y, an, len, depth) => { const seg = []; let px = x, py = y; for (let s = 0; s < 6; s++) { an += (rnd(M.veins.length * 7 + s, depth) - 0.5) * 0.9; const nx = px + Math.cos(an) * len / 6, ny = py + Math.sin(an) * len / 6 * 1.6; seg.push([px, py, nx, ny]); px = nx; py = ny; if (depth < 2 && s % 2 === 1) grow(px, py, an + (rnd(s, depth + 40) < 0.5 ? 0.9 : -0.9), len * 0.62, depth + 1); } M.veins.push(seg); };
    for (let b = 0; b < 9; b++) grow(M.gate[0], M.gate[1], b / 9 * TAU + 0.3, 0.5, 0);
    M.pins = [[0.36, 0.22], [0.3, 0.46], [0.5, 0.36], [0.44, 0.62], [0.64, 0.24], [0.62, 0.5], [0.76, 0.4], [0.7, 0.72], [0.86, 0.76]];
    return M;
  }
  function drawSong(g, W, H, sh, k, t) {
    const u = H / 100, M = F.map, X = (p) => p[0] * W, Y = (p) => p[1] * H, gx = X(M.gate), gy = Y(M.gate), R = Math.max(0, t - 0.5) * W * 0.21, ink = (a) => 'rgba(206,182,140,' + a + ')';
    g.fillStyle = '#19140e'; g.fillRect(0, 0, W, H);
    const zoom = lerp(2.3, 1, ease(cl(t / 3.2))), fx = lerp(gx, W / 2, ease(cl(t / 3.2))), fy = lerp(gy, H / 2, ease(cl(t / 3.2)));
    g.save(); g.translate(W / 2, H / 2); g.scale(zoom, zoom); g.rotate(lerp(-0.07, 0.025, k)); g.translate(-fx, -fy);
    for (let i = 0; i < 7; i++) { g.fillStyle = 'rgba(' + (i % 2 ? '70,52,30' : '10,8,5') + ',0.25)'; g.beginPath(); g.ellipse(rnd(i, 51) * W, rnd(i, 52) * H, W * 0.22, H * 0.2, i, 0, TAU); g.fill(); }
    g.strokeStyle = ink(0.5); g.lineWidth = u * 0.3; g.strokeRect(W * 0.02, H * 0.035, W * 0.96, H * 0.93); g.strokeRect(W * 0.027, H * 0.047, W * 0.946, H * 0.906);
    g.strokeStyle = ink(0.42); g.lineWidth = u * 0.7; g.beginPath(); g.moveTo(W * 0.5, H * 0.02); g.bezierCurveTo(W * 0.42, H * 0.3, W * 0.6, H * 0.45, W * 0.5, H * 0.62); g.bezierCurveTo(W * 0.42, H * 0.78, W * 0.56, H * 0.9, W * 0.52, H * 0.98); g.stroke();
    g.lineWidth = u * 0.28; g.setLineDash([u * 1.2, u]); g.beginPath(); g.moveTo(gx, gy); for (const p of M.pins) g.lineTo(X(p), Y(p)); g.stroke(); g.setLineDash([]);
    for (const hl of M.hills) { const x = hl[0] * W, y = hl[1] * H, s = u * 3 * hl[2]; g.strokeStyle = ink(0.4); g.lineWidth = u * 0.28; g.beginPath(); g.moveTo(x - s * 1.6, y); g.quadraticCurveTo(x, y - s * 2.2, x + s * 1.6, y); g.stroke(); for (let q = 0; q < 4; q++) { g.beginPath(); g.moveTo(x + s * (0.2 + q * 0.3), y - s * (0.9 - q * 0.2)); g.lineTo(x + s * (0.45 + q * 0.3), y - s * 0.1); g.stroke(); } }
    g.strokeStyle = ink(0.36); for (const p of M.woods) { const x = X(p), y = Y(p); g.beginPath(); g.moveTo(x - u, y); g.lineTo(x, y - u * 2.2); g.lineTo(x + u, y); g.stroke(); }
    g.font = '600 ' + Math.round(u * 2.6) + 'px ' + DISP; g.fillStyle = ink(0.55); g.textAlign = 'center'; for (const [s, x, y, r] of [['GREENVALE', 0.34, 0.86, -0.05], ['THE SUNSCAR', 0.75, 0.14, 0.04], ['ALDMERE', 0.8, 0.58, -0.03]]) { g.save(); g.translate(W * x, H * y); g.rotate(r); spaced(g, s, 0, 0, u * 1.2); g.restore(); }
    // the song: staves rolling out, a few notes riding them
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let n = 0; n < 9; n++) { const age = t - 0.5 - n * 0.6; if (age <= 0) continue; const r = age * W * 0.21, a = cl(1 - age / 3.4) * 0.7; if (a <= 0) continue; g.strokeStyle = 'rgba(214,190,255,' + a + ')'; g.lineWidth = u * 0.2; for (let j = 0; j < 5; j++) { g.beginPath(); g.ellipse(gx, gy, r + j * u * 0.75, (r + j * u * 0.75) * 0.82, 0, 0, TAU); g.stroke(); }
      g.fillStyle = 'rgba(240,225,255,' + a + ')'; for (let i = 0; i < 5; i++) { const an = n * 1.3 + i * 1.26 + age * 0.15, rr = r + ((i * 2) % 5) * u * 0.75; g.beginPath(); g.ellipse(gx + Math.cos(an) * rr, gy + Math.sin(an) * rr * 0.82, u * 0.75, u * 0.52, -0.4, 0, TAU); g.fill(); g.fillRect(gx + Math.cos(an) * rr + u * 0.55, gy + Math.sin(an) * rr * 0.82 - u * 2.6, u * 0.16, u * 2.6); } }
    g.strokeStyle = 'rgba(170,110,255,0.85)'; g.shadowColor = '#a070ff'; g.shadowBlur = 8; g.lineWidth = u * 0.34; // what spreads under the ground
    for (const seg of M.veins) for (const s of seg) { const d0 = Math.hypot((s[0] - M.gate[0]) * W, (s[1] - M.gate[1]) * H), d1 = Math.hypot((s[2] - M.gate[0]) * W, (s[3] - M.gate[1]) * H); if (d0 > R) continue; const q = d1 > d0 ? cl((R - d0) / (d1 - d0)) : 1; g.beginPath(); g.moveTo(s[0] * W, s[1] * H); g.lineTo(lerp(s[0], s[2], q) * W, lerp(s[1], s[3], q) * H); g.stroke(); }
    g.shadowBlur = 0; g.restore();
    for (const p of M.graves) { const x = X(p), y = Y(p), lit = Math.hypot(x - gx, y - gy) < R; g.strokeStyle = lit ? 'rgba(200,160,255,0.95)' : ink(0.3); g.lineWidth = u * (lit ? 0.3 : 0.2); g.beginPath(); g.moveTo(x, y - u * 0.9); g.lineTo(x, y + u * 0.7); g.moveTo(x - u * 0.5, y - u * 0.35); g.lineTo(x + u * 0.5, y - u * 0.35); g.stroke(); }
    M.pins.forEach((p, i) => { // nine banners; the song knocks down eight
      const x = X(p), y = Y(p), d = Math.hypot(x - gx, y - gy), b = F.banners[i], hit = i < 8 && R > d, fall = hit ? cl((R - d) / (W * 0.035)) : 0;
      g.save(); g.translate(x, y); g.rotate(fall * 1.45 * (i % 2 ? 1 : -1)); g.strokeStyle = hit ? 'rgba(120,110,100,0.9)' : '#e9d6a6'; g.lineWidth = u * 0.35; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -u * 5.5); g.stroke();
      g.fillStyle = hit ? 'rgba(96,88,84,' + (1 - fall * 0.4) + ')' : b.color; g.beginPath(); g.moveTo(0, -u * 5.5); g.lineTo(u * 3.6, -u * 4.7 + Math.sin(t * 5 + i) * u * 0.3); g.lineTo(u * 2.6, -u * 3.7); g.lineTo(u * 3.6, -u * 2.6 + Math.sin(t * 5 + i + 1) * u * 0.3); g.lineTo(0, -u * 2.7); g.closePath(); g.fill(); g.restore();
      if (fall >= 1) { const q = cl((R - d) / (W * 0.035) - 1); g.strokeStyle = 'rgba(214,52,40,' + cl(q * 3) + ')'; g.lineWidth = u * 0.55; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - u * 2.2, y - u * 2.2); g.lineTo(x - u * 2.2 + u * 4.4 * cl(q * 4), y - u * 2.2 + u * 4.4 * cl(q * 4)); if (q > 0.25) { g.moveTo(x + u * 2.2, y - u * 2.2); g.lineTo(x + u * 2.2 - u * 4.4 * cl(q * 4 - 1), y - u * 2.2 + u * 4.4 * cl(q * 4 - 1)); } g.stroke(); }
      if (i === 8 && R > d) { g.globalCompositeOperation = 'lighter'; const a = 0.5 + Math.sin(t * 5) * 0.2, gl = g.createRadialGradient(x, y - u * 3, 0, x, y - u * 3, u * 12); gl.addColorStop(0, 'rgba(255,220,140,' + a + ')'); gl.addColorStop(1, 'rgba(255,220,140,0)'); g.fillStyle = gl; g.fillRect(x - u * 12, y - u * 15, u * 24, u * 24); g.strokeStyle = 'rgba(255,230,170,0.9)'; g.lineWidth = u * 0.3; g.beginPath(); g.arc(x, y - u * 3, u * (5 + ((t * 2) % 1) * 4), 0, TAU); g.stroke(); g.globalCompositeOperation = 'source-over'; }
    });
    { g.globalCompositeOperation = 'lighter'; const gl = g.createRadialGradient(gx, gy, 0, gx, gy, u * 14); gl.addColorStop(0, 'rgba(210,170,255,0.9)'); gl.addColorStop(1, 'rgba(120,60,220,0)'); g.fillStyle = gl; g.fillRect(gx - u * 14, gy - u * 14, u * 28, u * 28); g.globalCompositeOperation = 'source-over'; g.strokeStyle = '#efe2ff'; g.lineWidth = u * 0.5; g.beginPath(); g.moveTo(gx - u * 1.8, gy + u * 2); g.lineTo(gx - u * 1.8, gy - u); g.quadraticCurveTo(gx, gy - u * 3.6, gx + u * 1.8, gy - u); g.lineTo(gx + u * 1.8, gy + u * 2); g.stroke(); }
    g.restore();
    const n = Math.floor(Math.pow(cl((t - 0.5) / (sh.dur - 1)), 2.4) * 9999); g.textAlign = 'right'; g.font = '700 ' + Math.round(u * 2.4) + 'px ' + HEAD; g.fillStyle = 'rgba(214,190,255,0.85)'; g.fillText('G R A V E S   O P E N E D', W * 0.955, H * 0.2); g.font = '800 ' + Math.round(u * 8.5) + 'px ' + HEAD; g.fillStyle = '#fff'; g.fillText(n.toLocaleString(), W * 0.955, H * 0.3); g.textAlign = 'left';
  }

  // ================================================================ 7 · the rising: five cuts
  function bonyHand(g, cx, base, s, col) { // a hand of bones reaching up out of the ground
    g.fillStyle = col; g.fillRect(cx - s * 0.5, base - s * 3.2, s, s * 3.4); g.fillRect(cx - s * 0.95, base - s * 4.1, s * 1.9, s * 1.1);
    const F5 = [[-1.0, -0.62, 1.8], [-0.5, -0.24, 2.7], [0, 0.02, 3.0], [0.5, 0.26, 2.6], [1.15, 0.85, 1.6]];
    for (const [ox, an, len] of F5) { g.save(); g.translate(cx + ox * s * 0.8, base - s * 4.05); g.rotate(an); for (let j = 0, y = 0; j < 3; j++) { const l = s * len * [0.42, 0.33, 0.25][j], w = s * (0.34 - j * 0.06); g.fillRect(-w / 2, -y - l, w, l - s * 0.07); g.beginPath(); g.arc(0, -y, w * 0.72, 0, TAU); g.fill(); y += l; g.rotate(an * 0.25 + 0.06 * (ox < 0 ? -1 : 1)); } g.restore(); }
  }
  function burst(g, x, y, R, n, col, seed, w0, turn) { g.fillStyle = col; g.beginPath(); for (let i = 0; i < n; i++) { const an = i / n * TAU + (turn || 0), w = (w0 || 0.01) * (0.5 + rnd(i, seed)); g.moveTo(x + Math.cos(an - w) * R, y + Math.sin(an - w) * R); g.lineTo(x, y); g.lineTo(x + Math.cos(an + w) * R, y + Math.sin(an + w) * R); } g.fill(); }
  function drawRising(g, W, H, sh, k, t) {
    const u = H / 100; let acc = 0, P = sh.panels[sh.panels.length - 1]; for (const p of sh.panels) { if (t < acc + p.d) { P = p; break; } acc += p.d; } if (t >= acc + P.d) acc -= P.d;
    const lt = t - acc, pk = cl(lt / P.d), pop = 1 + 0.08 * (1 - easeOut(cl(lt / 0.1))); g.save(); g.translate(W / 2, H / 2); g.scale(pop, pop); g.translate(-W / 2, -H / 2);
    if (P.k === 'hand') {
      g.fillStyle = '#ece8df'; g.fillRect(0, 0, W, H); const rise = easeOut(cl(pk * 1.8)), base = H * (1.5 - rise * 0.62);
      burst(g, W * 0.5, H * 0.92, W, 30, 'rgba(0,0,0,0.07)', 3, 0.03);
      bonyHand(g, W * 0.5, base, H * 0.105, '#050505');
      g.fillStyle = '#050505'; g.beginPath(); g.moveTo(0, H); g.lineTo(0, H * 0.9); for (let x = 0; x <= W; x += W / 30) g.lineTo(x, H * 0.9 - Math.max(0, 1 - Math.abs(x - W * 0.5) / (W * 0.2)) * u * 10 * rise - rnd(x | 0, 6) * u * 2); g.lineTo(W, H); g.closePath(); g.fill();
      for (let i = 0; i < 26; i++) { const q = cl(pk * 1.6), an = -Math.PI / 2 + (rnd(i, 71) - 0.5) * 2.2, v = H * (0.5 + rnd(i, 72) * 0.5); g.fillRect(W * 0.5 + Math.cos(an) * v * q, H * 0.9 + Math.sin(an) * v * q + H * 0.6 * q * q, u * (0.8 + rnd(i, 73) * 1.8), u * (0.8 + rnd(i, 74) * 1.8)); }
      g.font = '800 ' + Math.round(u * 20) + 'px ' + DISP; g.fillStyle = '#b00d0d'; g.textAlign = 'left'; g.fillText('RISE', W * 0.06, H * 0.42);
    } else if (P.k === 'eyes') { // so close there is only the brow and what lights under it
      g.fillStyle = '#000'; g.fillRect(0, 0, W, H); const s = H * (0.78 + pk * 0.08);
      skull(g, W * 0.5 + (pk - 0.5) * u * 3, H * 0.5 + s * 0.08, s, { shadow: '#0a0a0a', mid: '#2c2a24', bone: '#8a8474', dark: '#000', glow: '255,214,64', eye: cl(pk * 5), streak: true });
    } else if (P.k === 'march') {
      g.fillStyle = '#e6e1d6'; g.fillRect(0, 0, W, H); g.fillStyle = '#b00d0d'; g.beginPath(); g.arc(W * 0.7, H * 0.52, H * 0.3, 0, TAU); g.fill();
      for (const [hh, col, gyf, spd, n] of [[0.2, '#b3aea2', 0.6, 0.45, 10], [0.33, '#6a655c', 0.72, 0.75, 6], [0.52, '#060606', 0.9, 1.2, 4]]) {
        g.fillStyle = col; g.fillRect(0, H * gyf - 1, W, H);
        for (let i = 0; i < n; i++) { const a = F.dead[(i + n) % 3], x = (((i / n + t * 0.2 * spd) % 1) * 1.3 - 0.15) * W, h = H * hh; put(g, spr(a, 'Run', 4, frAt(a, 'Run', t + i * 0.11, 14), col), x, H * gyf + u * 0.5, h); if ((i + n) % 2 === 0) { g.fillStyle = col; g.fillRect(x + h * 0.2, H * gyf - h * 1.7, Math.max(1.5, h * 0.022), h * 1.3); g.beginPath(); g.moveTo(x + h * 0.21, H * gyf - h * 1.9); g.lineTo(x + h * 0.27, H * gyf - h * 1.66); g.lineTo(x + h * 0.15, H * gyf - h * 1.66); g.fill(); } }
      }
      g.fillStyle = 'rgba(230,225,214,0.5)'; for (let i = 0; i < 12; i++) { const x = ((rnd(i, 85) + t * 0.5) % 1.2 - 0.1) * W; g.beginPath(); g.ellipse(x, H * 0.92, u * (6 + rnd(i, 86) * 8), u * (2 + rnd(i, 87) * 3), 0, 0, TAU); g.fill(); }
    } else if (P.k === 'low') { // from the ground: three of them, looking down
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#6a25b8'); gr.addColorStop(1, '#12041f'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      burst(g, W * 0.5, H * 0.2, W, 46, 'rgba(255,255,255,0.1)', 91, 0.012, t * 0.3);
      for (const [fx, hh, n, clip] of [[0.2, 0.7, 2, 'Idle'], [0.8, 0.74, 1, 'Idle'], [0.5, 0.92, 0, 'Idle']]) { const a = F.dead[n], fr = frAt(a, clip, t, 6), x = W * fx + (0.5 - fx) * pk * u * 6, y = H * 1.12, h = H * hh * (1 + pk * 0.06); fig(g, a, clip, 2, fr, x, y, h, { flat: '#040108', rim: '#e7d4ff', low: 0.32 }); eyesOf(g, a, clip, 2, fr, x, y, h, '255,214,64', 1); }
    } else { // the ridge
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#07060f'); gr.addColorStop(1, '#241238'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      const mx = W * 0.64, my = H * 0.44, mr = H * 0.31; g.fillStyle = '#efe9da'; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill(); g.fillStyle = 'rgba(120,110,150,0.25)'; for (const [dx, dy, r] of [[-0.3, -0.2, 0.2], [0.25, 0.1, 0.28], [-0.1, 0.4, 0.15]]) { g.beginPath(); g.arc(mx + dx * mr, my + dy * mr, r * mr, 0, TAU); g.fill(); }
      const ry = (x) => H * 0.7 - Math.sin(x / W * 3.1 + 0.4) * H * 0.12 - Math.sin(x / W * 9) * H * 0.02; g.fillStyle = '#030208';
      for (let i = 0; i < 150; i++) { const x = rnd(i, 101) * W, hh = u * (1.6 + rnd(i, 102) * 3.2), over = cl(pk * 1.5 - rnd(i, 103) * 0.5), y = ry(x) + u * 1.5 - over * u * 3 + (1 - over) * u * 6; g.fillRect(x - hh * 0.16, y - hh, hh * 0.32, hh); g.fillRect(x - hh * 0.2, y - hh * 1.25, hh * 0.4, hh * 0.3); if (i % 9 === 0) g.fillRect(x + hh * 0.2, y - hh * 2, hh * 0.08, hh * 1.6); }
      g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += W / 50) g.lineTo(x, ry(x) + u * 1.5); g.lineTo(W, H); g.closePath(); g.fill();
      { const a = F.vesh, x = W * 0.3, y = ry(W * 0.3) + u * 2, h = H * 0.3; fig(g, a, 'Idle', 2, frAt(a, 'Idle', t, 5), x, y, h, { flat: '#030208', rim: '#7dffb0' }); eyesOf(g, a, 'Idle', 2, 0, x, y, h, '125,255,176', 1); }
    }
    g.restore();
  }

  // ================================================================ 8 · nine to one
  function buildGlass() {
    const G = { order: [0, 8, 1, 7, 2, 6, 3, 5], at: {}, tris: [], crack: [] }; let t = 0.9, gap = 0.86;
    for (const i of G.order) { G.at[i] = t; t += gap; gap = Math.max(0.32, gap * 0.85); }
    G.last = t - gap; G.end = G.last + 0.6;
    const C0 = 3, R0 = 8, V = (c, r, s) => [(c + (c > 0 && c < C0 ? (rnd(c * 9 + r, s) - 0.5) * 0.5 : 0)) / C0, (r + (r > 0 && r < R0 ? (rnd(c * 5 + r, s + 1) - 0.5) * 0.5 : 0)) / R0];
    for (let i = 0; i < 9; i++) { const L = []; for (let c = 0; c < C0; c++) for (let r = 0; r < R0; r++) { const a = V(c, r, i), b = V(c + 1, r, i), d = V(c, r + 1, i), e = V(c + 1, r + 1, i); for (const tri of [[a, b, d], [b, e, d]]) { const mx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, my = (tri[0][1] + tri[1][1] + tri[2][1]) / 3, an = Math.atan2(my - 0.45, (mx - 0.5) * 0.4) + (rnd(L.length, i + 60) - 0.5); L.push({ p: tri, mx, my, vx: Math.cos(an) * (0.5 + rnd(L.length, i + 61)), vy: Math.sin(an) * (0.5 + rnd(L.length, i + 62)) - 0.4, rot: (rnd(L.length, i + 63) - 0.5) * 9 }); } } G.tris.push(L); }
    for (let b = 0; b < 6; b++) { let an = b / 6 * TAU + 0.4, x = 0.5, y = 0.42; const pts = [[x, y]]; for (let s = 0; s < 7; s++) { an += (rnd(b * 11 + s, 77) - 0.5) * 0.8; x += Math.cos(an) * 0.11; y += Math.sin(an) * 0.075; pts.push([x, y]); } G.crack.push(pts); }
    return G;
  }
  function paneColours(b) { const c = K.rgbOf(b.color); return [K.rgba(K.mix(c, [255, 255, 255], 0.5), 1), K.rgba(c, 1), K.rgba(K.mix(c, [0, 0, 0], 0.6), 1)]; }
  function drawGlass(g, W, H, sh, k, t) {
    const u = H / 100, G = F.glass, push = 1 + 0.24 * ease(cl(t / (G.end + 1.6))), cx = W / 2, cy = H * 0.5;
    g.fillStyle = '#06030c'; g.fillRect(0, 0, W, H); { const gl = g.createRadialGradient(cx, cy, 0, cx, cy, W * 0.6); gl.addColorStop(0, 'rgba(110,60,200,0.35)'); gl.addColorStop(1, 'rgba(20,8,40,0)'); g.fillStyle = gl; g.fillRect(0, 0, W, H); }
    g.save(); g.translate(cx, cy); g.scale(push, push); g.translate(-cx, -cy);
    const pw = W * 0.098, ph = H * 0.68, y0 = H * 0.17, X0 = (i) => W * 0.5 + (i - 4.5) * W * 0.106 + W * 0.004, held = t > G.end;
    if (held) { g.globalCompositeOperation = 'lighter'; const a = cl((t - G.end) / 0.8), x = X0(4) + pw / 2, gl = g.createRadialGradient(x, cy, 0, x, cy, H * 0.75); gl.addColorStop(0, 'rgba(255,225,150,' + a * 0.75 + ')'); gl.addColorStop(1, 'rgba(255,200,110,0)'); g.fillStyle = gl; g.fillRect(0, 0, W, H); burst(g, x, cy, W, 18, 'rgba(255,225,160,' + a * 0.1 + ')', 5, 0.05, t * 0.25); g.globalCompositeOperation = 'source-over'; }
    for (let i = 0; i < 9; i++) {
      const x0 = X0(i), bt = G.at[i] === undefined ? Infinity : G.at[i], b = F.banners[i], col = paneColours(b), a = F.knights[i];
      if (t < bt) {
        const sh2 = bt - t < 0.14 ? (Math.random() - 0.5) * u * 1.2 : 0; g.save(); g.translate(sh2, 0);
        g.beginPath(); g.moveTo(x0, y0 + ph); g.lineTo(x0, y0 + pw * 0.5); g.quadraticCurveTo(x0, y0, x0 + pw / 2, y0 - pw * 0.28); g.quadraticCurveTo(x0 + pw, y0, x0 + pw, y0 + pw * 0.5); g.lineTo(x0 + pw, y0 + ph); g.closePath(); // a pointed window
        const gr = g.createLinearGradient(0, y0, 0, y0 + ph); gr.addColorStop(0, col[0]); gr.addColorStop(0.45, col[1]); gr.addColorStop(1, col[2]); g.fillStyle = gr; g.fill(); g.save(); g.clip();
        g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = u * 0.35; g.beginPath(); for (let q = -ph; q < ph * 2; q += ph / 6) { g.moveTo(x0 - u, y0 + q); g.lineTo(x0 + pw + u, y0 + q + pw * 1.3); g.moveTo(x0 + pw + u, y0 + q); g.lineTo(x0 - u, y0 + q + pw * 1.3); } g.stroke();
        { const hx = x0 + pw / 2, hy = y0 + ph * 0.42, gl = g.createRadialGradient(hx, hy, 0, hx, hy, pw * 1.1); gl.addColorStop(0, 'rgba(255,255,255,0.75)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.fillRect(x0, y0 - pw, pw, ph); }
        fig(g, a, 'Idle', 2, 0, x0 + pw / 2, y0 + ph * 0.95, ph * 0.46, { rim: '#07050c' });
        g.fillStyle = col[2]; g.fillRect(x0, y0 + ph * 0.945, pw, ph * 0.06);
        const sx = x0 + ((t * 0.35 + i * 0.13) % 1.6 - 0.3) * pw * 1.6; g.fillStyle = 'rgba(255,255,255,0.16)'; g.beginPath(); g.moveTo(sx, y0 - pw); g.lineTo(sx + pw * 0.3, y0 - pw); g.lineTo(sx - pw * 0.3, y0 + ph); g.lineTo(sx - pw * 0.6, y0 + ph); g.closePath(); g.fill();
        g.font = '700 ' + Math.round(u * 3.2) + 'px ' + DISP; g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,0.92)'; g.fillText(ROMAN[i], x0 + pw / 2, y0 + u * 6.5);
        if (i === 4 && held) { const q = cl((t - G.end - 0.15) / 0.3); g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = u * 0.3; for (const pts of G.crack) { g.beginPath(); pts.forEach((p, j) => { if (j > q * (pts.length - 1) + 1) return; const x = x0 + p[0] * pw, y = y0 + p[1] * ph; if (j) g.lineTo(x, y); else g.moveTo(x, y); }); g.stroke(); } }
        g.restore(); g.beginPath(); g.moveTo(x0, y0 + ph); g.lineTo(x0, y0 + pw * 0.5); g.quadraticCurveTo(x0, y0, x0 + pw / 2, y0 - pw * 0.28); g.quadraticCurveTo(x0 + pw, y0, x0 + pw, y0 + pw * 0.5); g.lineTo(x0 + pw, y0 + ph); g.closePath(); g.strokeStyle = '#040308'; g.lineWidth = u * 0.8; g.stroke(); g.restore();
      } else {
        const age = t - bt; g.beginPath(); g.moveTo(x0, y0 + ph); g.lineTo(x0, y0 + pw * 0.5); g.quadraticCurveTo(x0, y0, x0 + pw / 2, y0 - pw * 0.28); g.quadraticCurveTo(x0 + pw, y0, x0 + pw, y0 + pw * 0.5); g.lineTo(x0 + pw, y0 + ph); g.closePath(); g.fillStyle = '#030108'; g.fill(); g.strokeStyle = 'rgba(160,120,255,0.4)'; g.lineWidth = u * 0.4; g.stroke();
        g.globalAlpha = cl(age * 3) * 0.9; skull(g, x0 + pw / 2, y0 + ph * 0.44, pw * 0.3, { shadow: '#150b2e', mid: '#4a3490', bone: '#c9b4ff', dark: '#030108', glow: '201,168,255', eye: cl(age * 3) }); g.globalAlpha = 1;
        if (age < 1.5) for (const T of G.tris[i]) { const dx = T.vx * age * pw * 3.2, dy = T.vy * age * ph * 0.5 + age * age * ph * 0.75, mx = x0 + T.mx * pw, my = y0 + T.my * ph; g.save(); g.translate(mx + dx, my + dy); g.rotate(T.rot * age); g.globalAlpha = cl(1.5 - age); g.beginPath(); T.p.forEach((p, j) => { const x = (p[0] - T.mx) * pw, y = (p[1] - T.my) * ph; if (j) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); g.fillStyle = col[T.my < 0.4 ? 0 : T.my < 0.7 ? 1 : 2]; g.fill(); g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = u * 0.2; g.stroke(); g.restore(); }
        g.globalAlpha = 1; if (age < 0.12) { g.fillStyle = 'rgba(255,255,255,' + (1 - age / 0.12) * 0.9 + ')'; g.fillRect(x0, y0 - pw * 0.3, pw, ph + pw * 0.3); }
      }
    }
    g.restore();
  }

  // ================================================================ 9 · the ninth: the game itself, slowed, and tipped off its level
  function drawNinth(g, W, H, sh, k, t, dpr, dt) {
    const u = H / 100, sc = F.live;
    if (!sc) { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); return; }
    const cv = F.liveCv || (F.liveCv = document.createElement('canvas')); if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const z0 = Math.min(W / dpr / (10.5 * BB.TW), H / dpr / (8.5 * BB.TH)), hero = sc.heroList[0], A = sh.pushAt, B = sh.blowAt, Fz = sh.freezeAt, Un = sh.thawAt;
    let rate, zoom;
    if (t < A) { zoom = lerp(0.8, 1.05, t / A); rate = 0.5; } else if (t < B) { const q = (t - A) / (B - A); zoom = lerp(1.05, 1.9, easeIn(q)); rate = lerp(0.5, 0.12, q); }
    else if (t < Fz) { const q = (t - B) / (Fz - B); zoom = lerp(1.9, 1.6, easeOut(q)); rate = lerp(1, 0.35, q); } else if (t < Un) { zoom = 1.6 + (t - Fz) * 0.03; rate = 0; } else { zoom = lerp(1.68, 1.2, easeOut((t - Un) / (sh.dur - Un))); rate = 0.75; }
    if (rate > 0 && dt > 0 && dt < 0.2) { const mute = BB.sfxMute; BB.sfxMute = true; try { if (sc.tick) sc.tick(dt * rate); sc.update(dt * rate, null); } catch (e) { /* the film goes on */ } finally { BB.sfxMute = mute; } }
    if (hero) { const up = ((hero.z || 0) * 24 + 20) / BB.TH; sc.cam.x = hero.x - up; sc.cam.y = hero.y - up; } sc.zoomK = sc.zoomTarget = 1; sc.cam.zoom = z0 * zoom; // on the Captain's chest, wherever a leap has taken them
    { const x = cv.getContext('2d'), lazy = BB.tintLazy; x.setTransform(1, 0, 0, 1, 0, 0); x.imageSmoothingEnabled = false; x.save(); try { sc.renderField(x, W, H, dpr); } catch (e) { /* a frame is missed */ } finally { BB.tintLazy = lazy; } x.restore(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; }
    const tiltA = lerp(-0.11, 0.06, ease(cl(t / Fz))) + (t > Un ? (t - Un) * 0.02 : 0), cover = Math.abs(Math.cos(tiltA)) + Math.max(W / H, H / W) * Math.abs(Math.sin(tiltA)) + 0.01;
    g.save(); g.translate(W / 2, H / 2); g.rotate(tiltA); g.scale(cover, cover); g.drawImage(cv, -W / 2, -H / 2); g.restore();
    // the film's own light on it: dusk above, fire below, a pool of light where the Captain stands
    { g.globalCompositeOperation = 'multiply'; const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#a895d6'); gr.addColorStop(0.5, '#f0d2c0'); gr.addColorStop(1, '#ffd9a6'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      const vg = g.createRadialGradient(W / 2, H * 0.5, H * 0.2, W / 2, H * 0.5, Math.max(W, H) * 0.66); vg.addColorStop(0, '#ffffff'); vg.addColorStop(1, '#6a5890'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'lighter'; const sp = g.createRadialGradient(W / 2, H * 0.5, 0, W / 2, H * 0.5, H * 0.42); sp.addColorStop(0, 'rgba(255,214,150,0.16)'); sp.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = sp; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; }
    if (t >= B && t < B + 0.9) { // the blow: a ring of light across the ground, and everything thrown back from it
      const q = (t - B) / 0.9; g.save(); g.translate(W / 2, H * 0.53); g.rotate(tiltA); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) { const r = easeOut(cl(q * 1.3 - i * 0.12)) * W * 0.6; g.strokeStyle = 'rgba(255,228,160,' + (1 - q) * (0.9 - i * 0.25) + ')'; g.lineWidth = u * (3.2 - i) * (1 - q * 0.6); g.beginPath(); g.ellipse(0, 0, r, r * 0.5, 0, 0, TAU); g.stroke(); }
      if (q < 0.35) burst(g, 0, 0, W, 54, 'rgba(255,236,190,' + (0.35 - q) + ')', 17, 0.02);
      g.restore(); }
    if (t >= Fz && t < Un) { // the frame held: its colour drained, and a hand writes on it
      const q = t - Fz, hole = () => { g.beginPath(); g.rect(0, 0, W, H); g.arc(W / 2, H * 0.43, u * 14, 0, TAU); }; // all of it but the Captain
      g.globalCompositeOperation = 'saturation'; g.fillStyle = 'rgba(128,128,128,' + cl(q / 0.15) * 0.9 + ')'; hole(); g.fill('evenodd'); g.globalCompositeOperation = 'source-over';
      g.fillStyle = 'rgba(8,6,14,' + cl(q / 0.2) * 0.38 + ')'; hole(); g.fill('evenodd');
      { const a = cl((q - 0.35) / 0.3); if (a > 0) { g.strokeStyle = 'rgba(255,255,255,' + a + ')'; g.lineWidth = u * 0.45; g.beginPath(); g.arc(W / 2, H * 0.43, u * 14, -2.2, -2.2 + TAU * easeOut(cl((q - 0.35) / 0.5))); g.stroke(); } }
      const bk = easeOut(cl((q - 0.12) / 0.3)), by = H * 0.755, col = BB.save.banner.color;
      g.save(); g.translate(0, by); g.rotate(-0.045); g.fillStyle = '#050407'; g.beginPath(); g.moveTo(-W * 0.1, -u * 9); for (let x = 0; x <= 24; x++) g.lineTo(-W * 0.1 + W * 1.2 * bk * x / 24, -u * 9 - rnd(x, 121) * u * 1.6); for (let x = 24; x >= 0; x--) g.lineTo(-W * 0.1 + W * 1.2 * bk * x / 24, u * 9 + rnd(x, 122) * u * 1.6); g.closePath(); g.fill();
      g.fillStyle = col; g.fillRect(-W * 0.1, u * 9.6, W * 1.2 * bk, u * 0.7);
      if (bk > 0.6) { const a = cl((bk - 0.6) / 0.4); g.globalAlpha = a; g.textBaseline = 'middle'; g.font = '800 ' + Math.round(u * 11) + 'px ' + DISP; g.fillStyle = '#fff'; spaced(g, 'THE NINTH BANNER', W * 0.5, -u * 1.5, u * 1.3); g.font = '700 ' + Math.round(u * 3.1) + 'px ' + HEAD; g.fillStyle = '#ffe7a3'; spaced(g, 'IS YOURS', W * 0.5, u * 5.6, u * 2.2); g.globalAlpha = 1; g.textBaseline = 'alphabetic'; }
      g.restore();
    }
  }

  // ================================================================ 10 · raise it
  function drawRaise(g, W, H, sh, k, t) {
    const u = H / 100, sx = W * 0.69, hz = H * 0.74, push = 1 + 0.08 * ease(k), SR = H * 0.34;
    g.save(); g.translate(sx, hz); g.scale(push, push); g.translate(-sx, -hz);
    const sky = g.createLinearGradient(0, 0, 0, hz); sky.addColorStop(0, '#0a0c22'); sky.addColorStop(0.45, '#4a2244'); sky.addColorStop(0.8, '#e06a34'); sky.addColorStop(1, '#ffc46a'); g.fillStyle = sky; g.fillRect(-W * 0.1, -H * 0.1, W * 1.2, H * 1.2);
    { const gl = g.createRadialGradient(sx, hz, 0, sx, hz, H * 1.1); gl.addColorStop(0, 'rgba(255,225,160,0.9)'); gl.addColorStop(0.25, 'rgba(255,150,60,0.45)'); gl.addColorStop(1, 'rgba(255,120,40,0)'); g.globalCompositeOperation = 'lighter'; g.fillStyle = gl; g.fillRect(-W * 0.1, -H * 0.1, W * 1.2, H * 1.2);
      burst(g, sx, hz, W * 1.4, 22, 'rgba(255,205,130,0.08)', 131, 0.05, t * 0.05); g.globalCompositeOperation = 'source-over'; }
    { const gr = g.createLinearGradient(0, hz - SR, 0, hz); gr.addColorStop(0, '#fff6d8'); gr.addColorStop(1, '#ffd27a'); g.fillStyle = gr; g.beginPath(); g.arc(sx, hz + u * 2, SR, Math.PI, TAU); g.fill(); } // the sun, half risen
    for (let j = 0; j < 2; j++) { g.fillStyle = j ? '#2a1010' : '#5a2418'; g.beginPath(); g.moveTo(-W * 0.1, H * 1.2); for (let x = -W * 0.1; x <= W * 1.1; x += W / 48) g.lineTo(x, hz - u * (3 - j * 3) - Math.sin(x / W * (5 + j * 3) + j * 2) * u * (2.6 - j) - rnd(Math.round(x / W * 48), 133 + j) * u * 1.2); g.lineTo(W * 1.1, H * 1.2); g.closePath(); g.fill();
      for (let i = 0; i < 16; i++) { const x = (rnd(i, 140 + j) * 1.1 - 0.05) * W, y = hz - u * (2 - j * 3), hh = u * (5 + rnd(i, 142 + j) * 7) * (1 + j * 0.5), lean = (rnd(i, 144 + j) - 0.5) * 0.9; g.save(); g.translate(x, y); g.rotate(lean); g.fillRect(-u * 0.14, -hh, u * 0.28, hh); if (i % 3 === 0) { g.beginPath(); g.moveTo(0, -hh); g.lineTo(u * 3.2, -hh + u * 0.8); g.lineTo(u * 2, -hh + u * 1.8); g.lineTo(u * 3, -hh + u * 3); g.lineTo(0, -hh + u * 2.6); g.fill(); } g.restore(); } } // the field the night left: spears, and banners that fell
    const kx = sx - W * 0.005, ky = hz + u * 5; g.fillStyle = '#0c0504'; g.beginPath(); g.moveTo(-W * 0.1, H * 1.2); g.lineTo(-W * 0.1, hz + u * 14); g.quadraticCurveTo(kx - W * 0.2, hz + u * 12, kx - W * 0.07, ky + u); g.quadraticCurveTo(kx, ky - u * 1.2, kx + W * 0.08, ky + u * 1.4); g.quadraticCurveTo(kx + W * 0.2, hz + u * 11, W * 1.1, hz + u * 13); g.lineTo(W * 1.1, H * 1.2); g.closePath(); g.fill(); // the knoll
    // the banner: driven into the knoll, its cloth let go from the yard, taken by the wind row by row
    const drop = easeIn(cl(t / 0.3)), tex = F.bannerTex, bw = H * 0.3, bh = H * 0.47, px = kx + u * 6, ptop = H * 0.07, by = ptop + u * 3, unf = easeOut(cl((t - 0.3) / 0.7)), N = 40, cv = F.clothCv || (F.clothCv = document.createElement('canvas')), pad = Math.round(u * 8);
    if (cv.width !== Math.round(bw + pad * 2) || cv.height !== Math.round(bh)) { cv.width = Math.round(bw + pad * 2); cv.height = Math.round(bh); }
    { const x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height); x.imageSmoothingEnabled = false;
      for (let r = 0; r < N; r++) { const v = r / N; if (v > unf) break; const dx = (Math.sin(v * 5.2 - t * 3.3) * u * 3.6 + Math.sin(v * 12 - t * 5.5) * u * 0.9) * v; x.drawImage(tex, 0, v * tex.height, tex.width, tex.height / N, pad + dx, v * bh, bw, bh / N + 1); }
      x.globalCompositeOperation = 'source-atop'; for (let r = 0; r < N; r++) { const v = r / N, s = Math.cos(v * 5.2 - t * 3.3) * v; x.fillStyle = s > 0 ? 'rgba(255,236,200,' + s * 0.34 + ')' : 'rgba(30,6,0,' + -s * 0.5 + ')'; x.fillRect(0, v * bh, cv.width, bh / N + 1); } x.globalCompositeOperation = 'source-over'; }
    g.save(); g.translate(0, (1 - drop) * -H * 1.1);
    g.strokeStyle = '#ffb56a'; g.lineCap = 'round'; g.lineWidth = u * 1.25; g.beginPath(); g.moveTo(px, ky + u); g.lineTo(px, ptop); g.moveTo(px - bw * 0.56, by); g.lineTo(px + bw * 0.56, by); g.stroke(); g.strokeStyle = '#1a0d07'; g.lineWidth = u * 0.85; g.stroke();
    g.drawImage(cv, px - bw / 2 - pad, by);
    g.restore();
    { const a = F.cap, fr = frAt(a, 'Idle', t, 5), x = px - H * 0.085, y = ky + u * 0.6 + (1 - easeOut(cl((t - 0.1) / 0.5))) * 0, h = H * 0.34; fig(g, a, 'Idle', 2, fr, x, y, h, { rim: '#ffb56a', shade: '#1c0a06', shadeA: 0.42 }); } // the Captain, a hand on the pole
    g.globalCompositeOperation = 'lighter'; { const fx = sx - SR * 0.72, fy = hz - SR * 0.55, p = 0.75 + Math.sin(t * 7) * 0.12, gl = g.createLinearGradient(fx - W * 0.7, 0, fx + W * 0.7, 0); gl.addColorStop(0, 'rgba(255,200,130,0)'); gl.addColorStop(0.5, 'rgba(255,235,200,' + p + ')'); gl.addColorStop(1, 'rgba(255,200,130,0)'); g.fillStyle = gl; g.fillRect(fx - W * 0.7, fy - u * 0.3, W * 1.4, u * 0.6); const g2 = g.createRadialGradient(fx, fy, 0, fx, fy, u * 14); g2.addColorStop(0, 'rgba(255,245,225,' + p + ')'); g2.addColorStop(1, 'rgba(255,200,130,0)'); g.fillStyle = g2; g.fillRect(fx - u * 14, fy - u * 14, u * 28, u * 28); }
    g.globalCompositeOperation = 'source-over'; g.restore();
    sh.words.forEach(([w, at, y], i) => { const p = cl((t - at) / 0.18); if (p <= 0) return; const s = lerp(2.8, 1, easeOut(p)); g.save(); g.translate(W * 0.055, H * y); g.rotate(-0.05); g.scale(s, s); g.globalAlpha = p; g.font = '800 ' + Math.round(u * (i === 2 ? 18 : 14)) + 'px ' + DISP; g.textAlign = 'left'; g.textBaseline = 'middle'; g.lineWidth = u * 1.1; g.lineJoin = 'round'; g.strokeStyle = '#150a04'; g.strokeText(w, 0, 0); g.fillStyle = i === 2 ? '#ffe7a3' : '#fff'; g.fillText(w, 0, 0); g.restore(); });
    g.textBaseline = 'alphabetic'; g.globalAlpha = 1;
  }

  // ================================================================ 11 · the name
  function drawName(g, W, H, sh, k, t) {
    const u = H / 100, p = easeOut(cl(t / 0.32));
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.fillStyle = '#050406';
    g.save(); g.translate(-(1 - p) * W * 0.9, -(1 - p) * H * 0.5); g.beginPath(); g.moveTo(-W, -H); g.lineTo(W * 0.64, -H); g.lineTo(W * 0.64, 0); g.lineTo(W * 0.36, H); g.lineTo(W * 0.36, H * 2); g.lineTo(-W, H * 2); g.closePath(); g.fill(); g.restore();
    g.save(); g.translate((1 - p) * W * 0.9, (1 - p) * H * 0.5); g.beginPath(); g.moveTo(W * 0.64, -H); g.lineTo(W * 2, -H); g.lineTo(W * 2, H * 2); g.lineTo(W * 0.36, H * 2); g.lineTo(W * 0.36, H); g.lineTo(W * 0.64, 0); g.closePath(); g.fill(); g.restore();
    { const a = cl((t - 0.4) / 1.2) * 0.5, gl = g.createRadialGradient(W / 2, H * 0.46, 0, W / 2, H * 0.46, W * 0.5); gl.addColorStop(0, 'rgba(120,70,20,' + a + ')'); gl.addColorStop(1, 'rgba(60,30,10,0)'); g.fillStyle = gl; g.fillRect(0, 0, W, H); }
    const seam = cl(1 - (t - 0.3) / 0.9); if (seam > 0 && p >= 1) { g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,225,160,' + seam + ')'; g.lineWidth = u * (0.4 + seam * 1.4); g.shadowColor = '#ffcf7a'; g.shadowBlur = 16; g.beginPath(); g.moveTo(W * 0.64, 0); g.lineTo(W * 0.36, H); g.stroke(); g.shadowBlur = 0; g.globalCompositeOperation = 'source-over'; }
    const s = 'BANNERBORN', size = Math.min(W * 0.092, H * 0.19), gap = size * 0.2; g.font = '800 ' + Math.round(size) + 'px ' + DISP; g.textBaseline = 'middle'; g.textAlign = 'left';
    let w = 0; const ws = []; for (const ch of s) { const cw = g.measureText(ch).width; ws.push(cw); w += cw + gap; } w -= gap; let x = W / 2 - w / 2; const y = H * 0.46, x0 = x;
    const shx = x0 + ((t - sh.lettersAt - 1.5) / 1.1) * (w + size * 2) - size; // a light that crosses the letters once they stand
    for (let i = 0; i < s.length; i++) { const q = cl((t - sh.lettersAt - i * 0.085) / 0.2); if (q > 0) { const sc = lerp(2.2, 1, easeOut(q)), gr = g.createLinearGradient(0, y - size * 0.5, 0, y + size * 0.5); gr.addColorStop(0.1, '#fffbe8'); gr.addColorStop(0.45, '#ffe1a0'); gr.addColorStop(0.7, '#ffb648'); gr.addColorStop(1, '#a8641a'); g.save(); g.translate(x + ws[i] / 2, y); g.scale(sc, sc); g.globalAlpha = q; g.fillStyle = 'rgba(90,45,5,0.9)'; g.fillText(s[i], -ws[i] / 2, size * 0.035); g.fillStyle = q < 1 ? '#fff' : gr; if (q >= 1) { g.translate(0, -y); g.fillText(s[i], -ws[i] / 2, y); } else g.fillText(s[i], -ws[i] / 2, 0); g.restore();
      if (q >= 1) { const sg = g.createLinearGradient(shx - size * 0.6, 0, shx + size * 0.6, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.9)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sg; g.fillText(s[i], x, y); } } x += ws[i] + gap; }
    g.textBaseline = 'alphabetic';
    const tk = cl((t - sh.threadAt) / 0.8), hx = W / 2 - w / 2 - u * 2, head = thread(g, [hx, y + size * 0.78, hx + w + u * 4, y + size * 0.78], tk, GOLD, u * 0.55); if (tk > 0 && tk < 1) needle(g, head[0], head[1], u, -0.2);
    const tag = 'RAISE YOUR BANNER  ·  EARN YOUR HEROES  ·  SHUT THE GRAVEGATES', n = Math.floor(cl((t - sh.threadAt - 0.6) / 1.2) * tag.length); if (n > 0) { g.font = '600 ' + Math.round(Math.max(10, u * 2.5)) + 'px ' + HEAD; g.fillStyle = '#e6d6ae'; g.textBaseline = 'middle'; spaced(g, tag, W / 2, y + size * 1.25, u * 0.75, n); g.textBaseline = 'alphabetic'; }
  }

  // ---------------------------------------------------------------- the film
  C.SCENES.intro = async function () {
    const cap = { hero: K.leader() }, vesh = { foe: 'vesh' }, dead = [{ foe: 'ghoul' }, { foe: 'warden' }, { foe: 'necro' }];
    const pool = BB.ROSTER.filter((c) => c.role === 'hero'), knights = [];
    for (const arch of ['knight', 'paladin', 'spearman', 'barbarian', 'ranger', 'mage', 'monk', 'duelist']) { const c = pool.find((q) => q.arch === arch); if (c) knights.push({ hero: BB.newHero({ calling: c.calling, recruit: c.key, name: c.name }) }); }
    while (knights.length < 8) knights.push({ hero: K.leader() }); knights.push(cap);
    await K.cast([cap, vesh].concat(dead, knights));
    const cols = BB.BANNER_COLORS.concat(['#3a6a8a']), banners = []; for (let i = 0; i < 9; i++) banners.push(Object.assign({}, i === 8 ? BB.save.banner : { color: cols[i], sigil: BB.SIGILS[i % BB.SIGILS.length], trim: '#e8c66a' }));
    sprC.clear();
    F = { cap, vesh, dead, knights, banners, map: null, glass: null, live: null, bannerTex: BB.UI.bannerCanvas(BB.save.banner, 160, 250) };
    F.stitch = knights.map(stitchOf); F.map = buildMap(); F.glass = buildGlass();
    C.onEnd = () => { F = null; sprC.clear(); }; // the film's canvases and its battlefield go when it does
    try { // the ninth shot is the game: your Captain, alone, with the dead coming up out of the ground all round
      const me = K.leader(), holdOn = (sc) => { const o = sc.obj; if (o && o.endlessWave > 1) o.endlessWave = 1; const h = sc.heroList[0]; if (h) { if (h.dead && sc.reviveHero) sc.reviveHero(h); h.hp = Math.max(h.hp, h.maxhp * 0.7); } };
      const sc = await BB.stageScene({ idx: 2, over: 8, warm: 0.4, tick: [holdOn], mission: (st) => Object.assign({}, BB.ENDLESS, { level: st.level, region: 'c1', chapter: 1 }), heroes: (S) => { const c = JSON.parse(JSON.stringify(me)), like = S.heroes[0]; c.stars = 5; c.level = like.level; return [c]; } });
      sc.noBars = true; sc.silent = true; F.live = sc;
    } catch (e) { F.live = null; }
    const k = K, at = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => 1.0 + i * 0.66), G = F.glass, M = F.map;
    const ring = (n, r0, r1) => () => { const sc = F && F.live, h = sc && sc.heroList[0]; if (!h) return; for (let i = 0; i < n; i++) { const an = i / n * TAU + r0, r = r0 + (i % 3) / 2 * (r1 - r0); try { const e = sc.spawnFoe(['ghoul', 'warden', 'ghoul', 'necro', 'ghoul'][i % 5], h.x + Math.cos(an) * r, h.y + Math.sin(an) * r, { rise: true }); if (e) e._film = true; } catch (e) { /* off the field */ } } };
    const blow = () => { const sc = F && F.live, h = sc && sc.heroList[0];
      if (h) { try { if (!h.dead) { h.energy = 100; sc.useSkill(h, true); } } catch (e) { /* no skill */ } for (const e of sc.foesAlive()) if (Math.hypot(e.x - h.x, e.y - h.y) < 7) { try { sc.kill(e, h); } catch (er) { /* it stands */ } } }
      k.SHAKE(1)(); k.FLASH(0.8, '#fff4d6')(); k.RGB(1)(); BB.sfx('burst'); BB.sfx('slam'); BB.score && BB.score('braam', 1.2); };
    const pinFall = M.pins.slice(0, 8).map((p) => 0.5 + Math.hypot((p[0] - M.gate[0]), (p[1] - M.gate[1]) * 0.5625) / 0.21);
    const hit = (sh, sc) => () => { k.SHAKE(sh)(); BB.score && BB.score('hit', sc); };
    const shots = [
      { draw: drawTapestry, dur: 8.4, at, fadeIn: 0.8, lb: 0.1, caption: 'Nine banners stood between the living and the dead.', capAt: 2.4, capEnd: 8.1,
        cues: [[0, k.SCORE('drone')]].concat(at.map((t0, i) => [t0 + 0.3, i === 8 ? () => { BB.sfx('rally'); } : k.SFX('click')])) },
      { draw: drawOath, dur: 4.4, lb: 0.1, caption: 'Nine knights swore to hold them. For three hundred years, they did.', capAt: 0.3, capEnd: 4.2,
        cues: [[2.0, k.SFX('rally')], [2.3, k.SPARKS(110, '#ffe7a3', 0.5, 0.5, 760)], [2.3, k.SHAKE(0.35)], [2.3, k.FLASH(0.3, '#ffe7a3')], [2.3, k.SCORE('hit', 0.8)]] },
      { draw: drawRip, dur: 3.5, lb: 0.1, cues: [[0, k.SCORE('riser', 1.7)], [0.02, k.SFX('charge')], [0.85, () => { BB.sfx('slam'); k.SHAKE(0.7)(); k.RGB(0.7)(); k.FLASH(0.35, '#e0d0ff')(); }], [1.9, k.SCORE('braam', 1)], [1.9, k.SHAKE(0.4)]] },
      { draw: drawGateUp, dur: 6.8, burstAt: 2.7, veshAt: 4.5, lb: 0.13, caption: 'The Gravegates opened.', capAt: 3.0, capEnd: 6.5,
        cues: [[0, k.SCORE('drone')], [0.4, k.VOICE('rumble', 0.8)], [1.3, k.BOLT()], [1.9, k.SHAKE(0.25)], [2.7, () => { k.SHAKE(1)(); BB.sfx('portal'); BB.sfx('burst'); BB.sfx('slam'); k.FLASH(0.9, '#e0d0ff')(); k.RGB(1)(); }], [2.7, k.SCORE('braam', 1.2)], [2.72, k.SPARKS(200, '#c9a8ff', 0.5, 0.6, 1100)], [3.1, k.VOICE('dino_horde', 0.7)], [3.9, k.BOLT()], [4.5, k.VOICE('deep_groan', 0.9)], [4.6, k.SHAKE(0.35)], [5.8, k.BOLT()], [6.3, k.RGB(0.6)]] },
      { draw: drawCantor, dur: 4.6, eyesAt: 0.9, nameAt: 1.3, singAt: 3.3, lb: 0.13, caption: 'Out of the first one walked Vesh Morrow. He opened his mouth, and sang.', capAt: 0.3, capEnd: 4.4,
        cues: [[0, k.SFX('charge')], [0.9, () => { k.FLASH(0.3, '#7dffb0')(); k.SHAKE(0.3)(); BB.sfx('hex'); }], [1.3, () => { BB.sfx('slam'); k.SHAKE(0.45)(); BB.score && BB.score('hit', 0.9); }], [3.3, () => { BB.sfx('boss'); k.SHAKE(0.8)(); k.RGB(0.9)(); k.FLASH(0.5, '#c8ffe0')(); }], [3.3, k.SCORE('braam', 1.2)], [3.3, k.VOICE('deep_roar', 1)], [4.0, k.RGB(0.5)]] },
      { draw: drawSong, dur: 6.0, lb: 0.1, caption: 'Every grave in the vale answered. The banners went down like wheat.', capAt: 0.5, capEnd: 5.8,
        cues: [[0, k.SCORE('riser', 2.2)], [0.5, k.SFX('hex')]].concat(pinFall.map((t0, i) => [t0, () => { BB.sfx('slam'); k.SHAKE(0.18 + i * 0.02)(); BB.score && BB.score('hit', 0.45 + i * 0.05); }]), [[4.8, k.SFX('rally')]]) },
      { draw: drawRising, dur: 3.3, lb: 0.1, panels: [{ k: 'hand', d: 0.6 }, { k: 'eyes', d: 0.5 }, { k: 'march', d: 0.65 }, { k: 'low', d: 0.5 }, { k: 'ridge', d: 1.05 }],
        cues: [[0, () => { hit(0.5, 0.8)(); BB.sfx('slam'); }], [0.6, () => { hit(0.4, 0.8)(); BB.voice && BB.voice('dino_horde', 0.8, 0.9); }], [1.1, hit(0.4, 0.9)], [1.75, () => { hit(0.5, 1)(); BB.sfx('slam'); k.RGB(0.5)(); }], [2.25, () => { k.SHAKE(0.6)(); BB.score && BB.score('boom'); BB.voice && BB.voice('deep_roar', 0.7, 0.9); }]] },
      { draw: drawGlass, dur: G.end + 2.7, lb: 0.08, caption: 'One by one, the banners fell.', capAt: 0.4, capEnd: G.last, cap2: ['All but one.', G.end + 0.3, G.end + 2.5],
        cues: G.order.map((i, n) => [G.at[i], () => { BB.sfx('slam'); BB.sfx('ice'); k.SHAKE(0.3 + n * 0.05)(); BB.score && BB.score('hit', 0.6 + n * 0.06); if (n > 4) k.RGB(0.4)(); }]).concat([[G.end + 0.15, () => { BB.sfx('slam'); k.SHAKE(0.5)(); }], [G.end + 0.5, k.SFX('rally')], [G.end + 0.5, k.SCORE('boom')], [G.end + 0.6, k.EMBERS(50, '#ffe7a3')]]) },
    ];
    if (F.live) shots.push({ draw: drawNinth, dur: 9.8, pushAt: 2.6, blowAt: 4.8, freezeAt: 5.85, thawAt: 8.3, lb: 0.13, noVig: true, fadeIn: 0.25, caption: 'Three hundred years on, one banner still stands.', capAt: 0.4, capEnd: 4.2,
      cues: [[0, ring(13, 3.6, 5.6)], [0, k.SCORE('drone')], [0.1, k.VOICE('dino_horde', 0.7)], [1.4, ring(9, 5, 6.4)], [2.6, k.SCORE('riser', 2.2)], [2.6, k.SFX('charge')], [4.8, blow], [5.85, () => { BB.sfx('slam'); k.SHAKE(0.3)(); }], [6.1, k.SFX('rally')], [8.3, () => { hit(0.4, 1)(); ring(16, 6, 8.5)(); }]] });
    shots.push(
      { draw: drawRaise, dur: 4.6, lb: 0.1, words: [['RAISE', 0.9, 0.31], ['YOUR', 1.45, 0.47], ['BANNER', 2.0, 0.66]], fadeIn: 0.3,
        cues: [[0, k.MUSIC('boss')], [0, k.EMBERS(70, '#ffb56a')], [0.3, () => { BB.sfx('slam'); k.SHAKE(0.6)(); BB.score && BB.score('boom'); }], [0.9, () => { hit(0.4, 0.8)(); BB.sfx('slam'); }], [1.45, () => { hit(0.45, 0.9)(); BB.sfx('slam'); }], [2.0, () => { hit(0.7, 1)(); BB.sfx('slam'); k.RGB(0.6)(); }], [2.4, k.SFX('rally')], [2.5, k.EMBERS(60, '#ffe7a3')], [4.45, k.FLASH(1, '#fff')]] },
      { draw: drawName, dur: 5.0, lettersAt: 0.5, threadAt: 1.7, lb: 0, noVig: true, fadeOut: 0.8,
        cues: [[0, () => { BB.sfx('slam'); k.SHAKE(0.6)(); BB.score && BB.score('braam', 1.1); }]].concat([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => [0.5 + i * 0.085, k.SPARKS(14, '#ffd98a', 0.22 + i * 0.062, 0.46, 260)]), [[1.5, k.SCORE('boom')], [1.7, k.SFX('click')]]) });
    return { music: null, shots };
  };
})();
