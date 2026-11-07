// VESPER — the pixel buffer the moon-art cinematics are drawn on (180 px tall, as wide as the
// screen's shape), scaled up without smoothing over the high-resolution game. Text, discs and the
// moon in pixel style. The fight itself is drawn at full resolution by view.js.
(function () {
  const VS = window.VS;
  const P = VS.PX = { W: 320, H: 180, FLOOR: 118, cam: 0, shake: 0, t: 0, heroAt: null };
  P.buf = document.createElement('canvas'); P.buf.width = P.W; P.buf.height = P.H;
  P.ctx = P.buf.getContext('2d'); P.ctx.imageSmoothingEnabled = false;
  P.fit = function (aspect) {
    const W = Math.max(300, Math.min(420, Math.round(P.H * aspect)));
    if (W !== P.W) { P.W = W; P.buf.width = W; P.buf.height = P.H; P.ctx.imageSmoothingEnabled = false; }
  };
  P.font = (size) => `${size}px Adventurer, "Courier New", monospace`;
  const tcache = new Map();
  P.text = function (ctx, s, x, y, size, col, align, o) {
    o = o || {}; s = String(s);
    const shadow = o.shadow !== false, key = s + '|' + size + '|' + (col || '#fff') + '|' + (o.outline ? 1 : 0) + (shadow ? 1 : 0);
    let c = tcache.get(key);
    if (!c) {
      const m = P.ctx; m.font = P.font(size);
      const tw = Math.ceil(m.measureText(s).width), pad = 2, h = Math.ceil(size * 1.5) + pad * 2;
      c = document.createElement('canvas'); c.width = Math.max(1, tw + pad * 2 + 1); c.height = h;
      const g = c.getContext('2d'); g.font = P.font(size); g.textBaseline = 'alphabetic';
      const bx = pad, by = pad + Math.ceil(size * 1.1);
      if (shadow) { g.fillStyle = 'rgba(0,0,0,0.9)'; g.fillText(s, bx + 1, by + 1); if (o.outline) { g.fillText(s, bx - 1, by); g.fillText(s, bx, by - 1); } }
      g.fillStyle = col || '#fff'; g.fillText(s, bx, by);
      c.tw = tw; c.bx = bx; c.by = by;
      if (tcache.size > 300) tcache.clear();
      tcache.set(key, c);
    }
    const ax = align === 'center' ? c.tw / 2 : align === 'right' ? c.tw : 0;
    ctx.drawImage(c, Math.round(x - ax - c.bx), Math.round(y - c.by));
  };
  P.wrap = function (ctx, s, size, maxW) {
    ctx.font = P.font(size); const out = []; let cur = '';
    for (const w of s.split(' ')) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; }
    if (cur) out.push(cur); return out;
  };
  P.disc = function (ctx, cx, cy, r, col) {
    ctx.fillStyle = col; cx = Math.round(cx); cy = Math.round(cy);
    for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y)); ctx.fillRect(cx - w, cy + y, w * 2, 1); }
  };
  const mix = (c1, c2, k) => { const p = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); const a = p(c1), b = p(c2); return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
  P.moon = function (ctx, cx, cy, r, col, glow) {
    const g = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 2.6);
    g.addColorStop(0, glow || 'rgba(255,40,60,0.35)'); g.addColorStop(1, 'rgba(255,40,60,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - r * 3, cy - r * 3, r * 6, r * 6);
    P.disc(ctx, cx, cy, r, col);
    P.disc(ctx, cx - r * 0.18, cy - r * 0.2, Math.round(r * 0.78), mix(col, '#ffffff', 0.12));
  };
})();
