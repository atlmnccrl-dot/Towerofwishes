// The pixel UI: a 2D canvas at buffer resolution, scaled up like the 3D view. A 5x7 bitmap font,
// HUD (health, tonics, Requiem gauge, ability badges, embers, boss bar), toasts, floating texts,
// cards, menus and touch buttons.

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

// three-letter codes for the abilities on badges and buttons
const ABBR = { wave: 'WAV', rush: 'RSH', whirl: 'WRL', volley: 'VOL', smoke: 'SMK', snare: 'TRP', shockwave: 'SHK', charge: 'CHG', ward: 'WRD', pillar: 'PIL', lantern: 'LNT', wisps: 'WSP' };
export const abbr = (id) => ABBR[id] || String(id).slice(0, 3).toUpperCase();

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
    this.c = canvas; this.g = canvas.getContext('2d'); this.r = renderer; this.toasts = []; this.t = 0; this.safe = { l: 0, r: 0, b: 0 };
    this.touchScale = 1.3;        // touch buttons and the move stick, relative to the old sizes (settings: 1.15 / 1.3 / 1.5)
    this.floats = [];             // floatText(): rising texts in buffer pixels
    this.gain = null;             // healGain(): the green flash on the health bar
    this.abFx = [];               // per ability slot: ready pop and cast flash on the badges
    this.frameNo = 0; this.floatFrame = -1;
    this.resize(); renderer.onResize = () => this.resize();
  }
  resize() {
    const r = this.r; this.w = r.bw; this.h = r.bh; this.c.width = r.bw; this.c.height = r.bh;
    this.c.style.width = (r.bw * r.scale / r.dpr) + 'px'; this.c.style.height = (r.bh * r.scale / r.dpr) + 'px';
    this.g.imageSmoothingEnabled = false;
    const cs = getComputedStyle(document.documentElement);
    const px = (v) => (parseFloat(v) || 0) * r.dpr / r.scale;
    // all four insets from a hidden probe (the bottom one keeps buttons off the iPhone's home bar)
    let pb = null;
    try {
      if (!this.probe) { this.probe = document.createElement('div'); this.probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'; document.body.appendChild(this.probe); }
      pb = getComputedStyle(this.probe);
    } catch (e) { pb = null; }
    this.safe = {
      l: Math.max(px(cs.getPropertyValue('--sal')), pb ? px(pb.paddingLeft) : 0),
      r: Math.max(px(cs.getPropertyValue('--sar')), pb ? px(pb.paddingRight) : 0),
      b: pb ? px(pb.paddingBottom) : 0,
    };
  }
  clear() { this.frameNo++; this.g.clearRect(0, 0, this.w, this.h); }

  text(str, x, y, o = {}) {
    const col = o.color || COL.text; const sc = o.scale || 1; const img = glyphCanvas(String(str), col, o.shadow === false ? null : (o.shadow || '#000000'));
    let dx = x; const w = img.width * sc;
    if (o.align === 'center') dx = x - Math.floor(w / 2); else if (o.align === 'right') dx = x - w;
    const g = this.g; const a = g.globalAlpha; if (o.alpha !== undefined) g.globalAlpha = a * o.alpha;
    g.drawImage(img, Math.round(dx), Math.round(y), w, img.height * sc); g.globalAlpha = a; return w;
  }
  measure(str, sc = 1) { return (String(str).length * 6 - 1) * sc; }
  // wrap into as few lines as wrap() would, but with their lengths evened out (no lone last word)
  wrapEven(str, maxW) { const n = this.wrap(str, maxW).length; if (n < 2) return this.wrap(str, maxW); let lo = 6, hi = maxW; while (lo < hi) { const mid = (lo + hi) >> 1; if (this.wrap(str, mid).length <= n) hi = mid; else lo = mid + 1; } return this.wrap(str, lo); }
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
  outline(x, y, w, h, c) { this.rect(x, y, w, 1, c); this.rect(x, y + h - 1, w, 1, c); this.rect(x, y + 1, 1, h - 2, c); this.rect(x + w - 1, y + 1, 1, h - 2, c); }

  // A text at a point in buffer pixels (a projected head, say) that rises about 10 px and fades over a second.
  floatText(text, sx, sy, color = COL.white) {
    if (!isFinite(sx) || !isFinite(sy)) return;
    this.floats.push({ text: String(text), x: sx, y: sy, color, t: 0, life: 1.05 });
    if (this.floats.length > 24) this.floats.shift();
  }
  // drawn once per frame (hud() calls it; a screen without the HUD may call it itself)
  drawFloats(dt) {
    if (this.floatFrame === this.frameNo) return; this.floatFrame = this.frameNo;
    for (const f of this.floats) {
      f.t += dt; const k = Math.min(1, f.t / f.life); const rise = 10 * (1 - (1 - k) * (1 - k));
      const a = Math.max(0, Math.min(1, f.t * 10, (1 - k) * 3));
      if (a > 0) this.text(f.text, f.x, f.y - 9 - rise, { align: 'center', color: f.color, alpha: a, shadow: '#06140a' });
    }
    this.floats = this.floats.filter((f) => f.t < f.life);
  }
  // A heal landed: the part of the health bar it filled flashes green and "+amt" rises beside the bar.
  healGain(amt) {
    amt = Math.round(amt); if (!(amt > 0)) return;
    const g = this.gain;
    if (g && g.t < 0.5) { g.amt += amt; g.hi = null; g.t = Math.min(g.t, 0.1); g.textT = 0; }  // a second heal on top of the first adds up
    else this.gain = { amt, t: 0, textT: 0, life: 1.3, lo: null, hi: null };
  }

  // ---------------------------------------------------------------- HUD
  // ability badge: a short code in a box. Cooling: a dim fill rises from the bottom as it charges.
  // Ready: a bright border that breathes (abilities fire from the attack, so "ready" must read at a glance).
  // pop (1 -> 0): it just came ready, a ring opens around it; flash (1 -> 0): it just fired.
  badge(x, y, w, h, code, cdFrac, key, ready = true, accent = '#e8b860', pop = 0, flash = 0) {
    const g = this.g, a0 = g.globalAlpha; const on = cdFrac <= 0 && ready;
    if (pop > 0) { const e = 1 + Math.round((1 - pop) * 1.4); g.globalAlpha = a0 * pop; this.outline(x - 1 - e, y - 1 - e, w + 2 + e * 2, h + 2 + e * 2, accent); g.globalAlpha = a0; }
    this.rect(x - 1, y - 1, w + 2, h + 2, '#000'); this.rect(x, y, w, h, on ? '#1c1a16' : '#101216');
    if (!on) {
      const fh = Math.round(h * Math.max(0, Math.min(1, 1 - cdFrac)));
      if (fh > 0) { this.rect(x, y + h - fh, w, fh, '#34302a'); this.rect(x, y + h - fh, w, 1, '#7a6c4c'); }
    } else {
      g.globalAlpha = a0 * (0.6 + 0.4 * Math.sin(this.t * 4.2 + x * 0.37)); this.outline(x - 1, y - 1, w + 2, h + 2, accent);
      g.globalAlpha = a0; this.rect(x, y, w, 1, accent);
    }
    if (flash > 0) { g.globalAlpha = a0 * flash * 0.85; this.rect(x, y, w, h, '#fff2d8'); g.globalAlpha = a0; }
    this.text(code, x + w / 2, y + Math.round(h / 2) - 3, { align: 'center', color: on ? COL.white : '#5e5a52', shadow: false });
    if (key) this.text(key, x + w - 1, y + h + 2, { align: 'right', color: COL.dim, shadow: false });
  }
  // ready pop and cast flash per ability slot, from how the cooldowns move between frames
  abilityFx(hero, dt) {
    const abs = hero.stats.abilities || []; const out = [];
    for (let i = 0; i < abs.length; i++) {
      const id = abs[i] && abs[i].id; const cd = Math.max(0, (hero.cds && hero.cds[i]) || 0); const cdm = (hero.cdMax && hero.cdMax[i]) || 1;
      let s = this.abFx[i];
      if (!s || s.id !== id || s.hero !== hero.id) s = this.abFx[i] = { id, hero: hero.id, cd, pop: 0, flash: 0 };
      if (cd <= 0 && s.cd > 0) s.pop = 1;
      if (cd > s.cd + 0.05) { s.flash = 1; s.pop = 0; }
      s.cd = cd; s.pop = Math.max(0, s.pop - dt * 2.6); s.flash = Math.max(0, s.flash - dt * 4);
      out.push({ code: abbr(id), frac: Math.min(1, cd / cdm), pop: s.pop, flash: s.flash });
    }
    return out;
  }

  hud(G, dt) {
    this.t += dt; const w = this.w, h = this.h; const L = 6 + this.safe.l, R = w - 6 - this.safe.r;
    const hero = G.world && G.world.hero; if (!hero) return;
    const hpW = Math.round(66 + (hero.maxHp - 100) * 0.18);
    G.hpGhost = G.hpGhost === undefined ? hero.hp : Math.max(hero.hp, G.hpGhost - dt * 30);
    this.bar(L, 6, hpW, 4, hero.hp / hero.maxHp, hero.hp / hero.maxHp < 0.3 && Math.floor(this.t * 4) % 2 ? '#ff3a3a' : COL.red, '#1a0c10', G.hpGhost / hero.maxHp);
    this.drawGain(hero, L, 6, hpW, 4, L + hpW + 4 + hero.stats.maxTonics * 6 + 2, dt);
    // ultimate gauge
    const m = G.world.meter / 100; const full = m >= 1;
    this.bar(L, 13, 46, 2, m, full ? (Math.floor(this.t * 6) % 2 ? '#ffffff' : '#ff4a4a') : '#a83040', '#140a0c');
    // level and experience
    if (G.level) { this.text('LV' + G.level, L, 19, { color: COL.gold }); this.bar(L + 22, 21, 34, 1, G.xpFrac || 0, '#d8b860', '#1a160c'); if (G.points) this.text('+', L + 60, 19, { color: Math.floor(this.t * 3) % 2 ? COL.gold : COL.white }); }
    // tonics
    for (let i = 0; i < hero.stats.maxTonics; i++) this.flask(L + hpW + 4 + i * 6, 4, i < hero.tonics);
    // embers
    this.emberIcon(R - 3 - this.measure(Math.round(G.embersShown ?? 0)) - 5, 6);
    this.text(String(Math.round(G.embersShown ?? 0)), R, 5, { align: 'right', color: COL.gold });
    // abilities: the two equipped skills fire from the attack when ready, so they show as badges without keys
    const abl = hero.stats.abilities ? this.abilityFx(hero, dt) : [];
    if (full && !this.ultFull) this.ultPop = 1; this.ultFull = full; this.ultPop = Math.max(0, (this.ultPop || 0) - dt * 2.6);
    const touchL = this.touchMode ? this.touchLayout(G) : null;
    if (touchL) {
      // touch: stacked under the pause button, clear of the thumb buttons (the ULT has its own button);
      // on a short buffer a row under the pause button, or at the shortest a row beside it
      const p = touchL.find((b) => b.id === 'pause'); const bw = 18, bh = 12, n = abl.length;
      const top = Math.min(...touchL.filter((b) => b.id !== 'pause').map((b) => b.y - b.r)); // USE counted even when hidden: badges never jump
      const col = p.y + p.r + 6 + n * (bh + 5) + 2 <= top, under = !col && p.y + p.r + 5 + bh + 3 <= top;
      let bx = col ? p.x + p.r - bw : under ? p.x + p.r - n * (bw + 4) + 4 : p.x - p.r - 5 - n * (bw + 4) + 4;
      let by = col ? p.y + p.r + 6 : under ? p.y + p.r + 5 : p.y - bh / 2; this.badgeX = n ? bx : undefined;
      for (const a of abl) { this.badge(bx, by, bw, bh, a.code, a.frac, null, true, '#e8b860', a.pop, a.flash); if (col) by += bh + 5; else bx += bw + 4; }
    } else if (hero.stats.abilities) {
      // keyboard and pad: bottom right, the two skills, the ultimate (Q) and the dash charges
      const bw = 18, bh = 12, by = h - bh - 12; let bx = R - (bw + 4) * 3 + 4;
      for (const a of abl) { this.badge(bx, by, bw, bh, a.code, a.frac, null, true, '#e8b860', a.pop, a.flash); bx += bw + 4; }
      this.badge(bx, by, bw, bh, 'ULT', full ? 0 : 1 - m, 'Q', full, '#ff5050', this.ultPop);
      for (let i = 0; i < hero.stats.dashCharges; i++) this.rect(R - (bw + 4) * 3 + 4 + i * 5, by - 5, 4, 2, i < hero.dashCharges ? COL.ice : '#2a3038');
    }
    // boss bar
    const boss = G.boss && !G.boss.dead ? G.boss : null;
    if (boss) {
      let bw = Math.round(w * 0.5), bx = Math.round((w - bw) / 2); const by = h - 12;
      if (touchL) {
        // on touch the bar stops short of the buttons that reach down to it
        const low = touchL.filter((b) => !b.hidden && b.y + b.r >= by - 10); const lim = low.length ? Math.min(...low.map((b) => b.x - b.r)) - 5 : w;
        if (bx + bw > lim) { const cw = Math.round(2 * (lim - w / 2)); if (cw >= w * 0.34) { bw = cw; bx = Math.round((w - bw) / 2); } else { bw = Math.round(Math.min(w * 0.5, lim - L)); bx = Math.round(lim - bw); } }
      }
      G.bossGhost = G.bossGhost === undefined ? boss.hp : Math.max(boss.hp, G.bossGhost - dt * 120);
      this.text(boss.def.name, bx, by - 9, { color: COL.white });
      this.bar(bx, by, bw, 3, boss.hp / boss.maxHp, '#b02028', '#14080a', G.bossGhost / boss.maxHp);
      for (const ph of G.bossPhases || []) this.rect(bx + Math.round(bw * ph), by - 1, 1, 5, '#e8d8c0');
    }
    // toasts (top centre); on touch they wrap short of the pause button and the badges under it
    let ty = this.toastY || 26, tw = w - 12; // below the training panel while it is up (game.js sets toastY)
    if (touchL) { const p = touchL.find((b) => b.id === 'pause'); tw = Math.max(120, Math.min(tw, 2 * (Math.min(p.x - p.r, this.badgeX ?? p.x) - 5 - w / 2))); }
    for (const t of this.toasts) {
      t.t += dt; const a = Math.min(1, t.t * 4, (t.life - t.t) * 2);
      if (a > 0) {
        const sc = t.big && this.measure(t.msg, 2) <= tw ? 2 : 1;
        for (const line of this.wrap(t.msg, tw / sc)) { this.text(line, w / 2, ty, { align: 'center', color: t.color, alpha: a, scale: sc }); ty += sc === 2 ? 18 : 9; }
        ty += 1;
      }
    }
    this.toasts = this.toasts.filter((t) => t.t < t.life);
    if (G.prompt) { const key = this.touchMode ? '' : '[E] '; this.text(key + G.prompt, w / 2, h - (boss ? 32 : 22), { align: 'center', color: COL.gold, alpha: 0.75 + Math.sin(this.t * 5) * 0.25 }); }
    this.drawFloats(dt);
  }

  // the green part of the health bar a heal just filled, blinking then fading, and "+amt" rising at tx
  drawGain(hero, x, y, w, h, tx, dt) {
    const gn = this.gain; if (!gn) return;
    gn.t += dt; gn.textT += dt;
    if (gn.hi === null) { gn.hi = hero.hp; if (gn.lo === null) gn.lo = Math.max(0, hero.hp - gn.amt); }
    if (gn.t >= gn.life && gn.textT >= 1.1) { this.gain = null; return; }
    const g = this.g, a0 = g.globalAlpha; const k = Math.min(1, gn.t / gn.life);
    const x0 = x + Math.round(w * Math.min(1, gn.lo / hero.maxHp)), x1 = x + Math.round(w * Math.min(1, Math.min(gn.hi, hero.hp) / hero.maxHp));
    if (x1 > x0 && k < 1) {
      const blink = gn.t < 0.36 && Math.floor(gn.t / 0.09) % 2 === 0;
      g.globalAlpha = a0 * Math.pow(1 - k, 0.6); this.rect(x0, y, x1 - x0, h, blink ? '#c4ffcc' : '#7dff9a'); this.rect(x0, y, x1 - x0, 1, '#d8ffd8');
      g.globalAlpha = a0 * 0.5 * (1 - k); this.rect(x0, y - 2, x1 - x0, 1, '#7dff9a'); this.rect(x0, y + h + 1, x1 - x0, 1, '#7dff9a');
      g.globalAlpha = a0;
    }
    if (gn.textT < 1.1) {
      const tk = gn.textT / 1.1; const ty = y + 3 - Math.round(7 * (1 - (1 - tk) * (1 - tk)));
      this.text('+' + gn.amt, tx, Math.max(0, ty), { color: '#7dff9a', alpha: Math.max(0, Math.min(1, gn.textT * 8, (1 - tk) * 3)), shadow: '#06140a' });
    }
  }

  // ---------------------------------------------------------------- touch buttons
  // Right thumb: ATK, the biggest, in the corner; DASH and ULT on an arc around it (left, up-left); the
  // tonic a little further out in the notch between them; USE above ATK when a prompt is up; pause top right.
  // Sizes are today's times ui.touchScale; margins keep clear of the safe-area insets (notch, home bar).
  // effective button scale: ui.touchScale, eased down only on a buffer shorter than 180 px (the dynamic
  // resolution's bigger pixels), where the buttons still come out at least as big on the glass
  touchK() { return (this.touchScale || 1.3) * Math.min(1, this.h / 180); }
  touchLayout(G) {
    const s = this.touchK(), w = this.w, h = this.h;
    const hero = G && G.world && G.world.hero; const full = !!(G && G.world && G.world.meter >= 100);
    const rad = (v) => Math.max(6, Math.round(v * s));
    const ra = rad(16), rd = rad(11), ru = rad(9), rt = rad(8), rs = rad(9), rp = rad(7);
    const gap = Math.max(3, Math.round(3 * s)); const m = Math.round(4 + 3 * s);
    const rx = w - Math.max(m, this.safe.r + 3), by = h - Math.max(m, (this.safe.b || 0) + 2);
    const ax = rx - ra, ay = by - ra;
    const at = (deg, d) => { const a = deg * Math.PI / 180; return { x: ax - Math.cos(a) * d, y: ay - Math.sin(a) * d }; };
    // the nearest spot along the given bearings that clears the buttons already placed
    const place = (degs, r, others) => {
      let best = null;
      for (const deg of degs) for (let d = ra + r + gap; d < ra * 6; d += 0.5) {
        const p = at(deg, d);
        if (others.every((o) => Math.hypot(p.x - o.x, p.y - o.y) >= o.r + r + gap)) { if (!best || d < best.d) best = { ...p, d }; break; }
      }
      return { x: Math.round(best.x), y: Math.round(best.y), r };
    };
    const atk = { x: Math.round(ax), y: Math.round(ay), r: ra };
    const dsh = place([6], rd, [atk]); const ult = place([56], ru, [atk]);
    const ton = place([24, 28, 32, 36, 40, 44], rt, [atk, dsh, ult]);
    const use = place([102], rs, [atk, ult]);
    const px = w - Math.max(5, this.safe.r + 2) - rp, py = 21 + rp;
    const cd = (i) => (hero && hero.cds ? Math.max(0, hero.cds[i] || 0) / ((hero.cdMax && hero.cdMax[i]) || 1) : 0);
    const nab = hero && hero.stats.abilities ? hero.stats.abilities.length : 0;
    return [
      { id: 'atk', ...atk, label: 'ATK', pips: Array.from({ length: Math.min(2, nab) }, (_, i) => cd(i)) },
      { id: 'dsh', ...dsh, label: 'DASH', count: hero ? hero.dashCharges : 0 },
      { id: 'ult', ...ult, label: 'ULT', dim: !full, glow: full },
      { id: 'heal', ...ton, label: 'TON', dim: !hero || hero.tonics <= 0 },
      { id: 'use', ...use, label: 'USE', hidden: !(G && G.prompt) },
      { id: 'pause', x: px, y: py, r: rp, label: 'II' },
    ];
  }
  drawTouch(G, input) {
    const L = this.touchLayout(G); input.layout = L; input.touchScale = this.touchK();
    const g = this.g;
    for (const b of L) {
      if (b.hidden) continue;
      const down = input.btnDown.has(b.id);
      g.globalAlpha = b.dim ? 0.25 : (down ? 0.85 : 0.5);
      this.circle(b.x, b.y, b.r, down ? '#5a1418' : '#101418'); this.ring(b.x, b.y, b.r, b.glow ? (Math.floor(this.t * 6) % 2 ? '#ff5050' : '#ffffff') : '#8a8070');
      if (b.id === 'atk') { g.globalAlpha = down ? 0.5 : 0.3; this.ring(b.x, b.y, b.r - 2, '#8a8070'); }
      const pips = b.pips && b.pips.length && b.r >= 15;
      g.globalAlpha = b.dim ? 0.35 : 0.95; this.text(b.label, b.x, b.y - 3 - (pips ? 2 : 0), { align: 'center', color: b.glow ? '#ff9090' : COL.text, shadow: false });
      if (pips) {
        // the abilities the attack will fire: a gold bar when ready, a dim one filling while it cools
        const pw = 7, n = b.pips.length, x0 = Math.round(b.x - (n * pw + (n - 1) * 2) / 2), y0 = b.y + 6;
        b.pips.forEach((f, i) => {
          const x = x0 + i * (pw + 2); g.globalAlpha = 0.9; this.rect(x, y0, pw, 2, '#1c1e24');
          if (f <= 0) { g.globalAlpha = 0.75 + 0.25 * Math.sin(this.t * 4.2 + i); this.rect(x, y0, pw, 2, '#e8b860'); }
          else { const fw = Math.round(pw * (1 - f)); if (fw > 0) this.rect(x, y0, fw, 2, '#6a6048'); }
        });
      }
      g.globalAlpha = b.dim ? 0.35 : 0.95;
      if (b.count !== undefined) for (let i = 0; i < b.count; i++) this.rect(b.x - 4 + i * 5, b.y + b.r + 2, 3, 2, COL.ice);
      g.globalAlpha = 1;
    }
    // the floating move stick: base and knob grow with the buttons
    const ts = input.touchScale, sr = Math.round(22 * ts), kr = Math.round(8 * ts);
    const s = input.stick;
    if (s) { g.globalAlpha = 0.35; this.ring(s.ox, s.oy, sr, '#8a8070'); g.globalAlpha = 0.6; this.circle(s.x, s.y, kr, '#2a2428'); this.ring(s.x, s.y, kr, '#c8b890'); g.globalAlpha = 1; }
    else { g.globalAlpha = 0.18; this.ring(12 + sr + this.safe.l, this.h - Math.max(12, (this.safe.b || 0) + 4) - sr, sr, '#8a8070'); g.globalAlpha = 1; }
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
