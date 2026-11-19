// BLACKLINE — the HUD, drawn on the canvas in the same thin line style as the world.
// Every interactive element registers a hit region for the frame; input tests those first.
(function () {
  const BL = window.BL;
  const { R, PAL, clamp } = BL;
  const FONT = '"Courier New", Courier, monospace';
  const H = { regions: [] };

  function region(x, y, w, h, id, arg) { H.regions.push({ x, y, w, h, id, arg }); }
  function hit(px, py) {
    for (let i = H.regions.length - 1; i >= 0; i--) {
      const r = H.regions[i];
      if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return r;
    }
    return null;
  }

  function pad() { return R.mobile && R.W > 700 ? 34 : 14; }
  function font(px, weight) { return `${weight || ''} ${px}px ${FONT}`; }

  function text(ctx, s, x, y, opts) {
    opts = opts || {};
    ctx.font = font(opts.size || 11, opts.weight);
    ctx.textAlign = opts.align || 'left';
    ctx.textBaseline = opts.base || 'alphabetic';
    ctx.fillStyle = opts.color || PAL.ink;
    if (opts.spacing && 'letterSpacing' in ctx) ctx.letterSpacing = opts.spacing + 'px';
    ctx.fillText(s, x, y);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }

  // Split a line into pieces that fit maxW at the given size.
  function wrap(ctx, s, maxW, size) {
    ctx.font = font(size);
    const words = s.split(' ');
    const out = [];
    let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width + t.length > maxW && line) { out.push(line); line = w; } else line = t;
    }
    if (line) out.push(line);
    return out;
  }

  function brackets(ctx, x, y, w, h, k, col) {
    ctx.strokeStyle = col || PAL.ink;
    ctx.beginPath();
    ctx.moveTo(x, y + k); ctx.lineTo(x, y); ctx.lineTo(x + k, y);
    ctx.moveTo(x + w - k, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + k);
    ctx.moveTo(x, y + h - k); ctx.lineTo(x, y + h); ctx.lineTo(x + k, y + h);
    ctx.moveTo(x + w - k, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - k);
    ctx.stroke();
  }

  // ---------------------------------------------------------------- icons

  function icon(ctx, type, cx, cy, s, col) {
    ctx.save();
    ctx.strokeStyle = col; ctx.fillStyle = col;
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    const SH = BL.units.SHAPES;
    const poly = (pts, close) => { ctx.beginPath(); for (let i = 0; i < pts.length; i += 2) i ? ctx.lineTo(pts[i], pts[i + 1]) : ctx.moveTo(pts[i], pts[i + 1]); if (close) ctx.closePath(); ctx.stroke(); };
    if (type === 'tank' || type === 'apc') {
      const sh = SH[type];
      ctx.translate(cx, cy + 6 * s); ctx.scale(s * 0.62, -s * 0.62); ctx.lineWidth = 1 / (s * 0.62);
      if (sh.tracks) poly(sh.tracks, true);
      poly(sh.hull, true);
      for (const x of sh.wheels) { ctx.beginPath(); ctx.arc(x, sh.wy, sh.wr, 0, 7); ctx.stroke(); }
      ctx.translate(sh.pivot[0], sh.pivot[1]);
      poly(sh.turret, true);
      ctx.beginPath(); ctx.moveTo(sh.barrel.x, sh.barrel.y); ctx.lineTo(sh.barrel.x + sh.barrel.len, sh.barrel.y + 1); ctx.stroke();
    } else if (type === 'heli' || type === 'insert') {
      const sh = SH[type === 'heli' ? 'heli' : 'transport'];
      ctx.translate(cx, cy - 1 * s); ctx.scale(s * 0.42, -s * 0.42); ctx.lineWidth = 1 / (s * 0.42);
      poly(sh.body, true); poly(sh.fin, true);
      ctx.beginPath(); ctx.moveTo(sh.mast[0] - sh.rotorL, sh.rotorY); ctx.lineTo(sh.mast[0] + sh.rotorL, sh.rotorY); ctx.stroke();
      if (type === 'insert') { ctx.setLineDash([1.5, 2]); ctx.beginPath(); ctx.moveTo(2, -6); ctx.lineTo(4, -26); ctx.stroke(); ctx.setLineDash([]); }
    } else if (type === 'arty') {
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(cx - 8 * s + i * 7 * s, cy - 10 * s); ctx.lineTo(cx - 6 * s + i * 7 * s, cy + 2 * s); ctx.stroke(); }
      ctx.beginPath();
      for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; ctx.moveTo(cx + Math.cos(a) * 3 * s, cy + 7 * s + Math.sin(a) * 2 * s); ctx.lineTo(cx + Math.cos(a) * 6 * s, cy + 7 * s + Math.sin(a) * 4 * s); }
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 12 * s, cy + 10 * s); ctx.lineTo(cx + 12 * s, cy + 10 * s); ctx.stroke();
    } else {
      // infantry: a few small figures
      const n = type === 'scout' ? 2 : 3;
      for (let i = 0; i < n; i++) {
        const x = cx + (i - (n - 1) / 2) * 7 * s, y = cy + 9 * s;
        ctx.beginPath();
        ctx.moveTo(x - 1.6 * s, y); ctx.lineTo(x, y - 4 * s); ctx.lineTo(x + 1.6 * s, y);
        ctx.moveTo(x, y - 4 * s); ctx.lineTo(x + 0.4 * s, y - 7 * s);
        const L = type === 'scout' ? 7 : type === 'mg' && i === 0 ? 7 : 4.5;
        ctx.moveTo(x - 1 * s, y - 6 * s); ctx.lineTo(x + L * s, y - 6.4 * s);
        ctx.stroke();
        ctx.beginPath(); ctx.arc(x + 0.6 * s, y - 8.4 * s, 1.2 * s, 0, 7); ctx.fill();
      }
      if (type === 'mg') { ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 8 * s, cy + 3 * s); ctx.lineTo(cx - 1 * s, cy + 2.7 * s); ctx.stroke(); }
    }
    ctx.restore();
  }

  function cmdIcon(ctx, id, cx, cy, col) {
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.2;
    ctx.beginPath();
    if (id === 'move') {
      ctx.moveTo(cx - 3, cy - 7); ctx.lineTo(cx + 5, cy); ctx.lineTo(cx - 3, cy + 7);
      ctx.moveTo(cx - 12, cy); ctx.lineTo(cx - 9, cy); ctx.moveTo(cx - 6, cy); ctx.lineTo(cx - 3, cy);
    } else if (id === 'attack') {
      ctx.arc(cx, cy, 6, 0, 7);
      ctx.moveTo(cx - 10, cy); ctx.lineTo(cx - 3, cy); ctx.moveTo(cx + 3, cy); ctx.lineTo(cx + 10, cy);
      ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy - 3); ctx.moveTo(cx, cy + 3); ctx.lineTo(cx, cy + 10);
    } else if (id === 'hold') {
      ctx.moveTo(cx - 10, cy + 5); ctx.lineTo(cx + 10, cy + 5);
      ctx.moveTo(cx - 8, cy + 5); ctx.quadraticCurveTo(cx - 5, cy - 2, cx - 2, cy + 5);
      ctx.moveTo(cx - 2, cy + 5); ctx.quadraticCurveTo(cx + 1, cy - 2, cx + 4, cy + 5);
      ctx.moveTo(cx + 4, cy + 5); ctx.quadraticCurveTo(cx + 7, cy - 2, cx + 10, cy + 5);
      ctx.moveTo(cx - 5, cy - 3); ctx.quadraticCurveTo(cx - 2, cy - 9, cx + 1, cy - 3);
      ctx.moveTo(cx + 1, cy - 3); ctx.quadraticCurveTo(cx + 4, cy - 9, cx + 7, cy - 3);
    } else if (id === 'retreat') {
      ctx.moveTo(cx + 3, cy - 7); ctx.lineTo(cx - 5, cy); ctx.lineTo(cx + 3, cy + 7);
      ctx.moveTo(cx + 9, cy - 7); ctx.lineTo(cx + 1, cy); ctx.lineTo(cx + 9, cy + 7);
    } else if (id === 'all') {
      ctx.moveTo(cx - 10, cy - 4); ctx.lineTo(cx - 10, cy - 8); ctx.lineTo(cx - 6, cy - 8);
      ctx.moveTo(cx + 6, cy - 8); ctx.lineTo(cx + 10, cy - 8); ctx.lineTo(cx + 10, cy - 4);
      ctx.moveTo(cx - 10, cy + 4); ctx.lineTo(cx - 10, cy + 8); ctx.lineTo(cx - 6, cy + 8);
      ctx.moveTo(cx + 6, cy + 8); ctx.lineTo(cx + 10, cy + 8); ctx.lineTo(cx + 10, cy + 4);
      ctx.stroke(); ctx.beginPath();
      for (let i = -1; i <= 1; i++) ctx.rect(cx + i * 5 - 1, cy - 1, 2, 2);
      ctx.fill(); return;
    } else if (id === 'follow') {
      ctx.arc(cx, cy, 4, 0, 7);
      ctx.moveTo(cx - 11, cy); ctx.quadraticCurveTo(cx, cy - 11, cx + 11, cy); ctx.quadraticCurveTo(cx, cy + 11, cx - 11, cy);
    }
    ctx.stroke();
  }

  // ---------------------------------------------------------------- battle HUD

  function drawBattle(ctx, G) {
    const S = G.S;
    H.regions.length = 0;
    const W = R.W, Hh = R.H, P = pad();
    const T0 = S.teams[0], T1 = S.teams[1];
    ctx.lineWidth = 1;

    // -- top strip: the whole front as a dotted profile
    const mx = P, my = 8, mw = W - P * 2 - 70, mh = 22;
    const f = S.field;
    let hmin = 1e9, hmax = -1e9;
    for (let x = 0; x <= f.W; x += 40) { const h = BL.heightAt(f, x); hmin = Math.min(hmin, h); hmax = Math.max(hmax, h); }
    const toX = (x) => mx + (x / f.W) * mw;
    const toY = (h) => my + mh - 3 - ((h - hmin) / (hmax - hmin)) * (mh - 9);
    ctx.fillStyle = 'rgba(235,228,210,0.5)';
    for (let x = 0; x <= f.W; x += 24) ctx.fillRect(toX(x), toY(BL.heightAt(f, x)), 1, 1);
    for (const s of f.sectors) {
      const col = s.owner === 0 ? PAL.ink : s.owner === 1 ? PAL.red : 'rgba(235,228,210,0.45)';
      text(ctx, s.id, toX(s.x), my + 6, { size: 9, align: 'center', color: col });
    }
    for (const u of S.units) {
      if (!u.alive) continue;
      if (u.team === 1 && !BL.visible(S, 0, u)) continue;
      const x = toX(u.x);
      const y = u.kind === 'air' ? my + 6 : toY(BL.heightAt(f, u.x));
      ctx.fillStyle = u.team === 0 ? PAL.ink : PAL.red;
      ctx.fillRect(x - 0.5, y - (u.kind === 'inf' ? 4 : 5), u.kind === 'inf' ? 1 : 2.4, u.kind === 'inf' ? 3 : 3);
      if (G.selected.has(u.id)) ctx.fillRect(x - 2, y + 2, 4, 1);
    }
    for (const st of S.strikes) { ctx.fillStyle = PAL.red; ctx.fillRect(toX(st.x) - 3, my + mh - 2, 6, 1.5); }
    const v0 = toX(clamp(BL.render.wx(0), 0, f.W)), v1 = toX(clamp(BL.render.wx(W), 0, f.W));
    brackets(ctx, v0, my + 1, Math.max(6, v1 - v0), mh - 1, 4, 'rgba(235,228,210,0.8)');
    region(mx, my - 4, mw, mh + 8, 'minimap');

    // pause and sound, top right
    const bx = W - P - 26;
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(bx + 9, my + 3); ctx.lineTo(bx + 9, my + 19); ctx.moveTo(bx + 17, my + 3); ctx.lineTo(bx + 17, my + 19); ctx.stroke();
    region(bx - 6, my - 6, 38, 34, 'pause');
    const sxp = bx - 34;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sxp + 4, my + 8); ctx.lineTo(sxp + 8, my + 8); ctx.lineTo(sxp + 13, my + 3); ctx.lineTo(sxp + 13, my + 19); ctx.lineTo(sxp + 8, my + 14); ctx.lineTo(sxp + 4, my + 14); ctx.closePath(); ctx.stroke();
    if (BL.audio.enabled) { ctx.beginPath(); ctx.arc(sxp + 14, my + 11, 5, -0.8, 0.8); ctx.moveTo(sxp + 21, my + 4); ctx.arc(sxp + 14, my + 11, 9, -0.8, 0.8); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(sxp + 17, my + 7); ctx.lineTo(sxp + 24, my + 15); ctx.moveTo(sxp + 24, my + 7); ctx.lineTo(sxp + 17, my + 15); ctx.stroke(); }
    region(sxp - 2, my - 6, 30, 34, 'sound');
    // action camera toggle: an eye inside brackets
    const cxp = sxp - 36;
    const on = G.camMode === 'action';
    brackets(ctx, cxp, my, 26, 22, on ? 6 : 4, on ? PAL.ink : 'rgba(235,228,210,0.55)');
    ctx.strokeStyle = on ? PAL.red : PAL.ink;
    ctx.beginPath(); ctx.ellipse(cxp + 13, my + 11, 7, 4, 0, 0, 7); ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle; ctx.fillRect(cxp + 12, my + 10, 2, 2);
    region(cxp - 4, my - 6, 34, 34, 'cam');

    // -- second row: line strength, sectors, RP
    const ry = my + mh + 18;
    const cx = W / 2;
    const barW = W >= 1100 ? 150 : clamp((W - 2 * P) * 0.5 - 52 - 150, 50, 150);
    if (S.drain) {
      text(ctx, 'BLACKLINE', cx - 52 - barW - 8, ry, { size: 10, align: 'right', color: PAL.ink, spacing: 1 });
      text(ctx, 'HOSTILE', cx + 52 + barW + 8, ry, { size: 10, align: 'left', color: PAL.red, spacing: 1 });
      ticketBar(ctx, cx - 52 - barW, ry - 4, barW, T0.tickets / BL.RULES.tickets, PAL.ink, true);
      ticketBar(ctx, cx + 52, ry - 4, barW, T1.tickets / BL.RULES.tickets, PAL.red, false);
      text(ctx, String(Math.ceil(T0.tickets)), cx - 52 - barW / 2, ry + 11, { size: 9, align: 'center', color: PAL.inkDim });
      text(ctx, String(Math.ceil(T1.tickets)), cx + 52 + barW / 2, ry + 11, { size: 9, align: 'center', color: PAL.inkDim });
    }
    f.sectors.forEach((s, i) => sectorDiamond(ctx, s, cx + (i - 1) * 32, ry - 4));
    // the mission's objective, always in view under the sectors
    const M = G.mission;
    const obj = M ? BL.campaign.progressText(S, M, G.ms) : '';
    if (obj) text(ctx, obj, cx, ry + 28, { size: 11, align: 'center', color: PAL.ink, spacing: 2 });

    // RP and objective
    text(ctx, `RP ${Math.floor(T0.rp)}`, W - P, ry, { size: 14, align: 'right', color: PAL.ink, spacing: 1 });
    text(ctx, `+${(T0.income).toFixed(1)}/s  ·  ${BL.popCount(S, 0)}/${BL.RULES.popCap} units`, W - P, ry + 13, { size: 9, align: 'right', color: PAL.inkDim });
    if (W >= 1100 && M) {
      text(ctx, M.num ? `OPERATION BLACK RAIN · ${M.num}` : 'SKIRMISH', P, ry, { size: 9, color: PAL.inkDim, spacing: 2 });
      text(ctx, M.name, P, ry + 14, { size: 12, spacing: 2 });
      text(ctx, M.time + ' · ' + M.sky, P, ry + 27, { size: 9, color: PAL.inkDim, spacing: 1 });
    }

    // -- notices
    const nt = BL.fx.notices;
    let ny = ry + (obj ? 46 : 40);
    for (const n of nt) {
      n.t += G.frameDt;
      const a = clamp(Math.min(n.t * 4, (4 - n.t) / 0.8), 0, 1);
      if (a <= 0) continue;
      text(ctx, n.text, cx, ny, { size: 11, align: 'center', color: n.bad ? `rgba(200,80,66,${a})` : `rgba(235,228,210,${a})`, spacing: 2 });
      ny += 15;
    }
    for (let i = nt.length - 1; i >= 0; i--) if (nt[i].t > 4) nt.splice(i, 1);

    // -- deploy tray (bottom left)
    const order = BL.DEPLOY_ORDER.filter((k) => !S.allowed || !S.allowed[0] || S.allowed[0].has(k));
    // cards and commands share the bottom edge: size them so both fit
    const cw = clamp(Math.floor((W - 2 * P - 20) / (Math.max(order.length, 6) + 6 * 0.95)) - 4, 38, 62);
    const ch = Math.round(cw * 1.08);
    const ty = Hh - ch - 10;
    order.forEach((type, i) => {
      const x = P + i * (cw + 4);
      const def = BL.UNITS[type] || BL.SUPPORT[type];
      const why = BL.canAfford(S, 0, type);
      const ready = !why;
      const sel = G.deploying === type;
      const col = ready ? PAL.ink : 'rgba(235,228,210,0.32)';
      ctx.lineWidth = 1;
      brackets(ctx, x, ty, cw, ch, sel ? 9 : 5, sel ? PAL.ink : ready ? 'rgba(235,228,210,0.55)' : 'rgba(235,228,210,0.2)');
      if (sel) { ctx.fillStyle = 'rgba(235,228,210,0.07)'; ctx.fillRect(x, ty, cw, ch); }
      icon(ctx, type, x + cw / 2, ty + ch * 0.36, cw / 50, col);
      text(ctx, def.short, x + cw / 2, ty + ch - 15, { size: 9, align: 'center', color: col, spacing: 1 });
      text(ctx, String(def.cost), x + cw / 2, ty + ch - 4, { size: 9, align: 'center', color: why === 'rp' ? 'rgba(200,80,66,0.8)' : col });
      // cooldown sweep: a line rising up the card's left edge
      const cd = (S.teams[0].cds[type] || 0) - S.t;
      if (cd > 0) {
        const k = cd / def.cd;
        ctx.strokeStyle = PAL.ink;
        ctx.beginPath(); ctx.moveTo(x + 2, ty + ch - 2); ctx.lineTo(x + 2, ty + ch - 2 - (ch - 4) * (1 - k)); ctx.stroke();
        text(ctx, `${Math.ceil(cd)}s`, x + cw - 3, ty + 10, { size: 8, align: 'right', color: PAL.inkDim });
      }
      const keyN = BL.DEPLOY_ORDER.indexOf(type) + 1;
      text(ctx, String(keyN), x + 3, ty + 10, { size: 8, color: 'rgba(235,228,210,0.3)' });
      if (G.fresh && G.fresh.includes(type) && Math.sin(R.time * 5) > -0.3) text(ctx, 'NEW', x + cw - 3, ty + ch - 26, { size: 8, align: 'right', color: PAL.red, spacing: 1 });
      region(x, ty, cw, ch, 'card', type);
    });
    if (G.deploying) {
      const def = BL.UNITS[G.deploying] || BL.SUPPORT[G.deploying];
      const msg = G.deploying === 'arty' ? 'TAP THE FIELD TO AIM THE SHELLS' : G.deploying === 'insert' ? 'TAP WHERE THE SQUAD SHOULD DROP (WHERE YOU CAN SEE)' : `TAP NEAR A BEAM TO DEPLOY ${def.name}`;
      text(ctx, msg, P, ty - 10, { size: 10, color: PAL.ink, spacing: 1 });
      if (G.deployMsg && G.deployMsgT > 0) text(ctx, G.deployMsg, P, ty - 24, { size: 10, color: PAL.red });
    } else if (G.deployMsg && G.deployMsgT > 0) {
      text(ctx, G.deployMsg, P, ty - 10, { size: 10, color: PAL.red });
    }

    // -- commands (bottom right)
    const bs = clamp(Math.round(cw * 0.95), 38, 56);
    const cmds = G.selected.size ? ['all', 'follow', 'move', 'attack', 'hold', 'retreat'] : ['all'];
    const total = cmds.length * (bs + 4);
    let x0 = W - P - total + 4;
    const by = Hh - bs - 10;
    cmds.forEach((id, i) => {
      const x = x0 + i * (bs + 4);
      const active = (id === 'move' || id === 'attack') && G.cmdMode === id || (id === 'follow' && G.following);
      brackets(ctx, x, by, bs, bs, active ? 9 : 5, active ? PAL.ink : 'rgba(235,228,210,0.5)');
      if (active) { ctx.fillStyle = 'rgba(235,228,210,0.07)'; ctx.fillRect(x, by, bs, bs); }
      cmdIcon(ctx, id, x + bs / 2, by + bs / 2 - 5, id === 'attack' && active ? PAL.red : PAL.ink);
      text(ctx, id.toUpperCase(), x + bs / 2, by + bs - 5, { size: 8, align: 'center', color: PAL.inkDim, spacing: 1 });
      region(x, by, bs, bs, 'cmd', id);
    });
    // selection summary
    if (G.selected.size) {
      const units = S.units.filter((u) => G.selected.has(u.id) && u.alive);
      const names = {};
      units.forEach((u) => { names[u.def.short] = (names[u.def.short] || 0) + 1; });
      const label = Object.keys(names).map((k) => (names[k] > 1 ? `${names[k]}× ` : '') + k).join('  ');
      text(ctx, label, W - P, by - 10, { size: 10, align: 'right', color: PAL.ink, spacing: 1 });
      const ord = units.length === 1 ? units[0].order.type.toUpperCase() : '';
      text(ctx, (ord ? ord + ' · ' : '') + (G.cmdMode === 'attack' ? 'TAP GROUND: ATTACK-MOVE' : 'TAP GROUND: MOVE · FOE: ATTACK'), W - P, by - 22, { size: 8, align: 'right', color: PAL.inkDim });
    } else {
      text(ctx, 'TAP A UNIT TO COMMAND IT', W - P, by - 10, { size: 9, align: 'right', color: PAL.inkDim, spacing: 1 });
    }

    // box selection
    if (G.box) {
      ctx.strokeStyle = PAL.ink;
      ctx.setLineDash([3, 3]);
      const b = G.box;
      ctx.strokeRect(Math.min(b.x0, b.x1), Math.min(b.y0, b.y1), Math.abs(b.x1 - b.x0), Math.abs(b.y1 - b.y0));
      ctx.setLineDash([]);
    }

    drawHint(ctx, G, ty);
    if (G.help) drawHelp(ctx, G);
    if (G.paused && !S.over) drawPause(ctx, G);
  }

  function ticketBar(ctx, x, y, w, k, col, rightAligned) {
    k = clamp(k, 0, 1);
    ctx.strokeStyle = 'rgba(235,228,210,0.18)';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (rightAligned) { ctx.moveTo(x + w, y); ctx.lineTo(x + w - w * k, y); }
    else { ctx.moveTo(x, y); ctx.lineTo(x + w * k, y); }
    ctx.stroke();
    ctx.lineWidth = 1;
    // tick marks every 10 %
    ctx.fillStyle = 'rgba(235,228,210,0.25)';
    for (let i = 0; i <= 10; i++) ctx.fillRect(x + w * i / 10, y + 3, 1, 2);
  }

  function sectorDiamond(ctx, s, x, y) {
    const r = 9;
    const col = s.owner === 0 ? PAL.ink : s.owner === 1 ? PAL.red : 'rgba(235,228,210,0.5)';
    ctx.strokeStyle = col;
    ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.stroke();
    if (s.owner >= 0) {
      ctx.fillStyle = s.owner === 0 ? 'rgba(235,228,210,0.18)' : 'rgba(184,67,58,0.22)';
      ctx.fill();
    }
    text(ctx, s.id, x, y + 3.5, { size: 10, align: 'center', color: col });
    // progress arc
    const k = s.prog / 100;
    if (Math.abs(k) < 0.999) {
      ctx.strokeStyle = k >= 0 ? PAL.ink : PAL.red;
      ctx.beginPath();
      ctx.arc(x, y, r + 4, -Math.PI / 2, -Math.PI / 2 + Math.abs(k) * Math.PI * 2 * (k >= 0 ? 1 : -1), k < 0);
      ctx.stroke();
    }
    if (s.contested && Math.sin(R.time * 10) > 0) { ctx.strokeStyle = PAL.red; ctx.beginPath(); ctx.arc(x, y, r + 7, 0, 7); ctx.stroke(); }
  }

  function veil(ctx, a) { ctx.fillStyle = `rgba(2,2,2,${a})`; ctx.fillRect(0, 0, R.W, R.H); }

  function menu(ctx, items, x, y, gap, size) {
    items.forEach((it, i) => {
      const yy = y + i * gap;
      const col = it.dim ? 'rgba(235,228,210,0.35)' : PAL.ink;
      text(ctx, (it.dim ? '  ' : '— ') + it.label, x, yy, { size: size || 14, color: col, spacing: 2 });
      if (!it.dim) {
        ctx.font = font(size || 14);
        const w = ctx.measureText('— ' + it.label).width + it.label.length * 2;
        region(x - 10, yy - gap * 0.7, w + 30, gap, 'menu', it.id);
      }
    });
  }

  function drawHelp(ctx, G) {
    veil(ctx, 0.55);
    const x = Math.max(pad() + 10, R.W / 2 - 250), y = R.H * 0.28;
    text(ctx, 'BLACK RAIN', x, y, { size: 22, spacing: 6 });
    text(ctx, 'Night. Storm. Three sectors between two lines.', x, y + 24, { size: 11, color: PAL.inkDim });
    const lines = [
      ['DEPLOY', 'tap a card, then tap near a beam (base or a sector you hold)'],
      ['COMMAND', 'tap a unit; tap ground to move, tap a seen enemy to attack'],
      ['ORDERS', 'attack-move stops to fight · hold digs in · retreat refits at base'],
      ['CAMERA', 'drag to pan · pinch or wheel to zoom · tap the strip on top'],
      ['GROUP', 'hold, then drag to box-select · ALL takes the whole force'],
      ['WIN', 'hold more sectors to drain their line; losses drain it too'],
    ];
    lines.forEach((l, i) => {
      text(ctx, l[0], x, y + 56 + i * 19, { size: 10, color: PAL.inkDim, spacing: 2 });
      text(ctx, l[1], x + 84, y + 56 + i * 19, { size: 11 });
    });
    text(ctx, 'tap anywhere to begin', x, y + 56 + lines.length * 19 + 18, { size: 11, color: Math.sin(R.time * 3) > 0 ? PAL.ink : PAL.inkDim, spacing: 2 });
    H.regions.length = 0;
    region(0, 0, R.W, R.H, 'helpOff');
  }

  function drawPause(ctx, G) {
    veil(ctx, 0.62);
    H.regions.length = 0;
    const x = Math.max(pad() + 10, R.W / 2 - 120), y = R.H * 0.3;
    text(ctx, 'PAUSED', x, y, { size: 20, spacing: 6 });
    if (G.mission) text(ctx, BL.campaign.progressText(G.S, G.mission, G.ms), x, y + 20, { size: 10, color: PAL.inkDim, spacing: 2 });
    menu(ctx, [
      { id: 'resume', label: 'RESUME' },
      { id: 'restart', label: G.mission && G.mission.num ? 'RESTART MISSION' : 'RESTART BATTLE' },
      { id: 'sound', label: 'SOUND  ' + (BL.audio.enabled ? 'ON' : 'OFF') },
      { id: 'help', label: 'HOW TO PLAY' },
      { id: 'quit', label: G.mission && G.mission.num ? 'ABANDON MISSION' : 'QUIT TO TITLE' },
    ], x, y + 46, 30, 13);
  }

  function star(ctx, cx, cy, r, filled, col) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const rr = i % 2 ? r * 0.45 : r;
      i ? ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.strokeStyle = col || PAL.ink;
    ctx.lineWidth = 1;
    if (filled) { ctx.fillStyle = col || PAL.ink; ctx.fill(); }
    ctx.stroke();
  }

  const clock = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

  // After a battle: result, stars, numbers, and what the victory unlocked.
  function drawDebrief(ctx, G) {
    const S = G.S, M = G.mission;
    G.debriefT = (G.debriefT || 0) + G.frameDt;
    const k = clamp(G.debriefT / 0.8, 0, 1);
    veil(ctx, 0.72 * k);
    if (k < 0.4) return;
    H.regions.length = 0;
    const W = R.W, Hh = R.H;
    const win = S.winner === 0;
    const P = pad() + 10;
    const twoCol = G.fresh && G.fresh.length && W > 640;
    const x = twoCol ? P : Math.max(P, W / 2 - 230);
    let y = Hh * (Hh < 520 ? 0.12 : 0.2);
    const camp = M && M.num;
    text(ctx, camp ? `OPERATION BLACK RAIN · ${M.num} · ${M.name}` : 'SKIRMISH · BLACK RAIN', x, y, { size: 10, color: PAL.inkDim, spacing: 3 });
    const title = camp ? (win ? 'MISSION COMPLETE' : 'MISSION FAILED') : (win ? 'THE EASTERN LINE BREAKS' : 'OUR LINE BREAKS');
    text(ctx, title, x, y + 28, { size: clamp(W * 0.028, 18, 26), spacing: 4, color: win ? PAL.ink : PAL.red });
    y += 44;
    const st = S.teams[0].stats, en = S.teams[1].stats;
    const tEnd = S.endT || S.t;
    if (camp) {
      // stars appear one by one
      const n = G.stars || 0;
      for (let i = 0; i < 3; i++) {
        const shown = G.debriefT > 0.9 + i * 0.45;
        star(ctx, x + 12 + i * 30, y + 16, 11, shown && i < n, i < n ? PAL.ink : 'rgba(235,228,210,0.35)');
      }
      const crit = [
        ['OBJECTIVE', win ? 'DONE' : 'NOT MET', win],
        [`LOSSES ≤ ${M.maxLoss}`, String(st.lost), win && st.lost <= M.maxLoss],
        [`TIME ≤ ${clock(M.par + 25)}`, clock(tEnd), win && tEnd <= M.par + 25],
      ];
      y += 44;
      crit.forEach((c, i) => {
        text(ctx, (c[2] ? '★ ' : '☆ ') + c[0], x, y + i * 17, { size: 10, color: c[2] ? PAL.ink : PAL.inkDim, spacing: 1 });
        text(ctx, c[1], x + 170, y + i * 17, { size: 10, color: PAL.inkDim });
      });
      y += 3 * 17 + 10;
    }
    const short = Hh < 520;
    const rows = short && camp ? [['ENEMY LOSSES', `${en.lost}  (${st.vehKills} vehicles)`]] : [
      ['TIME', clock(tEnd)],
      ['ENEMY LOSSES', `${en.lost}  (${st.vehKills} vehicles)`],
      ['OUR LOSSES', `${st.lost}`],
      ['UNITS DEPLOYED', `${st.deployed}`],
    ];
    rows.forEach((r, i) => {
      text(ctx, r[0], x, y + i * 16, { size: 9, color: PAL.inkDim, spacing: 2 });
      text(ctx, r[1], x + 170, y + i * 16, { size: 10 });
    });
    y += rows.length * 16 + (short ? 18 : 26);
    const items = [];
    const idx = camp ? BL.campaign.MISSIONS.indexOf(M) : -1;
    if (camp && win && idx < BL.campaign.MISSIONS.length - 1) items.push({ id: 'next', label: 'NEXT — ' + BL.campaign.MISSIONS[idx + 1].name });
    items.push({ id: 'restart', label: win ? 'PLAY AGAIN' : 'RETRY' });
    items.push({ id: camp ? 'campaign' : 'quit', label: camp ? 'CAMPAIGN' : 'TITLE' });
    menu(ctx, items, x, y, short ? 22 : 26, 12);

    // right column: the unlock
    if (twoCol && G.debriefT > 1.8) {
      const a = clamp((G.debriefT - 1.8) / 0.6, 0, 1);
      const rx = Math.max(W * 0.52, x + 330);
      const key = G.fresh[0];
      const iy = Hh * (short ? 0.1 : 0.2);
      if (!short) icon(ctx, key, rx + 50, iy + 34, 2.2, `rgba(235,228,210,${a})`);
      BL.cinema.drawDossier(ctx, key, a, rx, 'UNLOCKED', short ? iy + 10 : iy + 80);
      if (G.fresh[1]) {
        const d2 = BL.UNITS[G.fresh[1]] || BL.SUPPORT[G.fresh[1]];
        text(ctx, '+ ' + d2.name, rx, Hh - 30, { size: 11, color: `rgba(235,228,210,${a})`, spacing: 2 });
      }
    } else if (camp && win && idx === BL.campaign.MISSIONS.length - 1 && G.debriefT > 1.8) {
      const rk = BL.campaign.rank(G.progress);
      const rx = Math.max(W * 0.55, x + 330);
      text(ctx, 'OPERATION BLACK RAIN', rx, Hh * 0.3, { size: 10, color: PAL.red, spacing: 4 });
      text(ctx, 'COMPLETE', rx, Hh * 0.3 + 30, { size: 24, spacing: 6 });
      text(ctx, `RANK  ${rk.name}   ★ ${rk.total}/${rk.max}`, rx, Hh * 0.3 + 56, { size: 11, color: PAL.inkDim, spacing: 2 });
      text(ctx, 'Skirmish now has every unit.', rx, Hh * 0.3 + 80, { size: 11 });
    }
  }

  // ---------------------------------------------------------------- hints

  function drawHint(ctx, G, trayY) {
    const h = G.hint;
    if (!h) return;
    const S = G.S;
    const n = Math.floor(h.shownT * 45);
    const s = h.text.slice(0, n);
    const a = clamp(h.shownT * 3, 0, 1);
    const y = trayY - 40;
    ctx.font = font(12);
    const w = ctx.measureText(h.text).width + h.text.length * 1;
    const x = clamp(R.W / 2 - w / 2, pad(), R.W - pad() - w);
    ctx.fillStyle = `rgba(2,2,2,${0.55 * a})`;
    ctx.fillRect(x - 10, y - 15, w + 20, 22);
    ctx.fillStyle = PAL.red;
    ctx.fillRect(x - 10, y - 15, 2, 22);
    text(ctx, s, x, y, { size: 12, color: `rgba(235,228,210,${a})`, spacing: 1 });
    // point at what the hint is about
    const t = h.target;
    if (!t) return;
    const pulse = 0.5 + 0.5 * Math.sin(R.time * 6);
    const col = `rgba(184,67,58,${0.5 + pulse * 0.5})`;
    let box = null;
    if (t.kind === 'card' || t.kind === 'cmd') {
      const r = H.regions.find((q) => q.id === t.kind && q.arg === t.arg);
      if (r) box = [r.x - 4, r.y - 4, r.w + 8, r.h + 8];
    } else if (t.kind === 'unit') {
      const u = S.units.find((q) => q.alive && q.team === 0 && (!t.type || q.type === t.type) && !q.members.some((m) => m.rappel));
      if (u) {
        const m = u.members.find((q) => q.alive) || u.members[0];
        const px = BL.render.sx(u.x), py = BL.render.sy(u.kind === 'air' ? m.y : m.y + 5);
        box = [px - 34, py - 24, 68, 40];
      }
    } else if (t.kind === 'sector') {
      const sec = S.field.sectors.find((q) => q.id === t.id);
      const px = BL.render.sx(sec.x), py = BL.render.sy(BL.heightAt(S.field, sec.x) + 40);
      box = [px - 26, py - 46, 52, 70];
    }
    if (box) brackets(ctx, box[0] - pulse * 3, box[1] - pulse * 3, box[2] + pulse * 6, box[3] + pulse * 6, 8, col);
  }

  // ---------------------------------------------------------------- title and campaign

  function logo(ctx, P, y, big) {
    text(ctx, 'BLACKLINE', P, y, { size: big, spacing: big * 0.28 });
    text(ctx, 'F R O N T L I N E S', P + 3, y + big * 0.55, { size: clamp(big * 0.28, 11, 18), color: PAL.inkDim, spacing: 3 });
    ctx.strokeStyle = PAL.red;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(P + 2, y + big * 0.8); ctx.lineTo(P + 60, y + big * 0.8); ctx.stroke();
  }

  function leftShade(ctx, w) {
    const grd = ctx.createLinearGradient(0, 0, w, 0);
    grd.addColorStop(0, 'rgba(2,2,2,0.86)');
    grd.addColorStop(1, 'rgba(2,2,2,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, R.W, R.H);
  }

  function drawTitle(ctx, G) {
    H.regions.length = 0;
    const P = pad() + 10;
    const W = R.W, Hh = R.H;
    leftShade(ctx, Math.min(W * 0.62, 600));
    const big = clamp(W * 0.055, 30, 64);
    const y = Hh * 0.27;
    logo(ctx, P, y, big);
    const rk = BL.campaign.rank(G.progress);
    text(ctx, `RANK  ${rk.name}   ★ ${rk.total}/${rk.max}`, P + 2, y + big * 0.8 + 20, { size: 10, color: PAL.inkDim, spacing: 2 });
    const open = BL.campaign.skirmishOpen(G.progress);
    const items = [
      { id: 'campaign', label: 'CAMPAIGN — OPERATION BLACK RAIN' },
      open ? { id: 'skirmish', label: 'SKIRMISH — BLACK RAIN' } : { id: 'x', label: 'SKIRMISH   (win mission 01 first)', dim: true },
      { id: 'difficulty', label: 'DIFFICULTY  ' + (G.difficulty === 'recruit' ? 'RECRUIT' : 'VETERAN') },
      { id: 'sound', label: 'SOUND  ' + (BL.audio.enabled ? 'ON' : 'OFF') },
    ];
    menu(ctx, items, P, y + big * 0.8 + 56, clamp(Hh * 0.075, 26, 34), clamp(W * 0.016, 12, 15));
    text(ctx, 'the battle behind this menu is live', P, Hh - 18, { size: 9, color: 'rgba(235,228,210,0.35)' });
  }

  function drawCampaign(ctx, G) {
    H.regions.length = 0;
    const C = BL.campaign;
    const P = pad() + 10;
    const W = R.W, Hh = R.H;
    veil(ctx, 0.35);
    leftShade(ctx, Math.min(W * 0.75, 760));
    const top = Math.max(30, Hh * 0.12);
    text(ctx, 'OPERATION', P, top, { size: 10, color: PAL.inkDim, spacing: 4 });
    text(ctx, 'BLACK RAIN', P, top + 28, { size: clamp(W * 0.03, 18, 30), spacing: 6 });
    const rk = C.rank(G.progress);
    text(ctx, `RANK  ${rk.name}   ★ ${rk.total}/${rk.max}`, P, top + 46, { size: 9, color: PAL.inkDim, spacing: 2 });
    const rowH = clamp(Hh * 0.075, 26, 36);
    const listW = Math.min(300, W * 0.4);
    C.MISSIONS.forEach((M, i) => {
      const y = top + 74 + i * rowH;
      const open = C.missionOpen(G.progress, i);
      const sel = G.campSel === i;
      const col = open ? PAL.ink : 'rgba(235,228,210,0.3)';
      if (sel) brackets(ctx, P - 8, y - rowH * 0.62, listW, rowH * 0.9, 5, PAL.ink);
      text(ctx, M.num, P, y, { size: 11, color: open ? PAL.red : col, spacing: 1 });
      text(ctx, M.name, P + 30, y, { size: 12, color: col, spacing: 2 });
      if (open) {
        const n = G.progress.stars[M.id] || 0;
        for (let k = 0; k < 3; k++) star(ctx, P + listW - 50 + k * 15, y - 4, 5, k < n, k < n ? PAL.ink : 'rgba(235,228,210,0.3)');
      } else text(ctx, 'LOCKED', P + listW - 20, y, { size: 9, align: 'right', color: col, spacing: 2 });
      region(P - 8, y - rowH * 0.62, listW, rowH * 0.9, 'mission', i);
    });
    text(ctx, '— BACK', P, Math.min(Hh - 20, top + 74 + 5 * rowH + 12), { size: 12, spacing: 2 });
    region(P - 8, Math.min(Hh - 20, top + 74 + 5 * rowH + 12) - 18, 90, 26, 'back');

    // the selected mission
    const M = C.MISSIONS[G.campSel];
    const open = C.missionOpen(G.progress, G.campSel);
    const rx = P + listW + Math.max(24, W * 0.04);
    let y = top;
    text(ctx, `${M.time}  ·  ${M.place}  ·  ${M.sky}`, rx, y, { size: 9, color: PAL.inkDim, spacing: 2 });
    text(ctx, M.name, rx, y + 28, { size: clamp(W * 0.026, 16, 26), spacing: 4 });
    const maxW = W - rx - P;
    const sum = wrap(ctx, M.summary, maxW, 12);
    sum.forEach((l, i) => text(ctx, l, rx, y + 50 + i * 15, { size: 12 }));
    y += 76 + (sum.length - 1) * 15;
    const lines = [];
    for (const b of M.brief.slice(0, 3)) lines.push(...wrap(ctx, b, maxW, 11));
    for (const line of lines) {
      if (y > Hh * 0.6) break;
      text(ctx, line, rx, y, { size: 11, color: PAL.inkDim });
      y += 15;
    }
    y += 12;
    if (M.intro && M.intro.length) {
      text(ctx, 'NEW IN THIS MISSION', rx, y, { size: 9, color: PAL.red, spacing: 3 });
      M.intro.forEach((k, i) => {
        const ix = rx + i * Math.min(110, maxW / 2);
        icon(ctx, k, ix + 24, y + 22, 1.1, PAL.ink);
        text(ctx, (BL.UNITS[k] || BL.SUPPORT[k]).short, ix + 54, y + 28, { size: 10, spacing: 2 });
      });
      y += 50;
    }
    if (M.unlocks.length) {
      text(ctx, 'VICTORY UNLOCKS  ' + M.unlocks.map((k) => (BL.UNITS[k] || BL.SUPPORT[k]).short).join(' · '), rx, y, { size: 9, color: PAL.inkDim, spacing: 2 });
      y += 22;
    }
    const by = Math.min(Hh - 22, y + 20);
    if (open) {
      brackets(ctx, rx - 8, by - 20, 150, 30, 6, PAL.ink);
      text(ctx, 'BEGIN MISSION', rx + 4, by, { size: 12, spacing: 2 });
      region(rx - 8, by - 20, 150, 30, 'begin');
    } else {
      text(ctx, `Win ${C.MISSIONS[G.campSel - 1].num} — ${C.MISSIONS[G.campSel - 1].name} to open this mission.`, rx, by, { size: 11, color: PAL.inkDim });
    }
  }

  function drawRotate(ctx) {
    ctx.fillStyle = '#030303';
    ctx.fillRect(0, 0, R.W, R.H);
    text(ctx, 'TURN YOUR PHONE SIDEWAYS', R.W / 2, R.H / 2, { size: 13, align: 'center', spacing: 2 });
    text(ctx, 'BLACKLINE plays in landscape', R.W / 2, R.H / 2 + 20, { size: 10, align: 'center', color: PAL.inkDim });
  }

  H.drawBattle = drawBattle;
  H.drawDebrief = drawDebrief;
  H.drawCampaign = drawCampaign;
  H.drawTitle = drawTitle;
  H.drawRotate = drawRotate;
  H.hit = hit;
  BL.hud = H;
})();
