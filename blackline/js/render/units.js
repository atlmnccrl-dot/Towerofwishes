// BLACKLINE — soldiers, vehicles, helicopters, wrecks, corpses and selection marks.
// Friendly vehicles are cream-filled with black inner lines; enemy vehicles are hollow
// off-white outlines with a muted red mark. Soldiers are a few strokes each.
(function () {
  const BL = window.BL;
  const { R, PAL, clamp, heightAt } = BL;
  const { sx, sy, hash, jpath } = BL.render;

  // ---------------------------------------------------------------- shapes (local units, y up)

  const SHAPES = {
    tank: {
      tracks: [-22, 1, -24.2, 3.6, -22.5, 6.6, 22, 6.6, 24.6, 3.6, 22, 1],
      wheels: [-17, -10.2, -3.4, 3.4, 10.2, 17], wy: 3.5, wr: 2.5,
      hull: [-23.5, 6.6, -22, 11.2, 17, 11.2, 24.6, 7.4, 24, 6.6],
      details: [[-21.5, 8.4, 21, 8.4], [12, 11.2, 14, 9.2], [-20, 11.2, -20.5, 9.6]],
      pivot: [-3, 11.2],
      turret: [-11, 0, -10.4, 4.5, -6, 6.3, 5, 6.3, 10.2, 3.4, 10.6, 0],
      cupola: [-6, 6.3, -5.4, 8.2, -2, 8.2, -1.4, 6.3],
      barrel: { x: 9.6, y: 2.8, len: 24, th: 1.5 },
      antenna: [-9, 6.2],
    },
    apc: {
      wheels: [-12.5, -4.2, 4.2, 12.5], wy: 3.4, wr: 3.3,
      hull: [-17, 2.6, -19, 3.8, -19.4, 11.6, 6, 12.6, 15, 9, 19.2, 5, 17, 2.6],
      details: [[-15, 5.4, -15, 10, -10, 10, -10, 5.4, -15, 5.4], [8, 10.4, 12.5, 8.6], [-19, 7.4, 17.6, 7.4]],
      pivot: [-2, 12.6],
      turret: [-5, 0, -4.6, 3.3, 3.4, 3.3, 4.6, 0],
      barrel: { x: 4.4, y: 1.8, len: 13, th: 0.9 },
      antenna: [-4, 3],
    },
    heli: {
      body: [30.5, -2.8, 27.5, 1.8, 21, 4.6, 8, 5.2, 2, 6.6, -8, 5.2, -14, 2.2, -35.5, 1.4, -38.2, 3.6, -40.2, 3.6, -39.4, -0.6, -14, -2.6, -6, -5.6, 14, -6, 24, -5],
      canopy: [[23.2, 4.4, 18.6, 8, 12.4, 8.3, 10.2, 5.1], [10, 5.3, 6.2, 8.7, 0.4, 8.7, -1, 6.5]],
      fin: [-35.6, 1.3, -38.2, 10.2, -40.6, 10.2, -39.6, 1],
      wing: [-4, -3, -2, -5.5, 7, -5.5, 8, -3],
      pod: [-3, -6.2, -3, -9.4, 9, -9.4, 9, -6.2],
      gear: [[14, -6, 14, -9.6], [-9, -3.5, -10, -8.6]],
      mast: [2, 6.6, 2, 10.2], rotorY: 10.6, rotorL: 35, tail: [-38.8, 6.6], tailR: 5,
    },
    transport: {
      body: [31, -1, 28.5, 4, 20, 9, 10, 10.6, -10, 10.2, -16, 6, -38, 4.2, -41, 7.2, -43.4, 7.2, -42.4, 1.4, -16, -1.4, -8, -5, 16, -5.6, 26.5, -4],
      window: [26.2, 0.4, 24, 5.4, 19.4, 8.2, 17.4, 1.2],
      door: [-6.5, -4.2, -6.5, 7.6, 8, 7.6, 8, -4.6],
      skid: [[-12, -9.6, 20, -9.6, 22, -8], [-5, -5, -7, -9.6], [11, -5.4, 13, -9.6]],
      fin: [-40, 4, -42.6, 13, -44.6, 13, -43.4, 3.6],
      mast: [4, 10.6, 4, 13.4], rotorY: 13.8, rotorL: 37, tail: [-42.6, 7.5], tailR: 5.2,
    },
  };

  let ctx = null;
  function lw(mult) { return clamp(R.cam.z * 0.5, 0.55, 1.5) * (mult || 1); }

  // Local-space path drawing (under a transform). Wobble in local units.
  function lp(pts, seed, close) { jpath(ctx, pts, seed, 0.35, close); }

  function styleFor(team, wreck) {
    if (wreck) return { fill: '#060606', line: 'rgba(200,194,180,0.45)', detail: 'rgba(200,194,180,0.3)', mark: null };
    return team === 0
      ? { fill: PAL.cream, line: PAL.cream, detail: '#0a0a0a', mark: null }
      : { fill: '#050505', line: PAL.foe, detail: 'rgba(185,178,164,0.6)', mark: PAL.red };
  }

  // ---------------------------------------------------------------- ground vehicles

  function drawGroundVehicle(m, type, team, opts) {
    const sh = SHAPES[type];
    const st = styleFor(team, opts.wreck);
    const z = R.cam.z;
    const seed = (opts.seed || 1) * 13;
    ctx.save();
    ctx.translate(sx(m.x), sy(m.y));
    ctx.rotate(-(m.ang || 0));
    ctx.scale(m.face * z, -z);
    ctx.lineWidth = lw() / z;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = st.line;
    ctx.fillStyle = st.fill;

    // tracks / wheels
    if (sh.tracks) {
      lp(sh.tracks, seed, true);
      ctx.fill(); ctx.stroke();
    }
    lp(sh.hull, seed + 1, true);
    ctx.fill(); ctx.stroke();
    const spin = (m.track || 0) / sh.wr;
    ctx.strokeStyle = st.detail;
    for (const wx_ of sh.wheels) {
      ctx.beginPath();
      ctx.arc(wx_, sh.wy, sh.wr, 0, Math.PI * 2);
      if (!sh.tracks) { ctx.fillStyle = st.fill; ctx.fill(); ctx.strokeStyle = team === 0 && !opts.wreck ? '#0a0a0a' : st.line; }
      ctx.stroke();
      ctx.beginPath();
      for (let k = 0; k < 2; k++) {
        const a = -spin * m.face + k * Math.PI / 2;
        ctx.moveTo(wx_ - Math.cos(a) * sh.wr * 0.7, sh.wy - Math.sin(a) * sh.wr * 0.7);
        ctx.lineTo(wx_ + Math.cos(a) * sh.wr * 0.7, sh.wy + Math.sin(a) * sh.wr * 0.7);
      }
      ctx.stroke();
    }
    // track links scrolling
    if (sh.tracks) {
      ctx.beginPath();
      const off = (((m.track || 0) * m.face) % 3 + 3) % 3;
      for (let x = -21 + off; x < 21; x += 3) { ctx.moveTo(x, 0.9); ctx.lineTo(x + 0.8, 0.9); ctx.moveTo(x, 6.6); ctx.lineTo(x + 0.8, 6.6); }
      ctx.stroke();
    }
    ctx.strokeStyle = st.detail;
    sh.details.forEach((d, i) => { lp(d, seed + 10 + i, false); ctx.stroke(); });
    if (st.mark) {
      ctx.strokeStyle = st.mark;
      ctx.beginPath();
      ctx.moveTo(-14, sh === SHAPES.tank ? 9.8 : 9.2); ctx.lineTo(-6, sh === SHAPES.tank ? 9.8 : 9.2);
      ctx.stroke();
    }

    // turret and barrel
    const wp = m.weapons ? m.weapons[0] : null;
    let la = 0;
    if (wp) {
      const rel = wp.aim - (m.ang || 0);
      la = Math.atan2(Math.sin(rel), m.face * Math.cos(rel));
    } else if (opts.wreck) la = -0.25;
    const back = Math.cos(la) < 0;
    ctx.save();
    ctx.translate(sh.pivot[0], sh.pivot[1]);
    if (back) { ctx.scale(-1, 1); la = Math.PI - la; }
    ctx.strokeStyle = st.line;
    ctx.fillStyle = st.fill;
    lp(sh.turret, seed + 3, true);
    ctx.fill(); ctx.stroke();
    if (sh.cupola) { lp(sh.cupola, seed + 4, true); ctx.fill(); ctx.stroke(); }
    // antenna whip, swaying
    ctx.strokeStyle = st.detail === '#0a0a0a' ? 'rgba(231,223,201,0.8)' : st.line;
    ctx.beginPath();
    const ax = sh.antenna[0], ay = sh.antenna[1];
    const sway = Math.sin(R.time * 5 + seed) * 1.5 - (m.vx || 0) * 0.06 * m.face;
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(ax - 0.5, ay + 7, ax - 1.5 + sway, ay + 14);
    ctx.stroke();
    // barrel with recoil
    const b = sh.barrel;
    const rc = (m.recoil || 0) * 4;
    ctx.save();
    ctx.translate(b.x - 2, b.y);
    ctx.rotate(clamp(la, -0.6, 0.9));
    ctx.strokeStyle = st.line;
    ctx.fillStyle = st.fill;
    ctx.beginPath();
    ctx.rect(2 - rc, -b.th / 2, b.len, b.th);
    ctx.fill(); ctx.stroke();
    if (type === 'tank') { ctx.beginPath(); ctx.rect(b.len - 1 - rc, -b.th, 3, b.th * 2); ctx.fill(); ctx.stroke(); }
    ctx.restore();
    ctx.restore();
    ctx.restore();
  }

  // ---------------------------------------------------------------- helicopters

  function drawHeli(m, type, team, opts) {
    const sh = SHAPES[type];
    const st = styleFor(team, opts.wreck);
    const z = R.cam.z;
    const seed = (opts.seed || 1) * 17;
    let pitch = opts.pitch || 0;
    ctx.save();
    ctx.translate(sx(m.x), sy(m.y));
    ctx.rotate(pitch * m.face + (opts.spin || 0));
    ctx.scale(m.face * z, -z);
    ctx.lineWidth = lw() / z;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = st.line;
    ctx.fillStyle = st.fill;

    // gear / skids behind the body
    ctx.strokeStyle = st.detail === '#0a0a0a' ? st.line : st.line;
    (sh.gear || sh.skid).forEach((g, i) => { lp(g, seed + 30 + i, false); ctx.stroke(); });
    if (sh.gear) sh.gear.forEach((g) => { ctx.beginPath(); ctx.arc(g[2], g[3] - 1, 1.3, 0, 7); ctx.stroke(); });

    ctx.strokeStyle = st.line;
    lp(sh.fin, seed + 1, true); ctx.fill(); ctx.stroke();
    lp(sh.body, seed + 2, true); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = st.detail;
    if (sh.canopy) sh.canopy.forEach((c, i) => { lp(c, seed + 3 + i, false); ctx.stroke(); });
    if (sh.window) { lp(sh.window, seed + 5, true); ctx.stroke(); }
    if (sh.door) {
      ctx.fillStyle = '#050505';
      lp(sh.door, seed + 6, true); ctx.fill(); ctx.stroke();
      ctx.fillStyle = st.fill;
    }
    if (sh.wing) {
      ctx.strokeStyle = st.line;
      lp(sh.wing, seed + 7, true); ctx.fill(); ctx.stroke();
      lp(sh.pod, seed + 8, true); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = st.detail;
      ctx.beginPath(); ctx.moveTo(9, -7.8); ctx.lineTo(9.8, -7.8); ctx.stroke();
      // chin gun follows the gun's aim
      const wp = m.weapons ? m.weapons[1] : null;
      let ga = -0.3;
      if (wp) { const rel = wp.aim + pitch * m.face; ga = Math.atan2(Math.sin(rel), m.face * Math.cos(rel)); }
      ctx.save(); ctx.translate(25, -5); ctx.rotate(clamp(ga, -1.2, 0.3));
      ctx.strokeStyle = st.line;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(6, 0); ctx.stroke();
      ctx.restore();
    }
    if (st.mark) {
      ctx.strokeStyle = st.mark;
      ctx.beginPath(); ctx.moveTo(-20, 0.6); ctx.lineTo(-12, 0.6); ctx.stroke();
    } else if (team === 0 && !opts.wreck) {
      ctx.fillStyle = PAL.red; // a small red marking, as on the reference helicopter
      ctx.fillRect(-24, -1.2, 2.2, 2.2);
      ctx.fillStyle = st.fill;
    }
    // mast and rotors
    ctx.strokeStyle = st.line;
    lp(sh.mast, seed + 9, false); ctx.stroke();
    if (!opts.wreck) {
      const rot = m.rotor || 0;
      const L = sh.rotorL;
      ctx.globalAlpha = 0.35;
      ctx.beginPath(); ctx.moveTo(sh.mast[0] - L, sh.rotorY); ctx.lineTo(sh.mast[0] + L, sh.rotorY); ctx.stroke();
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      for (let k = 0; k < 2; k++) {
        const c = Math.cos(rot + k * Math.PI / 2);
        ctx.moveTo(sh.mast[0], sh.rotorY + 0.3);
        ctx.lineTo(sh.mast[0] + c * L, sh.rotorY + 0.3 + Math.sin(rot + k) * 0.6);
      }
      ctx.stroke();
      // tail rotor: a faint disc and one turning blade
      ctx.globalAlpha = 0.3;
      ctx.beginPath(); ctx.arc(sh.tail[0], sh.tail[1], sh.tailR, 0, 7); ctx.stroke();
      ctx.globalAlpha = 0.85;
      const ta = rot * 1.7;
      ctx.beginPath();
      ctx.moveTo(sh.tail[0] - Math.cos(ta) * sh.tailR, sh.tail[1] - Math.sin(ta) * sh.tailR);
      ctx.lineTo(sh.tail[0] + Math.cos(ta) * sh.tailR, sh.tail[1] + Math.sin(ta) * sh.tailR);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- soldiers

  function drawSoldier(m, team, dead, alpha) {
    const z = R.cam.z;
    const X = sx(m.x) + (m.flinch > 0 ? (Math.random() - 0.5) * z * 1.2 : 0);
    const Y = sy(m.y);
    const s = z;
    const col = team === 0 ? PAL.ink : PAL.foe;
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    if (9 * z < 4.5 && !dead) {
      // tiny: a tick and a head dot
      const h = Math.max(2.5, 9 * z);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X, Y - h); ctx.stroke();
      if (team === 1) { ctx.fillStyle = PAL.red; ctx.fillRect(X - 0.5, Y - h - 1, 1.2, 1.2); }
      ctx.globalAlpha = 1;
      return;
    }
    ctx.lineWidth = lw(1.05);
    ctx.lineCap = 'round';
    const f = m.face || 1;
    let head;
    const stance = dead ? 'dead' : m.stance;
    const wk = m.wkey;
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
      weapon(X, Y - bob * s, f, s, wk, 'stand');
    } else if (stance === 'crouch') {
      ctx.moveTo(X + f * 2 * s, Y); ctx.lineTo(X + f * 1.7 * s, Y - 2.8 * s); ctx.lineTo(X - f * 0.4 * s, Y - 2.6 * s);
      ctx.lineTo(X - f * 1.4 * s, Y - 0.3 * s); ctx.lineTo(X - f * 3 * s, Y);
      ctx.moveTo(X - f * 0.4 * s, Y - 2.6 * s); ctx.lineTo(X + f * 0.7 * s, Y - 5.3 * s);
      ctx.moveTo(X + f * 0.7 * s, Y - 5.1 * s); ctx.lineTo(X + f * 2.8 * s, Y - 4.7 * s);
      head = [X + f * 1.2 * s, Y - 6.6 * s];
      ctx.stroke();
      weapon(X, Y, f, s, wk, 'crouch');
    } else if (stance === 'prone') {
      ctx.moveTo(X - f * 5.5 * s, Y - 0.5 * s); ctx.lineTo(X - f * 3 * s, Y - 0.9 * s);
      ctx.moveTo(X - f * 5.5 * s, Y - 1.3 * s); ctx.lineTo(X - f * 3 * s, Y - 0.9 * s);
      ctx.lineTo(X + f * 2.4 * s, Y - 1.4 * s);
      head = [X + f * 3.6 * s, Y - 2 * s];
      ctx.stroke();
      weapon(X, Y, f, s, wk, 'prone');
    } else {
      // dead: a body lying still
      ctx.moveTo(X - f * 4.5 * s, Y - 0.4 * s); ctx.lineTo(X + f * 2.6 * s, Y - 0.7 * s);
      ctx.moveTo(X - f * 4.5 * s, Y - 0.4 * s); ctx.lineTo(X - f * 6 * s, Y - 1.5 * s);
      head = [X + f * 3.7 * s, Y - 1 * s];
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(head[0], head[1], 1.15 * s, 0, Math.PI * 2);
    ctx.fill();
    if (team === 1) {
      ctx.fillStyle = PAL.red;
      ctx.fillRect(head[0] - 0.8 * s, head[1] - 1.3 * s, 1.6 * s, 0.8 * s);
    }
    ctx.globalAlpha = 1;
  }

  function weapon(X, Y, f, s, wk, st) {
    const y = st === 'stand' ? 6.5 : st === 'crouch' ? 4.9 : 1.6;
    ctx.beginPath();
    if (wk === 'at' && st !== 'prone') {
      ctx.lineWidth = lw(1.9);
      ctx.moveTo(X - f * 3.2 * s, Y - (y + 1) * s); ctx.lineTo(X + f * 4 * s, Y - (y + 1.2) * s);
    } else if (wk === 'mg') {
      ctx.lineWidth = lw(1.6);
      ctx.moveTo(X - f * 1.5 * s, Y - y * s); ctx.lineTo(X + f * 6.2 * s, Y - (y + 0.2) * s);
      if (st === 'prone') { ctx.moveTo(X + f * 5 * s, Y - y * s); ctx.lineTo(X + f * 5.6 * s, Y); ctx.moveTo(X + f * 5 * s, Y - y * s); ctx.lineTo(X + f * 4.4 * s, Y); }
    } else {
      const L = wk === 'dmr' ? 6.6 : 5.2;
      ctx.moveTo(X - f * 1.3 * s, Y - y * s); ctx.lineTo(X + f * L * s, Y - (y + 0.3) * s);
    }
    ctx.stroke();
    ctx.lineWidth = lw(1.05);
  }

  // ---------------------------------------------------------------- markers (tactical overview)

  function marker(x, y, type, team, sel) {
    const col = team === 0 ? PAL.ink : PAL.red;
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.lineWidth = sel ? 1.5 : 1;
    const w = 13, h = 8;
    const X = Math.round(x) + 0.5, Y = Math.round(y) + 0.5;
    ctx.beginPath();
    if (type === 'heli') {
      ctx.moveTo(X - w / 2, Y - h / 2); ctx.lineTo(X + w / 2, Y + h / 2); ctx.lineTo(X + w / 2, Y - h / 2); ctx.lineTo(X - w / 2, Y + h / 2); ctx.closePath();
    } else {
      ctx.rect(X - w / 2, Y - h / 2, w, h);
      if (type === 'rifle' || type === 'mg') { ctx.moveTo(X - w / 2, Y - h / 2); ctx.lineTo(X + w / 2, Y + h / 2); ctx.moveTo(X + w / 2, Y - h / 2); ctx.lineTo(X - w / 2, Y + h / 2); }
      if (type === 'scout') { ctx.moveTo(X - w / 2, Y + h / 2); ctx.lineTo(X + w / 2, Y - h / 2); }
      if (type === 'tank' || type === 'apc') ctx.ellipse(X, Y, w * 0.3, h * 0.24, 0, 0, 7);
      if (type === 'apc') { ctx.moveTo(X - w / 2, Y - h / 2); ctx.lineTo(X + w / 2, Y + h / 2); }
    }
    ctx.stroke();
    if (type === 'mg') ctx.fillRect(X - 1, Y - h / 2 - 3, 2, 2);
    if (sel) {
      ctx.beginPath();
      ctx.moveTo(X - 10, Y + 9); ctx.lineTo(X + 10, Y + 9);
      ctx.stroke();
    }
  }

  // ---------------------------------------------------------------- frame

  function drawAll(c, S, opts) {
    ctx = c;
    const z = R.cam.z;
    const viewTeam = opts.viewTeam;
    const x0 = BL.render.wx(-80), x1 = BL.render.wx(R.W + 80);
    const sel = opts.selected || new Set();

    // corpses fade out over a minute and a half
    for (const k of S.corpses) {
      if (k.x < x0 || k.x > x1) continue;
      const age = S.t - k.t;
      if (age > 90) continue;
      k.y = heightAt(S.field, k.x);
      drawSoldier(k, k.team, true, 0.55 * (1 - age / 90));
    }
    // wrecks
    for (const w of S.wrecks) {
      if (w.x < x0 - 60 || w.x > x1 + 60) continue;
      const m = { x: w.x, y: heightAt(S.field, w.x), face: w.face, ang: BL.render && Math.atan(BL.slopeAt(S.field, w.x) * 0.9) + (w.type === 'heli' ? 0.3 : 0) };
      if (w.type === 'heli') drawHeli(m, 'heli', w.team, { wreck: true, spin: 0.35 * w.face, seed: 3 });
      else drawGroundVehicle(m, w.type, w.team, { wreck: true, seed: 5 });
    }

    const showFigures = z > 0.3;
    const markers = [];
    for (const u of S.units) {
      const seen = viewTeam < 0 || u.team === viewTeam || BL.visible(S, viewTeam, u);
      if (!seen) continue;
      if (u.x < x0 - 100 || u.x > x1 + 100) continue;
      if (showFigures) {
        if (u.kind === 'inf') {
          for (const m of u.members) if (m.alive && !m.rappel) drawSoldier(m, u.team);
        } else if (u.kind === 'veh') {
          const m = u.members[0];
          if (m.alive) drawGroundVehicle(m, u.type, u.team, { seed: u.id });
        } else {
          const m = u.members[0];
          if (m.alive) {
            const fwd = Math.sign(m.vx) === m.face ? 1 : -1;
            const pitch = clamp(Math.abs(m.vx) / 330, 0, 0.22) * fwd;
            drawHeli(m, 'heli', u.team, { seed: u.id, pitch, spin: m.falling ? m.spin : 0 });
          }
        }
      }
      if (z < 0.9) markers.push(u);
    }

    // transports with their ropes and the soldiers on them
    for (const tr of S.transports) {
      const m = { x: tr.x, y: tr.y, face: tr.face, rotor: tr.rotor };
      if (tr.x < x0 - 100 || tr.x > x1 + 100) continue;
      const ropeOn = tr.phase === 'hover' || (tr.phase === 'out' && tr.t < 0.6);
      if (ropeOn && showFigures) {
        const doorX = tr.x + tr.face * 3, doorY = tr.y - 4;
        const g = heightAt(S.field, doorX);
        ctx.strokeStyle = 'rgba(235,228,210,0.8)';
        ctx.lineWidth = lw(0.9);
        ctx.beginPath();
        ctx.moveTo(sx(doorX), sy(doorY));
        const sway = Math.sin(R.time * 2.3) * 4 + BL.world.WX.wind * 5;
        ctx.quadraticCurveTo(sx(doorX + sway), sy((doorY + g) / 2), sx(doorX + sway * 0.4), sy(tr.phase === 'out' ? doorY - (doorY - g) * (1 - tr.t / 0.6) : g));
        ctx.stroke();
        for (const s of tr.unit.members) {
          if (!s.alive || !s.rappel || s.rappel.stage !== 'down') continue;
          drawRappeller(s.x, s.rappel.y, tr.team);
        }
      }
      if (showFigures) drawHeli(m, 'transport', tr.team, { seed: 77, pitch: tr.phase === 'in' ? -0.06 : 0 });
    }

    // overview markers
    if (markers.length) {
      const a = clamp((0.9 - z) / 0.45, 0, 1);
      ctx.globalAlpha = a;
      for (const u of markers) {
        const ly = u.kind === 'air' ? u.members[0].y : heightAt(S.field, u.x) + 26;
        marker(sx(u.x), sy(ly) - (u.kind === 'air' ? 0 : 6), u.type, u.team, sel.has(u.id));
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawRappeller(x, y, team) {
    const z = R.cam.z;
    const X = sx(x), Y = sy(y);
    ctx.strokeStyle = team === 0 ? PAL.ink : PAL.foe;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = lw(1.05);
    ctx.beginPath();
    ctx.moveTo(X, Y - 1 * z); ctx.lineTo(X + 0.6 * z, Y - 6 * z);   // body
    ctx.moveTo(X, Y - 1 * z); ctx.lineTo(X + 3 * z, Y + 1.5 * z);   // legs pushing off
    ctx.moveTo(X, Y - 1 * z); ctx.lineTo(X + 2.4 * z, Y + 2.6 * z);
    ctx.moveTo(X + 0.6 * z, Y - 5.5 * z); ctx.lineTo(X - 0.3 * z, Y - 8 * z); // arm on rope
    ctx.stroke();
    ctx.beginPath(); ctx.arc(X + 1 * z, Y - 7.3 * z, 1.1 * z, 0, 7); ctx.fill();
  }

  // Selection brackets, labels, health and order lines (drawn over the world).
  function drawSelection(c, S, selected, now) {
    ctx = c;
    const z = R.cam.z;
    ctx.font = '10px "Courier New", monospace';
    ctx.textAlign = 'left';
    const labels = [];
    for (const u of S.units) {
      if (!selected.has(u.id) || !u.alive) continue;
      const live = u.members.filter((m) => m.alive && !m.rappel);
      if (!live.length) continue;
      let x0 = Infinity, x1 = -Infinity, top = -Infinity, bot = Infinity;
      for (const m of live) {
        x0 = Math.min(x0, m.x); x1 = Math.max(x1, m.x);
        const h = u.kind === 'inf' ? 10 : u.def.hgt + 4;
        const by = u.kind === 'air' ? m.y - 10 : m.y;
        top = Math.max(top, by + (u.kind === 'air' ? 22 : h));
        bot = Math.min(bot, by);
      }
      const pad = u.kind === 'inf' ? 5 : u.def.len / 2 + 3;
      const L = Math.max(sx(x0 - pad), sx(x0) - 10), Rr = Math.min(sx(x1 + pad), sx(x1) + Math.max(10, pad * z));
      const T = sy(top) - 3, B = sy(bot) + 3;
      ctx.strokeStyle = PAL.ink;
      ctx.lineWidth = 1;
      const k = 5;
      ctx.beginPath();
      ctx.moveTo(L, T + k); ctx.lineTo(L, T); ctx.lineTo(L + k, T);
      ctx.moveTo(Rr - k, T); ctx.lineTo(Rr, T); ctx.lineTo(Rr, T + k);
      ctx.moveTo(L, B - k); ctx.lineTo(L, B); ctx.lineTo(L + k, B);
      ctx.moveTo(Rr - k, B); ctx.lineTo(Rr, B); ctx.lineTo(Rr, B - k);
      ctx.stroke();
      // label and health
      ctx.fillStyle = PAL.ink;
      const label = u.kind === 'inf' ? `${u.def.short} ${live.length}/${u.def.load.length}` : u.def.short;
      // labels never stack: skip one that would overlap another
      const lwid = ctx.measureText(label).width;
      if (z > 0.45 && !labels.some((r) => L < r[0] + r[2] + 4 && r[0] < L + lwid + 4 && Math.abs(r[1] - T) < 12)) {
        ctx.fillText(label, L, T - 9);
        labels.push([L, T, lwid]);
      }
      let hp = 0, max = 0;
      for (const m of u.members) { max += m.maxHp; if (m.alive) hp += m.hp; }
      if (u.kind === 'inf') max = u.def.hp * u.def.load.length;
      const w = Math.max(20, Rr - L);
      ctx.strokeStyle = 'rgba(235,228,210,0.25)';
      ctx.beginPath(); ctx.moveTo(L, T - 4); ctx.lineTo(L + w, T - 4); ctx.stroke();
      ctx.strokeStyle = hp / max < 0.35 ? PAL.red : PAL.ink;
      ctx.beginPath(); ctx.moveTo(L, T - 4); ctx.lineTo(L + w * clamp(hp / max, 0, 1), T - 4); ctx.stroke();
      // suppression shows as a red jitter line
      if (u.kind === 'inf') {
        let sup = 0;
        for (const m of live) sup += m.supp;
        sup /= live.length;
        if (sup > 30) {
          ctx.strokeStyle = PAL.red;
          ctx.beginPath();
          for (let i = 0; i <= 6; i++) { const px = L + w * i / 6, py = B + 4 + (i % 2 ? 1.5 : -1.5) * (sup / 100); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
          ctx.stroke();
        }
      }
      // order line
      const o = u.order;
      if (o && Math.abs(o.x - u.x) > 10) {
        const gx = o.x;
        const g = heightAt(S.field, gx);
        ctx.strokeStyle = o.type === 'attack' ? 'rgba(184,67,58,0.7)' : o.type === 'retreat' ? 'rgba(235,228,210,0.35)' : 'rgba(235,228,210,0.55)';
        ctx.setLineDash([2, 5]);
        ctx.beginPath();
        const steps = 16;
        for (let i = 0; i <= steps; i++) {
          const xx = u.x + (gx - u.x) * i / steps;
          const yy = sy(heightAt(S.field, xx) + 3);
          i ? ctx.lineTo(sx(xx), yy) : ctx.moveTo(sx(xx), yy);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        const px = sx(gx), py = sy(g);
        ctx.beginPath(); ctx.moveTo(px - 5, py - 12); ctx.lineTo(px, py - 6); ctx.lineTo(px + 5, py - 12); ctx.stroke();
      }
    }
  }

  BL.units = { drawAll, drawSelection, drawGroundVehicle, drawHeli, drawSoldier, marker, SHAPES };
})();
