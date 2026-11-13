// The pixel UI: a 2D canvas at buffer resolution, scaled up like the 3D view. A 5x7 bitmap font,
// HUD (health, tonics, Requiem gauge, embers, boss bar), toasts, cards, menus and touch buttons.

const G = {
  A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14], D: [30, 17, 17, 17, 17, 17, 30], E: [31, 16, 16, 30, 16, 16, 31],
  F: [31, 16, 16, 30, 16, 16, 16], G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17], I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12],
  K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31], M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16], Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17], S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17], Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
  0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 2, 4, 8, 31], 3: [31, 2, 4, 2, 1, 17, 14], 4: [2, 6, 10, 18, 31, 2, 2],
  5: [31, 16, 30, 1, 1, 17, 14], 6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8], 8: [14, 17, 17, 14, 17, 17, 14], 9: [14, 17, 17, 15, 1, 2, 12],
  '.': [0, 0, 0, 0, 0, 12, 12], ',': [0, 0, 0, 0, 12, 4, 8], '!': [4, 4, 4, 4, 4, 0, 4], '?': [14, 17, 1, 2, 4, 0, 4], "'": [4, 4, 8, 0, 0, 0, 0], '"': [10, 10, 0, 0, 0, 0, 0],
  '-': [0, 0, 0, 14, 0, 0, 0], ':': [0, 12, 12, 0, 12, 12, 0], '/': [1, 1, 2, 4, 8, 16, 16], '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8], '+': [0, 4, 4, 31, 4, 4, 0],
  '%': [24, 25, 2, 4, 8, 19, 3], '&': [12, 18, 20, 8, 21, 18, 13], '>': [8, 4, 2, 1, 2, 4, 8], '<': [2, 4, 8, 16, 8, 4, 2], ' ': [0, 0, 0, 0, 0, 0, 0], '*': [0, 4, 21, 14, 21, 4, 0],
  '=': [0, 0, 31, 0, 31, 0, 0], '[': [14, 8, 8, 8, 8, 8, 14], ']': [14, 2, 2, 2, 2, 2, 14], '—': [0, 0, 0, 31, 0, 0, 0], '#': [10, 10, 31, 10, 31, 10, 10],
};

export const COL = { text: '#d8cfbc', dim: '#8a8478', red: '#c8242a', blood: '#8a1418', gold: '#e8b860', ember: '#ff9a40', ice: '#9cc8e8', dark: '#0a0c10', panel: 'rgba(8,10,14,0.82)', white: '#f2ece0' };

const cache = new Map();
function glyphCanvas(text, color, shadow) {
  const k = text + '|' + color + '|' + shadow; if (cache.has(k)) return cache.get(k);
  const s = text.toUpperCase(); const w = Math.max(1, s.length * 6 - 1 + (shadow ? 1 : 0)), h = 7 + (shadow ? 1 : 0);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  const draw = (ox, oy, col) => {
    g.fillStyle = col; let x = 0;
    for (const ch of s) { const gl = G[ch] || G['?']; for (let r = 0; r < 7; r++) for (let b = 0; b < 5; b++) if (gl[r] & (16 >> b)) g.fillRect(ox + x + b, oy + r, 1, 1); x += 6; }
  };
  if (shadow) draw(1, 1, shadow); draw(0, 0, color);
  if (cache.size > 600) cache.clear();
  cache.set(k, c); return c;
}

export class UI {
  constructor(canvas, renderer) {
    this.c = canvas; this.g = canvas.getContext('2d'); this.r = renderer; this.toasts = []; this.t = 0; this.safe = { l: 0, r: 0 };
    this.resize(); renderer.onResize = () => this.resize();
  }
  resize() {
    const r = this.r; this.w = r.bw; this.h = r.bh; this.c.width = r.bw; this.c.height = r.bh;
    this.c.style.width = (r.bw * r.scale / r.dpr) + 'px'; this.c.style.height = (r.bh * r.scale / r.dpr) + 'px';
    this.g.imageSmoothingEnabled = false;
    const cs = getComputedStyle(document.documentElement);
    const px = (v) => (parseFloat(v) || 0) * r.dpr / r.scale;
    this.safe = { l: px(cs.getPropertyValue('--sal')), r: px(cs.getPropertyValue('--sar')) };
  }
  clear() { this.g.clearRect(0, 0, this.w, this.h); }

