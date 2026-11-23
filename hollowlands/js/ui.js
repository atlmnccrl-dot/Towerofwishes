'use strict';
// HOLLOWLANDS — input (touch + keyboard), HUD and every screen. All drawn in the pixel buffer.
const P_ = HL.P;

// ------------------------------------------------------------------ input
HL.Input = (() => {
  const keys = {}, edge = {};
  const st = { joy: null, btn: {}, taps: [] };
  const I = {
    st, keys,
    layout: [],
    down(k) { if (!keys[k]) edge[k] = true; keys[k] = true; },
    up(k) { keys[k] = false; edge[k + '_up'] = true; },
    poll() {
      const k = keys, e = edge, b = st.btn;
      let mx = (k.ArrowRight || k.d ? 1 : 0) - (k.ArrowLeft || k.a ? 1 : 0), my = (k.ArrowDown || k.s ? 1 : 0) - (k.ArrowUp || k.w ? 1 : 0);
      const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
      if (st.joy && st.joy.mag > 0.15) { mx = st.joy.dx; my = st.joy.dy; }
      const btnEdge = (n) => { const v = b[n] && b[n].press; if (v) b[n].press = false; return v; };
      const btnUp = (n) => { const v = b[n] && b[n].release; if (v) b[n].release = false; return v; };
      const out = {
        mx, my,
        attack: e.j || e.z || btnEdge('attack'), attackDown: !!(k.j || k.z || (b.attack && b.attack.held)), attackUp: e.j_up || e.z_up || btnUp('attack'),
        dodge: e[' '] || e.k || e.x || btnEdge('dodge'), interact: e.e || e.f || btnEdge('interact'), ult: e.r || btnEdge('ult'), item: e.q || btnEdge('item'),
        menu: e.Tab || e.i || btnEdge('menu'), skill: e.v || btnEdge('skill'), map: e.m || btnEdge('map'), esc: e.Escape, enter: e.Enter,
        swap: e.c || btnEdge('swap'), aimX: null, aimY: null,
      };
      if (b.attack && b.attack.held && b.attack.ax != null) { out.aimX = b.attack.ax; out.aimY = b.attack.ay; }
      else if ((k.j || k.z) && (mx || my)) { out.aimX = mx; out.aimY = my; }
      for (const n in e) delete e[n];
      return out;
    },
    clearTouches() { st.joy = null; for (const n in st.btn) st.btn[n] = { held: false }; },
  };
  return I;
})();

// ------------------------------------------------------------------ drawing helpers in the reference's style
const UI = (HL.UI = { regions: [], feed: [], banner: null, toastT: 0 });
UI.dotRect = (g, x, y, w, h, col = P_.cream3, corners = true) => {
  g.fillStyle = col;
  for (let i = 2; i < w - 2; i += 2) { g.fillRect(x + i, y, 1, 1); g.fillRect(x + i, y + h - 1, 1, 1); }
  for (let j = 2; j < h - 2; j += 2) { g.fillRect(x, y + j, 1, 1); g.fillRect(x + w - 1, y + j, 1, 1); }
  if (corners) for (const [cx, cy] of [[x - 1, y - 1], [x + w - 2, y - 1], [x - 1, y + h - 2], [x + w - 2, y + h - 2]]) { g.fillRect(cx, cy, 3, 1); g.fillRect(cx, cy + 2, 3, 1); g.fillRect(cx, cy, 1, 3); g.fillRect(cx + 2, cy, 1, 3); }
};
UI.speckle = (g, x, y, w, h, seed = 1) => {
  g.fillStyle = P_.tan2; g.fillRect(x, y, w, h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const v = HL.hash(i + seed * 31, j, 88); if (v < 0.42) { g.fillStyle = v < 0.2 ? P_.tan0 : P_.tan1; g.fillRect(x + i, y + j, 1, 1); } }
};
UI.bar = (g, x, y, w, h, f, col = P_.cream, back = P_.ui2, trail = 0) => {
  g.fillStyle = P_.ink; g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle = back; g.fillRect(x, y, w, h);
  if (trail > f) { g.fillStyle = P_.red1; g.fillRect(x, y, Math.round(w * trail), h); }
  g.fillStyle = col; g.fillRect(x, y, Math.round(w * HL.clamp(f, 0, 1)), h);
  g.fillStyle = P_.cream3; g.fillRect(x + w - 2, y, 2, h);
};
UI.button = (g, label, x, y, fn, opts = {}) => {
  const w = opts.w || HL.textWidth(label) + 12, h = opts.h || 15;
  const dis = opts.disabled;
  g.fillStyle = opts.fill || P_.ui2; g.fillRect(x, y, w, h);
  UI.dotRect(g, x, y, w, h, dis ? P_.ui2 : P_.cream3, false);
  HL.text(g, label, x + w / 2, y + Math.floor((h - 7) / 2), dis ? P_.cream3 : P_.cream, 0.5);
  if (!dis && fn) UI.regions.push({ x: x - 3, y: y - 3, w: w + 6, h: h + 6, fn });
  return w;
};
UI.region = (x, y, w, h, fn) => UI.regions.push({ x, y, w, h, fn });
UI.tap = (x, y) => {
  for (let i = UI.regions.length - 1; i >= 0; i--) { const r = UI.regions[i]; if (x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h) { HL.Audio.play('ui'); r.fn(x, y); return true; } }
  return false;
};
UI.pushFeed = (id, n, text) => { UI.feed.push({ id, n, text, t: 0 }); if (UI.feed.length > 5) UI.feed.shift(); };
UI.showBanner = (s, sub) => { UI.banner = { s, sub, t: 0 }; };
UI.toast = (s, d = 3) => { UI.toastMsg = s; UI.toastT = d; };

