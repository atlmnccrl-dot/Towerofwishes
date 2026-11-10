// VESPER — drawing the large tile arenas (js/arenas.js) in the isometric fight view: the ground baked once
// per map (tiles, overlays, cliff edges, the hour's light, braziers' glow), the walls behind, and the
// props, plants, torches and breakables sorted with the fighters.
(function () {
  const VS = window.VS, A = VS.A, R = VS.R;
  const S2 = Math.SQRT1_2, LIP = 16, STACK = 5;
  let G = null;   // the baked ground of the current map
  const dark = {};
  // Map pixels (one tile pixel at scale 1) of a world point.
  const mp = (x, y) => [(x + y) * S2, (y - x) * S2 * 0.5];
  R.isoGroups = (Ar) => Ar && Ar.kind === 'grid' ? ['w', 'a', Ar.set === 'i' ? 'i' : 'd'] : [];

  // A tile copy darkened for the cliff faces under the map's front edges.
  function darkTile(key, k) {
    const id = key + k; if (dark[id]) return dark[id];
    const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d');
    A.iso(g, key, 128, 208, 1); g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(6,4,10,${0.35 + k * 0.12})`; g.fillRect(0, 0, 256, 256);
    return (dark[id] = c);
  }
  function bake(Ar, st) {
    const T = Ar.T, x1 = Ar.x0 + Ar.w * T, y1 = Ar.y0 + Ar.h * T;
    const minx = (Ar.x0 + Ar.y0) * S2, maxx = (x1 + y1) * S2, miny = (Ar.y0 - x1) * S2 * 0.5, maxy = (y1 - Ar.x0) * S2 * 0.5;
    const OX = Math.ceil(-minx + 8), OY = Math.ceil(-miny + 56), W = Math.ceil(maxx - minx + 16), H = Math.ceil(maxy - miny + 56 + 40 + LIP * STACK + 24);
    const c1 = document.createElement('canvas'); c1.width = W; c1.height = H; const g = c1.getContext('2d'); g.imageSmoothingEnabled = false;
    const order = []; for (let cy = 0; cy < Ar.h; cy++) for (let cx = 0; cx < Ar.w; cx++) if (Ar.cells[cy * Ar.w + cx]) order.push([cx, cy]);
    order.sort((a, b) => (a[1] - a[0]) - (b[1] - b[0]) || (a[0] + a[1]) - (b[0] + b[1]));
    const overBy = {}; for (const o of Ar.over) (overBy[o.cy * Ar.w + o.cx] || (overBy[o.cy * Ar.w + o.cx] = [])).push(o.key);
    const filled = (cx, cy) => cx >= 0 && cy >= 0 && cx < Ar.w && cy < Ar.h && Ar.cells[cy * Ar.w + cx];
    for (const [cx, cy] of order) {
      const i = cy * Ar.w + cx, key = Ar.ground[i]; if (!key) continue;
      const [px, py] = mp(Ar.x0 + (cx + 0.5) * T, Ar.y0 + (cy + 0.5) * T), x = OX + px, y = OY + py;
      // The cliff under an open front edge: the slab repeated downward, darkening into the night.
      if (!filled(cx - 1, cy) || !filled(cx, cy + 1)) for (let k = STACK; k >= 1; k--) { g.globalAlpha = Math.max(0, 1 - (k - 1) * 0.2); g.drawImage(darkTile(key, k), x - 128, y - 208 + k * LIP); }
      g.globalAlpha = 1; A.iso(g, key, x, y, 1);
      const ov = overBy[i]; if (ov) for (const k of ov) A.iso(g, k, x, y, 1);
    }
    // The hour's light: a multiply tint over the tiles (and only the tiles), the moon's glow at the centre,
    // braziers and torches baked warm into the floor, frost dusting the cloister.
    const c = document.createElement('canvas'); c.width = W; c.height = H; const o = c.getContext('2d');
    o.drawImage(c1, 0, 0); o.globalCompositeOperation = 'multiply'; o.fillStyle = Ar.tint; o.fillRect(0, 0, W, H);
    o.globalCompositeOperation = 'destination-in'; o.drawImage(c1, 0, 0);
    o.globalCompositeOperation = 'source-atop';
    if (Ar.frost) { o.fillStyle = 'rgba(225,238,255,0.16)'; o.fillRect(0, 0, W, H); }
    const L = st.look, moon = L.moonCol || '#ff3048', [mx, my] = mp(0, 0);
    let gr = o.createRadialGradient(OX + mx, OY + my, 0, OX + mx, OY + my, W * 0.45); gr.addColorStop(0, R.rgba(moon, 0.16)); gr.addColorStop(1, R.rgba(moon, 0)); o.fillStyle = gr; o.fillRect(0, 0, W, H);
    for (const l of Ar.lights) { const [lx, ly] = mp(l.x, l.y), r = l.r * S2 * 1.4; o.save(); o.translate(OX + lx, OY + ly); o.scale(1, 0.5); gr = o.createRadialGradient(0, 0, 0, 0, 0, r); gr.addColorStop(0, 'rgba(255,150,70,0.42)'); gr.addColorStop(1, 'rgba(255,120,50,0)'); o.fillStyle = gr; o.fillRect(-r, -r, r * 2, r * 2); o.restore(); }
    // The far edges fade into the dark a little, so the map does not end on a hard line.
    gr = o.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(0,0,0,0.25)'); gr.addColorStop(0.35, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.2)'); o.fillStyle = gr; o.fillRect(0, 0, W, H);
    return { id: Ar.id, c, OX, OY, W, H };
  }
  // The ground and the walls behind: everything the fighters always stand in front of.
  // The arena's floor (and walls) as a stencil: drawn onto another canvas exactly where it lands on screen, so a
  // layer can be cut away wherever the map is (the First Cut stands outside it, beyond its edge).
  R.isoMask = function (c, Ar) {
    if (!G || G.id !== Ar.id) return false;
    const Sh = R.Sh(), P0 = R.P(0, 0), ox = P0.x - G.OX * Sh, oy = P0.y - G.OY * Sh;
    c.save(); c.setTransform(R.baseT || new DOMMatrix()); c.imageSmoothingEnabled = false; c.drawImage(G.c, Math.round(ox), Math.round(oy), Math.round(G.W * Sh), Math.round(G.H * Sh)); c.restore();
    return true;
  };
  R.isoGround = function (ctx, s, Ar) {
    if (!A.isoReady(R.isoGroups(Ar))) { A.loadIso(R.isoGroups(Ar)); return false; }
    if (!G || G.id !== Ar.id) G = bake(Ar, s.def);
    const Sh = R.Sh(), P0 = R.P(0, 0), ox = P0.x - G.OX * Sh, oy = P0.y - G.OY * Sh;
    // Only the part on screen.
    const sx = Math.max(0, Math.floor(-ox / Sh)), sy = Math.max(0, Math.floor(-oy / Sh)), ex = Math.min(G.W, Math.ceil((R.W - ox) / Sh) + 1), ey = Math.min(G.H, Math.ceil((R.H - oy) / Sh) + 1);
    const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    if (ex > sx && ey > sy) ctx.drawImage(G.c, sx, sy, ex - sx, ey - sy, Math.round(ox + sx * Sh), Math.round(oy + sy * Sh), Math.round((ex - sx) * Sh), Math.round((ey - sy) * Sh));
    // Water rippling.
    const rip = A.isoAnim('Water Ripples 1');
    if (rip) for (const r of Ar.ripples) { const q = R.P(r[0], r[1]); if (q.x < -60 * Sh || q.x > R.W + 60 * Sh || q.y < -40 * Sh || q.y > R.H + 40 * Sh) continue; A.iso(ctx, rip[Math.floor(R.t * 9 + r[2] * 10) % rip.length], q.x, q.y, Sh, null, 0.8); }
    // The walls, back to front.
    for (const w of Ar.walls) {
      if (w.low) continue;
      const q = R.P(w.x, w.y); if (q.x < -140 * Sh || q.x > R.W + 140 * Sh || q.y < -40 * Sh || q.y > R.H + 260 * Sh) continue;
      A.iso(ctx, w.key, Math.round(q.x), Math.round(q.y), Sh, Ar.tint);
    }
    ctx.imageSmoothingEnabled = sm;
    return true;
  };
  // Props, plants, torches, breakables and the low walls: sorted with the fighters by depth.
  R.isoItems = function (s, Ar) {
    const out = [], Sh = R.Sh(), vis = (q, up) => q.x > -150 * Sh && q.x < R.W + 150 * Sh && q.y > -40 * Sh && q.y < R.H + up * Sh;
    for (const o of Ar.objs) { const q = R.P(o.x, o.y); if (!vis(q, 260)) continue; out.push({ d: q.d + (o.back ? -400 : 0), iso: o, q }); }
    for (const w of Ar.walls) if (w.low) { const q = R.P(w.x, w.y); if (vis(q, 200)) out.push({ d: q.d - 30, iso: w, q }); }
    return out;
  };
  R.isoDraw = function (ctx, s, Ar, it) {
    const o = it.iso, q = it.q, Sh = R.Sh(), x = Math.round(q.x), y = Math.round(q.y);
    const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    if (o.kind === 'chest') {
      A.iso(ctx, o.broken ? o.openKey : o.key, x, y, Sh, Ar.tint);
      // Unopened: a soft glint in its tier's colour, so it reads as treasure from across the map.
      if (!o.broken) { const col = o.tier === 'gold' ? '#ffd060' : o.tier === 'iron' ? '#9ad0ff' : '#ffb070'; R.glowAt(ctx, col, x, y - 10 * Sh, 26 * Sh, 0.22 + 0.12 * Math.sin(R.t * 3 + o.x)); }
    } else if (o.kind === 'break') {
      const fr = A.isoAnim(o.anim) || [];
      if (!o.broken) { if (!(o.key && A.iso(ctx, o.key, x, y, Sh, Ar.tint)) && fr.length) A.iso(ctx, fr[0], x, y, Sh, Ar.tint); }
      else if (fr.length) { const k = Math.min(fr.length - 1, Math.max(0, Math.floor((s.time - o.brokeT) * 18))); A.iso(ctx, fr[k], x, y, Sh, k < fr.length - 1 ? null : Ar.tint); }
    } else if (o.kind === 'torch') {
      A.iso(ctx, o.key, x, y, Sh, Ar.tint);
      const fl = A.isoAnim('Torch 1'); if (fl) A.iso(ctx, fl[Math.floor(R.t * 12 + o.x) % fl.length], x, y, Sh);
    } else {
      // A prop standing in front of a fighter turns see-through, so nobody is ever lost behind it.
      const f = A.isoInfo(o.key); let al = null;
      if (f) {
        const bx = x + f[5] * Sh, by = y + f[6] * Sh, bw = f[3] * Sh, bh = f[4] * Sh;
        for (const u of s.units) { if (!u.alive && u.state !== 'dead') continue; const p = R.P(u.x, u.y); if (p.d >= q.d) continue; const hy = p.y - 30 * Sh * (u.scale || 1); if (p.x > bx + 4 * Sh && p.x < bx + bw - 4 * Sh && hy > by && hy < by + bh) { al = u === s.hero ? 0.38 : 0.55; if (u === s.hero) break; } }
      }
      A.iso(ctx, o.key, x, y, Sh, Ar.tint, al);
    }
    ctx.imageSmoothingEnabled = sm;
  };
  // Firelight flickering over the braziers and torches (added after the sorted pass).
  R.isoLights = function (ctx, s, Ar) {
    const Sh = R.Sh(), fire = A.isoAnim('Fire2');
    for (const l of Ar.lights) {
      const q = R.P(l.x, l.y); if (q.x < -100 * Sh || q.x > R.W + 100 * Sh || q.y < -100 * Sh || q.y > R.H + 100 * Sh) continue;
      R.glowAt(ctx, '#ff8a3a', q.x, q.y - 40 * Sh, 46 * Sh, 0.16 + 0.04 * Math.sin(R.t * 9 + l.x));
    }
    for (const o of Ar.objs) if (o.kind === 'light' && fire) { const q = R.P(o.x, o.y); if (q.x < -60 * Sh || q.x > R.W + 60 * Sh || q.y < -100 * Sh || q.y > R.H + 60 * Sh) continue; A.iso(ctx, fire[Math.floor(R.t * 12 + o.y) % fire.length], Math.round(q.x), Math.round(q.y - 30 * Sh), Sh * 0.6); }
  };
  R.isoReset = () => { G = null; };
})();
