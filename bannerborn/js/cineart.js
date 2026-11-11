// Bannerborn — art made for the cutscenes. The game's people are 42-pixel sprites, right for the field and wrong for
// a close shot, so the films have their own cast: figures drawn here at whatever size the shot needs (knights by
// helm and weapon, the Captain, three kinds of the dead, Vesh Morrow), posed from a small skeleton of joints, shaded
// and edge-lit for the light of the shot, and kept once drawn.
//   BB.CineArt.draw(g, kind, opts, x, y, height, light, flip)   kind: 'knight' | 'dead' | 'vesh'
//   BB.CineArt.skull(g, x, y, size, opts)                      a skull, close
//   BB.CineArt.eyes(g, kind, opts, x, y, height, rgb, alpha, flip)   the lights in a figure's head, drawn live
(function () {
  const BB = window.BB, A = BB.CineArt = {}, TAU = Math.PI * 2;
  const lerp = (a, b, k) => a + (b - a) * k;
  const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mix = (a, b, k) => { const x = rgb(a), y = rgb(b); return 'rgb(' + x.map((v, i) => Math.round(lerp(v, y[i], k))).join(',') + ')'; };

  // ---------------------------------------------------------------- poses: joints of a figure one unit tall, feet at 0
  const P0 = { hip: [0, -0.53], neck: [0, -0.84], head: [0, -0.92], shL: [-0.14, -0.805], shR: [0.14, -0.805], elL: [-0.2, -0.65], haL: [-0.185, -0.5], elR: [0.205, -0.65], haR: [0.225, -0.5], knL: [-0.085, -0.28], ftL: [-0.12, 0], knR: [0.09, -0.28], ftR: [0.135, 0] };
  const pose = (d) => Object.assign({}, P0, d);
  const POSE = A.POSE = {
    stand: P0,
    guard: pose({ elR: [0.2, -0.66], haR: [0.24, -0.56], elL: [-0.2, -0.66], haL: [-0.14, -0.6] }),
    raise: pose({ elR: [0.2, -0.93], haR: [0.165, -1.07], neck: [0.005, -0.835], head: [0.012, -0.922], elL: [-0.19, -0.65], haL: [-0.2, -0.5] }),
    hold: pose({ elR: [0.17, -0.7], haR: [0.105, -0.62], elL: [-0.17, -0.7], haL: [-0.1, -0.6], ftL: [-0.11, 0], ftR: [0.12, 0], knL: [-0.08, -0.26], knR: [0.085, -0.26] }),
    kneel: pose({ hip: [0, -0.33], neck: [0.01, -0.64], head: [0.02, -0.715], shL: [-0.12, -0.615], shR: [0.125, -0.61], elL: [-0.15, -0.47], haL: [-0.04, -0.42], elR: [0.15, -0.47], haR: [0.02, -0.44], knL: [-0.13, -0.24], ftL: [-0.11, 0], knR: [0.11, -0.03], ftR: [0.26, -0.02] }),
    slash: pose({ hip: [-0.02, -0.46], neck: [-0.07, -0.77], head: [-0.09, -0.85], shL: [-0.19, -0.76], shR: [0.05, -0.75], elL: [-0.28, -0.66], haL: [-0.33, -0.55], elR: [-0.06, -0.6], haR: [-0.2, -0.52], knL: [-0.17, -0.25], ftL: [-0.25, 0], knR: [0.11, -0.24], ftR: [0.22, 0] }),
    walkA: pose({ hip: [0, -0.47], neck: [0.025, -0.775], head: [0.04, -0.85], shL: [-0.1, -0.755], shR: [0.14, -0.74], elL: [-0.16, -0.6], haL: [-0.13, -0.45], elR: [0.2, -0.62], haR: [0.22, -0.5], knL: [-0.09, -0.25], ftL: [-0.1, 0], knR: [0.07, -0.27], ftR: [0.06, -0.05] }),
    walkB: pose({ hip: [0, -0.47], neck: [-0.02, -0.775], head: [-0.03, -0.85], shL: [-0.14, -0.74], shR: [0.1, -0.755], elL: [-0.2, -0.62], haL: [-0.21, -0.5], elR: [0.16, -0.6], haR: [0.14, -0.45], knL: [-0.07, -0.27], ftL: [-0.06, -0.05], knR: [0.09, -0.25], ftR: [0.1, 0] }),
    reach: pose({ hip: [0, -0.47], neck: [0, -0.78], head: [0, -0.86], shL: [-0.13, -0.76], shR: [0.13, -0.76], elL: [-0.24, -0.8], haL: [-0.3, -0.95], elR: [0.24, -0.8], haR: [0.3, -0.95], knL: [-0.1, -0.25], ftL: [-0.13, 0], knR: [0.1, -0.25], ftR: [0.13, 0] }),
    sing: pose({ elL: [-0.26, -0.74], haL: [-0.36, -0.9], elR: [0.25, -0.7], haR: [0.3, -0.62] }),
  };
  const getPose = (p) => (typeof p === 'string' ? POSE[p] || P0 : p || P0);
  A.blend = (a, b, k) => { const x = getPose(a), y = getPose(b), o = {}; for (const j in x) o[j] = [lerp(x[j][0], y[j][0], k), lerp(x[j][1], y[j][1], k)]; return o; };

  // ---------------------------------------------------------------- shapes
  const INK = '#04050a';
  function limb(g, a, b, w0, w1, fill) { // a tapered limb with rounded ends
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
    g.beginPath(); g.moveTo(a[0] + nx * w0, a[1] + ny * w0); g.lineTo(b[0] + nx * w1, b[1] + ny * w1); g.arc(b[0], b[1], w1, Math.atan2(ny, nx), Math.atan2(-ny, -nx), true); g.lineTo(a[0] - nx * w0, a[1] - ny * w0); g.arc(a[0], a[1], w0, Math.atan2(-ny, -nx), Math.atan2(ny, nx), true); g.closePath();
    g.fillStyle = fill; g.fill(); g.stroke();
  }
  const blob = (g, x, y, rx, ry, fill, rot) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, TAU); g.fillStyle = fill; g.fill(); g.stroke(); };
  const poly = (g, pts, fill, noStroke) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fillStyle = fill; g.fill(); if (!noStroke) g.stroke(); };

  function weapon(g, kind, h, pal, up) { // held in the hand at h; 'up' = carried aloft
    const steel = pal.steel, wood = pal.wood;
    if (kind === 'sword' || kind === 'great') {
      const L0 = kind === 'great' ? 0.56 : 0.42, w = kind === 'great' ? 0.022 : 0.016, d = up ? -1 : 1, y0 = h[1] + d * 0.03;
      poly(g, [[h[0] - w, y0], [h[0] + w, y0], [h[0] + w * 0.8, y0 + d * L0 * 0.86], [h[0], y0 + d * L0], [h[0] - w * 0.8, y0 + d * L0 * 0.86]], steel);
      g.save(); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 0.004; g.beginPath(); g.moveTo(h[0], y0 + d * 0.02); g.lineTo(h[0], y0 + d * L0 * 0.8); g.stroke(); g.restore();
      poly(g, [[h[0] - 0.06, y0 - d * 0.012], [h[0] + 0.06, y0 - d * 0.012], [h[0] + 0.06, y0 + d * 0.006], [h[0] - 0.06, y0 + d * 0.006]], pal.trim);
      limb(g, [h[0], y0 - d * 0.012], [h[0], y0 - d * 0.075], 0.01, 0.01, wood); blob(g, h[0], y0 - d * 0.085, 0.017, 0.017, pal.trim);
    } else if (kind === 'spear' || kind === 'halberd' || kind === 'axe' || kind === 'hammer' || kind === 'staff' || kind === 'pole') {
      const top = h[1] - (kind === 'axe' || kind === 'hammer' || kind === 'staff' ? 0.5 : 0.66), bot = Math.min(0, h[1] + 0.5);
      limb(g, [h[0], bot], [h[0], top], 0.011, 0.01, wood);
      if (kind === 'spear') poly(g, [[h[0], top - 0.13], [h[0] + 0.026, top - 0.02], [h[0], top + 0.01], [h[0] - 0.026, top - 0.02]], steel);
      if (kind === 'halberd') { poly(g, [[h[0], top - 0.14], [h[0] + 0.02, top - 0.02], [h[0] - 0.02, top - 0.02]], steel); poly(g, [[h[0] + 0.01, top - 0.015], [h[0] + 0.1, top - 0.05], [h[0] + 0.115, top + 0.03], [h[0] + 0.1, top + 0.1], [h[0] + 0.01, top + 0.07]], steel); poly(g, [[h[0] - 0.01, top + 0.01], [h[0] - 0.07, top + 0.03], [h[0] - 0.01, top + 0.05]], steel); }
      if (kind === 'axe') { poly(g, [[h[0] + 0.008, top - 0.01], [h[0] + 0.1, top - 0.07], [h[0] + 0.125, top + 0.03], [h[0] + 0.1, top + 0.13], [h[0] + 0.008, top + 0.08]], steel); poly(g, [[h[0] - 0.008, top - 0.01], [h[0] - 0.1, top - 0.07], [h[0] - 0.125, top + 0.03], [h[0] - 0.1, top + 0.13], [h[0] - 0.008, top + 0.08]], steel); }
      if (kind === 'hammer') { poly(g, [[h[0] - 0.085, top - 0.03], [h[0] + 0.085, top - 0.03], [h[0] + 0.095, top + 0.07], [h[0] - 0.095, top + 0.07]], steel); poly(g, [[h[0] - 0.02, top - 0.07], [h[0] + 0.02, top - 0.07], [h[0] + 0.012, top - 0.03], [h[0] - 0.012, top - 0.03]], steel); }
      if (kind === 'staff') { g.save(); g.lineWidth = 0.014; g.strokeStyle = pal.bone || steel; g.beginPath(); g.arc(h[0], top - 0.05, 0.05, 0.6, TAU - 1.0); g.stroke(); g.restore(); }
    } else if (kind === 'bow') {
      g.save(); g.lineWidth = 0.016; g.strokeStyle = wood; g.lineCap = 'round'; g.beginPath(); g.moveTo(h[0] - 0.02, h[1] - 0.3); g.quadraticCurveTo(h[0] + 0.13, h[1], h[0] - 0.02, h[1] + 0.3); g.stroke(); g.lineWidth = 0.004; g.strokeStyle = 'rgba(230,230,230,0.8)'; g.beginPath(); g.moveTo(h[0] - 0.02, h[1] - 0.3); g.lineTo(h[0] - 0.02, h[1] + 0.3); g.stroke(); g.restore();
    } else if (kind === 'cleaver') {
      const d = up ? -1 : 1, y0 = h[1] + d * 0.02; poly(g, [[h[0] - 0.012, y0], [h[0] + 0.02, y0], [h[0] + 0.05, y0 + d * 0.2], [h[0] + 0.03, y0 + d * 0.34], [h[0] - 0.02, y0 + d * 0.3], [h[0] - 0.004, y0 + d * 0.16]], steel); limb(g, [h[0], y0], [h[0], y0 - d * 0.07], 0.01, 0.01, wood);
    }
  }
  function helm(g, kind, c, pal) { // c: the middle of the head
    const x = c[0], y = c[1], r = 0.058, pl = pal.plate;
    if (kind === 'hood') { poly(g, [[x - 0.085, y + 0.075], [x - 0.07, y - 0.03], [x, y - 0.1], [x + 0.07, y - 0.03], [x + 0.085, y + 0.075], [x + 0.03, y + 0.09], [x - 0.03, y + 0.09]], pal.cloth); blob(g, x, y + 0.005, 0.04, 0.052, '#07070c'); return; }
    if (kind === 'open') { blob(g, x, y, r * 0.86, r * 1.05, pal.skin || '#b98a64'); g.beginPath(); g.arc(x, y - 0.012, r * 1.02, Math.PI * 0.98, TAU + 0.02); g.quadraticCurveTo(x + 0.03, y - 0.03, x - 0.02, y - 0.045); g.quadraticCurveTo(x - 0.05, y - 0.035, x - r * 1.02, y + 0.02); g.closePath(); g.fillStyle = pal.hair || '#5a2e12'; g.fill(); g.stroke(); return; }
    if (kind === 'wings') for (const d of [-1, 1]) poly(g, [[x + d * 0.045, y - 0.01], [x + d * 0.13, y - 0.13], [x + d * 0.105, y - 0.06], [x + d * 0.15, y - 0.075], [x + d * 0.105, y - 0.02], [x + d * 0.13, y - 0.02], [x + d * 0.05, y + 0.03]], pal.trim);
    if (kind === 'horn') for (const d of [-1, 1]) { g.beginPath(); g.moveTo(x + d * 0.045, y - 0.02); g.quadraticCurveTo(x + d * 0.14, y - 0.03, x + d * 0.13, y - 0.15); g.quadraticCurveTo(x + d * 0.09, y - 0.07, x + d * 0.04, y - 0.055); g.closePath(); g.fillStyle = pal.bone || '#d9d2bd'; g.fill(); g.stroke(); }
    if (kind === 'plume') { g.beginPath(); g.moveTo(x - 0.01, y - 0.06); g.bezierCurveTo(x - 0.02, y - 0.2, x + 0.1, y - 0.2, x + 0.13, y - 0.05); g.bezierCurveTo(x + 0.08, y - 0.12, x + 0.04, y - 0.1, x + 0.02, y - 0.055); g.closePath(); g.fillStyle = pal.clothLit; g.fill(); g.stroke(); }
    if (kind === 'kettle') { blob(g, x, y - 0.012, 0.062, 0.058, pl); blob(g, x, y - 0.005, 0.1, 0.02, pl); blob(g, x, y + 0.04, 0.04, 0.038, '#07070c'); return; }
    // the helmet itself: a closed bucket with a slit, or a rounder barbute
    if (kind === 'great' || kind === 'crown') poly(g, [[x - 0.058, y - 0.05], [x - 0.04, y - 0.075], [x + 0.04, y - 0.075], [x + 0.058, y - 0.05], [x + 0.062, y + 0.07], [x, y + 0.092], [x - 0.062, y + 0.07]], pl);
    else { g.beginPath(); g.moveTo(x - 0.06, y + 0.07); g.bezierCurveTo(x - 0.075, y - 0.03, x - 0.05, y - 0.085, x, y - 0.085); g.bezierCurveTo(x + 0.05, y - 0.085, x + 0.075, y - 0.03, x + 0.06, y + 0.07); g.lineTo(x + 0.02, y + 0.085); g.lineTo(x, y + 0.03); g.lineTo(x - 0.02, y + 0.085); g.closePath(); g.fillStyle = pl; g.fill(); g.stroke(); }
    g.fillStyle = '#020204'; g.fillRect(x - 0.045, y - 0.012, 0.09, 0.014); g.fillRect(x - 0.004, y - 0.012, 0.008, 0.075);
    if (kind === 'crown') poly(g, [[x - 0.06, y - 0.05], [x - 0.06, y - 0.1], [x - 0.035, y - 0.075], [x - 0.018, y - 0.115], [x, y - 0.08], [x + 0.018, y - 0.115], [x + 0.035, y - 0.075], [x + 0.06, y - 0.1], [x + 0.06, y - 0.05]], pal.trim);
    if (kind === 'crest') poly(g, [[x - 0.012, y - 0.08], [x - 0.012, y - 0.13], [x + 0.012, y - 0.13], [x + 0.012, y - 0.08]], pal.clothLit);
  }

  // ---------------------------------------------------------------- a knight (and the Captain, who is one)
  function knight(g, o) {
    const P = getPose(o.pose), c = o.color || '#b3242c', heavy = o.heavy ? 1.18 : 1;
    const pal = { plate: o.plate || '#5b6478', dark: '#2a2f3c', cloth: mix(c, '#000000', 0.25), clothLit: mix(c, '#ffffff', 0.12), trim: o.trim || '#d8b25a', steel: '#c9d2e0', wood: '#4a3424', skin: o.skin, hair: o.hair, bone: '#d9d2bd' };
    g.lineWidth = 0.007; g.strokeStyle = INK; g.lineJoin = 'round';
    if (o.cape !== false) { const w = o.wind || 0; g.beginPath(); g.moveTo(P.shL[0] - 0.01, P.shL[1] - 0.02); g.lineTo(P.shR[0] + 0.01, P.shR[1] - 0.02); g.bezierCurveTo(P.shR[0] + 0.1 + w * 0.3, -0.55, 0.2 + w * 0.6, -0.3, 0.19 + w, -0.07); g.lineTo(0.12 + w * 0.9, -0.1); g.lineTo(0.06 + w * 0.8, -0.05); g.lineTo(-0.02 + w * 0.7, -0.09); g.lineTo(-0.1 + w * 0.6, -0.04); g.lineTo(-0.18 + w * 0.5, -0.08); g.bezierCurveTo(-0.21 + w * 0.3, -0.3, P.shL[0] - 0.09, -0.55, P.shL[0] - 0.01, P.shL[1] - 0.02); g.closePath(); g.fillStyle = mix(c, '#000000', 0.5); g.fill(); g.stroke(); }
    if (o.weapon === 'bow') weapon(g, 'bow', P.haL, pal);
    for (const s of ['L', 'R']) { const hx = P.hip[0] + (s === 'L' ? -0.05 : 0.05), k = P['kn' + s], f = P['ft' + s]; limb(g, [hx, P.hip[1]], k, 0.058 * heavy, 0.04 * heavy, pal.dark); limb(g, k, f, 0.046 * heavy, 0.03 * heavy, pal.plate); blob(g, k[0], k[1], 0.036 * heavy, 0.036 * heavy, pal.plate); poly(g, [[f[0] - 0.035, f[1] - 0.03], [f[0] + 0.03, f[1] - 0.035], [f[0] + (s === 'L' ? -0.06 : 0.06), f[1]], [f[0] - (s === 'L' ? -0.035 : 0.035), f[1]]], pal.dark); }
    const sl = P.shL, sr = P.shR, hp = P.hip, w = 0.07 * heavy; // the body: plate over mail, a tabard in the banner's colour
    poly(g, [[hp[0] - w, hp[1] - 0.01], [hp[0] + w, hp[1] - 0.01], [hp[0] + w + 0.04, hp[1] + 0.11], [hp[0] + 0.03, hp[1] + 0.09], [hp[0] - 0.03, hp[1] + 0.09], [hp[0] - w - 0.04, hp[1] + 0.11]], pal.dark); // the skirt of plates
    poly(g, [[sl[0] + 0.01, sl[1] - 0.025], [sr[0] - 0.01, sr[1] - 0.025], [sr[0] + 0.01, sr[1] + 0.09], [hp[0] + w, hp[1] - 0.02], [hp[0] + w * 0.95, hp[1] + 0.06], [hp[0] - w * 0.95, hp[1] + 0.06], [hp[0] - w, hp[1] - 0.02], [sl[0] - 0.01, sl[1] + 0.09]], pal.plate);
    poly(g, [[hp[0] - 0.05, sl[1] + 0.035], [hp[0] + 0.05, sr[1] + 0.035], [hp[0] + 0.062, hp[1] + 0.02], [hp[0] + 0.075, hp[1] + 0.2], [hp[0] + 0.02, hp[1] + 0.17], [hp[0], hp[1] + 0.21], [hp[0] - 0.02, hp[1] + 0.17], [hp[0] - 0.075, hp[1] + 0.2], [hp[0] - 0.062, hp[1] + 0.02]], pal.cloth);
    g.fillStyle = pal.trim; g.fillRect(hp[0] - w, hp[1] - 0.005, w * 2, 0.022); g.beginPath(); g.arc((sl[0] + sr[0]) / 2, sl[1] + 0.12, 0.024, 0, TAU); g.fill();
    limb(g, sl, P.elL, 0.042 * heavy, 0.036 * heavy, pal.dark); limb(g, P.elL, P.haL, 0.036 * heavy, 0.032 * heavy, pal.plate);
    for (const [q, d] of [[sl, -1], [sr, 1]]) { blob(g, q[0] + d * 0.03, q[1] + 0.045, 0.05 * heavy, 0.036 * heavy, pal.dark, d * 0.5); blob(g, q[0] + d * 0.012, q[1], 0.074 * heavy, 0.054 * heavy, pal.plate, d * 0.3); g.save(); g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 0.006; g.beginPath(); g.ellipse(q[0] + d * 0.012, q[1], 0.055 * heavy, 0.036 * heavy, d * 0.3, Math.PI * 1.1, Math.PI * 1.8); g.stroke(); g.restore(); }
    poly(g, [[P.neck[0] - 0.05, P.neck[1] + 0.035], [P.neck[0] + 0.05, P.neck[1] + 0.035], [P.neck[0] + 0.035, P.neck[1] - 0.005], [P.neck[0] - 0.035, P.neck[1] - 0.005]], pal.plate); // gorget
    limb(g, [P.neck[0], P.neck[1] + 0.02], P.head, 0.03, 0.03, pal.dark); helm(g, o.helm || 'great', P.head, pal);
    if (o.shield) { const s = P.haL, e = P.elL, x = (s[0] + e[0]) / 2 - 0.02, y = (s[1] + e[1]) / 2 + 0.02; g.beginPath(); g.moveTo(x - 0.1, y - 0.14); g.lineTo(x + 0.09, y - 0.14); g.bezierCurveTo(x + 0.1, y + 0.05, x + 0.04, y + 0.16, x - 0.005, y + 0.2); g.bezierCurveTo(x - 0.05, y + 0.16, x - 0.11, y + 0.05, x - 0.1, y - 0.14); g.closePath(); g.fillStyle = pal.cloth; g.fill(); g.stroke(); g.save(); g.lineWidth = 0.014; g.strokeStyle = pal.trim; g.stroke(); g.restore(); blob(g, x - 0.005, y - 0.01, 0.028, 0.028, pal.trim); } else blob(g, P.haL[0], P.haL[1], 0.033 * heavy, 0.033 * heavy, pal.dark);
    if (o.weapon && o.weapon !== 'bow') weapon(g, o.weapon, P.haR, pal, o.pose === 'raise');
    limb(g, sr, P.elR, 0.042 * heavy, 0.036 * heavy, pal.dark); limb(g, P.elR, P.haR, 0.036 * heavy, 0.032 * heavy, pal.plate); blob(g, P.haR[0], P.haR[1], 0.034 * heavy, 0.034 * heavy, pal.dark);
  }

  // ---------------------------------------------------------------- the dead: bone, rag, rust
  function bones(g, a, b, w, fill) { limb(g, a, b, w, w * 0.8, fill); blob(g, a[0], a[1], w * 1.45, w * 1.45, fill); }
  function dead(g, o) {
    const P = getPose(o.pose || 'walkA'), bone = '#d6cfba', rag = o.rag || '#3a2552', v = o.v || 'reaver';
    const pal = { plate: '#5a5f5c', cloth: rag, clothLit: mix(rag, '#ffffff', 0.15), trim: '#7a6a3a', steel: '#8f8b80', wood: '#3a2a1e', bone };
    g.lineWidth = 0.006; g.strokeStyle = INK; g.lineJoin = 'round';
    if (v === 'caller') { // a robe to the ground, torn at the hem
      const s = P.shL, r = P.shR; poly(g, [[s[0] - 0.02, s[1]], [r[0] + 0.02, r[1]], [0.17, -0.3], [0.2, -0.02], [0.14, -0.06], [0.09, 0], [0.03, -0.05], [-0.04, 0], [-0.1, -0.06], [-0.15, -0.01], [-0.2, -0.04], [-0.17, -0.3]], rag);
    } else for (const s of ['L', 'R']) { const hx = P.hip[0] + (s === 'L' ? -0.045 : 0.045), k = P['kn' + s], f = P['ft' + s]; bones(g, [hx, P.hip[1]], k, 0.017, bone); bones(g, k, f, 0.014, bone); poly(g, [[f[0] - 0.02, f[1] - 0.02], [f[0] + (s === 'L' ? -0.06 : 0.06), f[1]], [f[0] + 0.02, f[1]]], bone); }
    const hp = P.hip, nk = P.neck;
    if (v !== 'caller') { poly(g, [[hp[0] - 0.07, hp[1] - 0.04], [hp[0] + 0.07, hp[1] - 0.04], [hp[0] + 0.05, hp[1] + 0.03], [hp[0], hp[1] + 0.05], [hp[0] - 0.05, hp[1] + 0.03]], bone); // pelvis, and the rag that hangs from it
      poly(g, [[hp[0] - 0.075, hp[1] - 0.03], [hp[0] + 0.075, hp[1] - 0.03], [hp[0] + 0.09, hp[1] + 0.17], [hp[0] + 0.045, hp[1] + 0.11], [hp[0] + 0.01, hp[1] + 0.2], [hp[0] - 0.035, hp[1] + 0.12], [hp[0] - 0.085, hp[1] + 0.18]], rag); }
    limb(g, [hp[0], hp[1] - 0.03], nk, 0.014, 0.012, bone); // the spine, and the ribs off it
    if (v !== 'caller') { g.save(); g.lineCap = 'round'; for (let i = 0; i < 5; i++) { const k = 0.2 + i * 0.16, x = lerp(nk[0], hp[0], k), y = lerp(nk[1], hp[1], k), wd = 0.1 - i * 0.012; for (const d of [-1, 1]) { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + d * wd * 1.15, y - 0.012, x + d * wd, y + 0.045); g.strokeStyle = INK; g.lineWidth = 0.024; g.stroke(); g.strokeStyle = bone; g.lineWidth = 0.013; g.stroke(); } } g.restore(); }
    for (const s of ['L', 'R']) { const sh = P['sh' + s], el = P['el' + s], ha = P['ha' + s]; if (s === 'R' && o.weapon) weapon(g, o.weapon, ha, pal, (o.pose || '') === 'reach'); bones(g, sh, el, 0.015, bone); bones(g, el, ha, 0.012, bone);
      g.save(); g.lineCap = 'round'; const up = ha[1] < el[1] ? -1 : 1; for (let f = -1; f <= 1; f++) { g.beginPath(); g.moveTo(ha[0], ha[1]); g.lineTo(ha[0] + f * 0.02, ha[1] + up * 0.045); g.strokeStyle = INK; g.lineWidth = 0.016; g.stroke(); g.strokeStyle = bone; g.lineWidth = 0.008; g.stroke(); } g.restore(); }
    if (v === 'warden') { const s = P.haL, x = s[0] - 0.02, y = s[1] - 0.06; blob(g, x, y, 0.13, 0.15, '#3c3026'); g.save(); g.lineWidth = 0.014; g.strokeStyle = '#6f6a5c'; g.beginPath(); g.ellipse(x, y, 0.13, 0.15, 0, 0, TAU); g.stroke(); g.restore(); blob(g, x, y, 0.035, 0.04, '#6f6a5c'); }
    if (v !== 'caller') poly(g, [[P.shL[0] - 0.03, P.shL[1] - 0.015], [P.shR[0] + 0.03, P.shR[1] - 0.015], [P.shR[0] + 0.02, P.shR[1] + 0.05], [nk[0] + 0.03, nk[1] + 0.09], [nk[0] - 0.02, nk[1] + 0.05], [P.shL[0] - 0.035, P.shL[1] + 0.07]], rag);
    A.skull(g, P.head[0], P.head[1] - 0.005, 0.062, { flat: true, eye: 0, shadow: '#8f8a78', mid: '#bdb6a0', bone: '#e6e0cc', dark: '#06060a' });
    if (v === 'warden') { blob(g, P.head[0], P.head[1] - 0.045, 0.066, 0.04, pal.plate); blob(g, P.head[0], P.head[1] - 0.028, 0.098, 0.016, pal.plate); }
    if (v === 'caller') poly(g, [[P.head[0] - 0.09, P.head[1] + 0.07], [P.head[0] - 0.075, P.head[1] - 0.04], [P.head[0], P.head[1] - 0.11], [P.head[0] + 0.075, P.head[1] - 0.04], [P.head[0] + 0.09, P.head[1] + 0.07], [P.head[0] + 0.06, P.head[1] - 0.01], [P.head[0], P.head[1] - 0.07], [P.head[0] - 0.06, P.head[1] - 0.01]], rag);
  }

  // ---------------------------------------------------------------- Vesh Morrow, the Bone Cantor: tall, robed, crowned in bone
  function vesh(g, o) {
    const P = getPose(o.pose || 'sing'), bone = '#cfe6d8', robe = '#3a0c14', pal = { plate: '#333', cloth: robe, clothLit: '#5a1420', trim: '#9fc7ae', steel: '#9fc7ae', wood: '#141a14', bone };
    g.lineWidth = 0.006; g.strokeStyle = INK; g.lineJoin = 'round';
    const s = P.shL, r = P.shR;
    poly(g, [[s[0] - 0.03, s[1] - 0.01], [r[0] + 0.03, r[1] - 0.01], [0.15, -0.5], [0.2, -0.2], [0.27, 0], [0.19, -0.05], [0.13, 0.005], [0.06, -0.04], [0, 0.005], [-0.07, -0.04], [-0.13, 0.005], [-0.2, -0.05], [-0.27, 0], [-0.2, -0.2], [-0.15, -0.5]], robe);
    g.save(); g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 0.008; for (const x of [-0.11, -0.04, 0.05, 0.12]) { g.beginPath(); g.moveTo(x * 0.6, -0.6); g.quadraticCurveTo(x * 1.2, -0.3, x * 1.6, -0.03); g.stroke(); } g.restore();
    weapon(g, 'staff', [P.haR[0], P.haR[1]], pal);
    for (const d of ['L', 'R']) { const sh = P['sh' + d], el = P['el' + d], ha = P['ha' + d], k = d === 'L' ? -1 : 1; // sleeves that hang wide from the arms
      g.beginPath(); g.moveTo(sh[0] - k * 0.02, sh[1] - 0.035); g.quadraticCurveTo(el[0], el[1] - 0.06, ha[0] + k * 0.005, ha[1] - 0.03); g.lineTo(ha[0] + k * 0.02, ha[1] + 0.04); g.bezierCurveTo(ha[0] - k * 0.02, ha[1] + 0.2, el[0] + k * 0.03, el[1] + 0.34, el[0] - k * 0.06, el[1] + 0.36); g.quadraticCurveTo(sh[0], el[1] + 0.2, sh[0] - k * 0.04, sh[1] + 0.12); g.closePath(); g.fillStyle = pal.clothLit; g.fill(); g.stroke();
      g.save(); g.lineCap = 'round'; for (let f = -1; f <= 1; f++) { g.beginPath(); g.moveTo(ha[0], ha[1]); g.lineTo(ha[0] + k * 0.03 + f * 0.012, ha[1] - 0.045 + Math.abs(f) * 0.01); g.strokeStyle = INK; g.lineWidth = 0.014; g.stroke(); g.strokeStyle = bone; g.lineWidth = 0.007; g.stroke(); } g.restore(); }
    g.save(); g.lineCap = 'round'; for (let i = 0; i < 4; i++) for (const d of [-1, 1]) { g.beginPath(); g.moveTo(d * 0.01, -0.76 + i * 0.045); g.quadraticCurveTo(d * 0.08, -0.775 + i * 0.045, d * (0.11 + i * 0.008), -0.72 + i * 0.05); g.strokeStyle = INK; g.lineWidth = 0.02; g.stroke(); g.strokeStyle = bone; g.lineWidth = 0.011; g.stroke(); } g.restore(); // ribs worn as a collar
    const h = P.head; for (let i = 0; i < 7; i++) { const an = -Math.PI / 2 + (i - 3) * 0.33, r1 = 0.15 + (i % 2 ? 0 : 0.045) - Math.abs(i - 3) * 0.008; poly(g, [[h[0] + Math.cos(an - 0.1) * 0.085, h[1] + Math.sin(an - 0.1) * 0.085], [h[0] + Math.cos(an) * r1, h[1] + Math.sin(an) * r1], [h[0] + Math.cos(an + 0.1) * 0.085, h[1] + Math.sin(an + 0.1) * 0.085]], bone); }
    poly(g, [[h[0] - 0.11, h[1] + 0.11], [h[0] - 0.09, h[1] - 0.04], [h[0], h[1] - 0.115], [h[0] + 0.09, h[1] - 0.04], [h[0] + 0.11, h[1] + 0.11], [h[0] + 0.04, h[1] + 0.13], [h[0] - 0.04, h[1] + 0.13]], robe);
    blob(g, h[0], h[1] + 0.012, 0.058, 0.074, '#050305');
    A.skull(g, h[0], h[1] + 0.005, 0.05, { flat: true, eye: 0, jaw: o.jaw || 0, shadow: '#5f8a70', mid: '#a9d0b8', bone: '#e6fff0', dark: '#020403' });
  }

  // ---------------------------------------------------------------- a skull
  A.skull = function (g, x, y, s, o) {
    o = o || {}; const jaw = (o.jaw || 0) * 0.46, dark = o.dark || '#020403', G = o.glow || '125,255,176', eye = o.eye === undefined ? 1 : o.eye, lite = o.bone || '#e6fff0';
    g.save(); g.translate(x, y); g.rotate(o.tilt || 0); g.scale(s, s);
    const gr = g.createLinearGradient(0, -1.05, 0, 1.4); gr.addColorStop(0, o.shadow || '#12241a'); gr.addColorStop(0.55, o.mid || '#5f8a70'); gr.addColorStop(1, lite);
    g.save(); g.translate(0, jaw); // the jaw hangs behind the face
    g.beginPath(); g.moveTo(-0.58, 0.42); g.lineTo(-0.48, 1.08); g.lineTo(-0.2, 1.3); g.lineTo(0.2, 1.3); g.lineTo(0.48, 1.08); g.lineTo(0.58, 0.42); g.lineTo(0.42, 0.6); g.lineTo(0.34, 0.97); g.lineTo(-0.34, 0.97); g.lineTo(-0.42, 0.6); g.closePath(); g.fillStyle = gr; g.fill();
    g.fillStyle = dark; g.fillRect(-0.33, 0.84, 0.66, 0.14); g.fillStyle = lite; for (let i = 0; i < 7; i++) g.fillRect(-0.31 + i * 0.09, 0.85, 0.068, 0.12);
    g.restore();
    if (jaw > 0.02) { g.fillStyle = dark; g.fillRect(-0.34, 0.8, 0.68, jaw + 0.06); if (o.sing) { g.globalCompositeOperation = 'lighter'; const m = g.createRadialGradient(0, 0.84 + jaw * 0.5, 0, 0, 0.84 + jaw * 0.5, 0.5); m.addColorStop(0, 'rgba(' + G + ',' + o.sing + ')'); m.addColorStop(1, 'rgba(' + G + ',0)'); g.fillStyle = m; g.fillRect(-0.5, 0.6, 1, jaw + 0.6); g.globalCompositeOperation = 'source-over'; } }
    g.beginPath(); g.moveTo(-0.52, 0.5); g.bezierCurveTo(-1.02, 0.32, -0.96, -1.05, 0, -1.05); g.bezierCurveTo(0.96, -1.05, 1.02, 0.32, 0.52, 0.5); g.lineTo(0.38, 0.84); g.lineTo(-0.38, 0.84); g.closePath(); g.fillStyle = gr; g.fill();
    if (o.flat) { g.lineWidth = 0.09; g.strokeStyle = INK; g.stroke(); }
    g.fillStyle = dark;
    for (const d of [-1, 1]) { g.beginPath(); g.moveTo(d * 0.11, -0.08); g.quadraticCurveTo(d * 0.42, -0.36, d * 0.7, -0.33); g.quadraticCurveTo(d * 0.78, -0.12, d * 0.66, 0.04); g.quadraticCurveTo(d * 0.44, 0.24, d * 0.24, 0.16); g.quadraticCurveTo(d * 0.12, 0.1, d * 0.11, -0.08); g.fill(); // sockets, the brow drawn down
      g.beginPath(); g.moveTo(d * 0.7, 0.22); g.lineTo(d * 0.5, 0.62); g.lineTo(d * 0.58, 0.3); g.fill(); }
    g.beginPath(); g.moveTo(0, 0.2); g.lineTo(-0.13, 0.5); g.lineTo(-0.03, 0.45); g.lineTo(0, 0.55); g.lineTo(0.03, 0.45); g.lineTo(0.13, 0.5); g.closePath(); g.fill();
    g.fillRect(-0.37, 0.67, 0.74, 0.19); g.fillStyle = lite; for (let i = 0; i < 8; i++) g.fillRect(-0.355 + i * 0.09, 0.69, 0.07, 0.15 + (i === 2 || i === 5 ? 0.05 : 0));
    if (!o.flat) { g.strokeStyle = dark; g.lineWidth = 0.022; g.lineJoin = 'round'; g.beginPath(); g.moveTo(0.22, -1.02); g.lineTo(0.3, -0.8); g.lineTo(0.2, -0.68); g.lineTo(0.32, -0.5); g.moveTo(-0.5, -0.86); g.lineTo(-0.42, -0.7); g.lineTo(-0.5, -0.6); g.stroke(); }
    if (eye > 0) { g.globalCompositeOperation = 'lighter'; for (const d of [-1, 1]) { const ex = d * 0.42, ey = -0.08, gl = g.createRadialGradient(ex, ey, 0, ex, ey, 0.62); gl.addColorStop(0, 'rgba(255,255,255,' + eye + ')'); gl.addColorStop(0.16, 'rgba(' + G + ',' + eye * 0.95 + ')'); gl.addColorStop(0.5, 'rgba(' + G + ',' + eye * 0.25 + ')'); gl.addColorStop(1, 'rgba(' + G + ',0)'); g.fillStyle = gl; g.fillRect(ex - 0.62, ey - 0.62, 1.24, 1.24); if (o.streak) { g.fillStyle = 'rgba(' + G + ',' + eye * 0.4 + ')'; g.fillRect(ex - 1.1, ey - 0.014, 2.2, 0.028); } } }
    g.restore();
  };

  // ---------------------------------------------------------------- light: how a drawn figure is made to sit in a shot
  // dim: a wash over the whole figure (toward a backlit shape); grad: light falling across it; rims: bright edges on
  // the sides the light comes from, [dx, dy, colour, width] with (dx, dy) pointing at the light.
  const LIGHT = A.LIGHT = {
    plain: { rims: [[0, -1, '#ffffff', 0.006]], rimA: 0.35 },
    dusk: { dim: ['#1a0d14', 0.62], rims: [[-1, -0.25, '#ffcf8a', 0.014], [1, -0.25, '#ffb060', 0.012], [0, -1, '#ffe2b0', 0.008]] },
    dawn: { dim: ['#1c0a06', 0.5], rims: [[-1, -0.2, '#ffb56a', 0.016], [1, -0.2, '#ffd9a0', 0.012], [0, -1, '#fff0d0', 0.008]] },
    gate: { dim: ['#04020a', 0.9], rims: [[-1, 0, '#c9a8ff', 0.014], [1, 0, '#c9a8ff', 0.014], [0, -1, '#e7d8ff', 0.008]] },
    green: { dim: ['#020503', 0.84], rims: [[-1, 0, '#7dffb0', 0.014], [1, 0, '#7dffb0', 0.014], [0, 1, '#c8ffe0', 0.008]] },
    ink: { dim: ['#050505', 1], rims: [] },
    pale: { dim: ['#e9e4d8', 1], rims: [] },
    glass: { dim: ['#0a0612', 0.35], rims: [[0, -1, '#ffffff', 0.01], [-1, 0, '#ffffff', 0.006]], rimA: 0.7 },
    fire: { dim: ['#12060a', 0.55], rims: [[0, 1, '#ffb060', 0.014], [-1, 0.3, '#ff8a3a', 0.012], [1, 0.3, '#ffcf8a', 0.01]] },
    moon: { dim: ['#070a16', 0.7], rims: [[1, -0.4, '#bcd0ff', 0.014], [0, -1, '#dfe8ff', 0.008]] },
  };
  const cache = new Map();
  A.clear = () => cache.clear();
  const KIND = { knight, dead, vesh };
  // the figure, drawn and lit once at about this height in pixels; its feet are at (cv.ax, cv.ay)
  A.get = function (kind, o, hpx, light) {
    const H = Math.max(48, Math.ceil(hpx / 32) * 32), lt = typeof light === 'string' ? light : JSON.stringify(light || 0), key = kind + '|' + H + '|' + lt + '|' + JSON.stringify(o);
    let c = cache.get(key); if (c) return c; if (cache.size > 260) cache.clear();
    const Lt = typeof light === 'string' ? LIGHT[light] || LIGHT.plain : light || LIGHT.plain, W = Math.round(H * 1.5), Hh = Math.round(H * 1.55), ax = W / 2, ay = Math.round(H * 1.36);
    c = document.createElement('canvas'); c.width = W; c.height = Hh; c.ax = ax; c.ay = ay; c.h = H;
    const g = c.getContext('2d'); g.save(); g.translate(ax, ay); g.scale(H, H); KIND[kind](g, o || {}); g.restore();
    g.globalCompositeOperation = 'source-atop';
    { const sg = g.createLinearGradient(W * 0.25, Hh * 0.1, W * 0.75, Hh * 0.95); sg.addColorStop(0, 'rgba(255,255,255,0.16)'); sg.addColorStop(0.45, 'rgba(255,255,255,0)'); sg.addColorStop(1, 'rgba(0,0,10,0.34)'); g.fillStyle = sg; g.fillRect(0, 0, W, Hh); } // the round of it
    if (Lt.dim) { g.globalAlpha = Lt.dim[1]; g.fillStyle = Lt.dim[0]; g.fillRect(0, 0, W, Hh); g.globalAlpha = 1; }
    for (const [dx, dy, col, wd] of Lt.rims || []) { // an edge of light: the shape in the light's colour, less the shape moved away from the light
      const r = document.createElement('canvas'); r.width = W; r.height = Hh; const q = r.getContext('2d'), d = Math.hypot(dx, dy) || 1, px = Math.max(1.5, wd * H);
      q.drawImage(c, 0, 0); q.globalCompositeOperation = 'source-in'; q.fillStyle = col; q.fillRect(0, 0, W, Hh); q.globalCompositeOperation = 'destination-out'; q.drawImage(c, -dx / d * px, -dy / d * px);
      g.globalAlpha = Lt.rimA || 1; g.drawImage(r, 0, 0); g.globalAlpha = 1;
    }
    g.globalCompositeOperation = 'source-over'; cache.set(key, c); return c;
  };
  A.draw = function (g, kind, o, x, y, h, light, flip, bake) { // bake: draw it once at this height and scale it, for a figure whose size keeps changing
    const c = A.get(kind, o, bake || h, light), m = h / c.h, sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = true; g.save(); g.translate(x, y); if (flip) g.scale(-1, 1); g.drawImage(c, -c.ax * m, -c.ay * m, c.width * m, c.height * m); g.restore(); g.imageSmoothingEnabled = sm;
  };
  // the same figure seen from below: wide at the feet, narrowing to the head
  A.drawLow = function (g, kind, o, x, y, h, light, taper, bake) {
    const c = A.get(kind, o, bake || h, light), m = h / c.h, N = 24, sh = c.height / N, sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = true;
    for (let s = 0; s < N; s++) { const ws = lerp(1 - taper, 1 + taper * 0.35, (s + 0.5) / N); g.drawImage(c, 0, s * sh, c.width, sh, x - c.ax * m * ws, y - c.ay * m + s * sh * m, c.width * m * ws, sh * m + 1); }
    g.imageSmoothingEnabled = sm;
  };
  A.eyes = function (g, kind, o, x, y, h, col, al, flip) { // the lights in its head
    const P = getPose((o && o.pose) || (kind === 'dead' ? 'walkA' : kind === 'vesh' ? 'sing' : 'stand')), hx = x + (flip ? -1 : 1) * P.head[0] * h, hy = y + (P.head[1] - 0.008) * h, r = h * 0.05, e = h * (kind === 'vesh' ? 0.021 : 0.026);
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const d of [-1, 1]) { const ex = hx + d * e, gl = g.createRadialGradient(ex, hy, 0, ex, hy, r); gl.addColorStop(0, 'rgba(255,255,255,' + al + ')'); gl.addColorStop(0.3, 'rgba(' + col + ',' + al * 0.8 + ')'); gl.addColorStop(1, 'rgba(' + col + ',0)'); g.fillStyle = gl; g.fillRect(ex - r, hy - r, r * 2, r * 2); }
    g.restore();
  };
  // nine knights, one to a banner: who they are is how they stand against the light
  A.NINE = [
    { helm: 'great', weapon: 'great', heavy: true }, { helm: 'wings', weapon: 'spear', shield: true }, { helm: 'hood', weapon: 'bow', cape: false },
    { helm: 'horn', weapon: 'axe', heavy: true }, { helm: 'crown', weapon: 'sword', shield: true }, { helm: 'kettle', weapon: 'halberd' },
    { helm: 'hood', weapon: 'staff' }, { helm: 'barbute', weapon: 'hammer', heavy: true }, { helm: 'plume', weapon: 'sword', shield: true },
  ];
})();
