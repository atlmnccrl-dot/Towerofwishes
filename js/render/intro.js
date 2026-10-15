/*
 * Tower of Wishes — face-off intro, countdown, and victory pose.
 *
 * Timeline (seconds), driven by main.js through `show.t`:
 *   0.0 – 1.2   establishing shot of the arena
 *   1.2 – 6.2   face-off: each fighter in INTRO_ORDER gets a spotlight card
 *   6.2 – 7.0   VS
 *   7.0 – 9.4   3 · 2 · 1 · FIGHT   (Sim.begin is called at 9.4)
 *
 * API (called by core.js):
 *   cameraFor(s, show) -> {focus, zoom} | null   camera override while the intro plays
 *   spotlight(s, show) -> unit id | null          who is being introduced (fighters may pose)
 *   draw(s, show, dt)                             screen-space overlay
 */
(function () {
  'use strict';
  const NS = (window.TowRender = window.TowRender || {});

  const T = { establish: 1.2, cardsEnd: 6.2, vsEnd: 7.0, count: 0.6, fight: 9.4, end: 10.0 };

  function cardTimes(order) {
    // Kael, last in, gets a longer beat.
    const n = order.length, span = T.cardsEnd - T.establish;
    const each = span / (n + 0.5);
    return order.map((id, i) => ({ id, t0: T.establish + i * each, t1: T.establish + (i + 1) * each + (i === n - 1 ? each * 0.5 : 0) }));
  }

  function create(V) {
    const { ctx, FONT, PAL, Sim } = V;
    const cards = cardTimes(Sim.INTRO_ORDER);

    function current(t) { return cards.find((c) => t >= c.t0 && t < c.t1) || null; }

    function spotlight(s, show) {
      if (!show || show.t >= T.cardsEnd) return null;
      const c = current(show.t);
      return c ? c.id : null;
    }

    function cameraFor(s, show) {
      if (!show || show.t >= T.end) return null;
      const id = spotlight(s, show);
      if (id) return { focus: id, zoom: 2.3 };
      return null;
    }

    function draw(s, show) {
      if (!show || show.t >= T.end) return;
      const W = V.W, H = V.H, t = show.t;
      const c = current(t);
      if (c && t < T.cardsEnd) {
        const u = s.byId[c.id], d = u.def, k = Math.min(1, (t - c.t0) / 0.25);
        const ease = 1 - Math.pow(1 - k, 3);
        const hero = u.team === 'hero';
        const fs = Math.round(Math.min(W, H) * 0.1);
        const x = hero ? 28 - (1 - ease) * 200 : W - 28 + (1 - ease) * 200;
        ctx.textAlign = hero ? 'left' : 'right';
        ctx.textBaseline = 'alphabetic';
        ctx.font = `700 ${Math.round(fs * 0.24)}px ${FONT.ui}`;
        ctx.fillStyle = hero ? PAL.hero : PAL.enemy;
        ctx.fillText((d.intro.epithet || '').toUpperCase(), x, H * 0.62);
        ctx.font = `800 ${fs}px ${FONT.display}`;
        ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(8,6,8,0.9)';
        ctx.strokeText(u.name, x, H * 0.62 + fs * 0.95);
        ctx.fillStyle = PAL.white; ctx.fillText(u.name, x, H * 0.62 + fs * 0.95);
        if (d.intro.line) {
          ctx.font = `600 ${Math.round(fs * 0.28)}px ${FONT.ui}`;
          ctx.fillStyle = PAL.bone;
          ctx.fillText('“' + d.intro.line + '”', x, H * 0.62 + fs * 1.45);
        }
      } else if (t >= T.cardsEnd && t < T.vsEnd) {
        const fs = Math.round(Math.min(W, H) * 0.3);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `900 ${fs}px ${FONT.display}`;
        ctx.fillStyle = PAL.glow; ctx.fillText('VS', W / 2, H / 2);
      } else if (t >= T.vsEnd) {
        const i = Math.floor((t - T.vsEnd) / T.count);
        const label = ['3', '2', '1', 'FIGHT'][Math.min(3, i)];
        const local = ((t - T.vsEnd) % T.count) / T.count;
        const fs = Math.round(Math.min(W, H) * (label === 'FIGHT' ? 0.2 : 0.3) * (1.3 - 0.3 * Math.min(1, local * 3)));
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `900 ${fs}px ${FONT.display}`;
        ctx.globalAlpha = label === 'FIGHT' ? Math.max(0, 1 - (t - T.fight) / 0.6) : 1;
        ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(8,6,8,0.9)';
        ctx.strokeText(label, W / 2, H * 0.45);
        ctx.fillStyle = label === 'FIGHT' ? PAL.glow : PAL.white;
        ctx.fillText(label, W / 2, H * 0.45);
        ctx.globalAlpha = 1;
      }
    }

    return { draw, cameraFor, spotlight };
  }

  NS.intro = { create, T };
})();
