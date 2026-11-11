// THE BLEEDING MOON - the scenes behind the menus (2026-11-11, the author: "the menus are all kinda shit, we can
// do epic animated backgrounds, effects, better scenery"). Each page has its own place, drawn at pixel resolution
// in the same buffer and with the same kit as the title (js/intro.js), from the game's own art: the cast, the iso
// tile packs (braziers, fire, the altar, candles, rune stones) and the light textures.
//   roster  the Gathering: the chosen hero on the bridge under the moon, the others behind, the locked in shadow
//   gear    the Forge: a hearth roaring, sparks flying off the anvil stone, the hero beside it
//   skills  the Vigil: a starfield with its constellations, the hero kneeling in a rune circle
//   souls   the Soul Altar: the freed souls turning round the altar, the one at her side in front
//   modes   the Endless March: the Spire, lightning, the dead marching without end
//   (none)  the Spire at rest, for settings, credits and the rest
// VS.MENU.draw(dt, scene) each frame while a menu page is up; scene = { kind, hero, soul, souls, heroes, locked }.
(function () {
  'use strict';
  const VS = window.VS, A = VS.A, R = VS.R, PX = VS.PX, D = VS.DATA;
  const I = () => VS.INTRO.kit;
  const W = () => PX.W, H = () => PX.H, RED = '#ff2a44';
  const hash = (i, s) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
  const MS = { t: 0, kind: null, sparks: [], k: 0 };

  // An iso tile or animation frame from the packs, by its feet, if loaded (the scenes do without it otherwise).
  // Placed by the bottom centre of the art and its height in buffer pixels (the packs' own anchors vary: a torch's
  // flame is drawn high above its foot, for instance).
  function iso(ctx, key, cx, by, hpx, alpha) {
    const f = A.isoHas && A.isoHas(key) && A.isoInfo(key); if (!f) return;
    const sc = hpx / f[4]; A.iso(ctx, key, Math.round(cx - (f[5] + f[3] / 2) * sc), Math.round(by - (f[6] + f[4]) * sc), sc, null, alpha);
  }
  function isoAnim(ctx, name, T, fps, cx, by, hpx, alpha) { const a = A.isoAnim && A.isoAnim(name); if (a && a.length) iso(ctx, a[Math.floor(T * fps) % a.length], cx, by, hpx, alpha); }
  const actor = (ctx, set, clip, fr, ang, x, y, sc, o) => { if (set && A.hasSet(set)) A.actor(ctx, set, clip, fr, ang, Math.round(x), Math.round(y), sc, o || {}); };
  function glow(ctx, x, y, w, h, col, a) { A.tex(ctx, 'light_01', x, y, w, h, col, a, 0, true); }
  function rise(ctx, T, n, seed, col, x0, x1, y0, y1, sz) {   // motes drifting up
    for (let i = 0; i < n; i++) {
      const ph = (T * (0.05 + hash(i, seed) * 0.08) + hash(i, seed + 1)) % 1, x = x0 + hash(i, seed + 2) * (x1 - x0) + Math.sin(T * 0.8 + i) * 4, y = y1 - ph * (y1 - y0);
      ctx.globalAlpha = Math.sin(ph * Math.PI) * (0.5 + 0.5 * hash(i, seed + 3)); ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), sz || 1, sz || 1);
    }
    ctx.globalAlpha = 1;
  }
  function mist(ctx, T, y, col, a, n) { const w = W(); for (let i = 0; i < (n || 4); i++) A.tex(ctx, i % 2 ? 'smoke_07' : 'smoke_04', ((hash(i, 911) * w * 1.6 + T * (4 + i * 2)) % (w * 1.6)) - w * 0.3, y + i * 3, w * 0.8, 24, col, a, 0, false); }
  function finish(ctx, T, v) { I().vignette(ctx, v == null ? 0.55 : v); I().grain(ctx, 0.05, 160); }
  // A stone ground band with a lit edge.
  function ground(ctx, y, top, bot, edge) {
    const g = ctx.createLinearGradient(0, y, 0, H()); g.addColorStop(0, top); g.addColorStop(1, bot); ctx.fillStyle = g; ctx.fillRect(-4, y, W() + 8, H() - y + 4);
    if (edge) { ctx.fillStyle = edge; ctx.fillRect(-4, y, W() + 8, 1); }
  }

  // ---- the Gathering --------------------------------------------------------------------------------------------
  function roster(ctx, T, sc) {
    const w = W(), h = H(), K = I(), hz = Math.round(h * 0.66), H0 = D.HEROES[sc.hero] || D.HEROES.vesper, col = H0.color || RED;
    K.grad(ctx, ['#05020a', '#1a0612', '#3e0a1c']); K.stars(ctx, 60, 0.6, 51, T);
    const mx = Math.round(w * 0.3), my = Math.round(h * 0.34), mr = Math.round(h * 0.22);
    glow(ctx, mx, my, w * 0.9, h * 0.9, '#6a0c22', 0.5); K.moon(ctx, mx, my, mr, '#ff3a52', 'rgba(255,40,70,0.6)', 1, T);
    mist(ctx, T, hz - 14, '#4a0a18', 0.35);
    K.city(ctx, hz + 2, 61, '#14040a', 0.08, 0.5, 0);
    // The bridge: a long stone span with a parapet, braziers burning along it.
    ground(ctx, hz, '#1c0c10', '#060204', '#5a2430');
    ctx.fillStyle = '#0e0507'; for (let x = -4; x < w + 4; x += 14) ctx.fillRect(x, hz - 6, 10, 6);
    ctx.fillStyle = '#3a1820'; for (let x = -4; x < w + 4; x += 14) ctx.fillRect(x, hz - 6, 10, 1);
    for (const bx of [0.08, 0.56, 0.94]) { const x = Math.round(w * bx); iso(ctx, 'v:Brazier_S', x, hz + 1, 22); isoAnim(ctx, 'Fire', T, 10, x, hz - 15, 14); glow(ctx, x, hz - 20, 44, 44, '#ff7a30', 0.4 + 0.1 * Math.sin(T * 9 + bx * 10)); }
    // The others behind her: met ones lit faintly in their colour, the rest as shadows.
    const others = (sc.heroes || []).filter((id) => id !== sc.hero), locked = sc.locked || [];
    const row = others.concat(locked), n = row.length;
    row.forEach((id, i) => {
      const Hx = D.HEROES[id]; if (!Hx) return; const x = Math.round(w * 0.2 + (i - (n - 1) / 2) * Math.min(18, w * 0.34 / Math.max(1, n))), y = hz + 1, lk = locked.indexOf(id) >= 0;
      if (!lk) glow(ctx, x, y - 14, 24, 30, Hx.color, 0.18);
      actor(ctx, Hx.set, 'Idle4', Math.floor(T * 6 + i * 3) % 15, Math.PI * 0.5, x, y, 1, lk ? { shade: '#07030a' } : { flash: 0.25, flashCol: '#1a0810' });
    });
    // Her, in front, larger, in her own light.
    const hx = Math.round(w * 0.27), hy = Math.round(h * 0.93);
    glow(ctx, hx, hy - 34, 110, 120, col, 0.32 + 0.06 * Math.sin(T * 2));
    ctx.save(); ctx.translate(hx, hy); ctx.scale(1, 0.32); A.tex(ctx, 'magic_01', 0, 0, 70, 70, col, 0.45, T * 0.6, true); ctx.restore();
    actor(ctx, H0.set, 'Idle4', Math.floor(T * 7) % 15, Math.PI * 0.32, hx, hy, 2);
    rise(ctx, T, 30, 71, col, hx - 40, hx + 40, hy - 90, hy, 1);
    I().K().embers(ctx, T, 16, 0, w, RED);
    finish(ctx, T);
  }

  // ---- the Forge --------------------------------------------------------------------------------------------------
  function forge(ctx, T, sc) {
    const w = W(), h = H(), K = I(), H0 = D.HEROES[sc.hero] || D.HEROES.vesper, fy = Math.round(h * 0.8);
    K.grad(ctx, ['#060304', '#1a0c08', '#2a1208']);
    // A stone wall of big blocks, lit from the hearth.
    for (let r = 0; r < 9; r++) for (let c = -1; c < 16; c++) { const bw = 26, bh = 14, x = c * bw + (r % 2 ? 13 : 0), y = r * bh; ctx.fillStyle = `rgba(${40 + hash(c, r) * 18},${22 + hash(c, r + 9) * 10},${16},${0.55})`; ctx.fillRect(x, y, bw - 1, bh - 1); }
    const fx = Math.round(w * 0.07), flick = 0.5 + 0.5 * Math.sin(T * 13) * Math.sin(T * 7.3);
    glow(ctx, fx, fy - 30, w * 1.1, h * 1.2, '#ff6a20', 0.35 + 0.08 * flick);
    // The hearth: the pack's fireplace with its fire, the anvil stone in front.
    iso(ctx, 'd:FirePlace', fx, fy + 4, 30);
    isoAnim(ctx, 'Fire2', T + 0.3, 12, fx - 9, fy - 4, 34); isoAnim(ctx, 'Fire', T, 12, fx + 6, fy - 2, 26);
    glow(ctx, fx, fy - 30, 120, 80, '#ffb050', 0.45 + 0.15 * flick);
    ground(ctx, fy, '#2a160c', '#0a0503', '#6a3418');
    // Torches on the wall.
    for (const tx of [0.03, 0.3, 0.62, 0.94]) { const x = Math.round(w * tx); isoAnim(ctx, 'Torch 1', T + tx, 10, x, Math.round(h * 0.46), 22); glow(ctx, x, h * 0.36, 50, 50, '#ff9a40', 0.3 + 0.1 * Math.sin(T * 8 + tx * 9)); }
    // The anvil stone and the blade on it: every so often a blow, a shower of sparks.
    const ax = Math.round(w * 0.13), ay = fy + 6;
    ctx.fillStyle = '#121014'; ctx.fillRect(ax - 14, ay - 10, 28, 6); ctx.fillRect(ax - 8, ay - 4, 16, 8); ctx.fillStyle = '#4a4650'; ctx.fillRect(ax - 14, ay - 10, 28, 1);
    ctx.fillStyle = '#d8d8e8'; ctx.fillRect(ax - 11, ay - 12, 20, 1); ctx.fillStyle = '#ffb060'; ctx.fillRect(ax - 3, ay - 12, 7, 1);
    const beat = T % 1.6; if (beat < MS.lastBeat) for (let i = 0; i < 26; i++) MS.sparks.push({ x: ax, y: ay - 12, vx: (Math.random() - 0.5) * 90, vy: -30 - Math.random() * 70, life: 0.5 + Math.random() * 0.6 });
    MS.lastBeat = beat;
    // Her at the anvil, striking it.
    const hx = Math.round(w * 0.2), hy = Math.round(h * 0.95), swing = beat > 1.25;
    glow(ctx, hx, hy - 30, 90, 100, '#ff7030', 0.2);
    actor(ctx, H0.set, swing ? 'Attack1' : 'Idle4', swing ? Math.min(14, Math.floor((beat - 1.25) * 40)) : Math.floor(T * 7) % 15, Math.PI, hx, hy, 2, { flash: 0.18, flashCol: '#ff8a40' });
    for (const p of MS.sparks) { p.vy += 160 * MS.dt; p.x += p.vx * MS.dt; p.y += p.vy * MS.dt; p.life -= MS.dt; ctx.fillStyle = p.life > 0.4 ? '#fff0b0' : '#ff8a30'; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
    MS.sparks = MS.sparks.filter((p) => p.life > 0 && p.y < h);
    rise(ctx, T, 40, 81, '#ffa040', fx - 70, fx + 70, 0, fy - 20, 1);
    finish(ctx, T, 0.6);
  }

  // ---- the Vigil ----------------------------------------------------------------------------------------------------
  function vigil(ctx, T, sc) {
    const w = W(), h = H(), K = I(), H0 = D.HEROES[sc.hero] || D.HEROES.vesper, hz = Math.round(h * 0.82);
    K.grad(ctx, ['#020208', '#0a0820', '#1a0a26']); K.stars(ctx, 140, 0.8, 91, T);
    // Constellations: three figures in the branches' colours, slowly turning into view.
    const cons = [['#ff3048', 0.18, 0.28], ['#c9a0ff', 0.5, 0.18], ['#ffd060', 0.82, 0.3]];
    cons.forEach(([c, cx, cy], j) => {
      const pts = []; for (let i = 0; i < 6; i++) pts.push([w * cx + (hash(i, 300 + j) - 0.5) * w * 0.2, h * cy + (hash(i, 310 + j) - 0.5) * h * 0.22]);
      ctx.strokeStyle = c; ctx.globalAlpha = 0.25 + 0.12 * Math.sin(T * 0.7 + j); ctx.lineWidth = 1; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); ctx.globalAlpha = 1;
      for (const [x, y] of pts) { glow(ctx, x, y, 10, 10, c, 0.6); ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); }
    });
    // The moon low, a long shaft of its light on her.
    K.moon(ctx, Math.round(w * 0.5), Math.round(h * 0.5), Math.round(h * 0.11), '#ff3a52', 'rgba(255,40,70,0.5)', 1, T);
    mist(ctx, T, hz - 10, '#1a0c30', 0.4);
    ground(ctx, hz, '#120a1a', '#030205', '#3a2450');
    const hx = Math.round(w * 0.5), hy = hz + 14;
    A.tex(ctx, 'light_01', hx, hy - 70, 40, 160, '#ffb0c0', 0.25, 0, true);
    ctx.save(); ctx.translate(hx, hy); ctx.scale(1, 0.34); A.tex(ctx, 'magic_02', 0, 0, 90, 90, RED, 0.55, -T * 0.4, true); A.tex(ctx, 'magic_01', 0, 0, 60, 60, '#ffd060', 0.4, T * 0.7, true); ctx.restore();
    isoAnim(ctx, 'Candlesfl', T, 8, hx - 34, hy + 2, 12); isoAnim(ctx, 'Candlesfl', T + 0.4, 8, hx + 34, hy + 2, 12);
    actor(ctx, H0.set, 'CrouchIdle', Math.floor(T * 5) % 15, Math.PI * 0.5, hx, hy, 2);
    rise(ctx, T, 40, 97, '#ffd0e0', hx - 50, hx + 50, hy - 100, hy, 1);
    finish(ctx, T);
  }

  // ---- the Soul Altar -----------------------------------------------------------------------------------------------------
  function altar(ctx, T, sc) {
    const w = W(), h = H(), K = I(), S0 = sc.soul && D.SOULS[sc.soul], col = S0 ? S0.color : '#8ab8ff', ay = Math.round(h * 0.8), ax = Math.round(w * 0.5);
    K.grad(ctx, ['#020308', '#080a1c', '#101030']); K.stars(ctx, 90, 0.6, 121, T);
    glow(ctx, ax, h * 0.2, w, h * 0.8, '#1a2a6a', 0.45);
    // A shaft of pale light falling onto the altar.
    A.tex(ctx, 'light_01', ax, ay - 70, 70, 190, col, 0.28 + 0.05 * Math.sin(T * 1.3), 0, true);
    mist(ctx, T, ay - 18, '#141c40', 0.4, 5);
    ground(ctx, ay, '#0c0e1c', '#020206', '#2a3460');
    // The altar: a raised ring of stone with its rune circle burning in the soul's colour.
    ctx.fillStyle = '#0a0c16'; ctx.beginPath(); ctx.ellipse(ax, ay + 4, 74, 15, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#1a1e34'; ctx.beginPath(); ctx.ellipse(ax, ay + 1, 70, 13, 0, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(ax, ay + 1); ctx.scale(1, 0.19); A.tex(ctx, 'magic_02', 0, 0, 150, 150, col, 0.6, T * 0.3, true); A.tex(ctx, 'magic_01', 0, 0, 100, 100, '#ffffff', 0.3, -T * 0.5, true); ctx.restore();
    iso(ctx, 'v:Altar_S', ax, ay + 4, 26);
    for (const dx of [-62, 62]) { iso(ctx, 'v:Crystal_S', ax + dx, ay + 4, 24); glow(ctx, ax + dx, ay - 8, 30, 30, col, 0.35); }
    isoAnim(ctx, 'Candlesfl', T, 8, ax - 40, ay + 10, 11); isoAnim(ctx, 'Candlesfl', T + 0.5, 8, ax + 40, ay + 10, 11);
    // The freed souls turning round it, the far ones behind, the near ones in front; the bound one above the altar.
    const ring = (sc.souls || []).filter((id) => id !== sc.soul), back = [], front = [];
    ring.forEach((id, i) => { const a = T * 0.25 + i / Math.max(1, ring.length) * Math.PI * 2, x = ax + Math.cos(a) * 92, y = ay - 6 + Math.sin(a) * 16, f = Math.sin(a) > 0; (f ? front : back).push([id, x, y, a]); });
    const ghost = (id, x, y, s, a, big) => { const S = D.SOULS[id]; if (!S) return; const bob = Math.sin(T * 1.6 + x) * 2;
      glow(ctx, x, y - 16 * s + bob, 40 * s, 50 * s, S.color, big ? 0.4 : 0.22);
      actor(ctx, S.set, 'Idle4', Math.floor(T * 6 + x) % 15, Math.PI * 0.5, x, y + bob, s * (S.scale || 1), { alpha: big ? 0.92 : 0.6, flash: big ? 0.3 : 0.5, flashCol: S.color }); };
    back.sort((p, q) => p[2] - q[2]).forEach(([id, x, y]) => ghost(id, x, y, 1, 0, false));
    if (S0 && !sc.reveal) { ghost(sc.soul, ax, ay - 24, 2, 0, true); rise(ctx, T, 40, 131, col, ax - 30, ax + 30, ay - 100, ay, 1); }
    front.sort((p, q) => p[2] - q[2]).forEach(([id, x, y]) => ghost(id, x, y, 1, 0, false));
    rise(ctx, T, 50, 141, '#c8d8ff', 0, w, 0, h, 1);
    finish(ctx, T, 0.6);
  }

  // ---- the Endless March ---------------------------------------------------------------------------------------------------
  function march(ctx, T, sc) {
    const w = W(), h = H(), K = I(), hz = Math.round(h * 0.7);
    const bolt = ((T % 5.9) > 5.5 && (T % 5.9) < 5.6) || ((T % 5.9) > 5.68 && (T % 5.9) < 5.74);
    K.grad(ctx, ['#030106', bolt ? '#4a0e22' : '#1a0410', bolt ? '#8a1a30' : '#40081a']); K.stars(ctx, 50, 0.5, 151, T);
    const sx = Math.round(w * 0.7), top = Math.round(h * 0.12);
    glow(ctx, sx, top + 20, w * 0.7, h * 0.9, '#6a0c22', 0.45);
    // The Spire.
    ctx.fillStyle = '#0c0206'; ctx.beginPath(); ctx.moveTo(sx - 26, hz + 4); ctx.lineTo(sx - 6, top + 26); ctx.lineTo(sx - 3, top); ctx.lineTo(sx + 3, top); ctx.lineTo(sx + 6, top + 26); ctx.lineTo(sx + 26, hz + 4); ctx.fill();
    ctx.fillStyle = '#3a0c18'; ctx.fillRect(sx - 1, top + 6, 2, hz - top);
    for (let i = 0; i < 6; i++) { ctx.fillStyle = Math.sin(T * 2 + i) > 0.3 ? '#ff6a40' : '#3a1008'; ctx.fillRect(sx - 2 + (i % 2) * 3, top + 30 + i * 14, 1, 2); }
    glow(ctx, sx, top, 40, 40, RED, 0.5 + 0.2 * Math.sin(T * 3));
    if (bolt) { ctx.strokeStyle = '#ffd0d8'; ctx.lineWidth = 1; ctx.beginPath(); let x = sx + 40, y = 0; ctx.moveTo(x, y); while (y < top) { x += (hash(Math.floor(T * 10), y) - 0.5) * 12; y += 6; ctx.lineTo(x, y); } ctx.stroke(); }
    mist(ctx, T, hz - 10, '#4a0a1a', 0.4);
    K.city(ctx, hz + 2, 161, '#120308', 0.1, 0.45, 0);
    ground(ctx, hz, '#0e0306', '#040102', '#3a0c16');
    // The dead, marching without end along the ridge, and a second rank nearer.
    const dead = ['vh_skeleton_002', 'vh_skeleton_005', D.FOES.ghoul.set, D.FOES.raider.set, D.FOES.ghast ? D.FOES.ghast.set : null].filter((id) => id && A.hasSet(id));
    if (dead.length) {
      for (let i = 0; i < 30; i++) { const x = ((i * 12 - T * 7 + hash(i, 171) * 9) % (w + 40) + w + 40) % (w + 40) - 20; actor(ctx, dead[i % dead.length], 'Walk', Math.floor(T * 7 + i * 3) % 15, Math.PI, x, hz + 3 + (i % 3), 0.34, { shade: '#060104' }); }
      for (let i = 0; i < 9; i++) { const x = ((i * 40 - T * 14 + hash(i, 181) * 20) % (w + 60) + w + 60) % (w + 60) - 30; actor(ctx, dead[(i + 2) % dead.length], 'Walk', Math.floor(T * 8 + i * 5) % 15, Math.PI, x, Math.round(h * 0.9) + (i % 2) * 3, 0.85, { shade: '#030102' }); }
    }
    I().K().embers(ctx, T, 30, 0, w, RED);
    if (bolt) { ctx.fillStyle = 'rgba(255,208,216,0.12)'; ctx.fillRect(0, 0, w, h); }
    finish(ctx, T);
  }

  // ---- the Spire at rest (settings, credits, achievements) ---------------------------------------------------------------------
  function rest(ctx, T, sc) {
    const w = W(), h = H(), K = I(), hz = Math.round(h * 0.74);
    K.grad(ctx, ['#040108', '#160410', '#320a18']); K.stars(ctx, 70, 0.6, 191, T);
    const mx = Math.round(w * 0.76), my = Math.round(h * 0.3);
    glow(ctx, mx, my, w * 0.8, h * 0.8, '#5a0a1c', 0.45); K.moon(ctx, mx, my, Math.round(h * 0.15), '#ff3a52', 'rgba(255,40,70,0.55)', 1, T);
    mist(ctx, T, hz - 12, '#3a0814', 0.35);
    K.city(ctx, hz + 2, 201, '#100306', 0.15, 0.5, 0);
    ground(ctx, hz, '#0c0305', '#030102', '#2a0a12');
    I().K().embers(ctx, T, 14, 0, w, RED);
    finish(ctx, T, 0.65);
  }

  const SCENES = { roster, gear: forge, skills: vigil, souls: altar, modes: march };
  VS.MENU = {
    draw(dt, sc) {
      sc = sc || {}; MS.dt = Math.min(0.05, dt || 0.016);
      if (sc.kind !== MS.kind) { MS.kind = sc.kind; MS.t = 0; MS.sparks = []; MS.lastBeat = 0; }
      MS.t += MS.dt; const ctx = R.pxBegin();
      (SCENES[sc.kind] || rest)(ctx, MS.t + 3, sc);
    },
    // The tiles the scenes use (loaded with the rest of the packs; asked for here in case a menu opens first).
    need: ['v', 'a', 'd'],
  };
})();