// ------------------------------------------------------------------ on-screen controls
UI.layoutControls = (W, H, safe) => {
  const r = W - 10 - safe.r, b = H - 8 - safe.b;
  HL.Input.layout = [
    { id: 'attack', x: r - 22, y: b - 22, r: 19 },
    { id: 'dodge', x: r - 60, y: b - 13, r: 13 },
    { id: 'interact', x: r - 22, y: b - 64, r: 13 },
    { id: 'item', x: r - 58, y: b - 46, r: 11 },
    { id: 'ult', x: r - 62, y: b - 78, r: 11 },
    { id: 'swap', x: r - 94, y: b - 30, r: 10 },
    { id: 'skill', x: r - 96, y: b - 64, r: 11 },
    { id: 'menu', x: r - 8, y: 12 + safe.t, r: 10 },
    { id: 'map', x: r - 32, y: 12 + safe.t, r: 10 },
  ];
};
UI.drawControls = (g, G) => {
  const P = P_, I = HL.Input, near = G.prompt;
  for (const c of I.layout) {
    const held = I.st.btn[c.id] && I.st.btn[c.id].held;
    if (c.id === 'ult' && G.eq.relic !== 'bell_shard') continue;
    if (c.id === 'interact' && !near) continue;
    const owned = Object.keys(HL.WEAPONS).filter((w) => G.inv[w]);
    if (c.id === 'swap' && owned.length < 2) continue;
    if (c.id === 'skill' && !G.flags['sigil:burst']) continue;
    const full = c.id === 'ult' && G.player.ult >= 100;
    HL.discDither(g, c.x, c.y, c.r, held ? P.cream3 : P.ink, held ? 0.6 : 0.45);
    HL.ringPx(g, c.x, c.y, c.r, full ? P.lt0 : held ? P.cream : P.cream3, 1);
    const ic = (s) => HL.text(g, s, c.x, c.y - 3, P.cream, 0.5);
    if (c.id === 'attack') {
      const w = G.player.weaponDef();
      const ab = I.st.btn.attack;
      if (ab && ab.held && ab.ax != null) { HL.ringPx(g, c.x + ab.ax * 9, c.y + ab.ay * 9, 6, P.lt0, 2); }
      if (G.eq.weapon && HL.ART.icons[G.eq.weapon]) g.drawImage(HL.ART.icons[G.eq.weapon], c.x - 6, c.y - 6); else { g.fillStyle = P.cream; g.fillRect(c.x - 3, c.y - 3, 6, 5); g.fillRect(c.x - 3, c.y + 2, 4, 2); g.fillStyle = P.ink; g.fillRect(c.x - 1, c.y - 3, 1, 3); g.fillRect(c.x + 1, c.y - 3, 1, 3); } void w;
      if (G.player.chargeT > 0) HL.ringPx(g, c.x, c.y, c.r - 3, G.player.chargeT >= 0.6 ? P.lt0 : P.cream, 2, -Math.PI / 2, -Math.PI / 2 + HL.TAU * HL.clamp(G.player.chargeT / 0.6, 0, 1));
    } else if (c.id === 'dodge') { g.fillStyle = P.cream; for (let i = 0; i < 2; i++) { const x = c.x - 4 + i * 4; g.fillRect(x, c.y - 3, 1, 1); g.fillRect(x + 1, c.y - 2, 1, 1); g.fillRect(x + 2, c.y - 1, 1, 2); g.fillRect(x + 1, c.y + 1, 1, 1); g.fillRect(x, c.y + 2, 1, 1); } HL.text(g, 'dash', c.x, c.y + c.r + 2, P.cream3, 0.5, 1, P.ink); }
    else if (c.id === 'interact') { ic('!'); const lw = HL.textWidth(near.label); g.fillStyle = P.ink; g.fillRect(c.x - lw - 20, c.y - 5, lw + 6, 11); HL.text(g, near.label, c.x - 17, c.y - 3, P.cream, 1); }
    else if (c.id === 'item') {
      const q = G.quick; if (q && G.inv[q]) { g.drawImage(HL.ART.icons[q], c.x - 6, c.y - 7); HL.text(g, String(G.inv[q]), c.x + 6, c.y + 2, P.cream, 0.5, 1, P.ink); } else ic('·');
    } else if (c.id === 'skill') {
      const cd = G.player.skillCd || 0, f = 1 - cd / 7;
      g.fillStyle = cd > 0 ? '#3e8a86' : '#7fe8e0'; for (let j = -4; j <= 4; j++) { const w = 4 - Math.abs(j); g.fillRect(c.x - w, c.y + j, w * 2 + 1, 1); }
      if (cd > 0) HL.ringPx(g, c.x, c.y, c.r - 2, '#7fe8e0', 1, -Math.PI / 2, -Math.PI / 2 + HL.TAU * f);
      else HL.ringPx(g, c.x, c.y, c.r + 1 + Math.sin(G.time * 6), '#7fe8e0', 1);
      HL.text(g, 'light', c.x, c.y + c.r + 2, '#7fe8e0', 0.5, 1, P.ink);
    } else if (c.id === 'swap') {
      const nx = owned[(owned.indexOf(G.eq.weapon) + 1) % owned.length]; if (HL.ART.icons[nx]) g.drawImage(HL.ART.icons[nx], c.x - 6, c.y - 6);
      HL.text(g, 'swap', c.x, c.y + c.r + 2, P.cream3, 0.5, 1, P.ink);
    } else if (c.id === 'ult') {
      const f = G.player.ult / 100; g.fillStyle = full ? P.lt0 : P.cream3;
      for (let j = -5; j <= 5; j++) { const w = 5 - Math.abs(j); if ((j + 5) / 10 >= 1 - f) g.fillRect(c.x - w, c.y + j, w * 2 + 1, 1); }
      if (!full) HL.ringPx(g, c.x, c.y, 5, P.cream3);
    } else if (c.id === 'menu') { g.fillStyle = P.cream; g.fillRect(c.x - 4, c.y - 2, 8, 6); g.fillRect(c.x - 2, c.y - 4, 4, 1); g.fillStyle = P.ink; g.fillRect(c.x - 3, c.y, 6, 1); }
    else if (c.id === 'map') { g.fillStyle = P.cream; g.fillRect(c.x - 5, c.y - 3, 10, 7); g.fillStyle = P.tan1; g.fillRect(c.x - 4, c.y - 2, 8, 5); g.fillStyle = P.red0; g.fillRect(c.x + 1, c.y - 1, 1, 1); }
  }
  // floating joystick
  const j = I.st.joy;
  if (j) {
    HL.ringPx(g, j.ox, j.oy, 20, P.cream3, 1);
    HL.discDither(g, j.ox + j.dx * 16, j.oy + j.dy * 16, 6, P.cream2, 0.6);
  } else if (G.time < 40 && G.state === 'play') { HL.ringPx(g, 42 + G.safe.l, G.H - 40 - G.safe.b, 20, P.cream3, 1); HL.text(g, 'move', 42 + G.safe.l, G.H - 43 - G.safe.b, P.cream3, 0.5); }
};

