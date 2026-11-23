// BLACKLINE — cinematics: letterbox, title cards, typed briefing lines over camera moves,
// unit introductions (dossiers), H-hour, and the closing shot of a mission.
(function () {
  const BL = window.BL;
  const { R, PAL, clamp, lerp } = BL;

  const CI = { active: false, steps: [], i: 0, t: 0, bars: 0, barsTarget: 0, onDone: null, reveal: false, from: null, skippable: true, fade: 0 };

  // Presentation-only ratings for the dossier cards (1–5).
  const PIPS = {
    rifle: { FIREPOWER: 2, ARMOUR: 1, SPEED: 2, SIGHT: 2 },
    mg: { FIREPOWER: 3, ARMOUR: 1, SPEED: 1, SIGHT: 2 },
    scout: { FIREPOWER: 2, ARMOUR: 1, SPEED: 3, SIGHT: 5 },
    apc: { FIREPOWER: 3, ARMOUR: 3, SPEED: 4, SIGHT: 3 },
    tank: { FIREPOWER: 5, ARMOUR: 5, SPEED: 2, SIGHT: 3 },
    heli: { FIREPOWER: 4, ARMOUR: 2, SPEED: 5, SIGHT: 4 },
    arty: { FIREPOWER: 5, RADIUS: 4, DELAY: 3, COST: 3 },
    insert: { SQUAD: 2, REACH: 5, SPEED: 4, COST: 3 },
  };

  const zs = (z) => z * clamp(R.H / 620, 0.62, 1.35);
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function text(ctx, s, x, y, size, color, align, spacing, weight) {
    ctx.font = `${weight || 500} ${size}px ${R.FONT}`;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = color || PAL.ink;
    if ('letterSpacing' in ctx) ctx.letterSpacing = (spacing || 0) + 'px';
    ctx.fillText(s, x, y);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }

  function start(steps, onDone, opts) {
    CI.steps = steps; CI.i = 0; CI.active = true; CI.onDone = onDone;
    CI.barsTarget = 1; CI.skippable = !opts || opts.skippable !== false;
    enter(steps[0]);
  }
  function enter(st) {
    CI.t = 0;
    CI.from = { x: R.cam.x, y: R.cam.y, z: R.cam.z };
    CI.reveal = !!(st && st.reveal);
    if (st && st.type === 'card') CI.fade = 1;
  }
  function finish() {
    CI.active = false; CI.barsTarget = 0; CI.reveal = false;
    const cb = CI.onDone; CI.onDone = null;
    if (cb) cb();
  }
  function skip() { if (CI.active && CI.skippable) finish(); }

  function subject(st, S) {
    if (st.unit) {
      const u = S.units.find((k) => k.alive && k.team === 0 && k.type === st.unit);
      if (u) return { x: u.x, y: u.y - (u.kind === 'air' ? 90 : 0) };
    }
    return st.x != null ? { x: st.x, y: st.y } : null;
  }

  function update(dt, S) {
    CI.bars += (CI.barsTarget - CI.bars) * Math.min(1, dt * 3);
    if (!CI.active) { CI.fade = Math.max(0, CI.fade - dt * 1.5); return; }
    const st = CI.steps[CI.i];
    CI.t += dt;
    const k = clamp(CI.t / st.dur, 0, 1);
    if (st.type === 'card') {
      CI.fade = 1;
      const nx = CI.steps[CI.i + 1];
      if (nx && nx.x != null) { R.cam.x = R.cam.tx = nx.x - 260; R.cam.y = R.cam.ty = nx.y; R.cam.z = R.cam.tz = zs(nx.z || 1) * 0.9; }
    } else {
      CI.fade = Math.max(0, CI.fade - dt * 1.4);
      const p = subject(st, S);
      if (p && st.z) {
        const e = ease(k);
        const f = st.unit ? Math.min(1, e * 2.2) : e;
        R.cam.x = R.cam.tx = lerp(CI.from.x, p.x, f);
        R.cam.y = R.cam.ty = lerp(CI.from.y, p.y, f);
        R.cam.z = R.cam.tz = lerp(CI.from.z, zs(st.z), e);
        R.cam.follow = null;
      }
    }
    if (CI.t >= st.dur) { CI.i++; if (CI.i >= CI.steps.length) finish(); else enter(CI.steps[CI.i]); }
  }

  function intro(M, S) {
    const steps = [{ type: 'card', dur: 3.4, eyebrow: M.id === 'skirmish' ? 'SKIRMISH' : 'OPERATION BLACK RAIN', title: M.num ? `${M.num}  ${M.name}` : M.name, sub: `${M.time}  ·  ${M.place}  ·  ${M.sky}` }];
    for (const sh of M.shots) steps.push({ type: 'shot', ...sh, text: sh.line != null ? M.brief[sh.line] : null });
    for (const k of M.intro || []) {
      const u = BL.UNITS[k];
      const tgt = M.objective.sector ? S.field.sectors.find((s) => s.id === M.objective.sector) : S.field.sectors[1];
      const b = S.field.bases[0];
      steps.push({ type: 'unit', key: k, unit: u ? k : null, x: u ? null : k === 'arty' ? tgt.x : b.x + 150, y: u ? null : k === 'arty' ? tgt.y : b.y, z: u ? (u.kind === 'inf' ? 3.0 : 2.4) : 1.2, dur: 5.2 });
    }
    const f = frontPos(S);
    steps.push({ type: 'hhour', dur: 2.2, x: f.x, y: f.y, z: 1.3 });
    return steps;
  }

  // Where our forward units stand.
  function frontPos(S) {
    const enemy = S.field.bases[1];
    let best = S.field.bases[0], bd = 1e9;
    for (const u of S.units) {
      if (!u.alive || u.team !== 0 || u.kind === 'air') continue;
      const d = Math.hypot(u.x - enemy.x, u.y - enemy.y);
      if (d < bd) { bd = d; best = u; }
    }
    return { x: best.x + 120, y: best.y };
  }

  function outro(S, title, sub, p, win, onDone) {
    start([{ type: 'outro', x: p.x, y: p.y, z: 1.5, dur: 4.2, title, sub, win }], onDone);
  }

  // ---------------------------------------------------------------- drawing

  function draw(ctx) {
    const W = R.W, H = R.H;
    const bh = Math.round(H * 0.1 * CI.bars);
    if (bh > 0) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh); }
    if (CI.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${CI.fade})`; ctx.fillRect(0, 0, W, H); }
    if (!CI.active) return;
    const st = CI.steps[CI.i];
    const P = R.mobile && W > 700 ? 44 : 28;
    const inA = clamp(CI.t * 2, 0, 1) * clamp((st.dur - CI.t) * 2.5, 0, 1);
    if (st.type === 'card') {
      const a = clamp(CI.t * 1.6, 0, 1) * clamp((st.dur - CI.t) * 1.6, 0, 1);
      const big = clamp(W * 0.05, 28, 58);
      text(ctx, st.eyebrow, W / 2, H * 0.42, clamp(big * 0.3, 11, 15), `rgba(235,228,210,${a * 0.6})`, 'center', 5, 600);
      text(ctx, st.title, W / 2, H * 0.42 + big * 1.1, big, `rgba(235,228,210,${a})`, 'center', big * 0.12, 600);
      ctx.fillStyle = `rgba(184,67,58,${a})`;
      const w = Math.min(W * 0.4, 260) * clamp(CI.t * 0.8, 0, 1);
      ctx.fillRect(W / 2 - w / 2, H * 0.42 + big * 1.45, w, 2);
      text(ctx, st.sub, W / 2, H * 0.42 + big * 1.45 + 26, clamp(big * 0.28, 11, 15), `rgba(235,228,210,${a * 0.7})`, 'center', 3, 500);
    }
    if (st.type === 'shot' && st.text) {
      const n = Math.floor(CI.t * 40);
      const size = clamp(H * 0.04, 14, 20);
      text(ctx, st.text.slice(0, n), P, H - bh / 2 + size * 0.35, size, `rgba(235,228,210,${inA})`, 'left', 0.5, 500);
      if (CI.reveal) text(ctx, 'ENEMY POSITIONS', W - P, bh / 2 + 5, 12, `rgba(184,67,58,${inA})`, 'right', 3, 600);
    }
    if (st.type === 'unit') drawDossier(ctx, st.key, inA, P, 'INTRODUCING');
    if (st.type === 'hhour') {
      const a = clamp(CI.t * 2, 0, 1) * clamp((st.dur - CI.t) * 1.5, 0, 1);
      const big = clamp(W * 0.07, 34, 76);
      text(ctx, 'H-HOUR', W / 2, H * 0.47, big, `rgba(235,228,210,${a})`, 'center', big * 0.2, 600);
      text(ctx, 'YOU HAVE COMMAND', W / 2, H * 0.47 + 28, 13, `rgba(235,228,210,${a * 0.6})`, 'center', 5, 600);
    }
    if (st.type === 'outro') {
      const a = clamp(CI.t * 1.2, 0, 1);
      const big = clamp(W * 0.05, 26, 58);
      text(ctx, st.title, W / 2, H * 0.44, big, st.win ? `rgba(235,228,210,${a})` : `rgba(200,80,66,${a})`, 'center', big * 0.12, 600);
      if (st.sub) text(ctx, st.sub, W / 2, H * 0.44 + 28, 13, `rgba(235,228,210,${a * 0.65})`, 'center', 4, 600);
    }
    if (CI.skippable) text(ctx, 'TAP TO SKIP', W - P, st.type === 'card' ? H - 22 : H - bh / 2 + 5, 11, 'rgba(235,228,210,0.45)', 'right', 3, 600);
  }

  // A unit's card: name, role, two lines and ratings. Also used on the unlock screen.
  function drawDossier(ctx, key, a, x0, eyebrow, y0) {
    const H = R.H, W = R.W;
    const def = BL.UNITS[key] || BL.SUPPORT[key];
    const d = BL.campaign.DOSSIER[key];
    if (!def || !d) return;
    const y = y0 != null ? y0 : H * 0.24;
    const col = (al) => `rgba(235,228,210,${a * al})`;
    text(ctx, eyebrow, x0, y, 12, `rgba(184,67,58,${a})`, 'left', 4, 600);
    const big = clamp(W * 0.036, 22, 40);
    text(ctx, def.name, x0, y + big + 4, big, col(1), 'left', big * 0.06, 600);
    text(ctx, d.role.toUpperCase(), x0, y + big + 24, 13, col(0.6), 'left', 3, 600);
    d.lines.forEach((l, i) => text(ctx, l, x0, y + big + 52 + i * 19, clamp(H * 0.034, 13, 16), col(0.92), 'left', 0, 400));
    let py = y + big + 52 + d.lines.length * 19 + 14;
    const pips = PIPS[key] || {};
    for (const name in pips) {
      text(ctx, name, x0, py, 11, col(0.55), 'left', 2, 600);
      for (let i = 0; i < 5; i++) { ctx.fillStyle = i < pips[name] ? col(0.95) : col(0.18); ctx.fillRect(x0 + 84 + i * 14, py - 8, 10, 6); }
      py += 16;
    }
    text(ctx, `${def.cost} RP`, x0, py + 8, 12, col(0.6), 'left', 2, 600);
  }

  BL.cinema = { CI, start, skip, update, draw, intro, outro, drawDossier, frontPos, zs };
})();