  text(str, x, y, o = {}) {
    const col = o.color || COL.text; const sc = o.scale || 1; const img = glyphCanvas(String(str), col, o.shadow === false ? null : (o.shadow || '#000000'));
    let dx = x; const w = img.width * sc;
    if (o.align === 'center') dx = x - Math.floor(w / 2); else if (o.align === 'right') dx = x - w;
    const g = this.g; const a = g.globalAlpha; if (o.alpha !== undefined) g.globalAlpha = a * o.alpha;
    g.drawImage(img, Math.round(dx), Math.round(y), w, img.height * sc); g.globalAlpha = a; return w;
  }
  measure(str, sc = 1) { return (String(str).length * 6 - 1) * sc; }
  wrap(str, maxW) { const words = String(str).split(' '); const lines = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (this.measure(t) > maxW && cur) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur); return lines; }

  rect(x, y, w, h, c) { this.g.fillStyle = c; this.g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  frame(x, y, w, h, fill = COL.panel, edge = '#3a3428') { this.rect(x, y, w, h, fill); this.rect(x, y, w, 1, edge); this.rect(x, y + h - 1, w, 1, edge); this.rect(x, y, 1, h, edge); this.rect(x + w - 1, y, 1, h, edge); }
  bar(x, y, w, h, k, col, back = '#1a1014', ghost = null, ghostCol = '#e8d8c0') {
    this.rect(x - 1, y - 1, w + 2, h + 2, '#000'); this.rect(x, y, w, h, back);
    if (ghost !== null && ghost > k) this.rect(x, y, Math.round(w * Math.min(1, ghost)), h, ghostCol);
    this.rect(x, y, Math.round(w * Math.max(0, Math.min(1, k))), h, col);
    this.rect(x, y, Math.round(w * Math.max(0, Math.min(1, k))), 1, 'rgba(255,255,255,0.25)');
  }
  flask(x, y, full) { const c = full ? '#c8303a' : '#2a2026'; this.rect(x + 1, y, 2, 1, '#8a7a5a'); this.rect(x + 1, y + 1, 2, 1, full ? '#e8d8c0' : '#4a4038'); this.rect(x, y + 2, 4, 4, c); this.rect(x, y + 2, 1, 1, full ? '#ff6a6a' : '#3a3036'); }
  emberIcon(x, y) { this.rect(x + 1, y, 1, 1, '#ffd070'); this.rect(x, y + 1, 3, 2, '#ff9a40'); this.rect(x + 1, y + 3, 1, 1, '#c85020'); }

  toast(msg, o = {}) { this.toasts.push({ msg, t: 0, life: o.life || 2.8, color: o.color || COL.text, big: o.big }); if (this.toasts.length > 4) this.toasts.shift(); }

  // ---------------------------------------------------------------- HUD
  hud(G, dt) {
    this.t += dt; const w = this.w, h = this.h; const L = 6 + this.safe.l, R = w - 6 - this.safe.r;
    const hero = G.world && G.world.hero; if (!hero) return;
    const hpW = Math.round(70 + (hero.maxHp - 100) * 0.35);
    G.hpGhost = G.hpGhost === undefined ? hero.hp : Math.max(hero.hp, G.hpGhost - dt * 30);
    this.bar(L, 6, hpW, 4, hero.hp / hero.maxHp, hero.hp / hero.maxHp < 0.3 && Math.floor(this.t * 4) % 2 ? '#ff3a3a' : COL.red, '#1a0c10', G.hpGhost / hero.maxHp);
    // Requiem gauge
    const m = G.world.meter / 100; const full = m >= 1;
    this.bar(L, 13, 46, 2, m, full ? (Math.floor(this.t * 6) % 2 ? '#ffffff' : '#ff4a4a') : '#a83040', '#140a0c');
    if (full && !this.touchMode) this.text('Q', L + 50, 11, { color: '#ff6a6a' });
    // tonics
    for (let i = 0; i < hero.stats.maxTonics; i++) this.flask(L + hpW + 4 + i * 6, 4, i < hero.tonics);
    // embers
    this.emberIcon(R - 3 - this.measure(G.embersShown ?? 0) - 5, 6);
    this.text(String(Math.round(G.embersShown ?? 0)), R, 5, { align: 'right', color: COL.gold });
    // boss bar
    const boss = G.boss && !G.boss.dead ? G.boss : null;
    if (boss) {
      const bw = Math.round(w * 0.56), bx = Math.round((w - bw) / 2), by = h - 12;
      G.bossGhost = G.bossGhost === undefined ? boss.hp : Math.max(boss.hp, G.bossGhost - dt * 120);
      this.text(boss.def.name, bx, by - 9, { color: COL.white });
      this.bar(bx, by, bw, 3, boss.hp / boss.maxHp, '#b02028', '#14080a', G.bossGhost / boss.maxHp);
    }
    // toasts (top centre)
    let ty = 22;
    for (const t of this.toasts) {
      t.t += dt; const a = Math.min(1, t.t * 4, (t.life - t.t) * 2);
      if (a > 0) { this.text(t.msg, w / 2, ty, { align: 'center', color: t.color, alpha: a, scale: t.big ? 2 : 1 }); ty += t.big ? 18 : 10; }
    }
    this.toasts = this.toasts.filter((t) => t.t < t.life);
    // prompt
    if (G.prompt) { const key = this.touchMode ? '' : '[E] '; this.text(key + G.prompt, w / 2, h - (boss ? 32 : 22), { align: 'center', color: COL.gold, alpha: 0.75 + Math.sin(this.t * 5) * 0.25 }); }
    // objective
    if (G.objective && !boss) this.text(G.objective, L, 20, { color: COL.dim });
  }

  // ---------------------------------------------------------------- touch buttons
  touchLayout(G) {
    const w = this.w, h = this.h; const R = w - this.safe.r;
    const hero = G && G.world && G.world.hero;
    return [
      { id: 'atk', x: R - 26, y: h - 26, r: 15, label: 'ATK' },
      { id: 'dsh', x: R - 60, y: h - 17, r: 11, label: 'DASH' },
      { id: 'hvy', x: R - 21, y: h - 61, r: 11, label: 'HVY' },
      { id: 'par', x: R - 53, y: h - 48, r: 10, label: 'PRY' },
      { id: 'heal', x: R - 86, y: h - 13, r: 8, label: 'TON', dim: !hero || hero.tonics <= 0 },
      { id: 'art', x: R - 82, y: h - 42, r: 9, label: 'ART', dim: !G || !G.world || G.world.meter < 100 },
      { id: 'use', x: R - 50, y: h - 80, r: 9, label: 'USE', hidden: !(G && G.prompt) },
      { id: 'pause', x: R - 12, y: 26, r: 7, label: 'II' },
    ];
  }
  drawTouch(G, input) {
    const L = this.touchLayout(G); input.layout = L;
    for (const b of L) {
      if (b.hidden) continue;
      const down = input.btnDown.has(b.id); const g = this.g;
      g.globalAlpha = b.dim ? 0.25 : (down ? 0.8 : 0.45);
      this.circle(b.x, b.y, b.r, down ? '#5a1418' : '#101418'); this.ring(b.x, b.y, b.r, b.id === 'art' && !b.dim ? '#ff5050' : '#8a8070');
      g.globalAlpha = b.dim ? 0.35 : 0.9; this.text(b.label, b.x, b.y - 3, { align: 'center', color: b.id === 'art' && !b.dim ? '#ff8080' : COL.text, shadow: false });
      g.globalAlpha = 1;
    }
    const s = input.stick;
    if (s) { this.g.globalAlpha = 0.35; this.ring(s.ox, s.oy, 22, '#8a8070'); this.g.globalAlpha = 0.6; this.circle(s.x, s.y, 8, '#2a2428'); this.ring(s.x, s.y, 8, '#c8b890'); this.g.globalAlpha = 1; }
    else { this.g.globalAlpha = 0.18; this.ring(34 + this.safe.l, this.h - 34, 22, '#8a8070'); this.g.globalAlpha = 1; }
  }
  circle(cx, cy, r, col) { const g = this.g; g.fillStyle = col; for (let y = -r; y <= r; y++) { const hw = Math.floor(Math.sqrt(r * r - y * y)); g.fillRect(Math.round(cx - hw), Math.round(cy + y), hw * 2 + 1, 1); } }
  ring(cx, cy, r, col) { const g = this.g; g.fillStyle = col; let x = r, y = 0, err = 1 - r; while (x >= y) { for (const [a, b] of [[x, y], [y, x], [-y, x], [-x, y], [-x, -y], [-y, -x], [y, -x], [x, -y]]) g.fillRect(Math.round(cx + a), Math.round(cy + b), 1, 1); y++; if (err < 0) err += 2 * y + 1; else { x--; err += 2 * (y - x) + 1; } } }

  // ---------------------------------------------------------------- menus and cards
  // items: [{label, disabled}] — returns layout rects for tapping
  menu(items, sel, x, y, o = {}) {
    const rects = []; const lh = o.lh || 12;
    items.forEach((it, i) => {
      const yy = y + i * lh; const on = i === sel;
      const col = it.disabled ? '#5a564e' : (on ? COL.white : COL.dim);
      const wtxt = this.text(it.label, x, yy, { color: col, align: o.align, scale: o.scale || 1 });
      if (on) { const lx = o.align === 'center' ? x - wtxt / 2 - 9 : x - 9; this.text('>', lx + Math.round(Math.sin(this.t * 6)), yy, { color: COL.red }); }
      const rx = o.align === 'center' ? x - wtxt / 2 - 12 : x - 12;
      rects.push({ x: rx, y: yy - 3, w: wtxt + 24, h: lh, i });
      if (it.note) this.text(it.note, (o.align === 'center' ? x + wtxt / 2 : x + wtxt) + 8, yy, { color: it.noteColor || COL.gold });
    });
    return rects;
  }

  letterbox(k) { const bh = Math.round(this.h * 0.12 * k); if (bh <= 0) return; this.rect(0, 0, this.w, bh, '#000'); this.rect(0, this.h - bh, this.w, bh, '#000'); }

  logo(cx, cy, alpha = 1) {
    const g = this.g; const a0 = g.globalAlpha; g.globalAlpha = alpha;
    this.text('BELLMOURN', cx + 1, cy + 1, { align: 'center', scale: 3, color: '#000000', shadow: false });
    this.text('BELLMOURN', cx, cy, { align: 'center', scale: 3, color: '#e6dccb', shadow: '#2a0a0c' });
    // a cracked bell between two lines
    const y = cy + 27; this.rect(cx - 70, y, 56, 1, '#6a1418'); this.rect(cx + 14, y, 56, 1, '#6a1418');
    const bell = ['..###..', '.#####.', '.#####.', '.#####.', '#######', '...#...'];
    bell.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '#') this.rect(cx - 3 + c, y - 3 + r, 1, 1, r === 4 ? '#c8242a' : '#d8b860'); }));
    g.globalAlpha = a0;
  }
}