// ------------------------------------------------------------------ HUD
UI.drawHUD = (g, G, dt) => {
  const P = P_, p = G.player, m = 8 + G.safe.l, t = 8 + G.safe.t;
  G.hpTrail = HL.approach(G.hpTrail == null ? p.hp : G.hpTrail, p.hp, dt * 25);
  UI.bar(g, m, t, 76, 4, p.hp / p.maxhp, P.cream, P.ui2, G.hpTrail / p.maxhp);
  UI.bar(g, m, t + 7, 58, 2, p.st / p.maxst, p.stDelay > 0.6 ? P.cream3 : P.ash2, P.ui2);
  if (p.regen > 0) HL.text(g, '+', m + 80, t - 2, P.cream2);
  // the objective, always on screen
  const ob = G.objective();
  if (ob) {
    UI.objFlash = Math.max(0, (UI.objFlash || 0) - dt);
    const lines = HL.wrap(ob.text, Math.min(200, G.W * 0.45));
    let y = t + 19;
    if (UI.objFlash > 0) { HL.text(g, 'New objective', m, y, Math.floor(G.time * 6) % 2 ? P.lt0 : P.tan0, 0, 1, P.ink); y += 10; }
    g.fillStyle = 'rgba(20,16,16,0.45)'; g.fillRect(m - 3, y - 2, Math.min(206, G.W * 0.45 + 6), lines.length * 10 + 3);
    g.fillStyle = ob.optional ? P.cream3 : P.tan0; g.fillRect(m - 3, y - 2, 1, lines.length * 10 + 3);
    lines.forEach((l, i) => HL.text(g, l, m + 1, y + i * 10, P.cream, 0, 1, P.ink));
    const shr = Object.keys(HL.SHRINES).filter((k) => G.flags['shrine:' + k]).length, sha = G.inv.lumen_shard || 0;
    if (shr || sha) HL.text(g, 'shrines ' + shr + '/' + Object.keys(HL.SHRINES).length + '  shards ' + sha + '/' + HL.SHARD_COUNT, m, y + lines.length * 10 + 4, '#7fe8e0', 0, 1, P.ink);
  }
  // feed
  UI.feed.forEach((f, i) => {
    f.t += dt; const y = G.H * 0.42 + i * 11, a = f.t > 3 ? 1 - (f.t - 3) : 1;
    if (a <= 0) return;
    g.globalAlpha = HL.clamp(a, 0, 1);
    if (f.id && HL.ART.icons[f.id]) g.drawImage(HL.ART.icons[f.id], m, y - 2);
    HL.text(g, f.text || (HL.itemName(f.id) + (f.n > 1 ? ' x' + f.n : '')), m + 14, y, P.cream, 0, 1, P.ink);
    g.globalAlpha = 1;
  });
  UI.feed = UI.feed.filter((f) => f.t < 4);
  // area banner, like the reference's "Key / ---"
  if (UI.banner) {
    const b = UI.banner; b.t += dt; const a = b.t < 0.5 ? b.t * 2 : b.t > 3 ? 1 - (b.t - 3) : 1;
    if (a <= 0) UI.banner = null; else {
      g.globalAlpha = HL.clamp(a, 0, 1);
      HL.text(g, b.s, G.W / 2, 50 + G.safe.t, P.cream, 0.5, 1, P.ink);
      HL.text(g, '---', G.W / 2, 59 + G.safe.t, P.cream3, 0.5);
      if (b.sub) HL.text(g, b.sub, G.W / 2, 68 + G.safe.t, P.cream2, 0.5, 1, P.ink);
      g.globalAlpha = 1;
    }
  }
  HL.Epic.drawHUD(g, G, dt);
  if (UI.toastT > 0) { UI.toastT -= dt; const lines = HL.wrap(UI.toastMsg, 220); lines.forEach((l, i) => HL.text(g, l, G.W / 2, G.H - 52 - G.safe.b - (lines.length - 1 - i) * 10, P.cream, 0.5, 1, P.ink)); }
  // ultimate cut-in: a slash of light across the screen with its name
  if (G.ultBanner && G.ultBanner.t < 1.1) {
    const b = G.ultBanner, k = HL.clamp(b.t / 0.12, 0, 1), out = HL.clamp((b.t - 0.7) / 0.25, 0, 1), y = Math.round(G.H * 0.17);
    g.globalAlpha = 1 - out;
    g.fillStyle = 'rgba(12,9,9,0.7)'; g.fillRect(0, y - 4, G.W * k, 26);
    g.fillStyle = P.lt0; g.fillRect(0, y - 5, G.W * k, 1); g.fillRect(G.W * (1 - k), y + 22, G.W * k, 1);
    HL.text(g, b.name.toUpperCase(), G.W / 2 + (1 - k) * 80, y, P.lt0, 0.5, 2, P.ink);
    g.globalAlpha = 1;
  }
  // boss bar / gate bar
  const boss = G.enemies.find((e) => !e.dead && ((e.type === 'keeper' && e.state !== 'dormant') || (e.bossName && e.state !== 'idle' && e.state !== 'return')));
  if (boss) {
    const w = Math.min(220, G.W - 160), x = (G.W - w) / 2, y = G.H - 18 - G.safe.b;
    HL.text(g, boss.bossName || HL.FOES.keeper.name, G.W / 2, y - 10, boss.bossName ? '#ffc95a' : P.cream, 0.5, 1, P.ink);
    UI.bar(g, x, y, w, 3, boss.hp / boss.maxhp, boss.stunned > 0 ? P.lt0 : P.cream);
  }
  if (G.waves && G.waves.active) {
    const w = 140, x = (G.W - w) / 2, y = G.H - 18 - G.safe.b;
    HL.text(g, 'The gate rises', G.W / 2, y - 10, P.cream, 0.5, 1, P.ink);
    UI.bar(g, x, y, w, 3, G.waves.progress, P.cream);
  }
  if (!G.use3d && (G.hurtVig > 0 || p.hp < 30)) {
    const a = Math.max(G.hurtVig || 0, p.hp < 30 ? 0.25 + Math.sin(G.time * 5) * 0.1 : 0);
    g.fillStyle = P.red2;
    for (let y = 0; y < G.H; y += 2) for (let x = 0; x < G.W; x += 2) { const ex = Math.max(Math.abs(x / G.W - 0.5), Math.abs(y / G.H - 0.5)) * 2; if (ex > 1 - a * 0.35 && HL.bayer(x >> 1, y >> 1) < (ex - (1 - a * 0.35)) * 3) g.fillRect(x, y, 2, 2); }
  }
};

