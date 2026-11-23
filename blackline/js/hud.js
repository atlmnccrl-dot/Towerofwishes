// BLACKLINE — the interface, drawn on the canvas: condensed type, thin rules, dark panels at
// the edges, the battle in the middle. Every interactive element registers a hit region.
(function () {
  const BL = window.BL;
  const { R, PAL, clamp } = BL;
  const H = { regions: [], rects: {} };

  function region(x, y, w, h, id, arg) { H.regions.push({ x, y, w, h, id, arg }); }
  function hit(px, py) {
    for (let i = H.regions.length - 1; i >= 0; i--) {
      const r = H.regions[i];
      if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return r;
    }
    return null;
  }
  const pad = () => (R.mobile && R.W > 700 ? 36 : 14);
  const font = (px, w) => `${w || 500} ${px}px ${R.FONT}`;
  const DIM = 'rgba(235,228,210,0.55)', FAINT = 'rgba(235,228,210,0.3)';

  function text(ctx, s, x, y, o) {
    o = o || {};
    ctx.font = font(o.size || 13, o.weight);
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.base || 'alphabetic';
    ctx.fillStyle = o.color || PAL.ink;
    if ('letterSpacing' in ctx) ctx.letterSpacing = (o.spacing != null ? o.spacing : 0.5) + 'px';
    ctx.fillText(s, x, y);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }
  function measure(ctx, s, size, weight, spacing) { ctx.font = font(size, weight); return ctx.measureText(s).width + s.length * (spacing != null ? spacing : 0.5); }

  function panel(ctx, x, y, w, h) {
    ctx.fillStyle = PAL.panel; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = PAL.line; ctx.lineWidth = 1; ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w) - 1, Math.round(h) - 1);
    ctx.fillStyle = 'rgba(235,228,210,0.7)';
    ctx.fillRect(x, y, 6, 1); ctx.fillRect(x, y, 1, 6); ctx.fillRect(x + w - 6, y + h - 1, 6, 1); ctx.fillRect(x + w - 1, y + h - 6, 1, 6);
  }

  // A button. primary: filled; active: highlighted; disabled: dim and inert.
  function button(ctx, x, y, w, h, label, id, arg, o) {
    o = o || {};
    const on = o.primary || o.active;
    ctx.fillStyle = o.primary ? PAL.cream : o.active ? 'rgba(235,228,210,0.14)' : 'rgba(8,8,8,0.7)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = o.disabled ? 'rgba(235,228,210,0.15)' : on ? PAL.ink : 'rgba(235,228,210,0.35)';
    ctx.lineWidth = 1; ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w) - 1, Math.round(h) - 1);
    if (o.active && !o.primary) { ctx.fillStyle = o.red ? PAL.red : PAL.ink; ctx.fillRect(x, y + h - 2, w, 2); }
    const col = o.disabled ? 'rgba(235,228,210,0.3)' : o.primary ? '#0a0a0a' : PAL.ink;
    if (o.icon) {
      o.icon(ctx, x + w / 2, y + h * 0.4, col);
      text(ctx, label, x + w / 2, y + h - 6, { size: clamp(h * 0.24, 10, 12), align: 'center', color: col, weight: 600, spacing: 1 });
    } else text(ctx, label, x + (o.left ? 14 : w / 2), y + h / 2 + 1, { size: o.size || clamp(h * 0.36, 12, 16), align: o.left ? 'left' : 'center', base: 'middle', color: col, weight: 600, spacing: 1.5 });
    if (!o.disabled) region(x, y, w, h, id, arg);
  }

  // ---------------------------------------------------------------- icons

  function unitIcon(ctx, type, cx, cy, s, col) {
    ctx.save();
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1; ctx.lineJoin = 'round';
    const poly = (pts, close) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(cx + p[0] * s, cy + p[1] * s) : ctx.moveTo(cx + p[0] * s, cy + p[1] * s))); if (close) ctx.closePath(); ctx.stroke(); };
    if (type === 'tank') {
      poly([[-11, 3], [11, 3], [12, 5], [11, 7], [-11, 7], [-12, 5]], true);
      poly([[-10, 3], [-9, -1], [9, -1], [11, 3]], false);
      poly([[-5, -1], [-4, -4], [3, -4], [4, -1]], false);
      ctx.beginPath(); ctx.moveTo(cx + 4 * s, cy - 3 * s); ctx.lineTo(cx + 14 * s, cy - 3.5 * s); ctx.stroke();
    } else if (type === 'apc') {
      poly([[-10, 4], [-10, -2], [5, -2], [10, 1], [10, 4]], true);
      for (const x of [-6, 0, 6]) { ctx.beginPath(); ctx.arc(cx + x * s, cy + 5.5 * s, 2 * s, 0, 7); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(cx, cy - 2 * s); ctx.lineTo(cx, cy - 4 * s); ctx.lineTo(cx + 8 * s, cy - 4.5 * s); ctx.stroke();
    } else if (type === 'heli' || type === 'insert') {
      poly([[12, 1], [8, -2], [0, -2], [-4, 0], [-14, 0], [-14, 1], [-4, 2], [0, 3], [8, 3]], true);
      ctx.beginPath(); ctx.moveTo(cx - 12 * s, cy - 5 * s); ctx.lineTo(cx + 12 * s, cy - 5 * s); ctx.moveTo(cx + 1 * s, cy - 5 * s); ctx.lineTo(cx + 1 * s, cy - 2 * s); ctx.stroke();
      if (type === 'insert') { ctx.setLineDash([1.5, 2]); ctx.beginPath(); ctx.moveTo(cx, cy + 3 * s); ctx.lineTo(cx + 1, cy + 9 * s); ctx.stroke(); ctx.setLineDash([]); }
    } else if (type === 'arty') {
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(cx + (-7 + i * 6) * s, cy - 8 * s); ctx.lineTo(cx + (-5 + i * 6) * s, cy + 1 * s); ctx.stroke(); }
      ctx.beginPath();
      for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; ctx.moveTo(cx + Math.cos(a) * 2 * s, cy + 5 * s + Math.sin(a) * 1.5 * s); ctx.lineTo(cx + Math.cos(a) * 5 * s, cy + 5 * s + Math.sin(a) * 3 * s); }
      ctx.stroke();
    } else {
      const n = type === 'scout' ? 2 : 3;
      for (let i = 0; i < n; i++) {
        const x = cx + (i - (n - 1) / 2) * 6.5 * s, y = cy + 7 * s;
        ctx.beginPath();
        ctx.moveTo(x - 1.5 * s, y); ctx.lineTo(x, y - 4 * s); ctx.lineTo(x + 1.5 * s, y);
        ctx.moveTo(x, y - 4 * s); ctx.lineTo(x + 0.4 * s, y - 7 * s);
        const Lw = type === 'scout' ? 6.5 : type === 'mg' && i === 0 ? 6.5 : 4.5;
        ctx.moveTo(x - 1 * s, y - 6 * s); ctx.lineTo(x + Lw * s, y - 6.4 * s);
        ctx.stroke();
        ctx.beginPath(); ctx.arc(x + 0.6 * s, y - 8.4 * s, 1.2 * s, 0, 7); ctx.fill();
      }
      if (type === 'mg') { ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 8 * s, cy + 1 * s); ctx.lineTo(cx - 1.5 * s, cy + 0.7 * s); ctx.stroke(); }
    }
    ctx.restore();
  }

  const CMD_ICONS = {
    move: (ctx, cx, cy, col) => { ctx.strokeStyle = col; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(cx - 3, cy - 6); ctx.lineTo(cx + 4, cy); ctx.lineTo(cx - 3, cy + 6); ctx.moveTo(cx - 10, cy); ctx.lineTo(cx + 3, cy); ctx.stroke(); },
    attack: (ctx, cx, cy, col) => { ctx.strokeStyle = col; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(cx, cy, 5.5, 0, 7); ctx.moveTo(cx - 9, cy); ctx.lineTo(cx - 3, cy); ctx.moveTo(cx + 3, cy); ctx.lineTo(cx + 9, cy); ctx.moveTo(cx, cy - 9); ctx.lineTo(cx, cy - 3); ctx.moveTo(cx, cy + 3); ctx.lineTo(cx, cy + 9); ctx.stroke(); },
    hold: (ctx, cx, cy, col) => { ctx.strokeStyle = col; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(cx - 9, cy + 4); ctx.lineTo(cx + 9, cy + 4); for (let i = -1; i <= 1; i++) { ctx.moveTo(cx + i * 6 - 3, cy + 4); ctx.quadraticCurveTo(cx + i * 6, cy - 3, cx + i * 6 + 3, cy + 4); } ctx.stroke(); },
    retreat: (ctx, cx, cy, col) => { ctx.strokeStyle = col; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(cx + 2, cy - 6); ctx.lineTo(cx - 5, cy); ctx.lineTo(cx + 2, cy + 6); ctx.moveTo(cx + 8, cy - 6); ctx.lineTo(cx + 1, cy); ctx.lineTo(cx + 8, cy + 6); ctx.stroke(); },
    follow: (ctx, cx, cy, col) => { ctx.strokeStyle = col; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(cx, cy, 9, 5, 0, 0, 7); ctx.stroke(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, cy, 2, 0, 7); ctx.fill(); },
  };

  function iconBtn(ctx, x, y, s, id, draw, active) {
    ctx.fillStyle = active ? 'rgba(235,228,210,0.14)' : 'rgba(8,8,8,0.7)';
    ctx.fillRect(x, y, s, s);
    ctx.strokeStyle = active ? PAL.ink : 'rgba(235,228,210,0.35)'; ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
    draw(ctx, x + s / 2, y + s / 2, active ? PAL.red : PAL.ink);
    region(x - 3, y - 3, s + 6, s + 6, id);
  }
  const ICON = {
    pause: (ctx, cx, cy, col) => { ctx.fillStyle = col; ctx.fillRect(cx - 5, cy - 6, 3, 12); ctx.fillRect(cx + 2, cy - 6, 3, 12); },
    sound: (ctx, cx, cy, col) => {
      ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx - 7, cy - 3); ctx.lineTo(cx - 4, cy - 3); ctx.lineTo(cx, cy - 7); ctx.lineTo(cx, cy + 7); ctx.lineTo(cx - 4, cy + 3); ctx.lineTo(cx - 7, cy + 3); ctx.closePath(); ctx.stroke();
      if (BL.audio.enabled) { ctx.beginPath(); ctx.arc(cx + 1, cy, 4, -0.8, 0.8); ctx.moveTo(cx + 6.5, cy - 5); ctx.arc(cx + 1, cy, 7.5, -0.8, 0.8); ctx.stroke(); }
      else { ctx.beginPath(); ctx.moveTo(cx + 3, cy - 3); ctx.lineTo(cx + 8, cy + 3); ctx.moveTo(cx + 8, cy - 3); ctx.lineTo(cx + 3, cy + 3); ctx.stroke(); }
    },
    cam: (ctx, cx, cy, col) => { ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.strokeRect(cx - 8, cy - 5, 12, 10); ctx.beginPath(); ctx.moveTo(cx + 4, cy - 1); ctx.lineTo(cx + 8, cy - 4); ctx.lineTo(cx + 8, cy + 4); ctx.lineTo(cx + 4, cy + 1); ctx.stroke(); },
  };

  // ---------------------------------------------------------------- battle

  function unitStatus(S, u) {
    if (u.members.some((m) => m.rappel)) return { t: 'LANDING', c: DIM };
    const live = u.members.filter((m) => m.alive);
    const o = u.order.type;
    if (o === 'retreat') return { t: 'FALLING BACK', c: DIM };
    if (u.kind === 'inf') {
      const pinned = live.filter((m) => m.supp > 75).length;
      if (pinned > live.length / 2) return { t: 'PINNED', c: PAL.red };
      if (u.def.load.includes('mg') && S.t - u.engagedT < 1.6 && live.some((m) => m.wkey === 'mg' && m.setup < 1.4)) return { t: 'SETTING UP', c: PAL.red };
    }
    if (S.t - u.engagedT < 1.6) return { t: 'ENGAGED', c: PAL.red };
    if (u.path && u.path.length) return { t: o === 'attack' ? 'ADVANCING' : 'MOVING', c: PAL.ink };
    return { t: o === 'hold' && u.holdT > 4 ? 'DUG IN' : 'HOLDING', c: DIM };
  }

  function healthOf(u) {
    if (u.kind === 'inf') {
      let hp = 0;
      for (const m of u.members) if (m.alive) hp += m.hp;
      return { k: hp / (u.def.hp * u.def.load.length), n: u.members.filter((m) => m.alive).length, of: u.def.load.length };
    }
    const m = u.members[0];
    return { k: m.alive ? m.hp / m.maxHp : 0 };
  }

  function drawBattle(ctx, G) {
    const S = G.S;
    H.regions.length = 0;
    H.rects = {};
    const W = R.W, Hh = R.H, P = pad();
    const T0 = S.teams[0], T1 = S.teams[1];
    const small = Hh < 500;

    // -- top bar
    const grd = ctx.createLinearGradient(0, 0, 0, 58);
    grd.addColorStop(0, 'rgba(0,0,0,0.85)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, 58);
    const M = G.mission;
    text(ctx, M.num ? `${M.num}  ${M.name}` : 'SKIRMISH', P, 17, { size: 11, color: DIM, weight: 600, spacing: 2 });
    text(ctx, BL.campaign.progressText(S, M, G.ms), P, 36, { size: small ? 15 : 17, weight: 600, spacing: 1 });
    const cx = W / 2;
    S.field.sectors.forEach((s, i) => chip(ctx, s, cx + (i - 1) * 32 - 12, 8));
    if (S.drain) {
      const bw = clamp(W * 0.08, 46, 110);
      bar(ctx, cx - 60 - bw, 19, bw, T0.tickets / BL.RULES.tickets, PAL.ink, true);
      bar(ctx, cx + 60, 19, bw, T1.tickets / BL.RULES.tickets, PAL.red, false);
      text(ctx, String(Math.ceil(T0.tickets)), cx - 60 - bw / 2, 38, { size: 11, align: 'center', weight: 600, color: DIM });
      text(ctx, String(Math.ceil(T1.tickets)), cx + 60 + bw / 2, 38, { size: 11, align: 'center', weight: 600, color: PAL.red });
    }
    const bs = 30;
    let bx = W - P - bs;
    iconBtn(ctx, bx, 6, bs, 'pause', ICON.pause);
    bx -= bs + 6; iconBtn(ctx, bx, 6, bs, 'sound', ICON.sound);
    bx -= bs + 6; iconBtn(ctx, bx, 6, bs, 'cam', ICON.cam, G.camMode === 'action');
    const rp = `${Math.floor(T0.rp)}`;
    text(ctx, rp, bx - 12, 27, { size: 21, align: 'right', weight: 600, spacing: 1 });
    text(ctx, 'RP', bx - 16 - measure(ctx, rp, 21, 600, 1), 27, { size: 11, align: 'right', color: DIM, weight: 600, spacing: 2 });
    text(ctx, `+${T0.income.toFixed(1)} / S`, bx - 12, 42, { size: 10, align: 'right', color: DIM, weight: 600, spacing: 1 });

    // -- roster (left)
    const RW = clamp(W * 0.17, 142, 196);
    const top = 54, footH = 40;
    const units = S.units.filter((u) => u.alive && u.team === 0);
    const rowH = small ? 34 : 40;
    const mmW = clamp(W * 0.19, 150, 230);
    const maxRows = Math.max(2, Math.floor((Hh - top - footH - 26 - 12) / rowH));
    const rows = Math.min(units.length, maxRows);
    const ph = 26 + Math.max(1, rows) * rowH + footH + 6;
    panel(ctx, P, top, RW, ph);
    H.rects.roster = { x: P, y: top, w: RW, h: ph };
    text(ctx, 'FORCES', P + 10, top + 17, { size: 11, color: DIM, weight: 600, spacing: 2 });
    text(ctx, `${units.length}/${BL.RULES.popCap}`, P + 60, top + 17, { size: 11, weight: 600 });
    const allOn = units.length > 0 && units.every((u) => G.selected.has(u.id));
    text(ctx, 'ALL', P + RW - 12, top + 17, { size: 12, align: 'right', weight: 600, spacing: 2, color: allOn ? PAL.ink : DIM });
    region(P + RW - 52, top, 52, 26, 'all');
    G.rosterScroll = clamp(G.rosterScroll || 0, 0, Math.max(0, units.length - maxRows));
    const counts = {};
    const numbered = units.map((u) => { counts[u.type] = (counts[u.type] || 0) + 1; return { u, n: counts[u.type] }; });
    numbered.slice(G.rosterScroll, G.rosterScroll + maxRows).forEach(({ u, n }, i) => {
      const y = top + 26 + i * rowH;
      const sel = G.selected.has(u.id);
      if (sel) { ctx.fillStyle = 'rgba(235,228,210,0.13)'; ctx.fillRect(P + 1, y, RW - 2, rowH - 2); ctx.fillStyle = PAL.ink; ctx.fillRect(P + 1, y, 3, rowH - 2); }
      unitIcon(ctx, u.type, P + 22, y + rowH / 2 - 2, 0.9, sel ? PAL.ink : DIM);
      const hl = healthOf(u);
      text(ctx, `${u.def.short} ${n}`, P + 42, y + (small ? 14 : 16), { size: 14, weight: 600, spacing: 1 });
      if (hl.n != null) text(ctx, `${hl.n}/${hl.of}`, P + RW - 10, y + (small ? 14 : 16), { size: 12, align: 'right', color: DIM, weight: 600 });
      const st = unitStatus(S, u);
      text(ctx, st.t, P + 42, y + (small ? 26 : 30), { size: 10, color: st.c, weight: 600, spacing: 1.5 });
      ctx.fillStyle = 'rgba(235,228,210,0.15)'; ctx.fillRect(P + 42, y + rowH - 5, RW - 52, 2);
      ctx.fillStyle = hl.k < 0.35 ? PAL.red : PAL.ink; ctx.fillRect(P + 42, y + rowH - 5, (RW - 52) * clamp(hl.k, 0, 1), 2);
      region(P, y, RW, rowH - 1, 'unit', u.id);
    });
    if (!units.length) text(ctx, 'NO UNITS IN THE FIELD', P + 10, top + 26 + rowH / 2 + 4, { size: 11, color: DIM, weight: 600, spacing: 1 });
    if (units.length > maxRows) text(ctx, `${G.rosterScroll + 1}–${Math.min(units.length, G.rosterScroll + maxRows)} OF ${units.length} · DRAG`, P + RW / 2, top + 26 + rows * rowH + 3, { size: 9, align: 'center', color: FAINT, weight: 600 });
    const fy = top + ph - footH - 2;
    button(ctx, P + 6, fy, RW - 12, footH - 6, G.deployOpen || G.deploying ? 'CLOSE' : '+  DEPLOY', 'deploy', null, { active: G.deployOpen || !!G.deploying, size: 15 });

    if (G.deployOpen && !G.deploying) drawDeploy(ctx, G, P + RW + 8, top);
    if (G.deploying) {
      const def = BL.UNITS[G.deploying] || BL.SUPPORT[G.deploying];
      const msg = G.deploying === 'arty' ? 'TAP THE MAP TO AIM THE SHELLS' : G.deploying === 'insert' ? 'TAP WHERE THE SQUAD SHOULD LAND' : 'TAP A GLOWING RING TO DEPLOY';
      const w = Math.max(measure(ctx, msg, 12, 600, 1), measure(ctx, def.name, 16, 600, 1)) + 30;
      const x = P + RW + 8;
      panel(ctx, x, top, w, 52);
      text(ctx, def.name, x + 12, top + 22, { size: 16, weight: 600, spacing: 1 });
      text(ctx, msg, x + 12, top + 41, { size: 12, color: DIM, weight: 600, spacing: 1 });
    }

    // -- minimap
    const mmH = mmW * S.field.H / S.field.W;
    const mx = W - P - mmW, my = Hh - 10 - mmH;
    minimap(ctx, G, mx, my, mmW, mmH);

    // -- orders
    const sel = units.filter((u) => G.selected.has(u.id));
    const ox0 = P + RW + 10, ox1 = mx - 10;
    const obh = small ? 42 : 50;
    if (sel.length) {
      const ids = ['move', 'attack', 'hold', 'retreat', 'follow'];
      const bw = clamp((ox1 - ox0 - 4 * 6) / 5, 46, 74);
      const total = ids.length * bw + 4 * 6;
      const sx0 = Math.max(ox0, (ox0 + ox1) / 2 - total / 2);
      const by = Hh - obh - 10;
      ids.forEach((id, i) => {
        const active = id === G.cmdMode || (id === 'follow' && G.following);
        button(ctx, sx0 + i * (bw + 6), by, bw, obh, id.toUpperCase(), 'cmd', id, { icon: CMD_ICONS[id], active, red: id === 'attack' });
      });
      const names = sel.length === 1 ? sel[0].def.name : `${sel.length} UNITS SELECTED`;
      const st = sel.length === 1 ? unitStatus(S, sel[0]) : null;
      text(ctx, names, sx0, by - 9, { size: 13, weight: 600, spacing: 1.5 });
      if (st && total > 300) text(ctx, st.t, sx0 + measure(ctx, names, 13, 600, 1.5) + 10, by - 9, { size: 11, color: st.c, weight: 600, spacing: 1.5 });
      H.rects.orders = { x: sx0, y: by, w: total, h: obh };
    } else text(ctx, 'SELECT A UNIT FROM THE LIST, OR TAP ONE ON THE MAP', (ox0 + ox1) / 2, Hh - 22, { size: 11, align: 'center', color: FAINT, weight: 600, spacing: 1.5 });

    // -- notices
    let ny = 70;
    for (const n of BL.fx.notices) {
      n.t += G.frameDt;
      const a = clamp(Math.min(n.t * 4, (4 - n.t) / 0.8), 0, 1);
      if (a <= 0) continue;
      text(ctx, n.text, cx, ny, { size: 13, align: 'center', color: n.bad ? `rgba(206,90,76,${a})` : `rgba(235,228,210,${a})`, weight: 600, spacing: 2.5 });
      ny += 17;
    }
    for (let i = BL.fx.notices.length - 1; i >= 0; i--) if (BL.fx.notices[i].t > 4) BL.fx.notices.splice(i, 1);
    if (G.flashMsg && G.flashT > 0) text(ctx, G.flashMsg, cx, ny + 4, { size: 13, align: 'center', color: PAL.red, weight: 600, spacing: 2 });

    drawHint(ctx, G, sel.length ? Hh - obh - 46 : Hh - 48, (ox0 + ox1) / 2);
    if (G.paused && !S.over) drawPause(ctx, G);
  }

  function chip(ctx, s, x, y) {
    const w = 24;
    const own = s.owner === 0, foe = s.owner === 1;
    ctx.fillStyle = own ? PAL.cream : foe ? 'rgba(184,67,58,0.35)' : 'rgba(8,8,8,0.7)';
    ctx.fillRect(x, y, w, w);
    ctx.strokeStyle = own ? PAL.cream : foe ? PAL.red : 'rgba(235,228,210,0.45)';
    ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, w - 1);
    text(ctx, s.id, x + w / 2, y + w / 2 + 1, { size: 14, align: 'center', base: 'middle', weight: 600, color: own ? '#0a0a0a' : foe ? PAL.ink : DIM });
    if (Math.abs(s.prog) < 100 || s.contested) {
      ctx.fillStyle = 'rgba(235,228,210,0.2)'; ctx.fillRect(x, y + w + 3, w, 2);
      ctx.fillStyle = s.prog >= 0 ? PAL.ink : PAL.red;
      const k = Math.abs(s.prog) / 100;
      ctx.fillRect(s.prog >= 0 ? x : x + w - w * k, y + w + 3, w * k, 2);
    }
    if (s.contested && Math.sin(R.time * 10) > 0) { ctx.strokeStyle = PAL.red; ctx.strokeRect(x - 2.5, y - 2.5, w + 5, w + 5); }
  }

  function bar(ctx, x, y, w, k, col, rightAligned) {
    k = clamp(k, 0, 1);
    ctx.fillStyle = 'rgba(235,228,210,0.15)'; ctx.fillRect(x, y, w, 3);
    ctx.fillStyle = col;
    if (rightAligned) ctx.fillRect(x + w - w * k, y, w * k, 3); else ctx.fillRect(x, y, w * k, 3);
  }

  function drawDeploy(ctx, G, x, y) {
    const S = G.S;
    const order = BL.DEPLOY_ORDER.filter((k) => !S.allowed || !S.allowed[0] || S.allowed[0].has(k));
    const small = R.H < 500;
    const cw = small ? 76 : 88, ch = small ? 64 : 76, gap = 6;
    const cols = Math.min(order.length, Math.max(2, Math.floor((R.W - x - 40) / (cw + gap))), 4);
    const rows = Math.ceil(order.length / cols);
    const w = cols * (cw + gap) + gap + 2, h = rows * (ch + gap) + 30;
    panel(ctx, x, y, w, h);
    text(ctx, 'DEPLOY', x + 10, y + 17, { size: 11, color: DIM, weight: 600, spacing: 2 });
    order.forEach((type, i) => {
      const cx = x + gap + 1 + (i % cols) * (cw + gap), cy = y + 26 + Math.floor(i / cols) * (ch + gap);
      const def = BL.UNITS[type] || BL.SUPPORT[type];
      const why = BL.canAfford(S, 0, type);
      const col = why ? FAINT : PAL.ink;
      ctx.fillStyle = 'rgba(10,10,10,0.85)'; ctx.fillRect(cx, cy, cw, ch);
      ctx.strokeStyle = why ? 'rgba(235,228,210,0.15)' : 'rgba(235,228,210,0.45)'; ctx.strokeRect(cx + 0.5, cy + 0.5, cw - 1, ch - 1);
      unitIcon(ctx, type, cx + cw / 2, cy + ch * 0.36, 1.3, col);
      text(ctx, def.short, cx + 8, cy + ch - 9, { size: 13, weight: 600, color: col, spacing: 1 });
      text(ctx, String(def.cost), cx + cw - 8, cy + ch - 9, { size: 12, align: 'right', weight: 600, color: why === 'rp' ? PAL.red : col });
      const cd = (S.teams[0].cds[type] || 0) - S.t;
      if (cd > 0) {
        ctx.fillStyle = 'rgba(235,228,210,0.12)'; ctx.fillRect(cx, cy + ch * (1 - cd / def.cd), cw, ch * cd / def.cd);
        text(ctx, `${Math.ceil(cd)}S`, cx + cw - 6, cy + 14, { size: 11, align: 'right', color: DIM, weight: 600 });
      }
      if (G.fresh && G.fresh.includes(type)) text(ctx, 'NEW', cx + 6, cy + 14, { size: 10, color: PAL.red, weight: 600, spacing: 1 });
      region(cx, cy, cw, ch, 'card', type);
    });
    H.rects.deploy = { x, y, w, h };
  }

  // The whole field from above: woods, water, ruins, sectors, units, the camera's view.
  function minimap(ctx, G, x, y, w, h) {
    const S = G.S, f = S.field;
    panel(ctx, x, y, w, h);
    H.rects.minimap = { x, y, w, h };
    if (!H.mm || H.mm.field !== f || H.mm.w !== Math.round(w)) {
      const c = document.createElement('canvas');
      c.width = Math.round(w); c.height = Math.round(h);
      const g = c.getContext('2d');
      const kx = w / f.W, ky = h / f.H;
      // height as tone, then woods, water and roads on top
      let hmax = 1;
      for (const v of f.hgt) hmax = Math.max(hmax, v);
      for (let py = 0; py < c.height; py++) for (let px = 0; px < c.width; px++) {
        const wx = px / kx, wy = py / ky;
        const fl = BL.flagAt(f, wx, wy), hh = BL.heightAt(f, wx, wy) / hmax;
        let a = 0.05 + hh * 0.3;
        if (fl & BL.MAPF.WOOD) a = 0.55;
        if (fl & BL.MAPF.WATER) a = 0.7;
        if (fl & BL.MAPF.ROAD) a = Math.max(a, 0.4);
        if (((px * 7 + py * 13) % 5) / 5 < a * 1.4) { g.fillStyle = `rgba(235,228,210,${Math.min(0.75, a + 0.1)})`; g.fillRect(px, py, 1, 1); }
      }
      g.fillStyle = 'rgba(235,228,210,0.7)';
      for (const ru of f.ruins) g.fillRect(ru.x * kx - 1, ru.y * ky - 1, 3, 3);
      H.mm = { field: f, w: Math.round(w), c };
    }
    ctx.drawImage(H.mm.c, x, y);
    const kx = w / f.W, ky = h / f.H;
    for (const s of f.sectors) {
      const col = s.owner === 0 ? PAL.ink : s.owner === 1 ? PAL.red : DIM;
      ctx.strokeStyle = col;
      ctx.beginPath(); ctx.arc(x + s.x * kx, y + s.y * ky, BL.RULES.captureRadius * kx, 0, 7); ctx.stroke();
      text(ctx, s.id, x + s.x * kx, y + s.y * ky + 4, { size: 11, align: 'center', weight: 600, color: col });
    }
    for (const u of S.units) {
      if (!u.alive || (u.team === 1 && !BL.visible(S, 0, u))) continue;
      ctx.fillStyle = u.team === 0 ? PAL.ink : PAL.red;
      const sz = u.kind === 'inf' ? 2.5 : 3.5;
      ctx.fillRect(x + u.x * kx - sz / 2, y + u.y * ky - sz / 2, sz, sz);
      if (G.selected.has(u.id)) { ctx.strokeStyle = PAL.ink; ctx.strokeRect(x + u.x * kx - 4, y + u.y * ky - 4, 8, 8); }
    }
    for (const st of S.strikes) { ctx.strokeStyle = PAL.red; ctx.beginPath(); ctx.arc(x + st.x * kx, y + st.y * ky, 5, 0, 7); ctx.stroke(); }
    const vr = BL.render.viewRect(0);
    const rx0 = clamp(vr.x0 * kx, 0, w), rx1 = clamp(vr.x1 * kx, 0, w);
    const ry0 = clamp(vr.y0 * ky, 0, h), ry1 = clamp((vr.y1 - 120 / (R.cam.z * BL.render.K)) * ky, 0, h);
    ctx.strokeStyle = 'rgba(235,228,210,0.8)';
    ctx.strokeRect(x + rx0 + 0.5, y + ry0 + 0.5, Math.max(4, rx1 - rx0), Math.max(4, ry1 - ry0));
    region(x, y, w, h, 'minimap');
  }

  function drawHint(ctx, G, y, cx) {
    const h = G.hint;
    if (!h) return;
    const S = G.S;
    const s = h.text.slice(0, Math.floor(h.shownT * 45));
    const a = clamp(h.shownT * 3, 0, 1);
    const w = measure(ctx, h.text, 14, 600, 0.5) + 30;
    const x = clamp(cx - w / 2, pad(), R.W - pad() - w);
    ctx.fillStyle = `rgba(4,4,4,${0.85 * a})`; ctx.fillRect(x, y - 18, w, 28);
    ctx.fillStyle = PAL.red; ctx.fillRect(x, y - 18, 3, 28);
    text(ctx, s, x + 14, y + 1, { size: 14, color: `rgba(235,228,210,${a})`, weight: 600, spacing: 0.5 });
    const t = h.target;
    if (!t) return;
    const pulse = 0.5 + 0.5 * Math.sin(R.time * 6);
    let box = null;
    if (t.kind === 'cmd') { const r = H.regions.find((q) => q.id === 'cmd' && q.arg === t.arg); if (r) box = [r.x, r.y, r.w, r.h]; }
    else if (t.kind === 'deploy') { const r = H.regions.find((q) => q.id === 'deploy'); if (r) box = [r.x, r.y, r.w, r.h]; }
    else if (t.kind === 'roster') {
      const u = S.units.find((q) => q.alive && q.team === 0 && (!t.type || q.type === t.type));
      const r = u ? H.regions.find((q) => q.id === 'unit' && q.arg === u.id) : H.rects.roster;
      if (r) box = [r.x, r.y, r.w, r.h];
    } else if (t.kind === 'sector') {
      const sec = S.field.sectors.find((q) => q.id === t.id);
      const px = BL.render.sx(sec.x), py = BL.render.sy(sec.y, BL.heightAt(S.field, sec.x, sec.y));
      box = [px - 30, py - 62, 60, 74];
    }
    if (box) {
      ctx.strokeStyle = `rgba(206,90,76,${0.55 + pulse * 0.45})`; ctx.lineWidth = 2;
      ctx.strokeRect(box[0] - 3 - pulse * 3, box[1] - 3 - pulse * 3, box[2] + 6 + pulse * 6, box[3] + 6 + pulse * 6);
      ctx.lineWidth = 1;
    }
  }

  // ---------------------------------------------------------------- overlays

  function veil(ctx, a) { ctx.fillStyle = `rgba(2,2,2,${a})`; ctx.fillRect(0, 0, R.W, R.H); }
  function centerPanel(ctx, w, h) {
    const x = Math.round(R.W / 2 - w / 2), y = Math.round(R.H / 2 - h / 2);
    panel(ctx, x, y, w, h);
    return { x, y };
  }

  function drawPause(ctx, G) {
    veil(ctx, 0.55);
    H.regions.length = 0;
    const bh = R.H < 500 ? 36 : 42, w = 280;
    const items = [
      ['resume', 'RESUME', true],
      ['restart', G.mission.num ? 'RESTART MISSION' : 'RESTART BATTLE'],
      ['sound', 'SOUND  ' + (BL.audio.enabled ? 'ON' : 'OFF')],
      ['quit', G.mission.num ? 'ABANDON MISSION' : 'QUIT TO TITLE'],
    ];
    const h = 52 + items.length * (bh + 8) + 8;
    const p = centerPanel(ctx, w, h);
    text(ctx, 'PAUSED', p.x + 18, p.y + 31, { size: 18, weight: 600, spacing: 4 });
    items.forEach(([id, label, primary], i) => button(ctx, p.x + 16, p.y + 48 + i * (bh + 8), w - 32, bh, label, 'menu', id, { primary }));
  }

  function star(ctx, cx, cy, r, filled, col) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; i ? ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    ctx.closePath(); ctx.strokeStyle = col || PAL.ink; ctx.lineWidth = 1;
    if (filled) { ctx.fillStyle = col || PAL.ink; ctx.fill(); }
    ctx.stroke();
  }
  const clock = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

  function drawDebrief(ctx, G) {
    const S = G.S, M = G.mission;
    G.debriefT = (G.debriefT || 0) + G.frameDt;
    const k = clamp(G.debriefT / 0.8, 0, 1);
    veil(ctx, 0.6 * k);
    if (k < 0.4) return;
    H.regions.length = 0;
    const W = R.W, Hh = R.H;
    const win = S.winner === 0, camp = !!M.num;
    const fresh = G.fresh && G.fresh.length ? G.fresh : null;
    const pw = Math.min(W - 2 * pad(), fresh ? 760 : 440), ph = Math.min(Hh - 20, 340);
    const p = centerPanel(ctx, pw, ph);
    const x = p.x + 22;
    let y = p.y + 30;
    text(ctx, camp ? `OPERATION BLACK RAIN · ${M.num}  ${M.name}` : 'SKIRMISH · THE VALLEY', x, y, { size: 11, color: DIM, weight: 600, spacing: 2 });
    text(ctx, camp ? (win ? 'MISSION COMPLETE' : 'MISSION FAILED') : (win ? 'THE EASTERN LINE BREAKS' : 'OUR LINE BREAKS'), x, y + 30, { size: 26, weight: 600, spacing: 2, color: win ? PAL.ink : PAL.red });
    y += 50;
    const st = S.teams[0].stats, en = S.teams[1].stats;
    const tEnd = S.endT || S.t;
    if (camp) {
      for (let i = 0; i < 3; i++) star(ctx, x + 12 + i * 30, y + 12, 11, G.debriefT > 0.9 + i * 0.45 && i < G.stars, i < G.stars ? PAL.ink : FAINT);
      y += 36;
      [['OBJECTIVE', win ? 'DONE' : 'NOT MET', win], [`LOSSES ≤ ${M.maxLoss}`, String(st.lost), win && st.lost <= M.maxLoss], [`TIME ≤ ${clock(M.par + 25)}`, clock(tEnd), win && tEnd <= M.par + 25]].forEach((c, i) => {
        text(ctx, c[0], x, y + i * 18, { size: 12, color: c[2] ? PAL.ink : DIM, weight: 600, spacing: 1 });
        text(ctx, c[1], x + 160, y + i * 18, { size: 12, color: DIM, weight: 600 });
      });
      y += 3 * 18 + 6;
    }
    text(ctx, `ENEMY LOSSES ${en.lost}  ·  VEHICLES DESTROYED ${st.vehKills}  ·  TIME ${clock(tEnd)}`, x, y + 4, { size: 11, color: DIM, weight: 600, spacing: 1 });
    const idx = camp ? BL.campaign.MISSIONS.indexOf(M) : -1;
    const items = [];
    if (camp && win && idx < BL.campaign.MISSIONS.length - 1) items.push(['next', 'NEXT  ' + BL.campaign.MISSIONS[idx + 1].name, true]);
    items.push(['restart', win ? 'PLAY AGAIN' : 'RETRY', !items.length]);
    items.push([camp ? 'campaign' : 'quit', camp ? 'CAMPAIGN' : 'TITLE']);
    const bh = 34, by = p.y + ph - 18 - bh;
    let bx = x;
    for (const [id, label, primary] of items) {
      const bw = measure(ctx, label, 14, 600, 1.5) + 36;
      button(ctx, bx, by, bw, bh, label, 'menu', id, { primary });
      bx += bw + 8;
    }
    if (fresh && G.debriefT > 1.6) {
      const a = clamp((G.debriefT - 1.6) / 0.6, 0, 1);
      const rx = p.x + Math.max(390, pw * 0.53);
      ctx.fillStyle = PAL.line; ctx.fillRect(rx - 18, p.y + 18, 1, ph - 36);
      BL.cinema.drawDossier(ctx, fresh[0], a, rx, 'UNLOCKED', p.y + 30);
      if (fresh[1]) text(ctx, '+ ' + (BL.UNITS[fresh[1]] || BL.SUPPORT[fresh[1]]).name, rx, p.y + ph - 22, { size: 13, color: `rgba(235,228,210,${a})`, weight: 600, spacing: 1 });
    } else if (camp && win && idx === BL.campaign.MISSIONS.length - 1) {
      const rk = BL.campaign.rank(G.progress);
      text(ctx, `OPERATION COMPLETE · RANK ${rk.name} · ★ ${rk.total}/${rk.max}`, x, by - 14, { size: 12, color: PAL.red, weight: 600, spacing: 1.5 });
    }
  }

  // ---------------------------------------------------------------- title and campaign

  function leftShade(ctx, w) {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(2,2,2,0.9)'); g.addColorStop(1, 'rgba(2,2,2,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, R.W, R.H);
  }

  function drawTitle(ctx, G) {
    H.regions.length = 0;
    const P = pad() + 12, W = R.W, Hh = R.H;
    leftShade(ctx, Math.min(W * 0.6, 620));
    const big = clamp(Math.min(W * 0.065, Hh * 0.13), 38, 80);
    const y = Hh * 0.2 + big * 0.6;
    text(ctx, 'BLACKLINE', P, y, { size: big, weight: 600, spacing: big * 0.14 });
    ctx.fillStyle = PAL.red; ctx.fillRect(P + 2, y + 12, 40, 3);
    text(ctx, 'FRONTLINES', P + 52, y + 18, { size: clamp(big * 0.28, 12, 20), color: DIM, weight: 600, spacing: 6 });
    const rk = BL.campaign.rank(G.progress);
    text(ctx, `RANK  ${rk.name}     ★ ${rk.total} / ${rk.max}`, P + 2, y + 44, { size: 12, color: DIM, weight: 600, spacing: 2 });
    const open = BL.campaign.skirmishOpen(G.progress);
    const bw = clamp(W * 0.28, 240, 330), bh = Hh < 500 ? 38 : 44, gap = 8;
    let by = y + 60;
    button(ctx, P, by, bw, bh, 'CAMPAIGN', 'menu', 'campaign', { primary: true, left: true });
    by += bh + gap;
    button(ctx, P, by, bw, bh, open ? 'SKIRMISH' : 'SKIRMISH — WIN MISSION 01 FIRST', 'menu', 'skirmish', { left: true, disabled: !open });
    by += bh + gap;
    const half = (bw - gap) / 2;
    button(ctx, P, by, half, bh, G.difficulty === 'recruit' ? 'RECRUIT' : 'VETERAN', 'menu', 'difficulty', { size: 13 });
    button(ctx, P + half + gap, by, half, bh, 'SOUND ' + (BL.audio.enabled ? 'ON' : 'OFF'), 'menu', 'sound', { size: 13 });
    text(ctx, 'THE BATTLE BEHIND THIS MENU IS LIVE', P, Hh - 16, { size: 10, color: FAINT, weight: 600, spacing: 2 });
  }

  function wrap(ctx, s, maxW, size, weight) {
    const out = []; let line = '';
    for (const w of s.split(' ')) {
      const t = line ? line + ' ' + w : w;
      if (measure(ctx, t, size, weight, 0.5) > maxW && line) { out.push(line); line = w; } else line = t;
    }
    if (line) out.push(line);
    return out;
  }

  function drawCampaign(ctx, G) {
    H.regions.length = 0;
    const C = BL.campaign;
    const P = pad() + 12, W = R.W, Hh = R.H;
    veil(ctx, 0.35);
    leftShade(ctx, Math.min(W * 0.85, 960));
    const small = Hh < 500;
    const top = small ? 24 : Math.max(40, Hh * 0.1);
    text(ctx, 'OPERATION', P, top, { size: 11, color: DIM, weight: 600, spacing: 4 });
    text(ctx, 'BLACK RAIN', P, top + 28, { size: small ? 24 : 32, weight: 600, spacing: 4 });
    const rk = C.rank(G.progress);
    text(ctx, `RANK ${rk.name}  ·  ★ ${rk.total}/${rk.max}`, P + (small ? 150 : 200), top + 26, { size: 11, color: DIM, weight: 600, spacing: 2 });
    const lw = clamp(W * 0.3, 220, 320), rowH = small ? 40 : 50, gap = 6;
    const ly = top + 42;
    C.MISSIONS.forEach((M, i) => {
      const y = ly + i * (rowH + gap);
      const open = C.missionOpen(G.progress, i), sel = G.campSel === i;
      ctx.fillStyle = sel ? 'rgba(235,228,210,0.12)' : 'rgba(8,8,8,0.72)'; ctx.fillRect(P, y, lw, rowH);
      ctx.strokeStyle = sel ? PAL.ink : 'rgba(235,228,210,0.25)'; ctx.strokeRect(P + 0.5, y + 0.5, lw - 1, rowH - 1);
      if (sel) { ctx.fillStyle = PAL.ink; ctx.fillRect(P, y, 3, rowH); }
      text(ctx, M.num, P + 14, y + rowH / 2 + 1, { size: 15, base: 'middle', weight: 600, color: open ? PAL.red : FAINT });
      text(ctx, M.name, P + 42, y + rowH / 2 + 1, { size: 15, base: 'middle', weight: 600, spacing: 1.5, color: open ? PAL.ink : FAINT });
      if (open) { const n = G.progress.stars[M.id] || 0; for (let s = 0; s < 3; s++) star(ctx, P + lw - 54 + s * 16, y + rowH / 2, 5.5, s < n, s < n ? PAL.ink : FAINT); }
      else { const lx = P + lw - 22, lyy = y + rowH / 2; ctx.strokeStyle = FAINT; ctx.lineWidth = 1.2; ctx.strokeRect(lx - 5, lyy - 1, 10, 7); ctx.beginPath(); ctx.arc(lx, lyy - 1, 3.5, Math.PI, 0); ctx.stroke(); }
      region(P, y, lw, rowH, 'mission', i);
    });
    const rh = 5 * (rowH + gap) - gap;
    button(ctx, P, ly + rh + 8, 110, small ? 30 : 36, 'BACK', 'back', null, {});
    const M = C.MISSIONS[G.campSel];
    const open = C.missionOpen(G.progress, G.campSel);
    const rx = P + lw + 14, rw = Math.min(W - rx - pad(), 500);
    panel(ctx, rx, ly, rw, rh);
    let y = ly + 22;
    text(ctx, `${M.time}  ·  ${M.place}  ·  ${M.sky}`, rx + 16, y, { size: 11, color: DIM, weight: 600, spacing: 2 });
    text(ctx, M.name, rx + 16, y + 28, { size: small ? 22 : 28, weight: 600, spacing: 2 });
    y += 50;
    const lines = wrap(ctx, M.summary, rw - 32, 15, 500);
    lines.forEach((l, i) => text(ctx, l, rx + 16, y + i * 19, { size: 15, weight: 500 }));
    y += lines.length * 19 + 6;
    if (!small) for (const b of M.brief.slice(1, 3)) for (const l of wrap(ctx, b, rw - 32, 13, 400)) { text(ctx, l, rx + 16, y, { size: 13, color: DIM, weight: 400 }); y += 17; }
    y += 4;
    if (M.intro && M.intro.length) {
      text(ctx, 'NEW IN THIS MISSION', rx + 16, y + 6, { size: 10, color: PAL.red, weight: 600, spacing: 2 });
      M.intro.forEach((kk, i) => { unitIcon(ctx, kk, rx + 34 + i * 120, y + 26, 1.1, PAL.ink); text(ctx, (BL.UNITS[kk] || BL.SUPPORT[kk]).short, rx + 56 + i * 120, y + 31, { size: 13, weight: 600, spacing: 1 }); });
      y += 42;
    }
    if (M.unlocks.length && y < ly + rh - 60) text(ctx, 'VICTORY UNLOCKS  ' + M.unlocks.map((kk) => (BL.UNITS[kk] || BL.SUPPORT[kk]).short).join(' · '), rx + 16, y + 6, { size: 11, color: DIM, weight: 600, spacing: 1.5 });
    const bh = small ? 34 : 40;
    if (open) button(ctx, rx + 16, ly + rh - bh - 12, 180, bh, 'BEGIN MISSION', 'begin', null, { primary: true });
    else text(ctx, `WIN ${C.MISSIONS[G.campSel - 1].num} ${C.MISSIONS[G.campSel - 1].name} TO OPEN THIS MISSION`, rx + 16, ly + rh - 22, { size: 12, color: DIM, weight: 600, spacing: 1 });
  }

  function drawRotate(ctx) {
    ctx.fillStyle = '#030303'; ctx.fillRect(0, 0, R.W, R.H);
    text(ctx, 'TURN YOUR PHONE SIDEWAYS', R.W / 2, R.H / 2, { size: 16, align: 'center', weight: 600, spacing: 2 });
    text(ctx, 'BLACKLINE PLAYS IN LANDSCAPE', R.W / 2, R.H / 2 + 22, { size: 12, align: 'center', color: DIM, weight: 600, spacing: 2 });
  }

  H.drawBattle = drawBattle;
  H.drawDebrief = drawDebrief;
  H.drawCampaign = drawCampaign;
  H.drawTitle = drawTitle;
  H.drawRotate = drawRotate;
  H.hit = hit;
  H.unitIcon = unitIcon;
  BL.hud = H;
})();
