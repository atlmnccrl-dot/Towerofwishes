// BLACKLINE — units in the angled view. Soldiers are small upright figures; vehicles are
// extruded line-art solids (friendly: cream tops, black inner lines; enemy: hollow outlines
// with a muted red mark); helicopters fly over their dotted shadows under a turning rotor disc.
(function () {
  const BL = window.BL;
  const { R, PAL, clamp, heightAt } = BL;
  const { sx, sy, hash, jpath, K } = BL.render;

  const FIG = 1.4; // soldiers are drawn a little larger than life so they read at a glance
  let ctx = null;

  // Top-view shapes, local units: +x forward, +y to the right.
  const SH = {
    tank: {
      tracks: [[-25, -13, 25, -7], [-25, 7, 25, 13]],
      hull: [[-23, -9], [20, -9], [24, -5], [24, 5], [20, 9], [-23, 9]], hull0: 6, hull1: 13,
      turret: [[-10, -7], [3, -7], [8, -3], [8, 3], [3, 7], [-10, 7]], t0: 13, t1: 18, tx: -3,
      barrel: 26, barrelZ: 15.5,
    },
    apc: {
      wheels: [-13, -4.5, 4.5, 13], wy: 10,
      hull: [[-19, -9], [9, -9], [19, -5], [19, 5], [9, 9], [-19, 9]], hull0: 3, hull1: 13,
      turret: [[-5, -4], [4, -4], [5, 0], [4, 4], [-5, 4]], t0: 13, t1: 16, tx: -2,
      barrel: 14, barrelZ: 14.5,
    },
    heli: {
      body: [[31, 0], [26, -4], [10, -5], [-6, -4.5], [-14, -2], [-38, -1.2], [-38, 1.2], [-14, 2], [-6, 4.5], [10, 5], [26, 4]].reverse(),
      wing: [[-3, -12], [6, -12], [6, 12], [-3, 12]], rotor: 34, tail: [-38, 0],
    },
    transport: {
      body: [[30, 0], [25, -6], [8, -9], [-14, -8], [-20, -3], [-42, -1.4], [-42, 1.4], [-20, 3], [-14, 8], [8, 9], [25, 6]].reverse(),
      rotor: 37, tail: [-42, 0],
    },
  };

  const lw = (k) => clamp(R.cam.z * 0.6, 0.6, 1.5) * (k || 1);

  function style(team, wreck) {
    if (wreck) return { top: '#070707', side: '#050505', line: 'rgba(200,194,180,0.45)', detail: 'rgba(200,194,180,0.25)', mark: null };
    return team === 0
      ? { top: PAL.cream, side: '#0b0b0b', line: PAL.cream, detail: '#0a0a0a', mark: null }
      : { top: '#060606', side: '#040404', line: PAL.foe, detail: 'rgba(189,182,168,0.55)', mark: PAL.red };
  }

  // local (fx, fy) at height h → screen
  function L2S(m, heading, fx, fy, h) {
    const c = Math.cos(heading), s = Math.sin(heading);
    const x = m.x + fx * c - fy * s, y = m.y + fx * s + fy * c;
    return [sx(x), sy(y, h)];
  }

  // An extruded polygon: visible side faces (facing the camera), then the top face.
  function prism(m, heading, poly, z0, z1, st, seed) {
    const n = poly.length;
    const bot = poly.map((p) => L2S(m, heading, p[0], p[1], m.z + z0));
    const top = poly.map((p) => L2S(m, heading, p[0], p[1], m.z + z1));
    const c = Math.cos(heading), s = Math.sin(heading);
    ctx.lineWidth = lw();
    ctx.lineJoin = 'round';
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const ex = poly[j][0] - poly[i][0], ey = poly[j][1] - poly[i][1];
      // outward normal in world space (polygons wind clockwise in local space)
      const nx = (ey * c + ex * s), ny = (ey * s - ex * c);
      if (-ny >= 0) continue; // faces away (north)
      ctx.beginPath();
      ctx.moveTo(bot[i][0], bot[i][1]); ctx.lineTo(bot[j][0], bot[j][1]);
      ctx.lineTo(top[j][0], top[j][1]); ctx.lineTo(top[i][0], top[i][1]); ctx.closePath();
      ctx.fillStyle = st.side; ctx.fill();
      ctx.strokeStyle = st.line; ctx.stroke();
    }
    const flat = [];
    for (const p of top) flat.push(p[0], p[1]);
    jpath(ctx, flat, seed, 0.6, true);
    ctx.fillStyle = st.top; ctx.fill();
    ctx.strokeStyle = st.line; ctx.stroke();
    return top;
  }

  // ---------------------------------------------------------------- vehicles

  function drawGround(m, type, team, opts) {
    const sh = SH[type];
    const st = style(team, opts.wreck);
    const hd = m.heading;
    const seed = (opts.seed || 1) * 13;
    if (sh.tracks) {
      for (const [x0, y0, x1, y1] of sh.tracks) prism(m, hd, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], 0, 7, { ...st, top: st.side }, seed);
      // track links scroll with speed
      ctx.strokeStyle = st.line === PAL.cream ? 'rgba(231,223,201,0.7)' : st.detail;
      ctx.lineWidth = lw(0.7);
      ctx.beginPath();
      const off = ((m.track || 0) % 4 + 4) % 4;
      for (const [x0, y0, , y1] of sh.tracks) for (let x = x0 + off; x < 25; x += 4) {
        const a = L2S(m, hd, x, y0, m.z + 7), b = L2S(m, hd, x, y1, m.z + 7);
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      }
      ctx.stroke();
    }
    if (sh.wheels) {
      for (const wx_ of sh.wheels) for (const side of [-1, 1]) {
        const p = L2S(m, hd, wx_, side * sh.wy, m.z + 3.4);
        ctx.fillStyle = '#060606'; ctx.strokeStyle = st.line; ctx.lineWidth = lw();
        ctx.beginPath(); ctx.ellipse(p[0], p[1], 3.4 * R.cam.z, 3.4 * R.cam.z * 0.8, 0, 0, 6.283); ctx.fill(); ctx.stroke();
      }
    }
    const top = prism(m, hd, sh.hull, sh.hull0, sh.hull1, st, seed + 1);
    // deck details
    ctx.strokeStyle = st.detail; ctx.lineWidth = lw(0.8);
    ctx.beginPath();
    const d1 = L2S(m, hd, -20, -5, m.z + sh.hull1), d2 = L2S(m, hd, -20, 5, m.z + sh.hull1);
    const d3 = L2S(m, hd, -15, -5, m.z + sh.hull1), d4 = L2S(m, hd, -15, 5, m.z + sh.hull1);
    ctx.moveTo(d1[0], d1[1]); ctx.lineTo(d2[0], d2[1]); ctx.moveTo(d3[0], d3[1]); ctx.lineTo(d4[0], d4[1]);
    ctx.stroke();
    if (st.mark) {
      ctx.strokeStyle = st.mark; ctx.lineWidth = lw(1.2);
      const a = L2S(m, hd, 10, -6, m.z + sh.hull1), b = L2S(m, hd, 10, 6, m.z + sh.hull1);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    // turret turns on its own heading
    const wp = m.weapons ? m.weapons[0] : null;
    const ta = wp ? wp.aim : hd + (opts.wreck ? 0.6 : 0);
    const tc = Math.cos(hd), ts = Math.sin(hd);
    const tm = { x: m.x + sh.tx * tc, y: m.y + sh.tx * ts, z: m.z };
    // barrel behind the turret when it points north
    const barrelBehind = Math.sin(ta) < 0;
    const drawBarrel = () => {
      const rc = (m.recoil || 0) * 4;
      const a = L2S(tm, ta, 6 - rc, -1, m.z + sh.barrelZ), b = L2S(tm, ta, sh.barrel - rc, -1, m.z + sh.barrelZ);
      const c2 = L2S(tm, ta, sh.barrel - rc, 1, m.z + sh.barrelZ), d = L2S(tm, ta, 6 - rc, 1, m.z + sh.barrelZ);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c2[0], c2[1]); ctx.lineTo(d[0], d[1]); ctx.closePath();
      ctx.fillStyle = st.top; ctx.fill(); ctx.strokeStyle = st.line; ctx.lineWidth = lw(); ctx.stroke();
    };
    if (barrelBehind) drawBarrel();
    prism(tm, ta, sh.turret, sh.t0, sh.t1, st, seed + 3);
    if (!barrelBehind) drawBarrel();
    // antenna whip
    const ant = L2S(tm, ta, -7, 4, m.z + sh.t1);
    const sway = Math.sin(R.time * 5 + seed) * 2;
    ctx.strokeStyle = team === 0 && !opts.wreck ? 'rgba(231,223,201,0.85)' : st.line;
    ctx.lineWidth = lw(0.8);
    ctx.beginPath(); ctx.moveTo(ant[0], ant[1]); ctx.quadraticCurveTo(ant[0] + sway * 0.3, ant[1] - 8 * R.cam.z, ant[0] + sway, ant[1] - 16 * R.cam.z); ctx.stroke();
  }

  // ---------------------------------------------------------------- helicopters

  function drawHeli(m, type, team, opts) {
    const sh = SH[type];
    const st = style(team, opts.wreck);
    const z = R.cam.z;
    const alt = m.alt != null ? m.alt : m.z;
    const g = heightAt(BL.__field, m.x, m.y);
    // dotted shadow on the ground
    if (!opts.wreck) {
      ctx.fillStyle = 'rgba(235,228,210,0.25)';
      const r = (type === 'transport' ? 30 : 26) * z;
      for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283; ctx.fillRect(sx(m.x) + Math.cos(a) * r, sy(m.y, g) + Math.sin(a) * r * K, 1.2, 1.2); }
    }
    const hm = { x: m.x, y: m.y, z: alt - 4 };
    const hd = m.heading + (opts.spin || 0);
    prism(hm, hd, sh.body, 0, 7, st, (opts.seed || 1) * 17);
    if (sh.wing) {
      prism(hm, hd, sh.wing, 1.5, 3, st, (opts.seed || 1) * 19);
      // rocket pods at the wing tips
      ctx.fillStyle = st.line;
      for (const side of [-1, 1]) { const p = L2S(hm, hd, 2, side * 11, hm.z + 1); ctx.fillRect(p[0] - 1.5, p[1] - 1, 3, 2); }
    }
    // canopy line and the red marking
    ctx.strokeStyle = st.detail; ctx.lineWidth = lw(0.8);
    const c1 = L2S(hm, hd, 24, -2.5, hm.z + 7), c2 = L2S(hm, hd, 8, -2.5, hm.z + 7), c3 = L2S(hm, hd, 8, 2.5, hm.z + 7), c4 = L2S(hm, hd, 24, 2.5, hm.z + 7);
    ctx.beginPath(); ctx.moveTo(c1[0], c1[1]); ctx.lineTo(c2[0], c2[1]); ctx.lineTo(c3[0], c3[1]); ctx.lineTo(c4[0], c4[1]); ctx.stroke();
    if (team === 0 && !opts.wreck) { const p = L2S(hm, hd, -20, 0, hm.z + 7); ctx.fillStyle = PAL.red; ctx.fillRect(p[0] - 1.5, p[1] - 1.5, 3, 3); }
    else if (st.mark) { ctx.strokeStyle = st.mark; const a = L2S(hm, hd, -22, -1, hm.z + 7), b = L2S(hm, hd, -14, -1, hm.z + 7); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    if (opts.wreck) return;
    // rotor disc and blades
    const cx = sx(m.x), cy = sy(m.y, alt + 9);
    const rr = sh.rotor * z;
    ctx.strokeStyle = 'rgba(235,228,210,0.25)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.ellipse(cx, cy, rr, rr * K, 0, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = 'rgba(235,228,210,0.9)'; ctx.lineWidth = lw(0.9);
    ctx.beginPath();
    for (let k = 0; k < 2; k++) {
      const a = (m.rotor || 0) + k * Math.PI / 2;
      ctx.moveTo(cx - Math.cos(a) * rr, cy - Math.sin(a) * rr * K); ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * K);
    }
    ctx.stroke();
    const tp = L2S(hm, hd, sh.tail[0], 0, hm.z + 5);
    ctx.strokeStyle = 'rgba(235,228,210,0.6)';
    ctx.beginPath(); ctx.arc(tp[0], tp[1], 4 * z, 0, 6.283); ctx.stroke();
  }

  // ---------------------------------------------------------------- soldiers

  function drawSoldier(m, team, dead, alpha) {
    const z = R.cam.z;
    const s = z * FIG;
    const X = sx(m.x) + (m.flinch > 0 ? (Math.random() - 0.5) * s : 0);
    const Y = sy(m.y, m.z);
    const col = team === 0 ? PAL.ink : PAL.foe;
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.strokeStyle = col; ctx.fillStyle = col;
    if (9 * s < 5 && !dead) {
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X, Y - Math.max(3, 9 * s)); ctx.stroke();
      if (team === 1) { ctx.fillStyle = PAL.red; ctx.fillRect(X - 0.6, Y - Math.max(3, 9 * s) - 1.2, 1.4, 1.4); }
      ctx.globalAlpha = 1;
      return;
    }
    ctx.lineWidth = lw(0.95);
    ctx.lineCap = 'round';
    const f = m.face || (Math.cos(m.dir || 0) >= 0 ? 1 : -1);
    const stance = dead ? 'dead' : m.stance;
    let head;
    ctx.beginPath();
    if (stance === 'stand') {
      const sw = m.moving ? Math.sin(m.phase) * 2.3 : 0.7;
      const bob = m.moving ? Math.abs(Math.cos(m.phase)) * 0.4 : 0;
      const hipY = Y - (4.2 + bob) * s;
      ctx.moveTo(X + sw * s, Y); ctx.lineTo(X, hipY); ctx.lineTo(X - sw * s, Y);
      ctx.moveTo(X, hipY); ctx.lineTo(X + f * 0.5 * s, Y - (7 + bob) * s);
      ctx.moveTo(X + f * 0.5 * s, Y - (6.8 + bob) * s); ctx.lineTo(X + f * 2.6 * s, Y - (6.1 + bob) * s);
      head = [X + f * 0.7 * s, Y - (8.4 + bob) * s];
      ctx.stroke();
      weapon(X, Y - bob * s, f, s, m.wkey, 6.5);
    } else if (stance === 'crouch') {
      ctx.moveTo(X + f * 2 * s, Y); ctx.lineTo(X + f * 1.7 * s, Y - 2.8 * s); ctx.lineTo(X - f * 0.4 * s, Y - 2.6 * s);
      ctx.lineTo(X - f * 1.4 * s, Y - 0.3 * s); ctx.lineTo(X - f * 3 * s, Y);
      ctx.moveTo(X - f * 0.4 * s, Y - 2.6 * s); ctx.lineTo(X + f * 0.7 * s, Y - 5.3 * s);
      ctx.moveTo(X + f * 0.7 * s, Y - 5.1 * s); ctx.lineTo(X + f * 2.8 * s, Y - 4.7 * s);
      head = [X + f * 1.2 * s, Y - 6.6 * s];
      ctx.stroke();
      weapon(X, Y, f, s, m.wkey, 4.9);
    } else if (stance === 'prone') {
      ctx.moveTo(X - f * 5.5 * s, Y - 0.5 * s); ctx.lineTo(X - f * 3 * s, Y - 0.9 * s);
      ctx.moveTo(X - f * 5.5 * s, Y - 1.3 * s); ctx.lineTo(X - f * 3 * s, Y - 0.9 * s);
      ctx.lineTo(X + f * 2.4 * s, Y - 1.4 * s);
      head = [X + f * 3.6 * s, Y - 2 * s];
      ctx.stroke();
      weapon(X, Y, f, s, m.wkey, 1.6);
    } else {
      ctx.moveTo(X - f * 4.5 * s, Y - 0.4 * s); ctx.lineTo(X + f * 2.6 * s, Y - 0.7 * s);
      ctx.moveTo(X - f * 4.5 * s, Y - 0.4 * s); ctx.lineTo(X - f * 6 * s, Y - 1.5 * s);
      head = [X + f * 3.7 * s, Y - 1 * s];
      ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(head[0], head[1], 1.15 * s, 0, 6.283); ctx.fill();
    if (team === 1) { ctx.fillStyle = PAL.red; ctx.fillRect(head[0] - 0.8 * s, head[1] - 1.3 * s, 1.6 * s, 0.8 * s); }
    ctx.globalAlpha = 1;
  }

  function weapon(X, Y, f, s, wk, y) {
    ctx.beginPath();
    if (wk === 'at' && y > 2) { ctx.lineWidth = lw(1.8); ctx.moveTo(X - f * 3.2 * s, Y - (y + 1) * s); ctx.lineTo(X + f * 4 * s, Y - (y + 1.2) * s); }
    else if (wk === 'mg') { ctx.lineWidth = lw(1.6); ctx.moveTo(X - f * 1.5 * s, Y - y * s); ctx.lineTo(X + f * 6.2 * s, Y - (y + 0.2) * s); }
    else { const Lw = wk === 'dmr' ? 6.6 : 5.2; ctx.moveTo(X - f * 1.3 * s, Y - y * s); ctx.lineTo(X + f * Lw * s, Y - (y + 0.3) * s); }
    ctx.stroke();
    ctx.lineWidth = lw(0.95);
  }

  function rappeller(x, y, zz, team) {
    const s = R.cam.z * FIG;
    const X = sx(x), Y = sy(y, zz);
    ctx.strokeStyle = team === 0 ? PAL.ink : PAL.foe; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = lw(0.95);
    ctx.beginPath();
    ctx.moveTo(X, Y - s); ctx.lineTo(X + 0.6 * s, Y - 6 * s);
    ctx.moveTo(X, Y - s); ctx.lineTo(X + 3 * s, Y + 1.5 * s);
    ctx.moveTo(X, Y - s); ctx.lineTo(X + 2.4 * s, Y + 2.6 * s);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(X + s, Y - 7.3 * s, 1.1 * s, 0, 6.283); ctx.fill();
  }

  // ---------------------------------------------------------------- markers (zoomed out)

  function marker(px, py, type, team, sel) {
    const col = team === 0 ? PAL.ink : PAL.red;
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = sel ? 1.6 : 1;
    const w = 14, h = 9;
    const X = Math.round(px) + 0.5, Y = Math.round(py) + 0.5;
    ctx.beginPath();
    if (type === 'heli') { ctx.moveTo(X - w / 2, Y - h / 2); ctx.lineTo(X + w / 2, Y + h / 2); ctx.lineTo(X + w / 2, Y - h / 2); ctx.lineTo(X - w / 2, Y + h / 2); ctx.closePath(); }
    else {
      ctx.rect(X - w / 2, Y - h / 2, w, h);
      if (type === 'rifle' || type === 'mg') { ctx.moveTo(X - w / 2, Y - h / 2); ctx.lineTo(X + w / 2, Y + h / 2); ctx.moveTo(X + w / 2, Y - h / 2); ctx.lineTo(X - w / 2, Y + h / 2); }
      if (type === 'scout') { ctx.moveTo(X - w / 2, Y + h / 2); ctx.lineTo(X + w / 2, Y - h / 2); }
      if (type === 'tank' || type === 'apc') ctx.ellipse(X, Y, w * 0.3, h * 0.24, 0, 0, 7);
      if (type === 'apc') { ctx.moveTo(X - w / 2, Y - h / 2); ctx.lineTo(X + w / 2, Y + h / 2); }
    }
    ctx.stroke();
    if (type === 'mg') ctx.fillRect(X - 1, Y - h / 2 - 3, 2, 2);
    if (sel) { ctx.beginPath(); ctx.moveTo(X - 11, Y + 9); ctx.lineTo(X + 11, Y + 9); ctx.stroke(); }
  }

  // ---------------------------------------------------------------- frame

  function drawAll(c, S, opts) {
    ctx = c;
    BL.__field = S.field;
    const z = R.cam.z;
    const vr = BL.render.viewRect(120);
    const inView = (x, y) => x > vr.x0 && x < vr.x1 && y > vr.y0 && y < vr.y1;
    const viewTeam = opts.viewTeam;
    const sel = opts.selected || new Set();

    // selection rings and order paths sit on the ground, under everything
    if (opts.selected) for (const u of S.units) if (sel.has(u.id) && u.alive) ground(u, S);

    for (const k of S.corpses) {
      if (!inView(k.x, k.y)) continue;
      const age = S.t - k.t;
      if (age > 90) continue;
      drawSoldier({ x: k.x, y: k.y, z: heightAt(S.field, k.x, k.y), face: Math.cos(k.dir) >= 0 ? 1 : -1 }, k.team, true, 0.5 * (1 - age / 90));
    }
    // everything else in depth order
    const list = [];
    for (const w of S.wrecks) if (inView(w.x, w.y)) list.push({ y: w.y, d: () => {
      const m = { x: w.x, y: w.y, z: heightAt(S.field, w.x, w.y), heading: w.heading, alt: heightAt(S.field, w.x, w.y) + 2 };
      if (w.type === 'heli') drawHeli(m, 'heli', w.team, { wreck: true, seed: 3 }); else drawGround(m, w.type, w.team, { wreck: true, seed: 5 });
    } });
    const showFig = z > 0.42;
    const markers = [];
    for (const u of S.units) {
      const seen = viewTeam < 0 || u.team === viewTeam || BL.visible(S, viewTeam, u);
      if (!seen || !inView(u.x, u.y)) continue;
      if (z < 0.75) markers.push(u);
      if (!showFig) continue;
      if (u.kind === 'inf') { for (const m of u.members) if (m.alive && !m.rappel) list.push({ y: m.y, d: () => drawSoldier(m, u.team) }); }
      else if (u.kind === 'veh') { const m = u.members[0]; if (m.alive) list.push({ y: m.y, d: () => drawGround(m, u.type, u.team, { seed: u.id }) }); }
      else { const m = u.members[0]; if (m.alive) list.push({ y: m.y + 400, d: () => drawHeli(m, 'heli', u.team, { seed: u.id }) }); }
    }
    for (const tr of S.transports) {
      if (!inView(tr.x, tr.y) || !showFig) continue;
      list.push({ y: tr.y + 400, d: () => {
        const hover = tr.phase === 'hover' || (tr.phase === 'out' && tr.t < 0.6);
        if (hover) {
          const g = heightAt(S.field, tr.x, tr.y);
          ctx.strokeStyle = 'rgba(235,228,210,0.8)'; ctx.lineWidth = lw(0.8);
          const sway = Math.sin(R.time * 2.3) * 3 + BL.ground.WX.wind * 4;
          ctx.beginPath(); ctx.moveTo(sx(tr.x), sy(tr.y, tr.alt - 6)); ctx.quadraticCurveTo(sx(tr.x) + sway, sy(tr.y, (tr.alt + g) / 2), sx(tr.x) + sway * 0.4, sy(tr.y, g)); ctx.stroke();
          for (const s of tr.unit.members) if (s.alive && s.rappel && s.rappel.stage === 'down') rappeller(tr.x, tr.y, s.rappel.z, tr.team);
        }
        drawHeli({ x: tr.x, y: tr.y, z: tr.alt, alt: tr.alt, heading: tr.heading, rotor: tr.rotor }, 'transport', tr.team, { seed: 77 });
      } });
    }
    list.sort((a, b) => a.y - b.y);
    for (const it of list) it.d();

    if (markers.length) {
      ctx.globalAlpha = clamp((0.75 - z) / 0.3, 0, 1);
      for (const u of markers) {
        const m = u.members.find((k) => k.alive) || u.members[0];
        const hz = u.kind === 'air' ? m.alt : heightAt(S.field, u.x, u.y) + 20;
        marker(sx(u.x), sy(u.y, hz), u.type, u.team, sel.has(u.id));
      }
      ctx.globalAlpha = 1;
    }
  }

  // Ground ring under a selected unit and its route.
  function ground(u, S) {
    const z = R.cam.z;
    const live = u.members.filter((m) => m.alive && !m.rappel);
    if (!live.length) return;
    let cx = 0, cy = 0;
    for (const m of live) { cx += m.x; cy += m.y; }
    cx /= live.length; cy /= live.length;
    let r = 14;
    for (const m of live) r = Math.max(r, Math.hypot(m.x - cx, m.y - cy) + 10);
    if (u.kind !== 'inf') r = u.def.len * 0.65;
    const h = heightAt(S.field, cx, cy);
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.ellipse(sx(cx), sy(cy, h), r * z, r * z * K, 0, 0, 6.283); ctx.stroke();
    ctx.setLineDash([]);
    // route
    if (u.path && u.path.length) {
      ctx.strokeStyle = u.order.type === 'attack' ? 'rgba(184,67,58,0.75)' : u.order.type === 'retreat' ? 'rgba(235,228,210,0.35)' : 'rgba(235,228,210,0.6)';
      ctx.setLineDash([2, 5]);
      ctx.beginPath();
      ctx.moveTo(sx(u.x), sy(u.y, heightAt(S.field, u.x, u.y)));
      for (const p of u.path) ctx.lineTo(sx(p.x), sy(p.y, heightAt(S.field, p.x, p.y)));
      ctx.stroke();
      ctx.setLineDash([]);
      const e = u.path[u.path.length - 1];
      const ex = sx(e.x), ey = sy(e.y, heightAt(S.field, e.x, e.y));
      ctx.beginPath(); ctx.moveTo(ex - 6, ey - 3); ctx.lineTo(ex, ey + 3); ctx.lineTo(ex + 6, ey - 3); ctx.stroke();
    }
  }

  BL.units = { drawAll, drawSoldier, drawGround, drawHeli, marker, SH };
})();