// ------------------------------------------------------------------ guide: a marker over the next goal, or an arrow at the edge
UI.drawGuide = (g, G) => {
  if (!G.settings.guide) return;
  const ob = G.objective(); if (!ob || !ob.tgt) return;
  const o = ob.tgt, h = o.type === 'keeper' ? 48 : o.t === 'exit' && o.id === 'x_tower' ? 26 : 18;
  const s = G.use3d ? HL.R3.project(o.x, h, o.y) : { x: o.x - G.cam.x, y: o.y - h * 0.8 - G.cam.y };
  const P = P_, M = 16, bob = Math.round(Math.sin(G.time * 4) * 1.5);
  if (s.x > M && s.x < G.W - M && s.y > M + 20 && s.y < G.H - M && !s.behind) {
    const x = Math.round(s.x), y = Math.round(s.y) - 8 + bob;
    g.fillStyle = P.ink; for (let j = -6; j <= 6; j++) { const w = 6 - Math.abs(j); g.fillRect(x - w, y + j, w * 2 + 1, 1); }
    g.fillStyle = P.tan0; for (let j = -5; j <= 5; j++) { const w = 5 - Math.abs(j); g.fillRect(x - w, y + j, w * 2 + 1, 1); }
    g.fillStyle = P.lt0; g.fillRect(x - 1, y - 3, 2, 4); g.fillRect(x - 1, y + 2, 2, 1);
    g.fillStyle = P.tan0; g.fillRect(x, y + 7, 1, 3);
    return;
  }
  // off screen: arrow on the edge pointing toward it
  const cx = G.W / 2, cy = G.H / 2, a = Math.atan2(s.y - cy, s.x - cx);
  const kx = (G.W / 2 - M - 6) / Math.max(0.001, Math.abs(Math.cos(a))), ky = (G.H / 2 - M - 6) / Math.max(0.001, Math.abs(Math.sin(a))), r = Math.min(kx, ky);
  const x = cx + Math.cos(a) * (r + bob), y = cy + Math.sin(a) * (r + bob);
  for (let i = 0; i < 9; i++) for (let j = -i; j <= i; j++) {
    const px = x + Math.cos(a) * (4 - i * 0.9) - Math.sin(a) * j * 0.6, py = y + Math.sin(a) * (4 - i * 0.9) + Math.cos(a) * j * 0.6;
    g.fillStyle = Math.abs(j) === i || i === 8 ? P.ink : P.tan0; g.fillRect(Math.round(px), Math.round(py), 1, 1);
  }
};
// ------------------------------------------------------------------ cutscene card: letterbox, the line, skip
UI.drawCut = (g, G) => {
  const P = P_, c = G.cut; if (!c) return;
  const s = c.def.shots[c.i], talk = c.def.talk;
  const bar = Math.round(G.H * (talk ? 0.09 : 0.12) * (c.i === 0 ? HL.clamp(c.t / 0.45, 0, 1) : 1));
  g.fillStyle = '#060404'; g.fillRect(0, 0, G.W, bar); g.fillRect(0, G.H - bar, G.W, bar);
  if (s.title && c.t >= (s.titleAt || 0)) { // the title slams in
    const k = HL.clamp((c.t - (s.titleAt || 0)) / 0.22, 0, 1), base = G.W > 380 ? (s.title.length > 16 ? 3 : 4) : 3, sc = base + Math.round((1 - k) * 4);
    const jx = k < 1 ? 0 : Math.round((Math.random() - 0.5) * Math.max(0, 1 - (c.t - (s.titleAt || 0) - 0.22) * 4) * 4);
    g.globalAlpha = k;
    HL.text(g, s.title, G.W / 2 + jx, G.H * 0.4 - (HL.FONT_H * sc) / 2, P.cream, 0.5, sc, P.ink);
    g.globalAlpha = HL.clamp((c.t - (s.titleAt || 0) - 0.4) / 0.5, 0, 1);
    if (s.sub) { const sw = Math.min(G.W - 40, HL.textWidth(s.sub) + 20); g.fillStyle = '#7fe8e0'; g.fillRect(G.W / 2 - sw / 2, G.H * 0.4 + base * 5 + 3, sw, 1); HL.wrap(s.sub, G.W - 60).forEach((l, i) => HL.text(g, l, G.W / 2, G.H * 0.4 + base * 5 + 8 + i * 10, P.cream2, 0.5, 1, P.ink)); }
    g.globalAlpha = 1;
  }
  if (s.text) { // floating subtitle: no box, revealed letter by letter, a name above when someone speaks
    const fade = HL.clamp(c.t / 0.35, 0, 1) * (s.dur < 90 ? HL.clamp((s.dur - c.t) / 0.3, 0, 1) : 1);
    const full = s.text, n = Math.ceil(full.length * HL.clamp((c.reveal || 0) * (talk ? 1.4 : 1.8), 0, 1));
    const lines = HL.wrap(full, Math.min(330, G.W - 70));
    let left = n; const shown = lines.map((l) => { const t = l.slice(0, Math.max(0, left)); left -= l.length + 1; return t; });
    const y0 = G.H - bar - 8 - lines.length * 11;
    g.globalAlpha = fade;
    if (s.speaker) { const nw = HL.textWidth(s.speaker); HL.text(g, s.speaker, G.W / 2, y0 - 14, '#7fe8e0', 0.5, 1, P.ink); g.fillStyle = 'rgba(127,232,224,0.6)'; g.fillRect(G.W / 2 - nw / 2 - 6, y0 - 4, nw + 12, 1); }
    shown.forEach((l, i) => { const x = G.W / 2 - HL.textWidth(lines[i]) / 2; HL.text(g, l, x + 1, y0 + i * 11 + 1, '#000000'); HL.text(g, l, x, y0 + i * 11, P.cream); });
    g.globalAlpha = 1;
  }
  if (talk) { if ((c.reveal || 0) >= 1 && Math.floor(G.time * 2) % 2) HL.text(g, '>', G.W / 2, G.H - bar / 2 - 3, '#7fe8e0', 0.5); }
  else for (let i = 0; i < c.def.shots.length; i++) { g.fillStyle = i === c.i ? P.cream : P.cream3; g.fillRect(G.W / 2 - c.def.shots.length * 4 + i * 8, G.H - bar / 2, 4, 1); }
  UI.button(g, talk ? 'Skip' : 'Skip >', G.W - 56 - G.safe.r, Math.max(2, Math.round(bar / 2) - 7), () => G.nextShot(true), { w: 46, h: 14 });
  UI.region(0, 0, G.W, G.H, () => { if (s.wait && (c.reveal || 0) < 1) c.reveal = 1; else G.nextShot(); });
  UI.regions.push(UI.regions.splice(UI.regions.length - 2, 1)[0]);
};
// ------------------------------------------------------------------ the item screen (from the reference: dotted grid, speckled cells)
UI.menu = { tab: 'items', sel: null, jsel: 0 };
UI.drawMenu = (g, G) => {
  const P = P_, W = G.W, H = G.H, M = UI.menu, L = G.safe.l, R = G.safe.r;
  g.fillStyle = P.ui; g.fillRect(0, 0, W, H);
  const tabs = [['items', 'Items'], ['map', 'Map'], ['journal', 'Journal'], ['system', 'System']];
  let tx = L + 14;
  for (const [id, name] of tabs) {
    const w = HL.textWidth(name);
    HL.text(g, name, tx, 8, M.tab === id ? P.cream : P.cream3);
    if (M.tab === id) { g.fillStyle = P.cream3; for (let i = 0; i < w; i += 2) g.fillRect(tx + i, 18, 1, 1); }
    UI.region(tx - 4, 2, w + 8, 20, () => { M.tab = id; });
    tx += w + 18;
  }
  HL.text(g, 'x', W - R - 14, 8, P.cream); UI.region(W - R - 26, 0, 26, 24, () => G.closeMenu());
  if (M.tab === 'items') UI.drawItems(g, G);
  else if (M.tab === 'map') UI.drawMap(g, G);
  else if (M.tab === 'journal') UI.drawJournal(g, G);
  else UI.drawSystem(g, G);
};
UI.drawItems = (g, G) => {
  const P = P_, W = G.W, L = G.safe.l, M = UI.menu;
  // equipment slots (top row, like the reference's three framed slots)
  const slots = [['weapon', 'Weapon'], ['armor', 'Armour'], ['relic', 'Relic'], ['quick', 'Quick']];
  const sx0 = L + 16;
  slots.forEach(([k, name], i) => {
    const x = sx0 + i * 42, y = 34, id = k === 'quick' ? G.quick : G.eq[k];
    UI.dotRect(g, x, y, 20, 20, M.sel === id && id ? P.cream : P.cream3);
    if (id && HL.ART.icons[id]) g.drawImage(HL.ART.icons[id], x + 4, y + 4);
    HL.text(g, name, x + 10, y + 23, P.cream3, 0.5);
    UI.region(x - 2, y - 2, 24, 34, () => { if (id) M.sel = id; });
  });
  // the grid
  const ids = HL.Inv.sorted(G.inv), cols = 7, rows = 4, cs = 16, gx = L + 16, gy = 70;
  UI.dotRect(g, gx - 2, gy - 2, cols * cs + 4, rows * cs + 4, P.cream3);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = r * cols + c, x = gx + c * cs, y = gy + r * cs, id = ids[i];
    g.fillStyle = P.ui2; g.fillRect(x, y, cs - 1, cs - 1);
    if (!id) continue;
    UI.speckle(g, x, y, cs - 1, cs - 1, i + 3);
    if (M.sel === id) { g.fillStyle = P.cream; g.fillRect(x, y, cs - 1, 1); g.fillRect(x, y + cs - 2, cs - 1, 1); g.fillRect(x, y, 1, cs - 1); g.fillRect(x + cs - 2, y, 1, cs - 1); }
    g.fillStyle = 'rgba(30,24,24,0.55)'; g.fillRect(x + 1, y + 1, 13, 13);
    g.drawImage(HL.ART.icons[id] || HL.ART.icons.note, x + 2, y + 2);
    if (G.inv[id] > 1) HL.text(g, String(G.inv[id]), x + cs - 2, y + 7, P.cream, 1, 1, P.ink);
    if (Object.values(G.eq).includes(id)) { g.fillStyle = P.cream; g.fillRect(x + 1, y + 1, 2, 2); }
    UI.region(x, y, cs, cs, () => { if (M.sel === id) UI.itemAction(G, id); else M.sel = id; });
  }
  const p = G.player, wid = G.eq.weapon;
  HL.text(g, 'Harm taken -' + Math.round(p.def() * 100) + '%', gx, gy + rows * cs + 8, P.cream3);
  if (wid) HL.text(g, HL.itemName(wid) + ' +' + (G.wlv[wid] || 0), gx, gy + rows * cs + 18, P.cream3);
  // description panel
  const dx = gx + cols * cs + 22, dw = W - dx - G.safe.r - 14;
  const id = M.sel && (G.inv[M.sel] || M.sel === G.quick) ? M.sel : null;
  if (id) {
    const it = HL.ITEMS[id];
    HL.text(g, it.name, dx + dw / 2, 36, P.cream, 0.5);
    HL.text(g, '---', dx + dw / 2, 45, P.cream3, 0.5);
    if (it.rarity) HL.text(g, HL.RARITY[it.rarity], dx + dw / 2, 54, it.rarity === 'named' ? P.lt1 : it.rarity === 'relic' ? P.tan0 : P.cream3, 0.5);
    let y = 66;
    for (const l of HL.wrap(it.desc, dw)) { HL.text(g, l, dx + dw / 2, y, P.cream2, 0.5); y += 10; }
    const w = HL.WEAPONS[id];
    if (w) { HL.text(g, 'Damage ' + Math.round(w.dmg * (1 + (G.wlv[id] || 0) * HL.UPGRADE.perLevel)) + '  Reach ' + w.reach, dx + dw / 2, y + 2, P.cream3, 0.5); y += 10; HL.text(g, 'Ultimate: ' + HL.ULTS[w.ult].name, dx + dw / 2, y + 2, P.cream3, 0.5); y += 10; }
    const act = UI.actionName(G, id);
    if (act) { const lw = HL.textWidth('(' + act + ')'); HL.text(g, '(' + act + ')', dx + dw / 2, y + 8, P.cream, 0.5); UI.region(dx + dw / 2 - lw / 2 - 8, y + 2, lw + 16, 18, () => UI.itemAction(G, id)); }
  } else HL.text(g, 'Tap an item.', dx + dw / 2, 70, P.cream3, 0.5);
};
UI.actionName = (G, id) => {
  const it = HL.ITEMS[id];
  if (it.kind === 'weapon' || it.kind === 'armor' || it.kind === 'relic') return G.eq[it.kind] === id ? (it.kind === 'weapon' ? null : 'Remove') : 'Equip';
  if (it.kind === 'consumable') return G.quick === id ? 'Use' : 'Set quick';
  if (it.kind === 'doc') return 'Read';
  if (it.kind === 'key') return null;
  return null;
};
UI.itemAction = (G, id) => {
  const it = HL.ITEMS[id];
  if (it.kind === 'weapon' || it.kind === 'armor' || it.kind === 'relic') {
    if (G.eq[it.kind] === id && it.kind !== 'weapon') G.eq[it.kind] = it.kind === 'armor' ? 'tattered_cloak' : null;
    else G.eq[it.kind] = id;
    if (G.eq.armor && !G.inv[G.eq.armor]) G.eq.armor = null;
    HL.Audio.play('item');
  } else if (it.kind === 'consumable') { if (G.quick === id) { G.closeMenu(); G.useQuick(); } else G.quick = id; }
  else if (it.kind === 'doc') G.showNote('next_region');
};
UI.drawMap = (g, G) => {
  const P = P_, w = G.world, W = G.W - G.safe.l - G.safe.r - 110, H = G.H - 40;
  if (!w.mapImg) {
    const s = Math.min(W / w.pw, H / w.ph), mw = Math.round(w.pw * s), mh = Math.round(w.ph * s);
    const c = HL.canvas(mw, mh); c.g.imageSmoothingEnabled = true; c.g.drawImage(w.ground, 0, 0, mw, mh);
    // ink the map: sepia-ish tone over the ground
    c.g.globalCompositeOperation = 'multiply'; c.g.fillStyle = '#c9b89a'; c.g.fillRect(0, 0, mw, mh); c.g.globalCompositeOperation = 'source-over';
    for (const b of w.buildings) { c.g.fillStyle = P.ch0; c.g.fillRect(b.x0 * s, b.y0 * s, (b.x1 - b.x0) * s, (b.y1 - b.y0) * s); }
    w.mapImg = { c, s };
  }
  const { c, s } = w.mapImg, ox = Math.round(G.safe.l + 12 + (W - c.width) / 2), oy = 28;
  g.drawImage(c, ox, oy);
  // fog of the unexplored
  const fw = Math.ceil(w.W / 2);
  g.fillStyle = P.ui;
  for (let j = 0; j < Math.ceil(w.H / 2); j++) for (let i = 0; i < fw; i++) if (!w.fog[j * fw + i]) g.fillRect(Math.floor(ox + i * 16 * s), Math.floor(oy + j * 16 * s), Math.ceil(16 * s) + 1, Math.ceil(16 * s) + 1);
  UI.dotRect(g, ox - 3, oy - 3, c.width + 6, c.height + 6, P.cream3);
  for (const o of w.objects) if (o.t === 'fire' && w.fog[Math.floor(o.y / 16) * fw + Math.floor(o.x / 16)]) { g.fillStyle = G.flags['lit:' + o.id] ? P.fire : P.cream3; g.fillRect(Math.round(ox + o.x * s) - 1, Math.round(oy + o.y * s) - 1, 3, 3); }
  if (Math.floor(G.time * 3) % 2) { g.fillStyle = P.red0; g.fillRect(Math.round(ox + G.player.x * s) - 1, Math.round(oy + G.player.y * s) - 1, 3, 3); }
  const labels = w.id === 'ashwick' ? [['Ashwick', 40, 47], ['Crowshade Trail', 96, 40], ['The Tower', 166, 38], ['Ring of Stones', 120, 22]] : [];
  for (const [n, tx, ty] of labels) if (w.fog[Math.floor(ty / 2) * fw + Math.floor(tx / 2)] || w.fog[Math.floor((ty + 4) / 2) * fw + Math.floor(tx / 2)]) HL.text(g, n, ox + tx * 8 * s, oy + ty * 8 * s, P.ink, 0.5);
  HL.text(g, w.name, G.W / 2, G.H - 10, P.cream3, 0.5);
  for (const o of w.objects) {
    const sight = G.flags['sigil:sight'], X = Math.round(ox + o.x * s), Y = Math.round(oy + o.y * s);
    if (o.t === 'shrine' && (G.flags['shrine:' + o.id] || sight || w.fog[Math.floor(o.y / 16) * fw + Math.floor(o.x / 16)])) { g.fillStyle = G.flags['shrine:' + o.id] ? '#7fe8e0' : '#3e8a86'; g.fillRect(X - 1, Y - 2, 3, 5); g.fillRect(X - 2, Y, 5, 1); }
    if (o.t === 'pickup' && o.shard && !o.taken && sight) { g.fillStyle = Math.floor(G.time * 4) % 2 ? '#d8fffa' : '#7fe8e0'; g.fillRect(X, Y, 2, 2); }
  }
  // travel between awakened shrines
  const aw = Object.keys(HL.SHRINES).filter((k) => G.flags['shrine:' + k]);
  if (aw.length) {
    HL.text(g, 'Travel', G.W - G.safe.r - 70, 30, '#7fe8e0');
    aw.forEach((k, i) => UI.button(g, HL.SHRINES[k].name.replace('Shrine of ', '').replace('The ', ''), G.W - G.safe.r - 74, 42 + i * 19, () => G.travelTo(k), { w: 66, h: 15 }));
  }
};
UI.drawJournal = (g, G) => {
  const P = P_, M = UI.menu, L = G.safe.l + 16, list = G.journal;
  if (!list.length) { HL.text(g, 'Nothing written down yet.', G.W / 2, 60, P.cream3, 0.5); return; }
  M.jsel = HL.clamp(M.jsel, 0, list.length - 1);
  list.forEach((id, i) => {
    const y = 32 + i * 11; if (y > G.H - 12) return;
    HL.text(g, HL.NOTES[id].title, L, y, i === M.jsel ? P.cream : P.cream3);
    UI.region(L - 4, y - 2, 120, 11, () => { M.jsel = i; });
  });
  const n = HL.NOTES[list[M.jsel]], x = L + 130, w = G.W - x - G.safe.r - 14;
  UI.dotRect(g, x - 6, 28, w + 12, G.H - 40, P.cream3);
  HL.text(g, n.title, x + w / 2, 34, P.cream, 0.5); HL.text(g, '---', x + w / 2, 43, P.cream3, 0.5);
  HL.wrap(n.text, w).forEach((l, i) => HL.text(g, l, x, 54 + i * 10, P.cream2));
};
UI.drawSystem = (g, G) => {
  const P = P_, x = G.W / 2 - 60;
  UI.button(g, 'Save now', x, 40, () => { G.save(true); }, { w: 120 });
  UI.button(g, 'Sound: ' + (HL.Audio.muted ? 'off' : 'on'), x, 62, () => { HL.Audio.setMuted(!HL.Audio.muted); G.settings.mute = HL.Audio.muted; }, { w: 120 });
  UI.button(g, 'Screen shake: ' + (G.settings.shake ? 'on' : 'off'), x, 84, () => { G.settings.shake = !G.settings.shake; }, { w: 120 });
  UI.button(g, 'Guide arrow: ' + (G.settings.guide ? 'on' : 'off'), x, 106, () => { G.settings.guide = !G.settings.guide; }, { w: 120 });
  UI.button(g, 'Watch the opening', x, 128, () => { G.closeMenu(); G.playCut('intro'); }, { w: 120 });
  UI.button(g, 'Return to title', x, 150, () => { G.save(); G.toTitle(); }, { w: 120 });
  HL.text(g, 'Playtime ' + Math.floor((G.playtime || 0) / 60) + ' min   ·   Keys: WASD  J attack (hold J + move: aim)  Space dash  E use  Q item  R ult', G.W / 2, 172, P.cream3, 0.5);
};

