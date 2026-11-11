// Bannerborn — the opening, a film of its own. Eleven shots, each in its own manner, with a cast drawn for it
// (js/cineart.js): none of the game's small sprites appear in it.
//   1 the ridge      nine knights along a ridge at dusk, a banner over each; the camera walks the line
//   2 the oath       from under the blades: nine swords come in from the edge of the frame and meet over the eye
//   3 the tear       the picture rips from top to bottom and something violet looks through
//   4 the gate       from the grass, looking up: the Gravegate, too tall for the frame, waking; the dead run past
//   5 the cantor     a dolly zoom on Vesh Morrow: the world rushes past him while he does not move
//   6 the song       the vale from above, as a map: his song rolls out in rings, the graves answer, the banners fall
//   7 the rising     five cuts: a hand, eyes, the ranks coming on, three looking down, a ridge under the moon
//   8 nine to one    nine windows of coloured glass, a knight in each; eight break
//   9 the ninth      your Captain alone as the dead close in from both sides; the blow; the frame held
//  10 raise it       dawn, your banner on the wind, three words
//  11 the name       cut on a blade's line; the letters are struck; a gold thread signs it
// The cutscene engine (js/cinema.js) plays it: it gives each shot its time, cues, bars, grain and subtitle.
(function () {
  const BB = window.BB, C = BB.Cinema; if (!C || !C.kit || !BB.CineArt) return;
  const K = C.kit, TAU = Math.PI * 2;
  const lerp = (a, b, k) => a + (b - a) * k, cl = (k) => Math.max(0, Math.min(1, k));
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2), easeOut = (k) => 1 - Math.pow(1 - k, 3), easeIn = (k) => k * k * k;
  const rnd = (i, s) => { const v = Math.sin(i * 127.1 + (s || 0) * 311.7) * 43758.5453; return v - Math.floor(v); };
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
  const DISP = 'Cinzel, "Cormorant Garamond", Georgia, serif', HEAD = 'Outfit, sans-serif';
  const GOLD = '#e8c66a';
  let F = null; // the film's cast and things built once

  // ---------------------------------------------------------------- the cast: art made for the films (js/cineart.js)
  const A = BB.CineArt, skull = A.skull;
  const DEAD = [{ v: 'reaver', weapon: 'cleaver' }, { v: 'warden', weapon: 'spear' }, { v: 'caller', weapon: 'staff' }];
  const deadO = (i, pose) => Object.assign({ pose }, DEAD[((i % 3) + 3) % 3]);
  const walk = (i, t) => (Math.floor(t * 3.2 + i * 0.37) % 2 ? 'walkA' : 'walkB'); // two steps of a shamble

  // ---------------------------------------------------------------- thread, letters, flags
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
  function flag(g, x, y, w, h, t, i, col, a, gust) { // a pennant in its banner's colour, the light behind it
    g.save(); g.globalAlpha *= a; pennant(g, x, y, w, h, t, i, gust); const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, col); gr.addColorStop(1, K.rgba(K.mix(K.rgbOf(col), [0, 0, 0], 0.5), 1)); g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(255,225,170,0.75)'; g.lineWidth = Math.max(1, h * 0.025); g.stroke(); g.restore();
  }

  // ---------------------------------------------------------------- marks cut in stone
  function rune(g, x, y, r, q) { // a stave and what hangs on it
    g.beginPath(); g.moveTo(x, y - r); g.lineTo(x, y + r);
    if (q === 0) { g.moveTo(x, y - r * 0.6); g.lineTo(x + r * 0.7, y - r); g.moveTo(x, y); g.lineTo(x + r * 0.7, y - r * 0.4); }
    else if (q === 1) { g.moveTo(x, y - r * 0.7); g.lineTo(x + r * 0.6, y - r * 0.1); g.lineTo(x, y + r * 0.5); g.lineTo(x - r * 0.6, y - r * 0.1); g.closePath(); }
    else if (q === 2) { g.moveTo(x - r * 0.6, y - r * 0.5); g.lineTo(x + r * 0.6, y + r * 0.5); g.moveTo(x + r * 0.6, y - r * 0.5); g.lineTo(x - r * 0.6, y + r * 0.5); }
    else { g.moveTo(x - r * 0.7, y - r * 0.2); g.lineTo(x, y - r); g.lineTo(x + r * 0.7, y - r * 0.2); g.moveTo(x - r * 0.5, y + r * 0.6); g.lineTo(x + r * 0.5, y + r * 0.6); }
    g.stroke(); }

  // ================================================================ 1 · nine on the ridge
  function drawRidge(g, W, H, sh, k, t) {
    const u = H / 100, span = W * 3.1, camX = lerp(0, span - W, ease(cl((t - 0.5) / (sh.dur - 1.2)))), gy = H * 0.81;
    const sky = g.createLinearGradient(0, 0, 0, gy); sky.addColorStop(0, '#0d1030'); sky.addColorStop(0.45, '#5a2a4a'); sky.addColorStop(0.8, '#e0703a'); sky.addColorStop(1, '#ffc878'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    const sx = W * 0.72 - camX * 0.07, sy = gy - u * 3; // the sun is far: it hardly moves
    { g.globalCompositeOperation = 'lighter'; const gl = g.createRadialGradient(sx, sy, 0, sx, sy, H * 0.95); gl.addColorStop(0, 'rgba(255,230,170,0.95)'); gl.addColorStop(0.22, 'rgba(255,160,70,0.45)'); gl.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = gl; g.fillRect(0, 0, W, H); burst(g, sx, sy, W * 1.5, 20, 'rgba(255,205,130,0.07)', 131, 0.05, t * 0.04); g.globalCompositeOperation = 'source-over';
      g.fillStyle = '#fff3d4'; g.beginPath(); g.arc(sx, sy, H * 0.17, 0, TAU); g.fill(); }
    for (let i = 0; i < 9; i++) { const x = ((rnd(i, 201) * 1.6 - 0.2) * W - camX * 0.12 + t * u * (1 + rnd(i, 202))) % (W * 1.5) - W * 0.2, y = H * (0.2 + rnd(i, 203) * 0.42); g.fillStyle = 'rgba(' + (i % 2 ? '60,26,58' : '255,170,110') + ',' + (i % 2 ? 0.4 : 0.16) + ')'; g.beginPath(); g.ellipse(x, y, W * (0.12 + rnd(i, 204) * 0.16), u * (1.2 + rnd(i, 205) * 2), 0, 0, TAU); g.fill(); } // bars of cloud
    for (let j = 0; j < 2; j++) { const par = 0.16 + j * 0.2, ox = camX * par; g.fillStyle = j ? '#2a1830' : '#4a2a48'; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += W / 60) { const wx = x + ox; g.lineTo(x, gy - u * (15 - j * 7) - Math.abs(Math.sin(wx * 0.0031 + j)) * u * (15 - j * 5) - Math.sin(wx * 0.011 + j * 2) * u * 2.5); } g.lineTo(W, H); g.closePath(); g.fill(); } // far hills
    g.save(); g.translate(-camX, 0);
    const ry = (x) => gy + Math.sin(x * 0.0022) * u * 1.6;
    for (let i = 0; i < 9; i++) {
      const x = W * (0.92 + i * 0.205), y = ry(x) + u, h = H * 0.45, b = F.banners[i], mine = i === 8, px = x - h * 0.3, top = y - h * 1.4, seen = cl((camX + W * 0.86 - x) / (W * 0.16));
      if (x < camX - W * 0.2 || x > camX + W * 1.2) continue;
      if (mine) { g.globalCompositeOperation = 'lighter'; const gl = g.createRadialGradient(x, y - h * 0.7, 0, x, y - h * 0.7, h * 1.1); gl.addColorStop(0, 'rgba(255,225,150,0.5)'); gl.addColorStop(1, 'rgba(255,225,150,0)'); g.fillStyle = gl; g.fillRect(x - h * 1.1, y - h * 1.8, h * 2.2, h * 2.2); g.globalCompositeOperation = 'source-over'; }
      g.strokeStyle = '#ffcf8a'; g.lineWidth = u * 0.75; g.lineCap = 'round'; g.beginPath(); g.moveTo(px, y); g.lineTo(px, top - u); g.stroke(); g.strokeStyle = '#120a0c'; g.lineWidth = u * 0.5; g.stroke();
      flag(g, px, top, h * 0.5, h * 0.3, t, i, b.color, 1);
      { const o = F.nine[i], d = (camX + W * 0.56 - x) / (W * 0.2), up = mine ? easeOut(cl(d)) : Math.sin(Math.PI * cl(d / 2)), kq = Math.round(up * 2) / 2, po = Object.assign({}, o, { cape: false }, kq > 0 ? { pose: A.blend(o.pose || 'stand', 'raise', kq), up: kq >= 0.5 } : null);
        if (o.cape !== false) A.cape(g, po, x, y, h, t, 'dusk', false, 0.15 + up * 0.5);
        g.save(); g.translate(x, y); g.scale(1, 1 + Math.sin(t * 1.5 + i * 2) * 0.006); A.draw(g, 'knight', po, 0, 0, h, 'dusk'); g.restore();
        if (up > 0.8) { const P = A.blend(o.pose || 'stand', 'raise', 1), tx = x + P.haR[0] * h, ty = y + (P.haR[1] - (/sword|great/.test(o.weapon) ? 0.48 : 0.6)) * h, s = u * 3 * (up - 0.8) * 5 * (0.8 + Math.sin(t * 9 + i) * 0.2); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,244,214,0.95)'; g.beginPath(); g.moveTo(tx - s, ty); g.lineTo(tx, ty - s * 0.16); g.lineTo(tx + s, ty); g.lineTo(tx, ty + s * 0.16); g.closePath(); g.fill(); g.beginPath(); g.moveTo(tx, ty - s); g.lineTo(tx + s * 0.16, ty); g.lineTo(tx, ty + s); g.lineTo(tx - s * 0.16, ty); g.closePath(); g.fill(); g.globalCompositeOperation = 'source-over'; } } // the light catches what they raise
      g.globalAlpha = seen * 0.95; g.font = '700 ' + Math.round(u * 4) + 'px ' + DISP; g.textAlign = 'center'; g.fillStyle = mine ? '#fff3c8' : '#f3d9a6'; g.fillText(ROMAN[i], px + h * 0.25, top - u * 3); g.globalAlpha = 1;
    }
    g.fillStyle = '#0a0608'; g.beginPath(); g.moveTo(camX - W * 0.1, H * 1.1); for (let x = camX - W * 0.1; x <= camX + W * 1.1; x += W / 40) g.lineTo(x, ry(x) + u * 0.6); g.lineTo(camX + W * 1.1, H * 1.1); g.closePath(); g.fill(); // the ridge they stand on
    g.restore();
    g.save(); g.translate(-(camX * 1.7) % (W / 30), 0); g.fillStyle = '#050304'; g.beginPath(); g.moveTo(-W * 0.1, H); for (let i = -3; i <= 64; i++) { const x = i * W / 60; g.lineTo(x, H * 0.905 + rnd(i & 31, 9) * u * 2); g.lineTo(x + W / 240, H * (0.86 - rnd(i & 31, 8) * 0.035)); g.lineTo(x + W / 120, H * 0.905); } g.lineTo(W * 1.1, H); g.closePath(); g.fill(); g.restore(); // grass by the lens
    g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,220,160,0.7)'; for (let i = 0; i < 40; i++) { const x = ((rnd(i, 211) * W * 1.2 - camX * 0.5 + t * u * 3) % (W * 1.2) + W * 1.2) % (W * 1.2) - W * 0.1, y = H * (0.25 + rnd(i, 212) * 0.6) + Math.sin(t * 1.3 + i) * u * 1.5, r = u * (0.12 + rnd(i, 213) * 0.22); g.fillRect(x, y, r * 2, r * 2); } g.globalCompositeOperation = 'source-over';
    { const s = 'THREE HUNDRED YEARS AGO', a = cl(Math.min(1, (2.7 - t) / 0.6)); if (a > 0) { g.globalAlpha = a; g.font = '800 ' + Math.round(u * 5.6) + 'px ' + DISP; g.textBaseline = 'middle'; g.fillStyle = '#fff1cf'; g.strokeStyle = 'rgba(20,8,20,0.7)'; g.lineWidth = u * 0.6; spaced(g, s, W / 2, H * 0.2, u * 1.5, Math.floor(cl((t - 0.2) / 0.9) * s.length), true); g.globalAlpha = 1; g.textBaseline = 'alphabetic'; } }
  }

  // ================================================================ 2 · the oath: nine blades, seen from under them
  function drawOath(g, W, H, sh, k, t) {
    const u = H / 100, cx = W / 2, cy = H * 0.5, R = Math.hypot(W, H) / 2, all = cl((t - sh.meetAt) / 0.3), turn = t * 0.035;
    const sky = g.createRadialGradient(cx, cy, 0, cx, cy, R); sky.addColorStop(0, '#fff3d0'); sky.addColorStop(0.16, '#ffc46a'); sky.addColorStop(0.45, '#b4503e'); sky.addColorStop(0.75, '#4a2450'); sky.addColorStop(1, '#10122e'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'lighter'; burst(g, cx, cy, R * 1.2, 36, 'rgba(255,220,150,' + (0.06 + all * 0.08) + ')', 61, 0.03, t * 0.12); g.globalCompositeOperation = 'source-over';
    const BL = Math.min(W, H) * 0.56, bw = u * 3.2;
    for (let i = 0; i < 9; i++) {
      const p = easeOut(cl((t - sh.firstAt - i * sh.gap) / 0.26)); if (p <= 0) continue;
      const b = F.banners[i], r0 = u * 3.2 + (1 - p) * R * 1.1, hx = r0 + BL;
      g.save(); g.translate(cx, cy); g.rotate(-Math.PI / 2 + i * TAU / 9 + 0.16 + turn + (1 - p) * 0.3);
      g.fillStyle = '#141826'; g.beginPath(); g.moveTo(hx + u * 8, -u * 4.2); g.lineTo(R * 1.5, -u * 8); g.lineTo(R * 1.5, u * 8); g.lineTo(hx + u * 8, u * 4.2); g.closePath(); g.fill(); // the arm, plate to the elbow, out of frame
      g.strokeStyle = 'rgba(255,214,150,0.55)'; g.lineWidth = u * 0.35; g.beginPath(); g.moveTo(hx + u * 8, -u * 4.2); g.lineTo(R * 1.5, -u * 8); g.stroke();
      g.fillStyle = b.color; g.fillRect(hx + u * 13, -u * 5.3, u * 4.5, u * 10.6); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(hx + u * 13, 0, u * 4.5, u * 5.3); // a band of the banner's colour at the wrist
      { const gr = g.createLinearGradient(0, -bw, 0, bw); gr.addColorStop(0, '#f6f8ff'); gr.addColorStop(0.46, '#aab4c8'); gr.addColorStop(0.54, '#4a5368'); gr.addColorStop(1, '#232a3a'); g.fillStyle = gr; g.beginPath(); g.moveTo(r0, 0); g.lineTo(r0 + u * 9, -bw * 0.5); g.lineTo(hx, -bw * 0.62); g.lineTo(hx, bw * 0.62); g.lineTo(r0 + u * 9, bw * 0.5); g.closePath(); g.fill(); // the blade
        g.strokeStyle = 'rgba(255,240,205,0.9)'; g.lineWidth = u * 0.3; g.beginPath(); g.moveTo(r0, 0); g.lineTo(r0 + u * 9, -bw * 0.5); g.lineTo(hx, -bw * 0.62); g.stroke(); g.strokeStyle = 'rgba(10,12,22,0.55)'; g.lineWidth = u * 0.35; g.beginPath(); g.moveTo(r0 + u * 12, 0); g.lineTo(hx - u * 2, 0); g.stroke(); }
      g.fillStyle = '#8a6a26'; g.fillRect(hx, -u * 7.5, u * 2, u * 15); g.fillStyle = '#e0bd62'; g.fillRect(hx, -u * 7.5, u * 0.7, u * 15); // guard, grip, pommel, and the fist round it
      g.fillStyle = '#2a1c14'; g.fillRect(hx + u * 2, -u * 1.1, u * 8, u * 2.2); g.fillStyle = '#b8923e'; g.beginPath(); g.arc(hx + u * 11, 0, u * 1.8, 0, TAU); g.fill();
      g.fillStyle = '#1b2030'; g.beginPath(); g.ellipse(hx + u * 5.6, 0, u * 3.6, u * 4.4, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,214,150,0.6)'; g.lineWidth = u * 0.3; g.beginPath(); g.ellipse(hx + u * 5.6, 0, u * 3.6, u * 4.4, 0, Math.PI * 0.9, Math.PI * 1.9); g.stroke();
      g.strokeStyle = 'rgba(8,10,18,0.8)'; g.lineWidth = u * 0.3; for (let f = -1; f <= 1; f++) { g.beginPath(); g.moveTo(hx + u * (4.4 + f * 1.5), -u * 3.9); g.lineTo(hx + u * (4.4 + f * 1.5), u * 3.9); g.stroke(); }
      g.restore();
    }
    if (all > 0) { g.globalCompositeOperation = 'lighter'; const q = t - sh.meetAt, gl = g.createRadialGradient(cx, cy, 0, cx, cy, H * (0.3 + all * 0.25)); gl.addColorStop(0, 'rgba(255,252,240,' + all + ')'); gl.addColorStop(0.3, 'rgba(255,220,150,' + all * 0.6 + ')'); gl.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = gl; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,245,220,' + all * 0.85 + ')'; g.fillRect(cx - W * 0.6, cy - u * 0.3, W * 1.2, u * 0.6); g.fillRect(cx - u * 0.3, cy - H * 0.6, u * 0.6, H * 1.2);
      const rr = easeOut(cl(q / 0.9)) * R; g.strokeStyle = 'rgba(255,235,190,' + cl(1 - q / 0.9) * 0.8 + ')'; g.lineWidth = u * 1.2; g.beginPath(); g.arc(cx, cy, rr, 0, TAU); g.stroke(); g.globalCompositeOperation = 'source-over'; }
  }

  // ================================================================ 3 · the tear
  function drawRip(g, W, H, sh, k, t) {
    const u = H / 100;
    if (!sh._snap || sh._snap.width !== W || sh._snap.height !== H) { const c = sh._snap = document.createElement('canvas'); c.width = W; c.height = H; drawOath(c.getContext('2d'), W, H, sh.oath, 0.98, sh.oath.dur - 0.02); }
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
      const q = (q0 - i * 0.17) / 1.9; if (q <= 0 || q >= 1) continue; const e = q * q, side = (i % 2 ? 1 : -1) * (0.25 + rnd(i, 55) * 0.75), x = cx + side * lerp(W * 0.05, W * 0.62, e), y = lerp(gy + u, H * 1.34, e), h = lerp(H * 0.06, H * 0.7, e), o = deadO(i, walk(i, t * 1.7));
      g.globalAlpha = cl(q * 6) * cl((1 - q) * 5); A.draw(g, 'dead', o, x, y, h, 'gate', i % 2 === 0, 288); A.eyes(g, 'dead', o, x, y, h, '201,168,255', 0.9, i % 2 === 0); g.globalAlpha = 1; } }
    if (t > sh.veshAt) { const q = cl((t - sh.veshAt) / 1.3), y = gy + u * 2 - easeOut(q) * H * 0.1, h = H * lerp(0.26, 0.4, easeOut(q)), o = { pose: 'sing' }; g.globalAlpha = cl(q * 2); // and then him, walking out on the light
      g.globalCompositeOperation = 'lighter'; const gl = g.createRadialGradient(cx, y - h * 0.5, 0, cx, y - h * 0.5, h * 1.2); gl.addColorStop(0, 'rgba(125,255,176,0.4)'); gl.addColorStop(1, 'rgba(125,255,176,0)'); g.fillStyle = gl; g.fillRect(cx - h * 1.2, y - h * 1.7, h * 2.4, h * 2.4); g.globalCompositeOperation = 'source-over';
      A.draw(g, 'vesh', o, cx, y, h, 'green', false, 320); A.eyes(g, 'vesh', o, cx, y, h, '125,255,176', 1); g.globalAlpha = 1; }
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
      for (const [hh, col, gyf, n] of [[0.25, '#aaa59a', 0.62, 13], [0.37, '#5a564e', 0.77, 9], [0.58, '#060606', 0.97, 6]]) { // rank on rank, coming straight on
        g.fillStyle = col; g.fillRect(0, H * gyf - 1, W, H);
        for (let i = 0; i < n; i++) { const x = W * ((i + 0.5) / n) + Math.sin(i * 7 + n) * u * 2, bob = Math.abs(Math.sin(t * 9 + i * 1.3)) * H * hh * 0.03, o = deadO(i + n, walk(i + n, t * 2)); A.draw(g, 'dead', o, x, H * gyf + u * 0.5 - bob, H * hh * (1 + pk * 0.06), { dim: [col, 1], rims: [] }, i % 2 === 1, 320); if (hh > 0.3) A.eyes(g, 'dead', o, x, H * gyf + u * 0.5 - bob, H * hh * (1 + pk * 0.06), '255,70,50', 1, i % 2 === 1); }
      }
      g.fillStyle = 'rgba(230,225,214,0.5)'; for (let i = 0; i < 12; i++) { const x = ((rnd(i, 85) + t * 0.5) % 1.2 - 0.1) * W; g.beginPath(); g.ellipse(x, H * 0.92, u * (6 + rnd(i, 86) * 8), u * (2 + rnd(i, 87) * 3), 0, 0, TAU); g.fill(); }
    } else if (P.k === 'low') { // from the ground: three of them, looking down
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#6a25b8'); gr.addColorStop(1, '#12041f'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      burst(g, W * 0.5, H * 0.2, W, 46, 'rgba(255,255,255,0.1)', 91, 0.012, t * 0.3);
      for (const [fx, hh, n, ps] of [[0.2, 0.84, 2, 'walkA'], [0.8, 0.88, 1, 'walkB'], [0.5, 1.05, 0, 'reach']]) { const o = deadO(n, ps), x = W * fx + (0.5 - fx) * pk * u * 6, y = H * 1.13, h = H * hh * (1 + pk * 0.06); A.drawLow(g, 'dead', o, x, y, h, 'gate', 0.3, 448); A.eyes(g, 'dead', o, x, y, h, '255,214,64', 1); }
    } else { // the ridge
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#07060f'); gr.addColorStop(1, '#241238'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      const mx = W * 0.64, my = H * 0.44, mr = H * 0.31; g.fillStyle = '#efe9da'; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill(); g.fillStyle = 'rgba(120,110,150,0.25)'; for (const [dx, dy, r] of [[-0.3, -0.2, 0.2], [0.25, 0.1, 0.28], [-0.1, 0.4, 0.15]]) { g.beginPath(); g.arc(mx + dx * mr, my + dy * mr, r * mr, 0, TAU); g.fill(); }
      const ry = (x) => H * 0.7 - Math.sin(x / W * 3.1 + 0.4) * H * 0.12 - Math.sin(x / W * 9) * H * 0.02; g.fillStyle = '#030208';
      for (let i = 0; i < 150; i++) { const x = rnd(i, 101) * W, hh = u * (1.6 + rnd(i, 102) * 3.2), over = cl(pk * 1.5 - rnd(i, 103) * 0.5), y = ry(x) + u * 1.5 - over * u * 3 + (1 - over) * u * 6; g.fillRect(x - hh * 0.16, y - hh, hh * 0.32, hh); g.fillRect(x - hh * 0.2, y - hh * 1.25, hh * 0.4, hh * 0.3); if (i % 9 === 0) g.fillRect(x + hh * 0.2, y - hh * 2, hh * 0.08, hh * 1.6); }
      g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += W / 50) g.lineTo(x, ry(x) + u * 1.5); g.lineTo(W, H); g.closePath(); g.fill();
      { const x = W * 0.3, y = ry(W * 0.3) + u * 2, h = H * 0.36, o = { pose: 'sing' }; A.draw(g, 'vesh', o, x, y, h, 'green'); A.eyes(g, 'vesh', o, x, y, h, '125,255,176', 1); }
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
      const x0 = X0(i), bt = G.at[i] === undefined ? Infinity : G.at[i], who = i === 4 ? 8 : i > 4 ? i - 1 : i, b = F.banners[who], col = paneColours(b); // the middle window is the ninth banner's
      if (t < bt) {
        const sh2 = bt - t < 0.14 ? (Math.random() - 0.5) * u * 1.2 : 0; g.save(); g.translate(sh2, 0);
        g.beginPath(); g.moveTo(x0, y0 + ph); g.lineTo(x0, y0 + pw * 0.5); g.quadraticCurveTo(x0, y0, x0 + pw / 2, y0 - pw * 0.28); g.quadraticCurveTo(x0 + pw, y0, x0 + pw, y0 + pw * 0.5); g.lineTo(x0 + pw, y0 + ph); g.closePath(); // a pointed window
        const gr = g.createLinearGradient(0, y0, 0, y0 + ph); gr.addColorStop(0, col[0]); gr.addColorStop(0.45, col[1]); gr.addColorStop(1, col[2]); g.fillStyle = gr; g.fill(); g.save(); g.clip();
        g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = u * 0.35; g.beginPath(); for (let q = -ph; q < ph * 2; q += ph / 6) { g.moveTo(x0 - u, y0 + q); g.lineTo(x0 + pw + u, y0 + q + pw * 1.3); g.moveTo(x0 + pw + u, y0 + q); g.lineTo(x0 - u, y0 + q + pw * 1.3); } g.stroke();
        { const hx = x0 + pw / 2, hy = y0 + ph * 0.42, gl = g.createRadialGradient(hx, hy, 0, hx, hy, pw * 1.1); gl.addColorStop(0, 'rgba(255,255,255,0.75)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.fillRect(x0, y0 - pw, pw, ph); }
        A.draw(g, 'knight', F.nine[who], x0 + pw / 2, y0 + ph * 0.955, ph * 0.5, 'glass');
        g.fillStyle = col[2]; g.fillRect(x0, y0 + ph * 0.945, pw, ph * 0.06);
        const sx = x0 + ((t * 0.35 + i * 0.13) % 1.6 - 0.3) * pw * 1.6; g.fillStyle = 'rgba(255,255,255,0.16)'; g.beginPath(); g.moveTo(sx, y0 - pw); g.lineTo(sx + pw * 0.3, y0 - pw); g.lineTo(sx - pw * 0.3, y0 + ph); g.lineTo(sx - pw * 0.6, y0 + ph); g.closePath(); g.fill();
        g.font = '700 ' + Math.round(u * 3.2) + 'px ' + DISP; g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,0.92)'; g.fillText(ROMAN[who], x0 + pw / 2, y0 + u * 6.5);
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

  // ================================================================ 9 · the ninth: one against all of them
  function drawNinth(g, W, H, sh, k, t) {
    const u = H / 100, cx = W / 2, B = sh.blowAt, Fz = sh.freezeAt, Un = sh.thawAt, gy = H * 0.8, fy = gy - H * 0.2, hit = t >= B, since = t - B, white = hit && since < 0.12;
    const zoom = t < sh.pushAt ? lerp(1, 1.08, t / sh.pushAt) : t < B ? lerp(1.08, 1.5, easeIn((t - sh.pushAt) / (B - sh.pushAt))) : t < Un ? 1.5 + since * 0.012 : lerp(1.53, 0.96, easeOut((t - Un) / (sh.dur - Un)));
    g.save(); g.translate(cx, fy); g.scale(zoom, zoom); g.rotate(lerp(-0.035, 0.02, cl(t / Fz))); g.translate(-cx, -fy);
    if (white) { g.fillStyle = '#f4efe4'; g.fillRect(-W, -H, W * 3, H * 3); } // the frame of the blow: white, and everything on it black
    else { const sky = g.createLinearGradient(0, 0, 0, gy); sky.addColorStop(0, '#04050e'); sky.addColorStop(0.6, '#121733'); sky.addColorStop(1, '#2c2446'); g.fillStyle = sky; g.fillRect(-W, -H, W * 3, H * 3);
      const mx = W * 0.26, my = H * 0.25, mr = H * 0.085; g.globalCompositeOperation = 'lighter'; const gl = g.createRadialGradient(mx, my, 0, mx, my, mr * 5); gl.addColorStop(0, 'rgba(190,205,255,0.5)'); gl.addColorStop(1, 'rgba(120,140,255,0)'); g.fillStyle = gl; g.fillRect(mx - mr * 5, my - mr * 5, mr * 10, mr * 10); g.globalCompositeOperation = 'source-over'; g.fillStyle = '#e9edfb'; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill();
      for (let j = 0; j < 2; j++) { g.fillStyle = j ? '#0d0c1a' : '#191a30'; g.beginPath(); g.moveTo(-W, H * 2); for (let x = -W; x <= W * 2; x += W / 40) g.lineTo(x, gy - u * (9 - j * 6) - Math.abs(Math.sin(x * 0.004 + j * 2)) * u * (8 - j * 4)); g.lineTo(W * 2, H * 2); g.closePath(); g.fill(); }
      const more = t > Un ? cl((t - Un) / 1.0) : 0; g.globalCompositeOperation = 'lighter'; // the dark is full of eyes, and fills
      for (let i = 0; i < 300; i++) { const born = i < 110 ? rnd(i, 301) * B * 0.8 : Un + rnd(i, 301) * 0.9; if (t < born || (i >= 110 && !more)) continue; const x = (rnd(i, 302) * 2.4 - 0.7) * W, y = gy - u * (1 + rnd(i, 303) * (i < 110 ? 13 : 30)), s = u * (0.22 + rnd(i, 304) * 0.2), a = cl((t - born) * 3) * (0.55 + Math.sin(t * 5 + i) * 0.25); if (Math.abs(x - cx) < W * 0.1 && i < 110) continue; g.fillStyle = 'rgba(201,168,255,' + a + ')'; g.fillRect(x - s * 1.6, y, s, s); g.fillRect(x + s * 0.6, y, s, s); }
      g.globalCompositeOperation = 'source-over'; }
    g.fillStyle = white ? '#0a0a0a' : '#07060c'; g.beginPath(); g.moveTo(-W, H * 2); g.lineTo(-W, gy + u * 2); g.quadraticCurveTo(cx - W * 0.25, gy + u * 2, cx - W * 0.1, gy - u * 0.5); g.quadraticCurveTo(cx, gy - u * 2.2, cx + W * 0.1, gy - u * 0.5); g.quadraticCurveTo(cx + W * 0.25, gy + u * 2, W * 2, gy + u * 2); g.lineTo(W * 2, H * 2); g.closePath(); g.fill(); // the rise they stand on
    const close = cl(t / B), ROWS = [[12, 0.2, -0.5, 'moon', 0.3], [10, 0.3, 3, 'moon', 0.22], [6, 0.48, 10, 'ink', 0.27]];
    const row = (r) => { const [n, hh, dy, lt, d0] = ROWS[r]; for (let i = 0; i < n; i++) { // the dead, closing from both sides; thrown back by the blow, and held in the air while the frame is held
      const side = i % 2 ? 1 : -1, h = H * hh * (0.92 + rnd(i, 310 + r) * 0.16); let x = cx + side * W * (d0 + Math.floor(i / 2) * (r === 2 ? 0.16 : 0.085)) * lerp(1.3, 0.62, close), y = gy + u * dy + Math.abs(Math.sin(t * 6 + i * 1.7)) * u * 0.5 * (hit ? 0 : 1), rot = 0, al = 1;
      if (hit) { const far = 1 - r * 0.22, qq = t >= Fz ? (t < Un ? Fz - B : Fz - B + (t - Un)) : since; x += side * qq * W * 0.42 * far; y -= Math.sin(Math.min(qq * 2.4, Math.PI)) * H * 0.22 * far - Math.max(0, qq - 1.2) * H * 0.3; rot = side * qq * 2.6; al = r === 2 ? cl(1 - qq * 3.2) : cl(1.9 - qq * 1.3); }
      if (al <= 0) continue; const o = deadO(i + r, hit ? 'reach' : walk(i + r * 3, t)); g.save(); g.globalAlpha = al; g.translate(x, y - h * 0.5); g.rotate(rot); A.draw(g, 'dead', o, 0, h * 0.5, h, white ? 'ink' : lt, side > 0, 288); if (!white) A.eyes(g, 'dead', o, 0, h * 0.5, h, '201,168,255', 0.9, side > 0); g.restore(); } };
    row(0); row(1);
    { const px = cx + H * 0.13, top = gy - H * 0.66, bw = H * 0.17, bh = H * 0.27, sway = Math.sin(t * 1.7) * 0.03; // the banner, planted behind the Captain
      g.strokeStyle = white ? '#0a0a0a' : '#b9c6ee'; g.lineCap = 'round'; g.lineWidth = u * 0.9; g.beginPath(); g.moveTo(px, gy); g.lineTo(px, top); g.moveTo(px - bw * 0.56, top + u * 2); g.lineTo(px + bw * 0.56, top + u * 2); g.stroke(); if (!white) { g.strokeStyle = '#11131f'; g.lineWidth = u * 0.6; g.stroke(); }
      g.save(); g.translate(px, top + u * 2); g.transform(1, 0, sway, 1, 0, 0); if (white) { g.fillStyle = '#0a0a0a'; g.fillRect(-bw / 2, 0, bw, bh); } else { g.drawImage(F.bannerTex, -bw / 2, 0, bw, bh); g.fillStyle = 'rgba(8,10,30,0.45)'; g.fillRect(-bw / 2, 0, bw, bh * 0.92); } g.restore(); }
    { const ps = t < sh.pushAt ? 'stand' : !hit ? 'hold' : since < 0.55 || (t >= Fz && t < Un) ? 'slash' : 'hold', h = H * 0.4, lt = white ? 'ink' : hit ? 'fire' : 'moon', o = Object.assign({}, F.capO, { pose: ps, shield: ps === 'stand', cape: false }), frozen = t >= Fz && t < Un;
      A.cape(g, o, cx, gy - u * 1.6, h, frozen ? Fz : t, lt, false, hit ? 0.9 : 0.25 + cl(t / B) * 0.3); A.draw(g, 'knight', o, cx, gy - u * 1.6, h, lt); }
    row(2);
    if (hit && !white && since < 0.7) { const q = since / 0.7; g.save(); g.translate(cx, fy + H * 0.06); g.globalCompositeOperation = 'lighter'; // the stroke of it, and the ring it throws along the ground
      for (let i = 0; i < 3; i++) { const r = W * (0.13 + easeOut(q) * (0.2 + i * 0.07)); g.strokeStyle = 'rgba(' + (i ? '255,220,150,' : '255,250,235,') + (1 - q) * (1 - i * 0.25) + ')'; g.lineWidth = u * (4.5 - i * 1.2) * (1 - q * 0.7); g.beginPath(); g.ellipse(0, 0, r, r * 0.42, -0.12, Math.PI * 0.95 - q * 0.5, Math.PI * 2.1 + q * 0.4); g.stroke(); }
      const rr = easeOut(q) * W * 0.6; g.strokeStyle = 'rgba(255,225,160,' + (1 - q) * 0.7 + ')'; g.lineWidth = u * 1.4 * (1 - q); g.beginPath(); g.ellipse(0, H * 0.13, rr, rr * 0.2, 0, 0, TAU); g.stroke();
      if (q < 0.4) burst(g, 0, 0, W, 48, 'rgba(255,236,190,' + (0.4 - q) * 0.8 + ')', 17, 0.02); g.restore(); }
    g.restore();
    if (t >= Fz && t < Un) { // the frame held: its colour drained from all but the Captain, and a hand writes on it
      const q = t - Fz, hole = () => { g.beginPath(); g.rect(0, 0, W, H); g.arc(cx, fy - u * 3, u * 21, 0, TAU); };
      g.globalCompositeOperation = 'saturation'; g.fillStyle = 'rgba(128,128,128,' + cl(q / 0.15) * 0.92 + ')'; hole(); g.fill('evenodd'); g.globalCompositeOperation = 'source-over';
      g.fillStyle = 'rgba(8,6,14,' + cl(q / 0.2) * 0.4 + ')'; hole(); g.fill('evenodd');
      { const a = cl((q - 0.3) / 0.3); if (a > 0) { g.strokeStyle = 'rgba(255,255,255,' + a + ')'; g.lineWidth = u * 0.45; g.beginPath(); g.arc(cx, fy - u * 3, u * 21, -2.2, -2.2 + TAU * easeOut(cl((q - 0.3) / 0.5))); g.stroke(); } }
      const bk = easeOut(cl((q - 0.12) / 0.3)), by = H * 0.785, col = BB.save.banner.color;
      g.save(); g.translate(0, by); g.rotate(-0.045); g.fillStyle = '#050407'; g.beginPath(); g.moveTo(-W * 0.1, -u * 8); for (let x = 0; x <= 24; x++) g.lineTo(-W * 0.1 + W * 1.2 * bk * x / 24, -u * 8 - rnd(x, 121) * u * 1.6); for (let x = 24; x >= 0; x--) g.lineTo(-W * 0.1 + W * 1.2 * bk * x / 24, u * 8 + rnd(x, 122) * u * 1.6); g.closePath(); g.fill();
      g.fillStyle = col; g.fillRect(-W * 0.1, u * 8.6, W * 1.2 * bk, u * 0.7);
      if (bk > 0.6) { const a = cl((bk - 0.6) / 0.4); g.globalAlpha = a; g.textBaseline = 'middle'; g.font = '800 ' + Math.round(u * 10) + 'px ' + DISP; g.fillStyle = '#fff'; spaced(g, 'THE NINTH BANNER', W * 0.5, -u * 1.5, u * 1.3); g.font = '700 ' + Math.round(u * 3) + 'px ' + HEAD; g.fillStyle = '#ffe7a3'; spaced(g, 'IS YOURS', W * 0.5, u * 5, u * 2.2); g.globalAlpha = 1; g.textBaseline = 'alphabetic'; }
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
    { const kq = Math.round(cl((t - sh.raiseAt) / 0.22) * 2) / 2, x = px - H * 0.12, y = ky + u * 0.6, h = H * 0.42, o = Object.assign({}, F.capO, { cape: false }, kq > 0 ? { pose: A.blend('stand', 'raise', kq), up: kq >= 0.5 } : null); A.cape(g, o, x, y, h, t, 'dawn', true, 0.5); g.save(); g.translate(x, y); g.scale(1, 1 + Math.sin(t * 1.5) * 0.006); A.draw(g, 'knight', o, 0, 0, h, 'dawn'); g.restore(); } // the Captain beside it: the sword goes up with the last word
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
    const cols = BB.BANNER_COLORS.concat(['#3a6a8a']), banners = []; for (let i = 0; i < 9; i++) banners.push(Object.assign({}, i === 8 ? BB.save.banner : { color: cols[i], sigil: BB.SIGILS[i % BB.SIGILS.length], trim: '#e8c66a' }));
    A.clear();
    // the ninth knight, and the Captain after them, wear what the game's Captain wears (BB.CAPTAIN_LOOK): great helm, steel, red
    F = { banners, nine: A.NINE.map((o, i) => Object.assign({ color: banners[i].color, seed: i * 1.7 }, o)), capO: { helm: 'great', crest: true, weapon: 'sword', plate: '#8e98ac', color: banners[8].color, seed: 3 }, map: null, glass: null, bannerTex: BB.UI.bannerCanvas(BB.save.banner, 160, 250) };
    F.map = buildMap(); F.glass = buildGlass();
    C.onEnd = () => { F = null; A.clear(); }; // what the film drew for itself goes when it does
    const k = K, G = F.glass, M = F.map, oath = { draw: null, dur: 4.4, firstAt: 0.3, gap: 0.2, meetAt: 2.3 };
    const pinFall = M.pins.slice(0, 8).map((p) => 0.5 + Math.hypot((p[0] - M.gate[0]), (p[1] - M.gate[1]) * 0.5625) / 0.21);
    const hit = (sh, sc) => () => { k.SHAKE(sh)(); BB.score && BB.score('hit', sc); };
    const shots = [
      { draw: drawRidge, dur: 8.6, fadeIn: 0.8, lb: 0.1, caption: 'Nine banners stood between the living and the dead.', capAt: 2.4, capEnd: 8.3,
        cues: [[0, k.SCORE('drone')], [7.3, k.SFX('rally')]] },
      Object.assign(oath, { draw: drawOath, lb: 0.1, caption: 'Nine knights swore to hold them. For three hundred years, they did.', capAt: 0.3, capEnd: 4.2,
        cues: [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => [0.3 + i * 0.2 + 0.2, () => { BB.sfx('parry'); k.SHAKE(0.12)(); k.SPARKS(10, '#fff0c8', 0.5, 0.5, 300)({ W: innerWidth, H: innerHeight, dpr: 1 }); }]).concat([[2.3, k.SFX('rally')], [2.3, k.SPARKS(120, '#ffe7a3', 0.5, 0.5, 820)], [2.3, k.SHAKE(0.45)], [2.3, k.FLASH(0.45, '#fff0c8')], [2.3, k.SCORE('hit', 0.9)]]) }),
      { draw: drawRip, dur: 3.5, lb: 0.1, oath, cues: [[0, k.SCORE('riser', 1.7)], [0.02, k.SFX('charge')], [0.85, () => { BB.sfx('slam'); k.SHAKE(0.7)(); k.RGB(0.7)(); k.FLASH(0.35, '#e0d0ff')(); }], [1.9, k.SCORE('braam', 1)], [1.9, k.SHAKE(0.4)]] },
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
    shots.push({ draw: drawNinth, dur: 9.2, pushAt: 2.4, blowAt: 4.6, freezeAt: 5.15, thawAt: 7.6, lb: 0.13, fadeIn: 0.25, caption: 'Three hundred years on, one banner still stands.', capAt: 0.4, capEnd: 4.2,
      cues: [[0, k.SCORE('drone')], [0.1, k.VOICE('dino_horde', 0.7)], [2.4, k.SCORE('riser', 2.2)], [2.4, k.SFX('charge')], [4.6, () => { k.SHAKE(1)(); k.RGB(1)(); BB.sfx('burst'); BB.sfx('slam'); BB.score && BB.score('braam', 1.2); }], [4.72, k.FLASH(0.5, '#fff4d6')], [4.72, k.SPARKS(160, '#ffe7a3', 0.5, 0.55, 1200)], [5.15, () => { BB.sfx('slam'); k.SHAKE(0.3)(); }], [5.4, k.SFX('rally')], [7.6, () => { hit(0.4, 1)(); BB.voice && BB.voice('dino_horde', 0.8, 0.9); }]] });
    shots.push(
      { draw: drawRaise, dur: 4.6, raiseAt: 2.0, lb: 0.1, words: [['RAISE', 0.9, 0.31], ['YOUR', 1.45, 0.47], ['BANNER', 2.0, 0.66]], fadeIn: 0.3,
        cues: [[0, k.MUSIC('boss')], [0, k.EMBERS(70, '#ffb56a')], [0.3, () => { BB.sfx('slam'); k.SHAKE(0.6)(); BB.score && BB.score('boom'); }], [0.9, () => { hit(0.4, 0.8)(); BB.sfx('slam'); }], [1.45, () => { hit(0.45, 0.9)(); BB.sfx('slam'); }], [2.0, () => { hit(0.7, 1)(); BB.sfx('slam'); k.RGB(0.6)(); }], [2.4, k.SFX('rally')], [2.5, k.EMBERS(60, '#ffe7a3')], [4.45, k.FLASH(1, '#fff')]] },
      { draw: drawName, dur: 5.0, lettersAt: 0.5, threadAt: 1.7, lb: 0, noVig: true, fadeOut: 0.8,
        cues: [[0, () => { BB.sfx('slam'); k.SHAKE(0.6)(); BB.score && BB.score('braam', 1.1); }]].concat([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => [0.5 + i * 0.085, k.SPARKS(14, '#ffd98a', 0.22 + i * 0.062, 0.46, 260)]), [[1.5, k.SCORE('boom')], [1.7, k.SFX('click')]]) });
    return { music: null, shots };
  };
})();
