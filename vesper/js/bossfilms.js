// THE BLEEDING MOON — the guardians' entrances: one short anime film per guardian, played by the opening's
// film player (js/intro.js) on the pixel buffer, before the guardian's fight. The first time it plays in
// full; after that a tap skips it. Each: the place, the arrival, the reveal, a signature move in impact
// frames, the name, and the cut into the fight.
(function () {
  const VS = window.VS, D = VS.DATA, A = VS.A, R = VS.R, PX = VS.PX;
  const K0 = VS.INTRO.kit, { RED, BAR, W, H, K, hash, ease, clamp, fill, grad, stars, moon, rain, spun, eyes, closeUp, burst, sparks, kick, say, colossus, burningEyes, bigBlade, poster, vignette, eyePanel } = K0;
  const F = VS.FILMS = {};
  const vs = (S) => S.cast.vesper, set = (k) => D.FOES[k].set;
  const fr = (T, n) => Math.floor(T * (n || 8)) % 15;
  // The name card every film ends on: the name slammed in, the title under it.
  function nameCard(S, T, name, sub, y) {
    const yy = y || H() * 0.36;
    say(S, 'big', name, W() / 2, yy, { size: 30, k: T });
    if (T > 0.25) say(S, 'line', sub, W() / 2, yy + 22, { size: 14, col: '#f0e0e6', a: clamp((T - 0.25) * 4), spacing: 3 });
  }
  function rings(ctx, x, y, e, n, rx, ry, col) { for (let i = 0; i < n; i++) { const rk = ease(e * 1.5 - i * 0.15); if (rk <= 0 || rk >= 1) continue; ctx.strokeStyle = col.replace('A', String(1 - rk)); ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, 6 + rk * rx, 2 + rk * ry, 0, 0, 7); ctx.stroke(); } }
  // Impact frames: white, then the shapes inverted, then black on white. With scene (the shot as it is
  // drawn), the middle frames are that shot in ink instead: black and white, then the same reversed.
  function impactFrames(ctx, S, k, draw, scene) {
    kick(S, 8);
    if (k < (scene ? 0.25 : 0.33)) { fill(ctx, '#ffffff'); return; }
    if (scene && k < 0.5) { scene(); poster(ctx, '#000000', '#ffffff', 0.3); return; }
    if (scene && k < 0.75) { scene(); poster(ctx, '#ffffff', '#000000', 0.3); return; }
    if (!scene && k < 0.66) { fill(ctx, '#000'); draw('#ffffff'); return; }
    fill(ctx, '#ffffff'); draw('#000');
  }
  // The cold open of a film: serif title cards cut between paper and black. cards: [[at, text, paper, size]].
  function epigraph(cards) {
    return function (ctx, S, k, T) {
      let c = cards[0]; for (const x of cards) if (T >= x[0]) c = x;
      const t = T - c[0], paper = !!c[2];
      fill(ctx, paper ? '#ebe6e3' : '#000');
      if (paper) vignette(ctx, 0.22, '#5a5052'); else K().embers(ctx, T, 10, 0, W(), RED);
      say(S, 'serif', c[1], W() / 2, H() * 0.5, { size: c[3] || 13, col: paper ? '#141012' : '#f4eef0', a: clamp(t * 7) * clamp((1 - k) * 14) });
    };
  }
  const epiSfx = (cards) => cards.map((c, i) => ['epi', c[0] + 0.02, 'thud', 0.5 + i * 0.12]);
  // Tracking boxes on the pixel buffer's coordinates (the HUD drawn at full resolution).
  function track(S, x, y, w, h, t, o) { if (t > 0) say(S, 'track', null, x, y, Object.assign({ w, h, k: t, col: '#ffffff' }, o || {})); }
  function link(S, a, b, t, label) { if (t > 0) say(S, 'link', null, a[0], a[1], { x2: b[0], y2: b[1], k: t * 4, col: 'rgba(255,255,255,0.75)', label }); }
  // Two faces on a split screen: hers above, the guardian's below.
  function faceOff(ctx, S, k, T, key, col, bg) {
    const mid = Math.round(H() / 2), slide = Math.round((1 - ease(k * 5)) * 60);
    ctx.save(); ctx.beginPath(); ctx.rect(-8, -8, W() + 16, mid + 7); ctx.clip();
    fill(ctx, '#3a1018'); K().hStreaks(ctx, 24, 'rgba(255,90,110,0.4)', 701, T, 900);
    closeUp(ctx, vs(S), 0, 4.4, Math.round(W() * 0.4 - slide), Math.round(mid * 0.45), [19, 6], 1, RED, T, {});
    ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(-8, mid + 1, W() + 16, H()); ctx.clip();
    fill(ctx, bg); K().hStreaks(ctx, 24, 'rgba(255,255,255,0.3)', 703, T, 900);
    const sc = 4.2 * Math.min(1.3, D.FOES[key].scale || 1), x = Math.round(W() * 0.62 + slide), y = Math.round(H() * 1.55);
    A.actor(ctx, set(key), 'Idle4', 0, Math.PI, x, y, sc, {});
    eyes(ctx, set(key), 'Idle4', 0, Math.PI, x, y, sc, 1, col);
    ctx.restore();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-8, mid - 1, W() + 16, 2);
    if (k > 0.88) fill(ctx, '#ffffff', (k - 0.88) / 0.12);
  }
  function vesperSmall(ctx, S, x, y, sc, T, ang, shade) { A.actor(ctx, vs(S), 'Walk', fr(T, 10), ang == null ? -Math.PI / 2 : ang, Math.round(x), Math.round(y), sc || 1.2, { shade: shade || '#050306' }); }
  const common = { amb: 'wind', impact: () => false };

  // ---- The Gatewarden: the Black Gate opens; he leaps from its top; the ground splits under him ---------
  function blackGate(ctx, T, open) {
    const cx = W() / 2, base = Math.round(H() * 0.84), gw = 70, gh = 100;
    ctx.fillStyle = '#060204';
    ctx.fillRect(-8, base - 120, W() + 16, 130);
    for (const sx of [-1, 1]) { const x = cx + sx * (gw / 2 + 30); ctx.fillRect(Math.round(x - 26), base - 170, 52, 180); ctx.beginPath(); ctx.moveTo(x - 30, base - 170); ctx.lineTo(x, base - 205); ctx.lineTo(x + 30, base - 170); ctx.fill(); }
    for (let x = -8; x < W() + 8; x += 14) ctx.fillRect(x, base - 128, 9, 8);
    const g = ctx.createLinearGradient(0, base - gh, 0, base); g.addColorStop(0, 'rgba(255,42,68,0.15)'); g.addColorStop(1, 'rgba(255,42,68,0.9)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx - gw / 2, base); ctx.lineTo(cx - gw / 2, base - gh * 0.7); ctx.quadraticCurveTo(cx, base - gh * 1.1, cx + gw / 2, base - gh * 0.7); ctx.lineTo(cx + gw / 2, base); ctx.fill();
    A.tex(ctx, 'light_01', cx, base - 30, 200, 160, RED, 0.3 + 0.3 * open, 0, true);
    // The portcullis, rising.
    ctx.fillStyle = '#0a0406'; const lift = Math.round(open * gh * 0.8);
    for (let x = cx - gw / 2 + 4; x < cx + gw / 2; x += 8) ctx.fillRect(Math.round(x), base - gh - lift, 3, gh);
    for (let y = base - gh - lift; y < base - lift; y += 14) ctx.fillRect(Math.round(cx - gw / 2), Math.round(y), gw, 2);
    for (const sx of [-1, 1]) { ctx.fillStyle = `rgba(255,${150 + Math.round(60 * Math.sin(T * 9 + sx))},80,0.9)`; ctx.fillRect(Math.round(cx + sx * (gw / 2 + 30)) - 1, base - 110, 2, 4); }
    return base;
  }
  const EPI_WARDEN = [[0, 'NO ONE PASSES THE BLACK GATE', 1], [1.2, 'NO ONE EVER HAS', 0]];
  F.warden = { ...common, music: ['quake', 'boss'], shots: [['epi', 2.3], ['gate', 2.6], ['leap', 1.4], ['land', 1.6], ['rise', 1.8], ['quake', 2.4], ['face', 1.4]],
    noBars: { epi: 1, face: 1 }, flat: { epi: 1 }, impact: (n, T) => (n === 'land' && T < 0.2) || (n === 'quake' && T > 0.76 && T < 1.5),
    sfx: [...epiSfx(EPI_WARDEN), ['gate', 0.2, 'horn', 0.7], ['gate', 0.8, 'quake', 0.6], ['gate', 1.6, 'quake', 0.7], ['leap', 0, 'whoosh', 1], ['land', 0, 'smash', 1], ['land', 0.02, 'quake', 1], ['land', 0.05, 'blow_big', 1],
      ['rise', 0.4, 'charge', 0.8], ['quake', 0.2, 'windup', 1], ['quake', 0.7, 'smash', 1], ['quake', 0.72, 'quake', 1], ['quake', 0.95, 'boss', 1], ['quake', 1.0, 'blow_big', 0.8], ['face', 0, 'charge', 1]],
    draw: {
      epi: epigraph(EPI_WARDEN),
      gate(ctx, S, k, T) {
        grad(ctx, ['#0c0206', '#3a0a14', '#5a1020']); stars(ctx, 40, 0.4, 711, T);
        moon(ctx, W() / 2, H() * 0.2, H() * 0.16, '#ff4a5e', 'rgba(255,40,70,0.5)', 1, T);
        const base = blackGate(ctx, T, ease(clamp((T - 0.6) / 1.6)));
        ctx.fillStyle = '#0a0306'; ctx.fillRect(-8, base, W() + 16, H());
        vesperSmall(ctx, S, W() / 2, H() + 4 - T * 6, 1.6, T);
        K().embers(ctx, T, 30, 0, W(), RED);
        say(S, 'card', 'THE BLACK GATE', 10, BAR + 16, { sub: 'DUSK', k: T });
        kick(S, T > 0.6 ? 1 : 0);
      },
      leap(ctx, S, k, T) {
        grad(ctx, ['#14030a', '#4a0c18']);
        for (let i = 0; i < 50; i++) { const x = hash(i, 721) * W(), y = ((hash(i, 722) * H() + T * 700) % (H() + 30)) - 15; ctx.fillStyle = 'rgba(255,220,230,0.35)'; ctx.fillRect(Math.round(x), Math.round(y), 1, 12); }
        const e = ease(k), sc = 0.9 + 1.6 * e, y = -30 + (H() * 0.92 + 30) * e;
        ctx.fillStyle = `rgba(0,0,0,${0.3 + 0.5 * e})`; ctx.beginPath(); ctx.ellipse(W() / 2, H() * 0.93, 10 + 50 * e, 3 + 10 * e, 0, 0, 7); ctx.fill();
        for (let i = 3; i >= 1; i--) A.actor(ctx, set('warden'), 'Attack4', Math.min(10, 2 + Math.floor(k * 8)), Math.PI / 2, W() / 2, Math.round(y - i * 16), sc, { shade: '#4a3a7a', alpha: 0.18 * (4 - i) });
        A.actor(ctx, set('warden'), 'Attack4', Math.min(10, 2 + Math.floor(k * 8)), Math.PI / 2, W() / 2, Math.round(y), sc, { shade: '#050306' });
        kick(S, 2);
      },
      land(ctx, S, k, T) {
        const gy = Math.round(H() * 0.88), x = W() / 2;
        if (T < 0.2) { impactFrames(ctx, S, T / 0.2, (c) => { burst(ctx, x, gy - 30, c, 90, 731, 20); A.actor(ctx, set('warden'), 'Special1', 14, Math.PI / 2, x, gy, 2.8, { shade: c }); }, () => { F.warden.draw.land(ctx, S, 0.15, 0.25); burst(ctx, x, gy - 30, '#ffffff', 70, 733, 26); }); return; }
        const e = (T - 0.2) / 1.4;
        grad(ctx, ['#14030a', '#3a0812', '#20060c']);
        ctx.fillStyle = '#0a0306'; ctx.fillRect(-8, gy, W() + 16, H());
        { const L = Math.round(W() * 0.7 * ease(e * 2)); ctx.fillStyle = '#9a8cff'; ctx.fillRect(x - L, gy, L * 2, 2); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - (L >> 1), gy, L, 1); A.tex(ctx, 'light_01', x, gy, L * 2.2, 22, '#9a8cff', 0.6, 0, true); }
        rings(ctx, x, gy, e, 3, 220, 26, 'rgba(220,210,255,A)');
        for (let i = 0; i < 24; i++) { const life = clamp(e * 2 - hash(i, 732) * 0.3); if (life <= 0 || life >= 1) continue; ctx.fillStyle = '#2a1820'; ctx.fillRect(Math.round(x + (hash(i, 733) - 0.5) * 2 * 140 * life), Math.round(gy - 90 * life + 160 * life * life), 3, 2); }
        A.tex(ctx, 'light_01', x, gy - 40, 140, 140, '#9a8cff', 0.35, 0, true);
        A.actor(ctx, set('warden'), 'Special1', 14, Math.PI / 2, x, gy, 2.8, {});
        eyes(ctx, set('warden'), 'Special1', 14, Math.PI / 2, x, gy, 2.8, 1, '#c8b8ff');
        kick(S, 6 * (1 - e));
      },
      rise(ctx, S, k, T) {
        grad(ctx, ['#08020a', '#20081a', '#14040c']);
        A.tex(ctx, 'light_01', W() / 2, H() * 0.5, W(), H(), '#5a3aa0', 0.35, 0, true);
        const sc = 2.8 + 0.3 * ease(k), x = Math.round(W() / 2), y = Math.round(H() * 0.97 - ease(k) * 6);
        A.tex(ctx, 'light_01', x, H() * 0.42, 220, 220, '#8a6ae0', 0.5, 0, true);
        A.actor(ctx, set('warden'), 'Idle4', 0, Math.PI / 2, x, y, sc, { shade: '#06040c' });
        eyes(ctx, set('warden'), 'Idle4', 0, Math.PI / 2, x, y, sc, ease(clamp((T - 0.5) / 0.4)), '#c8b8ff');
        K().embers(ctx, T, 24, 0, W(), '#9a8cff');
      },
      quake(ctx, S, k, T) {
        const gy = Math.round(H() * 0.84), x = Math.round(W() / 2), slam = 0.7;
        grad(ctx, ['#0c0206', '#3a0a14', '#2a0610']);
        moon(ctx, W() * 0.5, H() * 0.36, H() * 0.32, '#ff4a5e', 'rgba(255,40,70,0.5)', 1, T);
        ctx.fillStyle = '#0a0306'; ctx.fillRect(-8, gy, W() + 16, H());
        if (T > slam && T < slam + 0.06) { fill(ctx, '#ffffff'); kick(S, 9); return; }
        const fr2 = T < slam ? Math.min(9, Math.floor(T / slam * 10)) : Math.min(14, 10 + Math.floor((T - slam) * 10));
        if (T > slam) { const e = (T - slam) / 1.7; for (let i = 0; i < 4; i++) { const rk = clamp(e * 2 - i * 0.22); if (rk <= 0 || rk >= 1) continue; ctx.strokeStyle = `rgba(200,190,255,${1 - rk})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, gy, 20 + rk * 260, 4 + rk * 30, 0, 0, 7); ctx.stroke(); } kick(S, 4 * (1 - e)); }
        A.actor(ctx, set('warden'), 'Special1', fr2, Math.PI / 2, x, gy, 2.6, { shade: '#050306' });
        eyes(ctx, set('warden'), 'Special1', fr2, Math.PI / 2, x, gy, 2.6, 1, '#c8b8ff');
        if (T > slam + 0.06 && T < 1.5) say(S, 'knock', 'GATEWARDEN', W() / 2, H() / 2, { size: 0.85, sx: 0.58, a: clamp((1.5 - T) * 5), col: '#000' });
        if (T > 1.4) nameCard(S, T - 1.4, 'THE GATEWARDEN', 'KEEPER OF THE BLACK GATE', H() * 0.26);
      },
      face(ctx, S, k, T) { faceOff(ctx, S, k, T, 'warden', '#c8b8ff', '#2a2448'); },
    } };

  // ---- The Hollow Twins: two frozen knights wake in the cloister, cross blades, and rain ice -------------
  function cloister(ctx, T, snow) {
    grad(ctx, ['#060a14', '#14223a', '#24344c']);
    const vp = W() / 2;
    for (let i = 0; i < 5; i++) for (const sx of [-1, 1]) { const d = 1 - i / 5, x = vp + sx * (20 + d * d * W() * 0.48), w = 6 + d * 30, top = H() * (0.36 - d * 0.36); ctx.fillStyle = `rgb(${10 + i * 6},${18 + i * 8},${30 + i * 10})`; ctx.fillRect(Math.round(x - w / 2), Math.round(top), Math.round(w), H()); }
    const gy = Math.round(H() * 0.8); ctx.fillStyle = '#c8d8ea'; ctx.globalAlpha = 0.18; ctx.fillRect(-8, gy, W() + 16, H()); ctx.globalAlpha = 1; ctx.fillStyle = '#0a121c'; ctx.fillRect(-8, gy + 2, W() + 16, H());
    for (let i = 0; i < snow; i++) { const x = (hash(i, 741) * W() + Math.sin(T + i) * 6), y = ((hash(i, 742) * H() + T * (16 + hash(i, 743) * 20)) % H()); ctx.fillStyle = 'rgba(230,240,255,0.7)'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); }
    return gy;
  }
  const EPI_TWINS = [[0, 'THEY DIED TOGETHER', 0], [1.15, 'THEY WAKE TOGETHER', 1]];
  F.twins = { ...common, amb: 'night', music: ['cross', 'boss'], shots: [['epi', 2.3], ['cloister', 2.4], ['wake', 2.0], ['cross', 2.0], ['name', 2.4], ['lances', 1.6]],
    noBars: { epi: 1, name: 1 }, flat: { epi: 1 }, impact: (n, T) => n === 'cross' && T > 0.7 && T < 0.9,
    sfx: [...epiSfx(EPI_TWINS), ['wake', 1.05, 'blink', 0.6], ['wake', 1.25, 'blink', 0.6], ['cloister', 0.2, 'magic', 0.5], ['wake', 0.2, 'break', 0.9], ['wake', 0.25, 'quake', 0.6], ['wake', 1.0, 'charge', 0.8], ['cross', 0.1, 'whoosh', 1], ['cross', 0.7, 'clang_1', 1], ['cross', 0.72, 'blow_big', 1],
      ['cross', 0.8, 'quake', 0.9], ['name', 0.1, 'boss', 1], ['lances', 0.4, 'quake', 0.6], ['lances', 0.6, 'smash', 0.7], ['lances', 0.9, 'smash', 0.7], ['lances', 1.2, 'dodge', 0.9]],
    draw: {
      epi: epigraph(EPI_TWINS),
      cloister(ctx, S, k, T) {
        const gy = cloister(ctx, T, 70);
        for (const [key, sx, ang] of [['twinA', -1, 0], ['twinB', 1, Math.PI]]) A.actor(ctx, set(key), 'CrouchIdle', 0, ang, Math.round(W() / 2 + sx * 40), gy - 2, 1.3, { shade: '#7a98b8' });
        vesperSmall(ctx, S, W() * 0.3, H() + 6 - T * 8, 1.7, T);
        say(S, 'card', 'THE FROZEN CLOISTER', 10, BAR + 16, { sub: 'THE FIRST HOUR', k: T });
      },
      wake(ctx, S, k, T) {
        const gy = cloister(ctx, T, 40), crack = clamp(T / 0.3);
        for (const [key, sx, ang] of [['twinA', -1, 0], ['twinB', 1, Math.PI]]) {
          const x = Math.round(W() / 2 + sx * 70), up = T > 0.5, sc = 2.2;
          A.actor(ctx, set(key), up ? 'Idle4' : 'CrouchIdle', up ? fr(T) : 0, ang, x, gy, sc, { shade: '#9ab8d8', alpha: 1 - clamp((T - 0.3) / 0.5) });
          A.actor(ctx, set(key), up ? 'Idle4' : 'CrouchIdle', up ? fr(T) : 0, ang, x, gy, sc, { alpha: clamp((T - 0.3) / 0.5) });
          if (T > 1.0) eyes(ctx, set(key), 'Idle4', fr(T), ang, x, gy, sc, clamp((T - 1.0) * 4), '#a8e8ff');
          if (crack > 0 && T < 0.9) for (let i = 0; i < 20; i++) { const a = hash(i + sx * 50, 744) * 6.28, d = (T - 0.2) * (40 + hash(i, 745) * 60); if (d < 0) continue; ctx.fillStyle = i % 3 ? '#e8f4ff' : '#a8d8ff'; ctx.fillRect(Math.round(x + Math.cos(a) * d), Math.round(gy - 40 + Math.sin(a) * d * 0.7 + d * d * 0.01), 2, 2); }
        }
        if (T > 0.2 && T < 0.3) kick(S, 3);
        // The eyes light; the boxes find them both, and the line between them.
        const a = [Math.round(W() / 2 - 70), gy - 34], b = [Math.round(W() / 2 + 70), gy - 34];
        track(S, a[0], a[1], 30, 46, T - 1.05, { col: '#d8f4ff', sub: 'LEFT HAND' }); track(S, b[0], b[1], 30, 46, T - 1.25, { col: '#d8f4ff', sub: 'RIGHT HAND' });
        link(S, a, b, T - 1.35, 'ONE BLADE');
      },
      cross(ctx, S, k, T) {
        const gy = cloister(ctx, T, 30), hit = 0.7, cx = W() / 2;
        if (T > hit && T < hit + 0.2) { impactFrames(ctx, S, (T - hit) / 0.2, (c) => { burst(ctx, cx, gy - 50, c, 80, 751, 14); A.actor(ctx, set('twinA'), 'Attack1', 8, 0, cx - 30, gy, 2.3, { shade: c }); A.actor(ctx, set('twinB'), 'Attack2', 8, Math.PI, cx + 30, gy, 2.3, { shade: c }); },
          () => { cloister(ctx, T, 30); burst(ctx, cx, gy - 50, '#ffffff', 70, 753, 16); A.actor(ctx, set('twinA'), 'Attack1', 8, 0, cx - 30, gy, 2.3, {}); A.actor(ctx, set('twinB'), 'Attack2', 8, Math.PI, cx + 30, gy, 2.3, {}); }); return; }
        const f = ease(clamp(T / hit)), ax = cx - 30 - (1 - f) * 120, bx = cx + 30 + (1 - f) * 120;
        if (T < hit) { for (let i = 3; i >= 1; i--) { A.actor(ctx, set('twinA'), 'Run', fr(T, 16), 0, Math.round(ax - i * 12), gy, 2.3, { shade: '#4a6a8a', alpha: 0.15 * (4 - i) }); A.actor(ctx, set('twinB'), 'Run', fr(T, 16), Math.PI, Math.round(bx + i * 12), gy, 2.3, { shade: '#4a6a8a', alpha: 0.15 * (4 - i) }); } A.actor(ctx, set('twinA'), 'Run', fr(T, 16), 0, Math.round(ax), gy, 2.3, {}); A.actor(ctx, set('twinB'), 'Run', fr(T, 16), Math.PI, Math.round(bx), gy, 2.3, {}); return; }
        const e = (T - hit - 0.2) / 1.1;
        rings(ctx, cx, gy - 40, e, 3, 200, 120, 'rgba(200,235,255,A)');
        A.fx(ctx, 'ice_shatter', e * 1.1, cx, gy - 40, 3, 0.9);
        for (let i = 0; i < 40; i++) { const a = hash(i, 752) * 6.28, d = e * (60 + hash(i, 753) * 140); ctx.fillStyle = i % 3 ? '#e8f4ff' : '#88c8ff'; ctx.fillRect(Math.round(cx + Math.cos(a) * d), Math.round(gy - 40 + Math.sin(a) * d * 0.6), 2, 1); }
        A.actor(ctx, set('twinA'), 'Attack1', 8, 0, cx - 30, gy, 2.3, {}); A.actor(ctx, set('twinB'), 'Attack2', 8, Math.PI, cx + 30, gy, 2.3, {});
        A.tex(ctx, 'light_01', cx, gy - 50, 50, 50, '#ffffff', 0.7, 0, true);
        kick(S, 3 * (1 - e));
      },
      name(ctx, S, k, T) {
        const mid = Math.round(W() / 2), slide = Math.round((1 - ease(k * 4)) * 50);
        ctx.save(); ctx.beginPath(); ctx.rect(-8, -8, mid + 7, H() + 16); ctx.clip(); fill(ctx, '#1a3a5a'); K().speedLines(ctx, W() * 0.25, H() * 0.6, 40, 'rgba(255,255,255,0.25)', 761, T, 30);
        A.actor(ctx, set('twinA'), 'Idle4', 0, 0, Math.round(W() * 0.26 - slide), Math.round(H() * 1.3), 4.4, {}); eyes(ctx, set('twinA'), 'Idle4', 0, 0, Math.round(W() * 0.26 - slide), Math.round(H() * 1.3), 4.4, 1, '#a8e8ff'); ctx.restore();
        ctx.save(); ctx.beginPath(); ctx.rect(mid + 1, -8, W(), H() + 16); ctx.clip(); fill(ctx, '#2a4a6a'); K().speedLines(ctx, W() * 0.75, H() * 0.6, 40, 'rgba(255,255,255,0.25)', 763, T, 30);
        A.actor(ctx, set('twinB'), 'Idle4', 0, Math.PI, Math.round(W() * 0.74 + slide), Math.round(H() * 1.3), 4.4, {}); eyes(ctx, set('twinB'), 'Idle4', 0, Math.PI, Math.round(W() * 0.74 + slide), Math.round(H() * 1.3), 4.4, 1, '#a8e8ff'); ctx.restore();
        ctx.fillStyle = '#ffffff'; ctx.fillRect(mid - 1, -8, 2, H() + 16);
        if (T > 0.3) { say(S, 'line', 'THE LEFT HAND', W() * 0.25, H() * 0.86, { size: 13, col: '#e8f4ff', spacing: 3, a: clamp((T - 0.3) * 4) }); say(S, 'line', 'THE RIGHT HAND', W() * 0.75, H() * 0.86, { size: 13, col: '#e8f4ff', spacing: 3, a: clamp((T - 0.3) * 4) }); }
        if (T > 0.5) say(S, 'big', 'THE HOLLOW TWINS', W() / 2, H() * 0.2, { size: 30, k: T - 0.5 });
      },
      lances(ctx, S, k, T) {
        const gy = cloister(ctx, T, 30), vx = W() / 2, vy = gy + 8;
        const spots = [[-50, 0, 0.2], [40, -6, 0.35], [-10, 10, 0.5], [60, 12, 0.65], [-70, 14, 0.8], [0, -2, 0.95]];
        for (const [dx, dy, t0] of spots) {
          const x = vx + dx, y = vy + dy, a = T - t0;
          if (a < 0) continue;
          if (a < 0.4) { ctx.strokeStyle = `rgba(168,232,255,${0.4 + a})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, 16, 5, 0, 0, 7); ctx.stroke(); const ly = y - 200 + 200 * (a / 0.4); ctx.fillStyle = '#e8f4ff'; ctx.fillRect(Math.round(x) - 1, Math.round(ly - 20), 3, 20); }
          else A.fx(ctx, 'ice_shatter', a - 0.4, x, y - 4, 1.6, 0.9);
        }
        const dash = T > 1.15, dx = dash ? (T - 1.15) * 400 : 0;
        A.actor(ctx, vs(S), dash ? 'Rolling' : 'Idle4', fr(T, 14), dash ? 0 : -Math.PI / 2, Math.round(vx + dx), vy, 1.6, {});
        if (k > 0.85) fill(ctx, '#ffffff', (k - 0.85) / 0.15);
      },
    } };

  // ---- The Umbral: darkness; eyes; something rises out of her own shadow; the court of shadows ------------
  const EPI_UMBRAL = [[0, 'DO NOT LOOK BEHIND YOU', 0, 14]];
  F.umbral = { ...common, amb: 'night', music: ['court', 'boss'], shots: [['epi', 1.8], ['dark', 2.2], ['eyes', 2.0], ['behind', 2.4], ['panel', 1.3], ['court', 2.0], ['name', 2.2]],
    noBars: { epi: 1, panel: 1 }, flat: { epi: 1 }, impact: (n, T) => n === 'name' && T < 0.25,
    sfx: [...epiSfx(EPI_UMBRAL), ['panel', 0.35, 'blink', 0.9], ['panel', 0.37, 'clang_0', 0.5], ['dark', 0.3, 'magic', 0.4], ['eyes', 0.2, 'spawn', 0.5], ['eyes', 1.7, 'blink', 0.8], ['behind', 0.6, 'charge', 0.9], ['behind', 1.4, 'windup', 0.9], ['court', 0.2, 'spawn', 0.8], ['court', 0.6, 'spawn', 0.8],
      ['court', 1.3, 'unsheathe_01', 1], ['name', 0, 'slash_2', 1], ['name', 0.02, 'blow_big', 1], ['name', 0.3, 'boss', 1]],
    draw: {
      epi: epigraph(EPI_UMBRAL),
      dark(ctx, S, k, T) {
        fill(ctx, '#020103');
        const x = W() / 2, y = Math.round(H() * 0.74);
        const g = ctx.createRadialGradient(x, y - 20, 4, x, y - 20, 70); g.addColorStop(0, 'rgba(255,42,68,0.35)'); g.addColorStop(1, 'rgba(255,42,68,0)'); ctx.fillStyle = g; ctx.fillRect(-8, -8, W() + 16, H() + 16);
        // Her shadow, stretching out behind her far longer than it should.
        const L = 0.5 + 1.2 * ease(k);
        ctx.save(); ctx.translate(x, y); ctx.scale(1, -0.35 * L); ctx.globalAlpha = 0.9; A.actor(ctx, vs(S), 'Idle4', fr(T), -Math.PI / 2, 0, 0, 1.6, { shade: '#000000' }); ctx.restore();
        A.actor(ctx, vs(S), 'Idle4', fr(T), -Math.PI / 2, x, y, 1.6, {});
        say(S, 'card', 'THE UMBRAL STAIR', 10, BAR + 16, { sub: 'THE SECOND HOUR', k: T });
      },
      eyes(ctx, S, k, T) {
        fill(ctx, '#020103');
        const x = W() / 2, y = Math.round(H() * 0.74);
        const g = ctx.createRadialGradient(x, y - 20, 4, x, y - 20, 60); g.addColorStop(0, 'rgba(255,42,68,0.3)'); g.addColorStop(1, 'rgba(255,42,68,0)'); ctx.fillStyle = g; ctx.fillRect(-8, -8, W() + 16, H() + 16);
        A.actor(ctx, vs(S), 'Idle4', fr(T), -Math.PI / 2, x, y, 1.6, {});
        const blink = T > 1.65 && T < 1.8;
        for (let i = 0; i < 26; i++) {
          const t0 = 0.1 + hash(i, 771) * 1.2; if (T < t0 || blink) continue;
          const ex = hash(i, 772) * W(), ey = BAR + 6 + hash(i, 773) * (H() * 0.7), a = clamp((T - t0) * 5), s2 = 1 + Math.floor(hash(i, 774) * 2);
          ctx.globalAlpha = a; ctx.fillStyle = '#d8a0ff'; ctx.fillRect(Math.round(ex - 3 * s2), Math.round(ey), 2 * s2, s2); ctx.fillRect(Math.round(ex + s2), Math.round(ey), 2 * s2, s2); A.tex(ctx, 'light_01', ex, ey, 14 * s2, 6 * s2, '#c070ff', 0.4 * a, 0, true); ctx.globalAlpha = 1;
        }
      },
      behind(ctx, S, k, T) {
        fill(ctx, '#040208');
        const rise = ease(clamp((T - 0.4) / 1.2));
        // Him, towering out of her shadow behind her.
        const ux = Math.round(W() * 0.66), uy = Math.round(H() * 1.5 - rise * H() * 0.3), sc = 4.6;
        A.tex(ctx, 'light_01', ux, uy - 110, 260, 260, '#9a40e0', 0.6 * rise, 0, true);
        A.actor(ctx, set('umbral'), 'Idle4', 0, Math.PI, ux, uy, sc, { shade: '#050208', alpha: rise });
        if (T > 1.4) eyes(ctx, set('umbral'), 'Idle4', 0, Math.PI, ux, uy, sc, clamp((T - 1.4) * 4), '#e0b0ff');
        // Her face, close, her eye going wide.
        closeUp(ctx, vs(S), 0, 4.2, Math.round(W() * 0.3), Math.round(H() * 0.48), [19, 6], T > 1.4 ? 1 : 0.35, RED, T);
        if (T > 1.4 && T < 1.5) kick(S, 4);
      },
      panel(ctx, S, k, T) {
        const open = ease(clamp((T - 0.35) / 0.15)), e = eyePanel(ctx, S, vs(S), k, T, open, RED);
        if (open > 0) say(S, 'rings', null, e[1].x, e[1].y, { r: 9, T, col: 'rgba(200,16,40,0.8)', a: open });
        K().embers(ctx, T, 14, 0, W(), '#c070ff');
        if (k > 0.9) fill(ctx, '#ffffff', (k - 0.9) / 0.1);
      },
      court(ctx, S, k, T) {
        grad(ctx, ['#0a0614', '#3a1a5a', '#24123a']);
        const cx = W() / 2, cy = Math.round(H() * 0.72), n = 6;
        A.actor(ctx, vs(S), 'Idle4', fr(T), Math.PI / 2, cx, cy, 1.8, {});
        for (let i = 0; i < n; i++) {
          const t0 = 0.15 + i * 0.12, a = i / n * Math.PI * 2 + 0.3, x = cx + Math.cos(a) * W() * 0.32, y = cy + Math.sin(a) * 26 - 6; if (T < t0) continue;
          if (T - t0 < 0.5) { const pk = (T - t0) / 0.5, rg = ctx.createRadialGradient(x, y - 14, 1, x, y - 14, 30 * pk + 4); rg.addColorStop(0, `rgba(10,4,20,${1 - pk})`); rg.addColorStop(1, 'rgba(10,4,20,0)'); ctx.fillStyle = rg; ctx.fillRect(x - 40, y - 54, 80, 80); }
          const raised = T > 1.3, fr2 = raised ? Math.min(6, Math.floor((T - 1.3) * 20)) : fr(T + i);
          const ang = Math.atan2(cy - y, cx - x);
          A.actor(ctx, set('umbral'), raised ? 'Attack1' : 'Idle4', fr2, ang, Math.round(x), Math.round(y), 1.9, { shade: '#05020a', alpha: clamp((T - t0) * 3) });
          eyes(ctx, set('umbral'), 'Idle4', 0, ang, Math.round(x), Math.round(y), 1.9, clamp((T - t0) * 3), '#e0b0ff');
        }
        say(S, 'line', 'SHADOW COURT', W() / 2, BAR + 18, { size: 14, col: '#e0b0ff', spacing: 4, a: clamp((T - 0.4) * 3) });
      },
      name(ctx, S, k, T) {
        const cx = W() / 2, cy = Math.round(H() * 0.72);
        const ring = (c) => { for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3; A.actor(ctx, set('umbral'), 'Attack1', 9, a + Math.PI, Math.round(cx + Math.cos(a) * 30), Math.round(cy + Math.sin(a) * 10), 1.9, c ? { shade: c } : {}); } };
        if (T < 0.25) { impactFrames(ctx, S, T / 0.25, (c) => { burst(ctx, cx, cy - 30, c, 90, 781, 12); ring(c); }, () => { grad(ctx, ['#0a0614', '#6a3a9a', '#24123a']); burst(ctx, cx, cy - 30, '#ffffff', 70, 785, 14); A.actor(ctx, vs(S), 'Special1', 9, Math.PI / 2, cx, cy, 1.8, {}); ring(null); }); return; }
        grad(ctx, ['#0a0414', '#2a1048', '#0a0614']);
        K().speedLines(ctx, cx, H() * 0.55, 60, 'rgba(224,176,255,0.3)', 783, T, 40);
        A.actor(ctx, set('umbral'), 'Taunt', fr(T), Math.PI / 2, cx, Math.round(H() * 0.95), 3.2, {});
        eyes(ctx, set('umbral'), 'Taunt', fr(T), Math.PI / 2, cx, Math.round(H() * 0.95), 3.2, 1, '#e0b0ff');
        nameCard(S, T - 0.25, 'THE UMBRAL', 'WHO WALKS BEHIND', H() * 0.24);
        if (k > 0.88) fill(ctx, '#ffffff', (k - 0.88) / 0.12);
      },
    } };

  // ---- The Hunger: the lights of the Waste go out one by one; something vast crawls in and eats the last ---
  function waste(ctx, T, lightsOut) {
    grad(ctx, ['#0c0806', '#2a1c16', '#3a2a20']);
    for (let i = 0; i < 60; i++) { const x = (hash(i, 791) * W() + T * 10) % W(), y = (hash(i, 792) * H() + T * (8 + hash(i, 793) * 10)) % H(); ctx.fillStyle = 'rgba(160,150,140,0.5)'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); }
    const gy = Math.round(H() * 0.78); ctx.fillStyle = '#0c0806'; ctx.fillRect(-8, gy, W() + 16, H());
    // Dead trees.
    for (let i = 0; i < 5; i++) { const x = Math.round(W() * (0.08 + i * 0.22)), h = 30 + hash(i, 794) * 30; ctx.fillStyle = '#060403'; ctx.fillRect(x, gy - h, 3, h); ctx.fillRect(x - 8, gy - h * 0.7, 10, 2); ctx.fillRect(x + 2, gy - h * 0.5, 9, 2); ctx.fillRect(x - 5, gy - h * 0.9, 6, 1); }
    // Far lights, going out.
    for (let i = 0; i < 6; i++) { if (i < lightsOut) continue; const x = W() * (0.1 + i * 0.16), y = gy - 4, f = 0.6 + 0.4 * Math.sin(T * 9 + i); ctx.fillStyle = '#ffb060'; ctx.fillRect(Math.round(x), y, 2, 2); A.tex(ctx, 'light_01', x, y, 30, 20, '#ff9a40', 0.5 * f, 0, true); }
    return gy;
  }
  const EPI_HUNGER = [[0, 'FIRST THE LIGHTS GO OUT', 1], [1.2, 'THEN IT COMES', 0]];
  F.hunger = { ...common, music: ['roar', 'boss'], shots: [['epi', 2.3], ['waste', 2.4], ['crawl', 2.2], ['roar', 2.0], ['name', 2.2], ['lunge', 1.4]],
    noBars: { epi: 1 }, flat: { epi: 1 }, impact: (n, T) => n === 'roar' && T > 0.15 && T < 1.5,
    sfx: [...epiSfx(EPI_HUNGER), ['waste', 0.6, 'thud', 0.5], ['waste', 1.2, 'thud', 0.6], ['waste', 1.8, 'thud', 0.7], ['crawl', 0.2, 'quake', 0.7], ['crawl', 0.9, 'quake', 0.8], ['crawl', 1.6, 'quake', 0.9], ['crawl', 1.9, 'magic', 0.6],
      ['roar', 0.2, 'horn', 1], ['roar', 0.25, 'quake', 1], ['roar', 0.3, 'blow_big', 0.8], ['name', 0.1, 'boss', 1], ['lunge', 0.2, 'whoosh', 1], ['lunge', 0.9, 'smash', 1]],
    draw: {
      epi: epigraph(EPI_HUNGER),
      waste(ctx, S, k, T) {
        const gy = waste(ctx, T, Math.floor(clamp((T - 0.5) / 1.6) * 5));
        vesperSmall(ctx, S, W() * 0.5, gy + 14, 1.6, T);
        say(S, 'card', 'THE ASHEN WASTE', 10, BAR + 16, { sub: 'THE THIRD HOUR', k: T });
      },
      crawl(ctx, S, k, T) {
        const gy = waste(ctx, T, 5), e = ease(k), sc = 1.6 + 1.6 * e, x = W() / 2, y = gy + 6 + e * 30;
        A.tex(ctx, 'light_01', x, gy - 30, W() * 0.9, H() * 0.9, '#a03020', 0.45, 0, true);
        // The last light, in the foreground, and the thing coming for it.
        const orb = 1 - clamp((T - 1.6) / 0.5), ox = W() * 0.5, oy = H() * 0.9;
        A.actor(ctx, set('hunger'), 'Walk', fr(T, 6), Math.PI / 2, Math.round(x), Math.round(y), sc, { shade: '#050302' });
        eyes(ctx, set('hunger'), 'Walk', fr(T, 6), Math.PI / 2, Math.round(x), Math.round(y), sc, 1, '#ff6a5a');
        if (orb > 0) { const ry = oy - (1 - orb) * 40; ctx.fillStyle = '#ffd080'; ctx.fillRect(Math.round(ox) - 1, Math.round(ry) - 1, 3, 3); A.tex(ctx, 'light_01', ox, ry, 70 * orb, 50 * orb, '#ffa040', 0.7 * orb, 0, true); }
        else fill(ctx, '#000', 0.4);
        kick(S, 1 + 2 * e);
      },
      roar(ctx, S, k, T) {
        grad(ctx, ['#1a0806', '#5a1a10', '#2a0c08']);
        A.tex(ctx, 'light_01', W() / 2, H() * 0.5, W() * 1.2, H() * 1.2, '#ff6a3a', 0.45, 0, true);
        K().speedLines(ctx, W() / 2, H() * 0.45, 80, 'rgba(255,200,170,0.35)', 801, T, 30);
        rings(ctx, W() / 2, H() * 0.45, k, 3, 260, 160, 'rgba(255,190,160,A)');
        const sc = 3.4, x = Math.round(W() / 2), y = Math.round(H() * 1.02);
        A.actor(ctx, set('hunger'), 'Taunt', Math.min(14, 4 + Math.floor(T * 8)), Math.PI / 2, x, y, sc, { shade: '#050302' });
        eyes(ctx, set('hunger'), 'Taunt', Math.min(14, 4 + Math.floor(T * 8)), Math.PI / 2, x, y, sc, 1, '#ff6a5a');
        K().hStreaks(ctx, 40, 'rgba(160,150,140,0.5)', 803, T, 1400);
        if (T > 0.15 && T < 0.3) { fill(ctx, T < 0.22 ? '#ff7a4a' : '#ffffff'); burst(ctx, x, H() * 0.45, '#000', 90, 805, 30); A.actor(ctx, set('hunger'), 'Taunt', 6, Math.PI / 2, x, y, sc, { shade: '#000' }); }   // the roar lands: two flat frames
        if (T > 0.3 && T < 1.5) say(S, 'knock', 'HUNGER', W() / 2, H() / 2, { size: 0.9, sx: 0.62, a: clamp((1.5 - T) * 4) * clamp((T - 0.3) * 10), col: '#050202' });
        kick(S, 5 * (1 - k * 0.6));
      },
      name(ctx, S, k, T) {
        grad(ctx, ['#140806', '#4a1a10', '#2a0e08']);
        const x = Math.round(W() / 2), y = Math.round(H() * 0.95);
        A.tex(ctx, 'light_01', x, H() * 0.6, W(), H(), '#ff6a3a', 0.35, 0, true);
        A.actor(ctx, set('hunger'), 'Idle4', fr(T, 6), Math.PI / 2, x, y, 3.0, { shade: '#050302' });
        eyes(ctx, set('hunger'), 'Idle4', fr(T, 6), Math.PI / 2, x, y, 3.0, 1, '#ff6a5a');
        // The dark closing in from the edges: it is eating the light.
        const g = ctx.createRadialGradient(W() / 2, H() / 2, H() * (0.7 - 0.45 * k), W() / 2, H() / 2, H() * (1.1 - 0.4 * k)); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)'); ctx.fillStyle = g; ctx.fillRect(-8, -8, W() + 16, H() + 16);
        nameCard(S, T, 'THE HUNGER', 'IT EATS THE LIGHT', H() * 0.26);
      },
      lunge(ctx, S, k, T) {
        grad(ctx, ['#1a0806', '#5a1a10', '#2a0c08']);
        const e = Math.pow(clamp(T / 0.9), 2.2), sc = 2 + 10 * e;
        A.actor(ctx, set('hunger'), 'Attack4', Math.min(14, Math.floor(T * 12)), Math.PI / 2, Math.round(W() / 2), Math.round(H() * (0.9 + e * 0.8)), sc, { shade: '#000000' });
        eyes(ctx, set('hunger'), 'Attack4', Math.min(14, Math.floor(T * 12)), Math.PI / 2, Math.round(W() / 2), Math.round(H() * (0.9 + e * 0.8)), sc, 1, '#ff6a5a');
        if (T > 0.9) fill(ctx, '#ffffff', clamp((T - 0.9) / 0.15));
        kick(S, 3 * e);
      },
    } };

  // ---- The Pale Wing: a storm on the cliff path; a shadow passes; it dives out of the clouds -------------
  function storm(ctx, T, gyF) {
    grad(ctx, ['#0a0c14', '#1c2232', '#2a3242']);
    const flash = (T % 1.7) < 0.08;
    if (flash) fill(ctx, '#ffffff', 0.25);
    for (let i = 0; i < 5; i++) A.tex(ctx, 'smoke_07', ((hash(i, 811) * W() * 1.6 + T * 40) % (W() * 1.6)) - W() * 0.3, H() * (0.15 + i * 0.07), W() * 0.9, 50, '#3a4252', 0.6, 0, false);
    const gy = Math.round(H() * (gyF || 0.8));
    ctx.fillStyle = '#06080c'; ctx.beginPath(); ctx.moveTo(-8, gy + 10); ctx.lineTo(W() * 0.4, gy); ctx.lineTo(W() + 8, gy - 12); ctx.lineTo(W() + 8, H() + 8); ctx.lineTo(-8, H() + 8); ctx.fill();
    K().hStreaks(ctx, 40, 'rgba(220,230,255,0.3)', 813, T, -1200);
    rain(ctx, T, 80, 0.35, -0.3);
    return gy;
  }
  const EPI_WING = [[0, 'LISTEN TO THE WIND', 1], [1.15, 'IT IS NOT THE WIND', 0]];
  F.wing = { ...common, music: ['dive', 'boss'], shots: [['epi', 2.3], ['throat', 2.4], ['shadow', 1.6], ['dive', 2.2], ['land', 1.8], ['name', 2.4]],
    noBars: { epi: 1 }, flat: { epi: 1 }, impact: (n, T) => n === 'land' && T < 0.2,
    sfx: [...epiSfx(EPI_WING), ['throat', 0.3, 'bolt', 0.6], ['throat', 1.7, 'bolt', 0.5], ['shadow', 0.1, 'whoosh', 1], ['dive', 0.2, 'horn', 0.9], ['dive', 0.8, 'whoosh', 1], ['dive', 1.5, 'whoosh', 1], ['land', 0, 'smash', 1], ['land', 0.02, 'quake', 1],
      ['land', 0.05, 'blow_big', 1], ['land', 0.5, 'whoosh', 0.8], ['name', 0.1, 'boss', 1], ['name', 0.6, 'whoosh', 0.8]],
    draw: {
      epi: epigraph(EPI_WING),
      throat(ctx, S, k, T) {
        const gy = storm(ctx, T);
        A.actor(ctx, vs(S), 'Walk', fr(T, 8), 0, Math.round(W() * (0.2 + k * 0.15)), gy + 6, 1.7, { shade: '#050608' });
        say(S, 'card', "THE WIND'S THROAT", 10, BAR + 16, { sub: 'THE FOURTH HOUR', k: T });
      },
      shadow(ctx, S, k, T) {
        const gy = storm(ctx, T);
        const sx = W() * 1.4 - k * W() * 1.8; ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.ellipse(sx, gy + 4, 160, 30, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(sx, H() * 0.3, 200, 50, 0, 0, 7); ctx.fill();
        A.actor(ctx, vs(S), 'Idle4', fr(T), -Math.PI / 2, Math.round(W() * 0.35), gy + 6, 1.7, { shade: '#050608' });
        for (let i = 0; i < 16; i++) { const t0 = 0.3 + hash(i, 821) * 0.8, a = T - t0; if (a < 0) continue; const x = W() * (0.1 + hash(i, 822) * 0.8) + Math.sin(a * 4 + i) * 10, y = BAR + a * (50 + hash(i, 823) * 30); ctx.fillStyle = '#f0f4ff'; ctx.fillRect(Math.round(x), Math.round(y), 2, 1); }
      },
      dive(ctx, S, k, T) {
        grad(ctx, ['#0a0c14', '#1c2232', '#3a4252']);
        if (T > 0.9 && T < 1.0) fill(ctx, '#ffffff', 0.5);
        K().speedLines(ctx, W() / 2, H() * 0.5, 80, 'rgba(230,240,255,0.4)', 831, T, 30);
        const e = ease(k), sc = 1.0 + 2.2 * e, x = W() * (0.85 - 0.35 * e), y = H() * (0.15 + 0.8 * e);
        for (let i = 3; i >= 1; i--) A.actor(ctx, set('wing'), 'Special1', Math.min(14, Math.floor(k * 14)), Math.PI * 0.75, Math.round(x + i * 18 * e), Math.round(y - i * 18 * e), sc, { shade: '#5a6478', alpha: 0.18 * (4 - i) });
        A.actor(ctx, set('wing'), 'Special1', Math.min(14, Math.floor(k * 14)), Math.PI * 0.75, Math.round(x), Math.round(y), sc, {});
        kick(S, 2 * e);
      },
      land(ctx, S, k, T) {
        const gy = Math.round(H() * 0.86), x = W() / 2;
        if (T < 0.2) { impactFrames(ctx, S, T / 0.2, (c) => { burst(ctx, x, gy - 40, c, 90, 841, 20); A.actor(ctx, set('wing'), 'Special1', 14, Math.PI / 2, x, gy, 2.4, { shade: c }); }, () => { storm(ctx, 0.5, 0.86); burst(ctx, x, gy - 40, '#ffffff', 70, 845, 24); A.actor(ctx, set('wing'), 'Special1', 14, Math.PI / 2, x, gy, 2.4, {}); }); return; }
        const e = (T - 0.2) / 1.6;
        storm(ctx, T, 0.86);
        rings(ctx, x, gy - 30, e, 3, 240, 90, 'rgba(230,240,255,A)');
        for (let i = 0; i < 50; i++) { const a = hash(i, 842) * 6.28 + T * 3, d = 40 + e * (60 + hash(i, 843) * 120); ctx.fillStyle = '#f0f4ff'; ctx.fillRect(Math.round(x + Math.cos(a) * d), Math.round(gy - 40 + Math.sin(a) * d * 0.5), 2, 1); }
        A.actor(ctx, set('wing'), 'Taunt', fr(T, 10), Math.PI / 2, x, gy, 2.4, {});
        eyes(ctx, set('wing'), 'Taunt', fr(T, 10), Math.PI / 2, x, gy, 2.4, 1, '#ffffff');
        kick(S, 5 * (1 - e));
      },
      name(ctx, S, k, T) {
        const gy = storm(ctx, T, 0.86), x = W() / 2;
        // Two tornadoes rising at the sides.
        for (const sx of [-1, 1]) { const tx = x + sx * W() * 0.34; for (let i = 0; i < 14; i++) { const y = gy - i * 9 * ease(k * 1.5), r = 4 + i * 2.2, o = Math.sin(T * 6 + i * 0.7) * (2 + i * 0.6); ctx.fillStyle = `rgba(200,212,235,${0.16 - i * 0.006})`; ctx.beginPath(); ctx.ellipse(tx + o, y, r, r * 0.5, 0, 0, 7); ctx.fill(); } A.tex(ctx, 'light_01', tx, gy - 60 * ease(k * 1.5), 60, 140, '#c8d4ea', 0.25, 0, true); }
        A.tex(ctx, 'light_01', x, gy - 60, 220, 200, '#c8d4ea', 0.35, 0, true);
        A.actor(ctx, set('wing'), 'Idle4', fr(T), Math.PI / 2, x, gy, 2.4, { shade: '#06080c' });
        eyes(ctx, set('wing'), 'Idle4', fr(T), Math.PI / 2, x, gy, 2.4, 1, '#ffffff');
        say(S, 'spaced', 'THE PALE WING', W() / 2, H() * 0.22, { size: 26, k: T, col: '#ffffff', glow: '#a8c8ff', dur: 1.3, from: 1.4, to: 0.18 });
        if (T > 1.0) say(S, 'line', 'THROAT OF THE WIND', W() / 2, H() * 0.22 + 24, { size: 14, col: '#e8eeff', a: clamp((T - 1.0) * 4), spacing: 3 });
        if (k > 0.88) fill(ctx, '#ffffff', (k - 0.88) / 0.12);
      },
    } };

  // ---- The First Cut: the summit above the clouds; he rises; the echoes of the fallen stand with him -------
  function summit(ctx, T, gyF) {
    grad(ctx, ['#0c0206', '#3a0812', '#6a1020']);
    stars(ctx, 40, 0.4, 851, T);
    moon(ctx, W() / 2, H() * 0.36, H() * 0.32, '#ff3a52', 'rgba(255,40,70,0.6)', 1, T);
    for (let i = 0; i < 6; i++) A.tex(ctx, 'smoke_04', ((hash(i, 852) * W() * 1.4 + T * (8 + i * 3)) % (W() * 1.4)) - W() * 0.2, H() * (0.72 + (i % 3) * 0.05), W() * 0.8, 40, '#3a0a14', 0.7, 0, false);
    const gy = Math.round(H() * (gyF || 0.86));
    ctx.fillStyle = '#050203'; ctx.beginPath(); ctx.moveTo(W() / 2 - 110, H() + 10); ctx.lineTo(W() / 2 - 80, gy); ctx.lineTo(W() / 2 + 80, gy); ctx.lineTo(W() / 2 + 110, H() + 10); ctx.fill();
    for (let x = W() / 2 - 80; x < W() / 2 + 80; x += 14) ctx.fillRect(Math.round(x), gy - 5, 8, 5);
    return gy;
  }
  const EPI_FIRST = [[0, 'SEVEN HUNDRED YEARS', 1], [1.05, 'SIX GUARDIANS', 0], [2.1, 'ONE NIGHT', 1], [3.15, 'THE TOP OF THE SPIRE', 0, 19]];
  F.firstCut = { ...common, music: ['rise', 'boss', 1.6], shots: [['epi', 4.4], ['summit', 2.0], ['rise', 2.8], ['blade', 2.0], ['host', 2.6], ['strike', 1.6]],
    noBars: { epi: 1 }, flat: { epi: 1 }, impact: (n, T) => n === 'strike' && T > 0.5,
    sfx: [...epiSfx(EPI_FIRST), ['epi', 3.2, 'charge', 0.8], ['rise', 1.95, 'blink', 0.7], ['summit', 0.2, 'horn', 0.6], ['rise', 0.2, 'quake', 0.9], ['rise', 1.0, 'quake', 1], ['rise', 1.9, 'boss', 1], ['rise', 1.92, 'blow_big', 1], ['blade', 0.2, 'unsheathe_01', 1], ['blade', 0.6, 'charge', 1],
      ['host', 0.2, 'spawn', 0.9], ['host', 0.6, 'reinforce', 0.8], ['host', 1.0, 'spawn', 0.9], ['strike', 0, 'whoosh', 1], ['strike', 0.5, 'smash', 1], ['strike', 0.52, 'blow_big', 1], ['strike', 0.55, 'quake', 1]],
    draw: {
      epi: epigraph(EPI_FIRST),
      summit(ctx, S, k, T) { const gy = summit(ctx, T); vesperSmall(ctx, S, W() / 2, gy + 26 - k * 22, 1.6, T); },
      rise(ctx, S, k, T) {
        grad(ctx, ['#0c0206', '#3a0812', '#6a1020']);
        const rise = ease(clamp((T - 0.2) / 1.8)), ey = Math.round(H() * (1.3 - 0.95 * rise));
        A.tex(ctx, 'light_01', W() / 2, ey + 30, W() * 1.4, H() * 1.4, '#ff3048', 0.5 * rise, 0, true);
        colossus(ctx, S, Math.round(W() / 2), ey, 6, T, { flat: true, col: '#030104' });
        burningEyes(ctx, Math.round(W() / 2), ey, 6, ease(clamp((T - 1.9) / 0.3)), T);
        const gy = Math.round(H() * 0.9); ctx.fillStyle = '#050203'; ctx.fillRect(-8, gy, W() + 16, H());
        vesperSmall(ctx, S, W() / 2, gy + 2, 1.4, T, -Math.PI / 2);
        track(S, W() / 2, gy - 10, 12, 22, T - 0.3, { col: '#ffe0e6' });
        if (T > 1.95) { track(S, W() / 2, ey, 34, 12, T - 1.95, { sub: 'TARGET' }); link(S, [W() / 2, gy - 22], [W() / 2, ey + 9], T - 2.05, 'ALT ' + Math.round(430 * rise)); }
        if (T > 1.9 && T < 1.97) { fill(ctx, '#ffffff', 0.5); kick(S, 6); }
        kick(S, 1.5 * rise);
      },
      blade(ctx, S, k, T) {
        grad(ctx, ['#0c0206', '#3a0812', '#20060c']);
        moon(ctx, W() / 2, H() * 0.24, H() * 0.3, '#ff3a52', 'rgba(255,40,70,0.6)', 1, T);
        const tip = Math.round(H() * (1.2 - 1.0 * ease(k)));
        A.tex(ctx, 'light_01', W() / 2, tip + 80, 70, H() * 1.2, RED, 0.45, 0, true);
        bigBlade(ctx, W() / 2, H() + 300, W() / 2, tip, 26, '#0a0608', '#ffb0bc');
        const run = clamp((T - 0.5) / 1.2); ctx.fillStyle = '#ff5a6a'; ctx.fillRect(Math.round(W() / 2) - 1, Math.round(H() - (H() - tip) * run), 2, Math.round((H() - tip) * run));
        for (let i = 0; i < 6; i++) A.tex(ctx, 'smoke_04', ((hash(i, 861) * W() * 1.4 + T * 10) % (W() * 1.4)) - W() * 0.2, H() * 0.88, W() * 0.7, 40, '#2a0610', 0.8, 0, false);
        sparks(ctx, W() / 2, tip + 10, T, 40, 863, 6.2);
        kick(S, 1.2);
      },
      host(ctx, S, k, T) {
        const gy = summit(ctx, T, 0.9);
        A.tex(ctx, 'light_01', W() / 2, H() * 0.2, W(), H(), '#ff3048', 0.25, 0, true);
        colossus(ctx, S, Math.round(W() / 2), Math.round(H() * 0.06), 7, T, { flat: true, col: '#12030a' });
        burningEyes(ctx, Math.round(W() / 2), Math.round(H() * 0.06), 7, 1, T);
        const echoes = ['warden', 'twinA', 'umbral', 'hunger', 'wing'];
        echoes.forEach((key, i) => {
          const t0 = 0.2 + i * 0.2, sx = (i % 2 ? 1 : -1) * (1 + Math.floor(i / 2)), x = Math.round(W() / 2 + sx * 46), sc = Math.min(2.4, 1.5 * (D.FOES[key].scale || 1)); if (T < t0) return;
          const a = clamp((T - t0) * 3);
          A.actor(ctx, set(key), 'Idle4', fr(T + i), Math.PI / 2, x, gy + 4 + Math.round((1 - ease(a)) * 30), sc, { shade: '#050203', alpha: a });
          eyes(ctx, set(key), 'Idle4', fr(T + i), Math.PI / 2, x, gy + 4, sc, a, D.FOES[key].color);
        });
        vesperSmall(ctx, S, W() / 2, H() + 8, 1.9, T, -Math.PI / 2, '#050203');
        if (T > 0.9) nameCard(S, T - 0.9, 'THE FIRST CUT', 'WHO WOUNDED THE MOON', H() * 0.42);
      },
      strike(ctx, S, k, T) {
        const gx = Math.round(W() * 0.46), gy = Math.round(H() * 0.86), tipX = gx + 4, tipY = gy - 30, fromX = W() * 1.25, fromY = -H() * 0.6;
        if (T < 0.5) {
          const f = ease(T / 0.5);
          grad(ctx, ['#12030a', '#4a0c18', '#1a0408']); ctx.fillStyle = '#080204'; ctx.fillRect(-8, gy, W() + 16, H());
          bigBlade(ctx, fromX, fromY, fromX + (tipX - fromX) * f, fromY + (tipY - fromY) * f, 26, '#1a1418', '#ffffff');
          A.actor(ctx, vs(S), 'Idle4', fr(T, 10), -Math.PI * 0.25, gx, gy, 1.7, {});
          return;
        }
        if (T < 0.56) { fill(ctx, '#ffffff'); kick(S, 9); return; }
        fill(ctx, '#000'); burst(ctx, tipX, tipY, '#ffffff', 90, 871, 10); bigBlade(ctx, fromX, fromY, tipX, tipY, 26, '#ffffff'); A.actor(ctx, vs(S), 'Special1', 8, -Math.PI * 0.25, gx, gy, 1.7, { shade: '#ffffff' });
        if (T > 0.62) say(S, 'punch', 'THIS ENDS TONIGHT', W() / 2, H() * 0.24, { size: 30, k: T - 0.62 });
        if (T > 1.3) fill(ctx, '#ffffff', (T - 1.3) / 0.3);
      },
    } };

  // Which film opens which guardian's fight.
  VS.FILM_FOR = { 'a0-b': 'warden', 'a1-b': 'twins', 'a2-b': 'umbral', 'a3-b': 'hunger', 'a4-b': 'wing', 'a5-b': 'firstCut' };
})();