// ------------------------------------------------------------------ dialogue, notes, fire, anvil, death, title
UI.drawPanel = (g, G, x, y, w, h) => { g.fillStyle = P_.ui; g.fillRect(x, y, w, h); UI.dotRect(g, x, y, w, h, P_.cream3); };
UI.drawDialog = (g, G) => {
  const P = P_, d = G.dialog;
  if (d.kind === 'note') {
    const n = HL.NOTES[d.id], w = Math.min(320, G.W - 60), lines = HL.wrap(n.text, w);
    g.fillStyle = 'rgba(6,4,4,0.82)'; g.fillRect(0, 0, G.W, G.H);
    const h = 40 + lines.length * 10, y = Math.max(14, (G.H - h) / 2);
    HL.text(g, n.title.toUpperCase(), G.W / 2, y, P.cream, 0.5, 2, P.ink);
    const tw = Math.min(G.W - 40, HL.textWidth(n.title.toUpperCase(), 2) + 30);
    g.fillStyle = '#7fe8e0'; g.fillRect(G.W / 2 - tw / 2, y + 21, tw, 1);
    lines.forEach((l, i) => HL.text(g, l, G.W / 2, y + 30 + i * 10, P.cream2, 0.5, 1, P.ink));
    HL.text(g, 'tap to close', G.W / 2, G.H - 14, P.cream3, 0.5);
  } else { G.dialog = null; G.state = 'play'; }
  UI.region(0, 0, G.W, G.H, () => G.advanceDialog());
};
UI.drawFire = (g, G) => {
  const P = P_, w = Math.min(320, G.W - 30), h = Math.min(170, G.H - 16), x = (G.W - w) / 2, y = (G.H - h) / 2;
  UI.drawPanel(g, G, x, y, w, h);
  HL.text(g, 'Fire', G.W / 2, y + 7, P.cream, 0.5); HL.text(g, '---', G.W / 2, y + 16, P.cream3, 0.5);
  UI.button(g, 'Rest', x + 12, y + 28, () => G.rest(), { w: 80 });
  HL.text(g, 'Heal, save. The', x + 12, y + 48, P.cream3); HL.text(g, 'hollow return.', x + 12, y + 57, P.cream3);
  UI.button(g, 'Leave', x + 12, y + h - 24, () => { G.state = 'play'; }, { w: 80 });
  // crafting
  const cx = x + 108;
  HL.text(g, 'Craft', cx, y + 28, P.cream2);
  HL.RECIPES.forEach((r, i) => {
    const yy = y + 42 + i * 30, ok = HL.Inv.canPay(G.inv, r.need) && (G.inv[r.out] || 0) < (HL.ITEMS[r.out].stack || 1);
    UI.dotRect(g, cx, yy, 16, 16, ok ? P.cream : P.ui2); g.drawImage(HL.ART.icons[r.out], cx + 2, yy + 2);
    HL.text(g, HL.itemName(r.out) + ' (' + (G.inv[r.out] || 0) + ')', cx + 22, yy, ok ? P.cream : P.cream3);
    const need = Object.entries(r.need).map(([id, n]) => (G.inv[id] || 0) + '/' + n + ' ' + HL.itemName(id)).join(', ');
    HL.text(g, need, cx + 22, yy + 9, P.cream3);
    if (ok) UI.region(cx - 2, yy - 2, w - (cx - x) - 6, 26, () => { HL.Inv.craft(G.inv, r); HL.Audio.play('pickup'); UI.pushFeed(r.out, r.n); });
  });
};
UI.drawAnvil = (g, G) => {
  const P = P_, w = Math.min(320, G.W - 30), h = 150, x = (G.W - w) / 2, y = (G.H - h) / 2;
  UI.drawPanel(g, G, x, y, w, h);
  HL.text(g, 'Anvil', G.W / 2, y + 7, P.cream, 0.5); HL.text(g, '---', G.W / 2, y + 16, P.cream3, 0.5);
  const ws = Object.keys(HL.WEAPONS).filter((id) => G.inv[id]);
  ws.forEach((id, i) => {
    const yy = y + 30 + i * 30, lv = G.wlv[id] || 0, cost = HL.UPGRADE.cost[lv], ok = cost && HL.Inv.canPay(G.inv, cost);
    g.drawImage(HL.ART.icons[id], x + 14, yy + 2);
    HL.text(g, HL.itemName(id) + ' +' + lv, x + 32, yy, P.cream);
    HL.text(g, cost ? 'Temper: ' + Object.entries(cost).map(([c, n]) => (G.inv[c] || 0) + '/' + n + ' ' + HL.itemName(c)).join(', ') : 'Fully tempered.', x + 32, yy + 10, P.cream3);
    if (cost) UI.button(g, 'Temper', x + w - 62, yy, () => { if (HL.Inv.pay(G.inv, cost)) { G.wlv[id] = lv + 1; HL.Audio.play('clank'); UI.toast(HL.itemName(id) + ' tempered to +' + (lv + 1) + '.'); } }, { w: 50, disabled: !ok });
  });
  UI.button(g, 'Leave', x + 12, y + h - 22, () => { G.state = 'play'; }, { w: 70 });
};
UI.drawDead = (g, G) => {
  const P = P_;
  g.fillStyle = 'rgba(20,14,14,' + Math.min(0.8, G.deadT * 0.6) + ')'; g.fillRect(0, 0, G.W, G.H);
  if (G.deadT < 1) return;
  HL.text(g, 'YOU FELL', G.W / 2, G.H / 2 - 30, P.red0, 0.5, 2, P.ink);
  HL.text(g, 'Nothing is lost. The fire remembers you.', G.W / 2, G.H / 2 - 4, P.cream2, 0.5);
  UI.button(g, 'Rise at the fire', G.W / 2 - 55, G.H / 2 + 14, () => G.respawn(), { w: 110 });
};
UI.drawTitle = (g, G) => {
  const P = P_, cx = G.W / 2;
  HL.text(g, 'HOLLOWLANDS', cx, G.H * 0.26, P.cream, 0.5, 3, P.ink);
  HL.text(g, '---', cx, G.H * 0.26 + 26, P.cream3, 0.5);
  HL.text(g, 'the bells fell silent', cx, G.H * 0.26 + 35, P.cream2, 0.5, 1, P.ink);
  const has = !!G.saved;
  let y = G.H * 0.58;
  if (has) { UI.button(g, 'Continue', cx - 55, y, () => G.continueGame(), { w: 110 }); y += 22; }
  UI.button(g, has ? 'New journey' : 'Begin', cx - 55, y, () => { if (has && !G.confirmNew) { G.confirmNew = true; UI.toast('Tap again to start over. Your save will be replaced.'); return; } G.newGame(); }, { w: 110 });
  y += 22;
  UI.button(g, 'Sound: ' + (HL.Audio.muted ? 'off' : 'on'), cx - 55, y, () => { HL.Audio.setMuted(!HL.Audio.muted); G.settings.mute = HL.Audio.muted; }, { w: 110 });
  HL.text(g, 'working title · vertical slice 0.1', cx, G.H - 12 - G.safe.b, P.cream3, 0.5, 1, P.ink);
  if (UI.toastT > 0) { UI.toastT -= 1 / 60; HL.text(g, UI.toastMsg, cx, G.H - 26 - G.safe.b, P.cream, 0.5, 1, P.ink); }
};
UI.drawEnd = (g, G) => {
  const P = P_;
  g.fillStyle = 'rgba(20,16,16,0.85)'; g.fillRect(0, 0, G.W, G.H);
  HL.text(g, 'THE BELLS BELOW ARE QUIET', G.W / 2, G.H / 2 - 34, P.cream, 0.5, 1, P.ink);
  HL.text(g, '---', G.W / 2, G.H / 2 - 24, P.cream3, 0.5);
  HL.text(g, 'End of the Ashwick slice. The road east, to Blackfen, waits.', G.W / 2, G.H / 2 - 10, P.cream2, 0.5);
  HL.text(g, 'Your journey is saved. Keep exploring if you like.', G.W / 2, G.H / 2 + 2, P.cream3, 0.5);
  UI.button(g, 'Continue', G.W / 2 - 40, G.H / 2 + 20, () => { G.state = 'play'; }, { w: 80 });
};
