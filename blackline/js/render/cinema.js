// BLACKLINE — cinematics: letterbox, title cards, typed briefing lines, flyover shots,
// unit introductions (dossiers), H-hour, and the closing shot of a mission.
(function () {
  const BL = window.BL;
  const { R, PAL, clamp, lerp } = BL;
  const FONT = '"Courier New", Courier, monospace';

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

  function font(px) { return `${px}px ${FONT}`; }
  function text(ctx, s, x, y, size, color, align, spacing) {
    ctx.font = font(size);
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = color || PAL.ink;
    if ('letterSpacing' in ctx) ctx.letterSpacing = (spacing || 0) + 'px';
    ctx.fillText(s, x, y);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }

  // ---------------------------------------------------------------- sequences

  function start(steps, onDone, opts) {
    CI.steps = steps; CI.i = 0; CI.t = 0; CI.active = true; CI.onDone = onDone;
    CI.barsTarget = 1; CI.from = null; CI.skippable = !opts || opts.skippable !== false;
    CI.reveal = false;
    enter(steps[0]);
  }

  function enter(st) {
    CI.t = 0;
    CI.from = { x: R.cam.x, z: R.cam.z };
    CI.reveal = !!(st && st.reveal);
    if (st && st.type === 'card') CI.fade = 1;
  }

  function finish() {
    CI.active = false;
    CI.barsTarget = 0;
    CI.reveal = false;
    const cb = CI.onDone;
    CI.onDone = null;
    if (cb) cb();
  }

  function skip() { if (CI.active && CI.skippable) finish(); }

  function subject(st, S) {
    if (st.follow === 'transport') {
      const tr = S.transports[0];
      return tr ? tr.x : null;
    }
    if (st.unit) {
      const u = S.units.find((k) => k.alive && k.team === 0 && k.type === st.unit);
      return u ? u.x + (u.kind === 'air' ? 0 : 0) : null;
    }
    return st.x;
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
      if (nx && nx.x != null) { R.cam.x = R.cam.tx = nx.x - 300; R.cam.z = R.cam.tz = zs(nx.z || 1) * 0.9; }
    } else {
      CI.fade = Math.max(0, CI.fade - dt * 1.4);
      const sx = subject(st, S);
      if (sx != null && st.z) {
        const z = zs(st.z);
        const e = ease(k);
        // follow shots glide onto the subject and stay on it
        const x = st.follow || st.unit ? lerp(CI.from.x, sx, Math.min(1, e * 2.2)) : lerp(CI.from.x, sx, e);
        R.cam.x = R.cam.tx = x;
        R.cam.z = R.cam.tz = lerp(CI.from.z, z, e);
        R.cam.follow = null;
        // aircraft fly high: lift the frame so the helicopter and its rope both show
        R.cam.yOff = st.yOff || (st.follow === 'transport' ? 95 / Math.max(0.6, z) * 1.6 : st.unit && S.units.some((u) => u.type === st.unit && u.kind === 'air') ? 70 : 0);
      }
    }
    if (CI.t >= st.dur) {
      CI.i++;
      if (CI.i >= CI.steps.length) finish();
      else enter(CI.steps[CI.i]);
    }
  }

  // ---------------------------------------------------------------- building sequences

  function intro(M, S) {
    const steps = [];
    steps.push({ type: 'card', dur: 3.4, eyebrow: M.id === 'skirmish' ? 'SKIRMISH' : 'OPERATION BLACK RAIN', title: M.num ? `${M.num} — ${M.name}` : M.name, sub: `${M.time}  ·  ${M.place}  ·  ${M.sky}` });
    for (const sh of M.shots) steps.push({ type: 'shot', ...sh, text: sh.line != null ? M.brief[sh.line] : null });
    for (const k of M.intro || []) {
      const u = BL.UNITS[k];
      steps.push({ type: 'unit', key: k, unit: u ? k : null, x: u ? null : k === 'arty' ? (M.objective.sector === 'B' ? 2400 : 3500) : S.field.bases[0] + 200, z: u ? (u.kind === 'inf' ? 3.4 : 2.6) : 1.2, dur: 5.2 });
    }
    steps.push({ type: 'hhour', dur: 2.2, x: frontX(S), z: 1.35 });
    return steps;
  }

  function frontX(S) {
    let fx = S.field.bases[0];
    for (const u of S.units) if (u.alive && u.team === 0 && u.kind !== 'air') fx = Math.max(fx, u.x);
    for (const tr of S.transports) if (tr.team === 0) fx = Math.max(fx, tr.tx);
    return fx + 120;
  }

  function outro(S, title, sub, x, win, onDone) {
    start([{ type: 'outro', x, z: 1.5, dur: 4.2, title, sub, win }], onDone, { skippable: true });
  }

  // ---------------------------------------------------------------- drawing

  function draw(ctx) {
    const W = R.W, H = R.H;
    const bh = Math.round(H * 0.11 * CI.bars);
    if (bh > 0) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, bh);
      ctx.fillRect(0, H - bh, W, bh);
    }
    if (CI.fade > 0) {
      ctx.fillStyle = `rgba(0,0,0,${CI.fade})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (!CI.active) return;
    const st = CI.steps[CI.i];
    const P = R.mobile && W > 700 ? 44 : 24;
    const k = CI.t / st.dur;
    const inA = clamp(CI.t * 2, 0, 1) * clamp((st.dur - CI.t) * 2.5, 0, 1);

    if (st.type === 'card') {
      const a = clamp(CI.t * 1.6, 0, 1) * clamp((st.dur - CI.t) * 1.6, 0, 1);
      const big = clamp(W * 0.045, 24, 50);
      text(ctx, st.eyebrow, W / 2, H * 0.42, clamp(big * 0.32, 10, 14), `rgba(235,228,210,${a * 0.6})`, 'center', 4);
      text(ctx, st.title, W / 2, H * 0.42 + big * 1.15, big, `rgba(235,228,210,${a})`, 'center', big * 0.16);
      ctx.strokeStyle = `rgba(184,67,58,${a})`;
      ctx.lineWidth = 1;
      const w = Math.min(W * 0.5, 320) * clamp(CI.t * 0.8, 0, 1);
      ctx.beginPath(); ctx.moveTo(W / 2 - w / 2, H * 0.42 + big * 1.6); ctx.lineTo(W / 2 + w / 2, H * 0.42 + big * 1.6); ctx.stroke();
      text(ctx, st.sub, W / 2, H * 0.42 + big * 1.6 + 24, clamp(big * 0.3, 10, 13), `rgba(235,228,210,${a * 0.7})`, 'center', 2);
    }

    if (st.type === 'shot' && st.text) {
      // typed, low in the frame, inside the letterbox
      const n = Math.floor(CI.t * 38);
      const s = st.text.slice(0, n);
      const size = clamp(H * 0.032, 12, 17);
      const y = H - bh / 2 + size * 0.35;
      text(ctx, s + (n < st.text.length && Math.sin(R.time * 14) > 0 ? '▌' : ''), P, y, size, `rgba(235,228,210,${inA})`, 'left', 1);
      if (CI.reveal) text(ctx, 'ENEMY POSITIONS', W - P, bh / 2 + 4, 10, `rgba(184,67,58,${inA * 0.9})`, 'right', 3);
    }

    if (st.type === 'unit') drawDossier(ctx, st.key, inA, P, 'INTRODUCING');

    if (st.type === 'hhour') {
      const a = clamp(CI.t * 2, 0, 1) * clamp((st.dur - CI.t) * 1.5, 0, 1);
      const big = clamp(W * 0.06, 30, 64);
      text(ctx, 'H-HOUR', W / 2, H * 0.47, big, `rgba(235,228,210,${a})`, 'center', big * 0.3);
      text(ctx, 'YOU HAVE COMMAND', W / 2, H * 0.47 + 26, 12, `rgba(235,228,210,${a * 0.6})`, 'center', 4);
    }

    if (st.type === 'outro') {
      const a = clamp(CI.t * 1.2, 0, 1);
      const big = clamp(W * 0.045, 24, 52);
      text(ctx, st.title, W / 2, H * 0.44, big, st.win ? `rgba(235,228,210,${a})` : `rgba(200,80,66,${a})`, 'center', big * 0.18);
      if (st.sub) text(ctx, st.sub, W / 2, H * 0.44 + 26, 12, `rgba(235,228,210,${a * 0.65})`, 'center', 3);
    }

    if (CI.skippable && st.type !== 'card') text(ctx, 'TAP TO SKIP', W - P, H - bh / 2 + 4, 9, 'rgba(235,228,210,0.4)', 'right', 2);
    else if (CI.skippable) text(ctx, 'TAP TO SKIP', W - P, H - 20, 9, 'rgba(235,228,210,0.35)', 'right', 2);
  }

  // A unit's card: name, role, two lines and ratings. Also used on the unlock screen.
  function drawDossier(ctx, key, a, x0, eyebrow, y0) {
    const H = R.H, W = R.W;
    const def = BL.UNITS[key] || BL.SUPPORT[key];
    const d = BL.campaign.DOSSIER[key];
    if (!def || !d) return;
    const y = y0 != null ? y0 : H * 0.26;
    const col = (al) => `rgba(235,228,210,${a * al})`;
    text(ctx, eyebrow, x0, y, 10, `rgba(184,67,58,${a})`, 'left', 4);
    const big = clamp(W * 0.032, 18, 34);
    text(ctx, def.name, x0, y + big + 6, big, col(1), 'left', big * 0.12);
    text(ctx, d.role.toUpperCase(), x0, y + big + 26, 11, col(0.6), 'left', 3);
    d.lines.forEach((l, i) => text(ctx, l, x0, y + big + 54 + i * 18, clamp(H * 0.028, 11, 14), col(0.9), 'left', 0));
    const pips = PIPS[key] || {};
    let py = y + big + 54 + d.lines.length * 18 + 14;
    for (const name in pips) {
      text(ctx, name, x0, py, 9, col(0.55), 'left', 2);
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = i < pips[name] ? col(0.95) : col(0.18);
        ctx.fillRect(x0 + 92 + i * 13, py - 7, 9, 5);
      }
      py += 15;
    }
    text(ctx, `${def.cost} RP`, x0, py + 8, 10, col(0.6), 'left', 2);
  }

  BL.cinema = { CI, start, skip, update, draw, intro, outro, drawDossier, frontX, zs };
})();
